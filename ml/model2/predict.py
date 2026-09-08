import os
import sys
import json
import logging
import pandas as pd
import numpy as np
import joblib

import config

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def filter_eligible_candidates(candidates, student_context):
    """
    Applies strict pedagogical eligibility rules before model ranking:
    1. Exclude already mastered/completed tasks (mastery >= 0.85) unless explicitly set for review.
    2. Exclude tasks where prerequisites are strictly unsatisfied.
    3. Exclude tasks repeated excessively (>= 3 times) without progress to prevent loops.
    4. Allow remediation on failed tasks with explicit justification.
    """
    eligible = []
    recent_task_ids = student_context.get('recentTaskIds', [])
    
    for c in candidates:
        task_id = c.get('taskId', c.get('id', 'unknown'))
        current_mastery = c.get('currentMastery', student_context.get('currentMastery', 0.0))
        prereq_met = c.get('prereqSatisfied', 1)
        repetition_count = c.get('repetitionCount', 0)
        task_type = c.get('candidateTaskType', 'learning_topic')
        
        # Rule 1: Exclude already mastered tasks unless periodic spaced review
        if current_mastery >= 0.88 and not c.get('isSpacedReview', False):
            continue
            
        # Rule 2: Prerequisite gating - tasks with unmet prerequisites are ineligible
        if prereq_met == 0:
            continue
            
        # Rule 3: Repetition ceiling - if repeated >= 3 times in a row, route to alternate practice/theory
        if repetition_count >= 3:
            # Only allow if it's an alternate task type providing foundational theory
            if task_type != 'learning_topic':
                continue
                
        # Rule 4: Immediate duplicate prevention - don't repeat the exact same task consecutively unless flagged for single immediate retry
        if recent_task_ids and recent_task_ids[-1] == task_id and not c.get('isRetryRemediation', False):
            continue
            
        eligible.append(c)
        
    return eligible if eligible else candidates # Fallback to all candidates if over-filtered

def compute_adaptive_assignment_score(cand, model2_prob, student_context):
    """
    Computes the pedagogical assignment utility score:
    Balances:
    - Flow Channel alignment (Zone of Proximal Development: target ~0.72 pass prob)
    - Learning Potential (higher value for unmastered topics)
    - Weak Topic targeting
    - Repetition penalty (penalizes repeated exposures)
    """
    # 1. Flow Channel Alignment: Maximize value around 0.65 - 0.80 success rate
    # Trivial tasks (>0.95) or impossible tasks (<0.30) receive lower flow utility
    target_prob = 0.72
    flow_channel = max(0.0, 1.0 - 2.5 * ((model2_prob - target_prob) ** 2))
    
    # 2. Learning Growth Potential
    current_mastery = cand.get('currentMastery', student_context.get('currentMastery', 0.5))
    learning_value = (1.0 - current_mastery) * 0.40
    
    # 3. Weak Topic Relevance
    weakest_mastery = cand.get('weakestTopicMastery', student_context.get('weakestTopicMastery', 0.4))
    weak_topic_bonus = 0.20 if (weakest_mastery < 0.60 and current_mastery < 0.60) else 0.0
    
    # 4. Repetition Penalty
    rep_count = cand.get('repetitionCount', 0)
    rep_penalty = 0.40 * min(rep_count, 3)
    
    # Check recency in student context
    recent_task_ids = student_context.get('recentTaskIds', [])
    task_id = cand.get('taskId', cand.get('id', ''))
    if recent_task_ids:
        if len(recent_task_ids) >= 1 and recent_task_ids[-1] == task_id:
            rep_penalty += 0.50 # Immediate repeat penalty
        elif len(recent_task_ids) >= 3 and task_id in recent_task_ids[-3:]:
            rep_penalty += 0.25 # Repeated within last 3
        elif len(recent_task_ids) >= 5 and task_id in recent_task_ids[-5:]:
            rep_penalty += 0.10 # Repeated within last 5
            
    # Composite score
    adaptive_score = flow_channel + learning_value + weak_topic_bonus - rep_penalty
    return round(float(adaptive_score), 4)

def rank_candidate_tasks(candidates, student_context, apply_eligibility_filter=True):
    """
    Ranks candidate tasks using the trained Model 2 pipeline combined with
    pedagogical adaptive assignment scoring and eligibility filtering.
    """
    if not os.path.exists(config.MODEL_PATH) or not os.path.exists(config.METADATA_PATH):
        return {
            "status": "NOT_READY",
            "message": "Model 2 artifact not found.",
            "rankedCandidates": candidates
        }

    with open(config.METADATA_PATH, 'r') as f:
        metadata = json.load(f)

    if metadata.get("status") not in ["VALIDATED", "PRODUCTION", "EXPERIMENTAL"]:
        return {
            "status": metadata.get("status", "NOT_READY"),
            "message": "Model 2 is not validated.",
            "rankedCandidates": candidates
        }

    pipeline = joblib.load(config.MODEL_PATH)

    # 1. Apply eligibility filtering
    working_candidates = filter_eligible_candidates(candidates, student_context) if apply_eligibility_filter else list(candidates)

    feature_rows = []
    for c in working_candidates:
        row = {
            'predictedNextScore': c.get('predictedNextScore', student_context.get('predictedNextScore', 0.65)),
            'currentMastery': c.get('currentMastery', student_context.get('currentMastery', 0.5)),
            'weakestTopicMastery': c.get('weakestTopicMastery', student_context.get('weakestTopicMastery', 0.4)),
            'prereqSatisfied': c.get('prereqSatisfied', 1),
            'syllabusDepth': c.get('syllabusDepth', 1.0),
            'previousTasksCount': student_context.get('previousTasksCount', 5),
            'previousSuccessRate': student_context.get('previousSuccessRate', 0.7),
            'daysSinceLastActivity': student_context.get('daysSinceLastActivity', 1.0),
            'candidateDifficulty': c.get('candidateDifficulty', 2.0),
            'difficultyFit': c.get('difficultyFit', 0.8),
            'repetitionCount': c.get('repetitionCount', 0),
            'priorityScore': c.get('priorityScore', 50),
            'candidateTaskType': c.get('candidateTaskType', 'learning_topic'),
            'topicId': c.get('topicId', 'default_topic'),
            'skillId': c.get('skillId', 'default_skill')
        }
        feature_rows.append(row)

    df = pd.DataFrame(feature_rows)
    probs = pipeline.predict_proba(df)[:, 1]

    # 2. Attach model 2 probability and compute adaptive utility score
    scored_candidates = []
    for idx, cand in enumerate(working_candidates):
        cand_copy = dict(cand)
        p_pass = round(float(probs[idx]), 4)
        cand_copy['model2Prob'] = p_pass
        cand_copy['adaptiveScore'] = compute_adaptive_assignment_score(cand_copy, p_pass, student_context)
        
        # Explainable reasoning
        if cand_copy.get('repetitionCount', 0) > 0:
            reason = f"Remediation practice (success probability: {p_pass:.2f})"
        elif cand_copy.get('weakestTopicMastery', 1.0) < 0.6:
            reason = f"Weak topic reinforcement (expected flow match: {p_pass:.2f})"
        else:
            reason = f"Curriculum advancement (optimal challenge level: {p_pass:.2f})"
        cand_copy['selectionReason'] = reason
        scored_candidates.append(cand_copy)

    # 3. Sort descending by adaptiveScore (not raw p_pass)
    scored_candidates.sort(key=lambda x: x['adaptiveScore'], reverse=True)

    return {
        "status": "SUCCESS",
        "modelVersion": metadata.get("modelVersion"),
        "bestTask": scored_candidates[0] if scored_candidates else None,
        "rankedCandidates": scored_candidates
    }

if __name__ == "__main__":
    sample_context = {
        'previousTasksCount': 10,
        'previousSuccessRate': 0.75,
        'daysSinceLastActivity': 0.5,
        'predictedNextScore': 0.70,
        'currentMastery': 0.45,
        'weakestTopicMastery': 0.30,
        'recentTaskIds': ['task_1']
    }
    sample_candidates = [
        {
            'taskId': 'task_1',
            'topicId': 'topic_react_state',
            'skillId': 'skill_react',
            'candidateTaskType': 'practice_problem',
            'candidateDifficulty': 1.8,
            'currentMastery': 0.45,
            'weakestTopicMastery': 0.30,
            'prereqSatisfied': 1,
            'syllabusDepth': 2.0,
            'difficultyFit': 0.90,
            'repetitionCount': 1,
            'priorityScore': 85
        },
        {
            'taskId': 'task_2',
            'topicId': 'topic_react_hooks',
            'skillId': 'skill_react',
            'candidateTaskType': 'practice_problem',
            'candidateDifficulty': 2.5,
            'currentMastery': 0.30,
            'weakestTopicMastery': 0.30,
            'prereqSatisfied': 1,
            'syllabusDepth': 3.0,
            'difficultyFit': 0.75,
            'repetitionCount': 0,
            'priorityScore': 70
        }
    ]

    result = rank_candidate_tasks(sample_candidates, sample_context)
    logging.info(f"Ranking Result:\n{json.dumps(result, indent=2)}")

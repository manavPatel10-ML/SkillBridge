"""
Phase 36: Experimental ML Shadow Integration Simulation & Audit Script
ENVIRONMENT: LOCAL DEVELOPMENT ONLY

Executes:
1. Side-by-side Shadow Recommendation Generation (Deterministic Baseline vs Experimental ML)
2. 10-Step and 20-Step Sequential Shadow Evaluation (100 students)
3. Strict Outcome Attribution: Student executes deterministic task; unselected ML task is strictly UNKNOWN
4. Causality Protection: Observational language throughout
5. Production Gates & Status: Model 1 = EXPERIMENTAL (NOT_READY for prod), Model 2 = EXPERIMENTAL (NOT_READY for prod), Deterministic = ACTIVE

Zero contamination with production telemetry.
"""

import os
import sys
import json
import random
import numpy as np
import pandas as pd
from datetime import datetime

# Setup directories
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIT_RESULTS_DIR = os.path.join(BASE_DIR, 'audit-results')
os.makedirs(AUDIT_RESULTS_DIR, exist_ok=True)

sys.path.insert(0, BASE_DIR)
sys.path.insert(0, os.path.join(BASE_DIR, 'model2'))
from model2.predict import rank_candidate_tasks, filter_eligible_candidates, compute_adaptive_assignment_score



# -------------------------------------------------------------------------
# Curriculum & Candidate Catalog (Aligned with Phase 35)
# -------------------------------------------------------------------------
CURRICULUM_TOPICS = [
    {"id": "topic_react_basics", "skillId": "skill_react", "difficulty": 1.0, "prereq": None, "depth": 1},
    {"id": "topic_react_state", "skillId": "skill_react", "difficulty": 1.8, "prereq": "topic_react_basics", "depth": 2},
    {"id": "topic_react_hooks", "skillId": "skill_react", "difficulty": 2.5, "prereq": "topic_react_state", "depth": 3},
    {"id": "topic_ts_basics", "skillId": "skill_typescript", "difficulty": 1.2, "prereq": None, "depth": 1},
    {"id": "topic_ts_generics", "skillId": "skill_typescript", "difficulty": 2.4, "prereq": "topic_ts_basics", "depth": 2},
    {"id": "topic_fullstack_api", "skillId": "skill_fullstack", "difficulty": 2.8, "prereq": "topic_ts_basics", "depth": 3},
]

TASK_TYPES = [
    'learning_topic',
    'practice_problem',
    'assessment',
    'practical_task',
    'company_challenge'
]

def generate_full_candidate_catalog():
    catalog = []
    for topic in CURRICULUM_TOPICS:
        for t_type in TASK_TYPES:
            task_id = f"{topic['id']}_{t_type}"
            catalog.append({
                "taskId": task_id,
                "id": task_id,
                "topicId": topic['id'],
                "skillId": topic['skillId'],
                "candidateTaskType": t_type,
                "candidateDifficulty": topic['difficulty'],
                "syllabusDepth": float(topic['depth']),
                "prereqTopicId": topic['prereq']
            })
    return catalog

CANDIDATE_CATALOG = generate_full_candidate_catalog()

# -------------------------------------------------------------------------
# Deterministic Baseline Scorer (Authoritative Official Engine)
# -------------------------------------------------------------------------
def score_candidates_baseline(student_state, candidate_pool):
    scored = []
    for c in candidate_pool:
        topic_id = c['topicId']
        t_type = c['candidateTaskType']
        mastery = student_state['topic_mastery'].get(topic_id, 0.0)
        
        priority = 50.0
        reason = "Standard progression."
        
        # 1. Mastery based priority
        if t_type == 'learning_topic':
            if mastery < 0.30:
                priority += 35.0
                reason = "Foundational theory needed."
            elif mastery < 0.70:
                priority += 15.0
                reason = "Theory review."
            else:
                priority -= 20.0
        elif t_type == 'practice_problem':
            if 0.30 <= mastery < 0.80:
                priority += 30.0
                reason = "Practice to build fluency."
            elif mastery >= 0.80:
                priority -= 10.0
            else:
                priority -= 15.0
        elif t_type == 'assessment':
            if mastery >= 0.70:
                priority += 40.0
                reason = "Ready to prove mastery."
            else:
                priority -= 20.0
        elif t_type == 'practical_task':
            if mastery >= 0.60:
                priority += 25.0
                reason = "Hands-on project."
            else:
                priority -= 25.0
        elif t_type == 'company_challenge':
            if mastery >= 0.80:
                priority += 35.0
                reason = "Industry challenge."
            else:
                priority -= 35.0
                
        # 2. Prerequisite check
        prereq = c['prereqTopicId']
        if prereq and student_state['topic_mastery'].get(prereq, 0.0) < 0.70:
            priority -= 40.0
            reason = "Prerequisite unfulfilled."
            
        # 3. Repetition penalty
        recent = student_state['recent_tasks']
        task_id = c['taskId']
        if recent:
            if recent[-1] == task_id:
                priority -= 50.0
            elif len(recent) >= 3 and task_id in recent[-3:]:
                priority -= 30.0
            elif len(recent) >= 5 and task_id in recent[-5:]:
                priority -= 15.0
                
        scored.append({
            **c,
            "deterministicPriorityScore": priority,
            "priorityScore": priority,
            "selectionReason": reason
        })
        
    scored.sort(key=lambda x: x['deterministicPriorityScore'], reverse=True)
    return scored

# -------------------------------------------------------------------------
# Simulated Execution (Deterministic Task Actually Performed)
# -------------------------------------------------------------------------
def simulate_task_outcome(student_ability, task_difficulty, current_mastery, task_type):
    diff_penalty = (task_difficulty - 1.0) * 0.10
    type_bonus = 0.15 if task_type == 'learning_topic' else (0.05 if task_type == 'practice_problem' else 0.0)
    
    expected_score = student_ability * 0.50 + current_mastery * 0.35 - diff_penalty + type_bonus + 0.15
    expected_score = np.clip(expected_score, 0.10, 0.95)
    
    actual_score = float(np.clip(expected_score + np.random.normal(0, 0.07), 0.0, 1.0))
    threshold = 0.60 if task_type == 'learning_topic' else 0.70
    passed = actual_score >= threshold
    return actual_score, passed

# -------------------------------------------------------------------------
# Sequential Shadow Simulation
# -------------------------------------------------------------------------
def run_sequential_shadow_simulation(num_students=100, num_steps=10):
    random.seed(42)
    np.random.seed(42)
    
    agreement_events = 0
    divergence_events = 0
    task_type_agreements = 0
    difficulty_agreements = 0
    weak_topic_agreements = 0
    
    top3_overlap_sum = 0
    rank_diff_sum = 0
    total_recommendations = 0
    
    student_evaluations = []
    
    # Repetition tracking
    unnecessary_repetition_count = 0
    intentional_remediation_count = 0
    all_unique_tasks_ratios = []
    all_task_diversity_ratios = []
    
    # Outcome integrity tracking
    executed_deterministic_outcomes = 0
    unexecuted_ml_outcomes_unknown = 0
    
    for s_idx in range(num_students):
        ability = random.uniform(0.35, 0.75)
        learn_rate = random.uniform(0.04, 0.08)
        
        student_state = {
            "studentId": f"shadow_student_{s_idx:04d}",
            "base_ability": ability,
            "learn_rate": learn_rate,
            "topic_mastery": {t['id']: 0.10 for t in CURRICULUM_TOPICS},
            "recent_tasks": [],
            "recent_types": [],
            "recent_topics": [],
            "recent_difficulties": [],
            "recent_outcomes": [],
            "scores": [],
            "remediation_queue": set()
        }
        
        student_executed_tasks = []
        student_task_types = set()
        
        for step in range(num_steps):
            total_recommendations += 1
            
            # 1. Candidate pool preparation (T0 state strictly prior to task execution)
            candidates = []
            overall_mastery = float(np.mean(list(student_state['topic_mastery'].values())))
            weakest_mastery = float(np.min(list(student_state['topic_mastery'].values())))
            weakest_topic = min(student_state['topic_mastery'].items(), key=lambda x: x[1])[0]
            
            for base_cand in CANDIDATE_CATALOG:
                t_id = base_cand['topicId']
                curr_t_mastery = student_state['topic_mastery'][t_id]
                prereq_id = base_cand['prereqTopicId']
                prereq_met = 1 if (not prereq_id or student_state['topic_mastery'].get(prereq_id, 0.0) >= 0.70) else 0
                rep_count = student_state['recent_tasks'].count(base_cand['taskId'])
                
                cand_copy = dict(base_cand)
                cand_copy.update({
                    "currentMastery": curr_t_mastery,
                    "weakestTopicMastery": weakest_mastery,
                    "prereqSatisfied": prereq_met,
                    "repetitionCount": rep_count,
                    "predictedNextScore": np.clip(ability * 0.5 + curr_t_mastery * 0.4, 0.1, 0.95),
                    "difficultyFit": max(0.1, 1.0 - abs(base_cand['candidateDifficulty'] - (1.0 + curr_t_mastery * 1.5))),
                    "priorityScore": 50,
                    "isRetryRemediation": base_cand['taskId'] in student_state['remediation_queue']
                })
                candidates.append(cand_copy)
                
            student_context = {
                "currentMastery": overall_mastery,
                "weakestTopicMastery": weakest_mastery,
                "previousTasksCount": len(student_state['recent_tasks']),
                "previousSuccessRate": float(np.mean(student_state['recent_outcomes'])) if student_state['recent_outcomes'] else 0.5,
                "daysSinceLastActivity": 1.0,
                "predictedNextScore": np.clip(ability * 0.5 + overall_mastery * 0.4, 0.1, 0.95),
                "recentTaskIds": student_state['recent_tasks'][-5:]
            }
            
            # 2. Parallel Evaluation
            # A) Deterministic Baseline (Authoritative Official Engine)
            scored_deterministic = score_candidates_baseline(student_state, candidates)
            deterministic_top = scored_deterministic[0]
            
            # B) Experimental ML Shadow Engine
            ranked_ml = rank_candidate_tasks(candidates, student_context, apply_eligibility_filter=True)
            ml_candidates = ranked_ml['rankedCandidates']
            ml_top = ranked_ml['bestTask'] or ml_candidates[0]
            
            # 3. Side-by-side Shadow Comparison
            is_agree = (deterministic_top['taskId'] == ml_top['taskId'])
            if is_agree:
                agreement_events += 1
            else:
                divergence_events += 1
                
            # Task type agreement
            if deterministic_top['candidateTaskType'] == ml_top['candidateTaskType']:
                task_type_agreements += 1
                
            # Difficulty agreement (within 0.5 band)
            if abs(deterministic_top['candidateDifficulty'] - ml_top['candidateDifficulty']) <= 0.5:
                difficulty_agreements += 1
                
            # Weak-topic targeting agreement
            if deterministic_top['topicId'] == ml_top['topicId']:
                weak_topic_agreements += 1
                
            # Top-3 candidate overlap
            det_top3 = set(c['taskId'] for c in scored_deterministic[:3])
            ml_top3 = set(c['taskId'] for c in ml_candidates[:3])
            overlap_count = len(det_top3.intersection(ml_top3))
            top3_overlap_sum += (overlap_count / 3.0)
            
            # Rank difference of deterministic pick in ML ranking
            det_in_ml_rank = next((idx + 1 for idx, c in enumerate(ml_candidates) if c['taskId'] == deterministic_top['taskId']), len(ml_candidates))
            rank_diff = abs(1 - det_in_ml_rank)
            rank_diff_sum += rank_diff
            
            # 4. CRITICAL OUTCOME INTEGRITY (Section 8)
            # Student ACTUALLY executes the deterministic task
            executed_task = deterministic_top
            student_executed_tasks.append(executed_task['taskId'])
            student_task_types.add(executed_task['candidateTaskType'])
            
            actual_score, passed = simulate_task_outcome(
                ability, 
                executed_task['candidateDifficulty'], 
                student_state['topic_mastery'][executed_task['topicId']], 
                executed_task['candidateTaskType']
            )
            executed_deterministic_outcomes += 1
            
            # For the ML recommendation:
            if is_agree:
                # Same task, so outcome observed for the common task
                ml_task_outcome = "OBSERVED_VIA_DETERMINISTIC_ALIGNMENT"
            else:
                # Divergent task: unselected ML task outcome is strictly UNKNOWN
                ml_task_outcome = "UNKNOWN"
                unexecuted_ml_outcomes_unknown += 1
                
            # 5. Check repetition behavior on executed path
            if len(student_state['recent_tasks']) > 0:
                if student_state['recent_tasks'][-1] == executed_task['taskId']:
                    if executed_task['taskId'] in student_state['remediation_queue']:
                        intentional_remediation_count += 1
                    else:
                        unnecessary_repetition_count += 1
                        
            # Update student progression state based on ACTUALLY executed deterministic task
            student_state['recent_tasks'].append(executed_task['taskId'])
            student_state['recent_types'].append(executed_task['candidateTaskType'])
            student_state['recent_topics'].append(executed_task['topicId'])
            student_state['recent_difficulties'].append(executed_task['candidateDifficulty'])
            student_state['recent_outcomes'].append(1 if passed else 0)
            student_state['scores'].append(actual_score)
            
            # Update topic mastery
            t_id = executed_task['topicId']
            gain = (learn_rate if passed else learn_rate * 0.25)
            student_state['topic_mastery'][t_id] = min(1.0, student_state['topic_mastery'][t_id] + gain)
            
            # Remediation management
            if not passed:
                student_state['remediation_queue'].add(executed_task['taskId'])
            else:
                student_state['remediation_queue'].discard(executed_task['taskId'])
                
        unique_tasks = len(set(student_executed_tasks))
        all_unique_tasks_ratios.append(unique_tasks / num_steps)
        all_task_diversity_ratios.append(len(student_task_types) / len(TASK_TYPES))
        
    agreement_rate = round(agreement_events / total_recommendations, 4)
    divergence_rate = round(divergence_events / total_recommendations, 4)
    avg_top3_overlap = round(top3_overlap_sum / total_recommendations, 4)
    avg_rank_diff = round(rank_diff_sum / total_recommendations, 4)
    task_type_agreement_rate = round(task_type_agreements / total_recommendations, 4)
    difficulty_agreement_rate = round(difficulty_agreements / total_recommendations, 4)
    weak_topic_agreement_rate = round(weak_topic_agreements / total_recommendations, 4)
    
    return {
        "numStudents": num_students,
        "numSteps": num_steps,
        "totalRecommendations": total_recommendations,
        "agreementRate": agreement_rate,
        "divergenceRate": divergence_rate,
        "top3Overlap": avg_top3_overlap,
        "averageRankDifference": avg_rank_diff,
        "taskTypeAgreement": task_type_agreement_rate,
        "difficultyAgreement": difficulty_agreement_rate,
        "weakTopicAgreement": weak_topic_agreement_rate,
        "repetition": {
            "unnecessaryRepetitionRate": round(unnecessary_repetition_count / total_recommendations, 4),
            "intentionalRemediationCount": intentional_remediation_count,
            "uniqueTasksRatio": round(float(np.mean(all_unique_tasks_ratios)), 4),
            "taskTypeDiversityRatio": round(float(np.mean(all_task_diversity_ratios)), 4)
        },
        "outcomeIntegrity": {
            "executedDeterministicOutcomes": executed_deterministic_outcomes,
            "unexecutedMlTasksLabeledUnknown": unexecuted_ml_outcomes_unknown,
            "integrityPreserved": True,
            "rule": "Outcome(Deterministic Task) = observed, Outcome(Unselected ML Task) = UNKNOWN"
        }
    }

def main():
    print("====================================================================")
    print("PHASE 36: EXPERIMENTAL ML SHADOW INTEGRATION SIMULATION")
    print("====================================================================\n")
    
    print("[1/2] Running 10-Step Sequential Shadow Simulation across 100 students...")
    results_10step = run_sequential_shadow_simulation(num_students=100, num_steps=10)
    print(f"  -> Agreement Rate: {results_10step['agreementRate']*100:.1f}%")
    print(f"  -> Divergence Rate: {results_10step['divergenceRate']*100:.1f}%")
    print(f"  -> Top-3 Overlap: {results_10step['top3Overlap']*100:.1f}%")
    print(f"  -> Unnecessary Repetition: {results_10step['repetition']['unnecessaryRepetitionRate']*100:.1f}%")
    print(f"  -> Unexecuted ML Tasks UNKNOWN: {results_10step['outcomeIntegrity']['unexecutedMlTasksLabeledUnknown']}")
    
    print("\n[2/2] Running 20-Step Sequential Shadow Simulation across 100 students...")
    results_20step = run_sequential_shadow_simulation(num_students=100, num_steps=20)
    print(f"  -> Agreement Rate: {results_20step['agreementRate']*100:.1f}%")
    print(f"  -> Divergence Rate: {results_20step['divergenceRate']*100:.1f}%")
    print(f"  -> Top-3 Overlap: {results_20step['top3Overlap']*100:.1f}%")
    print(f"  -> Unnecessary Repetition: {results_20step['repetition']['unnecessaryRepetitionRate']*100:.1f}%")
    print(f"  -> Unexecuted ML Tasks UNKNOWN: {results_20step['outcomeIntegrity']['unexecutedMlTasksLabeledUnknown']}")
    
    # Compile comprehensive Phase 36 report payload
    audit_payload = {
        "phase": 36,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "modelStatus": {
            "model1": {
                "developmentStatus": "EXPERIMENTAL",
                "productionStatus": "NOT_READY",
                "observationsRequired": 5000,
                "currentObservations": 0,
                "version": "model1-gradient_boosting-v1"
            },
            "model2": {
                "developmentStatus": "EXPERIMENTAL",
                "productionStatus": "NOT_READY",
                "observationsRequired": 1000,
                "currentObservations": 0,
                "version": "model2-gradient_boosting-v1"
            },
            "deterministicEngine": {
                "status": "ACTIVE",
                "role": "SOLE_AUTHORITATIVE_PRODUCTION_RECOMMENDER"
            }
        },
        "shadowEvaluation10Step": results_10step,
        "shadowEvaluation20Step": results_20step,
        "causalityProtection": {
            "causalClaimsAllowed": False,
            "standardPhrasing": [
                "ML recommendation differed from deterministic recommendation.",
                "Observed outcome of the actually assigned task."
            ]
        },
        "safetyGuarantees": {
            "readOnlyShadow": True,
            "skillScoresMutated": False,
            "progressionMutated": False,
            "verificationMutated": False,
            "talentAccessMutated": False,
            "shadowCountsTowardProductionTraining": False
        }
    }
    
    output_path = os.path.join(AUDIT_RESULTS_DIR, 'phase36_results.json')
    with open(output_path, 'w') as f:
        json.dump(audit_payload, f, indent=2)
        
    print(f"\n[SUCCESS] Phase 36 audit results saved to {output_path}")

if __name__ == "__main__":
    main()

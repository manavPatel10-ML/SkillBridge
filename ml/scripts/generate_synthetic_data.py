"""
Phase 32: Synthetic Data Generator for Local ML Training & Validation
ENVIRONMENT: LOCAL DEVELOPMENT ONLY

Generates realistic student learning journeys for:
- Model 1: Performance Prediction (score forecasting)
- Model 2: Adaptive Task Assignment (next best action selection)

Zero contamination with production telemetry.
Reproducible with fixed random seed (seed=42).
"""

import os
import json
import random
import numpy as np
from datetime import datetime, timedelta

SEED = 42
random.seed(SEED)
np.random.seed(SEED)

DEV_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'dev-data')
os.makedirs(DEV_DATA_DIR, exist_ok=True)

TOPICS = [
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

def generate_datasets(num_students=250, target_m1_obs=10000, target_m2_obs=5000):
    print(f"Generating synthetic datasets with seed={SEED}...")
    
    m1_records = []
    m2_records = []
    
    start_date = datetime(2026, 1, 1, 9, 0, 0)
    
    for s_idx in range(1, num_students + 1):
        student_id = f"synth_student_{s_idx:04d}"
        
        # Archetype selection
        archetype_roll = random.random()
        if archetype_roll < 0.45:
            # Beginner (45%): low initial ability, moderate growth, higher noise
            base_ability = random.uniform(0.15, 0.35)
            learn_rate = random.uniform(0.02, 0.05)
            noise_std = 0.12
        elif archetype_roll < 0.80:
            # Intermediate (35%): medium initial ability, steady growth
            base_ability = random.uniform(0.40, 0.65)
            learn_rate = random.uniform(0.03, 0.07)
            noise_std = 0.09
        else:
            # Advanced (20%): high initial ability, rapid mastery
            base_ability = random.uniform(0.70, 0.88)
            learn_rate = random.uniform(0.04, 0.09)
            noise_std = 0.06

        current_time = start_date + timedelta(days=random.uniform(0, 15), hours=random.uniform(0, 8))
        
        # Student running state
        theory_scores = []
        practical_scores = []
        practice_attempts_list = []
        practice_completions = 0
        all_outcomes = []
        topic_state = {t["id"]: {"attempts": 0, "scores": [], "mastery": 0.0} for t in TOPICS}
        last_activity_time = current_time
        topic_last_activity = {t["id"]: current_time for t in TOPICS}
        
        num_tasks = random.randint(35, 65)
        
        for task_step in range(num_tasks):
            # Advance time
            gap_days = random.choices([0.1, 0.5, 1.0, 2.5, 7.0], weights=[0.4, 0.3, 0.15, 0.1, 0.05])[0]
            current_time += timedelta(days=gap_days, minutes=random.randint(15, 120))
            days_since_last = (current_time - last_activity_time).total_seconds() / 86400.0
            
            # Select topic and task
            topic = random.choice(TOPICS)
            task_type = random.choices(TASK_TYPES, weights=[0.30, 0.30, 0.20, 0.12, 0.08])[0]
            
            # Prerequisite check
            prereq_id = topic["prereq"]
            prereq_mastery = topic_state[prereq_id]["mastery"] if prereq_id else 1.0
            prereq_completed = 1 if prereq_mastery >= 0.7 else 0
            
            t_data = topic_state[topic["id"]]
            topic_mastery = t_data["mastery"]
            topic_attempts = t_data["attempts"]
            topic_success_rate = np.mean([1 if s >= 0.7 else 0 for s in t_data["scores"]]) if t_data["scores"] else 0.0
            topic_consistency = np.std(t_data["scores"]) if len(t_data["scores"]) >= 2 else 0.5
            
            # Weakest topic mastery across all syllabus topics
            weakest_topic_mastery = min(t_state["mastery"] for t_state in topic_state.values())
            
            days_since_topic = (current_time - topic_last_activity[topic["id"]]).total_seconds() / 86400.0
            
            hist_theory_avg = np.mean(theory_scores) if theory_scores else base_ability
            hist_prac_avg = np.mean(practical_scores) if practical_scores else base_ability
            recent_theory = np.mean(theory_scores[-3:]) if len(theory_scores) >= 3 else hist_theory_avg
            recent_prac = np.mean(practical_scores[-3:]) if len(practical_scores) >= 3 else hist_prac_avg
            
            # Trends
            theory_trend = 'STABLE'
            if len(theory_scores) >= 4:
                diff = np.mean(theory_scores[-2:]) - np.mean(theory_scores[-4:-2])
                if diff > 0.05: theory_trend = 'UP'
                elif diff < -0.05: theory_trend = 'DOWN'

            prac_trend = 'STABLE'
            if len(practical_scores) >= 4:
                diff = np.mean(practical_scores[-2:]) - np.mean(practical_scores[-4:-2])
                if diff > 0.05: prac_trend = 'UP'
                elif diff < -0.05: prac_trend = 'DOWN'
            
            practice_rate = practice_completions / max(1, len(practice_attempts_list)) if practice_attempts_list else 0.8
            avg_attempts = np.mean(practice_attempts_list) if practice_attempts_list else 1.5
            prev_success_rate = np.mean(all_outcomes) if all_outcomes else 0.5
            
            # Target performance calculation
            diff_penalty = (topic["difficulty"] - 1.0) * 0.15
            prereq_penalty = 0.25 if prereq_mastery < 0.5 else 0.0
            forgetting_penalty = min(0.15, days_since_topic * 0.01)
            
            expected_score = base_ability + (topic_mastery * 0.25) - diff_penalty - prereq_penalty - forgetting_penalty
            actual_score = float(np.clip(expected_score + np.random.normal(0, noise_std), 0.05, 0.99))
            
            # Difficulty fit: peak when expected score is in flow channel (~0.65-0.75)
            diff_fit = 1.0 - min(1.0, abs(expected_score - 0.70) * 1.8)
            
            # Abandonment simulation (occurs if task is far too hard for current ability & prereqs missing)
            abandoned = False
            if (topic["difficulty"] >= 2.5 and base_ability < 0.35 and prereq_completed == 0 and random.random() < 0.30):
                abandoned = True
                actual_score = min(actual_score, 0.25)
            
            # Pre-task feature vector for Model 1 (T0 snapshot strictly before outcome)
            m1_feature_row = {
                "studentId": student_id,
                "targetTopicId": topic["id"],
                "skillId": topic["skillId"],
                "t0_timestamp": current_time.isoformat(),
                "isSynthetic": True,
                "environment": "development",
                
                # Numeric Features (20)
                "historicalTheoryAvg": float(hist_theory_avg),
                "historicalPracticalAvg": float(hist_prac_avg),
                "practiceCompletionRate": float(practice_rate),
                "avgAttemptsPerPractice": float(avg_attempts),
                "totalEvaluatedActivities": len(theory_scores) + len(practical_scores),
                "recentTheoryAverage": float(recent_theory),
                "recentPracticalAverage": float(recent_prac),
                "topicMastery": float(topic_mastery),
                "topicAttempts": int(topic_attempts),
                "topicSuccessRate": float(topic_success_rate),
                "topicConsistency": float(topic_consistency),
                "avgDifficultyAttempted": float(np.mean([t["difficulty"] for t in TOPICS[:3]])),
                "highestCompletedDifficulty": 3.0 if topic_mastery > 0.8 else (2.0 if topic_mastery > 0.5 else 1.0),
                "recentDifficulty": float(topic["difficulty"]),
                "daysSinceLastActivity": float(days_since_last),
                "daysSinceTopicActivity": float(days_since_topic),
                "recentActivityCount": min(20, task_step),
                "targetDifficulty": float(topic["difficulty"]),
                "prereqMastery": float(prereq_mastery),
                "prereqCompletionCount": prereq_completed,
                
                # Categorical Features (4)
                "recentTheoryTrend": theory_trend,
                "recentPracticalTrend": prac_trend,
                "masterySource": "assessment" if task_type in ['assessment', 'company_challenge'] else "practice",
                "targetTaskType": task_type,
                
                # TARGET
                "targetNextScore": round(actual_score, 4)
            }
            m1_records.append(m1_feature_row)
            
            # Priority score baseline:
            repetition_penalty = min(30, t_data["attempts"] * 6)
            priority = int(np.clip(
                (diff_fit * 45) +
                ((1.0 - topic_mastery) * 30) +
                ((1.0 - weakest_topic_mastery) * 15) +
                (10 if prereq_completed else -25) -
                repetition_penalty,
                5, 95
            ))
            
            passed = 0 if abandoned else (1 if actual_score >= 0.70 else 0)
            
            # Model 2 observation: Candidate task selection & outcome
            # NOTE (Phase 34): predictedNextScore is initialized to None / placeholder here
            # and MUST be filled exclusively by the trained Model 1 pipeline (out-of-sample).
            # Oracle expected_score is NEVER exposed to Model 2.
            m2_record = {
                "studentId": student_id,
                "recommendationId": f"rec_synth_{s_idx}_{task_step}",
                "timestamp": current_time.isoformat(),
                "isSynthetic": True,
                "environment": "development",
                
                # Model 2 Pre-Task Features (Pre-selection student state)
                "predictedNextScore": None, # Populated by Model 1 out-of-sample pipeline
                "currentMastery": round(float(topic_mastery), 4),
                "weakestTopicMastery": round(float(weakest_topic_mastery), 4),
                "prereqSatisfied": int(prereq_completed),
                "syllabusDepth": float(topic["depth"]),
                "previousTasksCount": int(task_step),
                "previousSuccessRate": round(float(prev_success_rate), 4),
                "daysSinceLastActivity": round(float(days_since_last), 4),
                "candidateDifficulty": float(topic["difficulty"]),
                "difficultyFit": round(float(diff_fit), 4),
                "repetitionCount": int(t_data["attempts"]),
                "priorityScore": priority,
                "candidateTaskType": task_type,
                "topicId": topic["id"],
                "skillId": topic["skillId"],
                
                # Model 2 Outcomes (Post-selection evaluation)
                "actualOutcomeScore": round(actual_score, 4),
                "actualOutcomePassed": passed,
                "actualOutcomeCompleted": 0 if abandoned else 1
            }
            m2_records.append(m2_record)
            
            # Update running state strictly AFTER recording pre-task features
            all_outcomes.append(passed)
            if task_type in ['learning_topic', 'assessment']:
                theory_scores.append(actual_score)
            else:
                practical_scores.append(actual_score)
                practice_attempts_list.append(random.randint(1, 3))
                if actual_score >= 0.6 and not abandoned:
                    practice_completions += 1
            
            # Student learning gain
            if not abandoned:
                gain = learn_rate * (1.0 - topic_mastery)
                base_ability = np.clip(base_ability + gain * 0.4, 0.1, 0.98)
                t_data["attempts"] += 1
                t_data["scores"].append(actual_score)
                t_data["mastery"] = np.clip(t_data["mastery"] + gain, 0.0, 0.98)
            else:
                t_data["attempts"] += 1
                t_data["scores"].append(actual_score)
            
            last_activity_time = current_time
            topic_last_activity[topic["id"]] = current_time

    # Trim to target limits
    m1_final = m1_records[:target_m1_obs]
    m2_final = m2_records[:target_m2_obs]
    
    m1_path = os.path.join(DEV_DATA_DIR, 'model1_synthetic.json')
    m2_path = os.path.join(DEV_DATA_DIR, 'model2_synthetic.json')
    
    with open(m1_path, 'w') as f:
        json.dump(m1_final, f, indent=2)
        
    with open(m2_path, 'w') as f:
        json.dump(m2_final, f, indent=2)
        
    meta = {
        "version": "synthetic-v1",
        "generatedAt": datetime.utcnow().isoformat(),
        "seed": SEED,
        "environment": "development",
        "isSynthetic": True,
        "model1Observations": len(m1_final),
        "model2Observations": len(m2_final),
        "uniqueStudents": num_students,
        "topicsCount": len(TOPICS)
    }
    
    with open(os.path.join(DEV_DATA_DIR, 'metadata.json'), 'w') as f:
        json.dump(meta, f, indent=2)

    print(f"Generated {len(m1_final)} Model 1 observations -> {m1_path}")
    print(f"Generated {len(m2_final)} Model 2 observations -> {m2_path}")
    return meta

if __name__ == '__main__':
    generate_datasets()

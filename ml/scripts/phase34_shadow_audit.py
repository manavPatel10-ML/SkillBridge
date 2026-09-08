import os
import sys
import json
import random
import numpy as np
import pandas as pd
from datetime import datetime

import joblib
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.metrics import (
    accuracy_score, roc_auc_score, f1_score, precision_score, recall_score, log_loss,
    mean_absolute_error, mean_squared_error, r2_score
)

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEV_DATA_DIR = os.path.join(BASE_DIR, 'dev-data')
AUDIT_RESULTS_DIR = os.path.join(BASE_DIR, 'audit-results')
os.makedirs(AUDIT_RESULTS_DIR, exist_ok=True)

M1_ARTIFACTS_DIR = os.path.join(BASE_DIR, 'model1', 'artifacts')
M2_ARTIFACTS_DIR = os.path.join(BASE_DIR, 'model2', 'artifacts')

# Load configs
import importlib.util

spec1 = importlib.util.spec_from_file_location("m1_config", os.path.join(BASE_DIR, 'model1', 'config.py'))
m1_config = importlib.util.module_from_spec(spec1)
spec1.loader.exec_module(m1_config)

spec2 = importlib.util.spec_from_file_location("m2_config", os.path.join(BASE_DIR, 'model2', 'config.py'))
m2_config = importlib.util.module_from_spec(spec2)
spec2.loader.exec_module(m2_config)

sys.path.insert(0, os.path.join(BASE_DIR, 'scripts'))
from generate_synthetic_data import TOPICS, TASK_TYPES

SEEDS = [7, 21, 42, 100, 2026]

def build_preprocessor(numeric_cols, categorical_cols):
    transformers = []
    if numeric_cols:
        transformers.append(('num', Pipeline([
            ('imputer', SimpleImputer(strategy='median')),
            ('scaler', StandardScaler())
        ]), numeric_cols))
    if categorical_cols:
        transformers.append(('cat', Pipeline([
            ('imputer', SimpleImputer(strategy='constant', fill_value='missing')),
            ('onehot', OneHotEncoder(handle_unknown='ignore'))
        ]), categorical_cols))
    return ColumnTransformer(transformers=transformers)

def evaluate_classification(y_true, y_pred, y_prob):
    acc = accuracy_score(y_true, y_pred)
    auc = roc_auc_score(y_true, y_prob) if len(np.unique(y_true)) > 1 else 0.5
    f1 = f1_score(y_true, y_pred, zero_division=0)
    loss = log_loss(y_true, y_prob, labels=[0, 1])
    return {
        "Accuracy": round(float(acc), 4),
        "ROC_AUC": round(float(auc), 4),
        "F1": round(float(f1), 4),
        "LogLoss": round(float(loss), 4)
    }

# =========================================================================
# 1. VERIFY MODEL 1 INTEGRITY
# =========================================================================
def verify_model1_integrity():
    print("\n--- 1. Verifying Model 1 Integrity ---")
    m1_path = os.path.join(DEV_DATA_DIR, 'model1_synthetic.json')
    with open(m1_path, 'r') as f:
        records = json.load(f)
    
    df = pd.DataFrame(records)
    df['t0_timestamp'] = pd.to_datetime(df['t0_timestamp'])
    df = df.sort_values('t0_timestamp').reset_index(drop=True)
    
    test_df = df.iloc[int(len(df) * 0.85):]
    feature_cols = m1_config.NUMERIC_FEATURES + m1_config.CATEGORICAL_FEATURES
    
    m1_pipeline = joblib.load(os.path.join(M1_ARTIFACTS_DIR, 'model_v1.joblib'))
    y_true = test_df[m1_config.TARGET_COLUMN].values
    y_pred = np.clip(m1_pipeline.predict(test_df[feature_cols]), 0.0, 1.0)
    
    mae = float(mean_absolute_error(y_true, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    r2 = float(r2_score(y_true, y_pred))
    
    res = {
        "MAE": round(mae, 4),
        "RMSE": round(rmse, 4),
        "R2": round(r2, 4),
        "Status": "EXPERIMENTAL"
    }
    print(f"Model 1 Integrity Check -> MAE: {res['MAE']}, RMSE: {res['RMSE']}, R²: {res['R2']}, Status: {res['Status']}")
    return res

# =========================================================================
# 2. MODEL 2 EVALUATION ON RETRAINED REALISTIC PIPELINE
# =========================================================================
def evaluate_model2_retrained():
    print("\n--- 2. Evaluating Retrained Model 2 on Corrected Pipeline ---")
    m2_path = os.path.join(DEV_DATA_DIR, 'model2_synthetic.json')
    with open(m2_path, 'r') as f:
        records = json.load(f)
        
    df = pd.DataFrame(records)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df = df.sort_values('timestamp').reset_index(drop=True)
    
    test_df = df.iloc[int(len(df) * 0.85):]
    feature_cols = m2_config.FEATURES + m2_config.CATEGORICAL_FEATURES
    
    m2_pipeline = joblib.load(os.path.join(M2_ARTIFACTS_DIR, 'model.joblib'))
    y_true = test_df[m2_config.TARGET].values
    y_prob = m2_pipeline.predict_proba(test_df[feature_cols])[:, 1]
    y_pred = (y_prob >= 0.5).astype(int)
    
    ml_metrics = evaluate_classification(y_true, y_pred, y_prob)
    
    # Baseline
    b_prob = test_df['priorityScore'].clip(0.0, 1.0).values
    b_pred = (b_prob >= 0.5).astype(int)
    baseline_metrics = evaluate_classification(y_true, b_pred, b_prob)
    
    print(f"Model 2 Test Metrics: {ml_metrics}")
    print(f"Baseline Test Metrics: {baseline_metrics}")
    
    return {
        "model2": ml_metrics,
        "baseline": baseline_metrics,
        "comparison": {
            "roc_auc_gain": round(ml_metrics['ROC_AUC'] - baseline_metrics['ROC_AUC'], 4),
            "accuracy_gain": round(ml_metrics['Accuracy'] - baseline_metrics['Accuracy'], 4),
            "logloss_reduction": round(baseline_metrics['LogLoss'] - ml_metrics['LogLoss'], 4)
        }
    }

# =========================================================================
# 3. FEATURE ABLATION ON MODEL 2 (ORACLE REMOVAL VERIFICATION)
# =========================================================================
def run_model2_ablation():
    print("\n--- 3. Running Model 2 Feature Ablation Study ---")
    m2_path = os.path.join(DEV_DATA_DIR, 'model2_synthetic.json')
    with open(m2_path, 'r') as f:
        records = json.load(f)
        
    df = pd.DataFrame(records)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df = df.sort_values('timestamp').reset_index(drop=True)
    
    train_end = int(len(df) * 0.70)
    val_end = int(len(df) * 0.85)
    train_df = df.iloc[:train_end]
    test_df = df.iloc[val_end:]
    
    feature_subsets = {
        "A_Model1_Prediction_Only": (["predictedNextScore"], []),
        "B_Mastery_Topic_State_Only": (["currentMastery", "weakestTopicMastery", "prereqSatisfied", "syllabusDepth"], []),
        "C_Previous_History_Only": (["previousTasksCount", "previousSuccessRate", "daysSinceLastActivity", "repetitionCount"], []),
        "D_Candidate_Metadata_Only": (["candidateDifficulty", "difficultyFit", "priorityScore"], ["candidateTaskType", "topicId", "skillId"]),
        "E_Full_Feature_Set": (m2_config.FEATURES, m2_config.CATEGORICAL_FEATURES)
    }
    
    ablation_results = {}
    
    for name, (nums, cats) in feature_subsets.items():
        preprocessor = build_preprocessor(nums, cats)
        clf = GradientBoostingClassifier(n_estimators=100, max_depth=4, learning_rate=0.1, random_state=42)
        pipe = Pipeline([
            ('preprocessor', preprocessor),
            ('classifier', clf)
        ])
        
        pipe.fit(train_df[nums + cats], train_df[m2_config.TARGET])
        y_test = test_df[m2_config.TARGET].values
        y_prob = pipe.predict_proba(test_df[nums + cats])[:, 1]
        y_pred = (y_prob >= 0.5).astype(int)
        
        metrics = evaluate_classification(y_test, y_pred, y_prob)
        ablation_results[name] = metrics
        print(f"  {name}: ROC-AUC={metrics['ROC_AUC']}, Accuracy={metrics['Accuracy']}, F1={metrics['F1']}, LogLoss={metrics['LogLoss']}")
        
    return ablation_results

# =========================================================================
# 4. NEGATIVE CONTROL: TARGET SHUFFLE
# =========================================================================
def run_target_shuffle():
    print("\n--- 4. Running Model 2 Negative Control (Target Shuffle) ---")
    m2_path = os.path.join(DEV_DATA_DIR, 'model2_synthetic.json')
    with open(m2_path, 'r') as f:
        records = json.load(f)
        
    df = pd.DataFrame(records)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df = df.sort_values('timestamp').reset_index(drop=True)
    
    train_end = int(len(df) * 0.70)
    val_end = int(len(df) * 0.85)
    train_df = df.iloc[:train_end].copy()
    test_df = df.iloc[val_end:].copy()
    
    # Shuffle target
    np.random.seed(42)
    train_df['passed_shuffled'] = np.random.permutation(train_df[m2_config.TARGET].values)
    test_df['passed_shuffled'] = np.random.permutation(test_df[m2_config.TARGET].values)
    
    feature_cols = m2_config.FEATURES + m2_config.CATEGORICAL_FEATURES
    preprocessor = build_preprocessor(m2_config.FEATURES, m2_config.CATEGORICAL_FEATURES)
    clf = GradientBoostingClassifier(n_estimators=100, max_depth=4, learning_rate=0.1, random_state=42)
    pipe = Pipeline([
        ('preprocessor', preprocessor),
        ('classifier', clf)
    ])
    
    pipe.fit(train_df[feature_cols], train_df['passed_shuffled'])
    y_test = test_df['passed_shuffled'].values
    y_prob = pipe.predict_proba(test_df[feature_cols])[:, 1]
    y_pred = (y_prob >= 0.5).astype(int)
    
    shuffle_metrics = evaluate_classification(y_test, y_pred, y_prob)
    print(f"Target Shuffle Result -> ROC-AUC: {shuffle_metrics['ROC_AUC']}, Accuracy: {shuffle_metrics['Accuracy']}, F1: {shuffle_metrics['F1']}")
    return shuffle_metrics

# =========================================================================
# 5. MULTI-SEED STABILITY TEST
# =========================================================================
def run_multi_seed_test():
    print("\n--- 5. Running Multi-Seed Test (Seeds: 7, 21, 42, 100, 2026) ---")
    m2_path = os.path.join(DEV_DATA_DIR, 'model2_synthetic.json')
    with open(m2_path, 'r') as f:
        records = json.load(f)
        
    df = pd.DataFrame(records)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df = df.sort_values('timestamp').reset_index(drop=True)
    
    train_end = int(len(df) * 0.70)
    val_end = int(len(df) * 0.85)
    train_df = df.iloc[:train_end]
    test_df = df.iloc[val_end:]
    
    feature_cols = m2_config.FEATURES + m2_config.CATEGORICAL_FEATURES
    
    seed_results = []
    
    for seed in SEEDS:
        preprocessor = build_preprocessor(m2_config.FEATURES, m2_config.CATEGORICAL_FEATURES)
        clf = GradientBoostingClassifier(n_estimators=100, max_depth=4, learning_rate=0.1, random_state=seed)
        pipe = Pipeline([
            ('preprocessor', preprocessor),
            ('classifier', clf)
        ])
        pipe.fit(train_df[feature_cols], train_df[m2_config.TARGET])
        y_test = test_df[m2_config.TARGET].values
        y_prob = pipe.predict_proba(test_df[feature_cols])[:, 1]
        y_pred = (y_prob >= 0.5).astype(int)
        
        m = evaluate_classification(y_test, y_pred, y_prob)
        seed_results.append(m)
        print(f"  Seed {seed} -> ROC-AUC: {m['ROC_AUC']}, Accuracy: {m['Accuracy']}, F1: {m['F1']}, LogLoss: {m['LogLoss']}")
        
    auc_vals = [r['ROC_AUC'] for r in seed_results]
    acc_vals = [r['Accuracy'] for r in seed_results]
    f1_vals = [r['F1'] for r in seed_results]
    loss_vals = [r['LogLoss'] for r in seed_results]
    
    res = {
        "seeds": SEEDS,
        "mean_roc_auc": round(float(np.mean(auc_vals)), 4),
        "std_roc_auc": round(float(np.std(auc_vals)), 4),
        "mean_accuracy": round(float(np.mean(acc_vals)), 4),
        "mean_f1": round(float(np.mean(f1_vals)), 4),
        "mean_logloss": round(float(np.mean(loss_vals)), 4)
    }
    print(f"Multi-Seed Summary -> Mean ROC-AUC: {res['mean_roc_auc']} (+/- {res['std_roc_auc']}), Mean Acc: {res['mean_accuracy']}")
    return res

# =========================================================================
# 6. UNSEEN STUDENT GENERALIZATION TEST
# =========================================================================
def run_unseen_student_test():
    print("\n--- 6. Running Unseen Student Generalization Test ---")
    m2_path = os.path.join(DEV_DATA_DIR, 'model2_synthetic.json')
    with open(m2_path, 'r') as f:
        records = json.load(f)
        
    df = pd.DataFrame(records)
    unique_students = list(df['studentId'].unique())
    random.seed(42)
    random.shuffle(unique_students)
    
    split_idx = int(len(unique_students) * 0.80)
    train_students = set(unique_students[:split_idx])
    unseen_students = set(unique_students[split_idx:])
    
    train_df = df[df['studentId'].isin(train_students)].copy()
    test_df = df[df['studentId'].isin(unseen_students)].copy()
    
    print(f"Train Students: {len(train_students)} ({len(train_df)} rows), Unseen Test Students: {len(unseen_students)} ({len(test_df)} rows)")
    
    feature_cols = m2_config.FEATURES + m2_config.CATEGORICAL_FEATURES
    preprocessor = build_preprocessor(m2_config.FEATURES, m2_config.CATEGORICAL_FEATURES)
    clf = GradientBoostingClassifier(n_estimators=100, max_depth=4, learning_rate=0.1, random_state=42)
    pipe = Pipeline([
        ('preprocessor', preprocessor),
        ('classifier', clf)
    ])
    
    pipe.fit(train_df[feature_cols], train_df[m2_config.TARGET])
    y_test = test_df[m2_config.TARGET].values
    y_prob = pipe.predict_proba(test_df[feature_cols])[:, 1]
    y_pred = (y_prob >= 0.5).astype(int)
    
    metrics = evaluate_classification(y_test, y_pred, y_prob)
    print(f"Unseen Student Results -> ROC-AUC: {metrics['ROC_AUC']}, Accuracy: {metrics['Accuracy']}, F1: {metrics['F1']}, LogLoss: {metrics['LogLoss']}")
    return metrics

# =========================================================================
# 7. TOP-K TASK SELECTION EVALUATION
# =========================================================================
def run_topk_task_selection():
    print("\n--- 7. Running Top-K Task Selection Evaluation ---")
    m2_path = os.path.join(DEV_DATA_DIR, 'model2_synthetic.json')
    with open(m2_path, 'r') as f:
        records = json.load(f)
        
    df = pd.DataFrame(records)
    m2_pipeline = joblib.load(os.path.join(M2_ARTIFACTS_DIR, 'model.joblib'))
    feature_cols = m2_config.FEATURES + m2_config.CATEGORICAL_FEATURES
    
    # Group observations by student to simulate task menus
    grouped = df.groupby('studentId')
    
    ml_top1_passed = []
    ml_top3_passed = []
    ml_top5_passed = []
    
    base_top1_passed = []
    base_top3_passed = []
    base_top5_passed = []
    
    ml_expected_scores = []
    base_expected_scores = []
    
    ml_weak_topics = []
    base_weak_topics = []
    
    ml_diff_fits = []
    base_diff_fits = []
    
    ml_repetition = []
    base_repetition = []

    for sid, group in list(grouped)[:50]:
        if len(group) < 10:
            continue
        candidates = group.head(10).copy()
        
        ml_probs = m2_pipeline.predict_proba(candidates[feature_cols])[:, 1]
        candidates['ml_score'] = ml_probs
        
        ml_ranked = candidates.sort_values('ml_score', ascending=False).reset_index(drop=True)
        base_ranked = candidates.sort_values('priorityScore', ascending=False).reset_index(drop=True)
        
        # Observed simulated outcomes
        ml_top1_passed.append(ml_ranked.iloc[0]['actualOutcomePassed'])
        ml_top3_passed.append(ml_ranked.iloc[:3]['actualOutcomePassed'].mean())
        ml_top5_passed.append(ml_ranked.iloc[:5]['actualOutcomePassed'].mean())
        
        base_top1_passed.append(base_ranked.iloc[0]['actualOutcomePassed'])
        base_top3_passed.append(base_ranked.iloc[:3]['actualOutcomePassed'].mean())
        base_top5_passed.append(base_ranked.iloc[:5]['actualOutcomePassed'].mean())
        
        ml_expected_scores.append(ml_ranked.iloc[0]['predictedNextScore'])
        base_expected_scores.append(base_ranked.iloc[0]['predictedNextScore'])
        
        # Weak topic targeting: proportion targeting topic where weakestTopicMastery < 0.6
        ml_weak_topics.append(1.0 if ml_ranked.iloc[0]['weakestTopicMastery'] < 0.6 else 0.0)
        base_weak_topics.append(1.0 if base_ranked.iloc[0]['weakestTopicMastery'] < 0.6 else 0.0)
        
        # Difficulty fit
        ml_diff_fits.append(ml_ranked.iloc[0]['difficultyFit'])
        base_diff_fits.append(base_ranked.iloc[0]['difficultyFit'])
        
        # Repetition rate
        ml_repetition.append(ml_ranked.iloc[0]['repetitionCount'])
        base_repetition.append(base_ranked.iloc[0]['repetitionCount'])
        
    topk_results = {
        "observed_simulated_outcomes": {
            "ml": {
                "top_1_pass_rate": round(float(np.mean(ml_top1_passed)), 4),
                "top_3_pass_rate": round(float(np.mean(ml_top3_passed)), 4),
                "top_5_pass_rate": round(float(np.mean(ml_top5_passed)), 4),
                "expected_score": round(float(np.mean(ml_expected_scores)), 4),
                "weak_topic_targeting": round(float(np.mean(ml_weak_topics)), 4),
                "difficulty_fit": round(float(np.mean(ml_diff_fits)), 4),
                "repetition_rate": round(float(np.mean(ml_repetition)), 4)
            },
            "deterministic_baseline": {
                "top_1_pass_rate": round(float(np.mean(base_top1_passed)), 4),
                "top_3_pass_rate": round(float(np.mean(base_top3_passed)), 4),
                "top_5_pass_rate": round(float(np.mean(base_top5_passed)), 4),
                "expected_score": round(float(np.mean(base_expected_scores)), 4),
                "weak_topic_targeting": round(float(np.mean(base_weak_topics)), 4),
                "difficulty_fit": round(float(np.mean(base_diff_fits)), 4),
                "repetition_rate": round(float(np.mean(base_repetition)), 4)
            }
        }
    }
    print(f"Top-K Task Selection Results:")
    print(f"  ML: Top-1={topk_results['observed_simulated_outcomes']['ml']['top_1_pass_rate']}, Top-3={topk_results['observed_simulated_outcomes']['ml']['top_3_pass_rate']}, Top-5={topk_results['observed_simulated_outcomes']['ml']['top_5_pass_rate']}")
    print(f"  Baseline: Top-1={topk_results['observed_simulated_outcomes']['deterministic_baseline']['top_1_pass_rate']}, Top-3={topk_results['observed_simulated_outcomes']['deterministic_baseline']['top_3_pass_rate']}")
    return topk_results

# =========================================================================
# 8. SHADOW EVALUATION MODE (DEVELOPMENT-ONLY OBSERVATION)
# =========================================================================
def run_shadow_evaluation():
    print("\n--- 8. Running Shadow Evaluation Mode (Side-by-Side Comparison) ---")
    m2_path = os.path.join(DEV_DATA_DIR, 'model2_synthetic.json')
    with open(m2_path, 'r') as f:
        records = json.load(f)
        
    df = pd.DataFrame(records)
    m2_pipeline = joblib.load(os.path.join(M2_ARTIFACTS_DIR, 'model.joblib'))
    feature_cols = m2_config.FEATURES + m2_config.CATEGORICAL_FEATURES
    
    grouped = df.groupby('studentId')
    shadow_logs = []
    
    agreements = 0
    total_states = 0
    rank_differences = []
    top3_overlaps = []
    ml_confidences = []
    base_confidences = []
    
    for sid, group in list(grouped)[:100]:
        if len(group) < 5:
            continue
        candidates = group.head(5).copy()
        ml_probs = m2_pipeline.predict_proba(candidates[feature_cols])[:, 1]
        candidates['ml_score'] = ml_probs
        
        base_ranked = candidates.sort_values('priorityScore', ascending=False).reset_index(drop=True)
        ml_ranked = candidates.sort_values('ml_score', ascending=False).reset_index(drop=True)
        
        det_task = base_ranked.iloc[0]['topicId'] + "_" + base_ranked.iloc[0]['candidateTaskType']
        ml_task = ml_ranked.iloc[0]['topicId'] + "_" + ml_ranked.iloc[0]['candidateTaskType']
        
        det_score = float(base_ranked.iloc[0]['priorityScore'])
        ml_score = float(ml_ranked.iloc[0]['ml_score'])
        m1_pred = float(ml_ranked.iloc[0]['predictedNextScore'])
        
        is_agree = (det_task == ml_task)
        if is_agree:
            agreements += 1
        total_states += 1
        
        base_top_idx_in_ml = 0
        for r_idx, row in ml_ranked.iterrows():
            if row['topicId'] + "_" + row['candidateTaskType'] == det_task:
                base_top_idx_in_ml = r_idx
                break
        rank_differences.append(abs(base_top_idx_in_ml - 0))
        
        top3_det = set(base_ranked.head(3)['topicId'] + "_" + base_ranked.head(3)['candidateTaskType'])
        top3_ml = set(ml_ranked.head(3)['topicId'] + "_" + ml_ranked.head(3)['candidateTaskType'])
        overlap_cnt = len(top3_det.intersection(top3_ml))
        top3_overlaps.append(overlap_cnt / 3.0)
        
        ml_confidences.append(abs(ml_score - 0.5) * 2)
        base_confidences.append(abs(det_score - 0.5) * 2)
        
        reason = "Aligned priority" if is_agree else f"ML preferred task with success probability {ml_score:.2f} over baseline priority {det_score:.2f}"
        
        shadow_logs.append({
            "studentId": sid,
            "state": {
                "currentMastery": float(candidates.iloc[0]['currentMastery']),
                "weakestTopicMastery": float(candidates.iloc[0]['weakestTopicMastery']),
                "previousTasksCount": int(candidates.iloc[0]['previousTasksCount'])
            },
            "deterministicTask": det_task,
            "mlTask": ml_task,
            "model1Prediction": round(m1_pred, 4),
            "model2Score": round(ml_score, 4),
            "agreement": is_agree,
            "reason": reason
        })
        
    agreement_rate = round(agreements / max(total_states, 1), 4)
    divergence_rate = round(1.0 - agreement_rate, 4)
    avg_rank_diff = round(float(np.mean(rank_differences)), 4)
    avg_top3_overlap = round(float(np.mean(top3_overlaps)), 4)
    avg_ml_conf = round(float(np.mean(ml_confidences)), 4)
    avg_base_conf = round(float(np.mean(base_confidences)), 4)
    
    print(f"Shadow Evaluation Summary ({total_states} student states evaluated):")
    print(f"  Agreement Rate: {agreement_rate * 100}%")
    print(f"  Divergence Rate: {divergence_rate * 100}%")
    print(f"  Avg Ranking Difference: {avg_rank_diff}")
    print(f"  Top-3 Overlap: {avg_top3_overlap * 100}%")
    print(f"  Model Confidence: {avg_ml_conf}, Baseline Confidence: {avg_base_conf}")
    
    return {
        "total_shadow_states": total_states,
        "agreement_rate": agreement_rate,
        "divergence_rate": divergence_rate,
        "average_ranking_difference": avg_rank_diff,
        "top_k_overlap": avg_top3_overlap,
        "model_confidence": avg_ml_conf,
        "baseline_confidence": avg_base_conf,
        "sample_logs": shadow_logs[:5]
    }


# =========================================================================
# MAIN EXECUTION & REPORT GENERATION
# =========================================================================
def main():
    print("====================================================================")
    print("PHASE 34: MODEL 2 REALISTIC SYNTHETIC PIPELINE & SHADOW EVALUATION")
    print("====================================================================")
    
    # 1. Model 1 Integrity
    m1_res = verify_model1_integrity()
    
    # 2. Retrained Model 2 Performance
    m2_res = evaluate_model2_retrained()
    
    # 3. Model 2 Ablation
    ablation_res = run_model2_ablation()
    
    # 4. Target Shuffle
    shuffle_res = run_target_shuffle()
    
    # 5. Multi-Seed Stability
    multi_seed_res = run_multi_seed_test()
    
    # 6. Unseen Student Test
    unseen_res = run_unseen_student_test()
    
    # 7. Top-K Task Selection
    topk_res = run_topk_task_selection()
    
    # 8. Shadow Evaluation
    shadow_res = run_shadow_evaluation()
    
    results = {
        "phase": 34,
        "timestamp": datetime.utcnow().isoformat(),
        "oracle_shortcut_removed": True,
        "model1": m1_res,
        "model2": m2_res,
        "ablation": ablation_res,
        "target_shuffle": shuffle_res,
        "multi_seed": multi_seed_res,
        "unseen_student": unseen_res,
        "topk_selection": topk_res,
        "shadow_evaluation": shadow_res,
        "production_boundaries": {
            "model1_real_observations": 0,
            "model1_real_threshold": 5000,
            "model1_status": "NOT_READY",
            "model2_real_observations": 0,
            "model2_real_threshold": 1000,
            "model2_status": "NOT_READY",
            "deterministic_baselines_active": True,
            "shadow_eval_mutations": False
        }
    }
    
    out_file = os.path.join(AUDIT_RESULTS_DIR, 'phase34_results.json')
    with open(out_file, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"\nPhase 34 Comprehensive Results successfully saved -> {out_file}")

if __name__ == '__main__':
    main()

import os
import sys
import json
import logging
import argparse
from datetime import datetime, timezone

import pandas as pd
import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import accuracy_score, roc_auc_score, f1_score, precision_score, recall_score, log_loss
import joblib

import config

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def build_preprocessing_pipeline():
    numeric_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])

    categorical_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='constant', fill_value='missing')),
        ('onehot', OneHotEncoder(handle_unknown='ignore'))
    ])

    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numeric_transformer, config.FEATURES),
            ('cat', categorical_transformer, config.CATEGORICAL_FEATURES)
        ])
    return preprocessor

def evaluate_classification(y_true, y_pred, y_prob, model_name):
    acc = accuracy_score(y_true, y_pred)
    auc = roc_auc_score(y_true, y_prob) if len(np.unique(y_true)) > 1 else 0.5
    f1 = f1_score(y_true, y_pred, zero_division=0)
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred, zero_division=0)
    loss = log_loss(y_true, y_prob, labels=[0, 1])

    logging.info(f"--- {model_name} ---")
    logging.info(f"Accuracy:  {acc:.4f}")
    logging.info(f"ROC-AUC:   {auc:.4f}")
    logging.info(f"F1 Score:  {f1:.4f}")
    logging.info(f"Precision: {prec:.4f}")
    logging.info(f"Recall:    {rec:.4f}")
    logging.info(f"Log Loss:  {loss:.4f}")

    return {
        "Accuracy": round(float(acc), 4),
        "ROC_AUC": round(float(auc), 4),
        "F1": round(float(f1), 4),
        "Precision": round(float(prec), 4),
        "Recall": round(float(rec), 4),
        "LogLoss": round(float(loss), 4)
    }

def main():
    parser = argparse.ArgumentParser(description="Model 2 Adaptive Task Assignment Training")
    parser.add_argument("--data", type=str, default=None, help="Path to Model 2 dataset JSON")
    args = parser.parse_args()

    data_path = args.data
    is_synthetic = False
    dev_path = os.path.join(os.path.dirname(config.BASE_DIR), 'dev-data', 'model2_synthetic.json')

    if not data_path:
        if os.path.exists(config.DATA_FILE):
            try:
                with open(config.DATA_FILE, 'r') as f:
                    real_records = json.load(f)
                if len(real_records) >= config.MIN_SAMPLES_REQUIRED:
                    data_path = config.DATA_FILE
                else:
                    logging.info(f"Real data has {len(real_records)} records (< {config.MIN_SAMPLES_REQUIRED}). Using synthetic development data.")
                    data_path = dev_path
                    is_synthetic = True
            except Exception:
                data_path = dev_path
                is_synthetic = True
        else:
            data_path = dev_path
            is_synthetic = True
    else:
        if "dev-data" in data_path or "synthetic" in data_path:
            is_synthetic = True

    logging.info(f"Loading Model 2 dataset from: {data_path}")
    with open(data_path, 'r') as f:
        records = json.load(f)

    df = pd.DataFrame(records)
    total_obs = len(df)
    unique_students = int(df['studentId'].nunique()) if 'studentId' in df.columns else 0

    logging.info(f"Model 2 dataset: {total_obs} observations across {unique_students} unique students.")

    if total_obs < 500:
        logging.error(f"Insufficient training observations: {total_obs} < 500")
        sys.exit(1)

    # Temporal split: sort strictly by timestamp
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df = df.sort_values('timestamp').reset_index(drop=True)

    n = len(df)
    train_end = int(n * 0.70)
    val_end = int(n * 0.85)

    train_df = df.iloc[:train_end]
    val_df = df.iloc[train_end:val_end]
    test_df = df.iloc[val_end:]

    logging.info(f"Split sizes - Train: {len(train_df)}, Val: {len(val_df)}, Test: {len(test_df)}")

    # Temporal check
    max_train_time = train_df['timestamp'].max()
    min_val_time = val_df['timestamp'].min()
    max_val_time = val_df['timestamp'].max()
    min_test_time = test_df['timestamp'].min()

    assert max_train_time <= min_val_time, "Temporal leakage detected between Train and Validation!"
    assert max_val_time <= min_test_time, "Temporal leakage detected between Validation and Test!"
    logging.info("Temporal split strictly validated without leakage.")

    feature_cols = config.FEATURES + config.CATEGORICAL_FEATURES
    X_train = train_df[feature_cols]
    y_train = train_df[config.TARGET]

    X_val = val_df[feature_cols]
    y_val = val_df[config.TARGET]

    X_test = test_df[feature_cols]
    y_test = test_df[config.TARGET]

    # Preprocessing
    preprocessor = build_preprocessing_pipeline()
    X_train_trans = preprocessor.fit_transform(X_train)
    X_val_trans = preprocessor.transform(X_val)
    X_test_trans = preprocessor.transform(X_test)

    # Deterministic Baseline Evaluation (Using priorityScore)
    # Threshold priorityScore at 50 to predict pass
    val_priority = val_df['priorityScore']
    y_val_baseline_pred = (val_priority >= 50).astype(int)
    y_val_baseline_prob = val_priority / 100.0

    logging.info("\n--- Evaluating Deterministic Adaptive Baseline ---")
    val_baseline_metrics = evaluate_classification(y_val, y_val_baseline_pred, y_val_baseline_prob, "Deterministic Priority Baseline")

    # Train Candidate Models
    candidate_models = {
        "Logistic_Regression": LogisticRegression(max_iter=1000, random_state=42),
        "Random_Forest": RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1),
        "Gradient_Boosting": GradientBoostingClassifier(n_estimators=100, max_depth=3, learning_rate=0.1, random_state=42)
    }

    val_results = {}
    best_model_name = None
    best_val_auc = 0.0
    best_model_obj = None

    for name, model in candidate_models.items():
        logging.info(f"\nTraining {name}...")
        model.fit(X_train_trans, y_train)
        y_val_pred = model.predict(X_val_trans)
        y_val_prob = model.predict_proba(X_val_trans)[:, 1]
        metrics = evaluate_classification(y_val, y_val_pred, y_val_prob, f"Candidate: {name}")
        val_results[name] = metrics

        if metrics['ROC_AUC'] > best_val_auc:
            best_val_auc = metrics['ROC_AUC']
            best_model_name = name
            best_model_obj = model

    logging.info(f"\nBest Model on Validation Set: {best_model_name} (ROC-AUC: {best_val_auc:.4f})")

    # Evaluate on held-out TEST set
    test_priority = test_df['priorityScore']
    y_test_baseline_pred = (test_priority >= 50).astype(int)
    y_test_baseline_prob = test_priority / 100.0
    test_baseline_metrics = evaluate_classification(y_test, y_test_baseline_pred, y_test_baseline_prob, "Test: Deterministic Baseline")

    y_test_pred = best_model_obj.predict(X_test_trans)
    y_test_prob = best_model_obj.predict_proba(X_test_trans)[:, 1]
    test_best_metrics = evaluate_classification(y_test, y_test_pred, y_test_prob, f"Test: {best_model_name}")

    # Task Selection & Quality Comparison Metrics
    test_df_eval = test_df.copy()
    test_df_eval['baselineScore'] = y_test_baseline_prob
    test_df_eval['mlScore'] = y_test_prob

    # Top quintile selection comparison
    top_baseline = test_df_eval.nlargest(int(len(test_df_eval) * 0.2), 'baselineScore')
    top_ml = test_df_eval.nlargest(int(len(test_df_eval) * 0.2), 'mlScore')

    selection_comparison = {
        "baselinePassRate": round(float(top_baseline['actualOutcomePassed'].mean()), 4),
        "mlPassRate": round(float(top_ml['actualOutcomePassed'].mean()), 4),
        "baselineCompletionRate": round(float(top_baseline['actualOutcomeCompleted'].mean()), 4),
        "mlCompletionRate": round(float(top_ml['actualOutcomeCompleted'].mean()), 4),
        "baselineAvgDifficultyFit": round(float(top_baseline['difficultyFit'].mean()), 4),
        "mlAvgDifficultyFit": round(float(top_ml['difficultyFit'].mean()), 4),
        "baselineRepetitionAvg": round(float(top_baseline['repetitionCount'].mean()), 2),
        "mlRepetitionAvg": round(float(top_ml['repetitionCount'].mean()), 2),
        "baselineWeakTopicTargetingRate": round(float((top_baseline['currentMastery'] < 0.7).mean()), 4),
        "mlWeakTopicTargetingRate": round(float((top_ml['currentMastery'] < 0.7).mean()), 4)
    }

    logging.info("\n--- Task Selection Quality Comparison (Top 20% Recommended) ---")
    for k, v in selection_comparison.items():
        logging.info(f"{k}: {v}")

    # Save Pipeline Artifact
    full_pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('model', best_model_obj)
    ])

    os.makedirs(config.ARTIFACTS_DIR, exist_ok=True)
    joblib.dump(full_pipeline, config.MODEL_PATH)
    logging.info(f"Saved Model 2 pipeline to {config.MODEL_PATH}")

    model_status = "EXPERIMENTAL" if is_synthetic else "VALIDATED"

    metadata = {
        "status": model_status,
        "modelVersion": f"model2-{best_model_name.lower()}-v1",
        "featureSchemaVersion": "features-v2",
        "algorithm": best_model_name,
        "isSynthetic": is_synthetic,
        "environment": "development" if is_synthetic else "production",
        "datasetVersion": "synthetic-v1" if is_synthetic else "real-v1",
        "randomSeed": 42,
        "trainedAt": datetime.now(timezone.utc).isoformat(),
        "observations": {
            "total": total_obs,
            "train": len(train_df),
            "validation": len(val_df),
            "test": len(test_df),
            "uniqueStudents": unique_students,
            "featureCount": len(feature_cols)
        },
        "features": {
            "numeric": config.FEATURES,
            "categorical": config.CATEGORICAL_FEATURES,
            "target": config.TARGET
        },
        "validationMethodology": "Temporal Split (70% Train, 15% Validation, 15% Test)",
        "validationMetrics": val_results,
        "testMetrics": {
            "baseline": test_baseline_metrics,
            "model": test_best_metrics,
            "aucImprovement": round(float(test_best_metrics['ROC_AUC'] - test_baseline_metrics['ROC_AUC']), 4)
        },
        "selectionComparison": selection_comparison
    }

    with open(config.METADATA_PATH, 'w') as f:
        json.dump(metadata, f, indent=2)

    with open(config.METRICS_PATH, 'w') as f:
        json.dump(metadata["testMetrics"], f, indent=2)

    logging.info(f"Model 2 metadata saved to {config.METADATA_PATH} with status={model_status}")

if __name__ == '__main__':
    main()

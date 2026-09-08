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
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib

import config

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def evaluate_model(y_true, y_pred, model_name):
    mae = mean_absolute_error(y_true, y_pred)
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    r2 = r2_score(y_true, y_pred)
    logging.info(f"--- {model_name} ---")
    logging.info(f"MAE:  {mae:.4f}")
    logging.info(f"RMSE: {rmse:.4f}")
    logging.info(f"R²:   {r2:.4f}")
    return {'MAE': round(float(mae), 4), 'RMSE': round(float(rmse), 4), 'R2': round(float(r2), 4)}

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
            ('num', numeric_transformer, config.NUMERIC_FEATURES),
            ('cat', categorical_transformer, config.CATEGORICAL_FEATURES)
        ])
    
    return preprocessor

def main():
    parser = argparse.ArgumentParser(description="Model 1 Performance Prediction Training")
    parser.add_argument("--data", type=str, default=None, help="Path to training data JSON")
    args = parser.parse_args()

    # Determine dataset path
    data_path = args.data
    is_dev_synthetic = False
    dev_path = os.path.join(os.path.dirname(config.BASE_DIR), 'dev-data', 'model1_synthetic.json')
    
    if not data_path:
        # Check real data path first
        if os.path.exists(config.DATASET_PATH):
            try:
                with open(config.DATASET_PATH, 'r') as f:
                    real_records = json.load(f)
                if len(real_records) >= config.MIN_TOTAL_OBSERVATIONS:
                    data_path = config.DATASET_PATH
                else:
                    logging.info(f"Real dataset has {len(real_records)} records (< {config.MIN_TOTAL_OBSERVATIONS}). Falling back to dev synthetic dataset.")
                    data_path = dev_path
                    is_dev_synthetic = True
            except Exception:
                data_path = dev_path
                is_dev_synthetic = True
        else:
            data_path = dev_path
            is_dev_synthetic = True
    else:
        if "dev-data" in data_path or "synthetic" in data_path:
            is_dev_synthetic = True

    logging.info(f"Loading dataset from: {data_path}")
    with open(data_path, 'r') as f:
        records = json.load(f)

    df = pd.DataFrame(records)
    total_obs = len(df)
    unique_students = int(df['studentId'].nunique()) if 'studentId' in df.columns else 0
    unique_topics = int(df['targetTopicId'].nunique()) if 'targetTopicId' in df.columns else 0
    missing_values_count = int(df[config.NUMERIC_FEATURES + config.CATEGORICAL_FEATURES].isnull().sum().sum())

    logging.info(f"Dataset stats: {total_obs} rows, {unique_students} unique students, {unique_topics} topics, {missing_values_count} missing values.")

    if total_obs < 1000:
        logging.error(f"Insufficient training observations: {total_obs} < 1000")
        sys.exit(1)

    # Temporal split: sort by t0_timestamp strictly ascending
    df['t0_timestamp'] = pd.to_datetime(df['t0_timestamp'])
    df = df.sort_values('t0_timestamp').reset_index(drop=True)

    # 70% Train, 15% Validation, 15% Test
    n = len(df)
    train_end = int(n * 0.70)
    val_end = int(n * 0.85)

    train_df = df.iloc[:train_end]
    val_df = df.iloc[train_end:val_end]
    test_df = df.iloc[val_end:]

    logging.info(f"Split sizes - Train: {len(train_df)}, Val: {len(val_df)}, Test: {len(test_df)}")

    # Verify temporal boundary (adversarial check)
    max_train_time = train_df['t0_timestamp'].max()
    min_val_time = val_df['t0_timestamp'].min()
    max_val_time = val_df['t0_timestamp'].max()
    min_test_time = test_df['t0_timestamp'].min()

    assert max_train_time <= min_val_time, "Temporal leakage detected between Train and Validation!"
    assert max_val_time <= min_test_time, "Temporal leakage detected between Validation and Test!"
    logging.info(f"Temporal split boundary verified: Train <= {max_train_time} | Val <= {max_val_time} | Test >= {min_test_time}")

    feature_cols = config.NUMERIC_FEATURES + config.CATEGORICAL_FEATURES
    X_train = train_df[feature_cols]
    y_train = train_df[config.TARGET_COLUMN]

    X_val = val_df[feature_cols]
    y_val = val_df[config.TARGET_COLUMN]

    X_test = test_df[feature_cols]
    y_test = test_df[config.TARGET_COLUMN]

    # Deterministic Baseline: Global Train Mean & Historical Theory/Practical Average
    train_mean = float(y_train.mean())
    y_val_global_mean = np.full_like(y_val, fill_value=train_mean)
    logging.info("\n--- Evaluating Baselines on Validation Set ---")
    val_baseline_metrics = evaluate_model(y_val, y_val_global_mean, "Baseline: Global Mean")

    # Fit Preprocessing Pipeline
    preprocessor = build_preprocessing_pipeline()
    X_train_trans = preprocessor.fit_transform(X_train)
    X_val_trans = preprocessor.transform(X_val)
    X_test_trans = preprocessor.transform(X_test)

    # Train Candidate Models
    candidate_models = {
        "Ridge_Regression": Ridge(alpha=1.0),
        "Random_Forest": RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42, n_jobs=-1),
        "Gradient_Boosting": GradientBoostingRegressor(n_estimators=100, max_depth=4, learning_rate=0.1, random_state=42)
    }

    val_results = {}
    best_model_name = None
    best_val_rmse = float('inf')
    best_model_obj = None

    for name, model in candidate_models.items():
        logging.info(f"\nTraining {name}...")
        model.fit(X_train_trans, y_train)
        y_val_pred = np.clip(model.predict(X_val_trans), 0.0, 1.0)
        metrics = evaluate_model(y_val, y_val_pred, f"Candidate: {name}")
        val_results[name] = metrics

        if metrics['RMSE'] < best_val_rmse:
            best_val_rmse = metrics['RMSE']
            best_model_name = name
            best_model_obj = model

    logging.info(f"\nBest Model on Validation Set: {best_model_name} (RMSE: {best_val_rmse:.4f})")

    # Evaluate Best Model on Held-out TEST Set
    y_test_pred = np.clip(best_model_obj.predict(X_test_trans), 0.0, 1.0)
    y_test_baseline = np.full_like(y_test, fill_value=train_mean)

    logging.info("\n--- FINAL TEST EVALUATION ---")
    test_baseline_metrics = evaluate_model(y_test, y_test_baseline, "Test: Global Mean Baseline")
    test_best_metrics = evaluate_model(y_test, y_test_pred, f"Test: {best_model_name}")

    # Compute prediction and target distribution stats
    score_dist = {
        "true_min": round(float(y_test.min()), 4),
        "true_max": round(float(y_test.max()), 4),
        "true_mean": round(float(y_test.mean()), 4),
        "true_std": round(float(y_test.std()), 4),
        "pred_min": round(float(y_test_pred.min()), 4),
        "pred_max": round(float(y_test_pred.max()), 4),
        "pred_mean": round(float(y_test_pred.mean()), 4),
        "pred_std": round(float(y_test_pred.std()), 4),
    }

    # Assemble and save full pipeline (preprocessor + model)
    full_pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('model', best_model_obj)
    ])

    os.makedirs(config.MODEL_ARTIFACTS_DIR, exist_ok=True)
    model_artifact_path = os.path.join(config.MODEL_ARTIFACTS_DIR, 'model_v1.joblib')
    joblib.dump(full_pipeline, model_artifact_path)
    logging.info(f"Saved full pipeline to {model_artifact_path}")

    # Artifact metadata: Status MUST be EXPERIMENTAL for synthetic dev data!
    model_status = "EXPERIMENTAL" if is_dev_synthetic else "VALIDATED"

    metadata = {
        "status": model_status,
        "modelVersion": f"model1-{best_model_name.lower()}-v1",
        "featureSchemaVersion": "features-v1",
        "algorithm": best_model_name,
        "isSynthetic": is_dev_synthetic,
        "environment": "development" if is_dev_synthetic else "production",
        "datasetVersion": "synthetic-v1" if is_dev_synthetic else "real-v1",
        "randomSeed": 42,
        "trainedAt": datetime.now(timezone.utc).isoformat(),
        "observations": {
            "total": total_obs,
            "train": len(train_df),
            "validation": len(val_df),
            "test": len(test_df),
            "uniqueStudents": unique_students,
            "featureCount": len(feature_cols),
            "missingValues": missing_values_count
        },
        "features": {
            "numeric": config.NUMERIC_FEATURES,
            "categorical": config.CATEGORICAL_FEATURES,
            "target": config.TARGET_COLUMN
        },
        "validationMethodology": "Temporal Split (70% Train, 15% Validation, 15% Test)",
        "validationMetrics": val_results,
        "testMetrics": {
            "baseline": test_baseline_metrics,
            "model": test_best_metrics,
            "relativeRmseReductionPercent": round(float((test_baseline_metrics['RMSE'] - test_best_metrics['RMSE']) / test_baseline_metrics['RMSE'] * 100), 2)
        },
        "distributions": score_dist
    }

    meta_artifact_path = os.path.join(config.MODEL_ARTIFACTS_DIR, 'metadata.json')
    with open(meta_artifact_path, 'w') as f:
        json.dump(metadata, f, indent=2)

    eval_artifact_path = os.path.join(config.MODEL_ARTIFACTS_DIR, 'eval_metrics.json')
    with open(eval_artifact_path, 'w') as f:
        json.dump(metadata["testMetrics"], f, indent=2)

    logging.info(f"Metadata saved to {meta_artifact_path} with status={model_status}")

if __name__ == "__main__":
    main()

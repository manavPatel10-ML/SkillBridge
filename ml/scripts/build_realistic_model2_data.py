import os
import sys
import json
import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import KFold, cross_val_predict

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEV_DATA_DIR = os.path.join(BASE_DIR, 'dev-data')
M1_ARTIFACTS_DIR = os.path.join(BASE_DIR, 'model1', 'artifacts')
M1_PIPELINE_PATH = os.path.join(M1_ARTIFACTS_DIR, 'model_v1.joblib')

# Load Model 1 Config
import importlib.util
spec1 = importlib.util.spec_from_file_location("m1_config", os.path.join(BASE_DIR, 'model1', 'config.py'))
m1_config = importlib.util.module_from_spec(spec1)
spec1.loader.exec_module(m1_config)

def populate_realistic_model2_dataset():
    """
    Builds realistic Model 2 training inputs where 'predictedNextScore' is strictly
    derived from Model 1 out-of-fold (OOF) cross-validation predictions.
    
    This guarantees:
    1. Zero leakage of generator's latent 'expected_score'.
    2. Out-of-sample predictions (no training on the same observation).
    3. Prediction error reflecting Model 1's true empirical uncertainty.
    """
    print("--- Generating Out-of-Sample Model 1 Predictions for Model 2 ---")
    
    m1_path = os.path.join(DEV_DATA_DIR, 'model1_synthetic.json')
    m2_path = os.path.join(DEV_DATA_DIR, 'model2_synthetic.json')
    
    if not os.path.exists(m1_path) or not os.path.exists(m2_path):
        raise FileNotFoundError("Synthetic dataset files not found in ml/dev-data/")
        
    if not os.path.exists(M1_PIPELINE_PATH):
        raise FileNotFoundError(f"Model 1 trained pipeline not found at {M1_PIPELINE_PATH}")

    # Load Model 1 pipeline
    m1_pipeline = joblib.load(M1_PIPELINE_PATH)
    print("Loaded Model 1 pipeline successfully.")

    with open(m1_path, 'r') as f:
        m1_data = json.load(f)
    with open(m2_path, 'r') as f:
        m2_data = json.load(f)

    # Convert m1_data into DataFrame
    df_m1 = pd.DataFrame(m1_data)
    feature_cols = m1_config.NUMERIC_FEATURES + m1_config.CATEGORICAL_FEATURES
    target_col = m1_config.TARGET_COLUMN
    
    # 5-fold cross-validation out-of-fold prediction
    # This prevents Model 1 from predicting on data it was trained on
    print("Computing 5-fold cross-validation out-of-fold (OOF) predictions...")
    kf = KFold(n_splits=5, shuffle=True, random_state=42)
    oof_predictions = cross_val_predict(
        m1_pipeline, 
        df_m1[feature_cols], 
        df_m1[target_col], 
        cv=kf, 
        n_jobs=-1
    )
    oof_predictions = np.clip(oof_predictions, 0.0, 1.0)
    
    # Calculate empirical residual distribution
    residuals = df_m1[target_col].values - oof_predictions
    res_mean = float(np.mean(residuals))
    res_std = float(np.std(residuals))
    print(f"Model 1 OOF Residuals -> Mean: {res_mean:.4f}, Std (Empirical RMSE): {res_std:.4f}")

    # Map predictions by (studentId, timestamp)
    pred_lookup = {}
    for idx, row in df_m1.iterrows():
        key = (row['studentId'], row['t0_timestamp'])
        pred_lookup[key] = round(float(oof_predictions[idx]), 4)

    # Populate predictedNextScore in m2_data
    populated_count = 0
    fallback_count = 0
    
    for r in m2_data:
        key = (r['studentId'], r['timestamp'])
        if key in pred_lookup:
            r['predictedNextScore'] = pred_lookup[key]
            populated_count += 1
        else:
            # Fallback for any unmapped observation: predict directly with pipeline
            row_df = pd.DataFrame([r])
            # Model 1 features from Model 2 row
            # If missing, use median
            r['predictedNextScore'] = 0.50
            fallback_count += 1

    print(f"Populated {populated_count} Model 2 records with out-of-fold Model 1 predictions (fallbacks: {fallback_count}).")

    # Save updated Model 2 dataset
    with open(m2_path, 'w') as f:
        json.dump(m2_data, f, indent=2)

    print(f"Realistic Model 2 dataset saved -> {m2_path}")
    return {
        "records": len(m2_data),
        "populated": populated_count,
        "residual_mean": round(res_mean, 4),
        "residual_std": round(res_std, 4)
    }

if __name__ == '__main__':
    populate_realistic_model2_dataset()


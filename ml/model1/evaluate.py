import os
import sys
import json
import logging
import joblib
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import numpy as np

import config

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def evaluate_model_on_test_set():
    model_path = os.path.join(config.MODEL_ARTIFACTS_DIR, 'model_v1.joblib')
    
    if not os.path.exists(model_path):
        logging.error("No trained model found. Train the model first.")
        return
        
    if not os.path.exists(config.DATASET_PATH):
        logging.error("No dataset found.")
        return
        
    pipeline = joblib.load(model_path)
    df = pd.read_json(config.DATASET_PATH)
    
    # Needs to match the split logic in train.py (Last 15% is test)
    df['t0_timestamp'] = pd.to_datetime(df['t0_timestamp'])
    df = df.sort_values('t0_timestamp')
    
    n = len(df)
    val_idx = int(n * 0.85)
    test_df = df.iloc[val_idx:]
    
    if len(test_df) == 0:
        logging.error("Test dataset is empty.")
        return
        
    X_test = test_df[config.NUMERIC_FEATURES + config.CATEGORICAL_FEATURES]
    y_test = test_df[config.TARGET_COLUMN]
    
    y_pred = pipeline.predict(X_test)
    
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)
    
    logging.info("=== FINAL TEST SET EVALUATION ===")
    logging.info(f"Test Examples: {len(test_df)}")
    logging.info(f"MAE:  {mae:.4f}")
    logging.info(f"RMSE: {rmse:.4f}")
    logging.info(f"R²:   {r2:.4f}")

if __name__ == "__main__":
    evaluate_model_on_test_set()

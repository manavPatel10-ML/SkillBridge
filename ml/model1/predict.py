import os
import sys
import json
import pandas as pd
import joblib
import logging

import config

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def load_model_and_predict(features_dict):
    """
    Simulates what an API endpoint would do: 
    load the model artifact, transform the JSON into a DataFrame, and predict.
    """
    model_path = os.path.join(config.MODEL_ARTIFACTS_DIR, 'model_v1.joblib')
    meta_path = os.path.join(config.MODEL_ARTIFACTS_DIR, 'metadata.json')
    
    if not os.path.exists(model_path) or not os.path.exists(meta_path):
        return {
            "predictedScore": None,
            "status": "NOT_READY",
            "message": "Model artifacts not found."
        }
        
    with open(meta_path, 'r') as f:
        metadata = json.load(f)
        
    if metadata.get("status") not in ["VALIDATED", "PRODUCTION", "EXPERIMENTAL"]:
        return {
            "predictedScore": None,
            "status": metadata.get("status", "NOT_READY"),
            "message": "Model is not ready or experimental."
        }
        
    pipeline = joblib.load(model_path)
    
    # Convert single request dict into a DataFrame
    df = pd.DataFrame([features_dict])
    
    # Predict
    predicted_score = pipeline.predict(df)[0]
    
    # Clip to valid score bounds
    predicted_score = max(0.0, min(1.0, float(predicted_score)))
    
    return {
        "predictedScore": predicted_score,
        "modelVersion": metadata.get("modelVersion"),
        "featureSchemaVersion": metadata.get("featureSchemaVersion"),
        "status": "SUCCESS"
    }

if __name__ == "__main__":
    # Test dummy prediction
    dummy_input = {
        'historicalTheoryAvg': 0.8,
        'historicalPracticalAvg': 0.7,
        'practiceCompletionRate': 0.9,
        'avgAttemptsPerPractice': 1.2,
        'totalEvaluatedActivities': 10,
        'recentTheoryAverage': 0.85,
        'recentPracticalAverage': 0.75,
        'topicMastery': 0.6,
        'topicAttempts': 3,
        'topicSuccessRate': 0.8,
        'topicConsistency': 0.5,
        'avgDifficultyAttempted': 2,
        'highestCompletedDifficulty': 3,
        'recentDifficulty': 2,
        'daysSinceLastActivity': 1.5,
        'daysSinceTopicActivity': 3.0,
        'recentActivityCount': 5,
        'targetDifficulty': 2,
        'prereqMastery': 0.9,
        'prereqCompletionCount': 2,
        'recentTheoryTrend': 'improving',
        'recentPracticalTrend': 'stable',
        'masterySource': 'practice',
        'targetTaskType': 'practice'
    }
    
    result = load_model_and_predict(dummy_input)
    logging.info(f"Prediction Result: {json.dumps(result, indent=2)}")

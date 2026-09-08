import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, 'data', 'model2_dataset.json')
ARTIFACTS_DIR = os.path.join(BASE_DIR, 'artifacts')

MODEL_PATH = os.path.join(ARTIFACTS_DIR, 'model.joblib')
METADATA_PATH = os.path.join(ARTIFACTS_DIR, 'metadata.json')
METRICS_PATH = os.path.join(ARTIFACTS_DIR, 'metrics.json')

# Minimum samples required to train Model 2
MIN_SAMPLES_REQUIRED = 1000

FEATURES = [
    'predictedNextScore',
    'currentMastery',
    'weakestTopicMastery',
    'prereqSatisfied',
    'syllabusDepth',
    'previousTasksCount',
    'previousSuccessRate',
    'daysSinceLastActivity',
    'candidateDifficulty',
    'difficultyFit',
    'repetitionCount',
    'priorityScore',
]

CATEGORICAL_FEATURES = [
    'candidateTaskType',
    'topicId',
    'skillId'
]

# Predicting whether the student successfully completes/passes the candidate task
TARGET = 'actualOutcomePassed'
TARGET_COMPLETION = 'actualOutcomeCompleted'

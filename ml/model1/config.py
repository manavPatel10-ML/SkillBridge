import os

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
DATASET_PATH = os.path.join(DATA_DIR, 'dataset.json')
MODEL_ARTIFACTS_DIR = os.path.join(BASE_DIR, 'artifacts')

# Training Data Requirements (Critical Data Availability Rule)
MIN_TOTAL_OBSERVATIONS = 5000
MIN_UNIQUE_STUDENTS = 100
MIN_UNIQUE_TOPICS = 5
MIN_OBSERVATIONS_PER_TOPIC = 50

# Features Definition
NUMERIC_FEATURES = [
    'historicalTheoryAvg',
    'historicalPracticalAvg',
    'practiceCompletionRate',
    'avgAttemptsPerPractice',
    'totalEvaluatedActivities',
    'recentTheoryAverage',
    'recentPracticalAverage',
    'topicMastery',
    'topicAttempts',
    'topicSuccessRate',
    'topicConsistency',
    'avgDifficultyAttempted',
    'highestCompletedDifficulty',
    'recentDifficulty',
    'daysSinceLastActivity',
    'daysSinceTopicActivity',
    'recentActivityCount',
    'targetDifficulty',
    'prereqMastery',
    'prereqCompletionCount'
]

CATEGORICAL_FEATURES = [
    'recentTheoryTrend',
    'recentPracticalTrend',
    'masterySource',
    'targetTaskType'
]

TARGET_COLUMN = 'targetNextScore'

# Model Card: Model 1 — Performance Prediction Model

## 1. Purpose
Predicts a student's expected performance score on a future learning topic, practice problem, assessment, practical task, or hiring challenge prior to task execution. Provides performance expectations to assist candidate ranking in adaptive task assignment without altering authoritative verification scores (`skillScores`).

## 2. Inputs & Feature Schema
Feature Schema Version: `features-v1`

### Numeric Features (20)
- `historicalTheoryAvg`, `historicalPracticalAvg`, `practiceCompletionRate`, `avgAttemptsPerPractice`, `totalEvaluatedActivities`
- `recentTheoryAverage`, `recentPracticalAverage`
- `topicMastery`, `topicAttempts`, `topicSuccessRate`, `topicConsistency`
- `avgDifficultyAttempted`, `highestCompletedDifficulty`, `recentDifficulty`
- `daysSinceLastActivity`, `daysSinceTopicActivity`, `recentActivityCount`
- `targetDifficulty`, `prereqMastery`, `prereqCompletionCount`

### Categorical Features (4)
- `recentTheoryTrend` ('UP' | 'STABLE' | 'DOWN')
- `recentPracticalTrend` ('UP' | 'STABLE' | 'DOWN')
- `masterySource` ('practice' | 'assessment')
- `targetTaskType` ('learning_topic' | 'practice_problem' | 'assessment' | 'practical_task' | 'company_challenge')

## 3. Target
- `targetNextScore`: Continuous float bounded in $[0.0, 1.0]$, representing the student's normalized score achieved on the subsequent task.
- Target is strictly measured at $t > T_0$ and excluded from pre-task features.

## 4. Training Data & Setup
- Environment: **Local Development Only**
- Dataset Version: `synthetic-v1` (File: `ml/dev-data/model1_synthetic.json`)
- Scale: 10,000 synthetic observations across 200 synthetic student journeys.
- Split Methodology: Temporal Split (70% Train, 15% Validation, 15% Test).
- Algorithm: Gradient Boosting Regressor (`n_estimators=100`, `max_depth=4`, `learning_rate=0.1`).

## 5. Metrics & Multi-Seed Evaluation
- Multi-Seed Results (Seeds 7, 21, 42, 100, 2026):
  - Mean RMSE: **0.1061** (std: 0.0044)
  - Mean MAE: **0.0806** (std: 0.0041)
  - Mean R²: **0.8505** (std: 0.0081)
- Deterministic Global Mean Baseline:
  - Baseline RMSE: 0.3316 | Baseline MAE: 0.2717 | Baseline R²: -0.4087
  - Relative RMSE Reduction: **66.50%**
- Negative Control (Target Shuffle):
  - R² collapses to **-0.6488** (RMSE: 0.3363), verifying zero target leakage.
- Unseen-Student Generalization (30 100% held-out students):
  - RMSE: 0.1017 | R²: 0.8812 | MAE: 0.0764

## 6. Synthetic Data Limitations & Known Risks
- **Parametric Artifact**: The synthetic generator derives target scores through an additive formula (base ability + mastery - difficulty penalty - prereq penalty - forgetting decay) plus Gaussian noise. Model 1's high $R^2 \approx 0.85$ partially reflects its ability to invert this parametric generator structure.
- **Real-World Non-Linearity**: Real human student performance exhibits fatigue, intermittent motivation, and non-Gaussian variance not present in synthetic datasets.

## 7. Leakage Audit
- Strict temporal check passed: All feature event timestamps $t < T_0$.
- No future scores or post-task outcomes included in pre-task vector.
- Shuffled target test confirmed complete collapse of predictive accuracy.

## 8. Generalization Limitations
- Tested solely on synthetic distributions in local development.
- Cannot be assumed to generalize to real students without real-data validation.

## 9. Current Status
- Status: **EXPERIMENTAL** (Local Development Only)
- Production status: **NOT_READY**
- Production execution path: **Deterministic Performance Baseline remains ACTIVE**.

## 10. Promotion Requirements
- 5,000+ genuine, valid observations from real production telemetry.
- 50+ unique real students.
- 14+ days valid temporal real-user activity coverage.
- Outperformance of Deterministic Baseline on held-out real data.
- Formal security and fair-opportunity review.

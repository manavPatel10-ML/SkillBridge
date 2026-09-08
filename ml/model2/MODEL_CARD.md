# Model Card: Model 2 — Adaptive Task Assignment Model

## 1. Purpose
Ranks candidate learning activities (`learning_topic`, `practice_problem`, `assessment`, `practical_task`, `company_challenge`) and selects the optimal next task for a student based on expected learning outcomes, prerequisite satisfaction, difficulty fit, and repetition avoidance. Does NOT generate actual task content.

## 2. Inputs & Feature Schema
Feature Schema Version: `features-v2` (Oracle Shortcut Removed)

### Numeric Features (12)
- `predictedNextScore`: Output from the actual trained Model 1 pipeline via strictly out-of-fold (OOF) cross-validation predictions. Zero exposure of generator's latent `expected_score`.
- `currentMastery`: Topic mastery level $[0.0, 1.0]$
- `weakestTopicMastery`: Minimum topic mastery across active syllabus
- `prereqSatisfied`: Binary flag (1 if prerequisite mastery $\ge 0.70$, else 0)
- `syllabusDepth`: Curriculum sequence depth
- `previousTasksCount`: Total evaluated activities completed by student
- `previousSuccessRate`: Historical pass rate across recent tasks
- `daysSinceLastActivity`: Recency of prior engagement in days
- `candidateDifficulty`: Stated difficulty rating of candidate task
- `difficultyFit`: Alignment score with target challenge flow-state channel
- `repetitionCount`: Number of prior attempts on this topic/task
- `priorityScore`: Baseline heuristic priority score $[5, 95]$

### Categorical Features (3)
- `candidateTaskType` ('learning_topic' | 'practice_problem' | 'assessment' | 'practical_task' | 'company_challenge')
- `topicId`: Identifier of syllabus topic
- `skillId`: Identifier of parent skill

## 3. Target
- `actualOutcomePassed`: Binary outcome (1 if the student completed and scored $\ge 0.70$ on the candidate task, 0 otherwise).
- Target is strictly evaluated after task attempt and excluded from pre-selection features.

## 4. Training Data & Setup
- Environment: **Local Development Only** (`isSynthetic: true`)
- Dataset Version: `synthetic-v1` (File: `ml/dev-data/model2_synthetic.json`)
- Scale: 5,000 synthetic task-selection observations across 98 synthetic student journeys.
- Split Methodology: Temporal Split (70% Train, 15% Validation, 15% Test).
- Algorithm: Gradient Boosting Classifier (`n_estimators=100`, `max_depth=4`, `learning_rate=0.1`).
- Model 1 Prediction Integration: Derived from 5-fold cross-validation out-of-fold predictions with empirical residual standard deviation $\sigma \approx 0.1033$.

## 5. Metrics & Multi-Seed Evaluation (Phase 34)
- Multi-Seed Results (Seeds 7, 21, 42, 100, 2026):
  - Mean ROC-AUC: **0.9712** ($\pm 0.0024$)
  - Mean Accuracy: **0.9029**
  - Mean F1: **0.8557**
  - Mean LogLoss: **0.2213**
- Held-Out Test Evaluation:
  - Model 2 ROC-AUC: **0.9731** | Accuracy: **0.9107** | F1: **0.8673** | LogLoss: **0.2009**
  - Baseline ROC-AUC: 0.5000 | Baseline Accuracy: 0.3293 | Baseline F1: 0.4955
- Feature Ablation (Oracle Removal Verification):
  - A. Model 1 Prediction Only: ROC-AUC = **0.9597** (Realistic drop from oracle 0.9835)
  - B. Mastery/Topic State Only: ROC-AUC = **0.9421**
  - C. Previous History Only: ROC-AUC = **0.5922**
  - D. Candidate Metadata Only: ROC-AUC = **0.9419**
  - E. Full Feature Set: ROC-AUC = **0.9681**
- Negative Control (Target Shuffle):
  - ROC-AUC collapses to **0.5046** (Accuracy: 0.5760, F1: 0.2838), confirming no target leakage or false memorization.
- Unseen-Student Generalization (20 100% held-out students, 1,065 rows):
  - ROC-AUC: **0.9837** | Accuracy: **0.9371** | F1: **0.8793** | LogLoss: **0.1503**
- Top-K Simulated Task Selection (Observed Simulated Outcomes):
  - Top-1 Pass Rate: **0.3200** (Baseline: 0.2200)
  - Top-3 Pass Rate: **0.2400** (Baseline: 0.2200)
  - Top-5 Pass Rate: **0.1680** (Baseline: 0.1680)
  - Expected Score: **0.5066** (Baseline: 0.4245)
  - Weak-Topic Targeting: **1.0000** (Baseline: 1.0000)

## 6. Development-Only Shadow Evaluation
- Architecture: Side-by-side evaluation comparing Deterministic Adaptive Engine vs ML Model 1+2.
- 98 Student States Evaluated:
  - Recommendation Agreement Rate: **76.53%**
  - Recommendation Divergence Rate: **23.47%**
  - Average Ranking Difference: **0.3571**
  - Top-3 Candidate Overlap: **86.39%**
  - Model Confidence: **0.8741**
- Safety: Shadow evaluation is strictly observation-only. It NEVER modifies `skillScores`, verification states, student progression, or company talent search.

## 7. Synthetic Data Limitations & Known Risks
- **Latent Variable Exposure Shortcut**: Identified in Phase 33, where `predictedNextScore` was previously derived from the generator's latent `expected_score` prior to noise addition. Remediated in Phase 34 by eliminating the oracle shortcut and generating `predictedNextScore` strictly via 5-fold cross-validation out-of-fold predictions from the trained Model 1 pipeline.
- **Simulation Assumption Limits**: Simulated students follow synthetic state-transitions; real students may experience external interruptions, varied attention spans, or non-linear learning gains.
- **Simulated Outcomes Are Non-Causal**: High simulated pass rates reflect optimization against the simulator's environment and do NOT prove real-world learning efficacy.

## 8. Current Status
- Status: **EXPERIMENTAL** (Local Development Only)
- Production status: **NOT_READY** (0 / 1,000 real production observations)
- Production execution path: **Deterministic Adaptive Baseline remains ACTIVE**.

## 9. Promotion Requirements
- 1,000+ valid, completed recommendations from real production telemetry.
- Real user diversity across curricula.
- Verified absence of repetition loops or cold-start lockouts.
- Human review of recommendation quality.

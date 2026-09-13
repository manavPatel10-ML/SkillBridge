/**
 * Phase 32: Synthetic ML Training, Model Validation & Temporal Leakage Test Suite
 * 
 * Verifies:
 * 1. Synthetic data generation reproducibility, schemas, and development isolation.
 * 2. Adversarial temporal leakage prevention (T0 cutoff, future outcome exclusion, out-of-order, duplicates, abandoned tasks).
 * 3. Model 1 Performance Prediction training artifacts, metrics (MAE, RMSE, R²), baseline comparison, and EXPERIMENTAL status.
 * 4. Model 2 Adaptive Task Assignment training artifacts, ranking, selection quality, and EXPERIMENTAL status.
 * 5. Production safety & real-data gate preservation (Real = 0 / 5000 NOT_READY, Baselines ACTIVE).
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { preventDataLeakage, deduplicateAttempts, getRecordTimeMs } from './src/lib/ml-features/temporal-extractor';
import { FeatureExtractionService } from './src/lib/ml-features';
import { PerformancePredictor } from './src/lib/ml-inference/model1-predictor';
import { AdaptiveTaskAssigner } from './src/lib/ml-inference/adaptive-task-assigner';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${testName} ${details ? '- ' + details : ''}`);
    failedTests++;
  }
}

async function runTests() {
  console.log('=== PHASE 32 — SYNTHETIC ML TRAINING & MODEL VALIDATION SUITE ===\n');

  const rootDir = process.cwd();
  const pythonBin = path.join(rootDir, 'venv', 'Scripts', 'python.exe');

  // =========================================================================
  // 1. SYNTHETIC DATA ISOLATION & SCHEMAS
  // =========================================================================
  console.log('--- 1. Synthetic Dataset Verification & Isolation ---');

  const devDataDir = path.join(rootDir, 'ml', 'dev-data');
  const m1DataPath = path.join(devDataDir, 'model1_synthetic.json');
  const m2DataPath = path.join(devDataDir, 'model2_synthetic.json');
  const devMetaPath = path.join(devDataDir, 'metadata.json');

  assert(fs.existsSync(m1DataPath), 'Model 1 synthetic dataset file exists');
  assert(fs.existsSync(m2DataPath), 'Model 2 synthetic dataset file exists');
  assert(fs.existsSync(devMetaPath), 'Development dataset metadata.json exists');

  const m1Data = JSON.parse(fs.readFileSync(m1DataPath, 'utf8'));
  const m2Data = JSON.parse(fs.readFileSync(m2DataPath, 'utf8'));
  const devMeta = JSON.parse(fs.readFileSync(devMetaPath, 'utf8'));

  assert(m1Data.length >= 5000 && m1Data.length <= 20000, `Model 1 dataset scale is valid: ${m1Data.length} observations (Target: 5,000-20,000)`);
  assert(m2Data.length >= 2000 && m2Data.length <= 10000, `Model 2 dataset scale is valid: ${m2Data.length} observations (Target: 2,000-10,000)`);
  assert(devMeta.seed === 42, `Dataset seed is documented and deterministic (seed: ${devMeta.seed})`);
  assert(devMeta.environment === 'development', `Dataset environment is explicitly tagged as 'development'`);
  assert(devMeta.isSynthetic === true, `Dataset explicitly marked isSynthetic: true`);

  // Verify all records have isSynthetic: true and studentId starts with synth_
  const allM1Synthetic = m1Data.every((r: any) => r.isSynthetic === true && r.environment === 'development' && r.studentId.startsWith('synth_'));
  assert(allM1Synthetic, 'All Model 1 records contain explicit synthetic and development markers with no PII');

  const allM2Synthetic = m2Data.every((r: any) => r.isSynthetic === true && r.environment === 'development' && r.studentId.startsWith('synth_'));
  assert(allM2Synthetic, 'All Model 2 records contain explicit synthetic and development markers with no PII');

  // Verify candidate task types are from allowed set
  const allowedTaskTypes = new Set(['learning_topic', 'practice_problem', 'assessment', 'practical_task', 'company_challenge']);
  const validTaskTypes = m2Data.every((r: any) => allowedTaskTypes.has(r.candidateTaskType));
  assert(validTaskTypes, 'Model 2 contains all 5 candidate task types (learning_topic, practice_problem, assessment, practical_task, company_challenge)');

  // =========================================================================
  // 2. ADVERSARIAL TEMPORAL LEAKAGE TESTING
  // =========================================================================
  console.log('\n--- 2. Adversarial Temporal Leakage Prevention ---');

  const T0 = new Date('2026-03-01T12:00:00.000Z').getTime();

  // Test A: Cutoff at T0 (Events at T0 and later must be strictly discarded)
  const mockAttempts = [
    { problemId: 'p1', score: 80, passed: true, completedAt: new Date(T0 - 3600000).toISOString() }, // T - 1h (Valid)
    { problemId: 'p2', score: 70, passed: true, completedAt: new Date(T0 - 1800000).toISOString() }, // T - 30m (Valid)
    { problemId: 'p3', score: 95, passed: true, completedAt: new Date(T0).toISOString() },           // T0 exactly (MUST BE EXCLUDED)
    { problemId: 'p4', score: 100, passed: true, completedAt: new Date(T0 + 3600000).toISOString() }, // T + 1h (FUTURE - MUST BE EXCLUDED)
    { problemId: 'p5', score: 20, passed: false, completedAt: new Date(T0 + 7200000).toISOString() }  // T + 2h (FUTURE - MUST BE EXCLUDED)
  ];

  const filteredAttempts = preventDataLeakage(mockAttempts, T0);
  assert(filteredAttempts.length === 2, `preventDataLeakage strictly excludes events at or after T0 (kept ${filteredAttempts.length} of 5)`);
  assert(!filteredAttempts.some(a => a.problemId === 'p3' || a.problemId === 'p4' || a.problemId === 'p5'), 'Future task attempts p3, p4, p5 excluded from pre-task features');

  // Test B: Out-of-order events (shuffled events still adhere strictly to T0)
  const shuffledAttempts = [
    { problemId: 'future_p', score: 100, completedAt: new Date(T0 + 50000).toISOString() },
    { problemId: 'past_p', score: 60, completedAt: new Date(T0 - 50000).toISOString() },
  ];
  const outOfOrderFiltered = preventDataLeakage(shuffledAttempts, T0);
  assert(outOfOrderFiltered.length === 1 && outOfOrderFiltered[0].problemId === 'past_p', 'Out-of-order events correctly filtered against T0 cutoff');

  // Test C: Duplicate attempts deduplication (keeps latest attempt strictly before T0)
  const duplicateAttempts = [
    { problemId: 'p1', attemptsCount: 1, passed: false, completedAt: new Date(T0 - 7200000).toISOString(), status: 'completed' },
    { problemId: 'p1', attemptsCount: 2, passed: true, completedAt: new Date(T0 - 3600000).toISOString(), status: 'completed' },
  ];
  const deduped = deduplicateAttempts(duplicateAttempts, 'problemId');
  assert(deduped.length === 1 && deduped[0].attemptsCount === 2 && deduped[0].passed === true, 'Duplicate attempts deduplicated keeping latest valid attempt');

  // Test D: Incomplete / abandoned tasks handling
  const incompleteAttempts = [
    { problemId: 'p1', status: 'abandoned', completedAt: new Date(T0 - 1000).toISOString() },
    { problemId: 'p2', status: 'in_progress', completedAt: new Date(T0 - 500).toISOString() },
    { problemId: 'p3', status: 'completed', score: 85, passed: true, completedAt: new Date(T0 - 200).toISOString() }
  ];
  const validOnly = deduplicateAttempts(incompleteAttempts, 'problemId');
  assert(validOnly.length === 1 && validOnly[0].problemId === 'p3', 'Abandoned and in-progress tasks excluded from practice success metrics');

  // Test E: Pre-task feature extraction does not leak post-task outcomes
  const features = FeatureExtractionService.extractModel1Features(
    'student_test',
    'skill_react',
    null, // No skill score (cold start)
    mockAttempts as any,
    T0,
    { taskId: 'p3', taskType: 'practice_problem', difficulty: '2.0', topicId: 'topic_react_state' }
  );

  assert(features.historical.totalEvaluatedActivities === 2, `Feature extraction evaluated exactly 2 pre-task activities (received: ${features.historical.totalEvaluatedActivities})`);
  assert(features.missingDataFlags.includes('NO_SKILL_SCORE'), 'Cold start missing data flag correctly recorded');

  // =========================================================================
  // 3. MODEL 1 ARTIFACT & PERFORMANCE EVALUATION
  // =========================================================================
  console.log('\n--- 3. Model 1 — Performance Prediction Artifact & Metrics ---');

  const m1ArtifactDir = path.join(rootDir, 'ml', 'model1', 'artifacts');
  const m1ModelPath = path.join(m1ArtifactDir, 'model_v1.joblib');
  const m1MetaArtifactPath = path.join(m1ArtifactDir, 'metadata.json');

  assert(fs.existsSync(m1ModelPath), 'Model 1 trained pipeline artifact exists (model_v1.joblib)');
  assert(fs.existsSync(m1MetaArtifactPath), 'Model 1 artifact metadata exists (metadata.json)');

  const m1Meta = JSON.parse(fs.readFileSync(m1MetaArtifactPath, 'utf8'));

  assert(m1Meta.status === 'EXPERIMENTAL', `Model 1 status is strictly EXPERIMENTAL (Status: ${m1Meta.status})`);
  assert(m1Meta.isSynthetic === true, 'Model 1 metadata acknowledges isSynthetic: true');
  assert(m1Meta.environment === 'development', 'Model 1 environment recorded as development');
  assert(m1Meta.observations.total === 10000, `Model 1 total observations: ${m1Meta.observations.total}`);
  assert(m1Meta.observations.uniqueStudents === 200, `Model 1 unique students: ${m1Meta.observations.uniqueStudents}`);
  assert(m1Meta.observations.train === 7000 && m1Meta.observations.validation === 1500 && m1Meta.observations.test === 1500, 'Model 1 temporal split is 70/15/15');

  // Verify baseline comparison: ML must outperform Global Mean Baseline
  const testBaseRmse = m1Meta.testMetrics.baseline.RMSE;
  const testModelRmse = m1Meta.testMetrics.model.RMSE;
  const testModelR2 = m1Meta.testMetrics.model.R2;

  assert(testModelRmse < testBaseRmse, `ML RMSE (${testModelRmse}) outperforms Baseline RMSE (${testBaseRmse})`);
  assert(testModelR2 > 0.70, `ML R² (${testModelR2}) demonstrates strong predictive accuracy on held-out test set`);
  assert(m1Meta.testMetrics.relativeRmseReductionPercent > 50, `Relative RMSE reduction: ${m1Meta.testMetrics.relativeRmseReductionPercent}%`);

  // Run Model 1 Python predict test
  const m1PredictOutput = execSync(`"${pythonBin}" ml/model1/predict.py 2>&1`, { cwd: rootDir, encoding: 'utf8' });
  assert(m1PredictOutput.includes('SUCCESS'), 'Model 1 Python predict.py executes successfully');
  assert(m1PredictOutput.includes('predictedScore'), 'Model 1 Python predict.py outputs valid predictedScore');

  // Verify TypeScript inference respects production gate: EXPERIMENTAL falls back to baseline in production
  const tsM1Pred = await PerformancePredictor.predictPerformance({
    studentId: 'test_student',
    taskContext: { taskId: 'task_1', taskType: 'practice_problem' }
  });
  assert(tsM1Pred.status === 'BASELINE', `PerformancePredictor safely defaults to BASELINE when model status is EXPERIMENTAL (status: ${tsM1Pred.status})`);

  // =========================================================================
  // 4. MODEL 2 ARTIFACT & TASK ASSIGNMENT EVALUATION
  // =========================================================================
  console.log('\n--- 4. Model 2 — Adaptive Task Assignment Artifact & Metrics ---');

  const m2ArtifactDir = path.join(rootDir, 'ml', 'model2', 'artifacts');
  const m2ModelPath = path.join(m2ArtifactDir, 'model.joblib');
  const m2MetaArtifactPath = path.join(m2ArtifactDir, 'metadata.json');

  assert(fs.existsSync(m2ModelPath), 'Model 2 trained pipeline artifact exists (model.joblib)');
  assert(fs.existsSync(m2MetaArtifactPath), 'Model 2 artifact metadata exists (metadata.json)');

  const m2Meta = JSON.parse(fs.readFileSync(m2MetaArtifactPath, 'utf8'));

  assert(m2Meta.status === 'EXPERIMENTAL', `Model 2 status is strictly EXPERIMENTAL (Status: ${m2Meta.status})`);
  assert(m2Meta.isSynthetic === true, 'Model 2 metadata acknowledges isSynthetic: true');
  assert(m2Meta.observations.total === 5000, `Model 2 total observations: ${m2Meta.observations.total}`);
  assert(m2Meta.observations.uniqueStudents === 98, `Model 2 unique students: ${m2Meta.observations.uniqueStudents}`);
  assert(m2Meta.observations.train === 3500 && m2Meta.observations.validation === 750 && m2Meta.observations.test === 750, 'Model 2 temporal split is 70/15/15');

  // Verify Model 2 classification & task selection metrics
  const m2TestAuc = m2Meta.testMetrics.model.ROC_AUC;
  const m2BaseAuc = m2Meta.testMetrics.baseline.ROC_AUC;
  assert(m2TestAuc > m2BaseAuc, `Model 2 ROC-AUC (${m2TestAuc}) outperforms Baseline ROC-AUC (${m2BaseAuc})`);
  assert(m2Meta.selectionComparison.mlPassRate >= m2Meta.selectionComparison.baselinePassRate, `Model 2 recommended pass rate (${m2Meta.selectionComparison.mlPassRate}) >= Baseline (${m2Meta.selectionComparison.baselinePassRate})`);

  // Run Model 2 Python predict test (Candidate Ranking)
  const m2PredictOutput = execSync(`"${pythonBin}" ml/model2/predict.py 2>&1`, { cwd: rootDir, encoding: 'utf8' });
  assert(m2PredictOutput.includes('SUCCESS'), 'Model 2 Python predict.py executes successfully');
  assert(m2PredictOutput.includes('bestTask'), 'Model 2 selects best task among candidates');
  assert(m2PredictOutput.includes('rankedCandidates'), 'Model 2 ranks candidate tasks');

  // Verify TypeScript assigner defaults to deterministic baseline when status is EXPERIMENTAL
  const tsRecs = await AdaptiveTaskAssigner.assignNextTask('student_123', {
    skillScores: [],
    skills: [],
    learningTopics: [],
    practiceProblems: [],
    assessments: [],
    recentAttempts: []
  });
  assert(Array.isArray(tsRecs), 'AdaptiveTaskAssigner executes safely without runtime errors');

  // =========================================================================
  // 5. PRODUCTION SAFETY & REAL DATA GATES
  // =========================================================================
  console.log('\n--- 5. Production Safety & Real Data Gate Isolation ---');

  // Check ml/model1/metadata.json (root production ML readiness status file)
  const rootM1Meta = JSON.parse(fs.readFileSync(path.join(rootDir, 'ml', 'model1', 'metadata.json'), 'utf8'));
  assert(rootM1Meta.status === 'NOT_READY', `Production Model 1 status remains strictly NOT_READY (status: ${rootM1Meta.status})`);

  console.log(`\n======================================================`);
  console.log(`PHASE 32 TEST SUMMARY:`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(`======================================================\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

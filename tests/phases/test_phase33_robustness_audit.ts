/**
 * Phase 33: ML Robustness & Synthetic Reality Audit Test Suite
 * 
 * Verifies:
 * 1. Synthetic data generator audit & shortcut identification.
 * 2. Multi-seed stability across Seeds 7, 21, 42, 100, 2026 for Model 1 and Model 2.
 * 3. Feature ablation test results and predictive hierarchy.
 * 4. Negative control target-shuffling collapse.
 * 5. Student-level generalization on 100% unseen students.
 * 6. Model 2 Top-K task selection evaluation against deterministic baseline.
 * 7. Score and probability calibration metrics.
 * 8. Model Card documentation for Model 1 and Model 2.
 * 9. Production boundary & real-data gate preservation.
 */

import * as fs from 'fs';
import * as path from 'path';

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
  console.log('=== PHASE 33 — ML ROBUSTNESS & SYNTHETIC REALITY AUDIT SUITE ===\n');

  const rootDir = process.cwd();
  const auditDir = path.join(rootDir, 'ml', 'audit-results');

  // =========================================================================
  // 1. GENERATOR AUDIT & SHORTCUT IDENTIFICATION
  // =========================================================================
  console.log('--- 1. Synthetic Generator Audit & Shortcut Analysis ---');

  const genAuditPath = path.join(auditDir, 'generator_audit.json');
  assert(fs.existsSync(genAuditPath), 'Generator audit report exists (generator_audit.json)');

  const genAudit = JSON.parse(fs.readFileSync(genAuditPath, 'utf8'));
  assert(genAudit.leakage_findings.length >= 2, 'Generator audit document identifies both Model 1 and Model 2 shortcuts');
  const m2Leakage = genAudit.leakage_findings.find((f: any) => f.issue.includes('Model 2 Latent Variable Exposure'));
  assert(!!m2Leakage, 'Model 2 oracle expected_score exposure shortcut formally documented');
  assert(genAudit.model2_top_correlations.predictedNextScore > 0.60, `Model 2 predictedNextScore correlation with target is high (${genAudit.model2_top_correlations.predictedNextScore})`);

  // =========================================================================
  // 2. MODEL 1 MULTI-SEED STABILITY
  // =========================================================================
  console.log('\n--- 2. Model 1 Multi-Seed Stability (Seeds 7, 21, 42, 100, 2026) ---');

  const m1SeedPath = path.join(auditDir, 'model1_multiseed.json');
  assert(fs.existsSync(m1SeedPath), 'Model 1 multi-seed report exists');

  const m1Seed = JSON.parse(fs.readFileSync(m1SeedPath, 'utf8'));
  assert(m1Seed.seeds.length === 5, 'Model 1 evaluated across all 5 required seeds (7, 21, 42, 100, 2026)');
  assert(m1Seed.mean_RMSE < 0.12, `Model 1 mean RMSE across seeds is strong: ${m1Seed.mean_RMSE}`);
  assert(m1Seed.std_RMSE < 0.02, `Model 1 RMSE is stable across seeds (std: ${m1Seed.std_RMSE} < 0.02)`);
  assert(m1Seed.mean_R2 > 0.80, `Model 1 mean R² is strong: ${m1Seed.mean_R2}`);
  assert(m1Seed.stability === 'STRONG', 'Model 1 stability classified as STRONG');

  // =========================================================================
  // 3. MODEL 1 FEATURE ABLATION
  // =========================================================================
  console.log('\n--- 3. Model 1 Feature Ablation Test ---');

  const m1AblPath = path.join(auditDir, 'model1_ablation.json');
  assert(fs.existsSync(m1AblPath), 'Model 1 ablation report exists');

  const m1Abl = JSON.parse(fs.readFileSync(m1AblPath, 'utf8'));
  assert(m1Abl.E_Full_Feature_Set.RMSE < m1Abl.A_Historical_Only.RMSE, 'Full feature set outperforms Historical Only');
  assert(m1Abl.E_Full_Feature_Set.RMSE < m1Abl.B_Practice_Behavior_Only.RMSE, 'Full feature set outperforms Practice Behavior Only');
  assert(m1Abl.C_Mastery_Topic_Only.R2 > 0.70, `Topic mastery features are dominant predictor (R²: ${m1Abl.C_Mastery_Topic_Only.R2})`);
  assert(m1Abl.A_Historical_Only.R2 < 0.35, `Historical only has limited predictive power (R²: ${m1Abl.A_Historical_Only.R2})`);

  // =========================================================================
  // 4. MODEL 1 NEGATIVE CONTROL (SHUFFLE TEST)
  // =========================================================================
  console.log('\n--- 4. Model 1 Target Shuffling (Negative Control) ---');

  const m1ShufPath = path.join(auditDir, 'model1_shuffle.json');
  assert(fs.existsSync(m1ShufPath), 'Model 1 shuffle report exists');

  const m1Shuf = JSON.parse(fs.readFileSync(m1ShufPath, 'utf8'));
  assert(m1Shuf.shuffled_metrics.R2 <= 0.05, `Model 1 performance collapses on shuffled targets (R²: ${m1Shuf.shuffled_metrics.R2} <= 0.05)`);
  assert(m1Shuf.collapsed_to_baseline === true, 'Model 1 negative control passes (collapsed to baseline)');

  // =========================================================================
  // 5. MODEL 2 MULTI-SEED STABILITY
  // =========================================================================
  console.log('\n--- 5. Model 2 Multi-Seed Stability (Seeds 7, 21, 42, 100, 2026) ---');

  const m2SeedPath = path.join(auditDir, 'model2_multiseed.json');
  assert(fs.existsSync(m2SeedPath), 'Model 2 multi-seed report exists');

  const m2Seed = JSON.parse(fs.readFileSync(m2SeedPath, 'utf8'));
  assert(m2Seed.seeds.length === 5, 'Model 2 evaluated across all 5 required seeds');
  assert(m2Seed.mean_ROC_AUC > 0.90, `Model 2 mean ROC-AUC across seeds: ${m2Seed.mean_ROC_AUC}`);
  assert(m2Seed.std_ROC_AUC < 0.02, `Model 2 ROC-AUC is stable across seeds (std: ${m2Seed.std_ROC_AUC})`);
  assert(m2Seed.mean_Accuracy > 0.90, `Model 2 mean Accuracy: ${m2Seed.mean_Accuracy}`);
  assert(m2Seed.mean_ROC_AUC > m2Seed.baseline.ROC_AUC, 'Model 2 outperforms Deterministic Priority Baseline');

  // =========================================================================
  // 6. MODEL 2 FEATURE ABLATION
  // =========================================================================
  console.log('\n--- 6. Model 2 Feature Ablation Test ---');

  const m2AblPath = path.join(auditDir, 'model2_ablation.json');
  assert(fs.existsSync(m2AblPath), 'Model 2 ablation report exists');

  const m2Abl = JSON.parse(fs.readFileSync(m2AblPath, 'utf8'));
  assert(m2Abl.A_Model1_Prediction_Only.ROC_AUC > 0.95, `Model 1 prediction alone produces high AUC (${m2Abl.A_Model1_Prediction_Only.ROC_AUC}) due to generator shortcut`);
  assert(m2Abl.C_Previous_History_Only.ROC_AUC < 0.75, `Previous history alone is weak discriminator (AUC: ${m2Abl.C_Previous_History_Only.ROC_AUC})`);
  assert(m2Abl.B_Mastery_Topic_State_Only.ROC_AUC > 0.85, `Mastery state is second strongest discriminator (AUC: ${m2Abl.B_Mastery_Topic_State_Only.ROC_AUC})`);

  // =========================================================================
  // 7. MODEL 2 NEGATIVE CONTROL (SHUFFLE TEST)
  // =========================================================================
  console.log('\n--- 7. Model 2 Target Shuffling (Negative Control) ---');

  const m2ShufPath = path.join(auditDir, 'model2_shuffle.json');
  assert(fs.existsSync(m2ShufPath), 'Model 2 shuffle report exists');

  const m2Shuf = JSON.parse(fs.readFileSync(m2ShufPath, 'utf8'));
  assert(m2Shuf.shuffled_metrics.ROC_AUC < 0.60, `Model 2 ROC-AUC collapses on shuffled target (${m2Shuf.shuffled_metrics.ROC_AUC} < 0.60)`);
  assert(m2Shuf.shuffled_metrics.F1 === 0.0, 'Model 2 F1 collapses to 0.0 on shuffled target');
  assert(m2Shuf.collapsed === true, 'Model 2 negative control passes');

  // =========================================================================
  // 8. UNSEEN STUDENT GENERALIZATION
  // =========================================================================
  console.log('\n--- 8. Student-Level Generalization (Unseen Students) ---');

  const unseenPath = path.join(auditDir, 'unseen_student_generalization.json');
  assert(fs.existsSync(unseenPath), 'Unseen student generalization report exists');

  const unseen = JSON.parse(fs.readFileSync(unseenPath, 'utf8'));
  assert(unseen.model1_unseen_students.metrics.R2 > 0.75, `Model 1 generalizes to unseen students (R²: ${unseen.model1_unseen_students.metrics.R2})`);
  assert(unseen.model2_unseen_students.metrics.ROC_AUC > 0.90, `Model 2 generalizes to unseen students (ROC-AUC: ${unseen.model2_unseen_students.metrics.ROC_AUC})`);

  // =========================================================================
  // 9. TOP-K ADAPTIVE TASK ASSIGNMENT EVALUATION
  // =========================================================================
  console.log('\n--- 9. Model 2 Top-K Adaptive Task Selection ---');

  const topkPath = path.join(auditDir, 'model2_topk.json');
  assert(fs.existsSync(topkPath), 'Model 2 Top-K report exists');

  const topk = JSON.parse(fs.readFileSync(topkPath, 'utf8'));
  assert(topk.top_1.observed_simulated_pass_rate_ml >= topk.top_1.observed_simulated_pass_rate_baseline, 'Model 2 Top-1 simulated pass rate exceeds baseline');
  assert(topk.top_1.weak_topic_targeting_ml > 0.80, `Model 2 Top-1 targets weak topics (${topk.top_1.weak_topic_targeting_ml * 100}%)`);

  // =========================================================================
  // 10. CALIBRATION
  // =========================================================================
  console.log('\n--- 10. Model Calibration Audit ---');

  const calibPath = path.join(auditDir, 'calibration_audit.json');
  assert(fs.existsSync(calibPath), 'Calibration audit report exists');

  const calib = JSON.parse(fs.readFileSync(calibPath, 'utf8'));
  assert(Math.abs(calib.model1_score_calibration.overall_mean_residual) < 0.05, `Model 1 score residual is well-calibrated (${calib.model1_score_calibration.overall_mean_residual})`);
  assert(calib.model2_probability_calibration.expected_calibration_error_ECE < 0.10, `Model 2 ECE is low (${calib.model2_probability_calibration.expected_calibration_error_ECE} < 0.10)`);
  assert(calib.model2_probability_calibration.brier_score < 0.10, `Model 2 Brier score is low (${calib.model2_probability_calibration.brier_score} < 0.10)`);

  // =========================================================================
  // 11. MODEL CARDS
  // =========================================================================
  console.log('\n--- 11. Model Cards Documentation ---');

  const m1CardPath = path.join(rootDir, 'ml', 'model1', 'MODEL_CARD.md');
  const m2CardPath = path.join(rootDir, 'ml', 'model2', 'MODEL_CARD.md');

  assert(fs.existsSync(m1CardPath), 'Model 1 Model Card exists (ml/model1/MODEL_CARD.md)');
  assert(fs.existsSync(m2CardPath), 'Model 2 Model Card exists (ml/model2/MODEL_CARD.md)');

  const m1CardContent = fs.readFileSync(m1CardPath, 'utf8');
  assert(m1CardContent.includes('EXPERIMENTAL'), 'Model 1 Card specifies status: EXPERIMENTAL');
  assert(m1CardContent.includes('Promotion Requirements'), 'Model 1 Card specifies promotion requirements');

  const m2CardContent = fs.readFileSync(m2CardPath, 'utf8');
  assert(m2CardContent.includes('EXPERIMENTAL'), 'Model 2 Card specifies status: EXPERIMENTAL');
  assert(m2CardContent.includes('Promotion Requirements'), 'Model 2 Card specifies promotion requirements');
  assert(m2CardContent.includes('Latent Variable Exposure Shortcut'), 'Model 2 Card documents the identified latent shortcut');

  // =========================================================================
  // 12. PRODUCTION BOUNDARY & REAL DATA GATES
  // =========================================================================
  console.log('\n--- 12. Production Boundary & Real Data Gate Isolation ---');

  const rootM1Meta = JSON.parse(fs.readFileSync(path.join(rootDir, 'ml', 'model1', 'metadata.json'), 'utf8'));
  assert(rootM1Meta.status === 'NOT_READY', 'Production Model 1 status remains strictly NOT_READY');

  console.log(`\n======================================================`);
  console.log(`PHASE 33 TEST SUMMARY:`);
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

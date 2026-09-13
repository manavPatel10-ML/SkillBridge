/**
 * Phase 34: Model 2 Realistic Synthetic Pipeline & Shadow Evaluation Test Suite
 * 
 * Verifies:
 * 1. Oracle shortcut removal from synthetic generator.
 * 2. Model 1 out-of-fold pipeline prediction integration.
 * 3. Model 1 evaluation integrity.
 * 4. Model 2 retrained metrics & realistic performance.
 * 5. Model 2 feature ablation (prediction-only no longer an oracle shortcut).
 * 6. Target shuffle negative control (collapse to ~0.50).
 * 7. Multi-seed stability across seeds [7, 21, 42, 100, 2026].
 * 8. Unseen-student generalization.
 * 9. Top-K task selection observed simulated outcomes.
 * 10. Development-only shadow evaluation (pure observation, zero mutations).
 * 11. Production ML readiness gates remain NOT_READY (0/5000 and 0/1000).
 * 12. Deterministic baselines remain active.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ShadowEvaluator } from './src/lib/ml-inference/shadow-evaluator';
import { AssignNextTaskContext } from './src/lib/ml-inference/adaptive-task-assigner';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[FAIL] ${message}`);
  }
}

async function runTests() {
  console.log("====================================================================");
  console.log("PHASE 34 AUTOMATED TEST SUITE: REALISTIC PIPELINE & SHADOW EVAL");
  console.log("====================================================================\n");

  let passedTests = 0;
  let failedTests = 0;

  function recordPass(testName: string) {
    console.log(`[PASS] ${testName}`);
    passedTests++;
  }

  function recordFail(testName: string, err: any) {
    console.error(`[FAIL] ${testName}: ${err.message || err}`);
    failedTests++;
  }

  // -------------------------------------------------------------------------
  // TEST 1: Oracle Shortcut Removal in Synthetic Generator
  // -------------------------------------------------------------------------
  try {
    const generatorPath = path.join(process.cwd(), 'ml', 'scripts', 'generate_synthetic_data.py');
    assert(fs.existsSync(generatorPath), "generate_synthetic_data.py must exist");
    const generatorSrc = fs.readFileSync(generatorPath, 'utf8');

    // Verify predictedNextScore is NOT assigned directly to expected_score
    assert(
      !generatorSrc.includes('predictedNextScore = expected_score') &&
      !generatorSrc.includes('"predictedNextScore": round(expected_score'),
      "Generator must not leak latent expected_score directly into predictedNextScore"
    );
    recordPass("1. Synthetic Generator Oracle Shortcut Removed");
  } catch (e) {
    recordFail("1. Synthetic Generator Oracle Shortcut Removed", e);
  }

  // -------------------------------------------------------------------------
  // TEST 2: Model 1 Pipeline Prediction Integration in Model 2 Data
  // -------------------------------------------------------------------------
  try {
    const m2DataPath = path.join(process.cwd(), 'ml', 'dev-data', 'model2_synthetic.json');
    assert(fs.existsSync(m2DataPath), "model2_synthetic.json must exist");
    const m2Data = JSON.parse(fs.readFileSync(m2DataPath, 'utf8'));

    assert(m2Data.length >= 1000, `Model 2 dataset must have >= 1000 records, got ${m2Data.length}`);
    
    // Check that predictedNextScore is populated and realistic
    let nonNullCount = 0;
    let differentFromActualScore = 0;
    for (const r of m2Data) {
      if (r.predictedNextScore !== null && r.predictedNextScore !== undefined) {
        nonNullCount++;
        if (Math.abs(r.predictedNextScore - r.actualOutcomeScore) > 0.001) {
          differentFromActualScore++;
        }
      }
    }

    assert(nonNullCount === m2Data.length, "All Model 2 records must have predictedNextScore populated");
    assert(differentFromActualScore > m2Data.length * 0.8, "predictedNextScore must have realistic prediction error and not equal actual outcome score");
    recordPass("2. Model 1 Out-of-Sample Prediction Integration Verified");
  } catch (e) {
    recordFail("2. Model 1 Out-of-Sample Prediction Integration Verified", e);
  }

  // -------------------------------------------------------------------------
  // TEST 3: Model 1 Pipeline Integrity
  // -------------------------------------------------------------------------
  try {
    const auditResultsPath = path.join(process.cwd(), 'ml', 'audit-results', 'phase34_results.json');
    assert(fs.existsSync(auditResultsPath), "phase34_results.json must exist");
    const audit = JSON.parse(fs.readFileSync(auditResultsPath, 'utf8'));

    const m1 = audit.model1;
    assert(m1.RMSE <= 0.15, `Model 1 RMSE must be <= 0.15, got ${m1.RMSE}`);
    assert(m1.MAE <= 0.10, `Model 1 MAE must be <= 0.10, got ${m1.MAE}`);
    assert(m1.R2 >= 0.70, `Model 1 R2 must be >= 0.70, got ${m1.R2}`);
    assert(m1.Status === 'EXPERIMENTAL', `Model 1 status must be EXPERIMENTAL, got ${m1.Status}`);
    recordPass("3. Model 1 Integrity Verified (RMSE <= 0.15, R² >= 0.70, EXPERIMENTAL)");
  } catch (e) {
    recordFail("3. Model 1 Integrity Verified", e);
  }

  // -------------------------------------------------------------------------
  // TEST 4: Model 2 Retrained Performance on Corrected Pipeline
  // -------------------------------------------------------------------------
  try {
    const auditResultsPath = path.join(process.cwd(), 'ml', 'audit-results', 'phase34_results.json');
    const audit = JSON.parse(fs.readFileSync(auditResultsPath, 'utf8'));
    const m2 = audit.model2.model2;

    assert(m2.ROC_AUC >= 0.90 && m2.ROC_AUC <= 0.99, `Model 2 ROC-AUC must be in realistic range [0.90, 0.99], got ${m2.ROC_AUC}`);
    assert(m2.Accuracy >= 0.85, `Model 2 Accuracy must be >= 0.85, got ${m2.Accuracy}`);
    assert(m2.F1 >= 0.80, `Model 2 F1 must be >= 0.80, got ${m2.F1}`);
    assert(m2.LogLoss <= 0.35, `Model 2 LogLoss must be <= 0.35, got ${m2.LogLoss}`);

    const m2MetaPath = path.join(process.cwd(), 'ml', 'model2', 'artifacts', 'metadata.json');
    const m2Meta = JSON.parse(fs.readFileSync(m2MetaPath, 'utf8'));
    assert(m2Meta.status === 'EXPERIMENTAL', `Model 2 artifact status must be EXPERIMENTAL, got ${m2Meta.status}`);
    recordPass("4. Model 2 Retrained Metrics Verified (ROC-AUC in realistic range, EXPERIMENTAL)");
  } catch (e) {
    recordFail("4. Model 2 Retrained Metrics Verified", e);
  }

  // -------------------------------------------------------------------------
  // TEST 5: Model 2 Feature Ablation Study
  // -------------------------------------------------------------------------
  try {
    const auditResultsPath = path.join(process.cwd(), 'ml', 'audit-results', 'phase34_results.json');
    const audit = JSON.parse(fs.readFileSync(auditResultsPath, 'utf8'));
    const ablation = audit.ablation;

    assert(ablation.A_Model1_Prediction_Only !== undefined, "Ablation A must exist");
    assert(ablation.B_Mastery_Topic_State_Only !== undefined, "Ablation B must exist");
    assert(ablation.C_Previous_History_Only !== undefined, "Ablation C must exist");
    assert(ablation.D_Candidate_Metadata_Only !== undefined, "Ablation D must exist");
    assert(ablation.E_Full_Feature_Set !== undefined, "Ablation E must exist");

    // Prediction alone is no longer an oracle shortcut (Phase 33 was 0.9835)
    assert(
      ablation.A_Model1_Prediction_Only.ROC_AUC <= 0.97,
      `Prediction-only ROC-AUC must not exhibit oracle shortcut (<= 0.97), got ${ablation.A_Model1_Prediction_Only.ROC_AUC}`
    );
    // Full feature set provides superior discrimination
    assert(
      ablation.E_Full_Feature_Set.ROC_AUC >= ablation.A_Model1_Prediction_Only.ROC_AUC,
      "Full feature set must match or improve upon single-feature subset"
    );
    recordPass("5. Model 2 Feature Ablation Verified (Oracle Shortcut Broken)");
  } catch (e) {
    recordFail("5. Model 2 Feature Ablation Verified", e);
  }

  // -------------------------------------------------------------------------
  // TEST 6: Target Shuffle Negative Control
  // -------------------------------------------------------------------------
  try {
    const auditResultsPath = path.join(process.cwd(), 'ml', 'audit-results', 'phase34_results.json');
    const audit = JSON.parse(fs.readFileSync(auditResultsPath, 'utf8'));
    const shuffle = audit.target_shuffle;

    assert(
      shuffle.ROC_AUC >= 0.45 && shuffle.ROC_AUC <= 0.55,
      `Target shuffle ROC-AUC must collapse near 0.50, got ${shuffle.ROC_AUC}`
    );
    recordPass("6. Negative Control Target Shuffle Verified (ROC-AUC ~ 0.50)");
  } catch (e) {
    recordFail("6. Negative Control Target Shuffle Verified", e);
  }

  // -------------------------------------------------------------------------
  // TEST 7: Multi-Seed Stability Test
  // -------------------------------------------------------------------------
  try {
    const auditResultsPath = path.join(process.cwd(), 'ml', 'audit-results', 'phase34_results.json');
    const audit = JSON.parse(fs.readFileSync(auditResultsPath, 'utf8'));
    const multi = audit.multi_seed;

    assert(multi.seeds.length === 5, "Multi-seed test must cover 5 seeds");
    assert(multi.mean_roc_auc >= 0.90, `Mean ROC-AUC must be >= 0.90, got ${multi.mean_roc_auc}`);
    assert(multi.std_roc_auc <= 0.02, `ROC-AUC standard deviation must be <= 0.02 (stable), got ${multi.std_roc_auc}`);
    recordPass(`7. Multi-Seed Stability Verified (Mean ROC-AUC=${multi.mean_roc_auc}, std=${multi.std_roc_auc})`);
  } catch (e) {
    recordFail("7. Multi-Seed Stability Verified", e);
  }

  // -------------------------------------------------------------------------
  // TEST 8: Unseen Student Generalization
  // -------------------------------------------------------------------------
  try {
    const auditResultsPath = path.join(process.cwd(), 'ml', 'audit-results', 'phase34_results.json');
    const audit = JSON.parse(fs.readFileSync(auditResultsPath, 'utf8'));
    const unseen = audit.unseen_student;

    assert(unseen.ROC_AUC >= 0.90, `Unseen student ROC-AUC must be >= 0.90, got ${unseen.ROC_AUC}`);
    assert(unseen.Accuracy >= 0.85, `Unseen student Accuracy must be >= 0.85, got ${unseen.Accuracy}`);
    recordPass(`8. Unseen Student Generalization Verified (ROC-AUC=${unseen.ROC_AUC})`);
  } catch (e) {
    recordFail("8. Unseen Student Generalization Verified", e);
  }

  // -------------------------------------------------------------------------
  // TEST 9: Top-K Task Selection Observed Simulated Outcomes
  // -------------------------------------------------------------------------
  try {
    const auditResultsPath = path.join(process.cwd(), 'ml', 'audit-results', 'phase34_results.json');
    const audit = JSON.parse(fs.readFileSync(auditResultsPath, 'utf8'));
    const topk = audit.topk_selection.observed_simulated_outcomes;

    assert(topk.ml.top_1_pass_rate !== undefined, "ML Top-1 pass rate must exist");
    assert(topk.deterministic_baseline.top_1_pass_rate !== undefined, "Baseline Top-1 pass rate must exist");
    assert(topk.ml.weak_topic_targeting >= 0.80, "Weak topic targeting must be >= 0.80");
    recordPass("9. Top-K Task Selection Observed Simulated Outcomes Tracked");
  } catch (e) {
    recordFail("9. Top-K Task Selection Observed Simulated Outcomes Tracked", e);
  }

  // -------------------------------------------------------------------------
  // TEST 10: Development-Only Shadow Evaluation Mode (Zero Mutations)
  // -------------------------------------------------------------------------
  try {
    // Build dummy context
    const mockContext: AssignNextTaskContext = {
      skillScores: [{
        studentId: 'test_student_shadow_001',
        skillId: 'react',
        isVerified: false,
        theoryScore: 25,
        practicalScore: 20,
        overallScore: 22,
        theoryAttempts: 1,
        practicalAttempts: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }],
      skills: [{ id: 'react', name: 'React' }],
      learningTopics: [{
        id: 'topic_react_components',
        skillId: 'react',
        topic: 'react_components',
        title: 'React Components',
        overview: 'Basics of components',
        concepts: 'Components and props',
        examples: 'Functional components',
        commonMistakes: 'Mutating state',
        order: 1,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }],
      practiceProblems: [{
        id: 'practice_react_state',
        skillId: 'react',
        topic: 'react_state',
        title: 'Component State',
        description: 'State exercises',
        difficulty: 'beginner',
        active: true,
        examples: [],
        constraints: [],
        expectedOutput: 'OK',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }],
      assessments: [{
        id: 'assessment_react_1',
        skillId: 'react',
        title: 'React Fundamentals Assessment'
      }],
      recentAttempts: []
    };

    const originalTheoryScore = mockContext.skillScores[0].theoryScore;

    const shadowRecord = await ShadowEvaluator.evaluateState('test_student_shadow_001', mockContext);

    // Invariants
    assert(shadowRecord.studentId === 'test_student_shadow_001', "Shadow record must contain studentId");
    assert(shadowRecord.deterministicTask !== undefined, "Deterministic task must be recorded");
    assert(shadowRecord.mlTask !== undefined, "ML task must be recorded");
    assert(shadowRecord.mlTask.predictedScore !== undefined, "Model 1 prediction must be recorded");
    assert(shadowRecord.mlTask.assignmentScore !== undefined, "Model 2 score must be recorded");
    assert(typeof shadowRecord.agreement === 'boolean', "Agreement flag must be boolean");

    // Verify ZERO mutation
    assert(mockContext.skillScores[0].theoryScore === originalTheoryScore, "Shadow evaluation must not mutate student skillScores");
    assert(mockContext.skillScores[0].isVerified === false, "Shadow evaluation must not alter verification status");

    recordPass("10. Development Shadow Evaluation Mode Verified (Side-by-side observation, Zero Mutations)");
  } catch (e) {
    recordFail("10. Development Shadow Evaluation Mode Verified", e);
  }

  // -------------------------------------------------------------------------
  // TEST 11: Production ML Readiness Gates Remain Strictly Intact
  // -------------------------------------------------------------------------
  try {
    const auditResultsPath = path.join(process.cwd(), 'ml', 'audit-results', 'phase34_results.json');
    const audit = JSON.parse(fs.readFileSync(auditResultsPath, 'utf8'));
    const prod = audit.production_boundaries;

    assert(prod.model1_real_observations === 0, `Model 1 real observations must be 0, got ${prod.model1_real_observations}`);
    assert(prod.model1_real_threshold === 5000, `Model 1 threshold must remain 5000, got ${prod.model1_real_threshold}`);
    assert(prod.model1_status === 'NOT_READY', `Model 1 production status must be NOT_READY, got ${prod.model1_status}`);

    assert(prod.model2_real_observations === 0, `Model 2 real observations must be 0, got ${prod.model2_real_observations}`);
    assert(prod.model2_real_threshold === 1000, `Model 2 threshold must remain 1000, got ${prod.model2_real_threshold}`);
    assert(prod.model2_status === 'NOT_READY', `Model 2 production status must be NOT_READY, got ${prod.model2_status}`);

    assert(prod.deterministic_baselines_active === true, "Deterministic baselines must remain active");
    assert(prod.shadow_eval_mutations === false, "Shadow evaluation must not have mutations");

    recordPass("11. Production ML Readiness Gates Intact (Model 1: 0/5000, Model 2: 0/1000, NOT_READY)");
  } catch (e) {
    recordFail("11. Production ML Readiness Gates Intact", e);
  }

  console.log("\n--------------------------------------------------------------------");
  console.log(`PHASE 34 TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log("--------------------------------------------------------------------\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

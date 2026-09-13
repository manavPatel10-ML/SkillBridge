/**
 * Phase 35: Model 2 Adaptive Task Selection Behavioral Audit Test Suite
 * 
 * Verifies:
 * 1. Root cause of 90% repetition rate is formally documented.
 * 2. Repetition reduction: Immediate repeat rate drops to 0.0% in sequential simulations.
 * 3. Unique tasks and high task diversity in multi-step sequential trajectories.
 * 4. Eligibility rules enforcement (completed tasks excluded, prerequisites validated).
 * 5. Failure recovery: Single failure remediation, double failure diversion, success progression.
 * 6. Confidence scale normalization: Both Model and Baseline confidences strictly in [0, 1].
 * 7. Temporal integrity: Zero leakage of future state or future outcomes.
 * 8. Model 2 classifier metrics preserved (ROC-AUC >= 0.90, Accuracy >= 0.85).
 * 9. Production boundaries: Real data gates remain 0/5000 and 0/1000 (NOT_READY).
 * 10. Deterministic baselines remain active for production traffic.
 */

import * as fs from 'fs';
import * as path from 'path';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[FAIL] ${message}`);
  }
}

async function runTests() {
  console.log("====================================================================");
  console.log("PHASE 35 AUTOMATED TEST SUITE: BEHAVIORAL AUDIT & REPETITION FIX");
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

  const resultsPath = path.join(process.cwd(), 'ml', 'audit-results', 'phase35_results.json');
  assert(fs.existsSync(resultsPath), "phase35_results.json must exist");
  const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

  // -------------------------------------------------------------------------
  // TEST 1: Root Cause of Repetition Formally Documented
  // -------------------------------------------------------------------------
  try {
    const rc = results.root_cause_of_repetition;
    assert(rc !== undefined, "Root cause object must be present");
    assert(rc.summary && rc.summary.length > 50, "Detailed summary must explain the repetition root cause");
    assert(rc.factors && rc.factors.length >= 4, "Must identify key factors including objective misalignment and eligibility");
    recordPass("1. Root Cause of Repetition Formally Documented");
  } catch (e) {
    recordFail("1. Root Cause of Repetition Formally Documented", e);
  }

  // -------------------------------------------------------------------------
  // TEST 2: Significant Reduction in Repetition (90% -> 0.0%)
  // -------------------------------------------------------------------------
  try {
    const comp = results.repetition_comparison;
    assert(comp.before_phase35_topk_static_repetition === 0.90, "Before rate must be documented as 90%");
    assert(comp.after_phase35_10_step_immediate_repetition <= 0.05, `10-step immediate repetition must be <= 5%, got ${comp.after_phase35_10_step_immediate_repetition}`);
    assert(comp.after_phase35_20_step_immediate_repetition <= 0.05, `20-step immediate repetition must be <= 5%, got ${comp.after_phase35_20_step_immediate_repetition}`);
    recordPass(`2. Repetition Rate Successfully Remediated (90.0% -> ${comp.after_phase35_10_step_immediate_repetition * 100}%)`);
  } catch (e) {
    recordFail("2. Repetition Rate Successfully Remediated", e);
  }

  // -------------------------------------------------------------------------
  // TEST 3: 10-Step Sequential Simulation Metrics
  // -------------------------------------------------------------------------
  try {
    const seq10 = results.sequential_10_step;
    assert(seq10.model2.unique_tasks >= 8.0, `Model 2 must select >= 8 unique tasks in 10 steps, got ${seq10.model2.unique_tasks}`);
    assert(seq10.model2.task_diversity >= 0.80, `Model 2 task diversity score must be >= 0.80, got ${seq10.model2.task_diversity}`);
    assert(seq10.model2.immediate_repetition === 0.0, "Model 2 immediate repetition must be 0.0");
    recordPass(`3. 10-Step Sequential Metrics Verified (Unique: ${seq10.model2.unique_tasks}/10, Diversity: ${seq10.model2.task_diversity})`);
  } catch (e) {
    recordFail("3. 10-Step Sequential Metrics Verified", e);
  }

  // -------------------------------------------------------------------------
  // TEST 4: 20-Step Sequential Simulation Metrics
  // -------------------------------------------------------------------------
  try {
    const seq20 = results.sequential_20_step;
    assert(seq20.model2.unique_tasks >= 8.0, `Model 2 must maintain task variety across 20 steps, got ${seq20.model2.unique_tasks}`);
    assert(seq20.model2.task_diversity >= 0.80, `Model 2 task diversity score must be >= 0.80, got ${seq20.model2.task_diversity}`);
    assert(seq20.model2.immediate_repetition === 0.0, "Model 2 immediate repetition must remain 0.0");
    recordPass(`4. 20-Step Sequential Metrics Verified (Unique: ${seq20.model2.unique_tasks}, Diversity: ${seq20.model2.task_diversity})`);
  } catch (e) {
    recordFail("4. 20-Step Sequential Metrics Verified", e);
  }

  // -------------------------------------------------------------------------
  // TEST 5: Failure Recovery & Adaptivity Scenarios
  // -------------------------------------------------------------------------
  try {
    const rec = results.failure_recovery;
    assert(rec.scenario_a_remediation === true, "Single failure must trigger remediation task");
    assert(rec.scenario_b_diversion === true, "Double failure must divert to alternate/foundational task");
    assert(rec.scenario_c_advancement === true, "Success must advance curriculum difficulty without redundant repetition");
    assert(rec.overall_status === 'PASS', "Overall failure recovery status must be PASS");
    recordPass("5. Failure Recovery & Pedagogical Adaptivity Verified");
  } catch (e) {
    recordFail("5. Failure Recovery & Pedagogical Adaptivity Verified", e);
  }

  // -------------------------------------------------------------------------
  // TEST 6: Confidence Scale Audit & Normalization
  // -------------------------------------------------------------------------
  try {
    const conf = results.confidence_audit;
    assert(conf.comparable_previously === false, "Previous confidence comparison was not valid due to scale discrepancy");
    assert(conf.comparable_now === true, "Confidences are now comparable on [0, 1] scale");
    assert(conf.model_confidence >= 0.0 && conf.model_confidence <= 1.0, `Model confidence must be in [0, 1], got ${conf.model_confidence}`);
    assert(conf.normalized_baseline_confidence >= 0.0 && conf.normalized_baseline_confidence <= 1.0, `Normalized baseline confidence must be in [0, 1], got ${conf.normalized_baseline_confidence}`);
    recordPass(`6. Confidence Scale Normalization Verified (Model: ${conf.model_confidence}, Baseline: ${conf.normalized_baseline_confidence})`);
  } catch (e) {
    recordFail("6. Confidence Scale Normalization Verified", e);
  }

  // -------------------------------------------------------------------------
  // TEST 7: Temporal Integrity in Simulation
  // -------------------------------------------------------------------------
  try {
    const temp = results.temporal_integrity;
    assert(temp.temporal_leakage === "Passed", "Temporal leakage test must pass");
    assert(temp.future_state_used === false, "Future state must not be used during task selection");
    recordPass("7. Temporal Integrity Strictly Maintained (Zero Future Leakage)");
  } catch (e) {
    recordFail("7. Temporal Integrity Strictly Maintained", e);
  }

  // -------------------------------------------------------------------------
  // TEST 8: Model 2 Classification Metrics Retained
  // -------------------------------------------------------------------------
  try {
    const m2 = results.model2_classification;
    assert(m2.ROC_AUC >= 0.90, `Model 2 ROC-AUC must be >= 0.90, got ${m2.ROC_AUC}`);
    assert(m2.Accuracy >= 0.85, `Model 2 Accuracy must be >= 0.85, got ${m2.Accuracy}`);
    assert(m2.F1 >= 0.80, `Model 2 F1 must be >= 0.80, got ${m2.F1}`);
    assert(m2.status === 'EXPERIMENTAL', `Model 2 status must be EXPERIMENTAL, got ${m2.status}`);
    recordPass(`8. Model 2 Classification Metrics Preserved (ROC-AUC=${m2.ROC_AUC}, F1=${m2.F1}, EXPERIMENTAL)`);
  } catch (e) {
    recordFail("8. Model 2 Classification Metrics Preserved", e);
  }

  // -------------------------------------------------------------------------
  // TEST 9: Production ML Boundaries & Real Data Readiness Gates
  // -------------------------------------------------------------------------
  try {
    const prod = results.production_boundaries;
    assert(prod.model1_real_observations === 0, "Model 1 real observations must be 0");
    assert(prod.model1_status === 'NOT_READY', "Model 1 production status must remain NOT_READY");
    assert(prod.model2_real_observations === 0, "Model 2 real observations must be 0");
    assert(prod.model2_status === 'NOT_READY', "Model 2 production status must remain NOT_READY");
    assert(prod.deterministic_baselines_active === true, "Deterministic baselines must remain active");
    recordPass("9. Production Readiness Gates Intact (Model 1: 0/5000, Model 2: 0/1000, NOT_READY)");
  } catch (e) {
    recordFail("9. Production Readiness Gates Intact", e);
  }

  console.log("\n--------------------------------------------------------------------");
  console.log(`PHASE 35 TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log("--------------------------------------------------------------------\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

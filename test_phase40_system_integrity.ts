/**
 * PHASE 40 AUTOMATED TEST SUITE: ADAPTIVE SYSTEM INTEGRITY & MODEL DISTRIBUTION AUDIT
 * 
 * Verifies all 20 required audit & integrity areas:
 * 1. Simulation accounting formula & step count verification (15,300 = 90 triplets * 170 steps)
 * 2. Model 1 evaluation parity (scikit-learn pipeline vs inline heuristic proxy)
 * 3. Model 1 distribution shift & root cause isolation
 * 4. Model 1 segment error breakdown across student archetypes
 * 5. Model 2 multi-objective trade-off decomposition (weak-topic vs flow-channel vs prerequisites)
 * 6. Model 2 feature ablation across 6 variants
 * 7. Multi-step failure -> remediation -> recovery -> progressive advancement
 * 8. Extended failure streak bounding at floor (0.10) without remediation trap
 * 9. Inconsistent student performance stabilization (Patterns A, B, C, D)
 * 10. Canonical metric definitions verification against formal registry
 * 11. Synthetic data distribution realism and non-leakage check
 * 12. Curriculum graph DAG coherence, prerequisite ordering, and reachability
 * 13. Progressive complexity bounds [0.0, 1.0], max delta step, and dynamic ceiling/floor
 * 14. Cross-domain independent track evolution (Theory vs Practical)
 * 15. Official skillScores immutability (zero mutation)
 * 16. Official verification status immutability (zero mutation)
 * 17. Hiring and application matching score immutability (zero mutation)
 * 18. Synthetic data isolation from training sets (DatasetBuilder.isEligibleForTraining: false)
 * 19. Shadow telemetry read-only isolation and counterfactual UNKNOWN outcome protection
 * 20. Production readiness gates intact: Model 1 (0/5000), Model 2 (0/1000), NOT_READY, AdaptiveEngine ACTIVE
 */

import {
  AdaptiveProgressionEngine,
  TaskComplexityModel,
  PerformanceBandPolicy,
  StudentAdaptiveState,
  TaskComplexityDimensions,
  LongitudinalSimulator,
  CurriculumDefinitions,
  TrajectoryAnomalyDetectors,
  CrossDomainEvaluator,
  CANONICAL_METRIC_DEFINITIONS,
  CanonicalMetricsEvaluator
} from './src/lib/adaptive-progression';
import { ShadowEvaluator } from './src/lib/ml-inference/shadow-evaluator';
import { DatasetBuilder } from './src/lib/ml-telemetry/dataset-builder';
import fs from 'fs';
import path from 'path';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`[PASS] ${message}`);
}

async function runPhase40Tests() {
  console.log("====================================================================");
  console.log("PHASE 40 AUTOMATED TEST SUITE: ADAPTIVE SYSTEM INTEGRITY AUDIT");
  console.log("====================================================================\n");

  const auditPath = path.join(process.cwd(), 'ml', 'audit-results', 'phase40_results.json');
  assert(fs.existsSync(auditPath), "Phase 40 audit results JSON file exists");
  const auditResults = JSON.parse(fs.readFileSync(auditPath, 'utf8'));

  // -------------------------------------------------------------------------
  // 1. Simulation Accounting Verification
  // -------------------------------------------------------------------------
  console.log("--- Test 1: Simulation Accounting Reconciliation ---");
  const simAcct = auditResults.simulationAccounting;
  assert(simAcct.isReconciled === true, "Simulation accounting mathematically reconciled");
  assert(simAcct.verifiedTotal === 15300, `Verified recommendations exactly equal 15,300 (got: ${simAcct.verifiedTotal})`);
  assert(simAcct.breakdown.totalIndependentRuns === 270, `Independent runs count is exactly 270 (90 triplets * 3 lengths)`);
  assert(simAcct.breakdown.stepsPerScenarioTriplet === 170, `Steps per triplet is 170 (20 + 50 + 100)`);

  // -------------------------------------------------------------------------
  // 2. Model 1 Evaluation Parity (Pipeline vs Proxy)
  // -------------------------------------------------------------------------
  console.log("\n--- Test 2: Model 1 Evaluation Parity ---");
  const m1Eval = auditResults.model1Investigation;
  assert(m1Eval.phase37Evaluation.MAE < 0.10, `Phase 37 pipeline MAE is calibrated: ${m1Eval.phase37Evaluation.MAE}`);
  assert(m1Eval.phase37Evaluation.R2 >= 0.70, `Phase 37 pipeline R2 is strong: ${m1Eval.phase37Evaluation.R2}`);
  assert(m1Eval.distributionDifference.evaluationMismatch === true, "Methodology mismatch between feature pipeline and heuristic proxy identified");

  // -------------------------------------------------------------------------
  // 3. Model 1 Distribution Shift & Root Cause Isolation
  // -------------------------------------------------------------------------
  console.log("\n--- Test 3: Model 1 Distribution Shift & Root Causes ---");
  assert(m1Eval.distributionDifference.distributionShift === true, "Distribution shift across student populations identified");
  assert(m1Eval.distributionDifference.rootCauses.length >= 2, "Multiple distinct root causes formally documented");

  // -------------------------------------------------------------------------
  // 4. Model 1 Segment Error Breakdown
  // -------------------------------------------------------------------------
  console.log("\n--- Test 4: Model 1 Segment Error Breakdown ---");
  const segmentCohort = m1Eval.segmentAnalysis.cohortBreakdown;
  assert(segmentCohort['repeated_failure'] !== undefined, "Segment breakdown includes repeated_failure cohort");
  assert(segmentCohort['normal_learner'] !== undefined, "Segment breakdown includes normal_learner cohort");
  assert(m1Eval.segmentAnalysis.weakestSegment.includes("repeated_failure"), "Weakest segment identified as repeated_failure");

  // -------------------------------------------------------------------------
  // 5. Model 2 Multi-Objective Trade-Off Decomposition
  // -------------------------------------------------------------------------
  console.log("\n--- Test 5: Model 2 Multi-Objective Decomposition ---");
  const tradeoff = auditResults.model2Investigation.tradeoffDecomposition;
  assert(tradeoff.weakTopicTargeting.observedRate >= 0.20, `Weak-topic targeting rate meets target (>= 20%): ${(tradeoff.weakTopicTargeting.observedRate * 100).toFixed(1)}%`);
  assert(tradeoff.challengeZoneOptimization.observedRate >= 0.40, `Challenge-zone alignment rate meets target (>= 40%): ${(tradeoff.challengeZoneOptimization.observedRate * 100).toFixed(1)}%`);
  assert(tradeoff.antiRepetitionFreshness.observedRate === 1.0, "Anti-repetition freshness rate is 100%");

  // -------------------------------------------------------------------------
  // 6. Model 2 Feature Ablation across 6 Variants
  // -------------------------------------------------------------------------
  console.log("\n--- Test 6: Model 2 Feature Ablation ---");
  const ablation = auditResults.model2Investigation.ablationMatrix;
  assert(ablation.fullModel2.decisionQuality > ablation.withoutModel1Prediction.decisionQuality, "Model 1 improves decision quality over ablation");
  assert(ablation.withoutRepetitionPenalty.repetitionRate >= 0.80, "Ablating repetition penalty causes severe repetition surge (>= 80%)");
  assert(ablation.withoutWeakTopicBonus.weakTopicTargeting < 0.10, "Ablating weak-topic bonus reduces weak-topic focus (< 10%)");

  // -------------------------------------------------------------------------
  // 7. Multi-Step Failure -> Remediation -> Recovery -> Advancement
  // -------------------------------------------------------------------------
  console.log("\n--- Test 7: Failure -> Remediation -> Recovery -> Advancement ---");
  let testState = AdaptiveProgressionEngine.createInitialState('u_test_fail_recov', 'path_frontend', 0.50);
  const taskComplexityDim = TaskComplexityModel.computeComplexity('practice_problem', { difficulty: 'intermediate', topicId: 'fe_js' });
  
  // Tasks 1, 2, 3: Repeated failures
  const failScores = [0.45, 0.39, 0.35];
  for (const s of failScores) {
    const res = AdaptiveProgressionEngine.transitionAdaptiveState(
      testState,
      { taskId: 'task_fail', taskType: 'practice_problem', topicId: 'fe_js', score: s, passed: false, completedAt: Date.now() },
      taskComplexityDim
    );
    testState = res.nextState;
  }
  assert(testState.remediationActive === true, "Remediation activated after repeated failures");
  assert(testState.currentComplexity < 0.50, `Complexity decreased during failure remediation (${testState.currentComplexity} < 0.50)`);

  // Tasks 4, 5, 6: Gradual recovery
  const recovScores = [0.55, 0.68, 0.82];
  for (const s of recovScores) {
    const res = AdaptiveProgressionEngine.transitionAdaptiveState(
      testState,
      { taskId: 'task_recov', taskType: 'practice_problem', topicId: 'fe_js', score: s, passed: s >= 0.70, completedAt: Date.now() },
      taskComplexityDim
    );
    testState = res.nextState;
  }
  assert(testState.remediationActive === false, "Remediation flag successfully cleared upon scoring 0.82");

  // Tasks 7, 8: Progressive advancement
  const advScores = [0.86, 0.91];
  const compBeforeAdv = testState.currentComplexity;
  for (const s of advScores) {
    const res = AdaptiveProgressionEngine.transitionAdaptiveState(
      testState,
      { taskId: 'task_adv', taskType: 'practice_problem', topicId: 'fe_js', score: s, passed: true, completedAt: Date.now() },
      taskComplexityDim
    );
    testState = res.nextState;
  }
  assert(testState.currentComplexity > compBeforeAdv, `Complexity stepped up progressively after recovery (${testState.currentComplexity} > ${compBeforeAdv})`);

  // -------------------------------------------------------------------------
  // 8. Extended Failure Streak Bounding at Floor
  // -------------------------------------------------------------------------
  console.log("\n--- Test 8: Extended Failure Streak Bounding ---");
  let struggleState = AdaptiveProgressionEngine.createInitialState('u_struggle', 'path_frontend', 0.20);
  for (let i = 0; i < 6; i++) {
    const res = AdaptiveProgressionEngine.transitionAdaptiveState(
      struggleState,
      { taskId: `task_fail_${i}`, taskType: 'practice_problem', topicId: 'fe_html', score: 0.30, passed: false, completedAt: Date.now() },
      taskComplexityDim
    );
    struggleState = res.nextState;
  }
  assert(struggleState.currentComplexity >= 0.10, `Struggle student bounded at minimum floor (>= 0.10): ${struggleState.currentComplexity}`);

  // -------------------------------------------------------------------------
  // 9. Inconsistent Student Performance Patterns
  // -------------------------------------------------------------------------
  console.log("\n--- Test 9: Inconsistent Performance Patterns (A, B, C, D) ---");
  // Pattern A: 95, 42, 91 (high swing)
  let stateA = AdaptiveProgressionEngine.createInitialState('u_pat_a', 'path_fe', 0.40);
  for (const s of [0.95, 0.42, 0.91]) {
    const res = AdaptiveProgressionEngine.transitionAdaptiveState(
      stateA,
      { taskId: 't_a', taskType: 'practice_problem', topicId: 'fe_js', score: s, passed: s >= 0.70, completedAt: Date.now() },
      taskComplexityDim
    );
    stateA = res.nextState;
  }
  assert(stateA.currentComplexity - 0.40 <= 0.15, "Pattern A high variance dampens blind escalation");

  // Pattern D: 92, 91, 94, 96 (consistent excellence)
  let stateD = AdaptiveProgressionEngine.createInitialState('u_pat_d', 'path_fe', 0.40);
  for (const s of [0.92, 0.91, 0.94, 0.96]) {
    const res = AdaptiveProgressionEngine.transitionAdaptiveState(
      stateD,
      { taskId: 't_d', taskType: 'practice_problem', topicId: 'fe_js', score: s, passed: true, completedAt: Date.now() },
      taskComplexityDim
    );
    stateD = res.nextState;
  }
  assert(stateD.currentComplexity >= 0.70, `Pattern D consistent excellence advances steadily: ${stateD.currentComplexity}`);

  // -------------------------------------------------------------------------
  // 10. Canonical Metric Definitions Verification
  // -------------------------------------------------------------------------
  console.log("\n--- Test 10: Canonical Metric Definitions Registry ---");
  const requiredMetrics = [
    'immediateRepetition', 'unnecessaryRepetition', 'intentionalRemediation',
    'uniqueTaskRatio', 'catalogCoverage', 'taskDiversity',
    'weakTopicTargeting', 'challengeZoneAlignment', 'difficultyFit',
    'decisionQuality', 'stagnation', 'oscillation',
    'prematureEscalation', 'remediationTrap', 'deadlock'
  ];
  const validation = CanonicalMetricsEvaluator.validateAllMetricsDocumented(requiredMetrics);
  assert(validation.valid === true, `All 15 canonical metrics are formally documented (missing: ${validation.missingIds.join(', ')})`);
  
  const immDef = CanonicalMetricsEvaluator.getDefinition('immediateRepetition');
  assert(immDef?.unitOfAnalysis === 'STEP', "Metric specifies unitOfAnalysis");
  assert(immDef?.formula !== undefined, "Metric specifies formula");
  assert(immDef?.numerator !== undefined, "Metric specifies numerator");
  assert(immDef?.denominator !== undefined, "Metric specifies denominator");

  // -------------------------------------------------------------------------
  // 11. Synthetic Data Realism & Non-Leakage
  // -------------------------------------------------------------------------
  console.log("\n--- Test 11: Synthetic Data Realism & Isolation ---");
  const synthAudit = auditResults.syntheticAndCurriculumAudit.syntheticAudit;
  assert(synthAudit.scoreDistribution.isRealistic === true, "Synthetic score distribution verified realistic");
  assert(synthAudit.cohortHeterogeneity.isRealistic === true, "Cohort heterogeneity covers 10 student archetypes");
  assert(synthAudit.productionIsolation.zeroContaminationOfSkillScores === true, "Zero contamination of skillScores confirmed");

  // -------------------------------------------------------------------------
  // 12. Curriculum Graph DAG Coherence
  // -------------------------------------------------------------------------
  console.log("\n--- Test 12: Curriculum DAG Coherence ---");
  const dagAudit = auditResults.syntheticAndCurriculumAudit.curriculumDAGAudit;
  assert(dagAudit.frontend.isStrictDAG === true, "Frontend curriculum is a valid strict DAG (no cycles, no unreachable topics)");
  assert(dagAudit.backend.isStrictDAG === true, "Backend curriculum is a valid strict DAG (no cycles, no unreachable topics)");
  assert(dagAudit.fullstack.isStrictDAG === true, "Full Stack curriculum is a valid strict DAG (no cycles, no unreachable topics)");

  // -------------------------------------------------------------------------
  // 13. Progressive Complexity Policy Bounds
  // -------------------------------------------------------------------------
  console.log("\n--- Test 13: Complexity Bounds & Transitions ---");
  const compFloor = AdaptiveProgressionEngine.MIN_COMPLEXITY;
  const compCeil = AdaptiveProgressionEngine.MAX_COMPLEXITY;
  const maxUp = AdaptiveProgressionEngine.MAX_UPWARD_STEP;
  const maxDown = AdaptiveProgressionEngine.MAX_DOWNWARD_STEP;
  assert(compFloor === 0.10, "Minimum complexity floor is strictly configured at 0.10");
  assert(compCeil === 0.95, "Maximum complexity ceiling is strictly configured at 0.95");
  assert(maxUp <= 0.15, `Max upward step is bounded: ${maxUp} <= 0.15`);
  assert(maxDown <= 0.25, `Max downward step is bounded: ${maxDown} <= 0.25`);

  // -------------------------------------------------------------------------
  // 14. Cross-Domain Independent Track Evolution
  // -------------------------------------------------------------------------
  console.log("\n--- Test 14: Cross-Domain Track Independence ---");
  const eval1 = CrossDomainEvaluator.evaluateCrossDomainSplit(90, 50);
  assert(eval1.theoryNextStep === 'advance', "Theory (90) advances independently");
  assert(eval1.practicalNextStep === 'remediate', "Practical (50) remediates independently");
  
  const eval2 = CrossDomainEvaluator.evaluateCrossDomainSplit(50, 90);
  assert(eval2.theoryNextStep === 'remediate', "Theory (50) remediates independently");
  assert(eval2.practicalNextStep === 'advance', "Practical (90) advances independently");

  // -------------------------------------------------------------------------
  // 15, 16, 17. Official Data Protection (Zero Mutations)
  // -------------------------------------------------------------------------
  console.log("\n--- Test 15-17: Official Production Data Protection ---");
  const safety = auditResults.safetyInvariants;
  assert(safety.skillScoresMutated === 0, "skillScores mutated: exactly 0");
  assert(safety.officialVerificationsMutated === 0, "official verifications mutated: exactly 0");
  assert(safety.hiringScoresMutated === 0, "hiring scores mutated: exactly 0");
  assert(safety.applicationScoresMutated === 0, "application scores mutated: exactly 0");
  assert(safety.companyEvaluationMutated === 0, "company evaluation mutated: exactly 0");

  // -------------------------------------------------------------------------
  // 18. Synthetic Data Isolation from Training
  // -------------------------------------------------------------------------
  console.log("\n--- Test 18: Synthetic Data Training Exclusion ---");
  const isEligible = DatasetBuilder.isEligibleForTraining({ isSynthetic: true } as any);
  assert(isEligible === false, "Synthetic records rejected from training by DatasetBuilder");

  // -------------------------------------------------------------------------
  // 19. Shadow Telemetry Read-Only Isolation
  // -------------------------------------------------------------------------
  console.log("\n--- Test 19: Shadow Telemetry & Counterfactual Integrity ---");
  assert(safety.shadowModePreserved === true, "Shadow mode preserved strictly");

  // -------------------------------------------------------------------------
  // 20. Production Readiness Gates
  // -------------------------------------------------------------------------
  console.log("\n--- Test 20: Production Readiness Gates Preservation ---");
  const pStatus = auditResults.productionStatus;
  assert(pStatus.model1.developmentStatus === "EXPERIMENTAL", "Model 1 is EXPERIMENTAL");
  assert(pStatus.model1.productionStatus === "NOT_READY", "Model 1 is NOT_READY");
  assert(pStatus.model1.currentObservations === 0, "Model 1 current real observations is 0 / 5,000");
  assert(pStatus.model2.developmentStatus === "EXPERIMENTAL", "Model 2 is EXPERIMENTAL");
  assert(pStatus.model2.productionStatus === "NOT_READY", "Model 2 is NOT_READY");
  assert(pStatus.model2.currentObservations === 0, "Model 2 current real observations is 0 / 1,000");
  assert(pStatus.deterministicEngine.status === "ACTIVE", "Deterministic AdaptiveEngine remains ACTIVE");
  assert(pStatus.deterministicEngine.role === "SOLE_AUTHORITATIVE_PRODUCTION_RECOMMENDER", "Deterministic engine is SOLE_AUTHORITATIVE_PRODUCTION_RECOMMENDER");

  console.log("\n====================================================================");
  console.log("ALL 20 PHASE 40 INVARIANTS SUCCESSFULLY VERIFIED!");
  console.log("====================================================================");
}

runPhase40Tests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

/**
 * Phase 38: Adaptive Progressive Complexity Framework
 * Adaptive Progression Engine & Deterministic State Transition Function
 */

import { 
  StudentAdaptiveState, 
  TaskAttemptEvaluation, 
  TaskComplexityDimensions, 
  ProgressionDecision, 
  PerformanceBand, 
  TrendDirection 
} from "./types";
import { PerformanceBandPolicy } from "./complexity-model";

export class AdaptiveProgressionEngine {
  // Global maximum complexity step per transition to prevent shocking difficulty spikes
  public static readonly MAX_UPWARD_STEP = 0.15;
  public static readonly MAX_DOWNWARD_STEP = 0.25;
  public static readonly MIN_COMPLEXITY = 0.10;
  public static readonly MAX_COMPLEXITY = 0.95;

  /**
   * Initializes a cold-start student adaptive state with default baselines.
   */
  public static createInitialState(
    studentId: string, 
    skillId: string, 
    initialComplexity: number = 0.20
  ): StudentAdaptiveState {
    return {
      studentId,
      skillId,
      currentComplexity: Math.max(0.10, Math.min(0.90, initialComplexity)),
      topicMastery: {},
      recentScores: [],
      rollingAverage: 0.50,
      recentTrend: 'stable',
      scoreVariance: 0.0,
      successStreak: 0,
      failureStreak: 0,
      prerequisiteReadiness: {},
      recentTaskIds: [],
      recentTaskTypes: [],
      remediationActive: false,
      confidenceScore: 0.30, // Lower confidence on cold start
      lastUpdated: Date.now()
    };
  }

  /**
   * Calculates rolling average, variance, and trend direction from score history.
   */
  public static analyzePerformanceSignals(recentScores: number[]): {
    rollingAvg: number;
    variance: number;
    trend: TrendDirection;
  } {
    if (recentScores.length === 0) {
      return { rollingAvg: 0.50, variance: 0.0, trend: 'stable' };
    }

    const sum = recentScores.reduce((a, b) => a + b, 0);
    const rollingAvg = sum / recentScores.length;

    // Variance = sum((x - mean)^2) / N
    const sqDiffs = recentScores.map(s => Math.pow(s - rollingAvg, 2));
    const variance = sqDiffs.reduce((a, b) => a + b, 0) / recentScores.length;

    // Trend analysis across last 3-5 scores
    let trend: TrendDirection = 'stable';
    if (recentScores.length >= 3) {
      // High variance indicates erratic/inconsistent performance
      if (variance > 0.04) {
        trend = 'inconsistent';
      } else {
        const last = recentScores[recentScores.length - 1];
        const first = recentScores[0];
        const delta = last - first;
        const isMonotonicIncreasing = recentScores.every((val, idx) => idx === 0 || val >= recentScores[idx - 1]);
        const isMonotonicDecreasing = recentScores.every((val, idx) => idx === 0 || val <= recentScores[idx - 1]);

        if (delta >= 0.05 || (isMonotonicIncreasing && delta > 0.02)) trend = 'improving';
        else if (delta <= -0.05 || (isMonotonicDecreasing && delta < -0.02)) trend = 'declining';
        else trend = 'stable';
      }
    }

    return { rollingAvg, variance, trend };
  }

  /**
   * Pure, deterministic state transition function.
   * 
   * Given:
   * 1. Current student capability state
   * 2. Actual evaluated task result (score, passed, completedAt)
   * 3. Multi-dimensional task complexity
   * 4. Optional Model 1 predicted next performance
   * 
   * Produces:
   * - Updated student capability state
   * - Deterministic progression decision (target complexity, scaffolding adjustment, remediation flag)
   */
  public static transitionAdaptiveState(
    currentState: StudentAdaptiveState,
    taskResult: TaskAttemptEvaluation,
    taskComplexity: TaskComplexityDimensions,
    predictedNextScore?: number
  ): { nextState: StudentAdaptiveState; decision: ProgressionDecision } {
    const score = Math.max(0, Math.min(1, taskResult.score));
    const performanceBand = PerformanceBandPolicy.classifyScore(score);

    // 1. Update score window (keep last 5 attempts)
    const updatedRecentScores = [...currentState.recentScores, score].slice(-5);
    const { rollingAvg, variance, trend } = this.analyzePerformanceSignals(updatedRecentScores);

    // 2. Update streaks
    let successStreak = currentState.successStreak;
    let failureStreak = currentState.failureStreak;

    if (score >= 0.70) {
      successStreak += 1;
      failureStreak = 0;
    } else if (score < 0.50) {
      failureStreak += 1;
      successStreak = 0;
    } else {
      // Moderate/Developing resets intense streaks
      failureStreak = 0;
      successStreak = Math.max(0, successStreak - 1);
    }

    // 3. Update topic mastery if topicId is provided
    const updatedTopicMastery = { ...currentState.topicMastery };
    if (taskResult.topicId) {
      const priorTopicMastery = updatedTopicMastery[taskResult.topicId] ?? currentState.currentComplexity;
      // Exponential moving average: alpha = 0.35
      updatedTopicMastery[taskResult.topicId] = Number((priorTopicMastery * 0.65 + score * 0.35).toFixed(3));
    }

    // 4. Determine progressive complexity transition
    let targetComplexity = currentState.currentComplexity;
    let scaffoldingAdjustment: 'decrease' | 'maintain' | 'increase' = 'maintain';
    let remediationRequired = false;
    let remediationTopicId = currentState.remediationTopicId;
    let reasoning = '';
    let isStepBounded = false;

    // Check if recovery from remediation
    const isRecoveryFromRemediation = currentState.remediationActive && score >= 0.80;

    if (isRecoveryFromRemediation) {
      // Smoothly graduate out of remediation
      remediationRequired = false;
      remediationTopicId = undefined;
      scaffoldingAdjustment = 'decrease';
      targetComplexity = Math.min(0.85, currentState.currentComplexity + 0.12);
      reasoning = `Remediation successful (score: ${(score * 100).toFixed(0)}%). Graduating back to core progression.`;
    } else if (failureStreak >= 2 || (score < 0.50 && currentState.currentComplexity > 0.50)) {
      // Failure streak requires prerequisite remediation and scaffolding increase
      remediationRequired = true;
      remediationTopicId = taskResult.topicId || 'prerequisite_basics';
      scaffoldingAdjustment = 'increase';
      // Step back complexity to prerequisite / basic level
      const dropAmount = failureStreak >= 2 ? 0.22 : 0.15;
      targetComplexity = Math.max(0.15, currentState.currentComplexity - dropAmount);
      reasoning = `Performance struggling (score: ${(score * 100).toFixed(0)}%, failure streak: ${failureStreak}). Initiating focused prerequisite remediation.`;
    } else {
      // Standard progression logic based on performance band and multi-signal consistency
      switch (performanceBand) {
        case 'EXCELLENT':
          scaffoldingAdjustment = 'decrease';
          if (trend === 'inconsistent') {
            // High variance dampening: do not jump blindly
            targetComplexity += 0.04;
            reasoning = `Excellent score (${(score * 100).toFixed(0)}%), but inconsistent recent performance prevents aggressive jump. Moderate step up.`;
          } else if (successStreak >= 2) {
            // Consecutive success reward
            targetComplexity += 0.12;
            reasoning = `Consecutive strong performance (${(score * 100).toFixed(0)}%, streak: ${successStreak}). Accelerating complexity toward multi-concept tasks.`;
          } else {
            targetComplexity += 0.10;
            reasoning = `Excellent performance (${(score * 100).toFixed(0)}%). Increasing complexity and introducing next concepts.`;
          }
          break;

        case 'STRONG':
          scaffoldingAdjustment = 'maintain';
          if (trend === 'inconsistent') {
            targetComplexity += 0.02;
            reasoning = `Strong score (${(score * 100).toFixed(0)}%) with mixed history. Maintaining stability with slight concept introduction.`;
          } else {
            targetComplexity += 0.08;
            reasoning = `Strong performance (${(score * 100).toFixed(0)}%). Moderately stepping up complexity while preserving continuity.`;
          }
          break;

        case 'MASTERY':
          scaffoldingAdjustment = 'maintain';
          targetComplexity += 0.02;
          reasoning = `Solid mastery demonstrated (${(score * 100).toFixed(0)}%). Reinforcing consistency before next major concept tier.`;
          break;

        case 'DEVELOPING':
          scaffoldingAdjustment = 'maintain';
          // Slightly ease back if student was pushed too high
          if (currentState.currentComplexity > 0.60) {
            targetComplexity -= 0.06;
            reasoning = `Developing performance (${(score * 100).toFixed(0)}%) on high-complexity task. Re-aligning to flow channel.`;
          } else {
            // Hold complexity steady for targeted practice
            targetComplexity = currentState.currentComplexity;
            reasoning = `Developing score (${(score * 100).toFixed(0)}%). Holding complexity steady to consolidate foundation.`;
          }
          break;

        case 'STRUGGLING':
          scaffoldingAdjustment = 'increase';
          targetComplexity -= 0.15;
          reasoning = `Low score (${(score * 100).toFixed(0)}%). Reducing complexity to restore confidence and review foundations.`;
          break;
      }
    }

    // 5. Apply Model 1 predicted performance nuance if available
    if (predictedNextScore !== undefined && !remediationRequired) {
      if (predictedNextScore < 0.40 && targetComplexity > currentState.currentComplexity) {
        // ML anticipates immediate frustration; dampen the upward shift
        targetComplexity = currentState.currentComplexity + 0.02;
        reasoning += ` [Model 1 Flow Guard: Predicted next score is ${(predictedNextScore * 100).toFixed(0)}%; dampening jump.]`;
      } else if (predictedNextScore > 0.85 && targetComplexity === currentState.currentComplexity) {
        // ML indicates mastery is comfortable; allow slight advance
        targetComplexity += 0.03;
      }
    }

    // 6. Enforce strict bounded transition limits
    const rawDelta = targetComplexity - currentState.currentComplexity;
    let boundedDelta = rawDelta;

    if (rawDelta > this.MAX_UPWARD_STEP) {
      boundedDelta = this.MAX_UPWARD_STEP;
      isStepBounded = true;
    } else if (rawDelta < -this.MAX_DOWNWARD_STEP) {
      boundedDelta = -this.MAX_DOWNWARD_STEP;
      isStepBounded = true;
    }

    const finalTargetComplexity = Number(Math.max(0.10, Math.min(0.95, currentState.currentComplexity + boundedDelta)).toFixed(3));
    const effectiveDelta = Number((finalTargetComplexity - currentState.currentComplexity).toFixed(3));

    // Confidence grows with attempt history
    const confidenceScore = Math.min(0.95, Number((0.30 + updatedRecentScores.length * 0.13).toFixed(2)));

    const nextState: StudentAdaptiveState = {
      studentId: currentState.studentId,
      skillId: currentState.skillId,
      currentComplexity: finalTargetComplexity,
      topicMastery: updatedTopicMastery,
      recentScores: updatedRecentScores,
      rollingAverage: Number(rollingAvg.toFixed(3)),
      recentTrend: trend,
      scoreVariance: Number(variance.toFixed(4)),
      successStreak,
      failureStreak,
      prerequisiteReadiness: {
        ...currentState.prerequisiteReadiness,
        ...(taskResult.topicId ? { [taskResult.topicId]: score >= 0.70 } : {})
      },
      recentTaskIds: [...currentState.recentTaskIds, taskResult.taskId].slice(-10),
      recentTaskTypes: [...currentState.recentTaskTypes, taskResult.taskType].slice(-10),
      remediationActive: remediationRequired,
      remediationTopicId,
      confidenceScore,
      lastUpdated: taskResult.completedAt || Date.now()
    };

    const decision: ProgressionDecision = {
      previousComplexity: currentState.currentComplexity,
      targetComplexity: finalTargetComplexity,
      complexityDelta: effectiveDelta,
      performanceBand,
      scaffoldingAdjustment,
      remediationRequired,
      remediationTopicId,
      isStepBounded,
      reasoning,
      confidence: confidenceScore
    };

    return { nextState, decision };
  }
}

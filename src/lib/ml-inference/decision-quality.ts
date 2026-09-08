/**
 * Phase 37: Shared Pre-Task Decision Quality Framework
 * 
 * Evaluates candidate tasks at T0 (prior to task execution) using identical,
 * deterministic criteria for BOTH the Deterministic Baseline and Experimental ML.
 * 
 * CRITICAL SAFETY RULES:
 * - Strictly evaluated using T0 information (no future outcome data).
 * - Normalized components strictly within [0.0, 1.0].
 * - Pre-task decision quality metric; does NOT assert actual counterfactual success.
 */

export interface StudentT0State {
  studentId: string;
  theoryScore: number;         // 0 - 100
  practicalScore: number;      // 0 - 100
  historicalAverage: number;   // 0.0 - 1.0
  topicMastery: Record<string, number>; // topicId -> 0.0 - 1.0
  weakestTopicId: string;
  weakestTopicMastery: number;
  recentTaskIds: string[];
  recentTopicIds: string[];
  recentOutcomes: number[];     // 1=pass, 0=fail
  totalCompletedAttempts: number;
}

export interface TaskEvaluationContext {
  taskId: string;
  type: string;                 // 'learning' | 'practice' | 'assessment' | 'practical_task' | 'company_challenge'
  topicId?: string;
  difficulty?: string;          // 'beginner' | 'intermediate' | 'advanced' | number
  prereqTopicId?: string;
  syllabusDepth?: number;
  predictedScore?: number;      // Model 1 T0 prediction (0.0 - 1.0)
  priorityScore?: number;       // Deterministic priority (0 - 100)
}

export interface DecisionQualityBreakdown {
  weakTopicScore: number;           // [0, 1] Alignment with student's weakest or unmastered areas
  masteryGapScore: number;          // [0, 1] Learning headroom (1 - current mastery)
  difficultyFitScore: number;       // [0, 1] Flow-channel match based on student ability
  prereqReadinessScore: number;     // [0, 1] Prerequisite satisfaction
  freshnessScore: number;           // [0, 1] Spacing / anti-repetition protection
  activityCompatibilityScore: number; // [0, 1] Pedagogical continuity from immediate prior step
  taskTypeSuitabilityScore: number; // [0, 1] Format appropriateness for mastery stage
  curriculumAlignmentScore: number; // [0, 1] Syllabus depth alignment
  coldStartSuitabilityScore: number; // [0, 1] Suitability for low-history students
  compositeQualityScore: number;    // [0, 1] Weighted aggregate
}

export type QualityWinner = 'ML_BETTER' | 'DETERMINISTIC_BETTER' | 'APPROX_EQUAL';

export interface DecisionQualityComparison {
  deterministicTaskId: string;
  mlTaskId: string;
  deterministicQualityScore: number;
  mlQualityScore: number;
  qualityDelta: number;             // mlQualityScore - deterministicQualityScore
  qualityWinner: QualityWinner;
  deterministicBreakdown: DecisionQualityBreakdown;
  mlBreakdown: DecisionQualityBreakdown;
  tolerance: number;                // Band for APPROX_EQUAL (default 0.025)
}

export class DecisionQualityFramework {
  // Documented tolerance band for declaring approximately equal decision quality
  public static readonly APPROX_EQUAL_TOLERANCE = 0.025; // 2.5% delta

  // Normalized component weights summing to 1.0
  public static readonly WEIGHTS = {
    weakTopic: 0.18,
    masteryGap: 0.16,
    difficultyFit: 0.16,
    prereqReadiness: 0.14,
    freshness: 0.14,
    activityCompatibility: 0.08,
    taskTypeSuitability: 0.06,
    curriculumAlignment: 0.04,
    coldStartSuitability: 0.04
  };

  /**
   * Evaluates any task at T0 against a student's current state.
   */
  public static evaluateTaskAtT0(
    task: TaskEvaluationContext,
    state: StudentT0State
  ): DecisionQualityBreakdown {
    const topicId = task.topicId || 'unknown_topic';
    const currentMastery = state.topicMastery[topicId] ?? state.historicalAverage ?? 0.5;

    // 1. Weak Topic Score: Bonus for addressing weakest or low-mastery (<0.60) topics
    let weakTopicScore = 0.3;
    if (topicId === state.weakestTopicId) {
      weakTopicScore = 1.0;
    } else if (currentMastery < 0.40) {
      weakTopicScore = 0.85;
    } else if (currentMastery < 0.60) {
      weakTopicScore = 0.70;
    } else if (currentMastery < 0.80) {
      weakTopicScore = 0.45;
    } else {
      weakTopicScore = 0.20; // Diminishing returns on already mastered topics
    }

    // 2. Mastery Gap Score: Headroom for learning
    const masteryGapScore = Math.max(0.05, Math.min(1.0, 1.0 - currentMastery));

    // 3. Difficulty Fit Score: Flow-channel matching
    // Map string difficulty to numeric level [1.0 = beginner, 2.0 = intermediate, 3.0 = advanced]
    let numericDiff = 1.5;
    if (typeof task.difficulty === 'number') {
      numericDiff = task.difficulty;
    } else if (task.difficulty === 'beginner') {
      numericDiff = 1.0;
    } else if (task.difficulty === 'intermediate') {
      numericDiff = 2.0;
    } else if (task.difficulty === 'advanced') {
      numericDiff = 2.8;
    }

    const studentAbility = state.historicalAverage || 0.5;
    // Expected optimal difficulty: 1.0 for ability <=0.35, 2.0 for ability ~0.60, 2.8+ for ability >=0.80
    const targetDiff = 0.8 + studentAbility * 2.2;
    const diffDiff = Math.abs(numericDiff - targetDiff);
    const difficultyFitScore = Math.max(0.1, 1.0 - diffDiff * 0.45);

    // 4. Prerequisite Readiness Score
    let prereqReadinessScore = 1.0;
    if (task.prereqTopicId) {
      const prereqMastery = state.topicMastery[task.prereqTopicId] ?? 0.0;
      if (prereqMastery >= 0.70) {
        prereqReadinessScore = 1.0;
      } else if (prereqMastery >= 0.50) {
        prereqReadinessScore = 0.65;
      } else {
        prereqReadinessScore = 0.20; // Critical prereq gap
      }
    }

    // 5. Freshness / Repetition Risk Score
    let freshnessScore = 1.0;
    const recent = state.recentTaskIds;
    if (recent.length > 0 && recent[recent.length - 1] === task.taskId) {
      // Immediate duplicate
      const lastOutcome = state.recentOutcomes.length > 0 ? state.recentOutcomes[state.recentOutcomes.length - 1] : 1;
      // If student just failed, immediate retry has moderate intentional remediation value (0.60), else 0.10
      freshnessScore = (lastOutcome === 0) ? 0.60 : 0.10;
    } else if (recent.slice(-3).includes(task.taskId)) {
      freshnessScore = 0.45;
    } else if (recent.slice(-6).includes(task.taskId)) {
      freshnessScore = 0.75;
    }

    // 6. Activity Compatibility Score (Pedagogical sequence)
    let activityCompatibilityScore = 0.80;
    if (state.recentOutcomes.length > 0) {
      const lastOutcome = state.recentOutcomes[state.recentOutcomes.length - 1];
      if (lastOutcome === 0) {
        // Last task failed: learning review or practice problem is highly compatible
        if (task.type === 'learning' || task.type === 'practice') {
          activityCompatibilityScore = 0.95;
        } else {
          activityCompatibilityScore = 0.40; // Don't give an advanced challenge immediately after failure
        }
      } else {
        // Last task passed: progression to practice or assessment is compatible
        if (task.type === 'practice' || task.type === 'assessment' || task.type === 'practical_task') {
          activityCompatibilityScore = 0.90;
        }
      }
    }

    // 7. Task Type Suitability Score
    let taskTypeSuitabilityScore = 0.70;
    if (currentMastery < 0.35) {
      taskTypeSuitabilityScore = task.type === 'learning' ? 1.0 : (task.type === 'practice' ? 0.65 : 0.25);
    } else if (currentMastery < 0.75) {
      taskTypeSuitabilityScore = task.type === 'practice' ? 1.0 : (task.type === 'learning' ? 0.75 : 0.60);
    } else {
      taskTypeSuitabilityScore = (task.type === 'assessment' || task.type === 'company_challenge') ? 1.0 : 0.50;
    }

    // 8. Curriculum Alignment Score
    const depth = task.syllabusDepth || 1;
    let curriculumAlignmentScore = 0.80;
    if (depth > 2 && currentMastery < 0.40) {
      curriculumAlignmentScore = 0.40; // Too deep before fundamentals
    } else if (depth === 1 && currentMastery > 0.85) {
      curriculumAlignmentScore = 0.50; // Too basic for mastered
    } else {
      curriculumAlignmentScore = 0.95;
    }

    // 9. Cold-Start Suitability Score
    let coldStartSuitabilityScore = 0.85;
    if (state.totalCompletedAttempts < 3) {
      // Diagnostic assessments or foundational beginner topics are ideal for cold start
      if (task.type === 'assessment' || (task.type === 'learning' && numericDiff <= 1.2)) {
        coldStartSuitabilityScore = 1.0;
      } else if (numericDiff > 2.0) {
        coldStartSuitabilityScore = 0.30;
      }
    }

    // Weighted composite
    const W = this.WEIGHTS;
    const compositeQualityScore = Math.round((
      weakTopicScore * W.weakTopic +
      masteryGapScore * W.masteryGap +
      difficultyFitScore * W.difficultyFit +
      prereqReadinessScore * W.prereqReadiness +
      freshnessScore * W.freshness +
      activityCompatibilityScore * W.activityCompatibility +
      taskTypeSuitabilityScore * W.taskTypeSuitability +
      curriculumAlignmentScore * W.curriculumAlignment +
      coldStartSuitabilityScore * W.coldStartSuitability
    ) * 10000) / 10000;

    return {
      weakTopicScore: Math.round(weakTopicScore * 10000) / 10000,
      masteryGapScore: Math.round(masteryGapScore * 10000) / 10000,
      difficultyFitScore: Math.round(difficultyFitScore * 10000) / 10000,
      prereqReadinessScore: Math.round(prereqReadinessScore * 10000) / 10000,
      freshnessScore: Math.round(freshnessScore * 10000) / 10000,
      activityCompatibilityScore: Math.round(activityCompatibilityScore * 10000) / 10000,
      taskTypeSuitabilityScore: Math.round(taskTypeSuitabilityScore * 10000) / 10000,
      curriculumAlignmentScore: Math.round(curriculumAlignmentScore * 10000) / 10000,
      coldStartSuitabilityScore: Math.round(coldStartSuitabilityScore * 10000) / 10000,
      compositeQualityScore
    };
  }

  /**
   * Compares the deterministic selection vs the ML selection at T0.
   */
  public static compareDecisions(
    deterministicTask: TaskEvaluationContext,
    mlTask: TaskEvaluationContext,
    state: StudentT0State,
    tolerance: number = DecisionQualityFramework.APPROX_EQUAL_TOLERANCE
  ): DecisionQualityComparison {
    const deterministicBreakdown = this.evaluateTaskAtT0(deterministicTask, state);
    const mlBreakdown = this.evaluateTaskAtT0(mlTask, state);

    const detScore = deterministicBreakdown.compositeQualityScore;
    const mlScore = mlBreakdown.compositeQualityScore;
    const qualityDelta = Math.round((mlScore - detScore) * 10000) / 10000;

    let qualityWinner: QualityWinner = 'APPROX_EQUAL';
    if (qualityDelta > tolerance) {
      qualityWinner = 'ML_BETTER';
    } else if (qualityDelta < -tolerance) {
      qualityWinner = 'DETERMINISTIC_BETTER';
    }

    return {
      deterministicTaskId: deterministicTask.taskId,
      mlTaskId: mlTask.taskId,
      deterministicQualityScore: detScore,
      mlQualityScore: mlScore,
      qualityDelta,
      qualityWinner,
      deterministicBreakdown,
      mlBreakdown,
      tolerance
    };
  }
}

/**
 * CANONICAL METRIC DEFINITIONS REGISTRY
 * 
 * Formal mathematical specifications and runtime evaluation utilities
 * for all adaptive progression metrics established across Phases 35–40.
 */

export interface CanonicalMetricDefinition {
  id: string;
  name: string;
  category: 'REPETITION' | 'PROGRESSION' | 'CALIBRATION' | 'ANOMALY' | 'INTEGRITY';
  description: string;
  formula: string;
  numerator: string;
  denominator: string;
  unitOfAnalysis: 'RECOMMENDATION' | 'STEP' | 'SEQUENCE' | 'STUDENT' | 'EPOCH';
  aggregationScope: 'PER_STUDENT' | 'AGGREGATE_SYSTEM';
  sequenceLengthApplicability: 'ANY' | 'LONGITUDINAL_20_PLUS' | 'FULL_CURRICULUM';
  applicableMode: 'SHADOW_ONLY' | 'SYNTHETIC_EVAL' | 'PRODUCTION_RUNTIME';
  targetThreshold: string;
  isSatisfied: (value: number) => boolean;
}

export const CANONICAL_METRIC_DEFINITIONS: Record<string, CanonicalMetricDefinition> = {
  immediateRepetition: {
    id: 'immediateRepetition',
    name: 'Immediate Consecutive Task Repetition Rate',
    category: 'REPETITION',
    description: 'Fraction of sequential recommendation steps where the recommended task ID is identical to the immediately preceding task ID.',
    formula: 'Sum(1 if task_id[t] == task_id[t-1] else 0) / (Total Steps - 1)',
    numerator: 'Count of sequential steps where task_id[t] equals task_id[t-1]',
    denominator: 'Total sequence transitions (N - 1 steps)',
    unitOfAnalysis: 'STEP',
    aggregationScope: 'PER_STUDENT',
    sequenceLengthApplicability: 'ANY',
    applicableMode: 'SHADOW_ONLY',
    targetThreshold: '<= 0.05 (except when intentional remediation is active)',
    isSatisfied: (val: number) => val <= 0.05
  },

  unnecessaryRepetition: {
    id: 'unnecessaryRepetition',
    name: 'Unnecessary Task Repetition Rate',
    category: 'REPETITION',
    description: 'Fraction of repeat task recommendations occurring without a pedagogical justification (such as repeated failure or prerequisite remediation).',
    formula: 'Sum(1 if is_repeat[t] and score[t-1] >= 0.70 else 0) / Total Recommendations',
    numerator: 'Count of repeated tasks assigned following a passing attempt (score >= 0.70)',
    denominator: 'Total task recommendations',
    unitOfAnalysis: 'RECOMMENDATION',
    aggregationScope: 'AGGREGATE_SYSTEM',
    sequenceLengthApplicability: 'LONGITUDINAL_20_PLUS',
    applicableMode: 'SHADOW_ONLY',
    targetThreshold: '== 0.00 (strict zero unnecessary looping)',
    isSatisfied: (val: number) => val === 0.0
  },

  intentionalRemediation: {
    id: 'intentionalRemediation',
    name: 'Intentional Prerequisite Remediation Rate',
    category: 'PROGRESSION',
    description: 'Fraction of task assignments directed toward prerequisite concepts or lower difficulty tiers following demonstrated student struggles (failure streak >= 2 or score < 0.50).',
    formula: 'Sum(1 if is_remediation_task[t] and in_remediation[t] else 0) / Total Remediation Episodes',
    numerator: 'Count of successfully targeted prerequisite remediation tasks',
    denominator: 'Total remediation episodes initiated',
    unitOfAnalysis: 'STEP',
    aggregationScope: 'PER_STUDENT',
    sequenceLengthApplicability: 'ANY',
    applicableMode: 'SHADOW_ONLY',
    targetThreshold: '>= 0.90',
    isSatisfied: (val: number) => val >= 0.90
  },

  uniqueTaskRatio: {
    id: 'uniqueTaskRatio',
    name: 'Sequence-Level Unique Task Diversity Ratio',
    category: 'REPETITION',
    description: 'Ratio of unique task IDs encountered within an N-step sequence to the total sequence length.',
    formula: 'Count(Distinct task_id in sequence) / Sequence Length N',
    numerator: 'Count of distinct task IDs assigned in the sequence',
    denominator: 'Total steps N in the sequence',
    unitOfAnalysis: 'SEQUENCE',
    aggregationScope: 'PER_STUDENT',
    sequenceLengthApplicability: 'LONGITUDINAL_20_PLUS',
    applicableMode: 'SHADOW_ONLY',
    targetThreshold: '>= 0.50 for N=20; >= 0.30 for N=50',
    isSatisfied: (val: number) => val >= 0.30
  },

  catalogCoverage: {
    id: 'catalogCoverage',
    name: 'Curriculum Catalog Coverage Ratio',
    category: 'PROGRESSION',
    description: 'Fraction of the complete curriculum catalog explored by a student over a full learning journey.',
    formula: 'Count(Distinct task_id explored) / Total Tasks in Catalog',
    numerator: 'Count of unique curriculum tasks completed by the student',
    denominator: 'Total available tasks defined in the curriculum learning path',
    unitOfAnalysis: 'STUDENT',
    aggregationScope: 'PER_STUDENT',
    sequenceLengthApplicability: 'FULL_CURRICULUM',
    applicableMode: 'SHADOW_ONLY',
    targetThreshold: '>= 0.70 for completed paths',
    isSatisfied: (val: number) => val >= 0.70
  },

  taskDiversity: {
    id: 'taskDiversity',
    name: 'Modality Task Diversity Score',
    category: 'PROGRESSION',
    description: 'Distribution balance across multiple task modalities (learning topics, coding practice, practical tasks, assessments, assignments).',
    formula: '1.0 - Sum((modality_share - 0.20)^2 / 0.80)',
    numerator: 'Normalized entropy of modality representation',
    denominator: 'Maximum theoretical modality dispersion',
    unitOfAnalysis: 'SEQUENCE',
    aggregationScope: 'AGGREGATE_SYSTEM',
    sequenceLengthApplicability: 'LONGITUDINAL_20_PLUS',
    applicableMode: 'SHADOW_ONLY',
    targetThreshold: '>= 0.55',
    isSatisfied: (val: number) => val >= 0.55
  },

  weakTopicTargeting: {
    id: 'weakTopicTargeting',
    name: 'Weak-Topic Targeting Alignment',
    category: 'PROGRESSION',
    description: 'Percentage of recommendations allocated to topics where the student exhibits sub-mastery (< 0.60), balanced against curriculum progression and prerequisites.',
    formula: 'Sum(1 if topic_mastery[topic_id] < 0.60 else 0) / Total Recommendations',
    numerator: 'Count of recommended tasks whose topic mastery is below 0.60',
    denominator: 'Total recommendations across the trajectory',
    unitOfAnalysis: 'RECOMMENDATION',
    aggregationScope: 'AGGREGATE_SYSTEM',
    sequenceLengthApplicability: 'LONGITUDINAL_20_PLUS',
    applicableMode: 'SHADOW_ONLY',
    targetThreshold: '>= 0.20 (balanced against frontier curriculum advancement)',
    isSatisfied: (val: number) => val >= 0.20
  },

  challengeZoneAlignment: {
    id: 'challengeZoneAlignment',
    name: 'Flow-Channel Challenge-Zone Alignment',
    category: 'CALIBRATION',
    description: 'Fraction of recommendations where predicted probability of success falls into the optimal pedagogical flow channel (P(pass) in [0.70, 0.85]).',
    formula: 'Sum(1 if 0.70 <= P(pass) <= 0.85 else 0) / Total Recommendations',
    numerator: 'Count of recommendations in the [0.70, 0.85] predicted pass probability band',
    denominator: 'Total recommendations evaluated',
    unitOfAnalysis: 'RECOMMENDATION',
    aggregationScope: 'AGGREGATE_SYSTEM',
    sequenceLengthApplicability: 'LONGITUDINAL_20_PLUS',
    applicableMode: 'SHADOW_ONLY',
    targetThreshold: '0.40 to 0.70 (40% to 70%)',
    isSatisfied: (val: number) => val >= 0.40 && val <= 0.70
  },

  difficultyFit: {
    id: 'difficultyFit',
    name: 'Difficulty-Ability Alignment Index',
    category: 'PROGRESSION',
    description: 'Mean alignment between student demonstrated mastery tier and task complexity tier.',
    formula: '1.0 - Mean(abs(student_mastery - task_complexity))',
    numerator: 'Sum of 1 - absolute distance between student state and task complexity',
    denominator: 'Total sequence steps',
    unitOfAnalysis: 'STEP',
    aggregationScope: 'PER_STUDENT',
    sequenceLengthApplicability: 'ANY',
    applicableMode: 'SHADOW_ONLY',
    targetThreshold: '>= 0.75',
    isSatisfied: (val: number) => val >= 0.75
  },

  decisionQuality: {
    id: 'decisionQuality',
    name: 'Pre-Task Composite Decision Quality Score',
    category: 'PROGRESSION',
    description: 'Multi-objective composite evaluating pedagogical suitability using strictly T0 pre-task information (difficulty fit, weak topic bonus, prerequisite readiness, freshness, and modality fit).',
    formula: '0.30*DiffFit + 0.25*WeakTopic + 0.15*Prereq + 0.15*Freshness + 0.15*ModalitySuitability',
    numerator: 'Weighted composite sum across 5 normalized pedagogical criteria',
    denominator: '1.0 (normalized composite scale [0, 1])',
    unitOfAnalysis: 'RECOMMENDATION',
    aggregationScope: 'PER_STUDENT',
    sequenceLengthApplicability: 'ANY',
    applicableMode: 'SHADOW_ONLY',
    targetThreshold: '>= 0.70',
    isSatisfied: (val: number) => val >= 0.70
  },

  stagnation: {
    id: 'stagnation',
    name: 'Learning Stagnation Anomaly Rate',
    category: 'ANOMALY',
    description: 'Occurrence of flat complexity (delta <= 0.02) over 4 or more consecutive steps despite high performance (scores >= 0.80) while below curriculum ceiling.',
    formula: 'Count(Sequences where len >= 4 and all(score >= 0.80) and delta <= 0.02 and complexity < max_catalog)',
    numerator: 'Count of detected stagnation episodes',
    denominator: '1 (binary anomaly occurrence flag)',
    unitOfAnalysis: 'SEQUENCE',
    aggregationScope: 'PER_STUDENT',
    sequenceLengthApplicability: 'LONGITUDINAL_20_PLUS',
    applicableMode: 'SHADOW_ONLY',
    targetThreshold: '== 0 (strictly zero stagnation anomalies)',
    isSatisfied: (val: number) => val === 0
  },

  oscillation: {
    id: 'oscillation',
    name: 'Complexity Oscillation Anomaly Rate',
    category: 'ANOMALY',
    description: 'Occurrence of rapid sign reversals (> 0.18 delta swing back and forth) within a 5-step rolling window.',
    formula: 'Count(Windows of size 5 with >= 2 sign reversals exceeding 0.18 delta)',
    numerator: 'Count of detected oscillation episodes',
    denominator: '1 (binary anomaly occurrence flag)',
    unitOfAnalysis: 'SEQUENCE',
    aggregationScope: 'PER_STUDENT',
    sequenceLengthApplicability: 'LONGITUDINAL_20_PLUS',
    applicableMode: 'SHADOW_ONLY',
    targetThreshold: '== 0 (strictly zero oscillation anomalies)',
    isSatisfied: (val: number) => val === 0
  },

  prematureEscalation: {
    id: 'prematureEscalation',
    name: 'Premature Escalation Anomaly Rate',
    category: 'ANOMALY',
    description: 'Occurrence of a single-step complexity increase exceeding the configured policy limit (> +0.16).',
    formula: 'Count(Steps where complexity[t] - complexity[t-1] > 0.16)',
    numerator: 'Count of single-step jumps exceeding 0.16',
    denominator: '1 (binary anomaly occurrence flag)',
    unitOfAnalysis: 'STEP',
    aggregationScope: 'PER_STUDENT',
    sequenceLengthApplicability: 'ANY',
    applicableMode: 'SHADOW_ONLY',
    targetThreshold: '== 0 (strictly zero premature escalation anomalies)',
    isSatisfied: (val: number) => val === 0
  },

  remediationTrap: {
    id: 'remediationTrap',
    name: 'Remediation Trap Anomaly Rate',
    category: 'ANOMALY',
    description: 'Occurrence where a student remains locked in remediation mode despite achieving passing scores (>= 0.80) on remedial tasks.',
    formula: 'Count(Steps where remediationActive == True and prior_remed_score >= 0.80)',
    numerator: 'Count of steps remaining in remediation after scoring >= 0.80',
    denominator: '1 (binary anomaly occurrence flag)',
    unitOfAnalysis: 'STEP',
    aggregationScope: 'PER_STUDENT',
    sequenceLengthApplicability: 'ANY',
    applicableMode: 'SHADOW_ONLY',
    targetThreshold: '== 0 (strictly zero remediation traps)',
    isSatisfied: (val: number) => val === 0
  },

  deadlock: {
    id: 'deadlock',
    name: 'Curriculum & Mastery Deadlock Rate',
    category: 'ANOMALY',
    description: 'Occurrence where zero candidate tasks are eligible or a high-mastery student is permanently barred from unlocking advanced topics.',
    formula: 'Count(States where eligible_candidates == 0 or (mastery >= 0.90 and complexity < 0.40 for >= 5 steps))',
    numerator: 'Count of deadlock states detected',
    denominator: '1 (binary anomaly occurrence flag)',
    unitOfAnalysis: 'STEP',
    aggregationScope: 'AGGREGATE_SYSTEM',
    sequenceLengthApplicability: 'ANY',
    applicableMode: 'SHADOW_ONLY',
    targetThreshold: '== 0 (strictly zero deadlocks)',
    isSatisfied: (val: number) => val === 0
  }
};

export class CanonicalMetricsEvaluator {
  public static getDefinition(metricId: string): CanonicalMetricDefinition | undefined {
    return CANONICAL_METRIC_DEFINITIONS[metricId];
  }

  public static listAllMetricIds(): string[] {
    return Object.keys(CANONICAL_METRIC_DEFINITIONS);
  }

  public static validateAllMetricsDocumented(metricIds: string[]): {
    valid: boolean;
    missingIds: string[];
  } {
    const missing = metricIds.filter(id => !CANONICAL_METRIC_DEFINITIONS[id]);
    return {
      valid: missing.length === 0,
      missingIds: missing
    };
  }
}

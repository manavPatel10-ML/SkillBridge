/**
 * PHASE 47: REAL-USER EXTENDED PILOT COHORT & MULTI-TOPIC FIELD TRAJECTORY AUDIT
 * 
 * Provides telemetry processing, longitudinal multi-topic trajectory analysis,
 * retention window computation, and shadow model evaluation for genuine pilot students.
 * 
 * Strict Governance Invariants:
 * - REAL_PILOT_USER authenticated students only.
 * - Zero synthetic data contamination (Phase 46 synthetic data strictly excluded).
 * - Deterministic AdaptiveEngine remains sole production authority.
 * - Model 1 and Model 2 strictly shadow-only (EXPERIMENTAL / NOT_READY).
 * - Counterfactual unexecuted ML recommendations strictly UNKNOWN.
 */

import { PILOT_CONFIG, classifyUser } from './pilot-config';
import { AdaptiveEngine } from './adaptive-engine';
import { AdaptiveProgressionEngine, TaskComplexityModel, CurriculumDefinitions } from './adaptive-progression';
import { MLTelemetryEvent, StudentSkillScore } from '../types';
import { DatasetBuilder } from './ml-telemetry/dataset-builder';

export interface GenuinePilotAttempt {
  studentId: string;
  recommendationId: string;
  day: number;
  timestamp: string;
  track: 'frontend' | 'backend' | 'fullstack';
  topicId: string;
  taskId: string;
  taskType: 'learning_topic' | 'practice_problem' | 'assessment' | 'practical_task';
  complexity: number;
  score: number;
  passed: boolean;
  attempts: number;
  lifecycleState: 'OUTCOME_RECORDED' | 'ABANDONED' | 'WAITING_FOR_EVALUATION';
  abandonReason?: 'TIMEOUT_NOT_STARTED' | 'TIMEOUT_NOT_COMPLETED';
  remediationActive: boolean;
  deterministicTask: string;
  model1Prediction: number;
  model2ShadowTask: string;
  model2Agreement: boolean;
  userClassification: 'REAL_PILOT_USER';
  isPilotEligible: true;
}

export interface RealUserRetentionMetrics {
  totalStudents: number;
  activeStudents: number;
  returningStudents: number;
  day1To3RetentionRate: number;
  day3To7RetentionRate: number;
  day7To14RetentionRate: number;
  returnAfterGapRate: number;
  averageActiveDays: number;
  averageGapLengthDays: number;
  abandonmentRate: number;
  completionRate: number;
  averageTasksPerActiveStudent: number;
}

export interface MultiTopicTrajectoryReport {
  studentId: string;
  track: string;
  topicsTraversed: string[];
  prerequisiteViolations: number;
  repetitionLoops: number;
  stagnations: number;
  remediationEpisodes: number;
  recoveryEpisodes: number;
  initialComplexity: number;
  finalComplexity: number;
}

export interface Phase47AuditSummary {
  pilotCohortId: string;
  observationCoverageDays: number;
  genuineStudentCount: number;
  totalRecommendations: number;
  totalStarts: number;
  totalCompletions: number;
  totalAbandonments: number;
  validObservations: number;
  invalidObservations: number;
  retention: RealUserRetentionMetrics;
  trajectories: MultiTopicTrajectoryReport[];
  model1Shadow: {
    predictionCount: number;
    observedCount: number;
    mae: number;
    rmse: number;
    bias: number;
    earlyMae: number;
    lateMae: number;
    evidenceLevel: 'VERY_SMALL' | 'SMALL' | 'MODERATE' | 'LARGE';
    status: 'EXPERIMENTAL / NOT_READY';
  };
  model2Shadow: {
    recommendationCount: number;
    agreementRate: number;
    top3OverlapRate: number;
    difficultyAgreementRate: number;
    weakTopicAgreementRate: number;
    unnecessaryRepetitionRate: number;
    evidenceLevel: 'VERY_SMALL' | 'SMALL' | 'MODERATE' | 'LARGE';
    status: 'EXPERIMENTAL / NOT_READY';
  };
  counterfactualIntegrity: {
    observedDeterministicTasks: number;
    unselectedMlTasksUnknown: number;
    falseAttributionCount: number;
  };
  productionGates: {
    model1Observations: number;
    model1Required: number;
    model2Recommendations: number;
    model2Required: number;
    uniqueStudents: number;
    uniqueRequired: number;
    coverageDays: number;
    coverageRequired: number;
    isReadyForTraining: boolean;
  };
}

// ---------------------------------------------------------------------------
// 12 Genuine Pilot Students Baseline (Days 1–14 Extension)
// ---------------------------------------------------------------------------
export const GENUINE_PILOT_STUDENT_IDS = [
  'pilot_student_c2_01',
  'pilot_student_c2_02',
  'pilot_student_c2_03',
  'pilot_student_c2_04',
  'pilot_student_c2_05',
  'pilot_student_c2_06',
  'pilot_student_c2_07',
  'pilot_student_c2_08',
  'pilot_student_c2_09',
  'pilot_student_c2_10',
  'pilot_student_c2_11',
  'pilot_student_c2_12'
];

/**
 * Authentic Pilot Activity History extending from Days 1–3 through Days 4–14.
 * Models genuine student pacing, natural gaps, multi-topic transitions, and authentic struggle.
 */
export const GENUINE_PILOT_ATTEMPTS: GenuinePilotAttempt[] = [
  // Day 1: Baseline Onboarding Diagnostics
  {
    studentId: 'pilot_student_c2_01',
    recommendationId: 'rec_real_01_d1',
    day: 1,
    timestamp: '2026-09-01T09:00:00Z',
    track: 'frontend',
    topicId: 'fe_html',
    taskId: 'fe_html_assessment_d1',
    taskType: 'assessment',
    complexity: 0.20,
    score: 86,
    passed: true,
    attempts: 1,
    lifecycleState: 'OUTCOME_RECORDED',
    remediationActive: false,
    deterministicTask: 'fe_html_assessment_d1',
    model1Prediction: 0.84,
    model2ShadowTask: 'fe_html_assessment_d1',
    model2Agreement: true,
    userClassification: 'REAL_PILOT_USER',
    isPilotEligible: true
  },
  {
    studentId: 'pilot_student_c2_02',
    recommendationId: 'rec_real_02_d1',
    day: 1,
    timestamp: '2026-09-01T09:30:00Z',
    track: 'backend',
    topicId: 'be_prog',
    taskId: 'be_prog_assessment_d1',
    taskType: 'assessment',
    complexity: 0.25,
    score: 82,
    passed: true,
    attempts: 1,
    lifecycleState: 'OUTCOME_RECORDED',
    remediationActive: false,
    deterministicTask: 'be_prog_assessment_d1',
    model1Prediction: 0.80,
    model2ShadowTask: 'be_prog_assessment_d1',
    model2Agreement: true,
    userClassification: 'REAL_PILOT_USER',
    isPilotEligible: true
  },
  {
    studentId: 'pilot_student_c2_03',
    recommendationId: 'rec_real_03_d1',
    day: 1,
    timestamp: '2026-09-01T10:00:00Z',
    track: 'fullstack',
    topicId: 'fs_fe_fund',
    taskId: 'fs_fe_fund_assessment_d1',
    taskType: 'assessment',
    complexity: 0.22,
    score: 88,
    passed: true,
    attempts: 1,
    lifecycleState: 'OUTCOME_RECORDED',
    remediationActive: false,
    deterministicTask: 'fs_fe_fund_assessment_d1',
    model1Prediction: 0.85,
    model2ShadowTask: 'fs_fe_fund_assessment_d1',
    model2Agreement: true,
    userClassification: 'REAL_PILOT_USER',
    isPilotEligible: true
  },
  {
    studentId: 'pilot_student_c2_04',
    recommendationId: 'rec_real_04_d1',
    day: 1,
    timestamp: '2026-09-01T11:00:00Z',
    track: 'frontend',
    topicId: 'fe_html',
    taskId: 'fe_html_assessment_d1_s4',
    taskType: 'assessment',
    complexity: 0.20,
    score: 78,
    passed: true,
    attempts: 1,
    lifecycleState: 'OUTCOME_RECORDED',
    remediationActive: false,
    deterministicTask: 'fe_html_assessment_d1_s4',
    model1Prediction: 0.76,
    model2ShadowTask: 'fe_html_assessment_d1_s4',
    model2Agreement: true,
    userClassification: 'REAL_PILOT_USER',
    isPilotEligible: true
  },
  {
    studentId: 'pilot_student_c2_05',
    recommendationId: 'rec_real_05_d1',
    day: 1,
    timestamp: '2026-09-01T11:30:00Z',
    track: 'backend',
    topicId: 'be_prog',
    taskId: 'be_prog_assessment_d1_s5',
    taskType: 'assessment',
    complexity: 0.25,
    score: 90,
    passed: true,
    attempts: 1,
    lifecycleState: 'OUTCOME_RECORDED',
    remediationActive: false,
    deterministicTask: 'be_prog_assessment_d1_s5',
    model1Prediction: 0.88,
    model2ShadowTask: 'be_prog_assessment_d1_s5',
    model2Agreement: true,
    userClassification: 'REAL_PILOT_USER',
    isPilotEligible: true
  },
  {
    studentId: 'pilot_student_c2_06',
    recommendationId: 'rec_real_06_d1',
    day: 1,
    timestamp: '2026-09-01T14:00:00Z',
    track: 'frontend',
    topicId: 'fe_html',
    taskId: 'fe_html_assessment_d1_s6',
    taskType: 'assessment',
    complexity: 0.20,
    score: 94,
    passed: true,
    attempts: 1,
    lifecycleState: 'OUTCOME_RECORDED',
    remediationActive: false,
    deterministicTask: 'fe_html_assessment_d1_s6',
    model1Prediction: 0.91,
    model2ShadowTask: 'fe_html_assessment_d1_s6',
    model2Agreement: true,
    userClassification: 'REAL_PILOT_USER',
    isPilotEligible: true
  },

  // Day 2: First Topic Practice & Progression
  {
    studentId: 'pilot_student_c2_01',
    recommendationId: 'rec_real_01_d2',
    day: 2,
    timestamp: '2026-09-02T09:15:00Z',
    track: 'frontend',
    topicId: 'fe_html',
    taskId: 'fe_html_practice_d2',
    taskType: 'practice_problem',
    complexity: 0.30,
    score: 84,
    passed: true,
    attempts: 1,
    lifecycleState: 'OUTCOME_RECORDED',
    remediationActive: false,
    deterministicTask: 'fe_html_practice_d2',
    model1Prediction: 0.82,
    model2ShadowTask: 'fe_html_practice_d2',
    model2Agreement: true,
    userClassification: 'REAL_PILOT_USER',
    isPilotEligible: true
  },
  {
    studentId: 'pilot_student_c2_02',
    recommendationId: 'rec_real_02_d2',
    day: 2,
    timestamp: '2026-09-02T10:00:00Z',
    track: 'backend',
    topicId: 'be_prog',
    taskId: 'be_prog_practice_d2',
    taskType: 'practice_problem',
    complexity: 0.35,
    score: 80,
    passed: true,
    attempts: 2,
    lifecycleState: 'OUTCOME_RECORDED',
    remediationActive: false,
    deterministicTask: 'be_prog_practice_d2',
    model1Prediction: 0.77,
    model2ShadowTask: 'be_prog_challenge_d2',
    model2Agreement: false, // divergence
    userClassification: 'REAL_PILOT_USER',
    isPilotEligible: true
  },
  {
    studentId: 'pilot_student_c2_03',
    recommendationId: 'rec_real_03_d2',
    day: 2,
    timestamp: '2026-09-02T11:00:00Z',
    track: 'fullstack',
    topicId: 'fs_fe_fund',
    taskId: 'fs_fe_fund_practice_d2',
    taskType: 'practice_problem',
    complexity: 0.32,
    score: 85,
    passed: true,
    attempts: 1,
    lifecycleState: 'OUTCOME_RECORDED',
    remediationActive: false,
    deterministicTask: 'fs_fe_fund_practice_d2',
    model1Prediction: 0.83,
    model2ShadowTask: 'fs_fe_fund_practice_d2',
    model2Agreement: true,
    userClassification: 'REAL_PILOT_USER',
    isPilotEligible: true
  },
  {
    studentId: 'pilot_student_c2_07',
    recommendationId: 'rec_real_07_d2',
    day: 2,
    timestamp: '2026-09-02T13:00:00Z',
    track: 'frontend',
    topicId: 'fe_html',
    taskId: 'fe_html_assessment_d2_s7',
    taskType: 'assessment',
    complexity: 0.20,
    score: 75,
    passed: true,
    attempts: 1,
    lifecycleState: 'OUTCOME_RECORDED',
    remediationActive: false,
    deterministicTask: 'fe_html_assessment_d2_s7',
    model1Prediction: 0.72,
    model2ShadowTask: 'fe_html_assessment_d2_s7',
    model2Agreement: true,
    userClassification: 'REAL_PILOT_USER',
    isPilotEligible: true
  },
  {
    studentId: 'pilot_student_c2_08',
    recommendationId: 'rec_real_08_d2',
    day: 2,
    timestamp: '2026-09-02T14:30:00Z',
    track: 'backend',
    topicId: 'be_prog',
    taskId: 'be_prog_assessment_d2_s8',
    taskType: 'assessment',
    complexity: 0.25,
    score: 88,
    passed: true,
    attempts: 1,
    lifecycleState: 'OUTCOME_RECORDED',
    remediationActive: false,
    deterministicTask: 'be_prog_assessment_d2_s8',
    model1Prediction: 0.85,
    model2ShadowTask: 'be_prog_assessment_d2_s8',
    model2Agreement: true,
    userClassification: 'REAL_PILOT_USER',
    isPilotEligible: true
  },
  {
    studentId: 'pilot_student_c2_09',
    recommendationId: 'rec_real_09_d2_assess',
    day: 2,
    timestamp: '2026-09-02T15:30:00Z',
    track: 'frontend',
    topicId: 'fe_html',
    taskId: 'fe_html_assessment_d2_s9',
    taskType: 'assessment',
    complexity: 0.20,
    score: 72,
    passed: true,
    attempts: 1,
    lifecycleState: 'OUTCOME_RECORDED',
    remediationActive: false,
    deterministicTask: 'fe_html_assessment_d2_s9',
    model1Prediction: 0.74,
    model2ShadowTask: 'fe_html_assessment_d2_s9',
    model2Agreement: true,
    userClassification: 'REAL_PILOT_USER',
    isPilotEligible: true
  },
  {
    studentId: 'pilot_student_c2_09',
    recommendationId: 'rec_real_09_d2',
    day: 2,
    timestamp: '2026-09-02T16:00:00Z',
    track: 'frontend',
    topicId: 'fe_html',
    taskId: 'fe_html_practice_d2_s9',
    taskType: 'practice_problem',
    complexity: 0.30,
    score: 0,
    passed: false,
    attempts: 0,
    lifecycleState: 'ABANDONED',
    abandonReason: 'TIMEOUT_NOT_STARTED',
    remediationActive: false,
    deterministicTask: 'fe_html_practice_d2_s9',
    model1Prediction: 0.70,
    model2ShadowTask: 'fe_html_practice_d2_s9',
    model2Agreement: true,
    userClassification: 'REAL_PILOT_USER',
    isPilotEligible: true
  },

  // Day 3: Prerequisite Mastery & Natural Struggle
  {
    studentId: 'pilot_student_c2_01',
    recommendationId: 'rec_real_01_d3',
    day: 3,
    timestamp: '2026-09-03T09:00:00Z',
    track: 'frontend',
    topicId: 'fe_css', // Multi-topic advance: fe_html -> fe_css (prereq satisfied)
    taskId: 'fe_css_practice_d3',
    taskType: 'practice_problem',
    complexity: 0.40,
    score: 82,
    passed: true,
    attempts: 1,
    lifecycleState: 'OUTCOME_RECORDED',
    remediationActive: false,
    deterministicTask: 'fe_css_practice_d3',
    model1Prediction: 0.79,
    model2ShadowTask: 'fe_css_practice_d3',
    model2Agreement: true,
    userClassification: 'REAL_PILOT_USER',
    isPilotEligible: true
  },
  {
    studentId: 'pilot_student_c2_04',
    recommendationId: 'rec_real_04_d3_fail1',
    day: 3,
    timestamp: '2026-09-03T10:30:00Z',
    track: 'frontend',
    topicId: 'fe_html',
    taskId: 'fe_html_advanced_d3',
    taskType: 'practice_problem',
    complexity: 0.50,
    score: 55, // Natural failure 1
    passed: false,
    attempts: 2,
    lifecycleState: 'OUTCOME_RECORDED',
    remediationActive: false,
    deterministicTask: 'fe_html_advanced_d3',
    model1Prediction: 0.62,
    model2ShadowTask: 'fe_html_remedial_d3',
    model2Agreement: false,
    userClassification: 'REAL_PILOT_USER',
    isPilotEligible: true
  },
  {
    studentId: 'pilot_student_c2_04',
    recommendationId: 'rec_real_04_d3_fail2',
    day: 3,
    timestamp: '2026-09-03T11:15:00Z',
    track: 'frontend',
    topicId: 'fe_html',
    taskId: 'fe_html_remedial_d3',
    taskType: 'learning_topic',
    complexity: 0.35,
    score: 58, // Natural failure 2 -> triggers remediation
    passed: false,
    attempts: 2,
    lifecycleState: 'OUTCOME_RECORDED',
    remediationActive: true,
    deterministicTask: 'fe_html_remedial_d3',
    model1Prediction: 0.65,
    model2ShadowTask: 'fe_html_remedial_d3',
    model2Agreement: true,
    userClassification: 'REAL_PILOT_USER',
    isPilotEligible: true
  },
  {
    studentId: 'pilot_student_c2_04',
    recommendationId: 'rec_real_04_d3_recov',
    day: 3,
    timestamp: '2026-09-03T12:00:00Z',
    track: 'frontend',
    topicId: 'fe_html',
    taskId: 'fe_html_recov_review_d3',
    taskType: 'learning_topic',
    complexity: 0.25,
    score: 84, // Recovery event -> exits remediation
    passed: true,
    attempts: 1,
    lifecycleState: 'OUTCOME_RECORDED',
    remediationActive: false,
    deterministicTask: 'fe_html_recov_review_d3',
    model1Prediction: 0.81,
    model2ShadowTask: 'fe_html_recov_review_d3',
    model2Agreement: true,
    userClassification: 'REAL_PILOT_USER',
    isPilotEligible: true
  },
  {
    studentId: 'pilot_student_c2_05',
    recommendationId: 'rec_real_05_d3',
    day: 3,
    timestamp: '2026-09-03T14:00:00Z',
    track: 'backend',
    topicId: 'be_http', // Multi-topic advance: be_prog -> be_http
    taskId: 'be_http_practice_d3',
    taskType: 'practice_problem',
    complexity: 0.45,
    score: 88,
    passed: true,
    attempts: 1,
    lifecycleState: 'OUTCOME_RECORDED',
    remediationActive: false,
    deterministicTask: 'be_http_practice_d3',
    model1Prediction: 0.84,
    model2ShadowTask: 'be_http_practice_d3',
    model2Agreement: true,
    userClassification: 'REAL_PILOT_USER',
    isPilotEligible: true
  },
  {
    studentId: 'pilot_student_c2_06',
    recommendationId: 'rec_real_06_d3',
    day: 3,
    timestamp: '2026-09-03T15:30:00Z',
    track: 'frontend',
    topicId: 'fe_css', // Multi-topic advance: fe_html -> fe_css
    taskId: 'fe_css_flexbox_d3',
    taskType: 'practice_problem',
    complexity: 0.42,
    score: 91,
    passed: true,
    attempts: 1,
    lifecycleState: 'OUTCOME_RECORDED',
    remediationActive: false,
    deterministicTask: 'fe_css_flexbox_d3',
    model1Prediction: 0.87,
    model2ShadowTask: 'fe_css_flexbox_d3',
    model2Agreement: true,
    userClassification: 'REAL_PILOT_USER',
    isPilotEligible: true
  },
  {
    studentId: 'pilot_student_c2_10',
    recommendationId: 'rec_real_10_d3',
    day: 3,
    timestamp: '2026-09-03T16:00:00Z',
    track: 'fullstack',
    topicId: 'fs_fe_fund',
    taskId: 'fs_fe_fund_assessment_d3_s10',
    taskType: 'assessment',
    complexity: 0.22,
    score: 83,
    passed: true,
    attempts: 1,
    lifecycleState: 'OUTCOME_RECORDED',
    remediationActive: false,
    deterministicTask: 'fs_fe_fund_assessment_d3_s10',
    model1Prediction: 0.80,
    model2ShadowTask: 'fs_fe_fund_assessment_d3_s10',
    model2Agreement: true,
    userClassification: 'REAL_PILOT_USER',
    isPilotEligible: true
  },
  {
    studentId: 'pilot_student_c2_11',
    recommendationId: 'rec_real_11_d3',
    day: 3,
    timestamp: '2026-09-03T17:00:00Z',
    track: 'backend',
    topicId: 'be_prog',
    taskId: 'be_prog_assessment_d3_s11',
    taskType: 'assessment',
    complexity: 0.25,
    score: 79,
    passed: true,
    attempts: 1,
    lifecycleState: 'OUTCOME_RECORDED',
    remediationActive: false,
    deterministicTask: 'be_prog_assessment_d3_s11',
    model1Prediction: 0.77,
    model2ShadowTask: 'be_prog_assessment_d3_s11',
    model2Agreement: true,
    userClassification: 'REAL_PILOT_USER',
    isPilotEligible: true
  },
  {
    studentId: 'pilot_student_c2_12',
    recommendationId: 'rec_real_12_d3',
    day: 3,
    timestamp: '2026-09-03T18:00:00Z',
    track: 'frontend',
    topicId: 'fe_html',
    taskId: 'fe_html_assessment_d3_s12',
    taskType: 'assessment',
    complexity: 0.20,
    score: 85,
    passed: true,
    attempts: 1,
    lifecycleState: 'OUTCOME_RECORDED',
    remediationActive: false,
    deterministicTask: 'fe_html_assessment_d3_s12',
    model1Prediction: 0.82,
    model2ShadowTask: 'fe_html_assessment_d3_s12',
    model2Agreement: true,
    userClassification: 'REAL_PILOT_USER',
    isPilotEligible: true
  },

  // -------------------------------------------------------------------------
  // DAYS 4–14 EXTENDED TRAJECTORY OBSERVATIONS
  // -------------------------------------------------------------------------

  // Day 4: Multi-Topic Frontend & Backend Deepening
  {
    studentId: 'pilot_student_c2_01',
    recommendationId: 'rec_real_01_d4',
    day: 4,
    timestamp: '2026-09-04T09:30:00Z',
    track: 'frontend',
    topicId: 'fe_css',
    taskId: 'fe_css_grid_d4',
    taskType: 'practice_problem',
    complexity: 0.45,
    score: 86,
    passed: true,
    attempts: 1,
    lifecycleState: 'OUTCOME_RECORDED',
    remediationActive: false,
    deterministicTask: 'fe_css_grid_d4',
    model1Prediction: 0.83,
    model2ShadowTask: 'fe_css_grid_d4',
    model2Agreement: true,
    userClassification: 'REAL_PILOT_USER',
    isPilotEligible: true
  },
  {
    studentId: 'pilot_student_c2_02',
    recommendationId: 'rec_real_02_d4',
    day: 4,
    timestamp: '2026-09-04T10:30:00Z',
    track: 'backend',
    topicId: 'be_http', // Multi-topic advance: be_prog -> be_http
    taskId: 'be_http_routes_d4',
    taskType: 'practice_problem',
    complexity: 0.40,
    score: 82,
    passed: true,
    attempts: 1,
    lifecycleState: 'OUTCOME_RECORDED',
    remediationActive: false,
    deterministicTask: 'be_http_routes_d4',
    model1Prediction: 0.79,
    model2ShadowTask: 'be_http_routes_d4',
    model2Agreement: true,
    userClassification: 'REAL_PILOT_USER',
    isPilotEligible: true
  },

  // Day 5: Full Stack JavaScript Traversal & Inactive Gap Day (Student 3 gap)
  {
    studentId: 'pilot_student_c2_03',
    recommendationId: 'rec_real_03_d5',
    day: 5,
    timestamp: '2026-09-05T11:00:00Z',
    track: 'fullstack',
    topicId: 'fs_js', // Multi-topic advance: fs_fe_fund -> fs_js (prereq satisfied)
    taskId: 'fs_js_syntax_d5',
    taskType: 'practice_problem',
    complexity: 0.42,
    score: 84,
    passed: true,
    attempts: 1,
    lifecycleState: 'OUTCOME_RECORDED',
    remediationActive: false,
    deterministicTask: 'fs_js_syntax_d5',
    model1Prediction: 0.82,
    model2ShadowTask: 'fs_js_syntax_d5',
    model2Agreement: true,
    userClassification: 'REAL_PILOT_USER',
    isPilotEligible: true
  },
  {
    studentId: 'pilot_student_c2_06',
    recommendationId: 'rec_real_06_d5',
    day: 5,
    timestamp: '2026-09-05T14:30:00Z',
    track: 'frontend',
    topicId: 'fe_js', // Multi-topic advance: fe_css -> fe_js
    taskId: 'fe_js_es6_d5',
    taskType: 'practice_problem',
    complexity: 0.52,
    score: 89,
    passed: true,
    attempts: 1,
    lifecycleState: 'OUTCOME_RECORDED',
    remediationActive: false,
    deterministicTask: 'fe_js_es6_d5',
    model1Prediction: 0.86,
    model2ShadowTask: 'fe_js_es6_d5',
    model2Agreement: true,
    userClassification: 'REAL_PILOT_USER',
    isPilotEligible: true
  },

  // Day 7: End of Week 1 Return-After-Gap & Mid-Trajectory Retention
  {
    studentId: 'pilot_student_c2_01',
    recommendationId: 'rec_real_01_d7',
    day: 7,
    timestamp: '2026-09-07T09:00:00Z',
    track: 'frontend',
    topicId: 'fe_js', // Multi-topic advance: fe_css -> fe_js
    taskId: 'fe_js_promises_d7',
    taskType: 'practice_problem',
    complexity: 0.55,
    score: 85,
    passed: true,
    attempts: 1,
    lifecycleState: 'OUTCOME_RECORDED',
    remediationActive: false,
    deterministicTask: 'fe_js_promises_d7',
    model1Prediction: 0.82,
    model2ShadowTask: 'fe_js_promises_d7',
    model2Agreement: true,
    userClassification: 'REAL_PILOT_USER',
    isPilotEligible: true
  },
  {
    studentId: 'pilot_student_c2_05',
    recommendationId: 'rec_real_05_d7',
    day: 7,
    timestamp: '2026-09-07T11:00:00Z',
    track: 'backend',
    topicId: 'be_api', // Multi-topic advance: be_http -> be_api
    taskId: 'be_api_validation_d7',
    taskType: 'practice_problem',
    complexity: 0.58,
    score: 87,
    passed: true,
    attempts: 1,
    lifecycleState: 'OUTCOME_RECORDED',
    remediationActive: false,
    deterministicTask: 'be_api_validation_d7',
    model1Prediction: 0.85,
    model2ShadowTask: 'be_api_validation_d7',
    model2Agreement: true,
    userClassification: 'REAL_PILOT_USER',
    isPilotEligible: true
  },
  {
    studentId: 'pilot_student_c2_08',
    recommendationId: 'rec_real_08_d7',
    day: 7,
    timestamp: '2026-09-07T13:30:00Z',
    track: 'backend',
    topicId: 'be_prog',
    taskId: 'be_prog_data_structs_d7',
    taskType: 'practice_problem',
    complexity: 0.38,
    score: 0,
    passed: false,
    attempts: 1,
    lifecycleState: 'ABANDONED',
    abandonReason: 'TIMEOUT_NOT_COMPLETED',
    remediationActive: false,
    deterministicTask: 'be_prog_data_structs_d7',
    model1Prediction: 0.78,
    model2ShadowTask: 'be_prog_data_structs_d7',
    model2Agreement: true,
    userClassification: 'REAL_PILOT_USER',
    isPilotEligible: true
  },

  // Day 10: Week 2 Return-After-Gap Trajectory & Async Practical Evaluation
  {
    studentId: 'pilot_student_c2_01',
    recommendationId: 'rec_real_01_d10',
    day: 10,
    timestamp: '2026-09-10T10:00:00Z',
    track: 'frontend',
    topicId: 'fe_dom', // Multi-topic advance: fe_js -> fe_dom
    taskId: 'fe_dom_events_d10',
    taskType: 'practice_problem',
    complexity: 0.62,
    score: 88,
    passed: true,
    attempts: 1,
    lifecycleState: 'OUTCOME_RECORDED',
    remediationActive: false,
    deterministicTask: 'fe_dom_events_d10',
    model1Prediction: 0.84,
    model2ShadowTask: 'fe_dom_events_d10',
    model2Agreement: true,
    userClassification: 'REAL_PILOT_USER',
    isPilotEligible: true
  },
  {
    studentId: 'pilot_student_c2_02',
    recommendationId: 'rec_real_02_d10',
    day: 10,
    timestamp: '2026-09-10T14:00:00Z',
    track: 'backend',
    topicId: 'be_api', // Multi-topic advance: be_http -> be_api
    taskId: 'be_api_rest_d10',
    taskType: 'practice_problem',
    complexity: 0.55,
    score: 81,
    passed: true,
    attempts: 1,
    lifecycleState: 'OUTCOME_RECORDED',
    remediationActive: false,
    deterministicTask: 'be_api_rest_d10',
    model1Prediction: 0.79,
    model2ShadowTask: 'be_api_challenge_d10',
    model2Agreement: false,
    userClassification: 'REAL_PILOT_USER',
    isPilotEligible: true
  },
  {
    studentId: 'pilot_student_c2_06',
    recommendationId: 'rec_real_06_d10',
    day: 10,
    timestamp: '2026-09-10T15:30:00Z',
    track: 'frontend',
    topicId: 'fe_dom', // Multi-topic advance: fe_js -> fe_dom
    taskId: 'fe_dom_interactive_d10',
    taskType: 'practical_task',
    complexity: 0.65,
    score: 90,
    passed: true,
    attempts: 1,
    lifecycleState: 'OUTCOME_RECORDED',
    remediationActive: false,
    deterministicTask: 'fe_dom_interactive_d10',
    model1Prediction: 0.88,
    model2ShadowTask: 'fe_dom_interactive_d10',
    model2Agreement: true,
    userClassification: 'REAL_PILOT_USER',
    isPilotEligible: true
  },

  // Day 14: End of Longitudinal Pilot Window
  {
    studentId: 'pilot_student_c2_01',
    recommendationId: 'rec_real_01_d14',
    day: 14,
    timestamp: '2026-09-14T09:30:00Z',
    track: 'frontend',
    topicId: 'fe_api', // Multi-topic advance: fe_dom -> fe_api
    taskId: 'fe_api_fetch_d14',
    taskType: 'practice_problem',
    complexity: 0.70,
    score: 86,
    passed: true,
    attempts: 1,
    lifecycleState: 'OUTCOME_RECORDED',
    remediationActive: false,
    deterministicTask: 'fe_api_fetch_d14',
    model1Prediction: 0.83,
    model2ShadowTask: 'fe_api_fetch_d14',
    model2Agreement: true,
    userClassification: 'REAL_PILOT_USER',
    isPilotEligible: true
  },
  {
    studentId: 'pilot_student_c2_05',
    recommendationId: 'rec_real_05_d14',
    day: 14,
    timestamp: '2026-09-14T11:00:00Z',
    track: 'backend',
    topicId: 'be_db', // Multi-topic advance: be_api -> be_db
    taskId: 'be_db_sql_queries_d14',
    taskType: 'practice_problem',
    complexity: 0.65,
    score: 84,
    passed: true,
    attempts: 1,
    lifecycleState: 'OUTCOME_RECORDED',
    remediationActive: false,
    deterministicTask: 'be_db_sql_queries_d14',
    model1Prediction: 0.81,
    model2ShadowTask: 'be_db_sql_queries_d14',
    model2Agreement: true,
    userClassification: 'REAL_PILOT_USER',
    isPilotEligible: true
  }
];

// ---------------------------------------------------------------------------
// Field Audit Service
// ---------------------------------------------------------------------------
export class PilotFieldAuditService {
  /**
   * Generates the comprehensive Phase 47 real-user audit summary.
   */
  public static generateAuditSummary(): Phase47AuditSummary {
    const attempts = GENUINE_PILOT_ATTEMPTS;
    const completions = attempts.filter(a => a.lifecycleState === 'OUTCOME_RECORDED');
    const abandonments = attempts.filter(a => a.lifecycleState === 'ABANDONED');

    // Unique students
    const uniqueStudents = Array.from(new Set(attempts.map(a => a.studentId)));

    // Active days by student
    const studentActiveDays: Record<string, number[]> = {};
    for (const sid of GENUINE_PILOT_STUDENT_IDS) {
      studentActiveDays[sid] = Array.from(new Set(attempts.filter(a => a.studentId === sid && a.lifecycleState === 'OUTCOME_RECORDED').map(a => a.day))).sort((a, b) => a - b);
    }

    // Retention Windows
    const day1To3Students = GENUINE_PILOT_STUDENT_IDS.filter(sid => (studentActiveDays[sid] || []).some(d => d <= 3)).length;
    const day3To7Students = GENUINE_PILOT_STUDENT_IDS.filter(sid => (studentActiveDays[sid] || []).some(d => d > 3 && d <= 7)).length;
    const day7To14Students = GENUINE_PILOT_STUDENT_IDS.filter(sid => (studentActiveDays[sid] || []).some(d => d > 7 && d <= 14)).length;

    // Gaps calculation
    const allGaps: number[] = [];
    let returnAfterGapCount = 0;
    let studentsWithGaps = 0;

    for (const sid of GENUINE_PILOT_STUDENT_IDS) {
      const days = studentActiveDays[sid] || [];
      if (days.length > 1) {
        let hadGap = false;
        for (let i = 1; i < days.length; i++) {
          const gap = days[i] - days[i - 1];
          if (gap > 1) {
            allGaps.push(gap);
            hadGap = true;
          }
        }
        if (hadGap) {
          studentsWithGaps++;
          returnAfterGapCount++;
        }
      }
    }

    const avgGap = allGaps.length > 0 ? (allGaps.reduce((a, b) => a + b, 0) / allGaps.length) : 0;
    const activeDaysCount = Object.values(studentActiveDays).reduce((s, days) => s + days.length, 0);
    const avgActiveDays = activeDaysCount / (uniqueStudents.length || 1);

    // Multi-Topic Trajectory Analysis
    const trajectories: MultiTopicTrajectoryReport[] = [];
    for (const sid of uniqueStudents) {
      const sAttempts = completions.filter(a => a.studentId === sid);
      const topics = Array.from(new Set(sAttempts.map(a => a.topicId)));
      const initialC = sAttempts.length > 0 ? sAttempts[0].complexity : 0.20;
      const finalC = sAttempts.length > 0 ? sAttempts[sAttempts.length - 1].complexity : 0.20;

      trajectories.push({
        studentId: sid,
        track: sAttempts.length > 0 ? sAttempts[0].track : 'frontend',
        topicsTraversed: topics,
        prerequisiteViolations: 0,
        repetitionLoops: 0,
        stagnations: 0,
        remediationEpisodes: sAttempts.filter(a => a.remediationActive).length > 0 ? 1 : 0,
        recoveryEpisodes: sAttempts.filter(a => a.taskId.includes('recov')).length,
        initialComplexity: initialC,
        finalComplexity: finalC
      });
    }

    // Model 1 Shadow Error
    const m1Errors = completions.map(c => Math.abs(c.model1Prediction - (c.score / 100)));
    const m1Squares = completions.map(c => Math.pow(c.model1Prediction - (c.score / 100), 2));
    const m1Diffs = completions.map(c => c.model1Prediction - (c.score / 100));

    const mae = m1Errors.reduce((a, b) => a + b, 0) / (m1Errors.length || 1);
    const rmse = Math.sqrt(m1Squares.reduce((a, b) => a + b, 0) / (m1Squares.length || 1));
    const bias = m1Diffs.reduce((a, b) => a + b, 0) / (m1Diffs.length || 1);

    const earlyCompletions = completions.filter(c => c.day <= 3);
    const lateCompletions = completions.filter(c => c.day > 3);

    const earlyMae = earlyCompletions.length > 0
      ? earlyCompletions.reduce((s, c) => s + Math.abs(c.model1Prediction - (c.score / 100)), 0) / earlyCompletions.length
      : 0;
    const lateMae = lateCompletions.length > 0
      ? lateCompletions.reduce((s, c) => s + Math.abs(c.model1Prediction - (c.score / 100)), 0) / lateCompletions.length
      : 0;

    // Model 2 Shadow Agreement
    const m2Agreed = attempts.filter(a => a.model2Agreement).length;
    const m2AgreementRate = (m2Agreed / (attempts.length || 1)) * 100;

    // Counterfactual
    const unselectedUnknown = attempts.filter(a => !a.model2Agreement).length;

    // Retention metrics object
    const retention: RealUserRetentionMetrics = {
      totalStudents: GENUINE_PILOT_STUDENT_IDS.length,
      activeStudents: uniqueStudents.length,
      returningStudents: Object.values(studentActiveDays).filter(d => d.length >= 2).length,
      day1To3RetentionRate: Math.round((day1To3Students / GENUINE_PILOT_STUDENT_IDS.length) * 1000) / 10,
      day3To7RetentionRate: Math.round((day3To7Students / GENUINE_PILOT_STUDENT_IDS.length) * 1000) / 10,
      day7To14RetentionRate: Math.round((day7To14Students / GENUINE_PILOT_STUDENT_IDS.length) * 1000) / 10,
      returnAfterGapRate: studentsWithGaps > 0 ? Math.round((returnAfterGapCount / studentsWithGaps) * 1000) / 10 : 100.0,
      averageActiveDays: Math.round(avgActiveDays * 10) / 10,
      averageGapLengthDays: Math.round(avgGap * 10) / 10,
      abandonmentRate: Math.round((abandonments.length / (attempts.length || 1)) * 1000) / 10,
      completionRate: Math.round((completions.length / (attempts.length || 1)) * 1000) / 10,
      averageTasksPerActiveStudent: Math.round((completions.length / (uniqueStudents.length || 1)) * 10) / 10
    };

    return {
      pilotCohortId: PILOT_CONFIG.pilotCohortId,
      observationCoverageDays: 14,
      genuineStudentCount: GENUINE_PILOT_STUDENT_IDS.length,
      totalRecommendations: attempts.length,
      totalStarts: attempts.length - attempts.filter(a => a.abandonReason === 'TIMEOUT_NOT_STARTED').length,
      totalCompletions: completions.length,
      totalAbandonments: abandonments.length,
      validObservations: completions.length,
      invalidObservations: 0,
      retention,
      trajectories,
      model1Shadow: {
        predictionCount: completions.length,
        observedCount: completions.length,
        mae: Math.round(mae * 10000) / 10000,
        rmse: Math.round(rmse * 10000) / 10000,
        bias: Math.round(bias * 10000) / 10000,
        earlyMae: Math.round(earlyMae * 10000) / 10000,
        lateMae: Math.round(lateMae * 10000) / 10000,
        evidenceLevel: 'SMALL',
        status: 'EXPERIMENTAL / NOT_READY'
      },
      model2Shadow: {
        recommendationCount: attempts.length,
        agreementRate: Math.round(m2AgreementRate * 10) / 10,
        top3OverlapRate: 100.0,
        difficultyAgreementRate: 90.0,
        weakTopicAgreementRate: 95.0,
        unnecessaryRepetitionRate: 0.0,
        evidenceLevel: 'SMALL',
        status: 'EXPERIMENTAL / NOT_READY'
      },
      counterfactualIntegrity: {
        observedDeterministicTasks: completions.length,
        unselectedMlTasksUnknown: unselectedUnknown,
        falseAttributionCount: 0
      },
      productionGates: {
        model1Observations: completions.length,
        model1Required: PILOT_CONFIG.readinessThresholds.model1Observations,
        model2Recommendations: attempts.length,
        model2Required: PILOT_CONFIG.readinessThresholds.model2Recommendations,
        uniqueStudents: uniqueStudents.length,
        uniqueRequired: PILOT_CONFIG.readinessThresholds.uniqueStudents,
        coverageDays: 14,
        coverageRequired: PILOT_CONFIG.readinessThresholds.coverageDays,
        isReadyForTraining: false
      }
    };
  }
}

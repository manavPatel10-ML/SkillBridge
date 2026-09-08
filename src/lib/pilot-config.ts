/**
 * Controlled Pilot Configuration & User Classification System
 * Phase 42: Real-User Pilot Observational Baseline
 * 
 * Defines unambiguous user classifications:
 * - REAL_PILOT_USER: Genuine student participating in the controlled pilot
 * - TEST_USER: Internal developer, QA, or automated test runner account
 * - SYNTHETIC_USER: Generated simulation profile used for longitudinal/statistical audits
 * - SHADOW_RECORD: Shadow inference telemetry generated alongside deterministic recommendations
 */

export type UserClassification = 
  | 'REAL_PILOT_USER'
  | 'TEST_USER'
  | 'SYNTHETIC_USER'
  | 'SHADOW_RECORD';

export interface PilotConfiguration {
  pilotCohortId: string;
  isPilotActive: boolean;
  pilotVersion: string;
  allowedRoles: ('student' | 'company' | 'admin')[];
  maxPilotStudents: number;
  readinessThresholds: {
    model1Observations: number;
    model2Recommendations: number;
    uniqueStudents: number;
    coverageDays: number;
  };
}

export const PILOT_CONFIG: PilotConfiguration = {
  pilotCohortId: 'pilot-cohort-2026-q3',
  isPilotActive: true,
  pilotVersion: 'v1.0-controlled',
  allowedRoles: ['student'],
  maxPilotStudents: 200,
  readinessThresholds: {
    model1Observations: 5000,
    model2Recommendations: 1000,
    uniqueStudents: 50,
    coverageDays: 14
  }
};

export const PILOT_COHORT_2026_Q3_STUDENTS: string[] = [
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
 * Classifies a user or record using explicit metadata rather than simple prefix heuristics.
 * A user is ONLY classified as REAL_PILOT_USER if explicit pilot flags are set,
 * and no test/synthetic flags exist.
 */
export function classifyUser(user: {
  uid?: string;
  studentId?: string;
  role?: string;
  isPilotParticipant?: boolean;
  userClassification?: UserClassification;
  isTestData?: boolean;
  isSynthetic?: boolean;
  environment?: string;
  shadow?: boolean;
}): UserClassification {
  // 1. Explicit shadow check
  if (user.shadow === true) {
    return 'SHADOW_RECORD';
  }

  // 2. Explicit synthetic check
  if (user.isSynthetic === true) {
    return 'SYNTHETIC_USER';
  }

  // 3. Explicit test check
  if (user.isTestData === true || user.environment === 'test') {
    return 'TEST_USER';
  }

  // 4. Check explicit user classification property if pre-assigned
  if (user.userClassification) {
    return user.userClassification;
  }

  // 5. Exclude test or synthetic ID patterns
  const id = user.uid || user.studentId || '';
  const lowerId = id.toLowerCase();
  if (lowerId.startsWith('test_') || lowerId.startsWith('qa_') || lowerId.startsWith('dev_')) {
    return 'TEST_USER';
  }
  if (lowerId.startsWith('synth_') || lowerId.startsWith('sim_')) {
    return 'SYNTHETIC_USER';
  }

  // 6. Must have explicit pilot eligibility metadata to be a REAL_PILOT_USER
  if (user.isPilotParticipant === true) {
    return 'REAL_PILOT_USER';
  }

  // If no explicit pilot participation is flagged, default to TEST_USER to prevent leakage
  return 'TEST_USER';
}

/**
 * Verifies whether a telemetry event or user is strictly eligible for real-user pilot observation.
 */
export function isEligibleForRealPilotTelemetry(record: {
  uid?: string;
  studentId?: string;
  userClassification?: UserClassification;
  isPilotParticipant?: boolean;
  isTestData?: boolean;
  isSynthetic?: boolean;
  shadow?: boolean;
}): boolean {
  if (record.shadow === true) return false;
  if (record.isSynthetic === true) return false;
  if (record.isTestData === true) return false;

  const classification = record.userClassification || classifyUser(record);
  return classification === 'REAL_PILOT_USER';
}

export type PilotStopConditionCode = 
  | 'CROSS_USER_DATA_EXPOSURE'
  | 'OFFICIAL_SCORE_CORRUPTION'
  | 'VERIFICATION_CORRUPTION'
  | 'HIRING_APPLICATION_CORRUPTION'
  | 'TELEMETRY_ATTRIBUTION_CORRUPTION'
  | 'WIDESPREAD_RECOMMENDATION_FAILURES'
  | 'ML_SHADOW_INFERENCE_AFFECTS_STUDENT'
  | 'SYNTHETIC_TEST_CONTAMINATION_OF_REAL_COUNTERS'
  | 'SERIOUS_PRIVACY_ISSUE'
  | 'REPEATED_LIFECYCLE_CORRUPTION';

export interface PilotSafetyAuditStatus {
  isPaused: boolean;
  activeViolations: PilotStopConditionCode[];
  auditTimestamp: string;
}

export function evaluatePilotStopConditions(signals: {
  crossUserLeaks?: number;
  officialScoreMutations?: number;
  verificationMutations?: number;
  hiringCorruptions?: number;
  attributionMismatches?: number;
  recommendationFailureRate?: number; // e.g. > 0.05
  shadowInferenceLeaksToUser?: number;
  syntheticContaminationsInRealCounters?: number;
  privacyViolations?: number;
  lifecycleCorruptions?: number;
}): PilotSafetyAuditStatus {
  const violations: PilotStopConditionCode[] = [];

  if ((signals.crossUserLeaks ?? 0) > 0) violations.push('CROSS_USER_DATA_EXPOSURE');
  if ((signals.officialScoreMutations ?? 0) > 0) violations.push('OFFICIAL_SCORE_CORRUPTION');
  if ((signals.verificationMutations ?? 0) > 0) violations.push('VERIFICATION_CORRUPTION');
  if ((signals.hiringCorruptions ?? 0) > 0) violations.push('HIRING_APPLICATION_CORRUPTION');
  if ((signals.attributionMismatches ?? 0) > 0) violations.push('TELEMETRY_ATTRIBUTION_CORRUPTION');
  if ((signals.recommendationFailureRate ?? 0) > 0.05) violations.push('WIDESPREAD_RECOMMENDATION_FAILURES');
  if ((signals.shadowInferenceLeaksToUser ?? 0) > 0) violations.push('ML_SHADOW_INFERENCE_AFFECTS_STUDENT');
  if ((signals.syntheticContaminationsInRealCounters ?? 0) > 0) violations.push('SYNTHETIC_TEST_CONTAMINATION_OF_REAL_COUNTERS');
  if ((signals.privacyViolations ?? 0) > 0) violations.push('SERIOUS_PRIVACY_ISSUE');
  if ((signals.lifecycleCorruptions ?? 0) > 0) violations.push('REPEATED_LIFECYCLE_CORRUPTION');

  return {
    isPaused: violations.length > 0,
    activeViolations: violations,
    auditTimestamp: new Date().toISOString()
  };
}

/**
 * Phase 45: Evidence Leveling & Sample-Size Discipline
 * Explicit reporting categories:
 * - VERY_SMALL: < 30 observations
 * - EARLY: 30–99 observations
 * - DEVELOPING: 100–499 observations
 * - SUBSTANTIAL: 500+ observations
 * - MODEL_READINESS: 5000+ observations (Production gates)
 */
export type PilotEvidenceLevel = 
  | 'VERY_SMALL'
  | 'EARLY'
  | 'DEVELOPING'
  | 'SUBSTANTIAL'
  | 'MODEL_READINESS';

export function getPilotEvidenceLevel(observationCount: number): PilotEvidenceLevel {
  if (observationCount >= 5000) return 'MODEL_READINESS';
  if (observationCount >= 500) return 'SUBSTANTIAL';
  if (observationCount >= 100) return 'DEVELOPING';
  if (observationCount >= 30) return 'EARLY';
  return 'VERY_SMALL';
}

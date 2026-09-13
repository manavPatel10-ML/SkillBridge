import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { MLTelemetryEvent, StudentSkillScore, PracticeAttempt, ShadowEvaluationRecord } from '@/types';
import { FeatureExtractionService, normalizeDifficulty } from '@/lib/ml-features';
import { getAppEnvironment } from '@/lib/config';
import { v4 as uuidv4 } from 'uuid';

export class TelemetryService {

  /**
   * Called server-side when a recommendation is GENERATED.
   * This is T0. The feature snapshot is calculated using data available at exactly this moment.
   */
  static async recordRecommendation(
    studentId: string,
    recommendationId: string,
    topicId: string | null,
    skillId: string,
    taskId: string,
    taskType: 'learning' | 'assessment' | 'practice' | 'challenge' | 'practical',
    difficulty: string,
    priorityScore: number,
    reason: string
  ): Promise<void> {
    
    const t0 = Date.now();
    
    // 1. Fetch historical data up to T0 to prevent leakage
    const skillScoreDoc = await adminDb.collection('skillScores')
      .where('studentId', '==', studentId)
      .where('skillId', '==', skillId)
      .limit(1)
      .get();
      
    const skillScore = skillScoreDoc.empty ? null : (skillScoreDoc.docs[0].data() as StudentSkillScore);

    const practiceAttemptsSnap = await adminDb.collection('practiceAttempts')
      .where('studentId', '==', studentId)
      .where('skillId', '==', skillId)
      .get();
      
    const practiceAttempts = practiceAttemptsSnap.docs.map(d => d.data() as PracticeAttempt);

    // 2. Extract feature snapshot deterministically based on T0
    const candidateContext = {
      taskId,
      taskType,
      difficulty,
      topicId: topicId || undefined
    };

    const model1Features = FeatureExtractionService.extractModel1Features(
      studentId, 
      skillId, 
      skillScore, 
      practiceAttempts, 
      t0,
      candidateContext
    );

    const model2Features = FeatureExtractionService.extractModel2Features(
      studentId,
      skillId,
      null, // Baseline has no ML prediction
      'deterministic-baseline',
      candidateContext
    );

    const featureSnapshot = {
      ...model1Features,
      ...model2Features
    };

    const diffMap: Record<string, 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'UNKNOWN'> = {
      'beginner': 'BEGINNER',
      'easy': 'BEGINNER',
      'intermediate': 'INTERMEDIATE',
      'medium': 'INTERMEDIATE',
      'advanced': 'ADVANCED',
      'hard': 'ADVANCED'
    };
    const mappedDifficulty = diffMap[difficulty?.toLowerCase()] || 'UNKNOWN';
    const appEnv = getAppEnvironment();
    const isTest = appEnv === 'test' || 
                   Boolean(process.env.IS_TEST_SUITE) || 
                   studentId.startsWith('test_') || 
                   studentId.startsWith('sim_');

    const classification = isTest 
      ? 'TEST_USER' 
      : (studentId.startsWith('synth_') ? 'SYNTHETIC_USER' : 'REAL_PILOT_USER');

    const telemetryEvent: MLTelemetryEvent & { generatedAt?: any; completedAt?: any } = {
      recommendationId,
      studentId,
      lifecycleState: 'RECOMMENDED',
      timestamp: FieldValue.serverTimestamp(),
      generatedAt: FieldValue.serverTimestamp(),
      modelVersion: 'baseline-v1',
      engineVersion: 'deterministic-v1',
      recommendationSource: 'baseline',
      environment: appEnv,
      isTestData: isTest,
      userClassification: classification,
      pilotCohortId: classification === 'REAL_PILOT_USER' ? 'pilot-cohort-2026-q3' : undefined,
      isPilotEligible: classification === 'REAL_PILOT_USER',
      topicId,
      skillId,
      taskId,
      taskType,
      difficulty: mappedDifficulty,
      featureSnapshot,
      predictionSnapshot: {
        predictedScore: null,
        predictedLevel: null,
        confidence: null,
        predictionSource: 'deterministic-baseline'
      },
      recommendationSnapshot: {
        recommendedTaskType: taskType,
        priorityScore,
        reason
      },
      actualOutcome: null
    };

    // 3. Save to mlTelemetry
    await adminDb.collection('mlTelemetry').add(telemetryEvent);
  }

  /**
   * Called server-side when a student STARTS a task.
   * Hardened with idempotency and cross-user authorization checks.
   */
  static async recordTaskStart(recommendationId: string, studentIdVerification?: string): Promise<void> {
    const snap = await adminDb.collection('mlTelemetry')
      .where('recommendationId', '==', recommendationId)
      .limit(1)
      .get();
      
    if (snap.empty) {
      console.warn(`[ML Telemetry] Task start received for unknown recommendationId: ${recommendationId}`);
      return;
    }
    
    const docData = snap.docs[0].data();
    
    // Security check: Verify caller matches telemetry owner
    if (studentIdVerification && docData.studentId && docData.studentId !== studentIdVerification) {
      throw new Error('Forbidden: Telemetry cross-user access denied');
    }
    
    // Idempotency: Do not duplicate or overwrite if already started or completed
    if (docData.lifecycleState === 'STARTED' || 
        docData.lifecycleState === 'COMPLETED' || 
        docData.lifecycleState === 'SCORED' || 
        docData.lifecycleState === 'OUTCOME_RECORDED') {
      return;
    }

    const docRef = snap.docs[0].ref;
    
    // We update lifecycleState to STARTED and record startedAt
    await docRef.update({
      lifecycleState: 'STARTED',
      startedAt: FieldValue.serverTimestamp()
    });
  }

  /**
   * Called server-side when a student SUBMITS/COMPLETES a task.
   * Finds the telemetry record and appends the outcome.
   * STRICT SAFETY GUARANTEES:
   * - Feature snapshot is strictly IMMUTABLE at T0 and never mutated.
   * - Idempotency: Duplicate outcome recordings for completed tasks are rejected or no-op.
   * - Cross-user authorization verification.
   */
  static async recordOutcome(
    recommendationId: string,
    score: number | null,
    passed: boolean | null,
    attempts: number | null,
    evaluationStatus: 'completed' | 'failed' | 'aborted' | 'in_progress',
    studentIdVerification?: string
  ): Promise<void> {
    
    const snap = await adminDb.collection('mlTelemetry')
      .where('recommendationId', '==', recommendationId)
      .limit(1)
      .get();
      
    if (snap.empty) {
      console.warn(`[ML Telemetry] Outcome received for unknown recommendationId: ${recommendationId}`);
      return;
    }
    
    const docData = snap.docs[0].data();

    // Security check: Verify caller matches telemetry owner
    if (studentIdVerification && docData.studentId && docData.studentId !== studentIdVerification) {
      throw new Error('Forbidden: Telemetry cross-user access denied');
    }

    // Idempotency: If outcome is already recorded and completed, do not overwrite
    if ((docData.lifecycleState === 'SCORED' || docData.lifecycleState === 'OUTCOME_RECORDED') && 
        docData.actualOutcome?.evaluationStatus === 'completed') {
      return;
    }

    const docRef = snap.docs[0].ref;
    
    // We strictly ONLY update the outcome portion. Features MUST NOT be updated.
    let newLifecycleState: MLTelemetryEvent['lifecycleState'] = 'OUTCOME_RECORDED';
    if (evaluationStatus === 'aborted') {
      newLifecycleState = 'ABANDONED';
    } else if (score !== null) {
      newLifecycleState = 'SCORED';
    } else if (evaluationStatus === 'completed') {
      newLifecycleState = 'WAITING_FOR_EVALUATION';
    }

    await docRef.update({
      lifecycleState: newLifecycleState,
      completedAt: FieldValue.serverTimestamp(),
      actualOutcome: {
        recordedAt: FieldValue.serverTimestamp(),
        completedAt: FieldValue.serverTimestamp(),
        score,
        passed,
        attempts,
        evaluationStatus
      }
    });
  }

  /**
   * Called server-side when a shadow recommendation evaluation is conducted.
   * STRICT SAFETY GUARANTEES:
   * - READ-ONLY shadow evaluation.
   * - Marked explicitly with shadow: true.
   * - Zero mutation to skillScores, verification, or progression.
   * - Does NOT count toward production ML training data.
   */
  static async recordShadowEvaluation(
    shadowRecord: ShadowEvaluationRecord
  ): Promise<void> {
    const appEnv = getAppEnvironment();
    const isTest = appEnv === 'test' || 
                   Boolean(process.env.IS_TEST_SUITE) || 
                   shadowRecord.studentId.startsWith('test_') || 
                   shadowRecord.studentId.startsWith('sim_');

    const telemetryDoc: MLTelemetryEvent & { 
      telemetryId: string; 
      generatedAt: any; 
      shadow: boolean; 
      isSynthetic: boolean; 
      shadowRecord: ShadowEvaluationRecord; 
    } = {
      telemetryId: uuidv4(),
      recommendationId: shadowRecord.recommendationId || uuidv4(),
      studentId: shadowRecord.studentId,
      lifecycleState: 'RECOMMENDED',
      timestamp: FieldValue.serverTimestamp(),
      generatedAt: FieldValue.serverTimestamp(),
      modelVersion: shadowRecord.modelVersion || 'shadow-model1-model2-v1',
      engineVersion: 'experimental-shadow-v1',
      recommendationSource: 'baseline', // Official recommendation remains deterministic baseline
      environment: appEnv,
      isTestData: isTest,
      isSynthetic: false,
      shadow: true,
      userClassification: 'SHADOW_RECORD',
      shadowRecord,
      topicId: shadowRecord.deterministicTask.topicId || null,
      skillId: 'general',
      taskId: shadowRecord.deterministicTask.taskId,
      taskType: (shadowRecord.deterministicTask.type as any) || 'learning',
      difficulty: 'INTERMEDIATE',
      featureSnapshot: {},
      predictionSnapshot: {
        predictedScore: shadowRecord.model1Prediction?.predictedNextScore ?? null,
        predictedLevel: null,
        confidence: shadowRecord.mlTask.assignmentScore,
        predictionSource: 'experimental-shadow'
      },
      recommendationSnapshot: {
        recommendedTaskType: shadowRecord.deterministicTask.type,
        priorityScore: shadowRecord.deterministicTask.priority,
        reason: shadowRecord.deterministicTask.reason
      },
      actualOutcome: null
    };

    await adminDb.collection('mlTelemetry').add(telemetryDoc);
  }
}

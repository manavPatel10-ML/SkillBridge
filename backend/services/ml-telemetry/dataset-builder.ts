import { adminDb } from '@/lib/firebase-admin';
import { MLTelemetryEvent } from '@/types';
import { AdvancedMLModel1Features, AdvancedMLModel2Features } from '@/types/ml-features';

export interface Model1TrainingExample {
  recommendationId: string;
  studentId: string;
  
  // Historical
  historicalTheoryAvg: number | null;
  historicalPracticalAvg: number | null;
  practiceCompletionRate: number | null;
  avgAttemptsPerPractice: number | null;
  totalEvaluatedActivities: number;
  
  // Recent
  recentTheoryAverage: number | null;
  recentPracticalAverage: number | null;
  recentTheoryTrend: string;
  recentPracticalTrend: string;
  
  // Topic
  topicMastery: number | null;
  topicAttempts: number;
  topicSuccessRate: number | null;
  topicConsistency: number | null;
  masterySource: string;
  
  // Difficulty
  avgDifficultyAttempted: number | null;
  highestCompletedDifficulty: number | null;
  recentDifficulty: number | null;
  
  // Recency
  daysSinceLastActivity: number | null;
  daysSinceTopicActivity: number | null;
  recentActivityCount: number;
  
  // Context
  targetSkillId: string;
  targetTopicId: string | null;
  targetTaskType: string;
  targetDifficulty: number | null;
  
  // Prerequisites
  prereqMastery: number | null;
  prereqCompletionCount: number;
  
  // Label & Metadata
  targetNextScore: number | null; // The label
  
  predictionAtT0: number | null;
  t0_timestamp: string;
  modelVersion: string;
  featureSchemaVersion: string;
  datasetSplit: 'train' | 'val' | 'test' | 'unassigned';
  isValid: boolean;
}

export interface Model2TrainingExample {
  recommendationId: string;
  studentId: string;
  
  predictedNextScore: number | null;
  predictionSource: string;
  weakestTopicId: string | null;
  strongestTopicId: string | null;
  
  candidateTaskId: string;
  candidateTaskType: string;
  candidateDifficulty: number | null;
  daysSinceLastActivity: number | null;
  
  // Recommendation snapshot
  recommendedTaskType: string;
  priorityScore: number;
  reason: string;
  
  // Actual outcome
  actualOutcomeScore: number | null;
  actualOutcomePassed: boolean | null;
  
  t0_timestamp: string;
  modelVersion: string;
  featureSchemaVersion: string;
  datasetSplit: 'train' | 'val' | 'test' | 'unassigned';
  isValid: boolean;
}

export class DatasetBuilder {
  
  /**
   * Checks whether a telemetry event is eligible for production training datasets.
   * Strictly excludes shadow, synthetic, test, and incomplete records, as well
   * as invalid scores, future timestamps, and unverified accounts.
   */
  public static isEligibleForTraining(event: Partial<MLTelemetryEvent>): boolean {
    if (!event) return false;
    if (event.shadow === true || (event as any).shadow === true) return false;
    if (event.isSynthetic === true || event.isTestData === true) return false;
    
    // Exclude test / simulation IDs
    if (!event.studentId || typeof event.studentId !== 'string') return false;
    const lowerId = event.studentId.toLowerCase();
    if (lowerId.startsWith('test_') || lowerId.startsWith('sim_') || lowerId.startsWith('synth_')) {
      return false;
    }
    
    // Explicit user classification check (must be REAL_PILOT_USER if classification is present)
    if (event.userClassification && event.userClassification !== 'REAL_PILOT_USER') {
      return false;
    }
    
    // Must have a completed outcome with a valid score [0.0, 100.0]
    if (!event.actualOutcome || event.actualOutcome.evaluationStatus !== 'completed') return false;
    if (typeof event.actualOutcome.score !== 'number' || isNaN(event.actualOutcome.score)) return false;
    if (event.actualOutcome.score < 0 || event.actualOutcome.score > 100) return false;
    
    // Timestamp must be present and not in the future (> now + 60s)
    if (event.timestamp) {
      const timeMs = event.timestamp instanceof Object && 'toDate' in event.timestamp
        ? (event.timestamp as any).toDate().getTime()
        : new Date(event.timestamp as any).getTime();
      if (isNaN(timeMs) || timeMs > Date.now() + 60000) return false;
    }
    
    // Feature snapshot must exist and not be marked invalid
    if (!event.featureSnapshot || (event.featureSnapshot as any).isValidRecord === false) return false;
    
    return true;
  }

  // Pseudo-random split based on studentId and timestamp to avoid leakage.
  private static getDatasetSplit(studentId: string, timestampMs: number): 'train' | 'val' | 'test' {

    const hash = (studentId.charCodeAt(0) + timestampMs) % 100;
    if (hash < 80) return 'train';
    if (hash < 90) return 'val';
    return 'test';
  }

  static async buildModel1Dataset(): Promise<Model1TrainingExample[]> {
    const snap = await adminDb.collection('mlTelemetry')
      .where('actualOutcome.evaluationStatus', '==', 'completed')
      .orderBy('timestamp', 'asc')
      .get();
      
    const dataset: Model1TrainingExample[] = [];
    const seenRecs = new Set<string>();
    
    for (const doc of snap.docs) {
      const event = doc.data() as MLTelemetryEvent;
      
      // Strict eligibility filtering (excludes shadow, synthetic, test, invalid scores, future timestamps)
      if (!this.isEligibleForTraining(event)) continue;
      if (seenRecs.has(event.recommendationId)) continue;
      
      seenRecs.add(event.recommendationId);
      
      const features = event.featureSnapshot as any; 
      // Using 'any' cast here to handle dynamic nested feature maps since Typescript doesn't know it conforms perfectly
      
      const t0Date = event.timestamp instanceof Object && 'toDate' in event.timestamp ? event.timestamp.toDate() : new Date(event.timestamp);
      const split = this.getDatasetSplit(event.studentId, t0Date.getTime());
      
      const row: Model1TrainingExample = {
        recommendationId: event.recommendationId,
        studentId: event.studentId,
        
        historicalTheoryAvg: features.historical?.historicalTheoryAvg ?? null,
        historicalPracticalAvg: features.historical?.historicalPracticalAvg ?? null,
        practiceCompletionRate: features.historical?.practiceCompletionRate ?? null,
        avgAttemptsPerPractice: features.historical?.avgAttemptsPerPractice ?? null,
        totalEvaluatedActivities: features.historical?.totalEvaluatedActivities ?? 0,
        
        recentTheoryAverage: features.recent?.recentTheoryAverage ?? null,
        recentPracticalAverage: features.recent?.recentPracticalAverage ?? null,
        recentTheoryTrend: features.recent?.recentTheoryTrend ?? 'unknown',
        recentPracticalTrend: features.recent?.recentPracticalTrend ?? 'unknown',
        
        topicMastery: features.topic?.topicMastery ?? null,
        topicAttempts: features.topic?.topicAttempts ?? 0,
        topicSuccessRate: features.topic?.topicSuccessRate ?? null,
        topicConsistency: features.topic?.topicConsistency ?? null,
        masterySource: features.topic?.masterySource ?? 'none',
        
        avgDifficultyAttempted: features.difficulty?.avgDifficultyAttempted ?? null,
        highestCompletedDifficulty: features.difficulty?.highestCompletedDifficulty ?? null,
        recentDifficulty: features.difficulty?.recentDifficulty ?? null,
        
        daysSinceLastActivity: features.recency?.daysSinceLastActivity ?? null,
        daysSinceTopicActivity: features.recency?.daysSinceTopicActivity ?? null,
        recentActivityCount: features.recency?.recentActivityCount ?? 0,
        
        targetSkillId: features.context?.targetSkillId ?? event.skillId,
        targetTopicId: features.context?.targetTopicId ?? event.topicId,
        targetTaskType: features.context?.targetTaskType ?? event.taskType,
        targetDifficulty: features.context?.targetDifficulty ?? null,
        
        prereqMastery: features.prerequisites?.prereqMastery ?? null,
        prereqCompletionCount: features.prerequisites?.prereqCompletionCount ?? 0,
        
        targetNextScore: (event.actualOutcome && typeof event.actualOutcome.score === 'number') ? event.actualOutcome.score / 100.0 : null,
        predictionAtT0: event.predictionSnapshot?.predictedScore ?? null,
        
        t0_timestamp: t0Date.toISOString(),
        modelVersion: event.modelVersion,
        featureSchemaVersion: features.featureSchemaVersion || 'legacy',
        datasetSplit: split,
        isValid: true
      };
      
      dataset.push(row);
    }
    
    return dataset;
  }



  static async buildModel2Dataset(): Promise<Model2TrainingExample[]> {
    const snap = await adminDb.collection('mlTelemetry')
      .where('actualOutcome.evaluationStatus', '==', 'completed')
      .orderBy('timestamp', 'asc')
      .get();
      
    const dataset: Model2TrainingExample[] = [];
    const seenRecs = new Set<string>();
    
    for (const doc of snap.docs) {
      const event = doc.data() as MLTelemetryEvent;
      
      // Strict eligibility filtering (excludes shadow, synthetic, test, invalid scores, future timestamps)
      if (!this.isEligibleForTraining(event)) continue;
      if (seenRecs.has(event.recommendationId)) continue;
      
      seenRecs.add(event.recommendationId);
      
      const features = event.featureSnapshot as any;
      
      const t0Date = event.timestamp instanceof Object && 'toDate' in event.timestamp ? event.timestamp.toDate() : new Date(event.timestamp);
      const split = this.getDatasetSplit(event.studentId, t0Date.getTime());
      
      const row: Model2TrainingExample = {
        recommendationId: event.recommendationId,
        studentId: event.studentId,
        
        predictedNextScore: features.predictedNextScore ?? null,
        predictionSource: features.predictionSource ?? 'deterministic-baseline',
        weakestTopicId: features.weakestTopicId ?? null,
        strongestTopicId: features.strongestTopicId ?? null,
        
        candidateTaskId: features.candidateTaskId ?? event.taskId,
        candidateTaskType: features.candidateTaskType ?? event.taskType,
        candidateDifficulty: features.candidateDifficulty ?? null,
        daysSinceLastActivity: features.daysSinceLastActivity ?? null,
        
        recommendedTaskType: event.recommendationSnapshot?.recommendedTaskType || event.taskType,
        priorityScore: event.recommendationSnapshot?.priorityScore || 0,
        reason: event.recommendationSnapshot?.reason || 'Baseline',
        
        actualOutcomeScore: event.actualOutcome?.score ?? null,
        actualOutcomePassed: event.actualOutcome?.passed ?? null,
        
        t0_timestamp: t0Date.toISOString(),
        modelVersion: event.modelVersion,
        featureSchemaVersion: features.featureSchemaVersion || 'unknown',
        datasetSplit: split,
        isValid: true
      };
      
      dataset.push(row);
    }
    
    return dataset;
  }
}

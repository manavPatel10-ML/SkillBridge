export const FEATURE_SCHEMA_VERSION = "features-v1";

export type FeatureType = 'numeric' | 'categorical' | 'boolean' | 'string' | 'timestamp';

export interface FeatureDefinition {
  name: string;
  version: string;
  type: FeatureType;
  source: string;
  calculation: string;
  normalization: string;
  temporalRequirement: string;
  leakageRisk: 'none' | 'low' | 'high';
}

export interface HistoricalPerformanceFeatures {
  historicalTheoryAvg: number | null; // 0.0 - 1.0
  historicalPracticalAvg: number | null; // 0.0 - 1.0
  practiceCompletionRate: number | null; // 0.0 - 1.0
  avgAttemptsPerPractice: number | null; // >= 1.0
  totalEvaluatedActivities: number;
}

export interface RecentPerformanceFeatures {
  recentTheoryAverage: number | null; // 0.0 - 1.0, last 5 attempts
  recentPracticalAverage: number | null; // 0.0 - 1.0, last 5 attempts
  recentTheoryTrend: 'improving' | 'declining' | 'stable' | 'unknown';
  recentPracticalTrend: 'improving' | 'declining' | 'stable' | 'unknown';
}

export interface TopicPerformanceFeatures {
  topicMastery: number | null; // 0.0 - 1.0, combined score
  topicAttempts: number;
  topicSuccessRate: number | null; // 0.0 - 1.0
  topicConsistency: number | null; // Variance/StdDev based score
  masterySource: 'topic' | 'skill_fallback' | 'none';
}

export interface TaskDifficultyFeatures {
  avgDifficultyAttempted: number | null; // mapped to numeric
  highestCompletedDifficulty: number | null;
  recentDifficulty: number | null;
}

export interface ActivityRecencyFeatures {
  daysSinceLastActivity: number | null;
  daysSinceTopicActivity: number | null;
  recentActivityCount: number; // in last 7 days
}

export interface TaskContextFeatures {
  targetSkillId: string;
  targetTopicId: string | null;
  targetTaskType: string;
  targetDifficulty: number | null; // mapped from string
}

export interface PrerequisiteFeatures {
  prereqMastery: number | null; // 0.0 - 1.0, derived from prerequisite topics
  prereqCompletionCount: number;
}

export interface AdvancedMLModel1Features {
  studentId: string;
  featureSchemaVersion: string;
  isValidRecord: boolean;
  missingDataFlags: string[];

  historical: HistoricalPerformanceFeatures;
  recent: RecentPerformanceFeatures;
  topic: TopicPerformanceFeatures;
  difficulty: TaskDifficultyFeatures;
  recency: ActivityRecencyFeatures;
  context: TaskContextFeatures;
  prerequisites: PrerequisiteFeatures;
}

export interface AdvancedMLModel2Features {
  studentId: string;
  featureSchemaVersion: string;
  isValidRecord: boolean;
  missingDataFlags: string[];

  predictedNextScore: number | null; // From Model 1
  predictionSource: 'trained_ml' | 'deterministic-baseline';
  
  // Student State Context
  weakestTopicId: string | null;
  strongestTopicId: string | null;
  
  // Candidate Context
  candidateTaskId: string;
  candidateTaskType: string;
  candidateDifficulty: number | null;
  
  // Recency Context
  daysSinceLastActivity: number | null;
}

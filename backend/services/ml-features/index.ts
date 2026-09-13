import { PracticeAttempt, StudentSkillScore } from "@/types";
import { 
  FEATURE_SCHEMA_VERSION, 
  AdvancedMLModel1Features, 
  AdvancedMLModel2Features 
} from "@/types/ml-features";
import { preventDataLeakage, deduplicateAttempts } from "./temporal-extractor";
import { normalizeScore, normalizeDifficulty, calculateTrend } from "./feature-calculators";
export { normalizeDifficulty };

export class FeatureExtractionService {
  
  static extractModel1Features(
    studentId: string, 
    skillId: string, 
    skillScore: StudentSkillScore | null,
    practiceAttempts: PracticeAttempt[],
    predictionTargetTimeMs: number,
    candidateContext: {
      taskId: string;
      taskType: string;
      difficulty?: string;
      topicId?: string;
    }
  ): AdvancedMLModel1Features {
    
    const missingFlags: string[] = [];
    
    if (!skillScore) {
      missingFlags.push('NO_SKILL_SCORE');
    }
    
    // Leakage Prevention
    const validPractice = preventDataLeakage(practiceAttempts, predictionTargetTimeMs);
    const dedupedPractice = deduplicateAttempts(validPractice, 'problemId');
    
    let practiceCompletionRate: number | null = null;
    let avgAttempts: number | null = null;
    
    if (dedupedPractice.length > 0) {
      const passed = dedupedPractice.filter(p => p.passed).length;
      practiceCompletionRate = passed / dedupedPractice.length;
      
      const sumAttempts = dedupedPractice.reduce((sum, p) => sum + (p.attemptsCount || 1), 0);
      avgAttempts = sumAttempts / dedupedPractice.length;
    } else {
      missingFlags.push('NO_PRACTICE_DATA');
    }
    
    // Invalid if neither skillScore nor practice data exists (cold start)
    const isValidRecord = skillScore !== null || dedupedPractice.length > 0;
    
    // Recency calculations (simple estimation using last attempt)
    let daysSinceLastActivity: number | null = null;
    if (dedupedPractice.length > 0) {
      // Since it's sorted by time by nature or we can find max
      const maxTime = Math.max(...dedupedPractice.map(p => new Date(p.completedAt || p.createdAt).getTime()));
      daysSinceLastActivity = (predictionTargetTimeMs - maxTime) / (1000 * 60 * 60 * 24);
    }

    return {
      studentId,
      featureSchemaVersion: FEATURE_SCHEMA_VERSION,
      isValidRecord,
      missingDataFlags: missingFlags,

      historical: {
        historicalTheoryAvg: normalizeScore(skillScore?.theoryScore),
        historicalPracticalAvg: normalizeScore(skillScore?.practicalScore),
        practiceCompletionRate,
        avgAttemptsPerPractice: avgAttempts,
        totalEvaluatedActivities: dedupedPractice.length + (skillScore?.theoryAttempts || 0) + (skillScore?.practicalAttempts || 0)
      },
      recent: {
        recentTheoryAverage: null, // Placeholder for advanced extraction
        recentPracticalAverage: null,
        recentTheoryTrend: 'unknown',
        recentPracticalTrend: 'unknown'
      },
      topic: {
        topicMastery: null,
        topicAttempts: 0,
        topicSuccessRate: null,
        topicConsistency: null,
        masterySource: 'none'
      },
      difficulty: {
        avgDifficultyAttempted: null,
        highestCompletedDifficulty: null,
        recentDifficulty: null
      },
      recency: {
        daysSinceLastActivity,
        daysSinceTopicActivity: null,
        recentActivityCount: 0
      },
      context: {
        targetSkillId: skillId,
        targetTopicId: candidateContext.topicId || null,
        targetTaskType: candidateContext.taskType,
        targetDifficulty: normalizeDifficulty(candidateContext.difficulty)
      },
      prerequisites: {
        prereqMastery: null,
        prereqCompletionCount: 0
      }
    };
  }

  static extractModel2Features(
    studentId: string,
    skillId: string,
    model1Prediction: number | null,
    predictionSource: 'trained_ml' | 'deterministic-baseline',
    candidateContext: {
      taskId: string;
      taskType: string;
      difficulty?: string;
    }
  ): AdvancedMLModel2Features {
    return {
      studentId,
      featureSchemaVersion: FEATURE_SCHEMA_VERSION,
      isValidRecord: true,
      missingDataFlags: [],
      
      predictedNextScore: model1Prediction,
      predictionSource,
      
      weakestTopicId: null, // Placeholder
      strongestTopicId: null,
      
      candidateTaskId: candidateContext.taskId,
      candidateTaskType: candidateContext.taskType,
      candidateDifficulty: normalizeDifficulty(candidateContext.difficulty),
      
      daysSinceLastActivity: null
    };
  }
}

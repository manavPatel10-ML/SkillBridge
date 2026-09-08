/**
 * Phase 38: Adaptive Progressive Complexity Framework
 * Task Complexity Model & Centralized Performance Band Policies
 */

import { 
  TaskComplexityDimensions, 
  TaskDifficultyLevel, 
  TaskModalityType, 
  PerformanceBand, 
  PerformanceBandConfig 
} from "./types";

export class PerformanceBandPolicy {
  public static readonly DEFAULT_CONFIG: PerformanceBandConfig = {
    excellentThreshold: 0.90,
    strongThreshold: 0.80,
    masteryThreshold: 0.70,
    developingThreshold: 0.50
  };

  /**
   * Classifies a normalized score into a standardized Performance Band.
   * Centralized and authoritative across the entire platform.
   */
  public static classifyScore(
    score: number, 
    config: PerformanceBandConfig = this.DEFAULT_CONFIG
  ): PerformanceBand {
    const s = Math.max(0, Math.min(1, score));
    if (s >= config.excellentThreshold) return 'EXCELLENT';
    if (s >= config.strongThreshold) return 'STRONG';
    if (s >= config.masteryThreshold) return 'MASTERY';
    if (s >= config.developingThreshold) return 'DEVELOPING';
    return 'STRUGGLING';
  }
}

export interface RawTaskMetadata {
  id?: string;
  difficulty?: string;
  type?: string;
  topicId?: string;
  prerequisites?: string[];
  conceptsCount?: number;
  estimatedMinutes?: number;
  hasBoilerplate?: boolean;
  codeLines?: number;
  testCaseCount?: number;
  isProject?: boolean;
}

export class TaskComplexityModel {
  /**
   * Baseline difficulty mapping when discrete string labels are provided.
   */
  public static readonly DISCRETE_DIFFICULTY_MAP: Record<string, { level: TaskDifficultyLevel; base: number }> = {
    'beginner': { level: 'BEGINNER', base: 0.25 },
    'easy': { level: 'BEGINNER', base: 0.20 },
    'intermediate': { level: 'INTERMEDIATE', base: 0.50 },
    'medium': { level: 'INTERMEDIATE', base: 0.50 },
    'advanced': { level: 'ADVANCED', base: 0.75 },
    'hard': { level: 'ADVANCED', base: 0.80 },
    'expert': { level: 'EXPERT', base: 0.95 }
  };

  /**
   * Weights used to aggregate multi-dimensional complexity into normalized [0.0, 1.0].
   * Sums to 1.0.
   */
  public static readonly DIMENSION_WEIGHTS = {
    conceptDifficulty: 0.18,
    numberOfConcepts: 0.12,
    prerequisiteDepth: 0.12,
    reasoningDepth: 0.14,
    implementationComplexity: 0.16,
    independenceRequired: 0.10,
    timeConstraint: 0.06,
    problemSolvingDepth: 0.12
  };

  /**
   * Deterministically calculates multi-dimensional task complexity from available task metadata.
   * Does NOT alter underlying stored database objects; acts as a non-destructive normalization layer.
   */
  public static computeComplexity(
    taskType: TaskModalityType | string,
    metadata: RawTaskMetadata = {}
  ): TaskComplexityDimensions {
    const diffStr = (metadata.difficulty || 'intermediate').toLowerCase();
    const mapped = this.DISCRETE_DIFFICULTY_MAP[diffStr] || { level: 'INTERMEDIATE' as TaskDifficultyLevel, base: 0.50 };
    const base = mapped.base;

    // Prerequisite depth (0.0 to 1.0)
    const prereqCount = metadata.prerequisites?.length || 0;
    let prerequisiteDepth = Math.min(1.0, prereqCount * 0.25);

    // Number of concepts (1 to 5+ normalized)
    const conceptsCount = metadata.conceptsCount || (mapped.level === 'BEGINNER' ? 1 : mapped.level === 'INTERMEDIATE' ? 2 : 4);
    let numberOfConcepts = Math.min(1.0, conceptsCount / 5.0);

    // Time constraint factor
    const minutes = metadata.estimatedMinutes || (taskType === 'learning_topic' ? 15 : taskType === 'practical_task' ? 45 : 25);
    let timeConstraint = Math.min(1.0, minutes / 60.0);

    // Modality-specific baseline heuristics
    let conceptDifficulty = base;
    let reasoningDepth = base;
    let implementationComplexity = base;
    let independenceRequired = base;
    let problemSolvingDepth = base;

    const normalizedType = taskType.toLowerCase() as TaskModalityType;

    switch (normalizedType) {
      case 'learning_topic':
        // Theory emphasizes conceptual abstraction, minimal implementation
        conceptDifficulty = Math.min(1.0, base + 0.10);
        reasoningDepth = Math.min(1.0, base + 0.05);
        implementationComplexity = Math.max(0.10, base - 0.20);
        independenceRequired = Math.max(0.15, base - 0.15);
        problemSolvingDepth = Math.max(0.20, base - 0.10);
        break;

      case 'practice_problem':
        // Coding practice balances implementation and algorithmic problem solving
        conceptDifficulty = base;
        implementationComplexity = Math.min(1.0, base + 0.05);
        problemSolvingDepth = Math.min(1.0, base + 0.10);
        independenceRequired = base;
        break;

      case 'assessment':
      case 'assignment':
        // Evaluative tasks require high independence and reasoning under time constraints
        independenceRequired = Math.min(1.0, base + 0.20);
        reasoningDepth = Math.min(1.0, base + 0.15);
        timeConstraint = Math.min(1.0, timeConstraint + 0.15);
        break;

      case 'practical_task':
      case 'project':
        // Practical project tasks emphasize multi-concept integration, high implementation complexity, independence
        implementationComplexity = Math.min(1.0, base + 0.25);
        independenceRequired = Math.min(1.0, base + 0.20);
        numberOfConcepts = Math.min(1.0, numberOfConcepts + 0.20);
        reasoningDepth = Math.min(1.0, base + 0.10);
        break;

      default:
        break;
    }

    // Adjust if explicit code size or test cases are provided
    if (metadata.codeLines && metadata.codeLines > 100) {
      implementationComplexity = Math.min(1.0, implementationComplexity + 0.15);
    }
    if (metadata.hasBoilerplate === false) {
      independenceRequired = Math.min(1.0, independenceRequired + 0.15);
    }

    // Weighted composite normalization
    const normalizedComplexity = Number((
      conceptDifficulty * this.DIMENSION_WEIGHTS.conceptDifficulty +
      numberOfConcepts * this.DIMENSION_WEIGHTS.numberOfConcepts +
      prerequisiteDepth * this.DIMENSION_WEIGHTS.prerequisiteDepth +
      reasoningDepth * this.DIMENSION_WEIGHTS.reasoningDepth +
      implementationComplexity * this.DIMENSION_WEIGHTS.implementationComplexity +
      independenceRequired * this.DIMENSION_WEIGHTS.independenceRequired +
      timeConstraint * this.DIMENSION_WEIGHTS.timeConstraint +
      problemSolvingDepth * this.DIMENSION_WEIGHTS.problemSolvingDepth
    ).toFixed(4));

    return {
      conceptDifficulty: Number(conceptDifficulty.toFixed(3)),
      numberOfConcepts: Number(numberOfConcepts.toFixed(3)),
      prerequisiteDepth: Number(prerequisiteDepth.toFixed(3)),
      reasoningDepth: Number(reasoningDepth.toFixed(3)),
      implementationComplexity: Number(implementationComplexity.toFixed(3)),
      independenceRequired: Number(independenceRequired.toFixed(3)),
      timeConstraint: Number(timeConstraint.toFixed(3)),
      problemSolvingDepth: Number(problemSolvingDepth.toFixed(3)),
      taskDifficulty: mapped.level,
      normalizedComplexity: Math.max(0.05, Math.min(0.98, normalizedComplexity))
    };
  }
}

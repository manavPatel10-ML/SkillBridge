/**
 * Phase 38: Adaptive Progressive Complexity Framework
 * Core Types and Interfaces
 */

export type TaskDifficultyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

export type TaskModalityType = 
  | 'learning_topic' 
  | 'practice_problem' 
  | 'assessment' 
  | 'assignment' 
  | 'practical_task' 
  | 'project' 
  | 'company_challenge';

/**
 * Multi-dimensional representation of task complexity.
 * All dimensions are normalized to [0.0, 1.0].
 */
export interface TaskComplexityDimensions {
  conceptDifficulty: number;          // [0.0, 1.0]: Abstractness/depth of underlying concept
  numberOfConcepts: number;           // [0.0, 1.0]: Multi-concept integration demand
  prerequisiteDepth: number;          // [0.0, 1.0]: Depth in syllabus dependency graph
  reasoningDepth: number;             // [0.0, 1.0]: Bloom's taxonomy level (recall vs synthesis/analysis)
  implementationComplexity: number;   // [0.0, 1.0]: Code/structure size, moving parts
  independenceRequired: number;       // [0.0, 1.0]: Lack of boilerplate/hints/scaffolding
  timeConstraint: number;             // [0.0, 1.0]: Pacing/duration pressure
  problemSolvingDepth: number;        // [0.0, 1.0]: Non-obviousness/algorithmic difficulty
  taskDifficulty: TaskDifficultyLevel; // Discrete baseline
  normalizedComplexity: number;       // Composite normalized score in [0.0, 1.0]
}

/**
 * Centralized, configurable performance bands.
 */
export type PerformanceBand = 
  | 'EXCELLENT'   // 90–100%: Accelerate complexity, introduce concepts, reduce scaffolding
  | 'STRONG'      // 80–89%: Moderately increase complexity, introduce related concepts
  | 'MASTERY'     // 70–79%: Maintain or slightly increase, reinforce consistency
  | 'DEVELOPING'  // 50–69%: Maintain complexity, target weak concepts, focused practice
  | 'STRUGGLING'; // <50%: Reduce complexity, revisit prerequisites, provide remediation

export interface PerformanceBandConfig {
  excellentThreshold: number;  // Default: 0.90
  strongThreshold: number;     // Default: 0.80
  masteryThreshold: number;    // Default: 0.70
  developingThreshold: number; // Default: 0.50
}

export type TrendDirection = 'improving' | 'declining' | 'stable' | 'inconsistent';

/**
 * Unified Student Capability State across all task formats.
 */
export interface StudentAdaptiveState {
  studentId: string;
  skillId: string;
  currentComplexity: number;                  // [0.0, 1.0]
  topicMastery: Record<string, number>;       // topicId -> [0.0, 1.0]
  recentScores: number[];                     // Last N task scores (normalized to [0.0, 1.0])
  rollingAverage: number;                     // [0.0, 1.0]
  recentTrend: TrendDirection;
  scoreVariance: number;                      // Consistency indicator
  successStreak: number;                      // Consecutive scores >= 0.70
  failureStreak: number;                      // Consecutive scores < 0.50
  prerequisiteReadiness: Record<string, boolean>;
  recentTaskIds: string[];
  recentTaskTypes: TaskModalityType[];
  remediationActive: boolean;
  remediationTopicId?: string;
  confidenceScore: number;                    // [0.0, 1.0]
  lastUpdated: number;                        // Epoch timestamp
}

/**
 * Bounded progression decision produced by the state transition function.
 */
export interface ProgressionDecision {
  previousComplexity: number;
  targetComplexity: number;
  complexityDelta: number;                    // targetComplexity - previousComplexity
  performanceBand: PerformanceBand;
  scaffoldingAdjustment: 'decrease' | 'maintain' | 'increase';
  remediationRequired: boolean;
  remediationTopicId?: string;
  isStepBounded: boolean;                     // True if jump was capped to prevent shock
  reasoning: string;
  confidence: number;
}

/**
 * Evaluation payload provided after a task attempt.
 */
export interface TaskAttemptEvaluation {
  taskId: string;
  taskType: TaskModalityType;
  topicId?: string;
  score: number;                              // [0.0, 1.0]
  passed: boolean;
  attemptDurationSeconds?: number;
  attemptsCount?: number;
  completedAt: number;
}

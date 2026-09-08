export type ChallengeStatus = 'draft' | 'published' | 'closed' | 'archived';
export type MatchTier = 'strong' | 'partial' | 'none';


export interface CompanyChallenge {
  id?: string;
  companyId: string;
  title: string;
  jobRole: string;
  description: string;
  requiredSkillIds: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  applicationDeadline: string; // ISO string
  maxApplicants: number;
  status: ChallengeStatus;
  overallPassingScore: number;
  integrityMonitoringEnabled: boolean;
  theoryRequired: boolean;
  practicalRequired: boolean;
  interviewRequired: boolean;
  applicantCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface ChallengeTheoryConfiguration {
  id?: string;
  challengeId: string;
  requiredSkillIds: string[];
  questionCount: number;
  easyQuestionCount: number;
  mediumQuestionCount: number;
  hardQuestionCount: number;
  timePerQuestionSeconds: number;
  passingScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChallengePracticalTask {
  id?: string;
  challengeId: string;
  title: string;
  instructions: string;
  expectedDeliverables: string;
  durationMinutes: number;
  requirements: string[];
  submissionTypes: string[];
  evaluationCriteria: {
    criterion: string;
    weight: number;
  }[];
}

export interface ChallengeInterviewQuestion {
  id?: string;
  challengeId: string;
  question: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  expectedKeyPoints: string[];
  maximumScore: number;
  order: number;
  createdAt: string;
}

export type ChallengeApplicationStatus = 'applied' | 'in_progress' | 'completed' | 'submitted' | 'shortlisted' | 'rejected' | 'hired';
export type ChallengeStageStatus = 'not_started' | 'in_progress' | 'completed';

export interface ChallengeApplication {
  id?: string;
  challengeId: string;
  studentId: string;
  companyId: string;
  
  status: ChallengeApplicationStatus;
  
  appliedAt: string;
  startedAt?: string;
  completedAt?: string;

  theoryStatus: ChallengeStageStatus;
  practicalStatus: ChallengeStageStatus;
  interviewStatus: ChallengeStageStatus;

  theoryScore: number;
  practicalScore: number;
  interviewScore: number;
  overallScore: number;
  integrityScore: number;
  interviewFeedback?: string;

  theoryAttempt?: {
    questionIds: string[];
    answers: Record<string, string>;
    questionStartedAt: Record<string, number>;
    lockedQuestionIds: string[];
    violationCount: number;
  };
  
  practicalAttempt?: {
    startedAt?: string;
    submittedAt?: string;
    githubUrl?: string | null;
    liveUrl?: string | null;
    description?: string;
    notes?: string;
  };
  
  interviewAttempt?: {
    answers: Record<string, string>;
    submittedAt?: string;
  };
}

export interface StudentSkillScore {
  studentId: string;
  skillId: string;
  theoryScore: number | null;
  practicalScore: number | null;
  overallScore: number | null;
  theoryAttempts: number;
  practicalAttempts: number;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  highestTheoryAttemptId?: string; // To allow Firestore rules to validate the score
  highestPracticalAttemptId?: string;
  
  // Phase 15B: Real Project Evidence
  projectEvidence?: {
    taskId: string;
    taskTitle: string;
    githubUrl?: string | null;
    liveUrl?: string | null;
  };
}

export interface PracticeProblem {
  id?: string;
  skillId: string;
  title: string;
  topic: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  examples: {
    input: string;
    output: string;
    explanation?: string;
  }[];
  constraints: string[];
  expectedOutput: string;
  active: boolean;
  
  // Executable Coding Evaluation Additions
  allowedLanguages?: string[];
  timeLimitMs?: number;
  memoryLimitKb?: number;
  
  createdAt: any;
  updatedAt: any;
}

export interface TestCase {
  id?: string;
  problemId: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  order: number;
}

export interface PracticeAttempt {
  id?: string;
  studentId: string;
  problemId: string;
  skillId: string;
  status?: 'attempted' | 'completed';
  submittedCode: string;
  passed: boolean;
  attemptsCount?: number;
  
  // Executable Coding Evaluation Additions
  language?: string;
  resultStatus?: 'Accepted' | 'Wrong Answer' | 'Time Limit Exceeded' | 'Runtime Error' | 'Compilation Error' | 'Execution Error';
  passedTests?: number;
  totalTests?: number;
  executionTimeMs?: number;
  memoryUsedKb?: number;
  errorLog?: string;
  
  createdAt: any;
  completedAt?: any;
}

export interface LearningTopic {
  id?: string;
  skillId: string;
  topic: string;
  title: string;
  overview: string;
  concepts: string;
  examples: string;
  commonMistakes: string;
  active: boolean;
  order: number;
  createdAt: any;
  updatedAt: any;
}

export interface RolePath {
  id?: string;
  title: string;
  description: string;
  requiredSkillIds: string[]; // Ordered list of existing skill IDs
  active: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface RecommendedTask {
  id: string; // The UI list ID, e.g. "diag_skillId"
  recommendationId?: string; // The unique UUID generated for ML telemetry
  type: 'learning' | 'assessment' | 'practice' | 'challenge' | 'practical';
  itemId: string;
  skillId: string;
  title: string;
  description: string;
  reason: string;
  priorityScore: number;
  metadata?: any;
}

import { AdvancedMLModel1Features, AdvancedMLModel2Features } from "@/types/ml-features";

export interface MLTelemetryEvent {
  telemetryId?: string;
  recommendationId: string;
  studentId: string;
  lifecycleState: 'RECOMMENDED' | 'STARTED' | 'COMPLETED' | 'WAITING_FOR_EVALUATION' | 'SCORED' | 'OUTCOME_RECORDED' | 'ABANDONED';
  timestamp: any; // Firestore serverTimestamp or Date string
  startedAt?: any; // When the user clicks Start
  
  modelVersion: string;
  engineVersion: string;
  recommendationSource: 'baseline' | 'trained_ml' | 'manual' | 'admin';
  
  topicId: string | null;
  skillId: string;
  taskId: string;
  taskType: 'learning' | 'assessment' | 'practice' | 'challenge' | 'practical';
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'UNKNOWN';
  
  featureSnapshot: Partial<AdvancedMLModel1Features & AdvancedMLModel2Features>;
  
  predictionSnapshot: {
    predictedScore: number | null;
    predictedLevel: string | null;
    confidence: number | null;
    predictionSource: string;
  };
  
  recommendationSnapshot: {
    recommendedTaskType: string;
    priorityScore: number;
    reason: string;
  };
  
  environment?: 'development' | 'test' | 'beta' | 'production';
  isTestData?: boolean;
  isSynthetic?: boolean;
  shadow?: boolean;
  userClassification?: 'REAL_PILOT_USER' | 'TEST_USER' | 'SYNTHETIC_USER' | 'SHADOW_RECORD';
  pilotCohortId?: string;
  isPilotEligible?: boolean;
  shadowRecord?: ShadowEvaluationRecord;

  actualOutcome: {
    recordedAt: any;
    score: number | null;
    passed: boolean | null;
    attempts: number | null;
    evaluationStatus: 'completed' | 'failed' | 'aborted' | 'in_progress';
  } | null;
}

export interface PilotTaskFeedback {
  id?: string;
  recommendationId: string;
  studentId: string;
  taskId: string;
  taskType: string;
  taskUnderstandable: boolean;
  difficultyAppropriate: 'too_easy' | 'appropriate' | 'too_difficult';
  feltReadyForNextTask: boolean;
  recommendationRating: number; // 1 to 5
  comments?: string;
  createdAt: string;
}

export interface ShadowEvaluationRecord {
  studentId: string;
  recommendationId?: string;
  timestamp: string;
  modelVersion?: string;
  candidateCount?: number;
  state?: {
    theoryScore: number;
    practicalScore: number;
    recentAttemptsCount: number;
  };
  deterministicTask: {
    taskId: string;
    type: string;
    priority: number;
    reason: string;
    difficulty?: string;
    topicId?: string;
  };
  mlTask: {
    taskId: string;
    type: string;
    predictedScore: number;
    assignmentScore: number;
    reason: string;
    difficulty?: string;
    topicId?: string;
  };
  model1Prediction?: {
    predictedNextScore: number;
    modelVersion: string;
    modelStatus: string;
    predictionTimestamp: string;
    featureVersion: string;
  };
  model2Ranking?: {
    topCandidates: Array<{
      taskId: string;
      taskType: string;
      model2Prob: number;
      adaptiveScore: number;
      rank: number;
    }>;
  };
  deterministicRank?: number;
  mlRank?: number;
  agreement: boolean;
  divergence?: boolean;
  rankDifference: number;
  divergenceReason: string;
  shadow?: boolean;

  // Phase 37 Pre-Task Decision Quality Comparison
  decisionQuality?: {
    deterministicQualityScore: number;
    mlQualityScore: number;
    qualityDelta: number;
    qualityWinner: 'ML_BETTER' | 'DETERMINISTIC_BETTER' | 'APPROX_EQUAL';
    deterministicWeakTopicScore: number;
    mlWeakTopicScore: number;
    deterministicMasteryGapScore: number;
    mlMasteryGapScore: number;
    deterministicDifficultyFit: number;
    mlDifficultyFit: number;
    deterministicFreshnessScore: number;
    mlFreshnessScore: number;
    deterministicTaskType: string;
    mlTaskType: string;
    deterministicConfidence: number;
    mlConfidence: number;
  };

  // Phase 38 Progressive Complexity Tracking
  progressiveComplexity?: {
    currentComplexity: number;
    targetComplexity: number;
    complexityDelta: number;
    performanceBand: string;
    scaffoldingAdjustment: string;
    remediationRequired: boolean;
    reasoning: string;
  };
}


export type BetaFeedbackCategory = 
  | 'AUTH' 
  | 'ONBOARDING' 
  | 'LEARNING' 
  | 'PRACTICE' 
  | 'ASSESSMENT' 
  | 'PRACTICAL' 
  | 'RECOMMENDATION' 
  | 'PROFILE' 
  | 'COMPANY' 
  | 'HIRING' 
  | 'PERFORMANCE' 
  | 'SECURITY' 
  | 'OTHER';

export interface BetaFeedback {
  id?: string;
  userId: string;
  userRole: 'student' | 'company' | 'admin';
  userEmail?: string;
  category: BetaFeedbackCategory;
  issueType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedFlow: string;
  environment: string;
  timestamp: any;
  status: 'new' | 'investigating' | 'resolved' | 'wont_fix';
}

export const TYPES_VERSION = '1.0.0';

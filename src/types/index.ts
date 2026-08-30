export type ChallengeStatus = 'draft' | 'published' | 'closed' | 'archived';

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

export type ChallengeApplicationStatus = 'applied' | 'in_progress' | 'completed' | 'submitted' | 'shortlisted' | 'rejected';
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

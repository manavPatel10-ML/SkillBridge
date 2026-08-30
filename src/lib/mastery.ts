import { StudentSkillScore, PracticeAttempt } from "@/types";

export type SkillJourneyState = 'not_started' | 'learning' | 'practicing' | 'competent' | 'verified';

export interface AssessmentAttemptLike {
  assessmentId: string;
  status: string;
  percentage: number;
}

export interface MasteryEvidence {
  skillId: string;
  skillScore?: StudentSkillScore | null;
  practiceAttempts: PracticeAttempt[];
  assessmentAttempts: AssessmentAttemptLike[];
}

/**
 * Deterministically calculates a student's technical mastery state for a given skill,
 * based on existing formative and summative data.
 */
export function getSkillJourneyState(evidence: MasteryEvidence): SkillJourneyState {
  const { skillScore, practiceAttempts, assessmentAttempts } = evidence;

  // 1. VERIFIED - Official verification is authoritative
  if (skillScore?.isVerified) {
    return 'verified';
  }

  // 2. COMPETENT - Passed an assessment or solved many practice problems successfully
  const passedAssessments = assessmentAttempts.filter(
    (a) => a.status === 'completed' && a.percentage >= 70
  );
  
  if ((skillScore?.theoryScore ?? 0) >= 70 || (skillScore?.practicalScore ?? 0) > 0 || passedAssessments.length > 0) {
    return 'competent';
  }

  // Group practice attempts by problem to count unique problems
  const problemStatus = new Map<string, boolean>();
  practiceAttempts.forEach((a) => {
    // If passed once, mark as passed
    if (a.passed) problemStatus.set(a.problemId, true);
    else if (!problemStatus.has(a.problemId)) problemStatus.set(a.problemId, false);
  });

  const passedProblemIds = Array.from(problemStatus.entries())
    .filter(([_, passed]) => passed)
    .map(([id]) => id);
  
  const totalAttempted = problemStatus.size;
  const passedCount = passedProblemIds.length;
  
  if (totalAttempted === 0) {
    return 'not_started';
  }

  const successRate = passedCount / totalAttempted;

  // Still Competent if they've solved a lot of practice problems successfully (>= 10, >= 70% success)
  if (passedCount >= 10 && successRate >= 0.7) {
    return 'competent';
  }

  // 3. PRACTICING - Meaningful practice success (>= 3 problems, >= 50% success)
  if (passedCount >= 3 && successRate >= 0.5) {
    return 'practicing';
  }

  // 4. LEARNING - Has attempts but hasn't met practicing thresholds
  return 'learning';
}

export interface JourneyAction {
  label: string;
  href: string;
  type: 'primary' | 'secondary';
}

/**
 * Returns the recommended next action based on the state.
 */
export function getSkillJourneyAction(state: SkillJourneyState, skillId: string): JourneyAction {
  switch (state) {
    case 'not_started':
      return { label: 'Start Learning', href: `/dashboard/student/learn?skillId=${skillId}`, type: 'primary' };
    case 'learning':
    case 'practicing':
      return { label: 'Continue Practice', href: `/dashboard/student/practice?skillId=${skillId}`, type: 'primary' };
    case 'competent':
      return { label: 'Take Assessment', href: `/dashboard/student/skills`, type: 'primary' }; // Or direct to assessment if available
    case 'verified':
      return { label: 'Explore Roles', href: `/dashboard/student/roles`, type: 'secondary' };
    default:
      return { label: 'Start Learning', href: `/dashboard/student/learn?skillId=${skillId}`, type: 'primary' };
  }
}

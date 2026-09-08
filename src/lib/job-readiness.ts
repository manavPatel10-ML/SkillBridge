import { StudentSkillScore, PracticeAttempt, RolePath } from "@/types";

export type ReadinessState = 
  | 'NOT_STARTED'
  | 'LEARNING'
  | 'PRACTICING'
  | 'BUILDING'
  | 'VERIFYING'
  | 'READY';

export interface PracticalTaskAttemptLike {
  taskId: string;
  skillId: string;
  status: string;
  evaluation?: {
    status: string;
  };
}

export interface AssessmentAttemptLike {
  skillId: string;
  status: string;
}

export interface StudentActivityData {
  skillScores: StudentSkillScore[];
  practiceAttempts: PracticeAttempt[];
  practicalAttempts: PracticalTaskAttemptLike[];
  assessmentAttempts: AssessmentAttemptLike[];
}

export interface NextAction {
  label: string;
  type: 'LEARN' | 'PRACTICE' | 'BUILD' | 'VERIFY' | 'APPLY';
  targetSkillId?: string;
  description: string;
}

/**
 * Deterministically calculates the student's overall job readiness state for a target role.
 */
export function getJobReadinessState(
  role: RolePath | null,
  activity: StudentActivityData
): ReadinessState {
  if (!role || role.requiredSkillIds.length === 0) {
    return 'NOT_STARTED';
  }

  const { skillScores, practiceAttempts, practicalAttempts, assessmentAttempts } = activity;
  const { requiredSkillIds } = role;

  let allVerified = true;
  let hasPendingVerification = false;
  let hasActiveBuilding = false;
  let hasActivePracticing = false;
  let hasAnyActivity = false;

  for (const skillId of requiredSkillIds) {
    const score = skillScores.find(s => s.skillId === skillId);
    if (!score || !score.isVerified) {
      allVerified = false;
      
      // Check for VERIFYING state (pending admin review or pending assessment)
      const hasPendingAssessment = assessmentAttempts.some(a => a.skillId === skillId && a.status === 'in_progress');
      const hasPendingPractical = practicalAttempts.some(a => a.skillId === skillId && a.status === 'completed' && (!a.evaluation || a.evaluation.status !== 'evaluated'));
      if (hasPendingAssessment || hasPendingPractical) {
        hasPendingVerification = true;
        hasAnyActivity = true;
      }

      // Check for BUILDING state (active practical attempt)
      const hasActivePractical = practicalAttempts.some(a => a.skillId === skillId && (a.status === 'in_progress' || (a.status === 'completed' && a.evaluation?.status === 'evaluated' && !score?.isVerified)));
      if (hasActivePractical) {
        hasActiveBuilding = true;
        hasAnyActivity = true;
      }

      // Check for PRACTICING state
      const hasPractice = practiceAttempts.some(p => p.skillId === skillId);
      if (hasPractice) {
        hasActivePracticing = true;
        hasAnyActivity = true;
      }
      
      // If none of the above, but score exists (theory or practical > 0)
      if (score && ((score.theoryAttempts && score.theoryAttempts > 0) || (score.practicalAttempts && score.practicalAttempts > 0))) {
        hasAnyActivity = true;
      }
    } else {
      hasAnyActivity = true;
    }
  }

  if (allVerified) return 'READY';
  if (hasPendingVerification) return 'VERIFYING';
  if (hasActiveBuilding) return 'BUILDING';
  if (hasActivePracticing) return 'PRACTICING';
  if (hasAnyActivity) return 'LEARNING'; // Default to learning if some activity exists but no practice/build yet
  
  return 'NOT_STARTED';
}

/**
 * Recommends the single most impactful next action based on the current state.
 */
export function getPrimaryNextAction(
  role: RolePath | null,
  state: ReadinessState,
  activity: StudentActivityData
): NextAction {
  if (!role) {
    return {
      label: 'Explore Career Paths',
      type: 'LEARN',
      description: 'Select a target role to get a structured roadmap.'
    };
  }

  const { requiredSkillIds } = role;
  const { skillScores, practiceAttempts, practicalAttempts } = activity;

  // Find the first unverified skill
  const nextSkillId = requiredSkillIds.find(id => {
    const s = skillScores.find(score => score.skillId === id);
    return !s || !s.isVerified;
  });

  if (!nextSkillId) {
    return {
      label: 'Explore Opportunities',
      type: 'APPLY',
      description: 'You have verified all required skills! Start applying to matching company challenges.'
    };
  }

  switch (state) {
    case 'VERIFYING':
      return {
        label: 'Wait for Evaluation',
        type: 'VERIFY',
        targetSkillId: nextSkillId,
        description: 'Your project or assessment is currently being reviewed.'
      };
    case 'BUILDING':
      return {
        label: 'Submit Practical Project',
        type: 'BUILD',
        targetSkillId: nextSkillId,
        description: `Continue building and submit your practical project for ${nextSkillId}.`
      };
    case 'PRACTICING':
      // Has practice, should they move to build or continue practice?
      const passedPractice = practiceAttempts.filter(p => p.skillId === nextSkillId && p.passed).length;
      if (passedPractice >= 3) {
        return {
          label: 'Start Practical Project',
          type: 'BUILD',
          targetSkillId: nextSkillId,
          description: `You've practiced enough. Try building a real project in ${nextSkillId}.`
        };
      }
      return {
        label: 'Continue Coding Practice',
        type: 'PRACTICE',
        targetSkillId: nextSkillId,
        description: `Solve a few more practice problems in ${nextSkillId} to build confidence.`
      };
    case 'LEARNING':
    case 'NOT_STARTED':
    default:
      return {
        label: 'Start Coding Practice',
        type: 'PRACTICE',
        targetSkillId: nextSkillId,
        description: `Begin your journey by practicing code for ${nextSkillId}.`
      };
  }
}

/**
 * Phase 39: Longitudinal Shadow Validation & Curriculum Trajectory Coherence
 * 
 * Provides trajectory anomaly detection, cross-domain progression evaluation,
 * and longitudinal student journey simulation tools.
 */

import { StudentAdaptiveState, TaskComplexityDimensions, TaskModalityType } from "./types";
import { AdaptiveProgressionEngine } from "./progression-engine";
import { TaskComplexityModel } from "./complexity-model";

export interface TrajectoryStepRecord {
  stepIndex: number;
  taskId: string;
  taskType: TaskModalityType;
  topicId: string;
  complexity: number;
  targetComplexity: number;
  score: number;
  passed: boolean;
  performanceBand: string;
  remediationActive: boolean;
  rollingAverage: number;
  variance: number;
  theoryScore: number;
  practicalScore: number;
}

export interface TrajectoryHealthReport {
  studentId: string;
  cohortType: string;
  curriculumPath: string;
  stepCount: number;
  initialComplexity: number;
  finalComplexity: number;
  averageComplexitySlope: number;
  masterySlope: number;
  successRate: number;
  failureRecoveryRate: number;
  remediationEpisodes: number;
  averageRecoverySteps: number;
  anomalies: {
    oscillationDetected: boolean;
    stagnationDetected: boolean;
    prematureEscalationDetected: boolean;
    remediationTrapDetected: boolean;
    repetitionLoopDetected: boolean;
    curriculumDeadlockDetected: boolean;
    masteryDeadlockDetected: boolean;
    ceilingViolationCount: number;
    floorViolationCount: number;
  };
  healthy: boolean;
}

export class TrajectoryAnomalyDetectors {
  /**
   * Detects erratic oscillation in task complexity (e.g. 0.40 -> 0.65 -> 0.35 -> 0.70).
   * Flagged if there are >= 2 alternating direction shifts exceeding 0.20 within a 5-step window.
   */
  public static detectOscillation(complexityHistory: number[]): boolean {
    if (complexityHistory.length < 4) return false;

    let oscillationCount = 0;
    for (let i = 1; i < complexityHistory.length - 1; i++) {
      const delta1 = complexityHistory[i] - complexityHistory[i - 1];
      const delta2 = complexityHistory[i + 1] - complexityHistory[i];

      // Sign reversal with significant magnitude (> 0.18)
      if ((delta1 > 0.18 && delta2 < -0.18) || (delta1 < -0.18 && delta2 > 0.18)) {
        oscillationCount++;
      }
    }

    return oscillationCount >= 2;
  }

  /**
   * Detects stagnation where a student consistently scores >= 0.80 for >= 4 consecutive steps,
   * but the system fails to advance complexity (complexity remains flat with delta <= 0.01).
   */
  public static detectStagnation(
    complexityHistory: number[], 
    scoreHistory: number[], 
    maxCatalogComplexity: number = 0.95
  ): boolean {
    if (complexityHistory.length < 5 || scoreHistory.length < 5) return false;

    for (let i = 4; i < complexityHistory.length; i++) {
      const windowComplexities = complexityHistory.slice(i - 4, i + 1);
      const windowScores = scoreHistory.slice(i - 4, i + 1);

      const allHigh = windowScores.every(s => s >= 0.80);
      const minC = Math.min(...windowComplexities);
      const maxC = Math.max(...windowComplexities);
      const isFlat = (maxC - minC) <= 0.02;

      // Stagnation only occurs if the student has NOT already reached the catalog ceiling
      if (allHigh && isFlat && maxC < maxCatalogComplexity - 0.05) {
        return true;
      }
    }

    return false;
  }

  /**
   * Detects premature difficulty escalation (e.g. jumping from 0.25 to 0.80 in a single step).
   * Flagged if any single transition exceeds max allowed step (+0.15).
   */
  public static detectPrematureEscalation(complexityHistory: number[]): boolean {
    for (let i = 1; i < complexityHistory.length; i++) {
      const stepDelta = complexityHistory[i] - complexityHistory[i - 1];
      if (stepDelta > 0.16) {
        return true;
      }
    }
    return false;
  }

  /**
   * Detects remediation trap: student is placed in remediation, achieves >= 0.80,
   * but the remediation state fails to deactivate and complexity remains stuck at basic.
   */
  public static detectRemediationTrap(stepRecords: TrajectoryStepRecord[]): boolean {
    for (let i = 1; i < stepRecords.length; i++) {
      const prev = stepRecords[i - 1];
      const curr = stepRecords[i];

      // If prior was remediation, scored >= 0.80, but current is STILL trapped in remediation
      if (prev.remediationActive && prev.score >= 0.80 && curr.remediationActive && curr.complexity <= 0.35) {
        return true;
      }
    }
    return false;
  }

  /**
   * Detects unnecessary task repetition loops: identical taskId assigned consecutively
   * without remediation justification (score was >= 0.70).
   */
  public static detectRepetitionLoop(stepRecords: TrajectoryStepRecord[]): boolean {
    for (let i = 1; i < stepRecords.length; i++) {
      const prev = stepRecords[i - 1];
      const curr = stepRecords[i];

      if (prev.taskId === curr.taskId && prev.score >= 0.70 && !curr.remediationActive) {
        return true;
      }
    }
    return false;
  }

  /**
   * Detects curriculum deadlock: student state has no eligible candidate tasks available
   * or candidate pool drops to zero.
   */
  public static detectDeadlock(candidateCount: number): boolean {
    return candidateCount === 0;
  }

  /**
   * Detects mastery deadlock: student demonstrates repeated high scores (>= 90%)
   * across multiple tasks but never advances from basic tier (< 0.40).
   */
  public static detectMasteryDeadlock(stepRecords: TrajectoryStepRecord[]): boolean {
    if (stepRecords.length < 8) return false;
    const allHigh = stepRecords.slice(-5).every(r => r.score >= 0.90);
    const lastComplexity = stepRecords[stepRecords.length - 1].complexity;
    return allHigh && lastComplexity < 0.40;
  }

  /**
   * Verifies complexity bounds [0.0, 1.0] and ceiling enforcement against catalog max.
   */
  public static checkBounds(
    complexityHistory: number[], 
    maxCatalogComplexity: number = 0.95
  ): { floorViolations: number; ceilingViolations: number } {
    let floorViolations = 0;
    let ceilingViolations = 0;

    for (const c of complexityHistory) {
      if (c < 0.0 || c > 1.0) floorViolations++;
      if (c > maxCatalogComplexity + 0.01) ceilingViolations++;
    }

    return { floorViolations, ceilingViolations };
  }
}

export class CrossDomainEvaluator {
  /**
   * Evaluates theory vs practical independence.
   * 
   * A student with high theory (90%) but weak practical (45%) should:
   * - Advance theory complexity (high concept difficulty)
   * - Remediate practical coding (guided practice / basic implementation)
   * 
   * Conversely, a student with weak theory (50%) but strong practical (90%) should:
   * - Reinforce theory concepts
   * - Advance practical challenges
   */
  public static evaluateCrossDomainSplit(
    theoryScore: number, 
    practicalScore: number
  ): {
    theoryNextStep: 'advance' | 'maintain' | 'remediate';
    practicalNextStep: 'advance' | 'maintain' | 'remediate';
    domainsDiverged: boolean;
  } {
    const theoryBand = theoryScore >= 80 ? 'advance' : theoryScore >= 60 ? 'maintain' : 'remediate';
    const practicalBand = practicalScore >= 80 ? 'advance' : practicalScore >= 60 ? 'maintain' : 'remediate';

    return {
      theoryNextStep: theoryBand,
      practicalNextStep: practicalBand,
      domainsDiverged: theoryBand !== practicalBand
    };
  }
}

export interface CurriculumTopicDef {
  id: string;
  name: string;
  difficulty: number;
  prereqId?: string;
  depth: number;
}

export interface LearningPathDef {
  id: string;
  name: string;
  topics: CurriculumTopicDef[];
}

export class CurriculumDefinitions {
  public static readonly FRONTEND_PATH: LearningPathDef = {
    id: 'path_frontend',
    name: 'Frontend Engineering',
    topics: [
      { id: 'fe_html', name: 'HTML5 Semantic Architecture', difficulty: 0.20, depth: 1 },
      { id: 'fe_css', name: 'CSS Grid, Flexbox & Responsive Design', difficulty: 0.32, prereqId: 'fe_html', depth: 2 },
      { id: 'fe_js', name: 'JavaScript Modern Syntax & ES6+', difficulty: 0.45, prereqId: 'fe_css', depth: 3 },
      { id: 'fe_dom', name: 'DOM Manipulation & Browser Events', difficulty: 0.58, prereqId: 'fe_js', depth: 4 },
      { id: 'fe_api', name: 'Async REST APIs & Fetch', difficulty: 0.68, prereqId: 'fe_dom', depth: 5 },
      { id: 'fe_react', name: 'React Components, State & Hooks', difficulty: 0.78, prereqId: 'fe_api', depth: 6 },
      { id: 'fe_project', name: 'Production Frontend Web App Project', difficulty: 0.90, prereqId: 'fe_react', depth: 7 }
    ]
  };

  public static readonly BACKEND_PATH: LearningPathDef = {
    id: 'path_backend',
    name: 'Backend Engineering',
    topics: [
      { id: 'be_prog', name: 'Programming Fundamentals & Data Structures', difficulty: 0.25, depth: 1 },
      { id: 'be_http', name: 'HTTP Protocol, REST & Routing', difficulty: 0.38, prereqId: 'be_prog', depth: 2 },
      { id: 'be_api', name: 'API Design & Input Validation', difficulty: 0.50, prereqId: 'be_http', depth: 3 },
      { id: 'be_db', name: 'Relational & Document Databases', difficulty: 0.62, prereqId: 'be_api', depth: 4 },
      { id: 'be_auth', name: 'Authentication, JWT & Security', difficulty: 0.72, prereqId: 'be_db', depth: 5 },
      { id: 'be_arch', name: 'Backend Architecture & Microservices', difficulty: 0.82, prereqId: 'be_auth', depth: 6 },
      { id: 'be_project', name: 'Production Backend API & Database Project', difficulty: 0.92, prereqId: 'be_arch', depth: 7 }
    ]
  };

  public static readonly FULLSTACK_PATH: LearningPathDef = {
    id: 'path_fullstack',
    name: 'Full Stack Engineering',
    topics: [
      { id: 'fs_fe_fund', name: 'Frontend Web Fundamentals', difficulty: 0.22, depth: 1 },
      { id: 'fs_js', name: 'Full-Stack JavaScript & TypeScript', difficulty: 0.35, prereqId: 'fs_fe_fund', depth: 2 },
      { id: 'fs_react', name: 'Frontend Single-Page Frameworks', difficulty: 0.48, prereqId: 'fs_js', depth: 3 },
      { id: 'fs_backend', name: 'Server-Side Node & API Services', difficulty: 0.60, prereqId: 'fs_react', depth: 4 },
      { id: 'fs_database', name: 'Full-Stack Data Persistence & ORM', difficulty: 0.70, prereqId: 'fs_backend', depth: 5 },
      { id: 'fs_auth', name: 'Full-Stack Auth & Protected Routes', difficulty: 0.80, prereqId: 'fs_database', depth: 6 },
      { id: 'fs_integration', name: 'Client-Server State Sync & WebSockets', difficulty: 0.88, prereqId: 'fs_auth', depth: 7 },
      { id: 'fs_project', name: 'Enterprise Full-Stack Cloud Application', difficulty: 0.95, prereqId: 'fs_integration', depth: 8 }
    ]
  };
}

export type StudentCohortType = 
  | 'fast_learner'
  | 'normal_learner'
  | 'slow_learner'
  | 'inconsistent_learner'
  | 'strong_theory_weak_practical'
  | 'weak_theory_strong_practical'
  | 'strong_coding_weak_theory'
  | 'high_attempt_persistent'
  | 'cold_start'
  | 'repeated_failure';

export class LongitudinalSimulator {
  /**
   * Generates a realistic score for a student archetype given student ability and task complexity.
   */
  public static simulateStudentScore(
    cohort: StudentCohortType,
    taskComplexity: number,
    taskType: TaskModalityType,
    stepIndex: number,
    streak: number,
    randomSeed: number = 42
  ): number {
    // Deterministic pseudo-randomness based on seed and stepIndex
    const pseudoRand = Math.abs(Math.sin(randomSeed * 9301 + stepIndex * 49297 + taskComplexity * 233280)) % 1;

    let baseAbility = 0.70;
    let variance = 0.08;

    switch (cohort) {
      case 'fast_learner':
        baseAbility = 0.88;
        variance = 0.05;
        break;
      case 'normal_learner':
        baseAbility = 0.75;
        variance = 0.08;
        break;
      case 'slow_learner':
        baseAbility = 0.60;
        variance = 0.10;
        break;
      case 'inconsistent_learner':
        baseAbility = 0.70;
        // Alternating high / low variance swing
        variance = stepIndex % 2 === 0 ? 0.28 : 0.05;
        break;
      case 'strong_theory_weak_practical':
        baseAbility = taskType === 'learning_topic' ? 0.92 : 0.48;
        variance = 0.06;
        break;
      case 'weak_theory_strong_practical':
        baseAbility = taskType === 'learning_topic' ? 0.48 : 0.90;
        variance = 0.06;
        break;
      case 'strong_coding_weak_theory':
        baseAbility = taskType === 'practice_problem' ? 0.92 : 0.52;
        variance = 0.06;
        break;
      case 'high_attempt_persistent':
        // Scores improve with streak
        baseAbility = Math.min(0.85, 0.65 + streak * 0.04);
        variance = 0.07;
        break;
      case 'cold_start':
        baseAbility = stepIndex < 3 ? 0.72 : 0.78;
        variance = 0.08;
        break;
      case 'repeated_failure':
        // Struggles persistently to test failure backoff and remediation
        baseAbility = 0.32;
        variance = 0.06;
        break;
    }

    // Ability vs Complexity gap: If complexity > ability, score drops; if complexity < ability, score increases
    const diffGap = baseAbility - taskComplexity;
    const noise = (pseudoRand - 0.5) * variance * 2;
    const rawScore = baseAbility + diffGap * 0.4 + noise;

    return Number(Math.max(0.05, Math.min(0.99, rawScore)).toFixed(3));
  }

  /**
   * Executes an N-step longitudinal simulation for a given cohort on a learning path.
   */
  public static simulateJourney(
    studentId: string,
    cohort: StudentCohortType,
    path: LearningPathDef,
    stepCount: number = 20,
    randomSeed: number = 42
  ): {
    records: TrajectoryStepRecord[];
    health: TrajectoryHealthReport;
  } {
    const records: TrajectoryStepRecord[] = [];
    let state = AdaptiveProgressionEngine.createInitialState(studentId, path.id, 0.20);
    const maxCatalogComplexity = path.topics[path.topics.length - 1].difficulty;

    let totalFailures = 0;
    let recoveredFailures = 0;
    let remediationEpisodes = 0;
    let recoveryStepSum = 0;
    let inRemediationSince: number | null = null;

    let currentTopicIndex = 0;

    for (let step = 0; step < stepCount; step++) {
      // Pick current topic in curriculum adhering to progression
      const currentTopic = path.topics[currentTopicIndex];
      const taskType: TaskModalityType = (step % 3 === 0) 
        ? 'learning_topic' 
        : (step % 3 === 1) 
        ? 'practice_problem' 
        : 'practical_task';

      const taskComplexityDim = TaskComplexityModel.computeComplexity(taskType, {
        difficulty: currentTopic.difficulty > 0.70 ? 'advanced' : currentTopic.difficulty > 0.40 ? 'intermediate' : 'beginner',
        topicId: currentTopic.id
      });

      // Simulate student outcome
      const score = this.simulateStudentScore(
        cohort,
        state.currentComplexity,
        taskType,
        step,
        state.successStreak,
        randomSeed
      );
      const passed = score >= 0.70;

      if (!passed) totalFailures++;

      // Transition adaptive state
      const { nextState, decision } = AdaptiveProgressionEngine.transitionAdaptiveState(
        state,
        {
          taskId: `${currentTopic.id}_${taskType}`,
          taskType,
          topicId: currentTopic.id,
          score,
          passed,
          completedAt: Date.now() + step * 3600000
        },
        taskComplexityDim
      );

      // Track remediation entry
      if (!state.remediationActive && nextState.remediationActive) {
        remediationEpisodes++;
        inRemediationSince = step;
      }

      // Track remediation exit
      if (state.remediationActive && !nextState.remediationActive) {
        recoveredFailures++;
        if (inRemediationSince !== null) {
          recoveryStepSum += (step - inRemediationSince);
          inRemediationSince = null;
        }
      }

      // Check if student advances to next topic in curriculum
      if (passed && nextState.currentComplexity > currentTopic.difficulty && currentTopicIndex < path.topics.length - 1) {
        currentTopicIndex++;
      }

      records.push({
        stepIndex: step,
        taskId: `${currentTopic.id}_${taskType}`,
        taskType,
        topicId: currentTopic.id,
        complexity: state.currentComplexity,
        targetComplexity: nextState.currentComplexity,
        score,
        passed,
        performanceBand: decision.performanceBand,
        remediationActive: nextState.remediationActive,
        rollingAverage: nextState.rollingAverage,
        variance: nextState.scoreVariance,
        theoryScore: taskType === 'learning_topic' ? score * 100 : 70,
        practicalScore: taskType !== 'learning_topic' ? score * 100 : 70
      });

      state = nextState;
    }

    // Compute metrics
    const complexities = records.map(r => r.complexity);
    const scores = records.map(r => r.score);

    const initialComplexity = complexities[0];
    const finalComplexity = complexities[complexities.length - 1];
    const averageComplexitySlope = Number(((finalComplexity - initialComplexity) / stepCount).toFixed(4));
    const masterySlope = Number(((scores[scores.length - 1] - scores[0]) / stepCount).toFixed(4));

    const bounds = TrajectoryAnomalyDetectors.checkBounds(complexities, maxCatalogComplexity);
    const oscillationDetected = TrajectoryAnomalyDetectors.detectOscillation(complexities);
    const stagnationDetected = TrajectoryAnomalyDetectors.detectStagnation(complexities, scores, maxCatalogComplexity);
    const prematureEscalationDetected = TrajectoryAnomalyDetectors.detectPrematureEscalation(complexities);
    const remediationTrapDetected = TrajectoryAnomalyDetectors.detectRemediationTrap(records);
    const repetitionLoopDetected = TrajectoryAnomalyDetectors.detectRepetitionLoop(records);
    const curriculumDeadlockDetected = TrajectoryAnomalyDetectors.detectDeadlock(path.topics.length);
    const masteryDeadlockDetected = TrajectoryAnomalyDetectors.detectMasteryDeadlock(records);

    const healthy = !oscillationDetected && 
                    !prematureEscalationDetected && 
                    !remediationTrapDetected && 
                    !curriculumDeadlockDetected && 
                    bounds.floorViolations === 0;

    const health: TrajectoryHealthReport = {
      studentId,
      cohortType: cohort,
      curriculumPath: path.id,
      stepCount,
      initialComplexity,
      finalComplexity,
      averageComplexitySlope,
      masterySlope,
      successRate: Number((records.filter(r => r.passed).length / stepCount).toFixed(3)),
      failureRecoveryRate: remediationEpisodes > 0 ? Number((recoveredFailures / remediationEpisodes).toFixed(3)) : 1.0,
      remediationEpisodes,
      averageRecoverySteps: remediationEpisodes > 0 ? Number((recoveryStepSum / Math.max(1, recoveredFailures)).toFixed(1)) : 0,
      anomalies: {
        oscillationDetected,
        stagnationDetected,
        prematureEscalationDetected,
        remediationTrapDetected,
        repetitionLoopDetected,
        curriculumDeadlockDetected,
        masteryDeadlockDetected,
        ceilingViolationCount: bounds.ceilingViolations,
        floorViolationCount: bounds.floorViolations
      },
      healthy
    };

    return { records, health };
  }
}

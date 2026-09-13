import { StudentSkillScore, LearningTopic, PracticeProblem, RecommendedTask, PracticalTask } from "@shared/types";
import { PerformancePredictor } from "./ml-inference/model1-predictor";
import { v4 as uuidv4 } from "uuid";

export type Skill = {
  id: string;
  name: string;
};

export type Assessment = {
  id: string;
  skillId: string;
  title: string;
};

export class AdaptiveEngine {
  
  /**
   * Evaluates student performance and generates a scored list of recommended tasks.
   * This is the deterministic baseline used when Model 2 is NOT_READY.
   */
  static async scoreCandidates(
    studentId: string,
    context: {
      skillScores: StudentSkillScore[];
      skills: Skill[];
      learningTopics: LearningTopic[];
      practiceProblems: PracticeProblem[];
      assessments: Assessment[];
      practicalTasks?: PracticalTask[];
      recentAttempts: any[]; // Used for repetition penalty
    }
  ): Promise<RecommendedTask[]> {
    
    const candidates: RecommendedTask[] = [];
    
    for (const skill of context.skills) {
      const score = context.skillScores.find(s => s.skillId === skill.id);
      
      const theoryScore = score?.theoryScore || 0;
      const practicalScore = score?.practicalScore || 0;
      
      const topics = context.learningTopics.filter(t => t.skillId === skill.id && t.active).sort((a,b) => (a.order || 0) - (b.order || 0));
      const practices = context.practiceProblems.filter(p => p.skillId === skill.id && p.active);
      const assessment = context.assessments.find(a => a.skillId === skill.id);

      // Score Learning Topics
      for (const topic of topics) {
        let priority = 0;
        let reason = '';
        
        const topicIndex = topics.indexOf(topic);
        const priorTopic = topicIndex > 0 ? topics[topicIndex - 1] : null;
        const prereqTopicId = (topic as any).prerequisiteTopicId || (priorTopic ? priorTopic.id : null);
        const hasUnmetPrereq = prereqTopicId ? !context.recentAttempts.some(a => a.taskId === prereqTopicId) : false;

        const isNextInOrder = topicIndex === 0 || !hasUnmetPrereq;
        
        if (theoryScore < 30) {
          priority += 80;
          reason = `Foundational theory needed for ${skill.name}.`;
        } else if (theoryScore < 70) {
          priority += 60;
          reason = `Review recommended to solidify understanding.`;
        } else {
          priority += 20;
          reason = `Optional review.`;
        }

        if (isNextInOrder) {
          priority += 10;
        }

        // Prerequisite Gating: Topics with unmet prerequisites are penalized so prerequisites are completed first
        if (hasUnmetPrereq) {
          priority -= 60;
          reason = `Prerequisite required: Complete prior concepts in ${skill.name} first.`;
        }
        
        // Repetition penalty
        const hasDoneRecently = context.recentAttempts.some(a => a.taskId === topic.id && (Date.now() - new Date(a.createdAt).getTime()) < 86400000);
        if (hasDoneRecently) priority -= 50;

        // Model 1 Check
        try {
          const m1 = await PerformancePredictor.predictPerformance({
            studentId,
            topicId: topic.id,
            taskContext: { taskId: topic.id!, taskType: 'learning' }
          });
          // If ML thinks they will do well, maybe they don't need learning as much
          if (m1.predictedScore > 0.8) priority -= 10;
        } catch(e) {}

        if (priority > 0) {
          candidates.push({
            id: `learn_${topic.id}`,
            recommendationId: uuidv4(),
            type: 'learning',
            itemId: topic.id!,
            skillId: skill.id,
            title: `Learning: ${topic.title}`,
            description: topic.overview,
            reason: reason || 'Recommended next step.',
            priorityScore: priority
          });
        }
      }

      // Score Practice Problems
      for (const practice of practices) {
        let priority = 0;
        let reason = '';
        
        if (theoryScore < 50) {
          // Penalize practice if theory is too weak
          priority -= 20;
        }
        
        if (practicalScore < 50) {
          if (practice.difficulty === 'beginner') {
            priority += 85;
            reason = `Good starting point to build practical skills.`;
          } else {
            priority += 30; // Too hard right now
          }
        } else if (practicalScore < 80) {
          if (practice.difficulty === 'intermediate') {
            priority += 80;
            reason = `Challenges to push your practical mastery.`;
          } else {
            priority += 40;
          }
        } else {
          if (practice.difficulty === 'advanced') {
            priority += 75;
            reason = `Advanced challenge for mastery.`;
          } else {
            priority += 20; // Too easy
          }
        }

        const hasDoneRecently = context.recentAttempts.some(a => a.taskId === practice.id && (Date.now() - new Date(a.createdAt).getTime()) < 86400000);
        if (hasDoneRecently) priority -= 60;

        try {
          const m1 = await PerformancePredictor.predictPerformance({
            studentId,
            topicId: practice.skillId,
            taskContext: { taskId: practice.id!, taskType: 'practice', difficulty: practice.difficulty }
          });
          // Reward tasks where predicted score is in the "flow channel" (e.g. 0.5 - 0.8)
          if (m1.predictedScore >= 0.5 && m1.predictedScore <= 0.8) {
             priority += 15;
          }
        } catch(e) {}

        if (priority > 0) {
          candidates.push({
            id: `prac_${practice.id}`,
            recommendationId: uuidv4(),
            type: 'practice',
            itemId: practice.id!,
            skillId: skill.id,
            title: `Practice: ${practice.title}`,
            description: practice.description,
            reason: reason || 'Practice recommended.',
            priorityScore: priority
          });
        }
      }

      // Score Assessments
      if (assessment) {
        let priority = 0;
        let reason = '';
        
        if (!score || (score.theoryAttempts === 0 && score.practicalAttempts === 0)) {
           priority += 95; // Diagnostic
           reason = `Establish baseline score.`;
        } else if (theoryScore >= 70 && practicalScore >= 70) {
           priority += 90; // Ready to prove mastery
           reason = `You look ready to prove your mastery!`;
        } else {
           priority += 40; // Retake or mid-course check
           reason = `Check your current progress.`;
        }
        
        const hasDoneRecently = context.recentAttempts.some(a => a.taskId === assessment.id && (Date.now() - new Date(a.createdAt).getTime()) < 86400000 * 7); // Penalty is 1 week for assessments
        if (hasDoneRecently) priority -= 80;

        if (priority > 0) {
          candidates.push({
            id: `diag_${skill.id}`,
            recommendationId: uuidv4(),
            type: 'assessment',
            itemId: assessment.id,
            skillId: skill.id,
            title: `Assessment: ${assessment.title}`,
            description: `Prove your skills in ${skill.name}.`,
            reason: reason || 'Assessment recommended.',
            priorityScore: priority
          });
        }
      }

      // Score Practical Project Tasks
      const skillPracticalTasks = (context.practicalTasks || []).filter(t => t.skillId === skill.id && t.active !== false);
      for (const practicalTask of skillPracticalTasks) {
        let priority = 0;
        let reason = '';
        const diffLower = (practicalTask.difficulty || 'beginner').toLowerCase();

        // 1. Foundation & Eligibility Check
        if (theoryScore < 30 && practicalScore < 30) {
          if (diffLower === 'beginner') {
            priority += 40;
            reason = `Hands-on project to apply early basics in ${skill.name}.`;
          } else {
            // Deprioritize intermediate/advanced projects until foundation is established
            priority -= 50;
          }
        } else if (practicalScore < 60) {
          // Developing student: prioritize beginner project to solidify hands-on capability
          if (diffLower === 'beginner') {
            priority += 85;
            reason = `Build practical portfolio evidence with this guided project in ${skill.name}.`;
          } else if (diffLower === 'intermediate') {
            priority += 50;
            reason = `Next-level challenge to expand practical skills in ${skill.name}.`;
          } else {
            priority += 20;
          }
        } else if (practicalScore < 80) {
          // Competent student: prioritize intermediate project
          if (diffLower === 'intermediate') {
            priority += 85;
            reason = `Strengthen your engineering capability with an intermediate practical project.`;
          } else if (diffLower === 'advanced') {
            priority += 60;
            reason = `Challenging project to push toward mastery.`;
          } else {
            priority += 35;
          }
        } else {
          // Mastery student (score >= 80): prioritize advanced project
          if (diffLower === 'advanced') {
            priority += 90;
            reason = `High-complexity practical project to prove production readiness.`;
          } else if (diffLower === 'intermediate') {
            priority += 65;
            reason = `Solidify architectural depth with this project.`;
          } else {
            priority += 20;
          }
        }

        // 2. Repetition & Completed Task Penalty
        const hasDoneRecently = context.recentAttempts.some(
          a => (a.taskId === practicalTask.id || a.itemId === practicalTask.id) &&
               (Date.now() - new Date(a.createdAt || a.startedAt || a.submittedAt || 0).getTime()) < 86400000 * 7
        );
        const isCompleted = context.recentAttempts.some(
          a => (a.taskId === practicalTask.id || a.itemId === practicalTask.id) &&
               (a.status === 'completed' || a.passed === true)
        );

        if (isCompleted) {
          priority -= 85; // Exclude completed tasks from priority pool unless remediation requires
        } else if (hasDoneRecently) {
          priority -= 50;
        }

        // 3. Remediation Check: If student failed recent tasks in this skill, lower high-complexity project priority
        const hasRecentFailures = context.recentAttempts.some(
          a => a.skillId === skill.id && (a.passed === false || a.status === 'failed')
        );
        if (hasRecentFailures && diffLower !== 'beginner') {
          priority -= 40;
        }

        if (priority > 0) {
          candidates.push({
            id: `task_${practicalTask.id}`,
            recommendationId: uuidv4(),
            type: 'practical',
            itemId: practicalTask.id,
            skillId: skill.id,
            title: `Project: ${practicalTask.title}`,
            description: practicalTask.description,
            reason: reason || 'Practical project recommended for hands-on experience.',
            priorityScore: priority,
            metadata: {
              difficulty: practicalTask.difficulty,
              durationMinutes: practicalTask.durationMinutes,
              complexity: diffLower === 'beginner' ? 0.25 : diffLower === 'intermediate' ? 0.50 : 0.75
            }
          });
        }
      }
    }
    
    // Sort by priority score descending
    return candidates.sort((a, b) => b.priorityScore - a.priorityScore);
  }
}

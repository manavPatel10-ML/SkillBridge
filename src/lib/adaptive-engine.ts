import { StudentSkillScore, LearningTopic, PracticeProblem, RecommendedTask } from "@/types";
import { PerformancePredictor } from "./ml-inference/model1-predictor";

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
            recommendationId: crypto.randomUUID(),
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
            recommendationId: crypto.randomUUID(),
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
            recommendationId: crypto.randomUUID(),
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
    }
    
    // Sort by priority score descending
    return candidates.sort((a, b) => b.priorityScore - a.priorityScore);
  }
}

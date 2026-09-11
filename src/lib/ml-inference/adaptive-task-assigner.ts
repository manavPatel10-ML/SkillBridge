import { StudentSkillScore, LearningTopic, PracticeProblem, RecommendedTask, PracticalTask } from "@/types";
import { PerformancePredictor } from "./model1-predictor";
import { TelemetryService } from "../ml-telemetry";
import { AdaptiveEngine, Assessment, Skill } from "../adaptive-engine";
import * as fs from 'fs';
import * as path from 'path';

export interface AssignNextTaskContext {
  skillScores: StudentSkillScore[];
  skills: Skill[];
  learningTopics: LearningTopic[];
  practiceProblems: PracticeProblem[];
  assessments: Assessment[];
  practicalTasks?: PracticalTask[];
  recentAttempts: any[]; // For repetition penalty
}

export class AdaptiveTaskAssigner {
  private static getModel2MetadataPath(): string {
    return path.join(process.cwd(), 'ml', 'model2', 'artifacts', 'metadata.json');
  }

  static async assignNextTask(
    studentId: string,
    context: AssignNextTaskContext
  ): Promise<RecommendedTask[]> {
    
    // 1. Check Model 2 Readiness
    let isModel2Ready = false;
    let model2Version = 'deterministic-baseline';
    
    try {
      const metaPath = this.getModel2MetadataPath();
      if (fs.existsSync(metaPath)) {
        const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        if (metadata.status === 'VALIDATED' || metadata.status === 'PRODUCTION') {
          isModel2Ready = true;
          model2Version = metadata.modelVersion;
        }
      }
    } catch (e) {
      console.warn("Could not read Model 2 metadata. Defaulting to baseline.");
    }
    
    // 2. Generate Candidate Pool and Score (Using Deterministic Baseline or ML)
    let recommendations: RecommendedTask[] = [];
    
    if (isModel2Ready) {
      // Future: use ML model to score all candidates
      // recommendations = await Model2Predictor.scoreAll(studentId, context);
      console.log(`Using ML Model 2 (${model2Version}) for assignment.`);
    } else {
      // Deterministic Baseline Fallback
      console.log(`Model 2 NOT_READY. Using Deterministic Baseline for assignment.`);
      recommendations = await AdaptiveEngine.scoreCandidates(studentId, context);
    }
    
    // 3. Return the sorted recommendations.
    // The UI is expected to present the top N tasks.
    // The actual telemetry of "TASK STARTED" will happen when the student clicks it,
    // which is handled by existing TelemetryService.recordRecommendation via an API route.
    
    return recommendations;
  }
}

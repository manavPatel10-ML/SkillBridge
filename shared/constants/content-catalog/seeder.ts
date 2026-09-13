/**
 * seeder.ts
 * Deterministic and Idempotent Seeder for the SkillBridge Content Catalog.
 * 
 * SECURITY & DATA GOVERNANCE CONTRACT:
 *  - Deterministic document IDs: rerun safe, never creates duplicate records.
 *  - Uses setDoc with merge: true to avoid overwriting unrelated fields.
 *  - ZERO fake users, ZERO fake students, ZERO fake companies.
 *  - ZERO fake telemetry, ZERO fake attempts, ZERO fake skill scores.
 *  - Chunks writes into batches <= 400 operations to respect Firestore's 500-limit.
 */

import {
  Firestore,
  writeBatch,
  doc,
  serverTimestamp,
  collection,
  getDocs,
  deleteDoc
} from "firebase/firestore";
import { CATALOG_SKILLS } from "./skills";
import { CATALOG_ROLES } from "./roles";
import { CATALOG_LEARNING_TOPICS } from "./learning-topics";
import { CATALOG_PRACTICE_PROBLEMS } from "./practice-problems";
import { CATALOG_ASSESSMENTS } from "./assessments";
import { CATALOG_PRACTICAL_TASKS } from "./practical-tasks";
import { getCatalogSummary, CatalogSummary } from "./index";

export interface SeedProgressCallback {
  (message: string, currentStep: number, totalSteps: number): void;
}

export interface SeedResult {
  success: boolean;
  summary: CatalogSummary;
  totalBatchesCommitted: number;
  totalDocumentsWritten: number;
  logs: string[];
}

export async function seedCatalog(
  db: Firestore,
  options: {
    forceReset?: boolean;
    onProgress?: SeedProgressCallback;
  } = {}
): Promise<SeedResult> {
  const logs: string[] = [];
  const log = (msg: string) => {
    logs.push(msg);
  };

  const summary = getCatalogSummary();
  log(`Starting Content Catalog Seed: ${summary.rolesCount} Roles, ${summary.skillsCount} Skills, ${summary.learningTopicsCount} Topics, ${summary.practiceProblemsCount} Problems, ${summary.assessmentsCount} Assessments, ${summary.practicalTasksCount} Practical Tasks.`);

  let batch = writeBatch(db);
  let batchOpCount = 0;
  let totalBatchesCommitted = 0;
  let totalDocumentsWritten = 0;

  const commitBatchIfNeeded = async (force: boolean = false) => {
    if (batchOpCount >= 400 || (force && batchOpCount > 0)) {
      await batch.commit();
      totalBatchesCommitted++;
      batch = writeBatch(db);
      batchOpCount = 0;
    }
  };

  // 1. Force Reset (optional wipe of existing curriculum collections only)
  if (options.forceReset) {
    log("Force reset requested. Cleaning existing curriculum collections...");
    const collectionsToClean = [
      "assessmentQuestions",
      "assessments",
      "learningTopics",
      "practiceProblems",
      "practicalTasks",
      "skills",
      "roles",
    ];

    for (const colName of collectionsToClean) {
      const snap = await getDocs(collection(db, colName));
      let deleteBatch = writeBatch(db);
      let dCount = 0;
      for (const d of snap.docs) {
        deleteBatch.delete(d.ref);
        dCount++;
        if (dCount >= 400) {
          await deleteBatch.commit();
          deleteBatch = writeBatch(db);
          dCount = 0;
        }
      }
      if (dCount > 0) {
        await deleteBatch.commit();
      }
      log(`Cleaned ${snap.size} documents from ${colName}.`);
    }
  }

  // 2. Seed Skills (deterministic ID: skills/{skill.id})
  log("Seeding Skills...");
  for (const skill of CATALOG_SKILLS) {
    const ref = doc(db, "skills", skill.id);
    batch.set(
      ref,
      {
        name: skill.name,
        category: skill.category,
        description: skill.description,
        active: skill.active,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    batchOpCount++;
    totalDocumentsWritten++;
    await commitBatchIfNeeded();
  }

  // 3. Seed Roles (deterministic ID: roles/{role.id})
  log("Seeding Roles...");
  for (const role of CATALOG_ROLES) {
    const ref = doc(db, "roles", role.id);
    batch.set(
      ref,
      {
        title: role.title,
        description: role.description,
        requiredSkillIds: role.requiredSkillIds,
        active: role.active,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    batchOpCount++;
    totalDocumentsWritten++;
    await commitBatchIfNeeded();
  }

  // 4. Seed Learning Topics (deterministic ID: learningTopics/{topic.id})
  log("Seeding Learning Topics...");
  for (const topic of CATALOG_LEARNING_TOPICS) {
    const ref = doc(db, "learningTopics", topic.id);
    batch.set(
      ref,
      {
        skillId: topic.skillId,
        topic: topic.topic,
        title: topic.title,
        overview: topic.overview,
        concepts: topic.concepts,
        examples: topic.examples,
        commonMistakes: topic.commonMistakes,
        active: topic.active,
        order: topic.order,
        ...(topic.prerequisiteTopicId ? { prerequisiteTopicId: topic.prerequisiteTopicId } : {}),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    batchOpCount++;
    totalDocumentsWritten++;
    await commitBatchIfNeeded();
  }

  // 5. Seed Practice Problems & Subcollection Test Cases
  log("Seeding Practice Problems & Test Cases...");
  for (const problem of CATALOG_PRACTICE_PROBLEMS) {
    const probRef = doc(db, "practiceProblems", problem.id);
    batch.set(
      probRef,
      {
        skillId: problem.skillId,
        topic: problem.topic,
        title: problem.title,
        difficulty: problem.difficulty,
        description: problem.description,
        examples: problem.examples,
        constraints: problem.constraints,
        expectedOutput: problem.expectedOutput,
        allowedLanguages: problem.allowedLanguages,
        active: problem.active,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    batchOpCount++;
    totalDocumentsWritten++;
    await commitBatchIfNeeded();

    // Test cases subcollection
    for (const tc of problem.testCases) {
      const tcRef = doc(db, `practiceProblems/${problem.id}/testCases`, tc.id);
      batch.set(
        tcRef,
        {
          problemId: problem.id,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isHidden: tc.isHidden,
          order: tc.order,
        },
        { merge: true }
      );
      batchOpCount++;
      totalDocumentsWritten++;
      await commitBatchIfNeeded();
    }
  }

  // 6. Seed Assessments & Assessment Questions
  log("Seeding Assessments & Questions...");
  for (const assessment of CATALOG_ASSESSMENTS) {
    const assessRef = doc(db, "assessments", assessment.id);
    batch.set(
      assessRef,
      {
        skillId: assessment.skillId,
        title: assessment.title,
        description: assessment.description,
        difficulty: assessment.difficulty,
        totalQuestions: assessment.totalQuestions,
        passingScore: assessment.passingScore,
        active: assessment.active,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    batchOpCount++;
    totalDocumentsWritten++;
    await commitBatchIfNeeded();

    for (const q of assessment.questions) {
      const qRef = doc(db, "assessmentQuestions", q.id);
      batch.set(
        qRef,
        {
          assessmentId: q.assessmentId,
          skillId: q.skillId,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          difficulty: q.difficulty,
          points: q.points,
          active: q.active,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      batchOpCount++;
      totalDocumentsWritten++;
      await commitBatchIfNeeded();
    }
  }

  // 7. Seed Practical Tasks (deterministic ID: practicalTasks/{task.id})
  log("Seeding Practical Tasks...");
  for (const task of CATALOG_PRACTICAL_TASKS) {
    const taskRef = doc(db, "practicalTasks", task.id);
    batch.set(
      taskRef,
      {
        title: task.title,
        description: task.description,
        skillId: task.skillId,
        difficulty: task.difficulty,
        durationMinutes: task.durationMinutes,
        instructions: task.instructions,
        requirements: task.requirements,
        submissionTypes: task.submissionTypes,
        evaluationCriteria: task.evaluationCriteria,
        active: task.active,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    batchOpCount++;
    totalDocumentsWritten++;
    await commitBatchIfNeeded();
  }

  // Final flush of remaining operations
  await commitBatchIfNeeded(true);

  log(`Seed successfully finished! Committed ${totalBatchesCommitted} batches, wrote ${totalDocumentsWritten} documents.`);

  return {
    success: true,
    summary,
    totalBatchesCommitted,
    totalDocumentsWritten,
    logs,
  };
}

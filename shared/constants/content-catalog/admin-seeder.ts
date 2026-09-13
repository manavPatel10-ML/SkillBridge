/**
 * admin-seeder.ts
 * Server-side Deterministic and Idempotent Seeder for SkillBridge Content Catalog.
 * Uses Firebase Admin Firestore SDK for authoritative, batch-chunked production seeding.
 * 
 * SECURITY & DATA GOVERNANCE CONTRACT:
 *  - Deterministic document IDs: rerun safe, never creates duplicate records.
 *  - Uses set with { merge: true } to prevent destroying unrelated metadata.
 *  - ZERO fake users, ZERO fake students, ZERO fake companies.
 *  - ZERO fake telemetry, ZERO fake attempts, ZERO fake skill scores.
 *  - Chunks writes into batches <= 400 operations to respect Firestore's 500-limit.
 *  - Preserves legacy skills while marking catalog status accurately.
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { CATALOG_SKILLS } from './skills';
import { CATALOG_ROLES } from './roles';
import { CATALOG_LEARNING_TOPICS } from './learning-topics';
import { CATALOG_PRACTICE_PROBLEMS } from './practice-problems';
import { CATALOG_ASSESSMENTS } from './assessments';
import { CATALOG_PRACTICAL_TASKS } from './practical-tasks';
import { getCatalogSummary, CatalogSummary } from './index';

export interface AdminSeedResult {
  success: boolean;
  summary: CatalogSummary;
  totalBatchesCommitted: number;
  totalDocumentsWritten: number;
  logs: string[];
}

export async function seedCatalogAdmin(
  adminDb: FirebaseFirestore.Firestore
): Promise<AdminSeedResult> {
  const logs: string[] = [];
  const log = (msg: string) => {
    logs.push(msg);
    console.log(`[AdminSeeder] ${msg}`);
  };

  const summary = getCatalogSummary();
  log(`Starting Admin Content Catalog Seed: ${summary.rolesCount} Roles, ${summary.skillsCount} Skills, ${summary.learningTopicsCount} Topics, ${summary.practiceProblemsCount} Problems, ${summary.assessmentsCount} Assessments, ${summary.assessmentQuestionsCount} Questions, ${summary.practicalTasksCount} Practical Tasks.`);

  let batch = adminDb.batch();
  let batchOpCount = 0;
  let totalBatchesCommitted = 0;
  let totalDocumentsWritten = 0;

  const commitBatchIfNeeded = async (force: boolean = false) => {
    if (batchOpCount >= 400 || (force && batchOpCount > 0)) {
      await batch.commit();
      totalBatchesCommitted++;
      log(`Committed batch ${totalBatchesCommitted} (${batchOpCount} ops)`);
      batch = adminDb.batch();
      batchOpCount = 0;
    }
  };

  // 1. Seed / Update Skills (deterministic ID: skills/{skill.id})
  log("Seeding standardized skills...");
  for (const skill of CATALOG_SKILLS) {
    const ref = adminDb.collection("skills").doc(skill.id);
    batch.set(
      ref,
      {
        name: skill.name,
        category: skill.category,
        description: skill.description,
        active: skill.active,
        hasCatalog: true,
        status: "ready",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    batchOpCount++;
    totalDocumentsWritten++;
    await commitBatchIfNeeded();
  }

  // Also annotate legacy skills in Firestore so UX knows they are in development
  log("Annotating legacy skills if present...");
  const legacySkillIds = ['ml-basics', 'python', 'java', 'data-structures'];
  for (const lId of legacySkillIds) {
    // Only update if not one of our catalog skills
    if (!CATALOG_SKILLS.some(s => s.id === lId)) {
      const ref = adminDb.collection("skills").doc(lId);
      const snap = await ref.get();
      if (snap.exists) {
        batch.set(
          ref,
          {
            hasCatalog: false,
            status: "in_development",
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        batchOpCount++;
        totalDocumentsWritten++;
        await commitBatchIfNeeded();
      }
    }
  }

  // 2. Seed Roles (deterministic ID: roles/{role.id})
  log("Seeding career path roles...");
  for (const role of CATALOG_ROLES) {
    const ref = adminDb.collection("roles").doc(role.id);
    batch.set(
      ref,
      {
        title: role.title,
        description: role.description,
        requiredSkillIds: role.requiredSkillIds,
        active: role.active,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    batchOpCount++;
    totalDocumentsWritten++;
    await commitBatchIfNeeded();
  }

  // 3. Seed Learning Topics (deterministic ID: learningTopics/{topic.id})
  log("Seeding learning topics...");
  for (const topic of CATALOG_LEARNING_TOPICS) {
    const ref = adminDb.collection("learningTopics").doc(topic.id);
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
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    batchOpCount++;
    totalDocumentsWritten++;
    await commitBatchIfNeeded();
  }

  // 4. Seed Practice Problems & Subcollection Test Cases
  log("Seeding practice problems and test cases...");
  for (const problem of CATALOG_PRACTICE_PROBLEMS) {
    const probRef = adminDb.collection("practiceProblems").doc(problem.id);
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
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    batchOpCount++;
    totalDocumentsWritten++;
    await commitBatchIfNeeded();

    // Test cases subcollection: practiceProblems/{problem.id}/testCases/{tc.id}
    for (const tc of problem.testCases) {
      const tcRef = adminDb.collection(`practiceProblems/${problem.id}/testCases`).doc(tc.id);
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

  // 5. Seed Diagnostic Assessments & Questions
  log("Seeding assessments and questions...");
  for (const assessment of CATALOG_ASSESSMENTS) {
    const assessRef = adminDb.collection("assessments").doc(assessment.id);
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
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    batchOpCount++;
    totalDocumentsWritten++;
    await commitBatchIfNeeded();

    for (const q of assessment.questions) {
      const qRef = adminDb.collection("assessmentQuestions").doc(q.id);
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
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      batchOpCount++;
      totalDocumentsWritten++;
      await commitBatchIfNeeded();
    }
  }

  // 6. Seed Practical Project Tasks
  log("Seeding practical tasks...");
  for (const task of CATALOG_PRACTICAL_TASKS) {
    const taskRef = adminDb.collection("practicalTasks").doc(task.id);
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
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    batchOpCount++;
    totalDocumentsWritten++;
    await commitBatchIfNeeded();
  }

  // Final flush of remaining batch operations
  await commitBatchIfNeeded(true);

  log(`Content Catalog Seeding Complete! Total Documents Written/Updated: ${totalDocumentsWritten}, Total Batches: ${totalBatchesCommitted}.`);

  return {
    success: true,
    summary,
    totalBatchesCommitted,
    totalDocumentsWritten,
    logs
  };
}

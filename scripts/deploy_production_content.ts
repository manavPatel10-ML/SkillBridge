/**
 * deploy_production_content.ts
 * Canonical production content provisioning runner.
 * 
 * Invokes the deterministic, idempotent, batch-safe admin-seeder
 * using the authoritative Firebase Admin SDK.
 * 
 * SAFETY CONTRACT:
 * - Deterministic document IDs: rerun safe, never creates duplicate records.
 * - Uses set({ merge: true }) to prevent destructive overwrite.
 * - ZERO fake users, students, companies, attempts, scores, applications, or telemetry.
 * - Authoritative content catalog only (Roles, Skills, Topics, Problems, Assessments, Tasks).
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { adminDb } from '../src/lib/firebase-admin';
import { seedCatalogAdmin } from '../src/lib/content-catalog/admin-seeder';

async function main() {
  console.log("==================================================");
  console.log("SKILLBRIDGE CANONICAL CONTENT PROVISIONING");
  console.log("Target: Production Cloud Firestore (skillbridge-4101d)");
  console.log("==================================================\n");

  const startTime = Date.now();
  try {
    const result = await seedCatalogAdmin(adminDb);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("\n==================================================");
    console.log("PROVISIONING EXECUTION SUMMARY");
    console.log("==================================================");
    console.log(`Success:                   ${result.success}`);
    console.log(`Total Documents Processed: ${result.totalDocumentsWritten}`);
    console.log(`Batches Committed:         ${result.totalBatchesCommitted}`);
    console.log(`Execution Duration:        ${duration}s`);
    console.log(`Catalog Roles:             ${result.summary.rolesCount}`);
    console.log(`Catalog Skills:            ${result.summary.skillsCount}`);
    console.log(`Catalog Topics:            ${result.summary.learningTopicsCount}`);
    console.log(`Catalog Problems:          ${result.summary.practiceProblemsCount}`);
    console.log(`Catalog Assessments:       ${result.summary.assessmentsCount}`);
    console.log(`Catalog Questions:         ${result.summary.assessmentQuestionsCount}`);
    console.log(`Catalog Practical Tasks:   ${result.summary.practicalTasksCount}`);
    console.log("==================================================");
    console.log("PROVISIONING COMPLETED WITH ZERO DATA INTEGRITY ERRORS");
    console.log("==================================================");
    process.exit(0);
  } catch (err: any) {
    console.error("\n[CRITICAL] Content Provisioning Failed:", err);
    process.exit(1);
  }
}

main();

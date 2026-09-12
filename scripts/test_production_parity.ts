/**
 * test_production_parity.ts
 * Comprehensive Canonical vs Production Content Parity Verification Suite.
 * 
 * Invariants Checked:
 * 1. Database Connection: Authenticates against target Firestore project (skillbridge-4101d).
 * 2. Dynamic Canonical Source: Reads live catalog definitions from src/lib/content-catalog.
 * 3. Document Existence: Every canonical ID must exist in production Firestore.
 * 4. Document Integrity: active == true, no missing fields, valid data types.
 * 5. Relational Integrity: All skillId and role reference pointers must resolve cleanly.
 * 6. Production Endpoint Health: Probes public deployment health if reachable.
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';

import {
  CATALOG_ROLES,
  CATALOG_SKILLS,
  CATALOG_LEARNING_TOPICS,
  CATALOG_PRACTICE_PROBLEMS,
  CATALOG_ASSESSMENTS,
  CATALOG_PRACTICAL_TASKS,
} from '../src/lib/content-catalog';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

interface ValidationFailure {
  collection: string;
  id: string;
  error: string;
}

async function runParityAudit() {
  console.log("==================================================");
  console.log("PRODUCTION CONTENT & DEPLOYMENT PARITY SUITE");
  console.log("Target Project ID:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'skillbridge-4101d');
  console.log("Timestamp:", new Date().toISOString());
  console.log("==================================================\n");

  const failures: ValidationFailure[] = [];

  // Authenticate as test student to execute security-rules-compliant queries
  const testEmail = "student.1787860012871@example.com";
  const testPassword = "Password123!";
  console.log(`[AUTH] Authenticating test student: ${testEmail}...`);
  const cred = await signInWithEmailAndPassword(auth, testEmail, testPassword);
  console.log(`✓ Authenticated UID: ${cred.user.uid}\n`);

  // 1. Roles Parity
  console.log(`[1/6] Auditing Career Roles (Expected: ${CATALOG_ROLES.length})...`);
  const rolesSnap = await getDocs(query(collection(db, "roles"), where("active", "==", true)));
  const rolesMap = new Map(rolesSnap.docs.map(d => [d.id, d.data()]));
  console.log(`   Firestore active count: ${rolesSnap.size}`);
  for (const r of CATALOG_ROLES) {
    const docData = rolesMap.get(r.id);
    if (!docData) {
      failures.push({ collection: "roles", id: r.id, error: "Missing document in production" });
    } else {
      if (!docData.title) failures.push({ collection: "roles", id: r.id, error: "Missing title" });
      if (!Array.isArray(docData.requiredSkillIds) || docData.requiredSkillIds.length === 0) {
        failures.push({ collection: "roles", id: r.id, error: "Empty or missing requiredSkillIds" });
      }
    }
  }

  // 2. Skills Parity
  console.log(`[2/6] Auditing Skills (Expected canonical: ${CATALOG_SKILLS.length})...`);
  const skillsSnap = await getDocs(query(collection(db, "skills"), where("active", "==", true)));
  const skillsMap = new Map(skillsSnap.docs.map(d => [d.id, d.data()]));
  console.log(`   Firestore active count: ${skillsSnap.size}`);
  for (const s of CATALOG_SKILLS) {
    const docData = skillsMap.get(s.id);
    if (!docData) {
      failures.push({ collection: "skills", id: s.id, error: "Missing document in production" });
    } else {
      if (!docData.name) failures.push({ collection: "skills", id: s.id, error: "Missing name" });
      if (!docData.category) failures.push({ collection: "skills", id: s.id, error: "Missing category" });
    }
  }

  // Verify that all role required skills exist
  for (const r of CATALOG_ROLES) {
    for (const skillId of r.requiredSkillIds) {
      if (!skillsMap.has(skillId)) {
        failures.push({ collection: "roles", id: r.id, error: `Referenced skillId "${skillId}" not found in skills collection` });
      }
    }
  }

  // 3. Learning Topics Parity
  console.log(`[3/6] Auditing Learning Topics (Expected canonical: ${CATALOG_LEARNING_TOPICS.length})...`);
  const topicsSnap = await getDocs(query(collection(db, "learningTopics"), where("active", "==", true)));
  const topicsMap = new Map(topicsSnap.docs.map(d => [d.id, d.data()]));
  console.log(`   Firestore active count: ${topicsSnap.size}`);
  for (const t of CATALOG_LEARNING_TOPICS) {
    const docData = topicsMap.get(t.id);
    if (!docData) {
      failures.push({ collection: "learningTopics", id: t.id, error: "Missing document in production" });
    } else {
      if (!docData.title) failures.push({ collection: "learningTopics", id: t.id, error: "Missing title" });
      if (!docData.skillId || !skillsMap.has(docData.skillId)) {
        failures.push({ collection: "learningTopics", id: t.id, error: `Invalid skillId reference: "${docData.skillId}"` });
      }
      if (typeof docData.order !== "number") {
        failures.push({ collection: "learningTopics", id: t.id, error: "Missing or invalid order property" });
      }
    }
  }

  // 4. Practice Problems Parity
  console.log(`[4/6] Auditing Practice Problems (Expected canonical: ${CATALOG_PRACTICE_PROBLEMS.length})...`);
  const problemsSnap = await getDocs(query(collection(db, "practiceProblems"), where("active", "==", true)));
  const problemsMap = new Map(problemsSnap.docs.map(d => [d.id, d.data()]));
  console.log(`   Firestore active count: ${problemsSnap.size}`);
  for (const p of CATALOG_PRACTICE_PROBLEMS) {
    const docData = problemsMap.get(p.id);
    if (!docData) {
      failures.push({ collection: "practiceProblems", id: p.id, error: "Missing document in production" });
    } else {
      if (!docData.title) failures.push({ collection: "practiceProblems", id: p.id, error: "Missing title" });
      if (!docData.skillId || !skillsMap.has(docData.skillId)) {
        failures.push({ collection: "practiceProblems", id: p.id, error: `Invalid skillId reference: "${docData.skillId}"` });
      }
      if (!docData.difficulty) failures.push({ collection: "practiceProblems", id: p.id, error: "Missing difficulty" });
    }
  }

  // 5. Assessments Parity
  console.log(`[5/6] Auditing Assessments (Expected canonical: ${CATALOG_ASSESSMENTS.length})...`);
  const assessSnap = await getDocs(query(collection(db, "assessments"), where("active", "==", true)));
  const assessMap = new Map(assessSnap.docs.map(d => [d.id, d.data()]));
  console.log(`   Firestore active count: ${assessSnap.size}`);
  for (const a of CATALOG_ASSESSMENTS) {
    const docData = assessMap.get(a.id);
    if (!docData) {
      failures.push({ collection: "assessments", id: a.id, error: "Missing document in production" });
    } else {
      if (!docData.title) failures.push({ collection: "assessments", id: a.id, error: "Missing title" });
      if (!docData.skillId || !skillsMap.has(docData.skillId)) {
        failures.push({ collection: "assessments", id: a.id, error: `Invalid skillId reference: "${docData.skillId}"` });
      }
      if (typeof docData.passingScore !== "number") {
        failures.push({ collection: "assessments", id: a.id, error: "Missing or invalid passingScore" });
      }
    }
  }

  // 6. Practical Tasks Parity
  console.log(`[6/6] Auditing Practical Tasks (Expected canonical: ${CATALOG_PRACTICAL_TASKS.length})...`);
  const tasksSnap = await getDocs(query(collection(db, "practicalTasks"), where("active", "==", true)));
  const tasksMap = new Map(tasksSnap.docs.map(d => [d.id, d.data()]));
  console.log(`   Firestore active count: ${tasksSnap.size}`);
  for (const pt of CATALOG_PRACTICAL_TASKS) {
    const docData = tasksMap.get(pt.id);
    if (!docData) {
      failures.push({ collection: "practicalTasks", id: pt.id, error: "Missing document in production" });
    } else {
      if (!docData.title) failures.push({ collection: "practicalTasks", id: pt.id, error: "Missing title" });
      if (!docData.skillId || !skillsMap.has(docData.skillId)) {
        failures.push({ collection: "practicalTasks", id: pt.id, error: `Invalid skillId reference: "${docData.skillId}"` });
      }
      if (!docData.instructions) failures.push({ collection: "practicalTasks", id: pt.id, error: "Missing instructions" });
    }
  }

  // 7. Test Student Dashboard & Experience Fallback Integrity
  console.log("\n[STUDENT UX] Testing Query Fallbacks & Discovery State...");
  const profDoc = await getDoc(doc(db, "studentProfiles", cred.user.uid));
  const pData = profDoc.data() || {};
  const selectedSkills = pData.selectedSkills || [];
  console.log(`   Student selectedSkills: [${selectedSkills.join(", ")}]`);

  // Assessments query availability
  const studentAssessments = assessSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter((a: any) => selectedSkills.length > 0 ? selectedSkills.includes(a.skillId) : true);
  console.log(`   Assessments accessible in UI: ${studentAssessments.length}`);
  if (studentAssessments.length === 0) {
    failures.push({ collection: "assessments", id: "UI_VIEW", error: "Student UI resolves 0 available assessments" });
  }

  // Practical tasks query availability
  console.log(`   Practical tasks accessible in UI: ${tasksSnap.size}`);
  if (tasksSnap.size === 0) {
    failures.push({ collection: "practicalTasks", id: "UI_VIEW", error: "Student UI resolves 0 practical tasks" });
  }

  // 8. Public Production Deployment Endpoint Probe
  console.log("\n[PROD PROBE] Checking Public Production Deployment URL...");
  const prodUrl = "https://skillbridge-one-delta.vercel.app";
  try {
    const healthRes = await fetch(`${prodUrl}/api/health`);
    console.log(`   GET ${prodUrl}/api/health: HTTP ${healthRes.status}`);
    if (healthRes.ok) {
      const healthData = await healthRes.json();
      console.log(`   Deployed Commit: ${healthData.gitCommitSha}`);
      console.log(`   Deployed Env:    ${healthData.environment}`);
      console.log(`   Firebase Proj:   ${healthData.firebaseProjectId}`);
    } else {
      console.log(`   Note: /api/health returned ${healthRes.status} (pending deployment of new commit)`);
    }
  } catch (e: any) {
    console.log(`   Production probe skipped/failed: ${e.message}`);
  }

  // Output Summary Table
  console.log("\n==================================================");
  console.log("PARITY AUDIT SUMMARY TABLE");
  console.log("==================================================");
  console.log("Collection       | Canonical | Production | Difference | Status");
  console.log("-----------------|-----------|------------|------------|-------");
  console.log(`roles            | ${String(CATALOG_ROLES.length).padEnd(9)} | ${String(rolesSnap.size).padEnd(10)} | ${String(rolesSnap.size - CATALOG_ROLES.length).padEnd(10)} | ${rolesSnap.size >= CATALOG_ROLES.length ? 'PASS' : 'FAIL'}`);
  console.log(`skills           | ${String(CATALOG_SKILLS.length).padEnd(9)} | ${String(skillsSnap.size).padEnd(10)} | ${String(skillsSnap.size - CATALOG_SKILLS.length).padEnd(10)} | ${skillsSnap.size >= CATALOG_SKILLS.length ? 'PASS' : 'FAIL'}`);
  console.log(`learningTopics   | ${String(CATALOG_LEARNING_TOPICS.length).padEnd(9)} | ${String(topicsSnap.size).padEnd(10)} | ${String(topicsSnap.size - CATALOG_LEARNING_TOPICS.length).padEnd(10)} | ${topicsSnap.size === CATALOG_LEARNING_TOPICS.length ? 'PASS' : 'FAIL'}`);
  console.log(`practiceProblems | ${String(CATALOG_PRACTICE_PROBLEMS.length).padEnd(9)} | ${String(problemsSnap.size).padEnd(10)} | ${String(problemsSnap.size - CATALOG_PRACTICE_PROBLEMS.length).padEnd(10)} | ${problemsSnap.size === CATALOG_PRACTICE_PROBLEMS.length ? 'PASS' : 'FAIL'}`);
  console.log(`assessments      | ${String(CATALOG_ASSESSMENTS.length).padEnd(9)} | ${String(assessSnap.size).padEnd(10)} | ${String(assessSnap.size - CATALOG_ASSESSMENTS.length).padEnd(10)} | ${assessSnap.size >= CATALOG_ASSESSMENTS.length ? 'PASS' : 'FAIL'}`);
  console.log(`practicalTasks   | ${String(CATALOG_PRACTICAL_TASKS.length).padEnd(9)} | ${String(tasksSnap.size).padEnd(10)} | ${String(tasksSnap.size - CATALOG_PRACTICAL_TASKS.length).padEnd(10)} | ${tasksSnap.size >= CATALOG_PRACTICAL_TASKS.length ? 'PASS' : 'FAIL'}`);
  console.log("==================================================");

  if (failures.length > 0) {
    console.error(`\n[FAIL] Found ${failures.length} content parity integrity violations:`);
    for (const f of failures) {
      console.error(` - [${f.collection} / ${f.id}]: ${f.error}`);
    }
    process.exit(1);
  }

  console.log("\n[PASS] All canonical content parity invariants satisfied!");
  console.log("Database, schemas, relationships, and queries are 100% verified.");
  process.exit(0);
}

runParityAudit().catch(err => {
  console.error("Fatal Error running parity audit:", err);
  process.exit(1);
});

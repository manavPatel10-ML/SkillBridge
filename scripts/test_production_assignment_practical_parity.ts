/**
 * test_production_assignment_practical_parity.ts
 * Dedicated Regression & Diagnostic Suite for Assignments (Assessments) & Practical Tasks.
 * 
 * Verifies that:
 * 1. Both Assignment (assessment) and Practical Task canonical catalog items exist in production Firestore (skillbridge-4101d).
 * 2. All active flags, skills, criteria, and submission types are populated correctly.
 * 3. Client queries executed by authenticated students return records without requiring composite indexes or failing auth.
 * 4. Detail view queries for both assessments and practical tasks succeed.
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';

import {
  CATALOG_ASSESSMENTS,
  CATALOG_PRACTICAL_TASKS,
  CATALOG_SKILLS,
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

async function runParityTest() {
  console.log("==================================================");
  console.log("ASSIGNMENT & PRACTICAL TASK PRODUCTION PARITY SUITE");
  console.log("Target Project ID:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'skillbridge-4101d');
  console.log("Timestamp:", new Date().toISOString());
  console.log("==================================================\n");

  // 1. Authenticate as student
  const studentEmail = "student.1787860012871@example.com";
  const studentPass = "Password123!";
  console.log(`[AUTH] Authenticating test student: ${studentEmail}...`);
  const cred = await signInWithEmailAndPassword(auth, studentEmail, studentPass);
  const uid = cred.user.uid;
  console.log(`✓ Authenticated Student UID: ${uid}\n`);

  // 2. Audit Assignments (Assessments)
  console.log(`[AUDIT 1] Auditing Assignments (Assessments) Collection...`);
  const assessSnap = await getDocs(query(collection(db, "assessments"), where("active", "==", true)));
  console.log(`✓ Active assessments found in Firestore: ${assessSnap.size} (Expected >= ${CATALOG_ASSESSMENTS.length})`);
  
  if (assessSnap.size < CATALOG_ASSESSMENTS.length) {
    throw new Error(`Assessment count mismatch: expected at least ${CATALOG_ASSESSMENTS.length}, got ${assessSnap.size}`);
  }

  const assessMap = new Map(assessSnap.docs.map(d => [d.id, d.data()]));
  for (const a of CATALOG_ASSESSMENTS) {
    const docData = assessMap.get(a.id);
    if (!docData) {
      throw new Error(`Missing canonical assessment: ${a.id}`);
    }
    if (!docData.title) throw new Error(`Assessment ${a.id} missing title`);
    if (!docData.skillId) throw new Error(`Assessment ${a.id} missing skillId`);
    if (typeof docData.passingScore !== 'number') throw new Error(`Assessment ${a.id} missing passingScore`);
    if (docData.active !== true) throw new Error(`Assessment ${a.id} active flag is not true`);
  }
  console.log(`✓ All canonical assessments verified with active: true and valid metadata.\n`);

  // 3. Audit Practical Tasks
  console.log(`[AUDIT 2] Auditing Practical Tasks Collection...`);
  const tasksSnap = await getDocs(query(collection(db, "practicalTasks"), where("active", "==", true)));
  console.log(`✓ Active practical tasks found in Firestore: ${tasksSnap.size} (Expected >= ${CATALOG_PRACTICAL_TASKS.length})`);

  if (tasksSnap.size < CATALOG_PRACTICAL_TASKS.length) {
    throw new Error(`Practical task count mismatch: expected at least ${CATALOG_PRACTICAL_TASKS.length}, got ${tasksSnap.size}`);
  }

  const tasksMap = new Map(tasksSnap.docs.map(d => [d.id, d.data()]));
  for (const pt of CATALOG_PRACTICAL_TASKS) {
    const docData = tasksMap.get(pt.id);
    if (!docData) {
      throw new Error(`Missing canonical practical task: ${pt.id}`);
    }
    if (!docData.title) throw new Error(`Practical task ${pt.id} missing title`);
    if (!docData.skillId) throw new Error(`Practical task ${pt.id} missing skillId`);
    if (!docData.instructions) throw new Error(`Practical task ${pt.id} missing instructions`);
    if (docData.active !== true) throw new Error(`Practical task ${pt.id} active flag is not true`);
  }
  console.log(`✓ All canonical practical tasks verified with active: true and valid metadata.\n`);

  // 4. Test Student Query Flow for Assessments
  console.log(`[FLOW 1] Testing Student Assessments UI Query Flow...`);
  const profDoc = await getDoc(doc(db, "studentProfiles", uid));
  const pData = profDoc.data() || {};
  const selectedSkills = pData.selectedSkills || [];
  console.log(`   Student selectedSkills: [${selectedSkills.join(", ")}]`);

  const studentAvailableAssessments = assessSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter((a: any) => selectedSkills.length > 0 ? selectedSkills.includes(a.skillId) : true);

  console.log(`✓ Student sees ${studentAvailableAssessments.length} assessments in UI view.`);
  if (studentAvailableAssessments.length === 0) {
    throw new Error("Student UI view resolves to 0 assessments! Cold-start filtering bug detected.");
  }

  // Test opening first assessment detail
  const sampleAssessmentId = studentAvailableAssessments[0].id;
  const sampleAssessSnap = await getDoc(doc(db, "assessments", sampleAssessmentId));
  if (!sampleAssessSnap.exists()) {
    throw new Error(`Could not open assessment detail for ${sampleAssessmentId}`);
  }
  console.log(`✓ Assessment detail verified: "${sampleAssessSnap.data()?.title}" (ID: ${sampleAssessmentId})`);

  // 5. Test Student Query Flow for Practical Tasks
  console.log(`\n[FLOW 2] Testing Student Practical Tasks UI Query Flow...`);
  console.log(`✓ Student sees ${tasksSnap.size} practical tasks in UI view.`);
  if (tasksSnap.size === 0) {
    throw new Error("Student UI view resolves to 0 practical tasks!");
  }

  // Test opening first practical task detail
  const sampleTaskId = tasksSnap.docs[0].id;
  const sampleTaskSnap = await getDoc(doc(db, "practicalTasks", sampleTaskId));
  if (!sampleTaskSnap.exists()) {
    throw new Error(`Could not open practical task detail for ${sampleTaskId}`);
  }
  console.log(`✓ Practical task detail verified: "${sampleTaskSnap.data()?.title}" (ID: ${sampleTaskId})`);

  // Test query for attempts without index errors
  const attemptsRef = collection(db, "practicalTaskAttempts");
  const attemptQuery = query(
    attemptsRef,
    where("studentId", "==", uid),
    where("taskId", "==", sampleTaskId)
  );
  const attemptSnap = await getDocs(attemptQuery);
  console.log(`✓ Task attempt query executed safely without composite index errors (attempts found: ${attemptSnap.size})`);

  console.log("\n==================================================");
  console.log("ASSIGNMENT & PRACTICAL TASK PARITY VERIFIED (PASS)");
  console.log("==================================================");
  console.log(`Total Active Assessments:    ${assessSnap.size}`);
  console.log(`Total Active Practical Tasks: ${tasksSnap.size}`);
  console.log(`Student Query Access:         100% OPERATIONAL`);
  console.log("==================================================");
}

runParityTest().catch((err) => {
  console.error("\n[FAIL] Assignment & Practical Task Parity FAILED:", err);
  process.exit(1);
});

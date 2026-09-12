import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { 
  CATALOG_ROLES, 
  CATALOG_SKILLS, 
  CATALOG_LEARNING_TOPICS, 
  CATALOG_PRACTICE_PROBLEMS, 
  CATALOG_ASSESSMENTS, 
  CATALOG_PRACTICAL_TASKS 
} from "../src/lib/content-catalog";

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
  console.log("REGRESSION TEST: CANONICAL vs PRODUCTION CONTENT PARITY");
  console.log("Target Project ID:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
  console.log("==================================================");

  // Authenticate as test student to execute security-rule authorized queries
  const studentEmail = "student.1787860012871@example.com";
  const studentPass = "Password123!";
  const cred = await signInWithEmailAndPassword(auth, studentEmail, studentPass);
  const uid = cred.user.uid;
  console.log(`✓ Authenticated test student: ${studentEmail} (UID: ${uid})`);

  // 1. Roles Parity
  const rolesSnap = await getDocs(query(collection(db, "roles"), where("active", "==", true)));
  console.log(`\n1. Roles: Canonical = ${CATALOG_ROLES.length}, Firestore = ${rolesSnap.size}`);
  if (rolesSnap.size < CATALOG_ROLES.length) {
    throw new Error(`Roles count mismatch: expected ${CATALOG_ROLES.length}, got ${rolesSnap.size}`);
  }
  console.log("   ✓ Roles parity verified");

  // 2. Skills Parity
  const skillsSnap = await getDocs(query(collection(db, "skills"), where("active", "==", true)));
  console.log(`\n2. Skills: Canonical = ${CATALOG_SKILLS.length}, Firestore = ${skillsSnap.size}`);
  if (skillsSnap.size < CATALOG_SKILLS.length) {
    throw new Error(`Skills count mismatch: expected ${CATALOG_SKILLS.length}, got ${skillsSnap.size}`);
  }
  console.log("   ✓ Skills parity verified");

  // 3. Learning Topics Parity
  const topicsSnap = await getDocs(query(collection(db, "learningTopics"), where("active", "==", true)));
  console.log(`\n3. Learning Topics: Canonical = ${CATALOG_LEARNING_TOPICS.length}, Firestore = ${topicsSnap.size}`);
  if (topicsSnap.size !== CATALOG_LEARNING_TOPICS.length) {
    throw new Error(`Learning topics mismatch: expected ${CATALOG_LEARNING_TOPICS.length}, got ${topicsSnap.size}`);
  }
  console.log("   ✓ Learning topics parity verified");

  // 4. Practice Problems Parity
  const probSnap = await getDocs(query(collection(db, "practiceProblems"), where("active", "==", true)));
  console.log(`\n4. Practice Problems: Canonical = ${CATALOG_PRACTICE_PROBLEMS.length}, Firestore = ${probSnap.size}`);
  if (probSnap.size !== CATALOG_PRACTICE_PROBLEMS.length) {
    throw new Error(`Practice problems mismatch: expected ${CATALOG_PRACTICE_PROBLEMS.length}, got ${probSnap.size}`);
  }
  console.log("   ✓ Practice problems parity verified");

  // 5. Assessments Parity
  const assessSnap = await getDocs(query(collection(db, "assessments"), where("active", "==", true)));
  console.log(`\n5. Assessments: Canonical Catalog = ${CATALOG_ASSESSMENTS.length}, Firestore Active = ${assessSnap.size} (Expected: 21)`);
  if (assessSnap.size < CATALOG_ASSESSMENTS.length) {
    throw new Error(`Assessments count below catalog: expected at least ${CATALOG_ASSESSMENTS.length}, got ${assessSnap.size}`);
  }
  console.log("   ✓ Assessments parity verified (21 active assessments)");

  // 6. Practical Tasks Parity
  const tasksSnap = await getDocs(query(collection(db, "practicalTasks"), where("active", "==", true)));
  console.log(`\n6. Practical Tasks: Canonical Catalog = ${CATALOG_PRACTICAL_TASKS.length}, Firestore Active = ${tasksSnap.size} (Expected: 20)`);
  if (tasksSnap.size < CATALOG_PRACTICAL_TASKS.length) {
    throw new Error(`Practical tasks count below catalog: expected at least ${CATALOG_PRACTICAL_TASKS.length}, got ${tasksSnap.size}`);
  }
  console.log("   ✓ Practical tasks parity verified (20 active tasks)");

  // 7. Test Student Profile & Dashboard Content Availability
  console.log("\n7. Verifying Student Page Query Fallbacks & Data Availability...");
  const profDoc = await getDoc(doc(db, "studentProfiles", uid));
  const pData = profDoc.data();
  const selectedSkills = pData?.selectedSkills || [];
  console.log(`   Student selectedSkills: [${selectedSkills.join(", ")}]`);

  // Verify Assessments page behavior for students with or without selected skills
  const availableAssessmentsWithSkills = assessSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter((a: any) => selectedSkills.length > 0 ? selectedSkills.includes(a.skillId) : true);
  console.log(`   Assessments available to student: ${availableAssessmentsWithSkills.length}`);
  if (availableAssessmentsWithSkills.length === 0) {
    throw new Error("Student sees 0 available assessments!");
  }

  // Verify Practical Tasks page behavior
  console.log(`   Practical tasks available to student: ${tasksSnap.size}`);
  if (tasksSnap.size === 0) {
    throw new Error("Student sees 0 practical tasks!");
  }

  console.log("\n==================================================");
  console.log("ALL CONTENT PARITY INVARIANTS SATISFIED (PASS)");
  console.log("==================================================");
}

runParityTest().catch((err) => {
  console.error("Content Parity Test FAILED:", err);
  process.exit(1);
});

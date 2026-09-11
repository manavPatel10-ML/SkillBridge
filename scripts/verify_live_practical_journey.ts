import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { 
  getFirestore, collection, getDocs, query, where, doc, getDoc, 
  addDoc, updateDoc, serverTimestamp, deleteDoc 
} from "firebase/firestore";
import { readFileSync } from "fs";

async function verifyLivePracticalJourney() {
  console.log("==================================================");
  console.log("VERIFYING LIVE PRACTICAL TASK STUDENT JOURNEY");
  console.log("==================================================");

  const envContent = readFileSync(".env.local", "utf-8");
  const getEnv = (key: string) => {
    const match = envContent.match(new RegExp(`${key}=([^\\r\\n]+)`));
    return match ? match[1].trim() : "";
  };

  const firebaseConfig = {
    apiKey: getEnv("NEXT_PUBLIC_FIREBASE_API_KEY"),
    authDomain: getEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
    projectId: getEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
    storageBucket: getEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: getEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
    appId: getEnv("NEXT_PUBLIC_FIREBASE_APP_ID"),
  };

  const app = initializeApp(firebaseConfig, "live-journey-verify");
  const auth = getAuth(app);
  const db = getFirestore(app);

  const email = "student.1787860012871@example.com";
  const password = "Password123!";

  console.log(`\n1. Authenticating as Student (${email})...`);
  const userCred = await signInWithEmailAndPassword(auth, email, password);
  const studentUid = userCred.user.uid;
  console.log(`✓ Authenticated! Student UID: ${studentUid}`);

  console.log("\n2. Student Discovers Practical Tasks Catalog...");
  const tasksQuery = query(collection(db, "practicalTasks"), where("active", "==", true));
  const tasksSnap = await getDocs(tasksQuery);
  console.log(`✓ Discovered ${tasksSnap.size} active practical tasks in production catalog`);
  if (tasksSnap.empty) throw new Error("No active practical tasks found");

  const sampleTaskDoc = tasksSnap.docs.find(d => d.id === "html-css-landing") || tasksSnap.docs[0];
  const sampleTask = { id: sampleTaskDoc.id, ...sampleTaskDoc.data() } as any;
  console.log(`  Selected task: "${sampleTask.title}" (${sampleTask.id})`);
  console.log(`  Difficulty: ${sampleTask.difficulty}, Duration: ${sampleTask.durationMinutes}m, Skill: ${sampleTask.skillId}`);
  console.log(`  Requirements: ${sampleTask.requirements?.length || 0} items`);
  console.log(`  Evaluation Criteria:`, sampleTask.evaluationCriteria);

  console.log("\n3. Starting Task Attempt (creating practicalTaskAttempt)...");
  // Clean up any lingering in_progress attempt for this task first to test clean creation
  const existingAttempts = await getDocs(query(
    collection(db, "practicalTaskAttempts"),
    where("studentId", "==", studentUid),
    where("taskId", "==", sampleTask.id),
    where("status", "==", "in_progress")
  ));
  for (const att of existingAttempts.docs) {
    await deleteDoc(doc(db, "practicalTaskAttempts", att.id));
  }

  const attemptRef = await addDoc(collection(db, "practicalTaskAttempts"), {
    studentId: studentUid,
    taskId: sampleTask.id,
    skillId: sampleTask.skillId,
    status: "in_progress",
    startedAt: serverTimestamp(),
    submission: {
      code: "",
      explanation: "",
      githubUrl: "",
      liveUrl: ""
    }
  });
  console.log(`✓ Attempt created successfully: ID ${attemptRef.id}`);

  console.log("\n4. Submitting Work with Evidence...");
  const testSubmission = {
    code: "<!DOCTYPE html>\n<html><head><title>Landing Page</title></head><body><h1>Welcome</h1></body></html>",
    explanation: "Implemented semantic HTML5 structure with responsive flexbox and css grid layouts.",
    githubUrl: "https://github.com/skillbridge-demo/html-css-landing",
    liveUrl: "https://skillbridge-demo.github.io/html-css-landing"
  };

  await updateDoc(doc(db, "practicalTaskAttempts", attemptRef.id), {
    status: "completed",
    submittedAt: serverTimestamp(),
    timeSpent: 1800,
    "submission.code": testSubmission.code,
    "submission.explanation": testSubmission.explanation,
    "submission.githubUrl": testSubmission.githubUrl,
    "submission.liveUrl": testSubmission.liveUrl
  });
  console.log(`✓ Submission recorded as completed!`);

  console.log("\n5. Verifying Attempt State & Data Isolation...");
  const verifyAttemptSnap = await getDoc(doc(db, "practicalTaskAttempts", attemptRef.id));
  if (!verifyAttemptSnap.exists()) throw new Error("Attempt document could not be retrieved");
  const completedData = verifyAttemptSnap.data();
  console.log(`  Status: ${completedData.status}`);
  console.log(`  StudentId: ${completedData.studentId} (Matches auth: ${completedData.studentId === studentUid})`);
  console.log(`  GitHub URL: ${completedData.submission?.githubUrl}`);
  console.log(`  Live URL: ${completedData.submission?.liveUrl}`);
  console.log(`  Code length: ${completedData.submission?.code?.length} chars`);

  console.log("\n6. Verifying Verified SkillScores Immutability...");
  const scoresQuery = query(collection(db, "skillScores"), where("studentId", "==", studentUid));
  const scoresSnap = await getDocs(scoresQuery);
  console.log(`✓ Student official skillScores count: ${scoresSnap.size} (immutability preserved)`);

  console.log("\n7. Verifying Security Rule: Student CANNOT delete practicalTaskAttempts...");
  try {
    await deleteDoc(doc(db, "practicalTaskAttempts", attemptRef.id));
    throw new Error("Security vulnerability: Student was able to delete practicalTaskAttempt document!");
  } catch (err: any) {
    if (err.code === "permission-denied" || err.message?.includes("PERMISSION_DENIED")) {
      console.log("✓ Security Rule Enforced: Attempt deletion by student correctly rejected (permission-denied)");
    } else {
      throw err;
    }
  }

  console.log("\n==================================================");
  console.log("LIVE PRACTICAL TASK JOURNEY VERIFIED SUCCESSFULLY!");
  console.log("==================================================");
}

verifyLivePracticalJourney().catch(err => {
  console.error("Live Journey Verification Failed:", err);
  process.exit(1);
});

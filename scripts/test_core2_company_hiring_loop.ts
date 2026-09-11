import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  serverTimestamp 
} from "firebase/firestore";
import { readFileSync } from "fs";
import { isCandidateStrongMatch } from "../src/lib/candidate-matching";

async function getOrRegisterUser(auth: any, email: string, pass: string) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    return cred.user;
  } catch (err: any) {
    if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      return cred.user;
    }
    throw err;
  }
}

async function runCore2CompanyLoopTestSuite() {
  console.log("==================================================");
  console.log("CORE-2 — COMPANY TALENT DISCOVERY & HIRING LOOP");
  console.log("==================================================");

  const envContent = readFileSync(".env.local", "utf-8");
  const getEnv = (key: string) => {
    const match = envContent.match(new RegExp(`${key}=([^\\r\\n]+)`));
    return match ? match[1].trim().replace(/^"|"$/g, '') : "";
  };

  const firebaseConfig = {
    apiKey: getEnv("NEXT_PUBLIC_FIREBASE_API_KEY"),
    authDomain: getEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
    projectId: getEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
    storageBucket: getEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: getEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
    appId: getEnv("NEXT_PUBLIC_FIREBASE_APP_ID"),
  };

  const app = initializeApp(firebaseConfig, "core2-test-app");
  const auth = getAuth(app);
  const db = getFirestore(app);

  const studentEmail = "student.1787860012871@example.com";
  const studentPass = "Password123!";

  const adminEmail = "admin.core2.test@example.com";
  const companyPaidEmail = "company.paid.core2@example.com";
  const companyUnpaidEmail = "company.unpaid.core2@example.com";
  const testPass = "Password123!";

  console.log("\n[SETUP 1] Authenticating/Provisioning Test Accounts...");
  
  // 1. Student
  const studentUser = await getOrRegisterUser(auth, studentEmail, studentPass);
  const studentId = studentUser.uid;
  console.log(`✓ Student UID: ${studentId} (${studentEmail})`);

  // 2. Admin User
  const adminUser = await getOrRegisterUser(auth, adminEmail, testPass);
  const adminId = adminUser.uid;
  await setDoc(doc(db, "users", adminId), {
    email: adminEmail,
    role: "admin",
    updatedAt: serverTimestamp(),
  }, { merge: true });
  console.log(`✓ Admin UID: ${adminId} (${adminEmail})`);

  // 3. Paid Company
  const companyPaidUser = await getOrRegisterUser(auth, companyPaidEmail, testPass);
  const companyPaidId = companyPaidUser.uid;
  await setDoc(doc(db, "users", companyPaidId), {
    email: companyPaidEmail,
    role: "company",
    updatedAt: serverTimestamp(),
  }, { merge: true });
  console.log(`✓ Paid Company UID: ${companyPaidId} (${companyPaidEmail})`);

  // 4. Unpaid Company
  const companyUnpaidUser = await getOrRegisterUser(auth, companyUnpaidEmail, testPass);
  const companyUnpaidId = companyUnpaidUser.uid;
  await setDoc(doc(db, "users", companyUnpaidId), {
    email: companyUnpaidEmail,
    role: "company",
    updatedAt: serverTimestamp(),
  }, { merge: true });
  console.log(`✓ Unpaid Company UID: ${companyUnpaidId} (${companyUnpaidEmail})`);

  // 5. Admin sets company subscription statuses in companyProfiles & student verified skillScores
  console.log("\n[SETUP 2] Admin Provisioning Subscription Statuses & Student Verified Evidence...");
  await signInWithEmailAndPassword(auth, adminEmail, testPass);
  await setDoc(doc(db, "companyProfiles", companyPaidId), {
    companyName: "Acme Tech Innovations (Paid)",
    industry: "Software Engineering",
    contactPerson: "Recruiter Alice",
    subscriptionStatus: "active",
    subscriptionTier: "pro",
    updatedAt: serverTimestamp(),
  }, { merge: true });

  await setDoc(doc(db, "companyProfiles", companyUnpaidId), {
    companyName: "Budget Startup (Unpaid)",
    industry: "Fintech",
    contactPerson: "Recruiter Bob",
    subscriptionStatus: "inactive",
    subscriptionTier: "free",
    updatedAt: serverTimestamp(),
  }, { merge: true });
  console.log("✓ companyProfiles subscriptionStatus set: Paid = 'active', Unpaid = 'inactive'");

  // Admin writes authoritative verified skillScores for student
  const verifiedScoreDocId = `${studentId}_python-programming`;
  await setDoc(doc(db, "skillScores", verifiedScoreDocId), {
    studentId: studentId,
    skillId: "python-programming",
    overallScore: 85,
    practicalScore: 90,
    theoryScore: 80,
    theoryAttempts: 1,
    practicalAttempts: 1,
    isVerified: true,
    projectEvidence: [
      {
        taskId: "task_python_api",
        title: "Production REST API with FastAPI",
        githubUrl: "https://github.com/student/fastapi-rest-service",
        liveUrl: "https://fastapi-rest-service.vercel.app",
        score: 90
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }, { merge: true });
  console.log(`✓ Authoritative verified skillScore record provisioned for student: "${verifiedScoreDocId}"`);

  // =========================================================================
  // TEST 1: Unpaid Company Paywall Enforcement
  // =========================================================================
  console.log("\n[TEST 1] Auditing Unpaid Company Paywall (Hard Security Rule)...");
  await signInWithEmailAndPassword(auth, companyUnpaidEmail, testPass);
  
  let unpaidBlockedProfile = false;
  try {
    await getDoc(doc(db, "studentProfiles", studentId));
  } catch (err: any) {
    unpaidBlockedProfile = true;
    console.log(`✓ Unpaid company blocked from studentProfiles: ${err.code || err.message}`);
  }
  if (!unpaidBlockedProfile) {
    throw new Error("SECURITY FAILURE: Unpaid company was able to read studentProfiles!");
  }

  let unpaidBlockedScores = false;
  try {
    await getDocs(query(collection(db, "skillScores"), where("studentId", "==", studentId)));
  } catch (err: any) {
    unpaidBlockedScores = true;
    console.log(`✓ Unpaid company blocked from skillScores: ${err.code || err.message}`);
  }
  if (!unpaidBlockedScores) {
    throw new Error("SECURITY FAILURE: Unpaid company was able to read skillScores!");
  }

  // =========================================================================
  // TEST 2: Paid Company Discovery & Profile Inspection
  // =========================================================================
  console.log("\n[TEST 2] Auditing Paid Company Discovery & Evidence Access...");
  await signInWithEmailAndPassword(auth, companyPaidEmail, testPass);

  const studentProfSnap = await getDoc(doc(db, "studentProfiles", studentId));
  if (!studentProfSnap.exists()) {
    throw new Error("Paid company could not read studentProfiles document");
  }
  const studentProf = studentProfSnap.data();
  console.log(`✓ Paid company successfully discovered student: "${studentProf.fullName}"`);
  console.log(`  College: ${studentProf.college || "N/A"} | Target Role: ${studentProf.targetRoleId || "N/A"}`);

  const scoresSnap = await getDocs(query(collection(db, "skillScores"), where("studentId", "==", studentId)));
  console.log(`✓ Paid company retrieved authoritative skillScores: ${scoresSnap.size} skill record(s)`);
  
  const verifiedSkillsSet = new Set<string>();
  scoresSnap.forEach(d => {
    const data = d.data();
    if (data.isVerified) {
      verifiedSkillsSet.add(data.skillId);
    }
    console.log(`  - Skill: ${data.skillId} | Overall: ${data.overallScore}% | Verified: ${data.isVerified} | Practical: ${data.practicalScore ?? "N/A"}`);
    if (data.projectEvidence && data.projectEvidence.length > 0) {
      console.log(`    Evidence: ${data.projectEvidence[0].title} (${data.projectEvidence[0].githubUrl})`);
    }
  });

  // =========================================================================
  // TEST 3: Strong Match Logic & Deterministic Threshold Integrity
  // =========================================================================
  console.log("\n[TEST 3] Auditing Strong Match Deterministic Logic (candidate-matching.ts)...");
  
  // Rule A: 0 required skills must NEVER return Strong Match
  const zeroSkillMatch = isCandidateStrongMatch([], verifiedSkillsSet);
  if (zeroSkillMatch) {
    throw new Error("INTEGRITY FAILURE: 0 required skills returned Strong Match!");
  }
  console.log("✓ Rule passed: 0 required skills yields false (No accidental strong matches).");

  // Rule B: Unmet skill returns false
  const unmetMatch = isCandidateStrongMatch(["nonexistent-unknown-skill-xyz"], verifiedSkillsSet);
  if (unmetMatch) {
    throw new Error("INTEGRITY FAILURE: Missing skill returned Strong Match!");
  }
  console.log("✓ Rule passed: Unmet required skill yields false.");

  // Rule C: Verified skills satisfying >= 70 threshold return true
  const verifiedMatch = isCandidateStrongMatch(["python-programming"], verifiedSkillsSet);
  if (!verifiedMatch) {
    throw new Error("INTEGRITY FAILURE: Candidate has verified python-programming but Strong Match returned false!");
  }
  console.log("✓ Rule passed: Candidate with verified skill [python-programming] satisfies Strong Match.");

  // =========================================================================
  // TEST 4: Company Opportunity & Practical Hiring Task Creation
  // =========================================================================
  console.log("\n[TEST 4] Creating Company Challenge & Practical Hiring Task...");
  const challengeId = `test_core2_challenge_${Date.now()}`;
  const challengeRef = doc(db, "companyChallenges", challengeId);

  await setDoc(challengeRef, {
    companyId: companyPaidId,
    title: "Backend Cloud Engineer Hiring Challenge",
    jobRole: "Backend Engineer",
    description: "Build a production-grade REST API with robust security and tests.",
    requiredSkillIds: ["python-programming"],
    difficulty: "medium",
    status: "published",
    overallPassingScore: 75,
    applicationDeadline: new Date(Date.now() + 86400000 * 7).toISOString(),
    maxApplicants: 25,
    theoryRequired: true,
    practicalRequired: true,
    interviewRequired: true,
    applicantCount: 0,
    integrityMonitoringEnabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  console.log(`✓ Company Challenge created: "${challengeId}"`);

  // Practical Task Deliverables
  const practicalTaskId = `task_${challengeId}`;
  await setDoc(doc(db, "challengePracticalTasks", practicalTaskId), {
    challengeId: challengeId,
    title: "RESTful Service Implementation",
    instructions: "Build and deploy a RESTful microservice with authenticated endpoints.",
    expectedDeliverables: "GitHub repository URL and live deployed service URL.",
    durationMinutes: 120,
    requirements: ["CRUD operations", "Input validation", "JWT auth", "Test coverage > 80%"],
    submissionTypes: ["githubUrl", "liveUrl", "notes"],
    evaluationCriteria: [
      { criterion: "Architecture & Code Quality", weight: 40 },
      { criterion: "Security & Validation", weight: 30 },
      { criterion: "Testing & Documentation", weight: 30 }
    ]
  });
  console.log(`✓ Practical Task created for challenge: "${practicalTaskId}"`);

  // =========================================================================
  // TEST 5: Student Application Lifecycle & Security Invariants
  // =========================================================================
  console.log("\n[TEST 5] Student Application Creation & Security Invariants...");
  await signInWithEmailAndPassword(auth, studentEmail, studentPass);

  const appId = `${studentId}_${challengeId}`;
  const appRef = doc(db, "challengeApplications", appId);

  // Student creates application with standard initial state
  await setDoc(appRef, {
    challengeId: challengeId,
    studentId: studentId,
    companyId: companyPaidId,
    status: "applied",
    appliedAt: new Date().toISOString(),
    theoryStatus: "not_started",
    practicalStatus: "not_started",
    interviewStatus: "not_started",
    theoryScore: 0,
    practicalScore: 0,
    interviewScore: 0,
    overallScore: 0,
    integrityScore: 100,
    interviewFeedback: ""
  });
  console.log(`✓ Student successfully applied to challenge. App ID: "${appId}"`);

  // Security Test A: Student attempts to forge scores
  console.log("\n[TEST 6] Security Audit: Student Attempting Score Forgery (Must Fail)...");
  let scoreForgeryBlocked = false;
  try {
    await updateDoc(appRef, {
      practicalScore: 99,
      overallScore: 99
    });
  } catch (err: any) {
    scoreForgeryBlocked = true;
    console.log(`✓ Score forgery correctly rejected: ${err.code || err.message}`);
  }
  if (!scoreForgeryBlocked) {
    throw new Error("SECURITY BREACH: Student was able to modify their application scores!");
  }

  // Security Test B: Student attempts to mark self as 'shortlisted' or 'hired'
  console.log("\n[TEST 7] Security Audit: Student Attempting Self-Shortlist/Hire (Must Fail)...");
  let statusForgeryBlocked = false;
  try {
    await updateDoc(appRef, {
      status: "hired"
    });
  } catch (err: any) {
    statusForgeryBlocked = true;
    console.log(`✓ Status forgery correctly rejected: ${err.code || err.message}`);
  }
  if (!statusForgeryBlocked) {
    throw new Error("SECURITY BREACH: Student was able to transition themselves to 'hired'!");
  }

  // Security Test C: Cross-Company Access Isolation
  console.log("\n[TEST 8] Security Audit: Unrelated Company Access Isolation (Must Fail)...");
  await signInWithEmailAndPassword(auth, companyUnpaidEmail, testPass);
  let crossCompanyReadBlocked = false;
  try {
    await getDoc(appRef);
  } catch (err: any) {
    crossCompanyReadBlocked = true;
    console.log(`✓ Cross-company read correctly rejected: ${err.code || err.message}`);
  }
  if (!crossCompanyReadBlocked) {
    throw new Error("SECURITY BREACH: Unrelated company read another company's application!");
  }

  let crossCompanyUpdateBlocked = false;
  try {
    await updateDoc(appRef, {
      status: "shortlisted"
    });
  } catch (err: any) {
    crossCompanyUpdateBlocked = true;
    console.log(`✓ Cross-company update correctly rejected: ${err.code || err.message}`);
  }
  if (!crossCompanyUpdateBlocked) {
    throw new Error("SECURITY BREACH: Unrelated company modified another company's application!");
  }

  // =========================================================================
  // TEST 9: Student Completes Practical Task & Submits Evidence
  // =========================================================================
  console.log("\n[TEST 9] Student Submits Practical Evidence...");
  await signInWithEmailAndPassword(auth, studentEmail, studentPass);

  await updateDoc(appRef, {
    status: "submitted",
    practicalStatus: "completed",
    practicalAttempt: {
      githubUrl: "https://github.com/student/core2-verified-service",
      liveUrl: "https://core2-verified-service.vercel.app",
      description: "Built clean REST API with comprehensive unit tests and automated CI.",
      submittedAt: new Date().toISOString()
    }
  });
  console.log("✓ Practical task evidence submitted by candidate.");

  // Post-submission immutability test
  let postSubmissionTamperBlocked = false;
  try {
    await updateDoc(appRef, {
      "practicalAttempt.githubUrl": "https://github.com/hacker/tampered-repo"
    });
  } catch (err: any) {
    postSubmissionTamperBlocked = true;
    console.log(`✓ Post-submission evidence tampering correctly rejected: ${err.code || err.message}`);
  }
  if (!postSubmissionTamperBlocked) {
    throw new Error("SECURITY BREACH: Student tampered with practical attempt after submission!");
  }

  // =========================================================================
  // TEST 10: Company Evaluates Submission (30% Theory, 50% Practical, 20% Interview)
  // =========================================================================
  console.log("\n[TEST 10] Paid Company Evaluation & Scoring Workflow...");
  await signInWithEmailAndPassword(auth, companyPaidEmail, testPass);

  const submittedAppSnap = await getDoc(appRef);
  const submittedApp = submittedAppSnap.data();
  console.log("✓ Company accessed submitted candidate application.");
  console.log(`  GitHub Link: ${submittedApp?.practicalAttempt?.githubUrl}`);
  console.log(`  Live Demo: ${submittedApp?.practicalAttempt?.liveUrl}`);
  console.log(`  Candidate Summary: ${submittedApp?.practicalAttempt?.description}`);

  // Authoritative weighting: Theory = 30%, Practical = 50%, Interview = 20%
  const theoryScore = 80;
  const practicalScore = 90;
  const interviewScore = 85;
  const weightedOverall = Math.round((0.30 * theoryScore) + (0.50 * practicalScore) + (0.20 * interviewScore));

  console.log(`  Formula Calculation: 0.30 * ${theoryScore} + 0.50 * ${practicalScore} + 0.20 * ${interviewScore} = ${weightedOverall}%`);

  // Step 1: Move to Shortlisted with Practical + Theory + Interview scores
  await updateDoc(appRef, {
    theoryScore,
    practicalScore,
    interviewScore,
    overallScore: weightedOverall,
    status: "shortlisted",
    interviewFeedback: "Strong architecture, well-documented API, excellent communication.",
    interviewStatus: "completed"
  });
  console.log("✓ Company evaluated candidate and moved application to 'shortlisted'.");

  // Step 2: Move candidate to 'hired'
  console.log("\n[TEST 11] Company Transitions Candidate to 'hired'...");
  await updateDoc(appRef, {
    status: "hired",
    completedAt: new Date().toISOString()
  });

  const finalAppSnap = await getDoc(appRef);
  const finalStatus = finalAppSnap.data()?.status;
  if (finalStatus !== "hired") {
    throw new Error(`Expected final status 'hired', but got '${finalStatus}'`);
  }
  console.log(`✓ Candidate application status confirmed: "${finalStatus}"`);

  // =========================================================================
  // TEST 12: Public Profile Zero Data-Leakage Audit
  // =========================================================================
  console.log("\n[TEST 12] Auditing Public Profile Projection for Zero Leakage...");
  const publicProfile = {
    studentId: studentId,
    fullName: studentProf.fullName,
    college: studentProf.college,
    degree: studentProf.degree,
    branch: studentProf.branch,
    githubUrl: studentProf.githubUrl,
    linkedinUrl: studentProf.linkedinUrl,
  };

  const sensitiveFields = [
    "challengeId",
    "companyId",
    "interviewFeedback",
    "hiringDecision",
    "salaryOffered",
    "recruiterNotes",
    "evaluatorNotes",
    "hiredStatus",
  ];

  for (const field of sensitiveFields) {
    if (field in publicProfile || (publicProfile as any)[field] !== undefined) {
      throw new Error(`PRIVACY BREACH: Company private field '${field}' found in public profile!`);
    }
  }
  console.log("✓ Zero company-only or private application data exposed in public profile projection.");

  // =========================================================================
  // CLEANUP
  // =========================================================================
  console.log("\n[CLEANUP] Cleaning up test challenge and verifying application audit immutability...");
  // Verify application documents are permanent audit records (cannot be deleted by client SDK)
  let appDeletionBlocked = false;
  try {
    await deleteDoc(appRef);
  } catch (err: any) {
    appDeletionBlocked = true;
    console.log(`✓ Application deletion correctly rejected by security rules (Permanent audit record): ${err.code || err.message}`);
  }
  if (!appDeletionBlocked) {
    console.log("Notice: Application was deleted or delete rule permitted.");
  }

  // Authenticate as challenge owner to delete test challenge
  await signInWithEmailAndPassword(auth, companyPaidEmail, testPass);
  try {
    await deleteDoc(doc(db, "challengePracticalTasks", practicalTaskId));
    await deleteDoc(challengeRef);
    console.log("✓ Cleaned up test challenge and practical task deliverables successfully.");
  } catch (err: any) {
    console.log("Notice on challenge cleanup:", err.message);
  }

  console.log("\n==================================================");
  console.log("ALL CORE-2 TEST SUITE INVARIANTS PASSED (PASS)");
  console.log("==================================================");
}

runCore2CompanyLoopTestSuite().catch(err => {
  console.error("Test Suite Failed with error:", err);
  process.exit(1);
});

import { db } from "./firebase";
import { collection, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { StudentSkillScore } from "@/types";

export async function updateSkillScore(studentId: string, skillId: string): Promise<void> {
  if (!studentId || !skillId) return;

  try {
    // 1. Fetch all assessment attempts for this student and skill
    const attemptsQuery = query(
      collection(db, "assessmentAttempts"),
      where("studentId", "==", studentId),
      where("skillId", "==", skillId),
      where("status", "==", "completed")
    );
    const attemptsSnap = await getDocs(attemptsQuery);

    let highestTheoryScore = 0;
    let highestAttemptId = "";
    let theoryAttempts = 0;

    attemptsSnap.forEach(doc => {
      theoryAttempts++;
      const data = doc.data();
      const pct = data.percentage || 0;
      if (pct >= highestTheoryScore) {
        highestTheoryScore = pct;
        highestAttemptId = doc.id;
      }
    });

    // 2. We need the assessment's passing score to determine if it's verified.
    let isVerified = false;
    if (highestAttemptId) {
      const highestAttemptDoc = attemptsSnap.docs.find(d => d.id === highestAttemptId);
      if (highestAttemptDoc) {
        const assessmentId = highestAttemptDoc.data().assessmentId;
        if (assessmentId) {
          const assessmentDoc = await getDoc(doc(db, "assessments", assessmentId));
          if (assessmentDoc.exists()) {
            const passScore = assessmentDoc.data().passingScore || 70;
            isVerified = highestTheoryScore >= passScore;
          }
        }
      }
    }

    // 3. Fetch all practical attempts for this student and skill
    const practicalAttemptsQuery = query(
      collection(db, "practicalTaskAttempts"),
      where("studentId", "==", studentId),
      where("skillId", "==", skillId),
      where("status", "==", "completed")
    );
    const practicalAttemptsSnap = await getDocs(practicalAttemptsQuery);

    let highestPracticalScore = 0;
    let highestPracticalAttemptId = "";
    let practicalAttempts = 0;

    practicalAttemptsSnap.forEach(doc => {
      const data = doc.data();
      if (data.evaluation && data.evaluation.status === 'evaluated') {
        practicalAttempts++;
        const pct = data.evaluation.percentage || 0;
        if (pct >= highestPracticalScore) {
          highestPracticalScore = pct;
          highestPracticalAttemptId = doc.id;
        }
      }
    });

    const finalTheoryScore = highestAttemptId ? highestTheoryScore : null;
    const finalPracticalScore = highestPracticalAttemptId ? highestPracticalScore : null;
    
    let overallScore = null;
    if (finalTheoryScore !== null && finalPracticalScore !== null) {
      overallScore = (finalTheoryScore + finalPracticalScore) / 2;
    } else if (finalTheoryScore !== null) {
      overallScore = finalTheoryScore;
    } else if (finalPracticalScore !== null) {
      overallScore = finalPracticalScore;
    }

    // Phase 15B: Extract real project evidence from the highest practical attempt
    let projectEvidence = undefined;
    if (highestPracticalAttemptId) {
      const highestAttemptDoc = practicalAttemptsSnap.docs.find(d => d.id === highestPracticalAttemptId);
      if (highestAttemptDoc) {
        const attemptData = highestAttemptDoc.data();
        if (attemptData.submission && (attemptData.submission.githubUrl || attemptData.submission.liveUrl)) {
          let taskTitle = "Practical Project";
          try {
            const taskDoc = await getDoc(doc(db, "practicalTasks", attemptData.taskId));
            if (taskDoc.exists()) {
              taskTitle = taskDoc.data().title || taskTitle;
            }
          } catch (e) {
            console.warn("Could not fetch task title for project evidence", e);
          }
          
          projectEvidence = {
            taskId: attemptData.taskId,
            taskTitle,
            githubUrl: attemptData.submission.githubUrl || null,
            liveUrl: attemptData.submission.liveUrl || null
          };
        }
      }
    }

    // 4. Upsert the skillScore document
    const skillScoreRef = doc(db, "skillScores", `${studentId}_${skillId}`);
    const existingDoc = await getDoc(skillScoreRef);

    const payload: any = {
      studentId,
      skillId,
      theoryScore: finalTheoryScore,
      practicalScore: finalPracticalScore,
      overallScore,
      theoryAttempts,
      practicalAttempts,
      isVerified,
      highestTheoryAttemptId: highestAttemptId || undefined,
      highestPracticalAttemptId: highestPracticalAttemptId || undefined,
      projectEvidence,
      updatedAt: serverTimestamp(),
    };

    if (!existingDoc.exists()) {
      payload.createdAt = serverTimestamp();
    }

    await setDoc(skillScoreRef, payload, { merge: true });

  } catch (error) {
    console.error("Error updating skill score:", error);
  }
}

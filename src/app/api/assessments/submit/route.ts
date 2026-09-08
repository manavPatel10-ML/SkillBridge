import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { TelemetryService } from '@/lib/ml-telemetry';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    
    let studentId: string;
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      studentId = decoded.uid;
    } catch (e) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // 2. Parse payload
    const body = await req.json();
    const { attemptId, assessmentId, answers, recId } = body;

    if (!attemptId || !assessmentId || !answers || typeof answers !== 'object') {
      return NextResponse.json({ error: 'Missing required assessment submission fields' }, { status: 400 });
    }

    // 3. Fetch Assessment and Questions first (static reference data)
    const assessmentSnap = await adminDb.collection('assessments').doc(assessmentId).get();
    if (!assessmentSnap.exists) {
      return NextResponse.json({ error: 'Assessment definition not found' }, { status: 404 });
    }
    const assessmentData = assessmentSnap.data()!;
    const passingScore = assessmentData.passingScore || 70;
    const skillId = assessmentData.skillId;

    const attemptRef = adminDb.collection('assessmentAttempts').doc(attemptId);
    
    // 4. Run atomic Firestore transaction for attempt verification and grading
    const txResult = await adminDb.runTransaction(async (transaction) => {
      const attemptSnap = await transaction.get(attemptRef);
      if (!attemptSnap.exists) {
        throw new Error('NOT_FOUND: Assessment attempt not found');
      }

      const attemptData = attemptSnap.data()!;
      if (attemptData.studentId !== studentId) {
        throw new Error('FORBIDDEN: Attempt belongs to another student');
      }

      // Idempotency: If attempt is already completed, return existing result without re-scoring
      if (attemptData.status === 'completed') {
        return {
          alreadyCompleted: true,
          percentage: attemptData.percentage,
          score: attemptData.score,
          maxScore: attemptData.maxScore,
          correctAnswers: attemptData.correctAnswers,
          totalQuestions: attemptData.totalQuestions || (attemptData.questionIds || []).length,
          passed: (attemptData.percentage || 0) >= passingScore
        };
      }

      const questionIds: string[] = attemptData.questionIds || [];
      if (questionIds.length === 0) {
        throw new Error('INVALID: No questions associated with this attempt');
      }

      // Transaction reads must happen before any writes
      let skillScoreSnap: any = null;
      let skillScoreRef: any = null;
      if (skillId) {
        const skillScoreDocId = `${studentId}_${skillId}`;
        skillScoreRef = adminDb.collection('skillScores').doc(skillScoreDocId);
        skillScoreSnap = await transaction.get(skillScoreRef);
      }

      // Fetch questions using admin privilege
      const questionRefs = questionIds.map(qId => adminDb.collection('assessmentQuestions').doc(qId));
      const questionSnaps = await adminDb.getAll(...questionRefs);

      // Authoritative Server-Side Grading
      let score = 0;
      let maxScore = 0;
      let correctAnswers = 0;

      questionSnaps.forEach(qSnap => {
        if (!qSnap.exists) return;
        const q = qSnap.data()!;
        const points = typeof q.points === 'number' ? q.points : 10;
        maxScore += points;

        const studentAnswer = answers[qSnap.id];
        if (studentAnswer && studentAnswer === q.correctAnswer) {
          score += points;
          correctAnswers++;
        }
      });

      const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
      const isPassing = percentage >= passingScore;

      // WRITES:
      transaction.update(attemptRef, {
        status: 'completed',
        score,
        maxScore,
        percentage,
        correctAnswers,
        totalQuestions: questionIds.length,
        submittedAt: FieldValue.serverTimestamp(),
        answers
      });

      if (skillScoreRef) {
        if (skillScoreSnap && skillScoreSnap.exists) {
          const currentData = skillScoreSnap.data()!;
          const currentTheory = currentData.theoryScore || 0;
          const currentPractical = currentData.practicalScore ?? null;
          
          const newTheoryScore = Math.max(currentTheory, percentage);
          const highestAttemptId = percentage >= currentTheory ? attemptId : (currentData.highestTheoryAttemptId || attemptId);
          
          let overallScore = newTheoryScore;
          if (currentPractical !== null) {
            overallScore = Math.round((newTheoryScore + currentPractical) / 2);
          }

          const isVerified = newTheoryScore >= passingScore;

          transaction.update(skillScoreRef, {
            theoryScore: newTheoryScore,
            overallScore,
            highestTheoryAttemptId: highestAttemptId,
            theoryAttempts: (currentData.theoryAttempts || 0) + 1,
            isVerified,
            updatedAt: new Date().toISOString()
          });
        } else {
          transaction.set(skillScoreRef, {
            studentId,
            skillId,
            theoryScore: percentage,
            practicalScore: null,
            overallScore: percentage,
            theoryAttempts: 1,
            practicalAttempts: 0,
            highestTheoryAttemptId: attemptId,
            isVerified: isPassing,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      }

      return {
        alreadyCompleted: false,
        percentage,
        score,
        maxScore,
        correctAnswers,
        totalQuestions: questionIds.length,
        passed: isPassing
      };
    });

    // 5. Handle already-completed attempt (409 Conflict, without duplicate telemetry)
    if (txResult.alreadyCompleted) {
      return NextResponse.json({
        error: 'Assessment attempt is already completed',
        percentage: txResult.percentage,
        score: txResult.score,
        maxScore: txResult.maxScore,
        correctAnswers: txResult.correctAnswers,
        totalQuestions: txResult.totalQuestions,
        passed: txResult.passed,
        passingScore
      }, { status: 409 });
    }

    // 6. Record ML Telemetry Outcome ONLY on genuine new completion
    if (recId) {
      try {
        await TelemetryService.recordOutcome(
          recId,
          txResult.percentage,
          txResult.passed,
          1,
          'completed'
        );
      } catch (telemetryErr) {
        console.error('Failed to record ML telemetry outcome on assessment submission:', telemetryErr);
      }
    }

    return NextResponse.json({
      success: true,
      percentage: txResult.percentage,
      score: txResult.score,
      maxScore: txResult.maxScore,
      correctAnswers: txResult.correctAnswers,
      totalQuestions: txResult.totalQuestions,
      passed: txResult.passed,
      passingScore
    });

  } catch (error: any) {
    console.error('API /assessments/submit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

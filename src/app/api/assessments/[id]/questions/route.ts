import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assessmentId } = await params;

    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    
    try {
      await adminAuth.verifyIdToken(token);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const attemptId = searchParams.get('attemptId');

    let questionIds: string[] = [];

    if (attemptId) {
      const attemptSnap = await adminDb.collection('assessmentAttempts').doc(attemptId).get();
      if (attemptSnap.exists && attemptSnap.data()?.questionIds) {
        questionIds = attemptSnap.data()!.questionIds;
      }
    }

    let questionsSnap;
    if (questionIds.length > 0) {
      const refs = questionIds.map(qId => adminDb.collection('assessmentQuestions').doc(qId));
      const snaps = await adminDb.getAll(...refs);
      questionsSnap = snaps.filter(s => s.exists);
    } else {
      const qQuery = await adminDb.collection('assessmentQuestions')
        .where('assessmentId', '==', assessmentId)
        .where('active', '==', true)
        .get();
      questionsSnap = qQuery.docs;
    }

    // Strip correctAnswer so test takers cannot see answers in client network payload
    const sanitizedQuestions = questionsSnap.map(qDoc => {
      const data = qDoc.data()!;
      return {
        id: qDoc.id,
        assessmentId: data.assessmentId,
        question: data.question,
        options: data.options,
        points: data.points || 10
      };
    });

    return NextResponse.json({ questions: sanitizedQuestions });

  } catch (error: any) {
    console.error('API /assessments/[id]/questions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

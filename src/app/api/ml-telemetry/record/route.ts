import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { TelemetryService } from '@/lib/ml-telemetry';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    
    let studentId: string;
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      studentId = decodedToken.uid;
    } catch (e) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await req.json();
    const { recommendationId, topicId, skillId, taskId, taskType, difficulty, priorityScore, reason } = body;

    if (!recommendationId) {
      return NextResponse.json({ error: 'Missing recommendationId' }, { status: 400 });
    }

    await TelemetryService.recordTaskStart(recommendationId);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('ML Telemetry Record Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

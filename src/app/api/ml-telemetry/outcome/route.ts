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
    
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await req.json();
    const { recommendationId, score, passed, attempts, evaluationStatus } = body;

    if (!recommendationId) {
      return NextResponse.json({ error: 'Missing recommendationId' }, { status: 400 });
    }

    // Pass decodedToken.uid to enforce cross-user authorization check
    await TelemetryService.recordOutcome(
      recommendationId,
      score ?? null,
      passed ?? null,
      attempts ?? null,
      evaluationStatus,
      decodedToken.uid
    );

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('ML Telemetry Outcome Error:', error);
    if (error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

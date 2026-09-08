import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { BetaFeedbackCategory, BetaFeedback } from '@/types';
import { getAppEnvironment } from '@/lib/config';

const VALID_CATEGORIES: BetaFeedbackCategory[] = [
  'AUTH',
  'ONBOARDING',
  'LEARNING',
  'PRACTICE',
  'ASSESSMENT',
  'PRACTICAL',
  'RECOMMENDATION',
  'PROFILE',
  'COMPANY',
  'HIRING',
  'PERFORMANCE',
  'SECURITY',
  'OTHER'
];

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
    const { category, issueType, severity, description, affectedFlow } = body;

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ 
        error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` 
      }, { status: 400 });
    }

    if (!description || typeof description !== 'string' || description.trim().length < 5) {
      return NextResponse.json({ error: 'Description must be at least 5 characters.' }, { status: 400 });
    }

    const validSeverities = ['low', 'medium', 'high', 'critical'];
    const assignedSeverity = validSeverities.includes(severity) ? severity : 'medium';

    // Fetch user details
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    const userData = userDoc.data();
    const userRole = userData?.role || 'student';
    const userEmail = userData?.email || decodedToken.email || 'unknown';

    const feedbackDoc: Omit<BetaFeedback, 'id'> = {
      userId: decodedToken.uid,
      userRole,
      userEmail,
      category,
      issueType: issueType || 'general_feedback',
      severity: assignedSeverity,
      description: description.trim(),
      affectedFlow: affectedFlow || 'unspecified',
      environment: getAppEnvironment(),
      timestamp: FieldValue.serverTimestamp(),
      status: 'new'
    };

    const docRef = await adminDb.collection('betaFeedback').add(feedbackDoc);

    return NextResponse.json({
      success: true,
      feedbackId: docRef.id,
      message: 'Thank you. Your beta feedback has been recorded for review.'
    });

  } catch (error: any) {
    console.error('Beta Feedback POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
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

    // Role check - admin only
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    if (userDoc.data()?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    const snap = await adminDb.collection('betaFeedback')
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();

    const feedbacks = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      timestamp: d.data().timestamp?.toDate ? d.data().timestamp.toDate().toISOString() : d.data().timestamp
    }));

    return NextResponse.json({ feedbacks });

  } catch (error: any) {
    console.error('Beta Feedback GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

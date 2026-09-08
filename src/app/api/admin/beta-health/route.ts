import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

function isTestUser(u: any): boolean {
  if (u.isTestData) return true;
  const uid = u.uid || u.id || '';
  const email = u.email || '';
  return uid.startsWith('test_') || uid.startsWith('sim_') || email.includes('test_') || email.includes('@test.com');
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

    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    if (userDoc.data()?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    // 1. Fetch Students & Companies
    const [studentsSnap, companiesSnap] = await Promise.all([
      adminDb.collection('users').where('role', '==', 'student').get(),
      adminDb.collection('users').where('role', '==', 'company').get()
    ]);
    
    const allStudents = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const realStudents = allStudents.filter(u => !isTestUser(u));

    const allCompanies = companiesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const realCompanies = allCompanies.filter(u => !isTestUser(u));
    const realCompanyIds = new Set(realCompanies.map(c => c.id));

    const activatedStudents = realStudents.filter((s: any) => 
      s.selectedRole || (s.skills && s.skills.length > 0) || s.onboardingCompleted
    );

    // 2. Fetch Activity Collections
    const [
      practiceSnap,
      assessSnap,
      practicalSnap,
      learningProgressSnap,
      telemetrySnap,
      companyProfilesSnap,
      challengesSnap,
      applicationsSnap
    ] = await Promise.all([
      adminDb.collection('practiceAttempts').get(),
      adminDb.collection('assessmentAttempts').get(),
      adminDb.collection('practicalTaskAttempts').get(),
      adminDb.collection('learningProgress').get(),
      adminDb.collection('mlTelemetry').get(),
      adminDb.collection('companyProfiles').get(),
      adminDb.collection('companyChallenges').get(),
      adminDb.collection('challengeApplications').get()
    ]);

    const realStudentIds = new Set(realStudents.map(s => s.id));

    // Filter to real student activities
    const practiceAttempts = practiceSnap.docs.map(d => d.data()).filter((a: any) => realStudentIds.has(a.studentId) && !a.isTestData);
    const assessAttempts = assessSnap.docs.map(d => d.data()).filter((a: any) => realStudentIds.has(a.studentId) && !a.isTestData);
    const practicalAttempts = practicalSnap.docs.map(d => d.data()).filter((a: any) => realStudentIds.has(a.studentId) && !a.isTestData);
    const learningProgress = learningProgressSnap.docs.map(d => d.data()).filter((l: any) => realStudentIds.has(l.studentId) && !l.isTestData);

    // Telemetry records
    const telemetryRecords = telemetrySnap.docs.map(d => d.data()).filter((t: any) => 
      realStudentIds.has(t.studentId) && !t.isTestData && t.environment !== 'test'
    );

    // Activity metrics
    const studentMetrics = {
      registeredStudents: realStudents.length,
      activatedStudents: activatedStudents.length,
      learningTopicsStarted: learningProgress.length,
      learningTopicsCompleted: learningProgress.filter((l: any) => l.completed).length,
      practiceStarted: practiceAttempts.length,
      practiceCompleted: practiceAttempts.filter((p: any) => p.status === 'completed' || p.passed !== undefined).length,
      assessmentsStarted: assessAttempts.length,
      assessmentsCompleted: assessAttempts.filter((a: any) => a.status === 'completed' || a.score !== undefined).length,
      practicalTasksStarted: practicalAttempts.length,
      practicalTasksCompleted: practicalAttempts.filter((p: any) => p.status === 'completed').length
    };

    // Recommendation metrics
    const recommendationMetrics = {
      recommendationsGenerated: telemetryRecords.length,
      recommendationsStarted: telemetryRecords.filter((t: any) => t.lifecycleState !== 'RECOMMENDED').length,
      recommendationsCompleted: telemetryRecords.filter((t: any) => 
        ['COMPLETED', 'SCORED', 'OUTCOME_RECORDED', 'WAITING_FOR_EVALUATION'].includes(t.lifecycleState)
      ).length,
      recommendationsScored: telemetryRecords.filter((t: any) => 
        t.lifecycleState === 'SCORED' || (t.actualOutcome && t.actualOutcome.score !== null)
      ).length,
      recommendationsAbandoned: telemetryRecords.filter((t: any) => t.lifecycleState === 'ABANDONED').length
    };

    // Outcomes metrics
    const scoredTelemetry = telemetryRecords.filter((t: any) => t.actualOutcome && t.actualOutcome.score !== null);
    const totalScore = scoredTelemetry.reduce((acc: number, cur: any) => acc + (cur.actualOutcome.score || 0), 0);
    const passedTelemetry = scoredTelemetry.filter((t: any) => t.actualOutcome.passed === true || (t.actualOutcome.score || 0) >= 70);

    const outcomesMetrics = {
      averageScore: scoredTelemetry.length > 0 ? Math.round(totalScore / scoredTelemetry.length) : 0,
      passRate: scoredTelemetry.length > 0 ? Math.round((passedTelemetry.length / scoredTelemetry.length) * 100) : 0,
      completionRate: recommendationMetrics.recommendationsGenerated > 0 
        ? Math.round((recommendationMetrics.recommendationsCompleted / recommendationMetrics.recommendationsGenerated) * 100) 
        : 0,
      progressionRate: realStudents.length > 0 ? Math.round((activatedStudents.length / realStudents.length) * 100) : 0
    };

    // Funnel metrics
    const funnel = [
      { step: 'Registered', count: realStudents.length },
      { step: 'Activated', count: activatedStudents.length },
      { step: 'Started Learning', count: new Set(learningProgress.map((l: any) => l.studentId)).size },
      { step: 'Started Practice', count: new Set(practiceAttempts.map((p: any) => p.studentId)).size },
      { step: 'Received Recommendation', count: new Set(telemetryRecords.map((t: any) => t.studentId)).size },
      { 
        step: 'Completed Task', 
        count: new Set(
          telemetryRecords
            .filter((t: any) => ['COMPLETED', 'SCORED', 'OUTCOME_RECORDED'].includes(t.lifecycleState))
            .map((t: any) => t.studentId)
        ).size 
      },
      { 
        step: 'Received Outcome', 
        count: new Set(scoredTelemetry.map((t: any) => t.studentId)).size 
      }
    ];

    // Company Metrics & Funnel
    const realCompanyProfiles = companyProfilesSnap.docs
      .filter(d => realCompanyIds.has(d.id))
      .map(d => ({ id: d.id, ...d.data() }));
    
    const activeSubscribedCompanies = realCompanyProfiles.filter((cp: any) => cp.subscriptionStatus === 'active');
    
    const realChallenges = challengesSnap.docs
      .filter(d => realCompanyIds.has(d.data().companyId))
      .map(d => ({ id: d.id, ...d.data() }));
    const challengeIds = new Set(realChallenges.map(c => c.id));

    const realApplications = applicationsSnap.docs
      .filter(d => challengeIds.has(d.data().challengeId))
      .map(d => ({ id: d.id, ...d.data() }));

    const companyMetrics = {
      registeredCompanies: realCompanies.length,
      activeSubscribers: activeSubscribedCompanies.length,
      vacanciesCreated: realChallenges.length,
      applicationsReceived: realApplications.length,
      evaluationsCompleted: realApplications.filter((a: any) => a.status === 'evaluated' || a.score !== undefined).length,
      interviewing: realApplications.filter((a: any) => a.status === 'interview' || a.status === 'shortlisted').length,
      hired: realApplications.filter((a: any) => a.status === 'hired' || a.status === 'accepted').length
    };

    const companyFunnel = [
      { step: 'Registered', count: realCompanies.length },
      { step: 'Talent Access', count: activeSubscribedCompanies.length },
      { step: 'Created Vacancy', count: new Set(realChallenges.map((c: any) => c.companyId)).size },
      { step: 'Received Applications', count: new Set(realApplications.map((a: any) => a.companyId)).size },
      { step: 'Evaluated Candidates', count: new Set(realApplications.filter((a: any) => a.status === 'evaluated' || a.score !== undefined).map((a: any) => a.companyId)).size }
    ];

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      studentMetrics,
      companyMetrics,
      recommendationMetrics,
      outcomesMetrics,
      funnel,
      companyFunnel
    });

  } catch (error: any) {
    console.error('Beta Health API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { AdaptiveTaskAssigner } from '@/lib/ml-inference/adaptive-task-assigner';
import { TelemetryService } from '@/lib/ml-telemetry';
import { v4 as uuidv4 } from 'uuid';
import { StudentSkillScore, LearningTopic, PracticeProblem, RecommendedTask, PracticalTask } from '@/types';
import { Assessment, Skill } from '@/lib/adaptive-engine';
import { ShadowEvaluator } from '@/lib/ml-inference/shadow-evaluator';

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

    // 1. Fetch Context in Parallel
    const [
      skillScoresSnap,
      skillsSnap,
      topicsSnap,
      practiceSnap,
      assessmentSnap,
      attemptsSnap,
      practicalTasksSnap,
      practicalAttemptsSnap
    ] = await Promise.all([
      adminDb.collection('skillScores').where('studentId', '==', studentId).get(),
      adminDb.collection('skills').get(),
      adminDb.collection('learningTopics').where('active', '==', true).get(),
      adminDb.collection('practiceProblems').where('active', '==', true).get(),
      adminDb.collection('assessments').where('active', '==', true).get(),
      adminDb.collection('taskAttempts').where('studentId', '==', studentId).get(),
      adminDb.collection('practicalTasks').where('active', '==', true).get(),
      adminDb.collection('practicalTaskAttempts').where('studentId', '==', studentId).get()
    ]);

    const skillScores = skillScoresSnap.docs.map(d => d.data() as StudentSkillScore);
    const skills = skillsSnap.docs.map(d => ({ id: d.id, name: d.data().name } as Skill));
    const learningTopics = topicsSnap.docs.map(d => ({ id: d.id, ...d.data() } as LearningTopic));
    const practiceProblems = practiceSnap.docs.map(d => ({ id: d.id, ...d.data() } as PracticeProblem));
    const assessments = assessmentSnap.docs.map(d => ({ id: d.id, skillId: d.data().skillId, title: d.data().title } as Assessment));
    const practicalTasks = practicalTasksSnap.docs.map(d => ({ id: d.id, ...d.data() } as PracticalTask));
    
    const taskAttemptsList = attemptsSnap.docs.map(d => {
      const data = d.data();
      return {
        taskId: data.taskId,
        skillId: data.skillId,
        passed: data.passed,
        status: data.status,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt
      };
    });

    const practicalAttemptsList = practicalAttemptsSnap.docs.map(d => {
      const data = d.data();
      return {
        taskId: data.taskId,
        skillId: data.skillId,
        status: data.status,
        passed: data.evaluation?.percentage >= 70,
        createdAt: data.startedAt?.toDate ? data.startedAt.toDate().toISOString() : data.startedAt
      };
    });

    const recentAttempts = [...taskAttemptsList, ...practicalAttemptsList];

    const context = {
      skillScores,
      skills,
      learningTopics,
      practiceProblems,
      assessments,
      practicalTasks,
      recentAttempts
    };

    // 2. Generate Recommendations Server-Side
    const allRecs = await AdaptiveTaskAssigner.assignNextTask(studentId, context);
    const topRecs = allRecs.slice(0, 5);

    // 3. Deduplicate and record immutable snapshot
    const thirtyMinsAgoMs = Date.now() - 30 * 60 * 1000;
    const recentRecsSnap = await adminDb.collection('mlTelemetry')
      .where('studentId', '==', studentId)
      .where('lifecycleState', '==', 'RECOMMENDED')
      .limit(50)
      .get();
      
    const recentRecs = recentRecsSnap.docs
      .map(d => d.data())
      .filter(d => {
        const rawTs = d.timestamp || d.generatedAt;
        const ts = rawTs?.toMillis ? rawTs.toMillis() : (rawTs?.toDate ? rawTs.toDate().getTime() : new Date(rawTs).getTime());
        return !isNaN(ts) && ts >= thirtyMinsAgoMs;
      });

    for (const rec of topRecs) {
      // Find if we already recommended this exact task in the last 30 minutes
      const existing = recentRecs.find(r => r.taskId === rec.itemId && r.taskType === rec.type);
      
      if (existing) {
        rec.recommendationId = existing.recommendationId;
      } else {
        const recommendationId = uuidv4();
        rec.recommendationId = recommendationId;
        await TelemetryService.recordRecommendation(
          studentId,
          recommendationId,
          rec.type === 'learning' ? rec.itemId : null,
          rec.skillId,
          rec.itemId,
          rec.type,
          'UNKNOWN', // Could fetch from metadata if needed
          rec.priorityScore,
          rec.reason
        );
      }
      rec.metadata = {
        ...(rec.metadata || {}),
        timestamp: new Date().toISOString(),
        predictionSource: 'DETERMINISTIC_BASELINE',
        baselineVersion: 'deterministic-v1',
        modelVersion: 'NOT_READY'
      };
    }

    // 4. Phase 36: Experimental ML Shadow Evaluation (Read-Only Observation)
    try {
      const shadowRecord = await ShadowEvaluator.evaluateState(
        studentId,
        context,
        allRecs,
        topRecs[0]?.recommendationId
      );
      // Persist shadow evaluation to telemetry marked explicitly with shadow: true
      await TelemetryService.recordShadowEvaluation(shadowRecord);
    } catch (shadowErr) {
      // Fallback: ML failure must NEVER break the student learning flow
      console.warn('[Shadow Evaluation] Experimental ML shadow inference failed. Continuing with deterministic recommendations:', shadowErr);
    }

    return NextResponse.json({ 
      recommendations: topRecs,
      meta: {
        predictionSource: 'DETERMINISTIC_BASELINE',
        baselineVersion: 'deterministic-v1',
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('API /recommendations/generate error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error?.message || String(error)
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { MLTelemetryEvent } from '@/types';
import { verifyBearerToken, requireAdmin, sanitizeApiError, ApiAuthError } from '@/lib/api-auth';

export const dynamic = 'force-dynamic'; // Prevent caching

export async function GET(req: NextRequest) {
  // [C1 FIX] Authenticate and authorize — admin only.
  // Previously this endpoint had ZERO authentication.
  try {
    const { uid } = await verifyBearerToken(req);
    await requireAdmin(uid);
  } catch (error: unknown) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: sanitizeApiError(error) }, { status: error.httpStatus });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  try {
    const snap = await adminDb.collection('mlTelemetry')
      .orderBy('timestamp', 'desc')
      .limit(1000)
      .get();
      
    const now = Date.now();
    const seenRecIds = new Set<string>();
    let duplicateRecIds = 0;
    let missingFeatureSnapshots = 0;
    let missingOutcomes = 0;
    let invalidTimestamps = 0;
    let futureTimestamps = 0;
    let orphanRecords = 0;
    let leakageSuspected = 0;
    let testRecordsCount = 0;
    let genuineRecordsCount = 0;

    const parseTs = (val: any): number => {
      if (!val) return NaN;
      if (val.toMillis) return val.toMillis();
      if (val.toDate) return val.toDate().getTime();
      return new Date(val).getTime();
    };

    snap.docs.forEach(doc => {
      const event = doc.data() as MLTelemetryEvent;

      if (event.isTestData || (event.studentId && event.studentId.startsWith('test_'))) {
        testRecordsCount++;
      } else {
        genuineRecordsCount++;
      }

      // 1. Duplicate recommendationId
      if (event.recommendationId) {
        if (seenRecIds.has(event.recommendationId)) {
          duplicateRecIds++;
        } else {
          seenRecIds.add(event.recommendationId);
        }
      } else {
        orphanRecords++;
      }

      // 2. Missing feature snapshot
      if (!event.featureSnapshot || Object.keys(event.featureSnapshot).length === 0) {
        missingFeatureSnapshots++;
      }

      // 3. Missing outcome when scored or completed
      if (['COMPLETED', 'SCORED', 'OUTCOME_RECORDED'].includes(event.lifecycleState)) {
        if (!event.actualOutcome || (event.lifecycleState === 'SCORED' && event.actualOutcome.score === null)) {
          missingOutcomes++;
        }
      }

      // 4. Timestamps checks
      const genTs = parseTs(event.timestamp || (event as any).generatedAt);
      if (isNaN(genTs) || genTs <= 0) {
        invalidTimestamps++;
      } else if (genTs > now + 60000) {
        futureTimestamps++;
      }

      // 5. Temporal Leakage
      if (event.actualOutcome) {
        const compTs = parseTs((event.actualOutcome as any).completedAt || event.actualOutcome.recordedAt || (event as any).completedAt);
        if (!isNaN(genTs) && !isNaN(compTs) && compTs < genTs) {
          leakageSuspected++;
        }
      }

      // 6. Orphan checks
      if (!event.studentId || !event.taskId || !event.taskType) {
        orphanRecords++;
      }
    });

    const totalRecords = snap.docs.length;
    const warnings: string[] = [];

    if (duplicateRecIds > 0) warnings.push(`Detected ${duplicateRecIds} duplicate recommendationId entries.`);
    if (missingFeatureSnapshots > 0) warnings.push(`Detected ${missingFeatureSnapshots} events missing pre-task featureSnapshots.`);
    if (missingOutcomes > 0) warnings.push(`Detected ${missingOutcomes} completed events missing outcomes.`);
    if (invalidTimestamps > 0) warnings.push(`Detected ${invalidTimestamps} invalid timestamps.`);
    if (futureTimestamps > 0) warnings.push(`Detected ${futureTimestamps} timestamps set in the future.`);
    if (orphanRecords > 0) warnings.push(`Detected ${orphanRecords} orphaned telemetry records.`);
    if (leakageSuspected > 0) warnings.push(`CRITICAL: Detected ${leakageSuspected} temporal leakage instances.`);

    const report = {
      timestamp: new Date().toISOString(),
      sampleSize: totalRecords,
      genuineRecordsCount,
      testRecordsCount,
      metrics: {
        duplicateRecommendationIds: duplicateRecIds,
        missingFeatureSnapshots,
        missingOutcomes,
        invalidTimestamps,
        futureTimestamps,
        orphanRecords,
        potentialLeakageCases: leakageSuspected
      },
      status: leakageSuspected > 0 ? 'CRITICAL_LEAKAGE' : (warnings.length > 0 ? 'WARNING' : 'PASS'),
      warnings,
      message: leakageSuspected > 0 
        ? 'CRITICAL: Temporal leakage detected. Target outcomes precede pre-task features.'
        : (warnings.length > 0 ? 'Data quality warnings detected.' : 'All telemetry data quality checks passed.')
    };

    return NextResponse.json(report);
  } catch (error: any) {
    console.error('Quality Report Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

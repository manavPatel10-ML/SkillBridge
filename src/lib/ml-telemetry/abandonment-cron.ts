import { adminDb as db } from '@/lib/firebase-admin';

export async function cleanupAbandonedRecommendations() {
  console.log("Starting cleanup of abandoned recommendations...");
  let abandonedCount = 0;

  try {
    const now = new Date();
    
    // 1. Clean up stale RECOMMENDED states (> 24 hours old)
    const oneDayAgoMs = now.getTime() - 24 * 60 * 60 * 1000;
    
    const recommendedSnap = await db.collection('mlTelemetry')
      .where('lifecycleState', '==', 'RECOMMENDED')
      .get();
      
    for (const doc of recommendedSnap.docs) {
      const data = doc.data();
      const raw = data.generatedAt || data.timestamp;
      const ts = raw?.toMillis ? raw.toMillis() : (raw?.toDate ? raw.toDate().getTime() : new Date(raw).getTime());
      if (!isNaN(ts) && ts < oneDayAgoMs) {
        await doc.ref.update({
          lifecycleState: 'ABANDONED',
          abandonReason: 'TIMEOUT_NOT_STARTED',
          completedAt: now.toISOString()
        });
        abandonedCount++;
      }
    }

    // 2. Clean up stale STARTED states (> 4 hours old)
    const fourHoursAgoMs = now.getTime() - 4 * 60 * 60 * 1000;
    
    const startedSnap = await db.collection('mlTelemetry')
      .where('lifecycleState', '==', 'STARTED')
      .get();

    for (const doc of startedSnap.docs) {
      const data = doc.data();
      const raw = data.startedAt;
      const ts = raw?.toMillis ? raw.toMillis() : (raw?.toDate ? raw.toDate().getTime() : new Date(raw).getTime());
      if (!isNaN(ts) && ts < fourHoursAgoMs) {
        await doc.ref.update({
          lifecycleState: 'ABANDONED',
          abandonReason: 'TIMEOUT_NOT_COMPLETED',
          completedAt: now.toISOString()
        });
        abandonedCount++;
      }
    }

    console.log(`Successfully marked ${abandonedCount} telemetry records as ABANDONED.`);
  } catch (error) {
    console.error("Error cleaning up abandoned recommendations:", error);
  }
}

// Support direct execution
if (require.main === module) {
  cleanupAbandonedRecommendations().then(() => process.exit(0)).catch(() => process.exit(1));
}

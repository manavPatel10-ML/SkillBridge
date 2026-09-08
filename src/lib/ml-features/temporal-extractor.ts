// Extract and enforce strict temporal boundaries to prevent future information leakage

export function getRecordTimeMs<T extends { createdAt?: any, completedAt?: any, appliedAt?: any }>(record: T): number {
  if (record.completedAt) {
    return typeof record.completedAt === 'number' ? record.completedAt : new Date(record.completedAt).getTime();
  } else if (record.createdAt) {
    return typeof record.createdAt === 'number' ? record.createdAt : new Date(record.createdAt).getTime();
  } else if (record.appliedAt) {
    return typeof record.appliedAt === 'number' ? record.appliedAt : new Date(record.appliedAt).getTime();
  }
  return 0;
}

export function preventDataLeakage<T extends { createdAt?: any, completedAt?: any, appliedAt?: any }>(
  historicalData: T[], 
  predictionTargetTimestamp: number
): T[] {
  return historicalData.filter(record => {
    // Strict less-than prevents using the target task itself
    return getRecordTimeMs(record) < predictionTargetTimestamp;
  });
}

// Deduplicate attempts (keep only the latest complete attempt per unique task)
export function deduplicateAttempts(attempts: any[], uniqueKeyField: string, timeField: string = 'completedAt'): any[] {
  const map = new Map<string, any>();
  for (const att of attempts) {
    const key = att[uniqueKeyField];
    if (!key) continue;
    
    // Ignore incomplete (depends on status field if it exists)
    if (att.status && att.status !== 'completed' && att.status !== 'submitted') continue;
    
    const existing = map.get(key);
    if (!existing) {
      map.set(key, att);
    } else {
      const existingTime = existing[timeField] ? new Date(existing[timeField]).getTime() : 0;
      const attTime = att[timeField] ? new Date(att[timeField]).getTime() : 0;
      if (attTime > existingTime) {
        map.set(key, att); // keep the most recent
      }
    }
  }
  return Array.from(map.values());
}

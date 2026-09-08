import { adminDb as db } from '../src/lib/firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

function isGenuineProductionRecord(r: any): boolean {
  if (r.shadow === true) return false;
  if (r.isSynthetic === true) return false;
  if (r.isTestData === true) return false;
  if (r.environment === 'test' || r.environment === 'development') return false;
  if (typeof r.studentId === 'string' && (r.studentId.startsWith('test_') || r.studentId.startsWith('sim_') || r.studentId.startsWith('synth_'))) return false;
  return true;
}

async function evaluateModel1(records: any[]) {
  const genuineRecords = records.filter(isGenuineProductionRecord);
  const m1Records = genuineRecords.filter(r => r.actualOutcome && r.actualOutcome.score !== null);
  
  const reasons: string[] = [];
  let eligible = true;

  const observations = m1Records.length;
  const uniqueStudents = new Set(m1Records.map(r => r.studentId)).size;
  const uniqueSkills = new Set(m1Records.map(r => r.skillId)).size;
  const uniqueTopics = new Set(m1Records.map(r => r.topicId).filter(Boolean)).size;

  if (observations < 5000) {
    reasons.push(`Insufficient observations (${observations}/5000 required)`);
    eligible = false;
  }
  
  if (uniqueStudents < 50) {
    reasons.push(`Insufficient student diversity (${uniqueStudents}/50 required)`);
    eligible = false;
  }

  const parseTimestamp = (val: any) => {
    if (!val) return NaN;
    if (val.toDate) return val.toDate().getTime();
    return new Date(val).getTime();
  };

  const timestamps = m1Records
    .map(r => parseTimestamp(r.generatedAt || r.timestamp))
    .filter(t => !isNaN(t))
    .sort((a, b) => a - b);

  let temporalCoverageDays = 0;
  if (timestamps.length > 0) {
    const minT = timestamps[0];
    const maxT = timestamps[timestamps.length - 1];
    temporalCoverageDays = (maxT - minT) / (1000 * 60 * 60 * 24);
  }

  if (temporalCoverageDays < 14) {
    reasons.push(`Insufficient temporal coverage (${temporalCoverageDays.toFixed(1)}/14 days required)`);
    eligible = false;
  }

  // Leakage check
  let leakageDetected = false;
  m1Records.forEach(r => {
    const genTime = parseTimestamp(r.generatedAt || r.timestamp);
    const compTime = parseTimestamp(r.completedAt || r.actualOutcome?.completedAt || r.actualOutcome?.recordedAt);
    if (!isNaN(genTime) && !isNaN(compTime)) {
      if (compTime < genTime) {
        leakageDetected = true;
      }
    }
  });

  if (leakageDetected) {
    reasons.push(`Target leakage detected: Outcome timestamp precedes generation timestamp`);
    eligible = false;
  }

  return {
    eligible,
    observations,
    uniqueStudents,
    uniqueTopics,
    uniqueSkills,
    temporalCoverageDays,
    reasons
  };
}

async function evaluateModel2(records: any[]) {
  const genuineRecords = records.filter(isGenuineProductionRecord);
  const m2Records = genuineRecords.filter(r => r.lifecycleState === 'COMPLETED' || r.lifecycleState === 'SCORED');
  
  const reasons: string[] = [];
  let eligible = true;

  const observations = m2Records.length;
  const uniqueStudents = new Set(m2Records.map(r => r.studentId)).size;
  const uniqueSkills = new Set(m2Records.map(r => r.skillId)).size;
  const uniqueTopics = new Set(m2Records.map(r => r.topicId).filter(Boolean)).size;

  if (observations < 1000) {
    reasons.push(`Insufficient completed recommendations (${observations}/1000 required)`);
    eligible = false;
  }
  
  if (uniqueStudents < 50) {
    reasons.push(`Insufficient student diversity (${uniqueStudents}/50 required)`);
    eligible = false;
  }

  return {
    eligible,
    observations,
    uniqueStudents,
    uniqueTopics,
    uniqueSkills,
    reasons
  };
}

async function main() {
  console.log("==========================================");
  console.log("PRODUCTION ML VALIDATION & TRAINING GATE");
  console.log("==========================================");
  
  const snap = await db.collection('mlTelemetry').get();
  const records = snap.docs.map(d => d.data());

  const m1Results = await evaluateModel1(records);
  const m2Results = await evaluateModel2(records);

  console.log("\n--- MODEL 1 (Performance Prediction) ---");
  console.log(`Observations: ${m1Results.observations}`);
  console.log(`Unique Students: ${m1Results.uniqueStudents}`);
  console.log(`Unique Skills: ${m1Results.uniqueSkills}`);
  console.log(`Unique Topics: ${m1Results.uniqueTopics}`);
  console.log(`Temporal Coverage (Days): ${m1Results.temporalCoverageDays.toFixed(1)}`);
  
  if (m1Results.eligible) {
    console.log(`\nStatus: TRAINING_ELIGIBLE`);
    
    // Create Snapshot
    const datasetVersion = `v_${Date.now()}`;
    const m1DataDir = path.join(process.cwd(), 'ml', 'model1', 'data');
    if (!fs.existsSync(m1DataDir)) fs.mkdirSync(m1DataDir, { recursive: true });
    
    fs.writeFileSync(path.join(m1DataDir, `snapshot_${datasetVersion}.json`), JSON.stringify({
      datasetVersion,
      createdAt: new Date().toISOString(),
      modelName: 'Model 1',
      observationCount: m1Results.observations,
      uniqueStudents: m1Results.uniqueStudents,
      timeRange: `${m1Results.temporalCoverageDays.toFixed(1)} days`,
      data: records.filter(r => r.actualOutcome && r.actualOutcome.score !== null)
    }, null, 2));
    
  } else {
    console.log(`\nStatus: NOT_READY`);
    console.log(`Reasons:`);
    m1Results.reasons.forEach(r => console.log(`- ${r}`));
  }

  console.log("\n--- MODEL 2 (Adaptive Assignment) ---");
  console.log(`Observations: ${m2Results.observations}`);
  console.log(`Unique Students: ${m2Results.uniqueStudents}`);
  console.log(`Unique Skills: ${m2Results.uniqueSkills}`);
  console.log(`Unique Topics: ${m2Results.uniqueTopics}`);

  if (m2Results.eligible) {
    console.log(`\nStatus: TRAINING_ELIGIBLE`);
    
    // Create Snapshot
    const datasetVersion = `v_${Date.now()}`;
    const m2DataDir = path.join(process.cwd(), 'ml', 'model2', 'data');
    if (!fs.existsSync(m2DataDir)) fs.mkdirSync(m2DataDir, { recursive: true });
    
    fs.writeFileSync(path.join(m2DataDir, `snapshot_${datasetVersion}.json`), JSON.stringify({
      datasetVersion,
      createdAt: new Date().toISOString(),
      modelName: 'Model 2',
      observationCount: m2Results.observations,
      uniqueStudents: m2Results.uniqueStudents,
      data: records.filter(r => r.lifecycleState === 'COMPLETED' || r.lifecycleState === 'SCORED')
    }, null, 2));

  } else {
    console.log(`\nStatus: NOT_READY`);
    console.log(`Reasons:`);
    m2Results.reasons.forEach(r => console.log(`- ${r}`));
  }
}

main().then(() => process.exit(0)).catch(console.error);

import * as assert from 'assert';

function evaluateModel1(records: any[]) {
  const m1Records = records.filter(r => r.actualOutcome && r.actualOutcome.score !== null);
  
  const reasons: string[] = [];
  let eligible = true;

  const observations = m1Records.length;
  const uniqueStudents = new Set(m1Records.map(r => r.studentId)).size;

  if (observations < 5000) {
    reasons.push(`Insufficient observations (${observations}/5000 required)`);
    eligible = false;
  }
  
  if (uniqueStudents < 50) {
    reasons.push(`Insufficient student diversity (${uniqueStudents}/50 required)`);
    eligible = false;
  }

  const timestamps = m1Records.map(r => new Date(r.generatedAt).getTime()).sort();
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

  let leakageDetected = false;
  m1Records.forEach(r => {
    const genTime = new Date(r.generatedAt).getTime();
    if (r.actualOutcome && r.completedAt) {
      const compTime = new Date(r.completedAt).getTime();
      if (compTime < genTime) {
        leakageDetected = true;
      }
    }
  });

  if (leakageDetected) {
    reasons.push(`Target leakage detected: Outcome timestamp precedes generation timestamp`);
    eligible = false;
  }

  return { eligible, reasons };
}

function runTests() {
  console.log("Running Training Gate Tests...");

  // 1. Insufficient observations
  const fewRecords = Array.from({ length: 100 }).map((_, i) => ({
    studentId: `student_${i % 60}`,
    generatedAt: new Date().toISOString(),
    completedAt: new Date(Date.now() + 1000).toISOString(),
    actualOutcome: { score: 80 }
  }));
  const res1 = evaluateModel1(fewRecords);
  assert.strictEqual(res1.eligible, false);
  assert.ok(res1.reasons.some(r => r.includes('Insufficient observations')));

  // 2. Insufficient students
  const manyRecordsSameStudent = Array.from({ length: 5000 }).map((_, i) => ({
    studentId: `student_1`,
    generatedAt: new Date().toISOString(),
    completedAt: new Date(Date.now() + 1000).toISOString(),
    actualOutcome: { score: 80 }
  }));
  const res2 = evaluateModel1(manyRecordsSameStudent);
  assert.strictEqual(res2.eligible, false);
  assert.ok(res2.reasons.some(r => r.includes('student diversity')));

  // 3. Leakage detected
  const leakageRecords = Array.from({ length: 5000 }).map((_, i) => ({
    studentId: `student_${i % 60}`,
    generatedAt: new Date().toISOString(),
    completedAt: new Date(Date.now() - 1000).toISOString(), // Completed before generated
    actualOutcome: { score: 80 }
  }));
  const res3 = evaluateModel1(leakageRecords);
  assert.strictEqual(res3.eligible, false);
  assert.ok(res3.reasons.some(r => r.includes('Target leakage detected')));

  // 4. Valid data
  const validRecords = Array.from({ length: 5000 }).map((_, i) => ({
    studentId: `student_${i % 60}`,
    generatedAt: new Date(Date.now() - (15 * 24 * 60 * 60 * 1000)).toISOString(), // 15 days ago
    completedAt: new Date(Date.now() - (14 * 24 * 60 * 60 * 1000)).toISOString(),
    actualOutcome: { score: 80 }
  }));
  // Push one recent record to ensure > 14 days temporal coverage
  validRecords.push({
    studentId: `student_99`,
    generatedAt: new Date().toISOString(),
    completedAt: new Date(Date.now() + 1000).toISOString(),
    actualOutcome: { score: 90 }
  });
  
  const res4 = evaluateModel1(validRecords);
  assert.strictEqual(res4.eligible, true);
  assert.strictEqual(res4.reasons.length, 0);

  console.log("All training gate logic tests passed.");
}

runTests();

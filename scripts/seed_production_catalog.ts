import fs from 'fs';
import path from 'path';
import { 
  CATALOG_ROLES, 
  CATALOG_SKILLS, 
  CATALOG_LEARNING_TOPICS, 
  CATALOG_PRACTICE_PROBLEMS, 
  CATALOG_ASSESSMENTS, 
  CATALOG_PRACTICAL_TASKS 
} from '../src/lib/content-catalog';

const configPath = path.join(process.env.USERPROFILE || '', '.config', 'configstore', 'firebase-tools.json');
if (!fs.existsSync(configPath)) {
  console.error('No firebase-tools.json found at:', configPath);
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
let token = config.tokens.access_token;
const refreshToken = config.tokens.refresh_token;

async function ensureFreshToken(): Promise<string> {
  // Test current token
  try {
    const res = await fetch('https://firestore.googleapis.com/v1/projects/skillbridge-4101d/databases/(default)/documents/skills', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status === 200) {
      return token;
    }
  } catch (e) {}

  // Refresh
  console.log('Refreshing OAuth access token...');
  const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho85qd6.apps.googleusercontent.com',
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });
  const refreshData = await refreshRes.json();
  if (!refreshData.access_token) {
    throw new Error('Token refresh failed: ' + JSON.stringify(refreshData));
  }
  token = refreshData.access_token;
  return token;
}

function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) 
      ? { integerValue: val.toString() } 
      : { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function toFirestoreFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    fields[k] = toFirestoreValue(v);
  }
  return fields;
}

async function writeDoc(documentPath: string, data: Record<string, any>) {
  const url = `https://firestore.googleapis.com/v1/projects/skillbridge-4101d/databases/(default)/documents/${documentPath}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields: toFirestoreFields(data) })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to write ${documentPath} [${res.status}]: ${errText}`);
  }
}

async function batchProcess<T>(items: T[], chunkSize: number, fn: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    await Promise.all(chunk.map(fn));
    process.stdout.write(`.`);
  }
  console.log(' Done.');
}

async function main() {
  console.log("==================================================");
  console.log("PROVISIONING INITIAL REAL LEARNING CATALOG");
  console.log("Target: Firestore Production (skillbridge-4101d)");
  console.log("==================================================\n");

  await ensureFreshToken();
  const timestamp = new Date().toISOString();

  // 1. ROLES (3)
  console.log(`1. Seeding ${CATALOG_ROLES.length} Career Roles...`);
  for (const role of CATALOG_ROLES) {
    await writeDoc(`roles/${role.id}`, {
      title: role.title,
      description: role.description,
      requiredSkillIds: role.requiredSkillIds,
      active: role.active,
      updatedAt: timestamp,
      seededAt: timestamp
    });
  }
  console.log(`   ✓ All ${CATALOG_ROLES.length} roles provisioned.`);

  // 2. SKILLS (10)
  console.log(`\n2. Seeding ${CATALOG_SKILLS.length} Skills...`);
  for (const skill of CATALOG_SKILLS) {
    await writeDoc(`skills/${skill.id}`, {
      name: skill.name,
      category: skill.category,
      description: skill.description,
      active: skill.active,
      hasCatalog: true,
      updatedAt: timestamp,
      seededAt: timestamp
    });
  }
  console.log(`   ✓ All ${CATALOG_SKILLS.length} skills provisioned.`);

  // 3. LEARNING TOPICS (16)
  console.log(`\n3. Seeding ${CATALOG_LEARNING_TOPICS.length} Learning Topics...`);
  for (const topic of CATALOG_LEARNING_TOPICS) {
    await writeDoc(`learningTopics/${topic.id}`, {
      skillId: topic.skillId,
      topic: topic.topic,
      title: topic.title,
      overview: topic.overview,
      concepts: topic.concepts,
      examples: topic.examples,
      commonMistakes: topic.commonMistakes,
      order: topic.order,
      prerequisiteTopicId: topic.prerequisiteTopicId || null,
      active: topic.active,
      updatedAt: timestamp,
      seededAt: timestamp
    });
  }
  console.log(`   ✓ All ${CATALOG_LEARNING_TOPICS.length} learning topics provisioned.`);

  // 4. PRACTICE PROBLEMS (128) and TEST CASES (256+)
  console.log(`\n4. Seeding ${CATALOG_PRACTICE_PROBLEMS.length} Practice Problems & Test Cases...`);
  let testCasesWritten = 0;
  await batchProcess(CATALOG_PRACTICE_PROBLEMS, 10, async (problem) => {
    await writeDoc(`practiceProblems/${problem.id}`, {
      skillId: problem.skillId,
      topic: problem.topic,
      title: problem.title,
      difficulty: problem.difficulty,
      description: problem.description,
      examples: problem.examples,
      constraints: problem.constraints,
      expectedOutput: problem.expectedOutput,
      allowedLanguages: problem.allowedLanguages,
      active: problem.active,
      updatedAt: timestamp,
      seededAt: timestamp
    });

    // Write subcollection testCases
    for (const tc of problem.testCases) {
      await writeDoc(`practiceProblems/${problem.id}/testCases/${tc.id}`, {
        problemId: tc.problemId,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        isHidden: tc.isHidden,
        order: tc.order,
        active: true
      });
      testCasesWritten++;
    }
  });
  console.log(`   ✓ ${CATALOG_PRACTICE_PROBLEMS.length} problems and ${testCasesWritten} test cases provisioned.`);

  // 5. ASSESSMENTS (16) & QUESTIONS (112)
  console.log(`\n5. Seeding ${CATALOG_ASSESSMENTS.length} Diagnostic Assessments & Questions...`);
  let questionsWritten = 0;
  for (const assessment of CATALOG_ASSESSMENTS) {
    await writeDoc(`assessments/${assessment.id}`, {
      skillId: assessment.skillId,
      title: assessment.title,
      description: assessment.description,
      difficulty: assessment.difficulty,
      totalQuestions: assessment.totalQuestions,
      passingScore: assessment.passingScore,
      active: assessment.active,
      updatedAt: timestamp,
      seededAt: timestamp
    });

    for (const q of assessment.questions) {
      await writeDoc(`assessmentQuestions/${q.id}`, {
        assessmentId: q.assessmentId,
        skillId: q.skillId,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: q.difficulty,
        points: q.points,
        active: q.active,
        updatedAt: timestamp,
        seededAt: timestamp
      });
      questionsWritten++;
    }
  }
  console.log(`   ✓ ${CATALOG_ASSESSMENTS.length} assessments and ${questionsWritten} questions provisioned.`);

  // 6. PRACTICAL TASKS (12)
  console.log(`\n6. Seeding ${CATALOG_PRACTICAL_TASKS.length} Practical Tasks...`);
  for (const task of CATALOG_PRACTICAL_TASKS) {
    await writeDoc(`practicalTasks/${task.id}`, {
      skillId: task.skillId,
      title: task.title,
      description: task.description,
      difficulty: task.difficulty,
      durationMinutes: task.durationMinutes,
      instructions: task.instructions,
      requirements: task.requirements,
      submissionTypes: task.submissionTypes,
      evaluationCriteria: task.evaluationCriteria,
      active: task.active,
      updatedAt: timestamp,
      seededAt: timestamp
    });
  }
  console.log(`   ✓ All ${CATALOG_PRACTICAL_TASKS.length} practical tasks provisioned.`);

  console.log("\n==================================================");
  console.log("CATALOG PROVISIONING COMPLETE & PRODUCTION-READY!");
  console.log("==================================================");
}

main().catch(console.error);

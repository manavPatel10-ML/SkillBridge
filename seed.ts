import { adminDb } from './src/lib/firebase-admin';

async function seed() {
  const problemRef = adminDb.collection('practiceProblems').doc('test-prob');
  await problemRef.set({
    title: 'Test Problem',
    difficulty: 'easy',
    active: true,
    skillId: 'test-skill',
    allowedLanguages: ['python', 'javascript']
  });

  const testCasesRef = problemRef.collection('testCases');
  await testCasesRef.doc('tc1').set({
    input: 'test1',
    expectedOutput: 'output1',
    isHidden: false,
    order: 1
  });

  await testCasesRef.doc('tc2').set({
    input: 'test2',
    expectedOutput: 'output2',
    isHidden: true,
    order: 2
  });

  console.log('Seeded test-prob');
}

seed().catch(console.error);

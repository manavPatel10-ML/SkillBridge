import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { executeCode } from '@/lib/piston';
import { PracticeProblem, TestCase, PracticeAttempt } from '@/types';

export async function POST(req: NextRequest) {
  try {
    // 1. Authorization
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

    // 2. Parse Request
    const body = await req.json();
    const { problemId, language, sourceCode } = body;

    if (!problemId || !language || typeof sourceCode !== 'string') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (sourceCode.length > 50000) { // arbitrary safe limit
      return NextResponse.json({ error: 'Source code too large' }, { status: 400 });
    }

    if (!['python', 'javascript'].includes(language)) {
      return NextResponse.json({ error: 'Unsupported language' }, { status: 400 });
    }

    // 3. Fetch Problem
    const problemSnap = await adminDb.collection('practiceProblems').doc(problemId).get();
    if (!problemSnap.exists) {
      return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
    }
    const problem = { id: problemSnap.id, ...problemSnap.data() } as PracticeProblem;

    if (!problem.active) {
      return NextResponse.json({ error: 'Problem is inactive' }, { status: 400 });
    }

    if (problem.allowedLanguages && !problem.allowedLanguages.includes(language)) {
      return NextResponse.json({ error: 'Language not allowed for this problem' }, { status: 400 });
    }

    // 4. Fetch Test Cases
    const testCasesSnap = await adminDb.collection(`practiceProblems/${problemId}/testCases`).orderBy('order').get();
    const testCases: TestCase[] = testCasesSnap.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as TestCase[];

    // Fallback if no specific test cases exist yet, use the legacy expectedOutput as a single test case
    let finalTestCases = testCases;
    if (finalTestCases.length === 0) {
      finalTestCases = [{
        id: 'legacy-1',
        problemId: problem.id as string,
        input: '',
        expectedOutput: problem.expectedOutput,
        isHidden: false,
        order: 1
      }];
    }

    // 5. Execution Loop
    let passedTests = 0;
    let resultStatus: PracticeAttempt['resultStatus'] = 'Accepted';
    let executionTimeMs = 0;
    let firstErrorLog = '';

    for (const testCase of finalTestCases) {
      const startTime = Date.now();
      const execution = await executeCode(language, sourceCode, testCase.input);
      const duration = Date.now() - startTime;
      executionTimeMs = Math.max(executionTimeMs, duration);

      // Check Compilation / Syntax Errors
      if (execution.compile && execution.compile.code !== 0) {
        resultStatus = 'Compilation Error';
        firstErrorLog = execution.compile.stderr || execution.compile.output;
        break;
      }

      // Check Runtime Errors & Time Limits
      if (execution.run.code !== 0) {
        if (execution.run.signal === 'SIGKILL' || execution.run.signal === 'SIGTERM') {
          resultStatus = 'Time Limit Exceeded';
        } else {
          resultStatus = 'Runtime Error';
          firstErrorLog = execution.run.stderr || execution.run.output;
        }
        break;
      }

      // Check Output Correctness (normalize trimming)
      const actualOutput = execution.run.stdout.trim();
      const expectedOut = testCase.expectedOutput.trim();

      if (actualOutput === expectedOut) {
        passedTests++;
      } else {
        resultStatus = 'Wrong Answer';
        // We only provide output differences for public test cases
        if (!testCase.isHidden) {
          firstErrorLog = `Expected:\n${expectedOut}\n\nGot:\n${actualOutput}`;
        } else {
          firstErrorLog = 'Failed on a hidden test case.';
        }
        break;
      }
    }

    // 6. Persistence
    const attemptData: Omit<PracticeAttempt, 'id'> = {
      studentId,
      problemId: problem.id as string,
      skillId: problem.skillId,
      submittedCode: sourceCode,
      passed: resultStatus === 'Accepted',
      language,
      resultStatus,
      passedTests,
      totalTests: finalTestCases.length,
      executionTimeMs,
      errorLog: firstErrorLog.substring(0, 1000), // Trim to safe length
      createdAt: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection('practiceAttempts').add(attemptData);

    // 7. Return sanitized response
    return NextResponse.json({
      attemptId: docRef.id,
      passed: attemptData.passed,
      resultStatus: attemptData.resultStatus,
      passedTests: attemptData.passedTests,
      totalTests: attemptData.totalTests,
      executionTimeMs: attemptData.executionTimeMs,
      errorLog: attemptData.errorLog
    });

  } catch (error: any) {
    console.error('Execution API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

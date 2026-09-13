import { preventDataLeakage, deduplicateAttempts } from './temporal-extractor';

function assert(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

export function runFeatureTests() {
    console.log("Running Temporal Extractor Tests...");
    
    const t0 = 1000000;
    
    // Test 1: Practice Filtering (Leakage Prevention)
    const practices = [
        {
            id: 'p1', studentId: 's1', skillId: 'sk1',
            completedAt: new Date(t0 - 5000).toISOString(),
            score: 90, passed: true,
            taskId: 't1', type: 'practice', attemptsCount: 1,
            timeSpentSeconds: 120
        }, // Valid
        {
            id: 'p2', studentId: 's1', skillId: 'sk1',
            completedAt: new Date(t0).toISOString(), // Exactly T0 - should be excluded
            score: 100, passed: true,
            taskId: 't2', type: 'practice', attemptsCount: 2,
            timeSpentSeconds: 150
        } // Leakage
    ];
    
    const safePractices = preventDataLeakage(practices, t0);
    assert(safePractices.length === 1, "Only one practice attempt should remain");
    assert(safePractices[0].id === 'p1', "Only the strictly past practice should remain");

    // Test 2: Deduplication
    const duplicates = [
        {
            id: 'd1', problemId: 'prob1', status: 'completed',
            completedAt: new Date(t0 - 10000).toISOString()
        },
        {
            id: 'd2', problemId: 'prob1', status: 'completed',
            completedAt: new Date(t0 - 5000).toISOString() // more recent
        },
        {
            id: 'd3', problemId: 'prob2', status: 'completed',
            completedAt: new Date(t0 - 2000).toISOString()
        }
    ];

    const deduped = deduplicateAttempts(duplicates, 'problemId', 'completedAt');
    assert(deduped.length === 2, "Should have 2 unique problem attempts");
    const p1Attempt = deduped.find((a: any) => a.problemId === 'prob1');
    assert(p1Attempt?.id === 'd2', "Should keep the most recent attempt for prob1");
    
    console.log("All Temporal Extractor tests passed!");
}

if (require.main === module) {
    runFeatureTests();
}

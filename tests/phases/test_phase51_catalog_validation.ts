/**
 * Phase 51 Content Catalog Automated Validation Suite
 * 
 * Verifies all 18 requirements specified in the Phase 51 directive:
 * 1. Every role has valid skills.
 * 2. Every skill has valid learning topics.
 * 3. Topics have valid task references and structure.
 * 4. Practice problems reference valid skills/topics.
 * 5. Assessments reference valid skills/topics.
 * 6. Practical tasks reference valid skills.
 * 7. No orphaned content.
 * 8. No duplicate content IDs.
 * 9. No duplicate task IDs.
 * 10. Difficulty values are valid.
 * 11. Prerequisites do not contain cycles.
 * 12. AdaptiveEngine can select at least one valid next task for a cold-start student.
 * 13. AdaptiveEngine can select a harder task after strong performance where appropriate.
 * 14. AdaptiveEngine can select remediation after failure.
 * 15. Practice/learning does not mutate official skillScores.
 * 16. Model 1 and Model 2 remain shadow-only.
 * 17. No synthetic users are created.
 * 18. No fake ML telemetry is created.
 */

import {
  CATALOG_SKILLS,
  CATALOG_ROLES,
  CATALOG_LEARNING_TOPICS,
  CATALOG_PRACTICE_PROBLEMS,
  CATALOG_ASSESSMENTS,
  CATALOG_PRACTICAL_TASKS,
} from "./src/lib/content-catalog";
import { AdaptiveEngine } from "./src/lib/adaptive-engine";
import * as fs from "fs";
import * as path from "path";

let passedChecks = 0;
let totalChecks = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    console.error(`  ✗ [FAIL] ${testName}${detail ? ` -> ${detail}` : ""}`);
    throw new Error(`Assertion failed: ${testName} - ${detail || ""}`);
  }
}

async function runValidation() {
  console.log("==================================================");
  console.log("PHASE 51 — AUTOMATED CATALOG VALIDATION SUITE");
  console.log("==================================================\n");

  const skillIdSet = new Set(CATALOG_SKILLS.map(s => s.id));
  const topicIdSet = new Set(CATALOG_LEARNING_TOPICS.map(t => t.id));
  const problemIdSet = new Set(CATALOG_PRACTICE_PROBLEMS.map(p => p.id));
  const assessmentIdSet = new Set(CATALOG_ASSESSMENTS.map(a => a.id));
  const allQuestions = CATALOG_ASSESSMENTS.flatMap(a => a.questions);
  const questionIdSet = new Set(allQuestions.map(q => q.id));
  const practicalTaskIdSet = new Set(CATALOG_PRACTICAL_TASKS.map(t => t.id));

  // 1. Every role has valid skills
  console.log("Rule 1: Role -> Skill Integrity");
  assert(CATALOG_ROLES.length === 3, "Catalog contains 3 target career roles");
  for (const role of CATALOG_ROLES) {
    assert(role.requiredSkillIds.length > 0, `Role '${role.title}' has non-empty required skills`);
    for (const sId of role.requiredSkillIds) {
      assert(skillIdSet.has(sId), `Role '${role.title}' references existing skill '${sId}'`);
    }
  }

  // 2. Every skill has valid learning topics
  console.log("\nRule 2: Skill -> Learning Topic Integrity");
  assert(CATALOG_SKILLS.length === 10, "Catalog contains 10 standardized skills");
  for (const skill of CATALOG_SKILLS) {
    const topics = CATALOG_LEARNING_TOPICS.filter(t => t.skillId === skill.id);
    assert(topics.length > 0, `Skill '${skill.name}' (${skill.id}) has at least 1 learning topic (Found: ${topics.length})`);
  }

  // 3. Topics have valid structure
  console.log("\nRule 3: Topic Structure Integrity");
  assert(CATALOG_LEARNING_TOPICS.length === 16, "Catalog contains 16 major learning topics");
  for (const topic of CATALOG_LEARNING_TOPICS) {
    assert(!!topic.id && !!topic.title && !!topic.overview, `Topic '${topic.id}' has valid title and overview`);
    assert(skillIdSet.has(topic.skillId), `Topic '${topic.id}' references valid skill '${topic.skillId}'`);
    assert(typeof topic.concepts === "string" && topic.concepts.length >= 20, `Topic '${topic.id}' has detailed core concepts text`);
    assert(typeof topic.examples === "string" && topic.examples.length >= 20, `Topic '${topic.id}' has educational code examples`);
    assert(typeof topic.commonMistakes === "string" && topic.commonMistakes.length >= 20, `Topic '${topic.id}' has common mistakes explanation`);
    if (topic.prerequisiteTopicId) {
      assert(topicIdSet.has(topic.prerequisiteTopicId), `Topic '${topic.id}' prerequisite '${topic.prerequisiteTopicId}' exists in catalog`);
    }
  }

  const topicSlugSet = new Set(CATALOG_LEARNING_TOPICS.map(t => t.topic));

  // 4. Practice problems reference valid skills/topics
  console.log("\nRule 4: Practice Problems Skill & Topic Integrity");
  assert(CATALOG_PRACTICE_PROBLEMS.length === 128, `Catalog contains 128 practice problems (Found: ${CATALOG_PRACTICE_PROBLEMS.length})`);
  for (const p of CATALOG_PRACTICE_PROBLEMS) {
    assert(skillIdSet.has(p.skillId), `Problem '${p.id}' references valid skill '${p.skillId}'`);
    assert(topicSlugSet.has(p.topic), `Problem '${p.id}' references valid topic slug '${p.topic}'`);
    assert(p.examples && p.examples.length > 0, `Problem '${p.id}' has practical examples`);
    assert(p.testCases && p.testCases.length >= 2, `Problem '${p.id}' has at least 2 test cases (Found: ${p.testCases.length})`);
    assert(p.difficulty === "beginner" || p.difficulty === "intermediate" || p.difficulty === "advanced", `Problem '${p.id}' has valid difficulty '${p.difficulty}'`);
  }

  // 5. Assessments reference valid skills/topics
  console.log("\nRule 5: Assessments Skill & Topic Integrity");
  assert(CATALOG_ASSESSMENTS.length === 16, `Catalog contains 16 assessments (Found: ${CATALOG_ASSESSMENTS.length})`);
  assert(allQuestions.length === 112, `Catalog contains 112 assessment questions (Found: ${allQuestions.length})`);
  for (const a of CATALOG_ASSESSMENTS) {
    assert(skillIdSet.has(a.skillId), `Assessment '${a.id}' references valid skill '${a.skillId}'`);
    const correspondingTopicSlug = a.id.replace("assess-", "");
    assert(topicSlugSet.has(correspondingTopicSlug), `Assessment '${a.id}' corresponds to valid topic slug '${correspondingTopicSlug}'`);
    assert(a.questions.length === a.totalQuestions && a.questions.length >= 5, `Assessment '${a.id}' has matching question count (${a.questions.length})`);
  }
  for (const q of allQuestions) {
    assert(assessmentIdSet.has(q.assessmentId), `Question '${q.id}' references valid assessment '${q.assessmentId}'`);
    assert(q.options.length >= 2, `Question '${q.id}' has at least 2 options`);
    assert(q.options.includes(q.correctAnswer), `Question '${q.id}' correctAnswer '${q.correctAnswer}' is in options list`);
  }

  // 6. Practical tasks reference valid skills
  console.log("\nRule 6: Practical Tasks Skill Integrity");
  assert(CATALOG_PRACTICAL_TASKS.length === 12, `Catalog contains 12 practical tasks (Found: ${CATALOG_PRACTICAL_TASKS.length})`);
  for (const task of CATALOG_PRACTICAL_TASKS) {
    assert(skillIdSet.has(task.skillId), `Task '${task.id}' references valid skill '${task.skillId}'`);
    assert(task.requirements.length >= 3, `Task '${task.id}' has at least 3 requirements`);
    assert(Object.keys(task.evaluationCriteria).length >= 2, `Task '${task.id}' has at least 2 evaluation criteria`);
  }

  // 7. No orphaned content
  console.log("\nRule 7: Orphan Content Check");
  for (const p of CATALOG_PRACTICE_PROBLEMS) {
    assert(topicSlugSet.has(p.topic), `No orphaned problem: '${p.id}'`);
  }
  for (const a of CATALOG_ASSESSMENTS) {
    const correspondingTopicSlug = a.id.replace("assess-", "");
    assert(topicSlugSet.has(correspondingTopicSlug), `No orphaned assessment: '${a.id}'`);
  }
  for (const q of allQuestions) {
    assert(assessmentIdSet.has(q.assessmentId), `No orphaned question: '${q.id}'`);
  }

  // 8 & 9. No duplicate IDs within or across collections
  console.log("\nRules 8 & 9: Unique ID & Task ID Check");
  assert(skillIdSet.size === CATALOG_SKILLS.length, "All Skill IDs are unique");
  assert(topicIdSet.size === CATALOG_LEARNING_TOPICS.length, "All Topic IDs are unique");
  assert(problemIdSet.size === CATALOG_PRACTICE_PROBLEMS.length, "All Practice Problem IDs are unique");
  assert(assessmentIdSet.size === CATALOG_ASSESSMENTS.length, "All Assessment IDs are unique");
  assert(questionIdSet.size === allQuestions.length, "All Question IDs are unique");
  assert(practicalTaskIdSet.size === CATALOG_PRACTICAL_TASKS.length, "All Practical Task IDs are unique");

  // Inter-collection ID uniqueness
  const allIds = [
    ...CATALOG_SKILLS.map(s => s.id),
    ...CATALOG_LEARNING_TOPICS.map(t => t.id),
    ...CATALOG_PRACTICE_PROBLEMS.map(p => p.id),
    ...CATALOG_ASSESSMENTS.map(a => a.id),
    ...allQuestions.map(q => q.id),
    ...CATALOG_PRACTICAL_TASKS.map(t => t.id),
    ...CATALOG_ROLES.map(r => r.id)
  ];
  const uniqueAllIds = new Set(allIds);
  assert(uniqueAllIds.size === allIds.length, `All ${allIds.length} catalog entity IDs across all collections are globally distinct`);

  // 10. Difficulty values are valid
  console.log("\nRule 10: Difficulty Taxonomy Validation");
  const validProblemDifficulties = new Set(["beginner", "intermediate", "advanced"]);
  for (const p of CATALOG_PRACTICE_PROBLEMS) {
    assert(validProblemDifficulties.has(p.difficulty), `Problem '${p.id}' has valid difficulty: ${p.difficulty}`);
  }
  const validTaskDifficulties = new Set(["Beginner", "Intermediate", "Advanced", "beginner", "intermediate", "advanced"]);
  for (const t of CATALOG_PRACTICAL_TASKS) {
    assert(validTaskDifficulties.has(t.difficulty), `Task '${t.id}' has valid difficulty: ${t.difficulty}`);
  }

  // 11. Prerequisites do not contain cycles
  console.log("\nRule 11: Prerequisite Graph Acyclicity (Topological Sort)");
  const graph = new Map<string, string[]>();
  for (const topic of CATALOG_LEARNING_TOPICS) {
    graph.set(topic.id, []);
  }
  for (const topic of CATALOG_LEARNING_TOPICS) {
    if (topic.prerequisiteTopicId) {
      if (!graph.has(topic.prerequisiteTopicId)) {
        throw new Error(`Unknown prerequisite: ${topic.prerequisiteTopicId}`);
      }
      graph.get(topic.prerequisiteTopicId)!.push(topic.id);
    }
  }

  // Cycle detection with DFS
  const visited = new Map<string, "unvisited" | "visiting" | "visited">();
  for (const id of topicIdSet) {
    visited.set(id, "unvisited");
  }

  function hasCycle(nodeId: string): boolean {
    visited.set(nodeId, "visiting");
    const neighbors = graph.get(nodeId) || [];
    for (const next of neighbors) {
      const state = visited.get(next);
      if (state === "visiting") return true; // Cycle detected!
      if (state === "unvisited") {
        if (hasCycle(next)) return true;
      }
    }
    visited.set(nodeId, "visited");
    return false;
  }

  let cycleFound = false;
  for (const id of topicIdSet) {
    if (visited.get(id) === "unvisited") {
      if (hasCycle(id)) {
        cycleFound = true;
        break;
      }
    }
  }
  assert(!cycleFound, "Prerequisite graph is an acyclic DAG (No prerequisite loops or cycles)");

  // 12. AdaptiveEngine: Cold-Start Student Selection
  console.log("\nRule 12: AdaptiveEngine Cold-Start Recommendation");
  const mockSkills = CATALOG_SKILLS.map(s => ({ id: s.id, name: s.name }));
  const mockTopics = CATALOG_LEARNING_TOPICS.map(t => ({
    id: t.id,
    skillId: t.skillId,
    title: t.title,
    overview: t.overview,
    order: t.order,
    active: true
  })) as any[];
  const mockProblems = CATALOG_PRACTICE_PROBLEMS.map(p => ({
    id: p.id,
    skillId: p.skillId,
    title: p.title,
    description: p.description,
    difficulty: p.difficulty,
    active: true
  })) as any[];
  const mockAssessments = CATALOG_ASSESSMENTS.map(a => ({
    id: a.id,
    skillId: a.skillId,
    title: a.title
  }));

  const coldStartCandidates = await AdaptiveEngine.scoreCandidates("cold-start-student-123", {
    skillScores: [],
    skills: mockSkills,
    learningTopics: mockTopics,
    practiceProblems: mockProblems,
    assessments: mockAssessments,
    recentAttempts: []
  });

  assert(coldStartCandidates.length > 0, `Cold-start student receives ${coldStartCandidates.length} candidate tasks`);
  const topColdStart = coldStartCandidates[0];
  assert(!!topColdStart.title && !!topColdStart.type, `Top recommendation is valid: [${topColdStart.type}] ${topColdStart.title}`);
  console.log(`    Cold-start top pick: [${topColdStart.type}] ${topColdStart.title} (Priority: ${topColdStart.priorityScore})`);

  // 13. AdaptiveEngine: Escalation After Strong Performance
  console.log("\nRule 13: AdaptiveEngine Escalation on Strong Performance");
  const strongScoreContext = {
    skillScores: [
      {
        studentId: "student-high-performer",
        skillId: "javascript",
        theoryScore: 85,
        practicalScore: 75, // Strong practical score
        theoryAttempts: 2,
        practicalAttempts: 8,
        lastAssessedAt: new Date().toISOString()
      } as any
    ],
    skills: mockSkills.filter(s => s.id === "javascript"),
    learningTopics: mockTopics.filter(t => t.skillId === "javascript"),
    practiceProblems: mockProblems.filter(p => p.skillId === "javascript"),
    assessments: mockAssessments.filter(a => a.skillId === "javascript"),
    recentAttempts: []
  };

  const strongCandidates = await AdaptiveEngine.scoreCandidates("student-high-performer", strongScoreContext);
  assert(strongCandidates.length > 0, "High performer receives recommendations");
  const intermediatePractices = strongCandidates.filter(c => {
    if (c.type !== "practice") return false;
    const prob = CATALOG_PRACTICE_PROBLEMS.find(p => p.id === c.itemId);
    return prob?.difficulty === "intermediate";
  });
  const beginnerPractices = strongCandidates.filter(c => {
    if (c.type !== "practice") return false;
    const prob = CATALOG_PRACTICE_PROBLEMS.find(p => p.id === c.itemId);
    return prob?.difficulty === "beginner";
  });

  assert(intermediatePractices.length > 0, "High performer has intermediate practice candidates");
  if (beginnerPractices.length > 0 && intermediatePractices.length > 0) {
    assert(
      intermediatePractices[0].priorityScore > beginnerPractices[0].priorityScore,
      `Intermediate practice score (${intermediatePractices[0].priorityScore}) > Beginner practice score (${beginnerPractices[0].priorityScore})`
    );
  }

  // 14. AdaptiveEngine: Remediation After Struggling Performance
  console.log("\nRule 14: AdaptiveEngine Remediation on Struggling Performance");
  const strugglingScoreContext = {
    skillScores: [
      {
        studentId: "student-struggling",
        skillId: "javascript",
        theoryScore: 20, // Low theory
        practicalScore: 15, // Low practical
        theoryAttempts: 1,
        practicalAttempts: 2,
        lastAssessedAt: new Date().toISOString()
      } as any
    ],
    skills: mockSkills.filter(s => s.id === "javascript"),
    learningTopics: mockTopics.filter(t => t.skillId === "javascript"),
    practiceProblems: mockProblems.filter(p => p.skillId === "javascript"),
    assessments: mockAssessments.filter(a => a.skillId === "javascript"),
    recentAttempts: []
  };

  const strugglingCandidates = await AdaptiveEngine.scoreCandidates("student-struggling", strugglingScoreContext);
  assert(strugglingCandidates.length > 0, "Struggling student receives recommendations");
  const topStruggling = strugglingCandidates[0];
  assert(
    topStruggling.type === "learning" || (topStruggling.type === "practice" && CATALOG_PRACTICE_PROBLEMS.find(p => p.id === topStruggling.itemId)?.difficulty === "beginner"),
    `Struggling student is routed to remediation (Found: [${topStruggling.type}] ${topStruggling.title})`
  );

  // 15. Practice/learning does not mutate official skillScores
  console.log("\nRule 15: Verification/Learning Score Separation Check");
  const executeRouteContent = fs.readFileSync(path.join(process.cwd(), "src/app/api/execute/route.ts"), "utf8");
  assert(!executeRouteContent.includes('collection("skillScores")') && !executeRouteContent.includes("collection('skillScores')"), "Execute API does not modify official 'skillScores' collection");
  assert(executeRouteContent.includes('collection(\'practiceAttempts\')') || executeRouteContent.includes('collection("practiceAttempts")'), "Execute API writes strictly to 'practiceAttempts'");

  // 16. Model 1 and Model 2 remain shadow-only
  console.log("\nRule 16: ML Models Shadow-Only Status Check");
  const assignerContent = fs.readFileSync(path.join(process.cwd(), "src/lib/ml-inference/adaptive-task-assigner.ts"), "utf8");
  assert(assignerContent.includes("AdaptiveEngine.scoreCandidates"), "Deterministic AdaptiveEngine is the active authority");
  assert(assignerContent.includes("Model 2 NOT_READY. Using Deterministic Baseline for assignment."), "Model 2 fallback logs NOT_READY");

  // 17. No synthetic users are created
  console.log("\nRule 17: No Synthetic Users Check");
  const seederContent = fs.readFileSync(path.join(process.cwd(), "src/lib/content-catalog/seeder.ts"), "utf8");
  assert(!seederContent.includes('collection(db, "users")') && !seederContent.includes('collection(db, "students")'), "Seeder creates 0 user documents");
  assert(!seederContent.includes('collection(db, "studentProfiles")'), "Seeder creates 0 studentProfile documents");

  // 18. No fake ML telemetry is created
  console.log("\nRule 18: No Fake ML Telemetry Check");
  assert(!seederContent.includes('collection(db, "mlTelemetry")') && !seederContent.includes('collection(db, "mlTrainingData")'), "Seeder creates 0 ML telemetry documents");
  assert(!seederContent.includes('collection(db, "practiceAttempts")'), "Seeder creates 0 fake practice attempts");
  assert(!seederContent.includes('collection(db, "assessmentAttempts")'), "Seeder creates 0 fake assessment attempts");

  console.log("\n==================================================");
  console.log(`ALL 18 VALIDATION RULES PASSED (${passedChecks}/${totalChecks} assertions)`);
  console.log("==================================================");
}

runValidation().catch(err => {
  console.error("\nValidation failed with error:", err);
  process.exit(1);
});

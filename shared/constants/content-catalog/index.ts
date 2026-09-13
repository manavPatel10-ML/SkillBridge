/**
 * index.ts
 * Unified exports and query utilities for the SkillBridge Content Catalog.
 */

export * from "./skills";
export * from "./roles";
export * from "./learning-topics";
export * from "./practice-problems";
export * from "./assessments";
export * from "./practical-tasks";

import { CATALOG_SKILLS, CatalogSkill } from "./skills";
import { CATALOG_ROLES, CatalogRole } from "./roles";
import { CATALOG_LEARNING_TOPICS, CatalogLearningTopic } from "./learning-topics";
import { CATALOG_PRACTICE_PROBLEMS, CatalogPracticeProblem } from "./practice-problems";
import { CATALOG_ASSESSMENTS, CatalogAssessment } from "./assessments";
import { CATALOG_PRACTICAL_TASKS, CatalogPracticalTask } from "./practical-tasks";

export interface CatalogSummary {
  rolesCount: number;
  skillsCount: number;
  learningTopicsCount: number;
  practiceProblemsCount: number;
  assessmentsCount: number;
  assessmentQuestionsCount: number;
  practicalTasksCount: number;
}

export function getCatalogSummary(): CatalogSummary {
  const assessmentQuestionsCount = CATALOG_ASSESSMENTS.reduce(
    (sum, a) => sum + a.questions.length,
    0
  );

  return {
    rolesCount: CATALOG_ROLES.length,
    skillsCount: CATALOG_SKILLS.length,
    learningTopicsCount: CATALOG_LEARNING_TOPICS.length,
    practiceProblemsCount: CATALOG_PRACTICE_PROBLEMS.length,
    assessmentsCount: CATALOG_ASSESSMENTS.length,
    assessmentQuestionsCount,
    practicalTasksCount: CATALOG_PRACTICAL_TASKS.length,
  };
}

export function getTopicsForSkill(skillId: string): CatalogLearningTopic[] {
  return CATALOG_LEARNING_TOPICS.filter((t) => t.skillId === skillId && t.active).sort(
    (a, b) => a.order - b.order
  );
}

export function getPracticeProblemsForSkill(skillId: string): CatalogPracticeProblem[] {
  return CATALOG_PRACTICE_PROBLEMS.filter((p) => p.skillId === skillId && p.active);
}

export function getAssessmentForSkill(skillId: string): CatalogAssessment | undefined {
  return CATALOG_ASSESSMENTS.find((a) => a.skillId === skillId && a.active);
}

export function getPracticalTasksForSkill(skillId: string): CatalogPracticalTask[] {
  return CATALOG_PRACTICAL_TASKS.filter((t) => t.skillId === skillId && t.active);
}

export function getSkillsForRole(roleId: string): CatalogSkill[] {
  const role = CATALOG_ROLES.find((r) => r.id === roleId);
  if (!role) return [];
  return role.requiredSkillIds
    .map((sId) => CATALOG_SKILLS.find((s) => s.id === sId))
    .filter((s): s is CatalogSkill => s !== undefined);
}

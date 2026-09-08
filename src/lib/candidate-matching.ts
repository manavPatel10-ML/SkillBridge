/**
 * Centralized utility for matching candidates to company challenges.
 */

/**
 * Determines whether a candidate is a "Strong Match" for a company challenge.
 * 
 * Authoritative Rule:
 * 1. The challenge has at least one explicit required skill.
 * 2. The candidate has an authoritative `skillScores` record for EVERY required skill.
 * 3. Each required skill satisfies the existing verified threshold (isVerified === true).
 * 
 * @param requiredSkillIds - Array of skill IDs required by the challenge
 * @param verifiedSkillIds - Set of skill IDs that the candidate has verifiably mastered
 * @returns boolean indicating if the candidate is a Strong Match
 */
export function isCandidateStrongMatch(
  requiredSkillIds: string[] | undefined,
  verifiedSkillIds: Set<string>
): boolean {
  if (!requiredSkillIds || requiredSkillIds.length === 0) {
    return false;
  }
  
  return requiredSkillIds.every((reqSkillId) => verifiedSkillIds.has(reqSkillId));
}

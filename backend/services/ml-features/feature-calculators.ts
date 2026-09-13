// Calculates specific features

export function normalizeScore(score: number | null | undefined): number | null {
  if (score === null || score === undefined || isNaN(score)) return null;
  if (score < 0) return 0.0;
  if (score > 100) return 1.0;
  return score / 100.0;
}

export function normalizeDifficulty(diff: string | null | undefined): number | null {
  if (!diff) return null;
  const d = diff.toLowerCase();
  if (d === 'easy' || d === 'beginner' || d === 'intro') return 0.0;
  if (d === 'medium' || d === 'intermediate' || d === 'standard') return 1.0;
  if (d === 'hard' || d === 'advanced' || d === 'expert' || d === 'mastery') return 2.0;
  return 1.0; // Default fallback
}

export function calculateTrend(scores: number[]): 'improving' | 'declining' | 'stable' | 'unknown' {
  if (scores.length < 2) return 'unknown';
  
  // Use a simple linear regression slope
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  const n = scores.length;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += scores[i];
    sumXY += i * scores[i];
    sumX2 += i * i;
  }
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  
  // Define thresholds for stable
  if (slope > 0.05) return 'improving';
  if (slope < -0.05) return 'declining';
  return 'stable';
}

export function calculateVariance(scores: number[]): number | null {
  if (scores.length < 2) return null;
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (scores.length - 1);
  return variance;
}

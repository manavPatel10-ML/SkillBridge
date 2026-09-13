import { FeatureDefinition, FEATURE_SCHEMA_VERSION } from '@/types/ml-features';

export const Model1FeatureRegistry: FeatureDefinition[] = [
  {
    name: 'historicalTheoryAvg',
    version: FEATURE_SCHEMA_VERSION,
    type: 'numeric',
    source: 'StudentSkillScore.theoryScore',
    calculation: 'Raw score normalized to 0.0-1.0',
    normalization: 'score / 100.0',
    temporalRequirement: 'Must be from latest score computed before T0',
    leakageRisk: 'low'
  },
  {
    name: 'historicalPracticalAvg',
    version: FEATURE_SCHEMA_VERSION,
    type: 'numeric',
    source: 'StudentSkillScore.practicalScore',
    calculation: 'Raw score normalized to 0.0-1.0',
    normalization: 'score / 100.0',
    temporalRequirement: 'Must be from latest score computed before T0',
    leakageRisk: 'low'
  },
  {
    name: 'practiceCompletionRate',
    version: FEATURE_SCHEMA_VERSION,
    type: 'numeric',
    source: 'PracticeAttempt',
    calculation: 'Count of unique practice problems passed / Total unique attempted',
    normalization: 'None (ratio is already 0.0-1.0)',
    temporalRequirement: 'Only use attempts with completedAt < T0',
    leakageRisk: 'high'
  },
  {
    name: 'recentTheoryAverage',
    version: FEATURE_SCHEMA_VERSION,
    type: 'numeric',
    source: 'AssessmentAttempt',
    calculation: 'Average of last 5 theory scores before T0',
    normalization: 'score / 100.0',
    temporalRequirement: 'Strictly completedAt < T0',
    leakageRisk: 'high'
  },
  {
    name: 'topicMastery',
    version: FEATURE_SCHEMA_VERSION,
    type: 'numeric',
    source: 'AssessmentAttempt & PracticeAttempt',
    calculation: 'Weighted average of theory and practice for specific topic',
    normalization: 'score / 100.0',
    temporalRequirement: 'Strictly completedAt < T0',
    leakageRisk: 'high'
  }
  // Add other features as needed to document everything explicitly
];

export const Model2FeatureRegistry: FeatureDefinition[] = [
  {
    name: 'predictedNextScore',
    version: FEATURE_SCHEMA_VERSION,
    type: 'numeric',
    source: 'Model 1 output',
    calculation: 'Direct pass-through of Model 1 prediction',
    normalization: 'None (already 0.0-1.0)',
    temporalRequirement: 'T0 prediction',
    leakageRisk: 'none'
  },
  {
    name: 'candidateDifficulty',
    version: FEATURE_SCHEMA_VERSION,
    type: 'numeric',
    source: 'Candidate Task',
    calculation: 'Mapped string to number',
    normalization: 'BEGINNER=0, INTERMEDIATE=1, ADVANCED=2',
    temporalRequirement: 'T0 context',
    leakageRisk: 'none'
  }
];

export type AppEnvironment = 'development' | 'test' | 'beta' | 'production';

export interface BetaConfiguration {
  name: string;
  version: string;
  environment: AppEnvironment;
  mlStatus: {
    model1: 'NOT_READY' | 'TRAINING_ELIGIBLE' | 'VALIDATED' | 'PRODUCTION';
    model2: 'NOT_READY' | 'TRAINING_ELIGIBLE' | 'VALIDATED' | 'PRODUCTION';
  };
  deterministicBaselineActive: boolean;
  trainingGateEnforced: boolean;
  allowSyntheticData: boolean;
  telemetrySamplingRate: number;
}

export function getAppEnvironment(): AppEnvironment {
  const env = process.env.APP_ENV || process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV;
  if (env === 'production') return 'production';
  if (env === 'beta') return 'beta';
  if (env === 'test') return 'test';
  return 'development';
}

export const BETA_CONFIG: BetaConfiguration = {
  name: 'SkillBridge Controlled Beta',
  version: '1.0.0-beta',
  environment: getAppEnvironment(),
  mlStatus: {
    model1: 'NOT_READY',
    model2: 'NOT_READY'
  },
  deterministicBaselineActive: true,
  trainingGateEnforced: true,
  allowSyntheticData: false,
  telemetrySamplingRate: 1.0 // 100% of genuine beta telemetry is collected
};

export const isBeta = () => getAppEnvironment() === 'beta';
export const isProduction = () => getAppEnvironment() === 'production';
export const isTest = () => getAppEnvironment() === 'test';
export const isDevelopment = () => getAppEnvironment() === 'development';

import { NextResponse } from 'next/server';
import { getCatalogSummary } from '@/lib/content-catalog';

export const dynamic = 'force-dynamic';

export async function GET() {
  const catalogSummary = getCatalogSummary();

  const healthData = {
    status: 'ok',
    environment: process.env.NODE_ENV || 'production',
    appEnv: process.env.NEXT_PUBLIC_APP_ENV || process.env.APP_ENV || 'production',
    version: '0.1.0',
    gitCommitSha: 
      process.env.VERCEL_GIT_COMMIT_SHA || 
      process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 
      'local-dev',
    gitCommitRef: process.env.VERCEL_GIT_COMMIT_REF || 'main',
    firebaseProjectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'skillbridge-4101d',
    contentCatalog: {
      roles: catalogSummary.rolesCount,
      skills: catalogSummary.skillsCount,
      learningTopics: catalogSummary.learningTopicsCount,
      practiceProblems: catalogSummary.practiceProblemsCount,
      assessments: catalogSummary.assessmentsCount,
      practicalTasks: catalogSummary.practicalTasksCount,
    },
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(healthData, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'CDN-Cache-Control': 'no-store',
      'Vercel-CDN-Cache-Control': 'no-store',
    },
  });
}

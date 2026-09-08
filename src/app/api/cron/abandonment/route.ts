import { NextRequest, NextResponse } from 'next/server';
import { cleanupAbandonedRecommendations } from '@/lib/ml-telemetry/abandonment-cron';
import { verifyCronSecret, sanitizeApiError, ApiAuthError } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // [C2 FIX] CRON_SECRET is now enforced.
  // In production: if CRON_SECRET env var is not set, the endpoint returns 503.
  // In development: if CRON_SECRET is absent, the check is skipped for convenience.
  try {
    verifyCronSecret(req);
  } catch (error: unknown) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: sanitizeApiError(error) }, { status: error.httpStatus });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  try {
    await cleanupAbandonedRecommendations();
    return NextResponse.json({ success: true, message: 'Abandonment cleanup completed successfully' });
  } catch (error: any) {
    console.error('Abandonment Cron API error:', error);
    // [H1 FIX] Do not expose error.message to the caller.
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

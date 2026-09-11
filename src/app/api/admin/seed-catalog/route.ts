import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyBearerToken, requireAdmin, verifyCronSecret, sanitizeApiError, ApiAuthError } from '@/lib/api-auth';
import { seedCatalogAdmin } from '@/lib/content-catalog/admin-seeder';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let isAuthorized = false;

  // 1. Try Cron Secret first (server-to-server / deployment hook)
  try {
    verifyCronSecret(req);
    isAuthorized = true;
  } catch (cronErr) {
    // If not cron secret, check for Admin Firebase Bearer Token
    try {
      const { uid } = await verifyBearerToken(req);
      await requireAdmin(uid);
      isAuthorized = true;
    } catch (authErr) {
      if (authErr instanceof ApiAuthError) {
        return NextResponse.json({ error: authErr.message }, { status: authErr.httpStatus });
      }
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await seedCatalogAdmin(adminDb);
    return NextResponse.json({
      success: true,
      message: 'Curriculum content catalog successfully activated.',
      summary: result.summary,
      totalDocumentsWritten: result.totalDocumentsWritten,
      totalBatchesCommitted: result.totalBatchesCommitted,
    });
  } catch (error: any) {
    console.error('[seed-catalog] Execution error:', error);
    return NextResponse.json(
      { error: sanitizeApiError(error) },
      { status: 500 }
    );
  }
}

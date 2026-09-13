/**
 * api-auth.ts
 *
 * Shared server-side authentication & authorization helpers for Next.js API routes.
 * All functions throw structured errors that can be caught and returned as HTTP responses.
 *
 * SECURITY CONTRACT:
 *  - Never trust request.body.uid or any user-supplied identity claim.
 *  - Identity is ALWAYS derived from the verified Firebase ID token.
 *  - Admin role is verified via Firestore (same source-of-truth as Firestore rules).
 */

import { NextRequest } from 'next/server';
import { adminAuth, adminDb } from '../services/firebase-admin';

// ── Error sentinels ────────────────────────────────────────────────────────────

export class ApiAuthError extends Error {
  constructor(
    public readonly httpStatus: 401 | 403 | 503,
    message: string,
  ) {
    super(message);
    this.name = 'ApiAuthError';
  }
}

// ── Token verification ─────────────────────────────────────────────────────────

/**
 * Extracts and verifies the Firebase ID token from the Authorization header.
 * Returns the verified UID on success; throws ApiAuthError on failure.
 *
 * Usage:
 *   const { uid } = await verifyBearerToken(req);
 */
export async function verifyBearerToken(req: NextRequest): Promise<{ uid: string }> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new ApiAuthError(401, 'Unauthorized');
  }
  const token = authHeader.split('Bearer ')[1];
  if (!token) {
    throw new ApiAuthError(401, 'Unauthorized');
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return { uid: decoded.uid };
  } catch {
    throw new ApiAuthError(401, 'Invalid or expired token');
  }
}

// ── Role authorization ─────────────────────────────────────────────────────────

/**
 * Verifies that the authenticated user has the 'admin' role in Firestore.
 * Throws ApiAuthError(403) if the user is not an admin.
 *
 * Usage:
 *   const { uid } = await verifyBearerToken(req);
 *   await requireAdmin(uid);
 */
export async function requireAdmin(uid: string): Promise<void> {
  const userDoc = await adminDb.collection('users').doc(uid).get();
  if (userDoc.data()?.role !== 'admin') {
    throw new ApiAuthError(403, 'Forbidden: admin access required');
  }
}

// ── Error sanitization ─────────────────────────────────────────────────────────

/**
 * Maps any internal error to a safe, generic client-facing message.
 * Internal error details are logged server-side only.
 *
 * NEVER pass error.message directly to the client — it may expose internal
 * file paths, Firestore query structures, or stack traces.
 *
 * Usage:
 *   } catch (error: any) {
 *     console.error('[route] error:', error);
 *     return NextResponse.json(
 *       { error: sanitizeApiError(error) },
 *       { status: error instanceof ApiAuthError ? error.httpStatus : 500 }
 *     );
 *   }
 */
export function sanitizeApiError(error: unknown): string {
  if (error instanceof ApiAuthError) {
    return error.message; // These are already safe, user-facing messages.
  }
  // All other internal errors → generic message. Details are in server logs.
  return 'Internal server error';
}

// ── Cron secret verification ───────────────────────────────────────────────────

/**
 * Verifies the CRON_SECRET for internal scheduled job endpoints.
 *
 * Security contract:
 *  - CRON_SECRET MUST be set in production.
 *  - In development (NODE_ENV !== 'production'), if the secret is absent the
 *    check is skipped to allow local testing without secrets.
 *  - In production without a secret configured, the endpoint returns 503
 *    (Service Unavailable) to signal misconfiguration rather than running
 *    with no authentication.
 *
 * Usage:
 *   verifyCronSecret(req); // throws ApiAuthError on failure
 */
export function verifyCronSecret(req: NextRequest): void {
  const cronSecret = process.env.CRON_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!cronSecret) {
    if (isProduction) {
      // Misconfigured production — refuse to run rather than run unauthenticated.
      throw new ApiAuthError(
        503,
        'Cron endpoint is not configured. Set CRON_SECRET environment variable.',
      );
    }
    // Development/test without a secret — skip verification (local convenience).
    return;
  }

  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    throw new ApiAuthError(401, 'Unauthorized');
  }
}

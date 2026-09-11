import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

/**
 * Firebase Admin SDK initialization.
 *
 * Security contract:
 *  - The Admin SDK MUST be initialized with real credentials in production.
 *  - If FIREBASE_SERVICE_ACCOUNT_KEY is set, it takes priority (production/Vercel).
 *  - If only FIREBASE_PROJECT_ID is set, Application Default Credentials (ADC)
 *    are used (Google Cloud environments where the metadata server provides creds).
 *  - If NEITHER is configured in production (NODE_ENV === 'production'), we throw
 *    immediately to prevent a silently misconfigured deployment from running.
 *
 * [M1 FIX] Previously: initializeApp() was called with no args as a silent fallback.
 * Now: a descriptive error is thrown to surface misconfiguration at startup.
 */
if (getApps().length === 0) {
  const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const isProduction = process.env.NODE_ENV === 'production';

  if (serviceAccountStr && serviceAccountStr !== '[SENSITIVE]' && serviceAccountStr !== '"[SENSITIVE]"') {
    // Production / CI: full service account JSON provided as env var.
    try {
      const serviceAccount = JSON.parse(serviceAccountStr);
      initializeApp({ credential: cert(serviceAccount) });
    } catch (error) {
      throw new Error(
        '[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. ' +
        'Ensure the env var contains valid JSON. Error: ' + (error as Error).message
      );
    }
  } else if (projectId) {
    // Google Cloud environment: use Application Default Credentials (ADC).
    // The metadata server provides credentials automatically.
    initializeApp({ projectId });
  } else if (!isProduction) {
    // Local development without any credentials configured.
    // Allow initializeApp() with no args so emulators can be used.
    try {
      initializeApp();
    } catch (error) {
      console.error('[Firebase Admin] initializeApp() failed in development:', error);
    }
  } else {
    // Production with no credentials configured — refuse to start silently.
    // This prevents a misconfigured deployment from running with broken Admin access.
    throw new Error(
      '[Firebase Admin] CRITICAL: No Firebase credentials configured for production. ' +
      'Set FIREBASE_SERVICE_ACCOUNT_KEY (full JSON string) or FIREBASE_PROJECT_ID in your environment variables.'
    );
  }
}

export const adminDb = getFirestore();
export const adminAuth = getAuth();

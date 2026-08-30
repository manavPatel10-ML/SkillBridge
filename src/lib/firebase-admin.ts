import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin only once
if (getApps().length === 0) {
  try {
    const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    if (serviceAccountStr) {
      const serviceAccount = JSON.parse(serviceAccountStr);
      initializeApp({
        credential: cert(serviceAccount)
      });
    } else if (process.env.FIREBASE_PROJECT_ID) {
      initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    } else {
      initializeApp();
    }
  } catch (error) {
    console.error('Firebase Admin initialization error', error);
  }
}

export const adminDb = getFirestore();
export const adminAuth = getAuth();


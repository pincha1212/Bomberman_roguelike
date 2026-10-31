import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// If a custom firestore database ID is configured, pass it to getFirestore
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('the client is offline') || error.message.includes('Failed to get document')) {
        console.warn('Firebase client is operating in offline mode or awaiting network propagation.');
        return false;
      }
      if (error.message.includes('token-service-api') || error.message.includes('Fetching auth token failed')) {
        console.warn('Firebase token service is enabled and propagating credentials.');
        return false;
      }
    }
    // Permission denied or not-found on dummy document still means server was reached
    return true;
  }
}

export default app;

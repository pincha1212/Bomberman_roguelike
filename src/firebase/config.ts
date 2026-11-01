import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, setLogLevel } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// If a custom firestore database ID is configured, pass it to getFirestore
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Suppress internal Firestore connection retry logs while offline or during initial token propagation
try {
  setLogLevel('silent');
} catch (_) {}

export async function testConnection(): Promise<boolean> {
  // Silent check without forcing network queries that fail in offline mode
  return Boolean(db);
}

export default app;

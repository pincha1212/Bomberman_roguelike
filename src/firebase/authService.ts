import {
  signInWithPopup,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from './config';

export interface UserProfile {
  userId: string;
  displayName: string;
  photoURL?: string;
  bestScore: number;
  bestDepth: number;
  totalRuns: number;
  totalKills: number;
  updatedAt: string;
}

export async function loginWithGoogle(): Promise<FirebaseUser> {
  const result = await signInWithPopup(auth, googleProvider);
  await syncUserProfile(result.user);
  return result.user;
}

export async function loginAsGuest(): Promise<FirebaseUser> {
  const result = await signInAnonymously(auth);
  await syncUserProfile(result.user);
  return result.user;
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export async function syncUserProfile(user: FirebaseUser): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);

  const fallbackName = user.displayName || (user.isAnonymous ? 'Bomber Anónimo' : 'Jugador');
  const now = new Date().toISOString();

  if (snap.exists()) {
    const existing = snap.data() as UserProfile;
    const updated: UserProfile = {
      userId: user.uid,
      displayName: user.displayName || existing.displayName || fallbackName,
      photoURL: user.photoURL || existing.photoURL || '',
      bestScore: Math.max(existing.bestScore || 0, Number(localStorage.getItem('bombermanBestScore') || 0)),
      bestDepth: Math.max(existing.bestDepth || 1, Number(localStorage.getItem('bombermanBestDepth') || 1)),
      totalRuns: existing.totalRuns || Number(localStorage.getItem('bombermanRogueRun') || 1),
      totalKills: existing.totalKills || 0,
      updatedAt: now
    };
    await setDoc(userRef, updated, { merge: true });
    return updated;
  } else {
    const initial: UserProfile = {
      userId: user.uid,
      displayName: fallbackName,
      photoURL: user.photoURL || '',
      bestScore: Number(localStorage.getItem('bombermanBestScore') || 0),
      bestDepth: Math.max(1, Number(localStorage.getItem('bombermanBestDepth') || 1)),
      totalRuns: Number(localStorage.getItem('bombermanRogueRun') || 1),
      totalKills: 0,
      updatedAt: now
    };
    await setDoc(userRef, initial);
    return initial;
  }
}

export function subscribeToAuth(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      syncUserProfile(user).catch(console.error);
    }
    callback(user);
  });
}

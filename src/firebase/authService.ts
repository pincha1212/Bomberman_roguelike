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
  const fallbackName = user.displayName || (user.isAnonymous ? 'Bomber Anónimo' : 'Jugador');
  const now = new Date().toISOString();

  let existing: UserProfile | null = null;
  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      existing = snap.data() as UserProfile;
    }
  } catch (_) {
    // Offline mode: proceed with local profile cache without throwing
  }

  if (existing) {
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
    try {
      await setDoc(userRef, updated, { merge: true });
    } catch (_) {}
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
    try {
      await setDoc(userRef, initial, { merge: true });
    } catch (_) {}
    return initial;
  }
}

export function subscribeToAuth(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      syncUserProfile(user).catch(() => {});
    }
    callback(user);
  });
}

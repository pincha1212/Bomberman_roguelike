import {
  collection,
  doc,
  getDoc,
  setDoc,
  query,
  orderBy,
  limit,
  getDocs,
  onSnapshot
} from 'firebase/firestore';
import { db, auth } from './config';

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  photoURL?: string;
  score: number;
  depth: number;
  runTimeFormatted?: string;
  kills: number;
  coins?: number;
  relicsCount?: number;
  causeOfDeath?: string;
  createdAt: string;
}

export interface RunSubmissionPayload {
  score: number;
  depth: number;
  runTimeFormatted: string;
  kills: number;
  coins: number;
  relicsCount: number;
  causeOfDeath: string;
}

export async function submitRunToLeaderboard(payload: RunSubmissionPayload): Promise<boolean> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    // If not logged in, we cannot write to protected Firestore rules
    return false;
  }

  const userId = currentUser.uid;
  const leaderboardRef = doc(db, 'leaderboard', userId);
  const now = new Date().toISOString();
  const displayName = (currentUser.displayName || (currentUser.isAnonymous ? 'Bomber Anónimo' : 'Jugador')).slice(0, 40);

  try {
    const existingSnap = await getDoc(leaderboardRef);

    if (existingSnap.exists()) {
      const existing = existingSnap.data() as LeaderboardEntry;
      // Only overwrite leaderboard if the new score is higher or equal
      if (payload.score >= (existing.score || 0)) {
        const entry: LeaderboardEntry = {
          userId,
          displayName,
          photoURL: currentUser.photoURL || '',
          score: Math.max(0, Math.floor(payload.score)),
          depth: Math.max(1, Math.floor(payload.depth)),
          runTimeFormatted: payload.runTimeFormatted || '00:00',
          kills: Math.max(0, Math.floor(payload.kills)),
          coins: Math.max(0, Math.floor(payload.coins)),
          relicsCount: Math.max(0, Math.floor(payload.relicsCount)),
          causeOfDeath: payload.causeOfDeath.slice(0, 50) || 'Partida finalizada',
          createdAt: now
        };
        await setDoc(leaderboardRef, entry);
      }
    } else {
      const entry: LeaderboardEntry = {
        userId,
        displayName,
        photoURL: currentUser.photoURL || '',
        score: Math.max(0, Math.floor(payload.score)),
        depth: Math.max(1, Math.floor(payload.depth)),
        runTimeFormatted: payload.runTimeFormatted || '00:00',
        kills: Math.max(0, Math.floor(payload.kills)),
        coins: Math.max(0, Math.floor(payload.coins)),
        relicsCount: Math.max(0, Math.floor(payload.relicsCount)),
        causeOfDeath: payload.causeOfDeath.slice(0, 50) || 'Partida finalizada',
        createdAt: now
      };
      await setDoc(leaderboardRef, entry);
    }

    // Also update user profile with total stats
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    const existingUser = userSnap.exists() ? userSnap.data() : {};
    await setDoc(userRef, {
      userId,
      displayName,
      photoURL: currentUser.photoURL || '',
      bestScore: Math.max(existingUser.bestScore || 0, payload.score),
      bestDepth: Math.max(existingUser.bestDepth || 1, payload.depth),
      totalRuns: (existingUser.totalRuns || 0) + 1,
      totalKills: (existingUser.totalKills || 0) + payload.kills,
      updatedAt: now
    }, { merge: true });

    return true;
  } catch (error) {
    console.error('Error submitting run to leaderboard:', error);
    return false;
  }
}

export async function fetchTopLeaderboard(maxLimit = 20): Promise<LeaderboardEntry[]> {
  try {
    const q = query(
      collection(db, 'leaderboard'),
      orderBy('score', 'desc'),
      limit(maxLimit)
    );
    const snap = await getDocs(q);
    const entries: LeaderboardEntry[] = [];
    snap.forEach((d) => {
      entries.push(d.data() as LeaderboardEntry);
    });
    return entries;
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
}

export function subscribeToTopLeaderboard(
  callback: (entries: LeaderboardEntry[]) => void,
  maxLimit = 20
) {
  const q = query(
    collection(db, 'leaderboard'),
    orderBy('score', 'desc'),
    limit(maxLimit)
  );

  return onSnapshot(
    q,
    (snap) => {
      const entries: LeaderboardEntry[] = [];
      snap.forEach((d) => {
        entries.push(d.data() as LeaderboardEntry);
      });
      callback(entries);
    },
    (error) => {
      console.warn('Leaderboard realtime subscription error:', error);
    }
  );
}

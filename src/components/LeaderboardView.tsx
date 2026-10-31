import React, { useEffect, useState } from 'react';
import { LeaderboardEntry, subscribeToTopLeaderboard, fetchTopLeaderboard } from '../firebase/leaderboardService';
import { User as FirebaseUser } from 'firebase/auth';

interface LeaderboardViewProps {
  currentUser: FirebaseUser | null;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ currentUser }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial fetch + real-time subscription
    fetchTopLeaderboard(25).then((data) => {
      setEntries(data);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    const unsubscribe = subscribeToTopLeaderboard((data) => {
      setEntries(data);
      setLoading(false);
    }, 25);

    return () => unsubscribe();
  }, []);

  const getRankBadge = (index: number) => {
    if (index === 0) return '👑 #1';
    if (index === 1) return '🥈 #2';
    if (index === 2) return '🥉 #3';
    return `#${index + 1}`;
  };

  const getRankClass = (index: number) => {
    if (index === 0) return 'rank-1';
    if (index === 1) return 'rank-2';
    if (index === 2) return 'rank-3';
    return '';
  };

  if (loading) {
    return (
      <div className="leaderboard-empty">
        <p className="pixel-font text-xs text-yellow-300 animate-pulse">CARGANDO TABLA DE CLASIFICACIÓN...</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="leaderboard-empty">
        <div className="text-2xl mb-2">🏆</div>
        <p className="pixel-font text-xs text-yellow-400 mb-1">¡SÉ EL PRIMERO EN EL PODIO!</p>
        <p className="text-xs text-slate-400">
          Jugá una partida e iniciá sesión con Google para registrar tu récord en la tabla mundial.
        </p>
      </div>
    );
  }

  return (
    <div className="leaderboard-container" aria-label="Tabla de clasificación global">
      {entries.map((entry, index) => {
        const isCurrent = currentUser && currentUser.uid === entry.userId;
        return (
          <div
            key={entry.userId || index}
            className={`leaderboard-item ${getRankClass(index)} ${isCurrent ? 'is-me' : ''}`}
          >
            <div className="lb-rank">{getRankBadge(index)}</div>
            <div className="lb-player">
              {entry.photoURL ? (
                <img src={entry.photoURL} alt={entry.displayName} className="lb-avatar" />
              ) : (
                <div className="lb-avatar flex items-center justify-center text-xs">💣</div>
              )}
              <div className="lb-details">
                <span className="lb-name">
                  {entry.displayName}
                  {isCurrent && <strong className="text-yellow-400 ml-1">(VOS)</strong>}
                </span>
                <span className="lb-meta">
                  PROF. {entry.depth} · ⏱ {entry.runTimeFormatted || '00:00'} · ⚔ {entry.kills} KILLS
                </span>
              </div>
            </div>
            <div className="lb-score-wrap">
              <span className="lb-score">{entry.score.toLocaleString()} PTS</span>
              <span className="lb-depth">PISO {entry.depth}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

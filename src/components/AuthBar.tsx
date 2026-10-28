import React, { useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { loginWithGoogle, loginAsGuest, logout } from '../firebase/authService';

interface AuthBarProps {
  currentUser: FirebaseUser | null;
  onLoginSuccess?: () => void;
}

export const AuthBar: React.FC<AuthBarProps> = ({ currentUser, onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      await loginWithGoogle();
      onLoginSuccess?.();
    } catch (err: any) {
      console.error('Login error:', err);
      // If popup closed or blocked, report cleanly
      if (err?.code !== 'auth/popup-closed-by-user') {
        setErrorMsg('Error al iniciar sesión con Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      await loginAsGuest();
      onLoginSuccess?.();
    } catch (err) {
      console.error('Guest login error:', err);
      setErrorMsg('No se pudo conectar como invitado.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (currentUser) {
    const isGuest = currentUser.isAnonymous;
    const name = currentUser.displayName || (isGuest ? 'Bomber Invitado' : 'Jugador');
    const photo = currentUser.photoURL;

    return (
      <div className="auth-header-strip">
        <div className="auth-user-info">
          {photo ? (
            <img src={photo} alt={name} className="auth-avatar" />
          ) : (
            <div className="auth-avatar">{isGuest ? '👤' : '💣'}</div>
          )}
          <div className="auth-name-wrap">
            <span className="auth-name" title={name}>{name}</span>
            <span className="auth-badge">{isGuest ? 'INVITADO' : 'CONECTADO 🏆'}</span>
          </div>
        </div>
        <button
          className="btn-auth-logout"
          onClick={handleLogout}
          type="button"
          title="Cerrar sesión"
        >
          SALIR
        </button>
      </div>
    );
  }

  return (
    <div className="auth-header-strip flex-col gap-2">
      <div className="flex items-center justify-between w-full gap-2">
        <button
          className="btn-auth-google"
          onClick={handleGoogleLogin}
          disabled={loading}
          type="button"
        >
          <span>🌐</span>
          <span>{loading ? 'CONECTANDO...' : 'INICIAR CON GOOGLE'}</span>
        </button>
        <button
          className="btn-auth-logout"
          onClick={handleGuestLogin}
          disabled={loading}
          type="button"
        >
          INVITADO
        </button>
      </div>
      {errorMsg && <small className="text-red-400 text-xs text-center">{errorMsg}</small>}
    </div>
  );
};

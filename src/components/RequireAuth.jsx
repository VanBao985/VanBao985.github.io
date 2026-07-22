import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { auth, verifyToken } from '../lib/auth.js';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Gate for admin-only routes. A stored token is not enough — it may be
 * expired or have lost access — so it is re-checked against GitHub before
 * the page renders.
 */
export default function RequireAuth({ children }) {
  const { signOut } = useAuth();
  const [state, setState] = useState('checking'); // checking | allowed | denied

  useEffect(() => {
    if (!auth.has()) {
      setState('denied');
      return undefined;
    }

    let cancelled = false;
    verifyToken()
      .then(() => !cancelled && setState('allowed'))
      .catch(() => {
        if (cancelled) return;
        signOut();
        setState('denied');
      });

    return () => { cancelled = true; };
  }, [signOut]);

  if (state === 'denied') return <Navigate to="/login" replace />;

  if (state === 'checking') {
    return (
      <main className="wrap admin-shell">
        <div className="state">
          <div className="spinner" style={{ margin: '0 auto 1rem' }} />
          <p>Checking your access…</p>
        </div>
      </main>
    );
  }

  return children;
}

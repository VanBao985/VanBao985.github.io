import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { isConfigured } from '../data/supabase.js';
import { getSession, onAuthChange, signIn as doSignIn, signOut as doSignOut } from '../lib/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  // Restoring a session from storage is async. Until it settles, a guard must
  // not decide anything — otherwise refreshing an admin page bounces the
  // signed-in admin straight back to the login screen.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isConfigured()) {
      setReady(true);
      return undefined;
    }

    let cancelled = false;
    getSession()
      .then((s) => { if (!cancelled) setSession(s); })
      .finally(() => { if (!cancelled) setReady(true); });

    const unsubscribe = onAuthChange((s) => setSession(s));
    return () => { cancelled = true; unsubscribe(); };
  }, []);

  const signIn = useCallback(async (email, password) => {
    setSession(await doSignIn(email, password));
  }, []);

  const signOut = useCallback(async () => {
    await doSignOut();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ session, isAuthed: Boolean(session), ready, signIn, signOut }),
    [session, ready, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

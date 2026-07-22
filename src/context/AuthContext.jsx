import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { auth } from '../lib/auth.js';

/**
 * Reactive mirror of the token in localStorage. auth.js stays the source of
 * truth for requests; this only exists so the UI re-renders on sign in/out.
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthed, setIsAuthed] = useState(() => auth.has());

  const signIn = useCallback((token) => {
    auth.set(token);
    setIsAuthed(true);
  }, []);

  const signOut = useCallback(() => {
    auth.clear();
    setIsAuthed(false);
  }, []);

  const value = useMemo(() => ({ isAuthed, signIn, signOut }), [isAuthed, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

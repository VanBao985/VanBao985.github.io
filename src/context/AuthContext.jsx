import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { auth } from '../lib/github.js';

/**
 * Thin reactive wrapper around the localStorage-backed token in github.js.
 * The adapter stays the source of truth for requests; this only mirrors
 * "is a token present" so the UI can re-render on sign in / sign out.
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

  // github.js clears the token itself on a 401, which would leave this state
  // stale; callers hitting an auth error use this to resync.
  const syncFromStorage = useCallback(() => setIsAuthed(auth.has()), []);

  const value = useMemo(
    () => ({ isAuthed, signIn, signOut, syncFromStorage }),
    [isAuthed, signIn, signOut, syncFromStorage]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

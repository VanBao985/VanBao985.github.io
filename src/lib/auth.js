import { createClient } from '@supabase/supabase-js';
import { SUPABASE, isConfigured } from '../data/supabase.js';

/**
 * auth.js — Supabase sign-in for the admin areas.
 *
 * Supabase is the authority here on purpose. It is the only party that can
 * actually authorise a database write: the anon key in this bundle is
 * identical for every visitor, so a login checked anywhere else (a password
 * in the bundle, a GitHub token) would be decoration — anyone could call the
 * REST API directly and moderate the guestbook.
 *
 * The SDK is used rather than hand-rolled fetch calls because it persists the
 * session and refreshes the access token before it expires. Getting that
 * wrong means the admin's buttons silently start failing an hour after
 * signing in.
 */

export const supabase = isConfigured()
  ? createClient(SUPABASE.url, SUPABASE.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;

export async function signIn(email, password) {
  if (!supabase) throw new Error('Supabase is not configured yet.');

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw new Error(error.message);
  return data.session;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

/** Subscribe to sign in / sign out / token refresh. Returns an unsubscribe fn. */
export function onAuthChange(handler) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => handler(session));
  return () => data.subscription.unsubscribe();
}

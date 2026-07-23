import { SUPABASE, isConfigured } from '../data/supabase.js';
import { supabase } from './auth.js';

/**
 * Guestbook storage.
 *
 * Two different reads on purpose:
 *   - guests read `guestbook_public`, a view holding only visible messages,
 *     with no name column at all;
 *   - a signed-in admin reads the table itself, seeing names and hidden notes.
 *
 * That split is enforced by database policies, not by this file. The anon key
 * ships in the bundle, so anything guarded only in JavaScript would be no
 * guard at all — a stranger could call the REST API directly.
 */

export const MAX_NAME = 40;
export const MAX_MESSAGE = 500;

const RATE_KEY = 'guestbook-last-signed';
const RATE_LIMIT_MS = 60_000;

const client = () => {
  if (!isConfigured() || !supabase) throw new Error('not-configured');
  return supabase;
};

/**
 * Read notes. Signed in, this returns names and hidden notes so they can be
 * moderated; signed out, it returns visible messages only.
 */
export async function listMessages({ asAdmin = false } = {}) {
  const db = client();

  const query = asAdmin
    ? db.from(SUPABASE.table).select('id,name,message,hidden,created_at')
    : db.from(SUPABASE.publicView).select('id,message,created_at');

  const { data, error } = await query.order('created_at', { ascending: false }).limit(200);
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Hide or restore a note. Only an authenticated session may do this. */
export async function setHidden(id, hidden) {
  const { error } = await client().from(SUPABASE.table).update({ hidden }).eq('id', id);
  if (error) throw new Error(error.message);
}

/** Delete a note for good. Kept separate from hiding, which is reversible. */
export async function removeEntry(id) {
  const { error } = await client().from(SUPABASE.table).delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * A localStorage timer that only slows down honest accidents — double-clicks
 * and one person filling the page. It is trivially bypassed, so the real
 * limits are the length checks in the database policy.
 */
export function tooSoon() {
  try {
    return Date.now() - Number(localStorage.getItem(RATE_KEY) || 0) < RATE_LIMIT_MS;
  } catch {
    return false;
  }
}

function markSigned() {
  try {
    localStorage.setItem(RATE_KEY, String(Date.now()));
  } catch {
    /* private mode — skip the cooldown rather than block the guest */
  }
}

/** Add an entry. Returns nothing: guests cannot read the table back. */
export async function addEntry({ name, message }) {
  const payload = {
    name: String(name).trim().slice(0, MAX_NAME),
    message: String(message).trim().slice(0, MAX_MESSAGE),
  };

  if (!payload.name || !payload.message) {
    throw new Error('Please fill in both your name and your message.');
  }

  const { error } = await client().from(SUPABASE.table).insert(payload);
  if (error) throw new Error(error.message);

  markSigned();
}

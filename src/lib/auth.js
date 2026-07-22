/**
 * auth.js — GitHub-backed sign-in for the admin-only invitation maker.
 *
 * There is no backend here, so the only honest way to check who someone is
 * is to ask GitHub: the visitor pastes a fine-grained Personal Access Token
 * and we verify it grants push access to this repo. GitHub does the
 * validation, which is what stops the gate from being faked by editing the
 * bundle — a hardcoded password would not survive anyone opening devtools.
 *
 * The token lives only in this browser's localStorage and is never committed.
 */

export const REPO = {
  owner: 'VanBao985',
  name: 'VanBao985.github.io',
};

const API_ROOT = 'https://api.github.com';
const TOKEN_KEY = 'gh_pat';

// Every localStorage access is guarded: it throws in some private-mode browsers.
export const auth = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY) || '';
    } catch {
      return '';
    }
  },
  set(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token.trim());
    } catch {
      /* ignore — the token still works for this page view */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
  has() {
    return Boolean(auth.get());
  },
};

/**
 * Verify the token and that it belongs to the site owner.
 *
 * Identity, not permission, is what is checked here. The obvious alternative —
 * "can this token read the repo?" — is worthless on a *public* repo, where
 * every token (and every stranger) can read it. Asking GitHub who the token
 * belongs to gives a real gate while needing no repository permissions at
 * all, so the token stays as harmless as a token can be.
 */
export async function verifyToken() {
  const token = auth.get();
  if (!token) throw new Error('No token stored. Please sign in again.');

  const res = await fetch(`${API_ROOT}/user`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (res.status === 401) {
    auth.clear();
    throw new Error('Token is invalid or has expired. Please check your token and try again.');
  }
  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.json()).message || '';
    } catch {
      /* ignore */
    }
    throw new Error(`GitHub API error ${res.status}. ${detail}`);
  }

  const user = await res.json();
  if (user.login?.toLowerCase() !== REPO.owner.toLowerCase()) {
    auth.clear();
    throw new Error(`This token belongs to @${user.login}, not @${REPO.owner}.`);
  }
  return user;
}

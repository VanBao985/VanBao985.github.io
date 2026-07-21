/**
 * github.js — storage adapter for the GitHub Contents API.
 *
 * All data reads/writes go through this file. To switch backends later
 * (Supabase, Cloudinary, ...), implement another adapter with the same
 * interface (getFile / putFile / deleteFile) and swap the import in admin.js.
 *
 * API docs: https://docs.github.com/en/rest/repos/contents
 */

export const REPO = {
  owner: 'VanBao985',
  name: 'VanBao985.github.io',
  branch: 'main',
};

// Files served by the site live under public/ in the repo but are deployed
// at the site root. `src` values in memories.json are URL paths (images/...),
// so repoPath() maps them to their repo location for API calls.
export const PUBLIC_DIR = 'public';
export const IMAGE_DIR = 'images';
export const DATA_PATH = `${PUBLIC_DIR}/data/memories.json`;

export const repoPath = (urlPath) => `${PUBLIC_DIR}/${urlPath}`;

const API_ROOT = 'https://api.github.com';

/* ------------------------------------------------------------------ *
 * Base64 helpers
 *
 * The Contents API sends/receives file bodies as base64. The browser's
 * btoa() only handles Latin-1 and throws on accented characters, so we
 * must go through UTF-8 bytes first.
 * ------------------------------------------------------------------ */

export function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  const CHUNK = 0x8000; // avoid stack overflow in apply() with large arrays
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export function base64ToUtf8(b64) {
  const binary = atob(b64.replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Blob -> plain base64 (no `data:image/jpeg;base64,` prefix). */
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('Could not read the image file'));
    reader.readAsDataURL(blob);
  });
}

/* ------------------------------------------------------------------ *
 * Token — stored in localStorage, NEVER committed to the repo.
 * ------------------------------------------------------------------ */

const TOKEN_KEY = 'gh_pat';

export const auth = {
  get: () => localStorage.getItem(TOKEN_KEY) || '',
  set: (t) => localStorage.setItem(TOKEN_KEY, t.trim()),
  clear: () => localStorage.removeItem(TOKEN_KEY),
  has: () => Boolean(localStorage.getItem(TOKEN_KEY)),
};

/* ------------------------------------------------------------------ *
 * Low-level request
 * ------------------------------------------------------------------ */

async function request(path, options = {}) {
  const token = auth.get();
  if (!token) throw new Error('No token found. Please sign in again.');

  const res = await fetch(`${API_ROOT}${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    auth.clear();
    throw new Error('Token is invalid or expired. Please create a new token.');
  }
  if (res.status === 403) {
    throw new Error('Token is missing the "Contents: Read and write" permission for this repo.');
  }
  if (res.status === 404) {
    const err = new Error('Not found (404). Check the repo name or token permissions.');
    err.status = 404;
    throw err;
  }
  if (res.status === 409 || res.status === 422) {
    const err = new Error('File version conflict.');
    err.status = res.status;
    throw err;
  }
  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.json()).message || '';
    } catch { /* ignore */ }
    throw new Error(`GitHub API error ${res.status}. ${detail}`);
  }

  return res.status === 204 ? null : res.json();
}

const contentsUrl = (filePath) =>
  `/repos/${REPO.owner}/${REPO.name}/contents/${encodeURI(filePath)}`;

/* ------------------------------------------------------------------ *
 * Public API
 * ------------------------------------------------------------------ */

/** Verify the token and its write permission. Returns repo info if valid. */
export async function verifyToken() {
  const repo = await request(`/repos/${REPO.owner}/${REPO.name}`);
  if (!repo.permissions?.push) {
    throw new Error('Token does not have write (push) access to this repo.');
  }
  return repo;
}

/**
 * Read a file. Returns { text, sha } — `sha` must be sent back when
 * overwriting; this is GitHub's optimistic concurrency control: if the
 * file was changed by another commit, the sha mismatches -> 409.
 */
export async function getFile(filePath) {
  try {
    const data = await request(`${contentsUrl(filePath)}?ref=${REPO.branch}`);
    return { text: base64ToUtf8(data.content), sha: data.sha };
  } catch (err) {
    if (err.status === 404) return { text: null, sha: null };
    throw err;
  }
}

/** Create or overwrite a file. Returns commit info. */
export async function putFile({ path, contentBase64, message, sha }) {
  return request(contentsUrl(path), {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content: contentBase64,
      branch: REPO.branch,
      ...(sha ? { sha } : {}),
    }),
  });
}

/** Delete a file. `sha` is required. */
export async function deleteFile({ path, sha, message }) {
  return request(contentsUrl(path), {
    method: 'DELETE',
    body: JSON.stringify({ message, sha, branch: REPO.branch }),
  });
}

/* ------------------------------------------------------------------ *
 * Data layer — read/write memories.json
 * ------------------------------------------------------------------ */

export const EMPTY_DB = { albums: [], photos: [] };

export async function loadDatabase() {
  const { text, sha } = await getFile(DATA_PATH);
  if (!text) return { db: structuredClone(EMPTY_DB), sha: null };
  try {
    const db = JSON.parse(text);
    return { db: { albums: db.albums || [], photos: db.photos || [] }, sha };
  } catch {
    throw new Error(`${DATA_PATH} contains invalid JSON. It needs to be fixed manually on GitHub.`);
  }
}

/**
 * Write the database. Automatically retries once on a conflict (409) —
 * this happens when uploading from two tabs/devices at the same time.
 */
export async function saveDatabase(db, message, { retry = true } = {}) {
  const { sha } = await getFile(DATA_PATH);
  const json = JSON.stringify(db, null, 2);
  try {
    return await putFile({
      path: DATA_PATH,
      contentBase64: utf8ToBase64(json),
      message,
      sha,
    });
  } catch (err) {
    if (retry && (err.status === 409 || err.status === 422)) {
      return saveDatabase(db, message, { retry: false });
    }
    throw err;
  }
}

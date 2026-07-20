/**
 * github.js — Storage adapter cho GitHub Contents API.
 *
 * Toan bo viec doc/ghi du lieu deu di qua file nay. Neu sau nay muon doi
 * sang Supabase / Cloudinary, chi can viet mot adapter khac co cung
 * interface (getFile / putFile / deleteFile) va thay import trong admin.js.
 *
 * API docs: https://docs.github.com/en/rest/repos/contents
 */

export const REPO = {
  owner: 'VanBao985',
  name: 'VanBao985.github.io',
  branch: 'main',
};

export const DATA_PATH = 'data/memories.json';
export const IMAGE_DIR = 'images';

const API_ROOT = 'https://api.github.com';

/* ------------------------------------------------------------------ *
 * Base64 helpers
 *
 * GitHub Contents API nhan/tra file duoi dang base64. btoa() cua trinh
 * duyet chi xu ly duoc Latin-1 nen se nem loi voi tieng Viet co dau —
 * phai encode qua UTF-8 bytes truoc.
 * ------------------------------------------------------------------ */

export function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  const CHUNK = 0x8000; // tranh tran stack khi apply() voi mang lon
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

/** Blob -> base64 thuan (khong co prefix `data:image/jpeg;base64,`). */
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('Khong doc duoc file anh'));
    reader.readAsDataURL(blob);
  });
}

/* ------------------------------------------------------------------ *
 * Token — luu trong localStorage, KHONG BAO GIO commit vao repo.
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
  if (!token) throw new Error('Chua co token. Vui long dang nhap lai.');

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
    throw new Error('Token khong hop le hoac da het han. Vui long tao token moi.');
  }
  if (res.status === 403) {
    throw new Error('Token thieu quyen "Contents: Read and write" cho repo nay.');
  }
  if (res.status === 404) {
    const err = new Error('Khong tim thay (404). Kiem tra lai ten repo hoac quyen token.');
    err.status = 404;
    throw err;
  }
  if (res.status === 409 || res.status === 422) {
    const err = new Error('Xung dot phien ban file (conflict).');
    err.status = res.status;
    throw err;
  }
  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.json()).message || '';
    } catch { /* ignore */ }
    throw new Error(`GitHub API loi ${res.status}. ${detail}`);
  }

  return res.status === 204 ? null : res.json();
}

const contentsUrl = (filePath) =>
  `/repos/${REPO.owner}/${REPO.name}/contents/${encodeURI(filePath)}`;

/* ------------------------------------------------------------------ *
 * Public API
 * ------------------------------------------------------------------ */

/** Kiem tra token va quyen ghi. Tra ve thong tin repo neu hop le. */
export async function verifyToken() {
  const repo = await request(`/repos/${REPO.owner}/${REPO.name}`);
  if (!repo.permissions?.push) {
    throw new Error('Token khong co quyen ghi (push) vao repo nay.');
  }
  return repo;
}

/**
 * Doc mot file. Tra ve { text, sha } — `sha` bat buoc phai gui kem khi
 * ghi de, day la co che optimistic concurrency control cua GitHub: neu
 * file da bi thay doi boi mot commit khac, sha khong khop -> 409.
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

/** Tao moi hoac ghi de mot file. Tra ve commit info. */
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

/** Xoa mot file. Bat buoc phai co sha. */
export async function deleteFile({ path, sha, message }) {
  return request(contentsUrl(path), {
    method: 'DELETE',
    body: JSON.stringify({ message, sha, branch: REPO.branch }),
  });
}

/* ------------------------------------------------------------------ *
 * Data layer — doc/ghi memories.json
 * ------------------------------------------------------------------ */

export const EMPTY_DB = { albums: [], photos: [] };

export async function loadDatabase() {
  const { text, sha } = await getFile(DATA_PATH);
  if (!text) return { db: structuredClone(EMPTY_DB), sha: null };
  try {
    const db = JSON.parse(text);
    return { db: { albums: db.albums || [], photos: db.photos || [] }, sha };
  } catch {
    throw new Error(`${DATA_PATH} bi loi cu phap JSON. Can sua thu cong tren GitHub.`);
  }
}

/**
 * Ghi database. Tu dong retry mot lan neu gap conflict (409) — truong hop
 * nay xay ra khi ban upload tu hai tab/thiet bi cung luc.
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

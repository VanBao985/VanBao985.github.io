import { DRIVE_API, isDriveApiConfigured } from '../data/drive-api.js';

/**
 * Listing one shared Drive folder at runtime.
 *
 * The gallery's folders are listed at build time by scripts/fetch-drive-photos.mjs,
 * because Google's embeddedfolderview endpoint sends no CORS header and a
 * browser fetch of it is blocked. That approach cannot serve this feature: a
 * guest's folder id arrives in the URL they were sent, so it is unknown when
 * the site is built, and a rebuild per guest would defeat the point of handing
 * out a link. The Drive REST API is used instead — it does send CORS headers,
 * so the browser is allowed to call it.
 *
 * Like both endpoints the build script uses, this depends on the folder being
 * shared as "Anyone with the link". Without that, an API-key request gets a
 * 404 and the guest sees nothing.
 */

const ENDPOINT = 'https://www.googleapis.com/drive/v3/files';

/**
 * Drive ids are URL-safe base64. Validating one matters twice over: it arrives
 * from the URL, so it is untrusted, and it is interpolated into the `q` search
 * expression below, where a stray apostrophe would let a stranger rewrite the
 * query. Anything outside this alphabet never reaches Google.
 */
const FOLDER_ID = /^[A-Za-z0-9_-]{10,100}$/;

export const isFolderId = (value) => FOLDER_ID.test(String(value ?? ''));

/**
 * Pull a folder id out of whatever Drive's Share menu produced — the full
 * ".../folders/<id>?usp=sharing" URL, the /u/0/ account-scoped variant, or an
 * id already on its own. Returns '' when there is no usable id, so callers can
 * treat "nothing typed yet" and "not a folder link" the same way.
 */
export function extractFolderId(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return '';

  const fromUrl = raw.match(/\/folders\/([A-Za-z0-9_-]+)/);
  const candidate = fromUrl ? fromUrl[1] : raw;

  return isFolderId(candidate) ? candidate : '';
}

/** The folder's own Drive page — where a guest downloads full-size copies. */
export const folderUrl = (id) => `https://drive.google.com/drive/folders/${id}`;

/** The link a guest opens to see their photos on this site. */
export const photosUrl = (id) => `${window.location.origin}/photos/${id}`;

/**
 * Turn Drive's error body into a sentence that says what to change. The admin
 * is the one who reads these, and every likely cause is a setting they own.
 */
function explain(status, body) {
  const reason = body?.error?.errors?.[0]?.reason ?? '';
  // Google puts the machine-readable cause here; the top-level `reason` is
  // often just "badRequest", which says nothing about what to fix.
  const detail = body?.error?.details?.find((d) => d.reason)?.reason ?? '';

  if (detail === 'API_KEY_INVALID') {
    return 'The Google Drive API key is not valid. Check the key in src/data/drive-api.js.';
  }
  if (detail === 'SERVICE_DISABLED' || reason === 'accessNotConfigured') {
    return 'The Google Drive API is not enabled for this API key’s project.';
  }
  if (status === 404) {
    return 'That folder was not found. Check the id, and make sure the folder is shared as "Anyone with the link".';
  }
  if (status === 403) {
    return 'Google refused the request. The API key may be restricted to other sites, or the folder is not shared publicly.';
  }
  // Anything unmapped: Google's own sentence beats a guess of mine.
  return body?.error?.message || `Drive replied with HTTP ${status}.`;
}

/**
 * Every image sitting directly in `folderId`, in natural name order so
 * "shot-2" precedes "shot-10". Subfolders are skipped, matching how the
 * gallery treats its own folders.
 */
export async function listFolderPhotos(folderId, { signal } = {}) {
  if (!isDriveApiConfigured()) throw new Error('not-configured');
  if (!isFolderId(folderId)) throw new Error('bad-folder-id');

  const photos = [];
  let pageToken = '';

  // Drive pages its results, and a single shoot runs well past one page.
  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
      key: DRIVE_API.key,
      // `size` is what lets the download button state its cost up front and
      // show real progress rather than a spinner.
      fields: 'nextPageToken,files(id,name,size)',
      pageSize: '1000',
      orderBy: 'name_natural',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
    });
    if (pageToken) params.set('pageToken', pageToken);

    const res = await fetch(`${ENDPOINT}?${params}`, { signal });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(explain(res.status, body));

    photos.push(...(body?.files ?? []));
    pageToken = body?.nextPageToken ?? '';
  } while (pageToken);

  return photos;
}

/**
 * The folder's own name, used to title the downloaded zip. Purely cosmetic, so
 * a failure here returns '' and the caller falls back to a generic name rather
 * than sinking the download over it.
 */
export async function getFolderName(folderId, { signal } = {}) {
  if (!isDriveApiConfigured() || !isFolderId(folderId)) return '';

  try {
    const params = new URLSearchParams({
      key: DRIVE_API.key,
      fields: 'name',
      supportsAllDrives: 'true',
    });
    const res = await fetch(`${ENDPOINT}/${folderId}?${params}`, { signal });
    if (!res.ok) return '';
    const body = await res.json();
    return body?.name ?? '';
  } catch {
    return '';
  }
}

import { DRIVE_API } from '../data/drive-api.js';
import { ZipWriter } from './zip.js';

/**
 * Packing a guest's whole folder into one zip, in the browser.
 *
 * Sending guests to Drive worked but asked a lot of them: Drive's own "download
 * folder" hides behind a right-click, zips server-side with a wait and no
 * progress, and for anyone not signed in it is a confusing detour. Since the
 * folder is already shared publicly, the browser can just fetch the files
 * itself — the Drive REST API sends CORS headers on `alt=media`, so the bytes
 * are readable here, unlike the drive.google.com download URLs.
 *
 * These are full-size originals, not the thumbnails the carousel shows. That is
 * the point of the button, but it means a folder is typically 100 MB+.
 */

const ENDPOINT = 'https://www.googleapis.com/drive/v3/files';

/**
 * Above this the whole idea stops working: the archive is assembled in the
 * page, so a phone will run out of memory somewhere in this region, and the
 * zip format itself needs ZIP64 past 4 GB (which zip.js does not write). Past
 * the cap the page offers Drive instead — slower for the guest, but it works.
 */
export const MAX_TOTAL_BYTES = 2 * 1024 * 1024 * 1024;

/** Drive reports `size` as a decimal string, and omits it on folders. */
export const totalBytes = (photos) =>
  photos.reduce((sum, photo) => sum + (Number(photo.size) || 0), 0);

export function formatBytes(bytes) {
  if (!bytes) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

/** Windows rejects these outright, and they are meaningless in a zip name. */
export const safeFileName = (name) =>
  String(name || '')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'photos';

/**
 * One file's bytes, reporting progress as they arrive. Reading the stream
 * rather than awaiting `.arrayBuffer()` is what keeps the progress bar honest:
 * a single 13 MB photo is a visible stall otherwise.
 */
async function fetchPhoto(id, { signal, onChunk }) {
  const params = new URLSearchParams({
    alt: 'media',
    key: DRIVE_API.key,
    supportsAllDrives: 'true',
  });

  const res = await fetch(`${ENDPOINT}/${id}?${params}`, { signal });
  if (!res.ok) {
    throw new Error(
      res.status === 403 || res.status === 404
        ? 'One of the photos could not be read. The folder may have stopped being shared.'
        : `A photo failed to download (HTTP ${res.status}).`,
    );
  }

  if (!res.body) {
    const buffer = new Uint8Array(await res.arrayBuffer());
    onChunk(buffer.length);
    return buffer;
  }

  const reader = res.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
    onChunk(value.length);
  }

  const bytes = new Uint8Array(size);
  let at = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, at);
    at += chunk.length;
  }
  return bytes;
}

/**
 * How many photos to fetch at once.
 *
 * Drive throttles a single connection well below what the link can carry:
 * measured against a real folder, four files in parallel moved 34.9 MB/s where
 * one at a time managed 8.65 MB/s — the same bytes in a quarter of the time.
 * Going much wider mostly risks Drive's rate limiting for little further gain.
 */
const CONCURRENCY = 4;

/**
 * Fetch every photo and return the finished archive.
 *
 * Results are zipped in the order they were listed, not the order they arrive,
 * so the archive matches what the guest saw on the page. Each one is handed to
 * the writer as soon as its turn comes up and then dropped, which keeps only a
 * few photos in JS memory rather than the whole folder.
 *
 * `onProgress` receives bytes fetched so far, to compare against totalBytes().
 */
export async function zipFolder(photos, { signal, onProgress } = {}) {
  const zip = new ZipWriter();
  const pending = new Array(photos.length);
  let loaded = 0;
  let next = 0;
  let flushed = 0;
  let failure = null;

  // Lets one failure stop the siblings instead of leaving three more downloads
  // running behind an error nobody will ever see.
  const stop = new AbortController();
  const relay = () => stop.abort();
  if (signal?.aborted) stop.abort();
  signal?.addEventListener('abort', relay);

  const flush = () => {
    while (flushed < photos.length && pending[flushed] !== undefined) {
      zip.add(photos[flushed].name, pending[flushed]);
      pending[flushed] = undefined; // released once the Blob has taken it
      flushed += 1;
    }
  };

  // Workers record their failure rather than rejecting, so the error that
  // surfaces is the one that actually went wrong — not whichever sibling
  // happened to notice the abort first.
  async function worker() {
    while (!failure) {
      const index = next;
      next += 1;
      if (index >= photos.length) return;

      try {
        pending[index] = await fetchPhoto(photos[index].id, {
          signal: stop.signal,
          onChunk: (n) => {
            loaded += n;
            onProgress?.(loaded);
          },
        });
        flush();
      } catch (err) {
        failure ??= err;
        stop.abort();
        return;
      }
    }
  }

  try {
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, photos.length) }, worker),
    );
  } finally {
    signal?.removeEventListener('abort', relay);
  }

  if (failure) throw failure;
  return zip.finish();
}

/** Hand the finished archive to the browser's downloader. */
export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoking straight away cancels the download in some browsers — the write
  // has not necessarily started when click() returns.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

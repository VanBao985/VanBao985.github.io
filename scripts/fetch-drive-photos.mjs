/**
 * fetch-drive-photos.mjs — build-time sync of the public Google Drive folders
 * listed in src/data/drive-folders.js.
 *
 * Why this runs at build time and not in the browser: Google's
 * `embeddedfolderview` endpoint sends no `Access-Control-Allow-Origin`
 * header, so a client-side fetch is blocked by CORS. Node has no such
 * restriction, so the listing is baked into a static JSON file that the
 * gallery reads like any other asset — which also means visitors cost us no
 * Drive requests at all.
 *
 * Each folder must be shared as "Anyone with the link". Subfolders are
 * ignored by design; only images sitting directly in a folder are taken.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DRIVE_FOLDERS } from '../src/data/drive-folders.js';

const OUT_FILE = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../public/data/drive-photos.json'
);

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif)$/i;

const decodeHtml = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

/** Pull the entry blocks out of the folder-view HTML. */
function parseEntries(html) {
  const entries = [];
  // Each row is <div class="flip-entry" id="entry-<id>"> … </div>, holding a
  // link that reveals whether it is a file or a folder, plus a title div.
  const blocks = html.split('<div class="flip-entry"').slice(1);

  for (const block of blocks) {
    const id = block.match(/id="entry-([A-Za-z0-9_-]+)"/)?.[1];
    const name = block.match(/flip-entry-title">([^<]*)</)?.[1];
    if (!id || !name) continue;

    // Folders link to /drive/folders/…, files link to /file/d/…
    entries.push({ id, name: decodeHtml(name), isFolder: block.includes('/drive/folders/') });
  }

  return entries;
}

async function fetchFolder({ id, name }) {
  const res = await fetch(`https://drive.google.com/embeddedfolderview?id=${id}#grid`);
  if (!res.ok) {
    throw new Error(
      `"${name}" (${id}) returned HTTP ${res.status}. Is it shared as "Anyone with the link"?`
    );
  }

  const entries = parseEntries(await res.text());
  if (!entries.length) {
    throw new Error(
      `"${name}" (${id}) produced no entries. Either it is empty, it is not public, ` +
        'or Google changed the folder-view markup.'
    );
  }

  const subfolders = entries.filter((e) => e.isFolder).length;
  const photos = entries
    .filter((e) => !e.isFolder && IMAGE_EXT.test(e.name))
    .map(({ id: fileId, name: fileName }) => ({ id: fileId, name: fileName }));

  const skipped = entries.length - subfolders - photos.length;
  process.stdout.write(
    `  ${name}: ${photos.length} photos ` +
      `(${subfolders} subfolders ignored, ${skipped} non-image files skipped)\n`
  );

  return { id, name, photos };
}

async function main() {
  if (!DRIVE_FOLDERS.length) {
    throw new Error('No folders configured in src/data/drive-folders.js');
  }

  process.stdout.write(`Syncing ${DRIVE_FOLDERS.length} Drive folder(s)…\n`);

  // Sequential on purpose: a handful of folders is not worth hammering
  // Google in parallel, and failures stay readable in the build log.
  const folders = [];
  for (const folder of DRIVE_FOLDERS) {
    folders.push(await fetchFolder(folder));
  }

  const total = folders.reduce((sum, f) => sum + f.photos.length, 0);

  await mkdir(dirname(OUT_FILE), { recursive: true });
  await writeFile(
    OUT_FILE,
    `${JSON.stringify({ syncedAt: new Date().toISOString(), folders }, null, 2)}\n`,
    'utf8'
  );

  process.stdout.write(`${total} photos total written to public/data/drive-photos.json\n`);
}

main().catch((err) => {
  process.stderr.write(`\nDrive sync failed: ${err.message}\n`);
  process.exit(1);
});

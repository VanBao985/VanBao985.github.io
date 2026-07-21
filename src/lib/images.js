/**
 * images.js — client-side image helpers used by the admin upload flow.
 *
 * Framework-agnostic on purpose: these are pure functions over File/Blob so
 * they stay testable and reusable outside React.
 */

/* Compression settings — tweak here for sharper / lighter images */
export const COMPRESS = {
  maxDimension: 2000,    // longest edge, in pixels
  quality: 0.82,         // JPEG quality (0–1)
  skipUnder: 300 * 1024, // files smaller than this are kept as-is
};

/** Strip diacritics + special characters -> URL-safe file name. */
export function slugify(str) {
  return str
    .normalize('NFD')                 // split base letters and combining marks
    .replace(/\p{Diacritic}/gu, '')   // drop combining marks
    .replace(/[đ]/g, 'd')
    .replace(/[Đ]/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'photo';
}

/** Human-readable byte size, e.g. "1.4 MB" / "820 KB". */
export const formatBytes = (bytes) =>
  bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;

/**
 * Downscale + re-encode an image on a canvas.
 * Returns { blob, width, height } — `blob` may be the original File when
 * compressing would not help.
 */
export async function compress(file) {
  // imageOrientation:'from-image' -> respect EXIF orientation so portrait
  // shots don't end up rotated after being drawn to the canvas.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });

  const scale = Math.min(1, COMPRESS.maxDimension / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  // Already small and no resize needed -> keep the original
  if (scale === 1 && file.size < COMPRESS.skipUnder) {
    bitmap.close();
    return { blob: file, width: w, height: h };
  }

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', COMPRESS.quality)
  );

  // If compression made the file bigger, keep the original
  if (!blob || blob.size >= file.size) return { blob: file, width: w, height: h };
  return { blob, width: w, height: h };
}

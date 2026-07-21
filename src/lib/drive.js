/**
 * Google Drive as an image source.
 *
 * `sz=w<N>` asks Drive for a proportionally resized copy, which is what makes
 * this endpoint usable like a small CDN — we request a display-sized image
 * instead of the full-resolution original.
 *
 * Do not "simplify" this to https://lh3.googleusercontent.com/d/<id>: that
 * form was tested against this folder and fails to load, while the
 * /thumbnail form works. Both are undocumented, so if images ever stop
 * appearing, this is the first place to look.
 */
export const driveImageUrl = (id, width = 1400) =>
  `https://drive.google.com/thumbnail?id=${id}&sz=w${width}`;

/** Human-friendly caption from a Drive file name ("Yuuki-016.jpg" -> "Yuuki-016"). */
export const captionFromName = (name) => String(name ?? '').replace(/\.[^.]+$/, '');

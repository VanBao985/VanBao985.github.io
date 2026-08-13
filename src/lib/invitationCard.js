import { INVITATION } from '../data/invitation.js';
import { assetUrl } from './assets.js';

/**
 * Renders an invitation by drawing the template image and overlaying the
 * guest's name.
 *
 * Keeping the design in an image rather than in code means a real exported
 * design (photo, illustration, hand-lettered type) survives untouched — code
 * could only ever approximate it.
 */

export const CARD_W = INVITATION.width;
export const CARD_H = INVITATION.height;

/**
 * The name arrives from a URL a friend clicked, so it is untrusted input.
 * Canvas text cannot execute anything, but an absurdly long value would
 * still wreck the layout — cap it before it is ever drawn.
 */
export const MAX_NAME = 32;
export const cleanName = (raw) =>
  String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);

// The template never changes, so fetch and decode it once per page load.
let templatePromise = null;

function loadTemplate() {
  if (!INVITATION.template) return Promise.resolve(null);

  if (!templatePromise) {
    templatePromise = new Promise((resolve) => {
      const img = new Image();
      // Same-origin asset, so the canvas stays untainted and toBlob() works.
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null); // fall back to a plain background
      img.src = assetUrl(INVITATION.template);
    });
  }

  return templatePromise;
}

/**
 * Measure the whole line at a given size.
 *
 * The prefix has to be part of this: sizing on the name alone lets
 * "Thân mời:" push a long name straight off the edge of the label.
 */
function measureLine(ctx, name, size) {
  const cfg = INVITATION.guestName;
  const nameFont = `${cfg.style ?? ''} ${cfg.weight ?? '400'} ${size}px ${cfg.family}`.trim();

  if (!cfg.prefix) {
    ctx.font = nameFont;
    const nameWidth = ctx.measureText(name).width;
    return { total: nameWidth, nameFont, nameWidth, prefixFont: null, prefixWidth: 0 };
  }

  const prefixFont = `${cfg.weight ?? '400'} ${Math.round(size * 0.82)}px ${cfg.family}`;
  ctx.font = prefixFont;
  const prefixWidth = ctx.measureText(cfg.prefix).width;
  ctx.font = nameFont;
  const nameWidth = ctx.measureText(name).width;

  const gap = cfg.prefixGap ?? 14;
  return { total: prefixWidth + gap + nameWidth, nameFont, nameWidth, prefixFont, prefixWidth, gap };
}

function drawGuestName(ctx, rawName) {
  const cfg = INVITATION.guestName;
  const name = cfg.uppercase ? rawName.toLocaleUpperCase('vi') : rawName;

  // Set before measuring, not after: letterSpacing is part of what measureText
  // reports, so measuring without it would under-size a tracked line and let
  // it run past the label. Unsupported in older browsers, where it is simply
  // ignored and the name renders untracked.
  ctx.letterSpacing = `${cfg.tracking ?? 0}px`;

  // Shrink until the whole line fits inside maxWidth
  let size = cfg.size;
  let line = measureLine(ctx, name, size);
  while (size > 16 && line.total > cfg.maxWidth) {
    size -= 2;
    line = measureLine(ctx, name, size);
  }

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = cfg.color;

  if (!cfg.prefix) {
    ctx.textAlign = 'center';
    ctx.font = line.nameFont;
    ctx.fillText(name, cfg.x, cfg.y);
    ctx.letterSpacing = '0px';
    return;
  }

  // Centre the prefix and the name together, as one unit
  const left = cfg.x - line.total / 2;
  ctx.textAlign = 'left';
  ctx.font = line.prefixFont;
  ctx.fillText(cfg.prefix, left, cfg.y);
  ctx.font = line.nameFont;
  ctx.fillText(name, left + line.prefixWidth + line.gap, cfg.y);
  ctx.letterSpacing = '0px';
}

/**
 * Draw the card. Awaits fonts first — drawing before the webfonts are ready
 * silently falls back to system fonts, with no error to explain why the name
 * looks wrong.
 */
export async function drawInvitation(canvas, rawName) {
  try {
    await document.fonts.ready;
  } catch {
    /* Font Loading API unavailable — draw with whatever is already loaded */
  }

  const template = await loadTemplate();
  const ctx = canvas.getContext('2d');

  canvas.width = CARD_W;
  canvas.height = CARD_H;

  ctx.fillStyle = INVITATION.background;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  if (template) ctx.drawImage(template, 0, 0, CARD_W, CARD_H);

  const name = cleanName(rawName);
  if (name) drawGuestName(ctx, name);

  return canvas;
}

/**
 * Spaces travel as underscores so a shared link stays readable:
 * `?to=Van_Bao` rather than `?to=Van%20Bao`.
 *
 * Accented letters still have to be percent-encoded, so a Vietnamese name
 * comes out as `?to=Nguy%E1%BB%85n_Minh` — shorter, but not fully clean.
 *
 * Trade-off: an underscore typed into a name returns as a space. Names with
 * underscores are vanishingly rare, and readable links are worth more here.
 */
export const encodeName = (name) => encodeURIComponent(cleanName(name).replace(/ /g, '_'));

/**
 * Read a `?to=` value back into a display name. Links made before the
 * underscore scheme still decode correctly, since a plain space survives
 * the underscore swap untouched.
 */
export const decodeName = (raw) => cleanName(String(raw ?? '').replace(/_/g, ' '));

/** Build the public link a friend opens to see their own card. */
export const inviteUrl = (name) =>
  `${window.location.origin}/invite?to=${encodeName(name)}`;

/** Filename-safe name for the downloaded PNG. */
export const cardFileName = (name) => {
  const slug = cleanName(name)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${INVITATION.slug}-${slug || 'guest'}.png`;
};

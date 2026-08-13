// Invitation card configuration.
//
// The design itself is an image in public/invite/ — everything static (title,
// photo, date, venue, phone number) is baked into it. The only thing drawn by
// code is the guest's name, positioned by `guestName` below.
//
// The portrait is part of that image on purpose: it is the same on every
// invitation, so compositing it per render would cost a second image load and
// a mask for no gain. Only the name actually varies.
//
// To use a different design: export it WITHOUT a guest name, drop it in
// public/invite/, point `template` at it, set `width`/`height` to its real
// pixel size, then nudge `guestName.x` / `.y` until the name lands where you
// want. PNG and SVG both work.
export const INVITATION = {
  template: 'invite/template.png',

  // Pixel size the card is rendered at — also the size of the downloaded PNG.
  // Must match the file, or the name lands in the wrong place.
  width: 1240,
  height: 1748,

  // Shown behind the template while it loads, and if it ever fails to load.
  background: '#2f8f5b',

  // The pale yellow label under the INVITE button, measured from the artwork:
  // it spans x 359..879, y 924..1077, so its centre is x 619.
  guestName: {
    x: 619,
    y: 1022,
    size: 48,
    maxWidth: 430,
    // The same green the design uses for "INVITE" and for its own sample name.
    color: '#4ca626',
    // Be Vietnam Pro is already loaded by index.html and, unlike Georgia, has
    // real Vietnamese glyphs — accents stay attached to their letters.
    family: '"Be Vietnam Pro", system-ui, sans-serif',
    weight: '600',
    style: 'normal',
    // The card sets names in capitals; letter-spacing matches the artwork.
    uppercase: true,
    tracking: 2,
    // "INVITE" is already printed above the label, so no prefix is drawn.
    prefix: '',
    prefixGap: 16,
  },

  // Used for the downloaded file name only.
  slug: 'graduation-invitation',
};

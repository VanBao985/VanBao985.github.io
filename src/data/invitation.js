// Invitation card configuration.
//
// The design itself is an image in public/invite/ — everything static (title,
// photo, date, venue, phone numbers) is baked into it. The only thing drawn
// by code is the guest's name, positioned by `guestName` below.
//
// To use your own design: export it WITHOUT a guest name, drop it in
// public/invite/, point `template` at it, set `width`/`height` to its real
// pixel size, then nudge `guestName.x` / `.y` until the name lands where you
// want. PNG and SVG both work.
export const INVITATION = {
  template: 'invite/template.svg',

  // Pixel size the card is rendered at — also the size of the downloaded PNG.
  width: 1200,
  height: 1700,

  // Shown behind the template while it loads, and if it ever fails to load.
  background: '#f1efea',

  // Where the guest's name goes. On the demo template this is the blank
  // cassette label; `maxWidth` shrinks long names so they never spill out.
  guestName: {
    x: 600,
    y: 1010,
    size: 62,
    maxWidth: 660,
    color: '#12592a',
    family: '"Playfair Display", Georgia, serif',
    weight: '600',
    style: 'italic',
    // Drawn just before the name, e.g. "Dear". Leave empty to omit.
    prefix: 'Dear',
    prefixGap: 16,
  },

  // Used for the downloaded file name only.
  slug: 'graduation-invitation',
};

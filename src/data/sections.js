// The contents list down the right edge of /gallery.
//
// Each `id` must match the id on the matching <section> — the nav links to it
// and lights up while it is the section on screen. Keep the list in page
// order: the highlight picks the first entry currently in view, so an entry
// out of order would light up at the wrong time.
export const SECTIONS = [
  { id: 'highlights', label: 'Highlights' },
  { id: 'photos', label: 'Photos' },
  { id: 'guestbook', label: 'Guestbook' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'venue', label: 'Map' },
];

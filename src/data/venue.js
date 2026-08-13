// Where the ceremony happens, and where to meet on the campus map.
//
// The map is the university's own, kept verbatim — guests will see the same
// picture on signs and in the school's announcements, so redrawing it would
// only make it harder to match up. It was requantised to 256 colours, which
// took it from 536 kB to 176 kB with no visible change: it is flat colour and
// flat colour is exactly what a palette stores well. JPEG was rejected at any
// useful size — it smears the small building labels.
//
// The marker is laid over the image in the page rather than painted into the
// file, which keeps the map reusable and the position easy to nudge.
export const VENUE = {
  map: 'map/hust-campus.png',
  // The map's own pixel size, used to hold its aspect while it scales.
  // Update both if the map is ever replaced.
  mapWidth: 1106,
  mapHeight: 745,

  building: 'Nhà C2',

  // The meeting point, not the building: the ring marks the C3–C4 walkway
  // where guests are met, at pixel (372, 292) of 1106 x 745. Stored as a
  // percentage so it tracks the image at any width.
  marker: { x: 30.0, y: 39.2, label: 'Meeting point' },

  // Ring diameter as a percentage of the map's width, so it stays the same
  // size relative to the buildings whether the map is panned on a phone or
  // stretched across a desktop.
  markerSize: 4.8,

  // Nearest gate, by distance on the map.
  gate: 'Cổng Bác',
  street: 'Đường Đại Cồ Việt',
};

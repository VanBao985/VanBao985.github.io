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

  // Rings drawn over the map. Positions and sizes are percentages of the
  // image, so they track it at any width — the map is panned on a phone and
  // stretched on a desktop, and a pixel offset would drift on both.
  //
  // `tone` picks the colour: 'meet' is red and is the only one that pulses,
  // because everything else on this map is a supporting detail. Coordinates
  // were measured off the marked-up map rather than eyeballed.
  markers: [
    // The C3–C4 walkway: pixel (332, 287) of 1106 x 745.
    { x: 30.0, y: 39.2, size: 3.5, tone: 'meet', label: 'Meeting point' },
    // Pixel (664, 511). Its label hangs below the ring: the labels are a fixed
    // text size while the map scales, so on a narrow phone render this one —
    // much the longest — collided with the Parking label above it.
    {
      x: 59.0, y: 68.5, size: 2.0, tone: 'gate',
      label: 'Trần Đại Nghĩa Gate', labelBelow: true,
    },
    // Pixels (475, 386) and (546, 476).
    { x: 44.6, y: 46.7, size: 1.0, tone: 'parking', label: 'Parking' },
    { x: 50.4, y: 63.8, size: 1.0, tone: 'parking', label: 'Parking' },
  ],

  // Nearest gate, by distance on the map.
  gate: 'Cổng Bác',
  street: 'Đường Đại Cồ Việt',
};

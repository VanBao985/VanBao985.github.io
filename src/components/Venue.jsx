import { VENUE } from '../data/venue.js';
import { assetUrl } from '../lib/assets.js';

/**
 * The campus map, with the ceremony's building marked.
 *
 * Last section on the page: it is the thing a guest opens the link for on the
 * morning itself, when they are already at the gate and everything above it is
 * beside the point.
 *
 * The map is 904px of small labels, so on a phone it is placed in a scroller
 * with a floor on its width rather than being squeezed until "C2" is a smudge —
 * panning a legible map beats staring at an illegible one. The marker is
 * positioned as a percentage, so it stays on the building at every size.
 */
export default function Venue() {
  const { marker } = VENUE;

  return (
    <section className="venue">
      <div className="wrap">
        <p className="hero__eyebrow">Finding the hall</p>
        <h2 className="venue__title">The ceremony is in C2 Building</h2>
        <p className="venue__intro">
          Campus map of Hanoi University of Science and Technology. Lễ tốt nghiệp tổ chức tại {VENUE.building}. 
          Điểm hẹn vị trí chụp ảnh tại đường bên phải Đài phun nước cạnh tòa C3, C4; gửi xe tại hầm C7 hoặc bãi đậu xe C5.
        </p>

        <figure className="venue__figure">
          <div className="venue__scroll">
            <div
              className="venue__frame"
              style={{ aspectRatio: `${VENUE.mapWidth} / ${VENUE.mapHeight}` }}
            >
              <img
                className="venue__img"
                src={assetUrl(VENUE.map)}
                width={VENUE.mapWidth}
                height={VENUE.mapHeight}
                loading="lazy"
                alt={`Campus map of Hanoi University of Science and Technology. Lễ tốt nghiệp tổ chức tại ${VENUE.building}. Điểm hẹn vị trí chụp ảnh tại đường bên phải Đài phun nước cạnh tòa D3, D4; gửi xe tại hầm C7 hoặc bãi đậu xe C5.`}
              />
              <span
                className="venue__pin"
                style={{
                  left: `${marker.x}%`,
                  top: `${marker.y}%`,
                  width: `${VENUE.markerSize}%`,
                }}
                aria-hidden="true"
              >
                <span className="venue__pin-label">{marker.label}</span>
              </span>
            </div>
          </div>

          <figcaption className="venue__caption">
            {/* Only worth saying while the map is actually wider than the
                screen; CSS drops it once it fits. */}
            <span className="venue__hint">Drag the map sideways to see all of it. </span>
            <a href={assetUrl(VENUE.map)} target="_blank" rel="noopener noreferrer">
              Open the full-size map
            </a>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

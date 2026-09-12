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
  return (
    <section id="venue" className="venue">
      <div className="wrap">
        <p className="hero__eyebrow">Venue · Địa điểm</p>
        <h2 className="venue__title">Lễ tốt nghiệp tại Nhà C2</h2>
        <p className="venue__intro">
          Campus map of Hanoi University of Science and Technology. <br/>
          Lễ tốt nghiệp được tổ chức tại {VENUE.building}. Điểm hẹn chụp ảnh nằm
          trên lối đi bên phải đài phun nước, gần tòa C3–C4. Bạn có thể gửi xe
          tại hầm C7 hoặc bãi đỗ xe C5.
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
                alt={`Bản đồ Đại học Bách khoa Hà Nội. Lễ tốt nghiệp tại ${VENUE.building}; điểm hẹn chụp ảnh gần tòa C3–C4; khu vực gửi xe tại C7 và C5.`}
              />
              {/* aria-hidden: the same information is already spelled out in
                  the image's alt text, so a screen reader would hear it twice. */}
              {VENUE.markers.map((marker) => (
                <span
                  key={`${marker.x}-${marker.y}`}
                  className={`venue__pin venue__pin--${marker.tone}${
                    marker.labelBelow ? ' venue__pin--label-below' : ''
                  }`}
                  style={{
                    left: `${marker.x}%`,
                    top: `${marker.y}%`,
                    width: `${marker.size}%`,
                  }}
                  aria-hidden="true"
                >
                  <span className="venue__pin-label">{marker.label}</span>
                </span>
              ))}
            </div>
          </div>

          <figcaption className="venue__caption">
            {/* Only worth saying while the map is actually wider than the
                screen; CSS drops it once it fits. */}
            <span className="venue__hint">Kéo ngang để xem toàn bộ bản đồ. </span>
            <a href={assetUrl(VENUE.map)} target="_blank" rel="noopener noreferrer">
              Mở bản đồ kích thước đầy đủ
            </a>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

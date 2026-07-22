import { useCallback, useEffect, useRef, useState } from 'react';
import { driveImageUrl, captionFromName } from '../lib/drive.js';

export default function PhotoCarousel({ photos }) {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const stripRef = useRef(null);
  const activeThumbRef = useRef(null);

  const count = photos.length;

  const step = useCallback(
    (delta) => setIndex((i) => (i + delta + count) % count),
    [count]
  );

  // Arrow keys drive the carousel, matching the on-screen buttons
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step]);

  // Preload the neighbours so stepping feels instant
  useEffect(() => {
    for (const offset of [1, -1]) {
      const neighbour = photos[(index + offset + count) % count];
      if (neighbour) new Image().src = driveImageUrl(neighbour.id);
    }
  }, [index, photos, count]);

  // Keep the active thumbnail visible in the strip
  useEffect(() => {
    activeThumbRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [index]);

  useEffect(() => { setLoaded(false); }, [index]);

  if (!count) return null;

  const current = photos[index];

  return (
    <section className="carousel" aria-roledescription="carousel" aria-label="Photos">
      <div className="carousel__stage">
        <button
          className="carousel__nav carousel__nav--prev"
          onClick={() => step(-1)}
          aria-label="Previous photo"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>

        <div className="carousel__frame">
          {!loaded && <div className="carousel__spinner"><div className="spinner" /></div>}
          <img
            key={current.id}
            className={`carousel__img${loaded ? ' is-loaded' : ''}`}
            src={driveImageUrl(current.id)}
            alt={captionFromName(current.name)}
            onLoad={() => setLoaded(true)}
            decoding="async"
          />
        </div>

        <button
          className="carousel__nav carousel__nav--next"
          onClick={() => step(1)}
          aria-label="Next photo"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>

      <div className="carousel__meta">
        {/* <span className="carousel__caption">{captionFromName(current.name)}</span> */}
        <span className="carousel__counter" aria-live="polite">
          {index + 1} / {count}
        </span>
      </div>

      <div className="carousel__strip" ref={stripRef}>
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            ref={i === index ? activeThumbRef : null}
            className={`carousel__thumb${i === index ? ' is-active' : ''}`}
            onClick={() => setIndex(i)}
            aria-label={`Show photo ${i + 1}: ${captionFromName(photo.name)}`}
            aria-current={i === index}
          >
            <img src={driveImageUrl(photo.id, 200)} alt="" loading="lazy" decoding="async" />
          </button>
        ))}
      </div>
    </section>
  );
}

import { useEffect, useRef } from 'react';
import { formatDate } from './Gallery.jsx';
import { assetUrl } from '../lib/assets.js';

export default function Lightbox({ photos, index, albumNameOf, onClose, onStep }) {
  const closeRef = useRef(null);
  const photo = photos[index];

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') onStep(-1);
      else if (e.key === 'ArrowRight') onStep(1);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose, onStep]);

  // Preload the next image so arrow navigation feels instant
  useEffect(() => {
    const next = photos[index + 1];
    if (next) new Image().src = assetUrl(next.src);
  }, [photos, index]);

  if (!photo) return null;

  const album = albumNameOf(photo.album);

  return (
    <div
      className="lightbox is-open"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      onClick={(e) => {
        if (e.target.classList.contains('lightbox') || e.target.classList.contains('lightbox__stage')) {
          onClose();
        }
      }}
    >
      <button ref={closeRef} className="lb-btn lb-btn--close" aria-label="Close (Esc)" onClick={onClose}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
      <button className="lb-btn lb-btn--prev" aria-label="Previous photo" onClick={() => onStep(-1)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>
      <button className="lb-btn lb-btn--next" aria-label="Next photo" onClick={() => onStep(1)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
      <div className="lightbox__stage">
        <img src={assetUrl(photo.src)} alt={photo.title || ''} />
      </div>
      <div className="lightbox__info">
        {photo.title && <h3>{photo.title}</h3>}
        {photo.description && <p>{photo.description}</p>}
        <div className="lightbox__meta">
          {photo.date && <span>{formatDate(photo.date)}</span>}
          {photo.location && <span>📍 {photo.location}</span>}
          {album && <span>{album}</span>}
          {photo.people?.length > 0 && <span>👥 {photo.people.join(', ')}</span>}
        </div>
      </div>
    </div>
  );
}

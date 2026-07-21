import { assetUrl } from '../lib/assets.js';

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
}

function Card({ photo, index, albumName, onOpen }) {
  const ratio =
    photo.width && photo.height
      ? { aspectRatio: `${photo.width} / ${photo.height}` }
      : undefined;

  return (
    <article
      className="card"
      tabIndex={0}
      role="button"
      aria-label={`View photo: ${photo.title || 'untitled'}`}
      style={{ animationDelay: `${Math.min(index * 35, 500)}ms` }}
      data-index={index}
      onClick={() => onOpen(index)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(index);
        }
      }}
    >
      <div className="card__media">
        {albumName && <span className="badge">{albumName}</span>}
        <img
          src={assetUrl(photo.src)}
          alt={photo.title || ''}
          loading="lazy"
          decoding="async"
          style={ratio}
        />
      </div>
      <div className="card__body">
        {photo.title && <h3 className="card__title">{photo.title}</h3>}
        {photo.description && <p className="card__desc">{photo.description}</p>}
        {(photo.date || photo.location || photo.people?.length > 0) && (
          <div className="card__meta">
            {photo.date && <span>{formatDate(photo.date)}</span>}
            {photo.location && <span>📍 {photo.location}</span>}
            {photo.people?.length > 0 && <span>👥 {photo.people.join(', ')}</span>}
          </div>
        )}
      </div>
    </article>
  );
}

export default function Gallery({ photos, albumNameOf, onOpen }) {
  return (
    <div className="gallery" aria-live="polite">
      {photos.map((p, i) => (
        <Card
          key={p.id}
          photo={p}
          index={i}
          albumName={albumNameOf(p.album)}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}

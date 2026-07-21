export default function Hero({ photos, albums }) {
  const years = photos
    .map((p) => new Date(p.date).getFullYear())
    .filter((y) => !Number.isNaN(y));
  const lo = years.length ? Math.min(...years) : null;
  const hi = years.length ? Math.max(...years) : null;
  const span = lo === null ? '—' : lo === hi ? String(lo) : `${lo}–${hi}`;

  return (
    <section className="wrap hero">
      <p className="hero__eyebrow">A personal collection</p>
      <h1>
        Days that <em>won't come back</em>
      </h1>
      <p className="hero__lede">
        Four years of lecture halls, spontaneous trips, deadline nights and
        friends — gathered here before the memories fade.
      </p>
      {photos.length > 0 && (
        <div className="hero__stats">
          <div className="stat">
            <span className="stat__num">{photos.length}</span>
            <span className="stat__label">Moments</span>
          </div>
          <div className="stat">
            <span className="stat__num">{albums.length}</span>
            <span className="stat__label">Albums</span>
          </div>
          <div className="stat">
            <span className="stat__num">{span}</span>
            <span className="stat__label">Time span</span>
          </div>
        </div>
      )}
    </section>
  );
}

export default function Toolbar({ albums, photos, activeAlbum, onAlbumChange, onSearch }) {
  const counts = new Map();
  for (const p of photos) counts.set(p.album, (counts.get(p.album) || 0) + 1);

  const chips = [
    { id: 'all', name: 'All', count: photos.length },
    ...albums
      .filter((a) => counts.get(a.id))
      .map((a) => ({ id: a.id, name: a.name, count: counts.get(a.id) })),
  ];

  return (
    <div className="wrap toolbar">
      <div className="chips" role="group" aria-label="Filter by album">
        {chips.map((a) => (
          <button
            key={a.id}
            className="chip"
            aria-pressed={a.id === activeAlbum}
            onClick={() => onAlbumChange(a.id)}
          >
            {a.name}
            <span className="chip__count">{a.count}</span>
          </button>
        ))}
      </div>
      <div className="search">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <label className="sr-only" htmlFor="q">Search memories</label>
        <input
          id="q"
          type="search"
          placeholder="Search by title, place, people…"
          autoComplete="off"
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
    </div>
  );
}

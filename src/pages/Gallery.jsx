import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Achievements from '../components/Achievements.jsx';
import Hero from '../components/Hero.jsx';
import Toolbar from '../components/Toolbar.jsx';
import PhotoGrid from '../components/Gallery.jsx';
import Lightbox from '../components/Lightbox.jsx';
import { assetUrl } from '../lib/assets.js';

export default function Gallery() {
  const [db, setDb] = useState({ albums: [], photos: [] });
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');
  const [activeAlbum, setActiveAlbum] = useState('all');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [lbIndex, setLbIndex] = useState(-1);

  useEffect(() => {
    // Cache-bust: GitHub Pages sets a long Cache-Control, so without this
    // freshly uploaded photos would not show up right away.
    fetch(`${assetUrl('data/memories.json')}?t=${Date.now()}`, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((raw) => {
        setDb({
          albums: raw.albums || [],
          photos: (raw.photos || []).sort(
            (a, b) => new Date(b.date || 0) - new Date(a.date || 0)
          ),
        });
        setStatus('ready');
      })
      .catch((err) => {
        setError(err.message);
        setStatus('error');
      });
  }, []);

  // Debounce the search input so we don't re-filter on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 180);
    return () => clearTimeout(t);
  }, [query]);

  const albumNameOf = useCallback(
    (id) => db.albums.find((a) => a.id === id)?.name || '',
    [db.albums]
  );

  const visible = useMemo(() => {
    return db.photos.filter((p) => {
      if (activeAlbum !== 'all' && p.album !== activeAlbum) return false;
      if (!debouncedQuery) return true;
      const haystack = [
        p.title, p.description, p.location, albumNameOf(p.album),
        ...(p.people || []),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(debouncedQuery);
    });
  }, [db.photos, activeAlbum, debouncedQuery, albumNameOf]);

  const closeLightbox = useCallback(() => setLbIndex(-1), []);
  const stepLightbox = useCallback(
    (delta) => setLbIndex((i) => (i + delta + visible.length) % visible.length),
    [visible.length]
  );

  return (
    <>
      <main>
        <Achievements />
        <Hero photos={db.photos} albums={db.albums} />

        {status === 'ready' && db.photos.length > 0 && (
          <Toolbar
            albums={db.albums}
            photos={db.photos}
            activeAlbum={activeAlbum}
            onAlbumChange={setActiveAlbum}
            onSearch={setQuery}
          />
        )}

        <div className="wrap">
          {status === 'loading' && (
            <div className="state">
              <div className="spinner" style={{ margin: '0 auto 1rem' }} />
              <p>Loading memories…</p>
            </div>
          )}

          {status === 'error' && (
            <div className="state">
              <h2>Could not load data</h2>
              <p>
                Failed to read <code>data/memories.json</code> ({error}). If you
                just created the site, wait for GitHub Pages to finish building
                and reload the page.
              </p>
            </div>
          )}

          {status === 'ready' && db.photos.length === 0 && (
            <div className="state">
              <h2>No memories yet</h2>
              <p>
                The collection is empty. Head to the{' '}
                <Link to="/login">Admin</Link> page to upload the first photos.
              </p>
            </div>
          )}

          {status === 'ready' && db.photos.length > 0 && visible.length === 0 && (
            <div className="state">
              <h2>Nothing found</h2>
              <p>No memories match the current filter. Try a different keyword.</p>
            </div>
          )}

          {status === 'ready' && visible.length > 0 && (
            <PhotoGrid photos={visible} albumNameOf={albumNameOf} onOpen={setLbIndex} />
          )}
        </div>
      </main>

      {lbIndex >= 0 && (
        <Lightbox
          photos={visible}
          index={lbIndex}
          albumNameOf={albumNameOf}
          onClose={closeLightbox}
          onStep={stepLightbox}
        />
      )}
    </>
  );
}

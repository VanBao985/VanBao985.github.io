import { useEffect, useMemo, useState } from 'react';
import Achievements from '../components/Achievements.jsx';
import Hero from '../components/Hero.jsx';
import PhotoCarousel from '../components/PhotoCarousel.jsx';
import { assetUrl } from '../lib/assets.js';

export default function Gallery() {
  const [folders, setFolders] = useState([]);
  const [activeFolder, setActiveFolder] = useState('all');
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');

  useEffect(() => {
    // The Drive listing is baked in at build time by scripts/fetch-drive-photos.mjs.
    // Cache-bust so a fresh deploy shows new photos without waiting on the
    // long Cache-Control GitHub Pages sets.
    fetch(`${assetUrl('data/drive-photos.json')}?t=${Date.now()}`, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setFolders(data.folders || []);
        setStatus('ready');
      })
      .catch((err) => {
        setError(err.message);
        setStatus('error');
      });
  }, []);

  const total = useMemo(
    () => folders.reduce((sum, f) => sum + f.photos.length, 0),
    [folders]
  );

  const visible = useMemo(() => {
    if (activeFolder === 'all') return folders.flatMap((f) => f.photos);
    return folders.find((f) => f.id === activeFolder)?.photos ?? [];
  }, [folders, activeFolder]);

  return (
    <main>
      <Achievements />
      <Hero
        total={total}
        folders={folders}
        activeFolder={activeFolder}
        onFolderChange={setActiveFolder}
      />

      <div className="wrap">
        {status === 'loading' && (
          <div className="state">
            <div className="spinner" style={{ margin: '0 auto 1rem' }} />
            <p>Loading photos…</p>
          </div>
        )}

        {status === 'error' && (
          <div className="state">
            <h2>Could not load photos</h2>
            <p>
              Failed to read <code>data/drive-photos.json</code> ({error}). Run{' '}
              <code>npm run sync:drive</code> and rebuild.
            </p>
          </div>
        )}

        {status === 'ready' && total === 0 && (
          <div className="state">
            <h2>No photos yet</h2>
            <p>
              The Drive folders have no images directly in them. Add some, then
              re-run the deploy to refresh the gallery.
            </p>
          </div>
        )}

        {/* Keyed on the folder so switching resets the carousel to photo 1 */}
        {status === 'ready' && visible.length > 0 && (
          <PhotoCarousel key={activeFolder} photos={visible} />
        )}
      </div>
    </main>
  );
}

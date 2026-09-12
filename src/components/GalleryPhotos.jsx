import { useEffect, useMemo, useState } from 'react';
import Hero from './Hero.jsx';
import PhotoCarousel from './PhotoCarousel.jsx';
import { assetUrl } from '../lib/assets.js';

/**
 * The photo portion shared by the main gallery and personal gallery pages.
 * The Drive listing is generated at build time, so both pages always show the
 * same current collection without duplicating the loading and filtering logic.
 */
export default function GalleryPhotos({ dataFile = 'data/drive-photos.json' }) {
  const [folders, setFolders] = useState([]);
  const [activeFolder, setActiveFolder] = useState('all');
  const [status, setStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    fetch(`${assetUrl(dataFile)}?t=${Date.now()}`, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setFolders(data.folders || []);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, [dataFile]);

  const total = useMemo(
    () => folders.reduce((sum, folder) => sum + folder.photos.length, 0),
    [folders],
  );

  const visible = useMemo(() => {
    if (activeFolder === 'all') return folders.flatMap((folder) => folder.photos);
    return folders.find((folder) => folder.id === activeFolder)?.photos ?? [];
  }, [folders, activeFolder]);

  return (
    <>
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

        {/* Keyed on the folder so switching resets the carousel to photo 1. */}
        {status === 'ready' && visible.length > 0 && (
          <PhotoCarousel key={activeFolder} photos={visible} />
        )}
      </div>
    </>
  );
}

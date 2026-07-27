import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import DownloadAll from '../components/DownloadAll.jsx';
import PhotoCarousel from '../components/PhotoCarousel.jsx';
import { isDriveApiConfigured } from '../data/drive-api.js';
import { isFolderId, listFolderPhotos } from '../lib/driveFolder.js';
import { formatBytes, totalBytes } from '../lib/downloadFolder.js';

/**
 * One guest's photos, at /photos/<drive folder id>.
 *
 * Public on purpose, exactly like /invite: guests have no account, and the
 * link is the only key. Anyone holding it can look, which is the same promise
 * the Drive folder itself makes by being shared with "Anyone with the link" —
 * gating this page would break every link already handed out without making
 * the underlying folder any less reachable.
 */
export default function Photos() {
  const { folderId } = useParams();

  const [photos, setPhotos] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error | off | bad-link
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isDriveApiConfigured()) {
      setStatus('off');
      return undefined;
    }
    if (!isFolderId(folderId)) {
      setStatus('bad-link');
      return undefined;
    }

    // Abandon a listing still in flight if the guest opens a different link
    const controller = new AbortController();
    setStatus('loading');

    listFolderPhotos(folderId, { signal: controller.signal })
      .then((files) => {
        setPhotos(files);
        setStatus('ready');
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setError(err.message);
        setStatus('error');
      });

    return () => controller.abort();
  }, [folderId]);

  return (
    <main>
      <div className="wrap photos-page">
        <section className="photos-intro">
          <p className="hero__eyebrow">Your photos</p>
          <h1>From the shoot</h1>
          <p>
            {status === 'ready' && photos.length > 0
              ? 'Look through them with the arrows or the strip below, then take the whole set home as a single zip of full-size files.'
              : 'The photos from your session live here.'}
          </p>

          {status === 'ready' && photos.length > 0 && (
            <div className="photos-intro__meta">
              <span className="photos-count">
                {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
                {totalBytes(photos) > 0 && ` · ${formatBytes(totalBytes(photos))}`}
              </span>
            </div>
          )}

          {status === 'ready' && photos.length > 0 && (
            <DownloadAll folderId={folderId} photos={photos} />
          )}
        </section>

        {status === 'loading' && (
          <div className="state">
            <div className="spinner" style={{ margin: '0 auto 1rem' }} />
            <p>Loading your photos…</p>
          </div>
        )}

        {status === 'off' && (
          <div className="state">
            <h2>Not connected yet</h2>
            <p>
              Photo links need a Google Drive API key. See{' '}
              <code>src/data/drive-api.js</code>.
            </p>
          </div>
        )}

        {status === 'bad-link' && (
          <div className="state">
            <h2>This link is incomplete</h2>
            <p>
              It is missing the folder it should open. Ask for a new one — or head
              straight to the <Link to="/gallery">gallery</Link>.
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="state">
            <h2>Could not open this folder</h2>
            <p>{error}</p>
          </div>
        )}

        {status === 'ready' && photos.length === 0 && (
          <div className="state">
            <h2>No photos here yet</h2>
            <p>The folder is empty for now. Check back a little later.</p>
          </div>
        )}

        {/* Keyed on the folder so a different link resets the carousel to photo 1 */}
        {status === 'ready' && photos.length > 0 && (
          <PhotoCarousel key={folderId} photos={photos} />
        )}
      </div>

      <section className="thanks">
        <div className="wrap thanks__inner">
          <h2>Thank you for being part of it</h2>
          <p>
            Thank you for sharing this day with us. These photos are yours to
            keep — and there is more to see: the whole story in pictures, and a
            guestbook still waiting for a note from you.
          </p>
          <div className="thanks__actions">
            {/* One link, not two: the guestbook sits at the foot of the gallery,
                and react-router does not scroll to a hash on its own. */}
            <Link className="btn btn--accent" to="/gallery">
              Open the gallery &amp; sign the guestbook
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

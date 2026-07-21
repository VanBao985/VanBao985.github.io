import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  IMAGE_DIR, repoPath, putFile, getFile, deleteFile,
  loadDatabase, saveDatabase, blobToBase64,
} from '../lib/github.js';
import { compress, slugify, formatBytes } from '../lib/images.js';
import { assetUrl } from '../lib/assets.js';

const todayISO = () => new Date().toISOString().slice(0, 10);

/**
 * Admin panel — upload and delete memories.
 *
 * Upload flow:
 *   original file -> Canvas compression -> base64 -> PUT to repo (1 commit/image)
 *   -> update memories.json (1 final commit) -> GitHub Pages rebuilds.
 * Keeping metadata in a single trailing commit matters: every commit triggers
 * a Pages build, and the free tier allows only ~10 builds per hour.
 */
export default function Admin() {
  const [db, setDb] = useState({ albums: [], photos: [] });
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState([]);
  const [notice, setNotice] = useState(null);   // { kind, content }
  const [progress, setProgress] = useState(null); // { pct, label }
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Fields applied to the whole batch
  const [albumId, setAlbumId] = useState('');
  const [newAlbum, setNewAlbum] = useState('');
  const [date, setDate] = useState(todayISO);
  const [location, setLocation] = useState('');
  const [people, setPeople] = useState('');

  const fileInputRef = useRef(null);
  const queueRef = useRef(queue);

  useEffect(() => { queueRef.current = queue; }, [queue]);

  // Release object URLs for anything still queued when leaving the page
  useEffect(() => () => {
    queueRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
  }, []);

  // Warn before closing the tab while photos are still queued
  useEffect(() => {
    if (!queue.length) return undefined;
    const onBeforeUnload = (e) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [queue.length]);

  useEffect(() => {
    let cancelled = false;
    loadDatabase()
      .then((result) => {
        if (cancelled) return;
        setDb(result.db);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setNotice({ kind: 'error', content: `Could not load data: ${err.message}` });
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const sortedPhotos = useMemo(
    () => [...db.photos].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),
    [db.photos]
  );

  const addFiles = useCallback(async (fileList) => {
    const files = [...fileList].filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;

    setNotice(null);
    setProcessing(true);

    for (const file of files) {
      try {
        const { blob, width, height } = await compress(file);
        setQueue((q) => [
          ...q,
          {
            id: crypto.randomUUID(),
            file,
            blob,
            previewUrl: URL.createObjectURL(blob),
            width,
            height,
            title: file.name.replace(/\.[^.]+$/, ''),
            desc: '',
          },
        ]);
      } catch {
        setNotice({
          kind: 'error',
          content: `Could not process "${file.name}" — the file may be corrupted.`,
        });
      }
    }

    setProcessing(false);
  }, []);

  const updateItem = (id, field, value) =>
    setQueue((q) => q.map((item) => (item.id === id ? { ...item, [field]: value } : item)));

  const removeItem = (id) =>
    setQueue((q) => {
      const item = q.find((i) => i.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return q.filter((i) => i.id !== id);
    });

  const clearQueue = () =>
    setQueue((q) => {
      q.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return [];
    });

  async function handleUpload() {
    if (!queue.length) return;

    setUploading(true);
    setNotice(null);
    setProgress({ pct: 0, label: '' });

    // Work on a copy so a mid-flight failure can't leave `db` half-updated
    const next = { albums: [...db.albums], photos: [...db.photos] };

    let targetAlbum = albumId;
    const trimmedNewAlbum = newAlbum.trim();
    if (trimmedNewAlbum) {
      targetAlbum = slugify(trimmedNewAlbum);
      if (!next.albums.some((a) => a.id === targetAlbum)) {
        next.albums.push({
          id: targetAlbum,
          name: trimmedNewAlbum,
          order: next.albums.length + 1,
        });
      }
    }

    const shotDate = date || todayISO();
    const trimmedLocation = location.trim();
    const peopleList = people.split(',').map((s) => s.trim()).filter(Boolean);

    const total = queue.length;
    const uploaded = [];

    try {
      for (let i = 0; i < total; i++) {
        const item = queue[i];
        setProgress({
          pct: (i / total) * 100,
          label: `Uploading photo ${i + 1}/${total}: ${item.file.name}`,
        });

        const ext = item.blob.type === 'image/png' ? 'png' : 'jpg';
        // `src` is the URL path (images/...); the file is committed under public/
        const src = `${IMAGE_DIR}/${shotDate}-${slugify(item.title)}-${item.id.slice(0, 6)}.${ext}`;

        await putFile({
          path: repoPath(src),
          contentBase64: await blobToBase64(item.blob),
          message: `feat: add photo ${item.title}`,
        });

        uploaded.push({
          id: item.id,
          src,
          title: item.title.trim(),
          description: item.desc.trim(),
          date: shotDate,
          album: targetAlbum,
          location: trimmedLocation,
          people: peopleList,
          width: item.width,
          height: item.height,
          uploadedAt: new Date().toISOString(),
        });
      }

      // Write metadata once, at the very end
      setProgress({ pct: 100, label: 'Updating data…' });
      next.photos.push(...uploaded);
      await saveDatabase(next, `feat: add ${total} new memor${total > 1 ? 'ies' : 'y'}`);

      clearQueue();
      setNewAlbum('');
      setDb(next);
      setNotice({
        kind: 'ok',
        content: (
          <span>
            Uploaded {total} photo{total > 1 ? 's' : ''}. GitHub Pages needs about{' '}
            <strong>1–2 minutes</strong> to rebuild — after that they appear in the{' '}
            <Link to="/dashboard">gallery</Link>.
          </span>
        ),
      });
    } catch (err) {
      setNotice({
        kind: 'error',
        content: (
          <span>
            Upload failed: {err.message}
            <br />
            Photos uploaded before the failure are kept. You can retry.
          </span>
        ),
      });
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(null), 1200);
    }
  }

  async function handleDelete(photo) {
    const label = photo.title || 'this photo';
    if (!window.confirm(`Delete "${label}"?\n\nThis action cannot be undone.`)) return;

    setDeletingId(photo.id);
    setNotice(null);

    try {
      // Delete the image file first (skip if it no longer exists), then
      // remove the record from memories.json.
      const path = repoPath(photo.src);
      const { sha } = await getFile(path);
      if (sha) {
        await deleteFile({
          path,
          sha,
          message: `chore: delete photo ${photo.title || photo.id}`,
        });
      }

      const next = { ...db, photos: db.photos.filter((p) => p.id !== photo.id) };
      await saveDatabase(next, `chore: remove memory ${photo.title || photo.id}`);

      setDb(next);
      setNotice({ kind: 'ok', content: 'Deleted. The gallery will update in about a minute.' });
    } catch (err) {
      setNotice({ kind: 'error', content: `Delete failed: ${err.message}` });
    } finally {
      setDeletingId(null);
    }
  }

  const openFilePicker = () => fileInputRef.current?.click();

  return (
    <main className="wrap admin-shell">
      {notice && <div className={`alert alert--${notice.kind}`}>{notice.content}</div>}

      {/* Upload */}
      <div className="panel">
        <div className="panel__head">
          <h2>Upload photos</h2>
          <p>Images are compressed in the browser before being sent, to keep the repo small.</p>
        </div>

        <div
          className={`dropzone${dragOver ? ' is-over' : ''}`}
          role="button"
          tabIndex={0}
          aria-label="Choose or drag photos here"
          onClick={openFilePicker}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openFilePicker();
            }
          }}
          onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            addFiles(e.dataTransfer.files);
          }}
        >
          <div className="dropzone__icon">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-4.5-4.5L3 21" />
            </svg>
          </div>
          <strong>{processing ? 'Processing images…' : 'Drag & drop photos here'}</strong>
          <span>or click to browse — you can pick several at once</span>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = ''; // allow re-selecting the same file
          }}
        />

        {queue.length > 0 && (
          <div style={{ marginTop: '1.6rem' }}>
            <div className="grid-2">
              <div className="field">
                <label htmlFor="album">Album</label>
                <select
                  className="select"
                  id="album"
                  value={albumId}
                  onChange={(e) => setAlbumId(e.target.value)}
                >
                  <option value="">— No album —</option>
                  {db.albums.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="new-album">…or create a new album</label>
                <input
                  className="input"
                  id="new-album"
                  placeholder="e.g. Graduation day"
                  value={newAlbum}
                  onChange={(e) => setNewAlbum(e.target.value)}
                />
              </div>
            </div>
            <div className="grid-2">
              <div className="field">
                <label htmlFor="date">Date taken</label>
                <input
                  className="input"
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="location">Location</label>
                <input
                  className="input"
                  id="location"
                  placeholder="e.g. Campus building B1"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="people">People in the photos</label>
              <input
                className="input"
                id="people"
                placeholder="Comma separated: Bao, Minh, Ha"
                value={people}
                onChange={(e) => setPeople(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="queue">
          {queue.map((item) => {
            const saved = item.file.size - item.blob.size;
            return (
              <div className="queue-item" key={item.id}>
                <img className="queue-item__thumb" src={item.previewUrl} alt="" />
                <div>
                  <p className="queue-item__name">
                    {item.file.name} ·{' '}
                    {saved > 1024 ? (
                      <span className="size-note">
                        {formatBytes(item.file.size)} → {formatBytes(item.blob.size)}
                      </span>
                    ) : (
                      formatBytes(item.blob.size)
                    )}{' '}
                    · {item.width}×{item.height}
                  </p>
                  <div className="field" style={{ marginBottom: '.6rem' }}>
                    <input
                      className="input"
                      placeholder="Title"
                      value={item.title}
                      onChange={(e) => updateItem(item.id, 'title', e.target.value)}
                    />
                  </div>
                  <textarea
                    className="textarea"
                    rows="2"
                    placeholder="Tell a little story about this moment…"
                    value={item.desc}
                    onChange={(e) => updateItem(item.id, 'desc', e.target.value)}
                  />
                </div>
                <button
                  className="btn btn--danger queue-item__remove"
                  aria-label="Remove this photo"
                  onClick={() => removeItem(item.id)}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>

        {progress && (
          <div>
            <div className="progress">
              <div className="progress__bar" style={{ width: `${progress.pct}%` }} />
            </div>
            <p className="progress__label">{progress.label}</p>
          </div>
        )}

        {queue.length > 0 && (
          <div style={{ display: 'flex', gap: '.7rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn--accent" onClick={handleUpload} disabled={uploading}>
              Upload {queue.length} photo{queue.length > 1 ? 's' : ''}
            </button>
            <button className="btn btn--ghost" onClick={clearQueue} disabled={uploading}>
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Existing memories */}
      <div className="panel">
        <div className="panel__head">
          <h2>Published memories</h2>
          <p>
            {loading
              ? 'Loading…'
              : sortedPhotos.length
                ? `${sortedPhotos.length} photo${sortedPhotos.length > 1 ? 's' : ''} currently in the gallery.`
                : 'No photos yet.'}
          </p>
        </div>

        <div className="manage-list">
          {sortedPhotos.map((photo) => {
            const album = db.albums.find((a) => a.id === photo.album)?.name;
            const meta = [album, photo.date, photo.location].filter(Boolean).join(' · ');
            return (
              <div className="manage-row" key={photo.id}>
                <img src={assetUrl(photo.src)} alt="" loading="lazy" />
                <div>
                  <div className="manage-row__title">{photo.title || '(untitled)'}</div>
                  <div className="manage-row__meta">{meta}</div>
                </div>
                <button
                  className="btn btn--danger"
                  onClick={() => handleDelete(photo)}
                  disabled={deletingId === photo.id}
                >
                  {deletingId === photo.id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

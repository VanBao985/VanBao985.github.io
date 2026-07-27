import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { isDriveApiConfigured } from '../data/drive-api.js';
import {
  extractFolderId, folderUrl, listFolderPhotos, photosUrl,
} from '../lib/driveFolder.js';

/**
 * Admin tool: turn a Drive folder into a link for one guest.
 *
 * There is no list of guests to keep anywhere — the folder id in the URL is
 * the whole record, the same trick /invite uses with a name. That is what
 * lets a new guest be added without a rebuild or a database row.
 */
export default function PhotoLinkMaker() {
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [check, setCheck] = useState(null); // { kind: 'ok'|'error', text }
  const [checking, setChecking] = useState(false);

  // Accepts a pasted share URL or a bare id; '' means nothing usable yet
  const folderId = useMemo(() => extractFolderId(input), [input]);
  const shareUrl = folderId ? photosUrl(folderId) : '';

  // A different folder invalidates whatever the last check reported
  useEffect(() => {
    setCheck(null);
    setCopied(false);
  }, [folderId]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the field below is selectable as a fallback */
    }
  }

  /**
   * Worth doing before sending anything: the usual mistake is a folder that
   * was never shared, and that failure is invisible until a guest opens the
   * link and finds an error where their photos should be.
   */
  async function checkFolder() {
    setChecking(true);
    setCheck(null);
    try {
      const photos = await listFolderPhotos(folderId);
      setCheck(
        photos.length > 0
          ? { kind: 'ok', text: `Reachable — ${photos.length} ${photos.length === 1 ? 'photo' : 'photos'} found.` }
          : { kind: 'error', text: 'Reachable, but there are no images directly in this folder. Subfolders are not included.' }
      );
    } catch (err) {
      const text = err.message === 'not-configured'
        ? 'No Drive API key is set yet.'
        : err.message;
      setCheck({ kind: 'error', text });
    } finally {
      setChecking(false);
    }
  }

  return (
    <main className="wrap admin-shell">
      <div className="panel__head">
        <h2>Photo links</h2>
        <p>Give each guest their own Drive folder, then share the link it makes.</p>
      </div>

      {!isDriveApiConfigured() && (
        <div className="alert alert--error">
          No Google Drive API key is set, so these links will not load any
          photos yet. Add one in <code>src/data/drive-api.js</code>.
        </div>
      )}

      <div className="panel link-maker">
        <div className="field">
          <label htmlFor="folder">Drive folder link or id</label>
          <input
            className="input"
            id="folder"
            value={input}
            placeholder="https://drive.google.com/drive/folders/… or the id on its own"
            onChange={(e) => setInput(e.target.value)}
            autoComplete="off"
            spellCheck="false"
          />
          <p className="field__hint">
            In Drive: right-click the guest’s folder → Share → set it to{' '}
            <strong>Anyone with the link</strong>, then paste that link here.
          </p>
        </div>

        {input.trim() && !folderId && (
          <div className="alert alert--error">
            That does not look like a Drive folder link or id.
          </div>
        )}

        {folderId && (
          <>
            <div className="share-box">
              <p className="share-box__title">Share this link with your guest</p>
              <input
                className="input"
                readOnly
                value={shareUrl}
                onFocus={(e) => e.target.select()}
              />
              <div className="link-maker__actions">
                <button className="btn btn--accent" onClick={copyLink}>
                  {copied ? 'Copied' : 'Copy link'}
                </button>
                <button
                  className="btn btn--ghost"
                  onClick={checkFolder}
                  disabled={checking || !isDriveApiConfigured()}
                >
                  {checking ? 'Checking…' : 'Check folder'}
                </button>
                <Link className="btn btn--ghost" to={`/photos/${folderId}`}>
                  Preview
                </Link>
              </div>

              {check && (
                <div className={`alert alert--${check.kind === 'ok' ? 'ok' : 'error'}`}>
                  {check.text}
                </div>
              )}

              <p className="field__hint">
                Anyone with this link can see the folder’s photos — the same
                promise the Drive folder itself makes. It works straight away;
                no rebuild is needed.{' '}
                <a href={folderUrl(folderId)} target="_blank" rel="noopener noreferrer">
                  Open the folder in Drive
                </a>
                .
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

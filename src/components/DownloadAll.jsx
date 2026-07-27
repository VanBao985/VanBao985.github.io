import { useRef, useState } from 'react';
import { folderUrl, getFolderName } from '../lib/driveFolder.js';
import {
  MAX_TOTAL_BYTES,
  formatBytes,
  safeFileName,
  saveBlob,
  totalBytes,
  zipFolder,
} from '../lib/downloadFolder.js';

/**
 * "Download all photos" — fetches every original and saves one zip, without
 * sending the guest to Drive.
 *
 * The size is stated on the button before anything starts, because this is a
 * ~100 MB commitment and a guest on mobile data deserves to know that before
 * tapping. The link to Drive stays alongside as the escape hatch: it is the
 * only thing that still works past MAX_TOTAL_BYTES, and iOS in particular can
 * be unpredictable about large in-page downloads.
 */
export default function DownloadAll({ folderId, photos }) {
  const [state, setState] = useState('idle'); // idle | working | error
  const [loaded, setLoaded] = useState(0);
  const [error, setError] = useState('');
  const abort = useRef(null);

  const total = totalBytes(photos);
  const tooBig = total > MAX_TOTAL_BYTES;
  const percent = total ? Math.min(100, Math.round((loaded / total) * 100)) : 0;

  async function start() {
    const controller = new AbortController();
    abort.current = controller;
    setState('working');
    setLoaded(0);
    setError('');

    try {
      const name = await getFolderName(folderId, { signal: controller.signal });
      const blob = await zipFolder(photos, {
        signal: controller.signal,
        onProgress: setLoaded,
      });
      saveBlob(blob, `${safeFileName(name)}.zip`);
      setState('idle');
    } catch (err) {
      // Cancelling is not a failure — say nothing and go back to the button.
      if (err.name === 'AbortError') {
        setState('idle');
        return;
      }
      setError(err.message);
      setState('error');
    } finally {
      abort.current = null;
    }
  }

  return (
    <div className="dl">
      <div className="dl__actions">
        {state === 'working' ? (
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => abort.current?.abort()}
          >
            Cancel
          </button>
        ) : (
          <button
            className="btn btn--accent btn--sm"
            onClick={start}
            disabled={tooBig}
          >
            Download all photos
            {total > 0 && ` (${formatBytes(total)})`}
          </button>
        )}

        <a
          className="btn btn--ghost btn--sm"
          href={folderUrl(folderId)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open in Drive
        </a>
      </div>

      {state === 'working' && (
        <div className="dl__progress">
          <div
            className="dl__track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label="Download progress"
          >
            <span className="dl__bar" style={{ width: `${percent}%` }} />
          </div>
          <p className="dl__status">
            {percent}% · {formatBytes(loaded)} of {formatBytes(total)} — keep
            this tab open, the zip is saved when it finishes.
          </p>
        </div>
      )}

      {state === 'error' && <p className="dl__status dl__status--bad">{error}</p>}

      {tooBig && (
        <p className="dl__status">
          This folder is {formatBytes(total)} — too large to zip in the browser.
          Use Drive to download it.
        </p>
      )}
    </div>
  );
}

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
          ? { kind: 'ok', text: `Đã kết nối — tìm thấy ${photos.length} ảnh.` }
          : { kind: 'error', text: 'Đã kết nối nhưng thư mục chưa có ảnh trực tiếp. Ảnh trong thư mục con không được tính.' }
      );
    } catch (err) {
      const text = err.message === 'not-configured'
        ? 'Chưa cấu hình khóa Google Drive API.'
        : err.message;
      setCheck({ kind: 'error', text });
    } finally {
      setChecking(false);
    }
  }

  return (
    <main className="wrap admin-shell">
      <div className="panel__head">
        <h2>Tạo đường dẫn ảnh riêng</h2>
        <p>Mỗi người nhận có một thư mục Drive riêng và một đường dẫn để xem ảnh.</p>
      </div>

      {!isDriveApiConfigured() && (
        <div className="alert alert--error">
          Chưa cấu hình khóa Google Drive API nên các đường dẫn chưa thể tải
          ảnh. Hãy bổ sung khóa trong <code>src/data/drive-api.js</code>.
        </div>
      )}

      <div className="panel link-maker">
        <div className="field">
          <label htmlFor="folder">Đường dẫn hoặc ID thư mục Drive</label>
          <input
            className="input"
            id="folder"
            value={input}
            placeholder="https://drive.google.com/drive/folders/… hoặc chỉ nhập ID"
            onChange={(e) => setInput(e.target.value)}
            autoComplete="off"
            spellCheck="false"
          />
          <p className="field__hint">
            Trong Drive: nhấp chuột phải vào thư mục → Chia sẻ → chọn{' '}
            <strong>Bất kỳ ai có đường liên kết</strong>, rồi dán đường dẫn vào đây.
          </p>
        </div>

        {input.trim() && !folderId && (
          <div className="alert alert--error">
            Nội dung này không giống đường dẫn hoặc ID thư mục Google Drive.
          </div>
        )}

        {folderId && (
          <>
            <div className="share-box">
              <p className="share-box__title">Gửi đường dẫn này cho người nhận</p>
              <input
                className="input"
                readOnly
                value={shareUrl}
                onFocus={(e) => e.target.select()}
              />
              <div className="link-maker__actions">
                <button className="btn btn--accent" onClick={copyLink}>
                  {copied ? 'Đã sao chép' : 'Sao chép đường dẫn'}
                </button>
                <button
                  className="btn btn--ghost"
                  onClick={checkFolder}
                  disabled={checking || !isDriveApiConfigured()}
                >
                  {checking ? 'Đang kiểm tra…' : 'Kiểm tra thư mục'}
                </button>
                <Link className="btn btn--ghost" to={`/photos/${folderId}`}>
                  Xem trước
                </Link>
              </div>

              {check && (
                <div className={`alert alert--${check.kind === 'ok' ? 'ok' : 'error'}`}>
                  {check.text}
                </div>
              )}

              <p className="field__hint">
                Bất kỳ ai có đường dẫn đều có thể xem ảnh trong thư mục. Đường
                dẫn hoạt động ngay và không cần build lại website.{' '}
                <a href={folderUrl(folderId)} target="_blank" rel="noopener noreferrer">
                  Mở thư mục trong Drive
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

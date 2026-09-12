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
          <p className="hero__eyebrow">Your photos · Ảnh của bạn</p>
          <h1>Khoảnh khắc của riêng bạn</h1>
          <p>
            {status === 'ready' && photos.length > 0
              ? 'Dùng các nút mũi tên để xem ảnh, hoặc tải toàn bộ ảnh gốc về dưới dạng một tệp ZIP.'
              : 'Những bức ảnh dành riêng cho bạn sẽ xuất hiện tại đây.'}
          </p>

          {status === 'ready' && photos.length > 0 && (
            <div className="photos-intro__meta">
              <span className="photos-count">
                {photos.length} ảnh
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
            <p>Đang tải ảnh của bạn…</p>
          </div>
        )}

        {status === 'off' && (
          <div className="state">
            <h2>Chưa thể tải ảnh</h2>
            <p>
              Tính năng ảnh riêng đang được cấu hình. Vui lòng quay lại sau.
            </p>
          </div>
        )}

        {status === 'bad-link' && (
          <div className="state">
            <h2>Đường dẫn chưa đầy đủ</h2>
            <p>
              Đường dẫn đang thiếu thông tin thư mục ảnh. Hãy xin lại đường dẫn
              mới hoặc ghé <Link to="/gallery">trang kỷ niệm</Link>.
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="state">
            <h2>Không thể mở thư mục ảnh</h2>
            <p>{error}</p>
          </div>
        )}

        {status === 'ready' && photos.length === 0 && (
          <div className="state">
            <h2>Chưa có ảnh</h2>
            <p>Thư mục hiện đang trống. Hãy quay lại sau nhé.</p>
          </div>
        )}

        {/* Keyed on the folder so a different link resets the carousel to photo 1 */}
        {status === 'ready' && photos.length > 0 && (
          <PhotoCarousel key={folderId} photos={photos} />
        )}
      </div>

      <section className="thanks">
        <div className="wrap thanks__inner">
          <h2>Cảm ơn bạn đã có mặt trong ngày đặc biệt này</h2>
          <p>
            Hãy lưu lại những bức ảnh này như một kỷ niệm đẹp. Nếu còn thời gian,
            mời bạn ghé xem trọn vẹn hành trình và để lại một lời nhắn nhé.
          </p>
          <div className="thanks__actions">
            {/* One link, not two: the guestbook sits at the foot of the gallery,
                and react-router does not scroll to a hash on its own. */}
            <Link className="btn btn--accent" to="/gallery">
              Xem trang kỷ niệm và gửi lời nhắn
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

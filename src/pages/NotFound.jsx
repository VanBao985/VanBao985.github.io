import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="wrap">
      <div className="state">
        <h2>404 — Không tìm thấy trang</h2>
        <p>
          Địa chỉ này không tồn tại hoặc đã được thay đổi. Mời bạn quay về{' '}
          <Link to="/gallery">trang kỷ niệm</Link>.
        </p>
      </div>
    </main>
  );
}

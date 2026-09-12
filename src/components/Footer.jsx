import VisitorCounter from './VisitorCounter.jsx';
import { useLocation } from 'react-router-dom';

export default function Footer() {
  const { pathname } = useLocation();
  const owner = pathname.startsWith('/gallery/linhthu') ? 'Linh Thư' : 'Văn Bảo';

  return (
    <footer className="site-footer">
      <div className="wrap site-footer__inner">
        <span>© {new Date().getFullYear()} {owner} — Lưu giữ thanh xuân qua từng khung hình</span>
        <VisitorCounter />
      </div>
    </footer>
  );
}

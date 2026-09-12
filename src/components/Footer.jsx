import VisitorCounter from './VisitorCounter.jsx';
import { useLocation } from 'react-router-dom';

export default function Footer() {
  const { pathname } = useLocation();
  const owner = pathname.startsWith('/gallery/linhthu') ? 'Linh Thư' : 'Van Bao';

  return (
    <footer className="site-footer">
      <div className="wrap site-footer__inner">
        <span>© {new Date().getFullYear()} {owner} — Vibe Code Production</span>
        <VisitorCounter />
      </div>
    </footer>
  );
}

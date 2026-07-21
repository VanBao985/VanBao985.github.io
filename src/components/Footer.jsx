import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap site-footer__inner">
        <span>© {new Date().getFullYear()} Van Bao — Vibe Code Production</span>
        <Link to="/login">Add a new memory</Link>
      </div>
    </footer>
  );
}

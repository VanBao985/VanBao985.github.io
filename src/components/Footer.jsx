import VisitorCounter from './VisitorCounter.jsx';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap site-footer__inner">
        <span>© {new Date().getFullYear()} Van Bao — Vibe Code Production</span>
        <VisitorCounter />
      </div>
    </footer>
  );
}

import { Link, NavLink, useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Header() {
  const { isAuthed, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="site-header">
      <div className="wrap site-header__inner">
        <Link className="brand" to="/gallery">
          <span className="brand__dot" />
          College Memories
        </Link>
        <nav className="nav">
          <NavLink to="/gallery">Gallery</NavLink>
          {/* Sends guests to sign-in first; RequireAuth does the real gating. */}
          <NavLink to="/invite-maker">Invites</NavLink>
          {isAuthed && (
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => { signOut(); navigate('/gallery'); }}
            >
              Sign out
            </button>
          )}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

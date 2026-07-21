import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Header() {
  const { isAuthed, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="site-header">
      <div className="wrap site-header__inner">
        <Link className="brand" to="/dashboard">
          <span className="brand__dot" />
          College Memories
        </Link>
        <nav className="nav">
          <NavLink to="/dashboard">Gallery</NavLink>
          <NavLink to={isAuthed ? '/admin' : '/login'}>Admin</NavLink>
          {isAuthed && (
            <button
              className="btn btn--ghost"
              style={{ padding: '.35rem .9rem', fontSize: '.85rem' }}
              onClick={() => { signOut(); navigate('/dashboard'); }}
            >
              Sign out
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}

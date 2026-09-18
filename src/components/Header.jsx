import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Header() {
  const { isAuthed, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isLinhThuGallery = pathname.startsWith('/gallery/linhthu');
  const galleryPath = isLinhThuGallery ? '/gallery/linhthu' : '/gallery';

  return (
    <header className="site-header">
      <div className="wrap site-header__inner">
        <Link className="brand" to={galleryPath}>
          <span className="brand__dot" />
          {isLinhThuGallery ? 'Linh Thư · Graduation' : 'University Memories'}
        </Link>
        <nav className="nav">
          <NavLink to={galleryPath}>Memories</NavLink>
          {/* Both send guests to sign-in first; RequireAuth does the real
              gating. A guest's own photo link is personal, so there is nothing
              here for them to browse — only the tool that builds those links. */}
          {!isLinhThuGallery && <NavLink to="/photo-links">Images</NavLink>}
          {!isLinhThuGallery && <NavLink to="/invite-maker">Invitation Cards</NavLink>}
          {isAuthed && (
            <button
              className="btn btn--ghost btn--sm"
              onClick={async () => { await signOut(); navigate(galleryPath); }}
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

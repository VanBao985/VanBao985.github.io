import { Link, NavLink } from 'react-router-dom';

export default function Header() {
  return (
    <header className="site-header">
      <div className="wrap site-header__inner">
        <Link className="brand" to="/gallery">
          <span className="brand__dot" />
          College Memories
        </Link>
        <nav className="nav">
          <NavLink to="/gallery">Gallery</NavLink>
        </nav>
      </div>
    </header>
  );
}

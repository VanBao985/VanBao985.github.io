import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="wrap">
      <div className="state">
        <h2>404 — Page not found</h2>
        <p>
          There is nothing at this address. Please return to the gallery at{' '}
          <Link to="/gallery">/gallery</Link>.
        </p>
      </div>
    </main>
  );
}

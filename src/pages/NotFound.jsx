import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="wrap">
      <div className="state">
        <h2>404 — Page not found</h2>
        <p>
          There is nothing at this address. The gallery lives at{' '}
          <Link to="/dashboard">/dashboard</Link>.
        </p>
      </div>
    </main>
  );
}

import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { auth, verifyToken } from '../lib/github.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { isAuthed, signIn } = useAuth();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (isAuthed) return <Navigate to="/admin" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    const value = token.trim();
    if (!value) {
      setError('Please paste a token.');
      return;
    }

    setBusy(true);
    setError('');
    // verifyToken() reads the token from storage, so it has to be written first.
    auth.set(value);

    try {
      await verifyToken();
      signIn(value);
      setToken('');
      navigate('/admin', { replace: true });
    } catch (err) {
      auth.clear();
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="wrap admin-shell">
      <section className="login-wrap">
        <form className="panel" onSubmit={handleSubmit}>
          <div className="panel__head">
            <h2>Admin sign-in</h2>
            <p>Paste a GitHub Personal Access Token to upload photos to the repo.</p>
          </div>

          {error && <div className="alert alert--error">{error}</div>}

          <div className="field">
            <label htmlFor="token">Personal Access Token</label>
            <input
              className="input"
              id="token"
              type="password"
              placeholder="github_pat_…"
              autoComplete="off"
              spellCheck="false"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <p className="field__hint">
              The token is kept in this browser&rsquo;s <code>localStorage</code> and is
              never committed to the repo.
            </p>
          </div>

          <button className="btn btn--accent btn--block" type="submit" disabled={busy}>
            {busy ? 'Verifying…' : 'Sign in'}
          </button>

          <details style={{ marginTop: '1.6rem', fontSize: '.88rem', color: 'var(--ink-soft)' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--ink)' }}>
              How to create a token (first time)
            </summary>
            <ol style={{ paddingLeft: '1.2rem', lineHeight: 1.85, marginTop: '.8rem' }}>
              <li>
                Open{' '}
                <a
                  href="https://github.com/settings/personal-access-tokens/new"
                  target="_blank"
                  rel="noopener"
                >
                  github.com/settings/personal-access-tokens/new
                </a>
              </li>
              <li><strong>Token name</strong>: anything you like, e.g. <code>college-memories</code></li>
              <li><strong>Expiration</strong>: pick a lifetime (create a new token once it expires)</li>
              <li>
                <strong>Repository access</strong> → <em>Only select repositories</em> → pick{' '}
                <code>VanBao985.github.io</code>
              </li>
              <li>
                <strong>Permissions</strong> → <em>Repository permissions</em> → find{' '}
                <strong>Contents</strong> → set it to <strong>Read and write</strong>
              </li>
              <li>Click <strong>Generate token</strong>, copy the string and paste it above</li>
            </ol>
            <p style={{ marginTop: '.6rem' }}>
              The token string is shown <strong>only once</strong> — if you lose it, generate a new one.
            </p>
          </details>
        </form>
      </section>
    </main>
  );
}

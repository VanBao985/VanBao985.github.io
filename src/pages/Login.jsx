import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { auth, verifyToken } from '../lib/auth.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { isAuthed, signIn } = useAuth();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (isAuthed) return <Navigate to="/invite-maker" replace />;

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
      navigate('/invite-maker', { replace: true });
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
            <p>The invitation maker is private. Paste your GitHub token to continue.</p>
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
            {/* <p className="field__hint">
              Kept in this browser’s <code>localStorage</code> only, never committed.
            </p> */}
          </div>

          <button className="btn btn--accent btn--block" type="submit" disabled={busy}>
            {busy ? 'Verifying…' : 'Sign in'}
          </button>

          {/* <details style={{ marginTop: '1.6rem', fontSize: '.88rem', color: 'var(--ink-soft)' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--ink)' }}>
              How to create a token (first time)
            </summary>
            <ol style={{ paddingLeft: '1.2rem', lineHeight: 1.85, marginTop: '.8rem' }}>
              <li>
                Open{' '}
                <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">
                  github.com/settings/personal-access-tokens/new
                </a>
              </li>
              <li><strong>Repository access</strong> → <em>Only select repositories</em> → this repo</li>
              <li><strong>Permissions</strong> → <strong>Contents</strong> → <strong>Read and write</strong></li>
              <li>Generate the token, copy it, and paste it above</li>
            </ol>
            <p style={{ marginTop: '.6rem' }}>
              The token is shown <strong>only once</strong> — if you lose it, generate a new one.
            </p>
          </details> */}
        </form>
      </section>
    </main>
  );
}

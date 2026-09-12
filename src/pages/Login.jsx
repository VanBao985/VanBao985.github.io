import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { isConfigured } from '../data/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { isAuthed, ready, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (ready && isAuthed) return <Navigate to="/invite-maker" replace />;

  if (!isConfigured()) {
    return (
      <main className="wrap admin-shell">
        <div className="state">
          <h2>Chưa thể đăng nhập</h2>
          <p>
            Dự án chưa được kết nối với Supabase. Vui lòng kiểm tra cấu hình hệ thống.
          </p>
        </div>
      </main>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await signIn(email, password);
      navigate('/invite-maker', { replace: true });
    } catch (err) {
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
            <h2>Đăng nhập quản trị</h2>
            <p>Dành cho việc tạo thiệp mời, tạo đường dẫn ảnh và quản lý sổ lưu bút.</p>
          </div>

          {error && <div className="alert alert--error">{error}</div>}

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              className="input"
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="password">Mật khẩu</label>
            <input
              className="input"
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button className="btn btn--accent btn--block" type="submit" disabled={busy}>
            {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>
      </section>
    </main>
  );
}

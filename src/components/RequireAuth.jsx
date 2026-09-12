import { Navigate } from 'react-router-dom';
import { isConfigured } from '../data/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Gate for admin-only routes.
 *
 * This is a convenience, not the security boundary — the real enforcement is
 * in the database policies. Someone could bypass this component and still be
 * unable to read a name or hide a note.
 */
export default function RequireAuth({ children }) {
  const { isAuthed, ready } = useAuth();

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

  // Wait for the stored session to be restored before deciding
  if (!ready) {
    return (
      <main className="wrap admin-shell">
        <div className="state">
          <div className="spinner" style={{ margin: '0 auto 1rem' }} />
          <p>Đang kiểm tra quyền truy cập…</p>
        </div>
      </main>
    );
  }

  if (!isAuthed) return <Navigate to="/login" replace />;

  return children;
}

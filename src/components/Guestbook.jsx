import { useCallback, useEffect, useState } from 'react';
import { isConfigured } from '../data/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  listMessages, addEntry, setHidden, removeEntry, tooSoon, MAX_NAME, MAX_MESSAGE,
} from '../lib/guestbook.js';

const formatDate = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function Guestbook({
  guestbookKey = 'main',
  ownerName = 'Văn Bảo',
}) {
  const { isAuthed, ready } = useAuth();

  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error | off
  const [loadError, setLoadError] = useState('');

  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState(null); // { kind, text }
  const [busyId, setBusyId] = useState(null);

  const refresh = useCallback(async (asAdmin) => {
    try {
      setMessages(await listMessages({ asAdmin, guestbookKey }));
      setStatus('ready');
    } catch (err) {
      if (err.message === 'not-configured') {
        setStatus('off');
        return;
      }
      setLoadError(err.message);
      setStatus('error');
    }
  }, [guestbookKey]);

  // Re-read when the session settles or changes: an admin sees more rows.
  useEffect(() => {
    if (!isConfigured()) {
      setStatus('off');
      return;
    }
    if (!ready) return;
    refresh(isAuthed);
  }, [ready, isAuthed, refresh]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (sending) return;

    if (tooSoon(guestbookKey)) {
      setNotice({ kind: 'error', text: 'Bạn vừa gửi một lời nhắn. Vui lòng đợi một phút trước khi gửi tiếp.' });
      return;
    }

    setSending(true);
    setNotice(null);
    try {
      await addEntry({ name, message, guestbookKey });
      setName('');
      setMessage('');
      setNotice({ kind: 'ok', text: 'Cảm ơn bạn! Lời nhắn đã được lưu và hiển thị bên dưới.' });
      await refresh(isAuthed);
    } catch (err) {
      setNotice({ kind: 'error', text: err.message });
    } finally {
      setSending(false);
    }
  }

  async function toggleHidden(entry) {
    setBusyId(entry.id);
    setNotice(null);
    try {
      await setHidden(entry.id, !entry.hidden, guestbookKey);
      await refresh(true);
    } catch (err) {
      setNotice({ kind: 'error', text: `Không thể cập nhật lời nhắn: ${err.message}` });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(entry) {
    if (!window.confirm('Xóa vĩnh viễn lời nhắn này?\n\nBạn có thể hiện lại lời nhắn đã ẩn, nhưng không thể khôi phục lời nhắn đã xóa.')) {
      return;
    }
    setBusyId(entry.id);
    setNotice(null);
    try {
      await removeEntry(entry.id, guestbookKey);
      await refresh(true);
    } catch (err) {
      setNotice({ kind: 'error', text: `Không thể xóa lời nhắn: ${err.message}` });
    } finally {
      setBusyId(null);
    }
  }

  const canSubmit = name.trim() && message.trim() && !sending;

  return (
    <section id="guestbook" className="wrap guestbook" aria-labelledby="guestbook-title">
      <div className="guestbook__intro">
        <p className="hero__eyebrow">Guestbook · Lưu bút</p>
        <h2 id="guestbook-title">Gửi lại một lời nhắn</h2>
        <p>
          Share a memory, a wish, or simply say hello. Your name stays private;
          only your message appears below. <br/>
          Hãy gửi {ownerName} một kỷ niệm, một lời chúc hoặc đơn giản là một lời
          chào. Tên của bạn được giữ riêng tư; chỉ nội dung lời nhắn được công khai.
        </p>
      </div>

      {status === 'off' ? (
        <div className="state">
          <p>Sổ lưu bút chưa được kết nối. Vui lòng quay lại sau.</p>
        </div>
      ) : (
        <>
          <form className="panel guestbook__form" onSubmit={handleSubmit}>
            {notice && <div className={`alert alert--${notice.kind}`}>{notice.text}</div>}

            <div className="field">
              <label htmlFor="gb-name">Tên của bạn</label>
              <input
                className="input"
                id="gb-name"
                value={name}
                maxLength={MAX_NAME}
                onChange={(e) => setName(e.target.value)}
                // placeholder=""
                autoComplete="name"
              />
              <p className="field__hint">Chỉ {ownerName} mới có thể thấy tên này.</p>
            </div>

            <div className="field">
              <label htmlFor="gb-message">Lời nhắn của bạn</label>
              <textarea
                className="textarea"
                id="gb-message"
                rows="4"
                value={message}
                maxLength={MAX_MESSAGE}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Một kỷ niệm, một lời chúc hay câu chuyện chỉ chúng ta hiểu…"
              />
              <p className="field__hint">
                {message.length} / {MAX_MESSAGE} · nội dung này sẽ được hiển thị công khai
              </p>
            </div>

            <button className="btn btn--accent" type="submit" disabled={!canSubmit}>
              {sending ? 'Đang gửi…' : 'Gửi lời nhắn'}
            </button>
          </form>

          {isAuthed && status === 'ready' && (
            <p className="guestbook__adminhint">
              Chế độ quản trị: bạn có thể xem tên người gửi và các lời nhắn đang ẩn.
            </p>
          )}

          <div className="guestbook__wall">
            {status === 'loading' && (
              <div className="state">
                <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                <p>Đang tải lời nhắn…</p>
              </div>
            )}

            {status === 'error' && (
              <div className="state">
                <p>Không thể tải lời nhắn. {loadError}</p>
              </div>
            )}

            {status === 'ready' && messages.length === 0 && (
              <div className="state">
                <p>Chưa có lời nhắn nào — hãy là người đầu tiên để lại đôi lời.</p>
              </div>
            )}

            {status === 'ready' &&
              messages.map((entry) => (
                <article
                  className={`note${entry.hidden ? ' note--hidden' : ''}`}
                  key={entry.id}
                >
                  {/* Text only: React escapes it, and it must never become HTML */}
                  <p className="note__body">{entry.message}</p>

                  <div className="note__foot">
                    <span className="note__date">{formatDate(entry.created_at)}</span>
                    {/* `name` only ever arrives on the admin read */}
                    {entry.name && <span className="note__name">{entry.name}</span>}
                  </div>

                  {isAuthed && (
                    <div className="note__actions">
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={() => toggleHidden(entry)}
                        disabled={busyId === entry.id}
                      >
                        {entry.hidden ? 'Hiện' : 'Ẩn'}
                      </button>
                      <button
                        className="btn btn--danger btn--sm"
                        onClick={() => handleDelete(entry)}
                        disabled={busyId === entry.id}
                      >
                        Xóa
                      </button>
                    </div>
                  )}
                </article>
              ))}
          </div>
        </>
      )}
    </section>
  );
}

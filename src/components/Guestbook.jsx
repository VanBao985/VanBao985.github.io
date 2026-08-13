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
    : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function Guestbook() {
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
      setMessages(await listMessages({ asAdmin }));
      setStatus('ready');
    } catch (err) {
      if (err.message === 'not-configured') {
        setStatus('off');
        return;
      }
      setLoadError(err.message);
      setStatus('error');
    }
  }, []);

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

    if (tooSoon()) {
      setNotice({ kind: 'error', text: 'You just signed — give it a minute before writing again.' });
      return;
    }

    setSending(true);
    setNotice(null);
    try {
      await addEntry({ name, message });
      setName('');
      setMessage('');
      setNotice({ kind: 'ok', text: 'Thank you — your note has been shown below.' });
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
      await setHidden(entry.id, !entry.hidden);
      await refresh(true);
    } catch (err) {
      setNotice({ kind: 'error', text: `Could not update that note: ${err.message}` });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(entry) {
    if (!window.confirm('Delete this note for good?\n\nHiding it is reversible; deleting is not.')) {
      return;
    }
    setBusyId(entry.id);
    setNotice(null);
    try {
      await removeEntry(entry.id);
      await refresh(true);
    } catch (err) {
      setNotice({ kind: 'error', text: `Could not delete that note: ${err.message}` });
    } finally {
      setBusyId(null);
    }
  }

  const canSubmit = name.trim() && message.trim() && !sending;

  return (
    <section id="guestbook" className="wrap guestbook" aria-labelledby="guestbook-title">
      <div className="guestbook__intro">
        <p className="hero__eyebrow">Leave a note</p>
        <h2 id="guestbook-title">Sign the guestbook</h2>
        <p>
          Write something to remember this by. Your name is kept private — only
          the message appears below.
        </p>
      </div>

      {status === 'off' ? (
        <div className="state">
          <p>The guestbook is not connected yet.</p>
        </div>
      ) : (
        <>
          <form className="panel guestbook__form" onSubmit={handleSubmit}>
            {notice && <div className={`alert alert--${notice.kind}`}>{notice.text}</div>}

            <div className="field">
              <label htmlFor="gb-name">Your name</label>
              <input
                className="input"
                id="gb-name"
                value={name}
                maxLength={MAX_NAME}
                onChange={(e) => setName(e.target.value)}
                // placeholder=""
                autoComplete="name"
              />
              <p className="field__hint">Only Van Bao can see this.</p>
            </div>

            <div className="field">
              <label htmlFor="gb-message">Your message</label>
              <textarea
                className="textarea"
                id="gb-message"
                rows="4"
                value={message}
                maxLength={MAX_MESSAGE}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="A memory, a wish, an inside joke…"
              />
              <p className="field__hint">
                {message.length} / {MAX_MESSAGE} · this part is shown publicly
              </p>
            </div>

            <button className="btn btn--accent" type="submit" disabled={!canSubmit}>
              {sending ? 'Saving…' : 'Add my note'}
            </button>
          </form>

          {isAuthed && status === 'ready' && (
            <p className="guestbook__adminhint">
              Signed in — you can see names and hidden notes. Guests see neither.
            </p>
          )}

          <div className="guestbook__wall">
            {status === 'loading' && (
              <div className="state">
                <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                <p>Loading notes…</p>
              </div>
            )}

            {status === 'error' && (
              <div className="state">
                <p>Could not load the notes. {loadError}</p>
              </div>
            )}

            {status === 'ready' && messages.length === 0 && (
              <div className="state">
                <p>No notes yet — be the first to write one.</p>
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
                        {entry.hidden ? 'Show' : 'Hide'}
                      </button>
                      <button
                        className="btn btn--danger btn--sm"
                        onClick={() => handleDelete(entry)}
                        disabled={busyId === entry.id}
                      >
                        Delete
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

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  drawInvitation, inviteUrl, cardFileName, cleanName, MAX_NAME,
} from '../lib/invitationCard.js';

export default function InviteMaker() {
  const [name, setName] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef(null);

  const trimmed = cleanName(name);

  // Redraw whenever the name changes. Async because the card waits for fonts.
  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    drawInvitation(canvas, trimmed).catch(() => {
      /* nothing useful to do — the canvas simply keeps its previous frame */
    });

    return () => { cancelled = true; };
  }, [trimmed]);

  // A new name invalidates the previously shared link
  useEffect(() => {
    setShareUrl('');
    setCopied(false);
  }, [trimmed]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !trimmed) return;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = cardFileName(trimmed);
      link.click();
      URL.revokeObjectURL(url);

      // The shareable link is revealed once the card has been saved
      setShareUrl(inviteUrl(trimmed));
    }, 'image/png');
  }, [trimmed]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the input below is selectable as a fallback */
    }
  }

  return (
    <main className="wrap admin-shell">
      <div className="panel__head">
        <h2>Invitation maker</h2>
        <p>Type a friend’s name, download their card, then share the link it generates.</p>
      </div>

      <div className="invite-layout">
        <div className="panel">
          <div className="field">
            <label htmlFor="guest">Guest name</label>
            <input
              className="input"
              id="guest"
              value={name}
              maxLength={MAX_NAME}
              placeholder="e.g. Thư"
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
            />
            <p className="field__hint">Up to {MAX_NAME} characters. Appears on the card.</p>
          </div>

          <button
            className="btn btn--accent btn--block"
            onClick={handleDownload}
            disabled={!trimmed}
          >
            Download card
          </button>

          {shareUrl && (
            <div className="share-box">
              <p className="share-box__title">Share this link with {trimmed}</p>
              <input className="input" readOnly value={shareUrl} onFocus={(e) => e.target.select()} />
              <button className="btn btn--ghost btn--block" onClick={copyLink}>
                {copied ? 'Copied' : 'Copy link'}
              </button>
              <p className="field__hint">
                Opening it shows this exact card, plus a way into the{' '}
                <Link to="/gallery">gallery</Link>.
              </p>
            </div>
          )}
        </div>

        <div className="card-preview">
          <canvas ref={canvasRef} className="card-canvas" />
          {!trimmed }
        </div>
      </div>
    </main>
  );
}

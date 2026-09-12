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
        <h2>Tạo thiệp mời</h2>
        <p>Nhập tên người nhận, tải thiệp xuống rồi gửi đường dẫn được tạo tự động.</p>
      </div>

      <div className="invite-layout">
        <div className="panel">
          <div className="field">
            <label htmlFor="guest">Tên người nhận</label>
            <input
              className="input"
              id="guest"
              value={name}
              maxLength={MAX_NAME}
              placeholder="Ví dụ: Thư"
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
            />
            <p className="field__hint">Tối đa {MAX_NAME} ký tự; tên sẽ xuất hiện trên thiệp.</p>
          </div>

          <button
            className="btn btn--accent btn--block"
            onClick={handleDownload}
            disabled={!trimmed}
          >
            Tải thiệp xuống
          </button>

          {shareUrl && (
            <div className="share-box">
              <p className="share-box__title">Gửi đường dẫn này cho {trimmed}</p>
              <input className="input" readOnly value={shareUrl} onFocus={(e) => e.target.select()} />
              <button className="btn btn--ghost btn--block" onClick={copyLink}>
                {copied ? 'Đã sao chép' : 'Sao chép đường dẫn'}
              </button>
              <p className="field__hint">
                Khi mở đường dẫn, người nhận sẽ thấy đúng tấm thiệp này và có
                thể đi tiếp đến <Link to="/gallery">trang kỷ niệm</Link>.
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

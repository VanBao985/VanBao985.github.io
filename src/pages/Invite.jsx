import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { drawInvitation, decodeName } from '../lib/invitationCard.js';

/**
 * The public side of an invitation. The guest's name travels in the URL
 * (`/invite?to=Minh`) rather than any store, which is what lets this work
 * on a static host with no backend and no sign-in.
 */
export default function Invite() {
  const [params] = useSearchParams();
  const name = decodeName(params.get('to'));
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawInvitation(canvas, name).catch(() => {
      /* leave the canvas blank rather than showing a broken state */
    });
  }, [name]);

  if (!name) {
    return (
      <main className="wrap">
        <div className="state">
          <h2>Thiệp mời chưa đầy đủ</h2>
          <p>
            Đường dẫn đang thiếu tên người nhận. Hãy xin lại đường dẫn mới hoặc
            ghé thẳng <Link to="/gallery">trang kỷ niệm</Link>.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="wrap invite-page">
      <section className="invite-cta">
        <h2>
          Four years, in photographs
          <span className="invite-cta__heading-vi">
            Bốn năm thanh xuân qua từng khung hình
          </span>
        </h2>
        <p>
          Before the ceremony, let&rsquo;s look back on Văn Bảo&rsquo;s four-year journey.
          <span className="invite-cta__copy-vi">
            Trước ngày tốt nghiệp, hãy cùng nhìn lại hành trình bốn năm của Văn Bảo.
          </span>
        </p>

        <div className="invite-cta__action">
          {/* Decorative only — the link already says where it goes, so a
              screen reader gains nothing from two more "arrow" nodes. */}
          <span className="invite-cta__arrow" aria-hidden="true">
            <svg width="34" height="16" viewBox="0 0 34 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 8h28" />
              <path d="m24 2 6 6-6 6" />
            </svg>
          </span>

          <Link className="btn btn--accent invite-cta__btn" to="/gallery">
            <span>Explore the gallery and leave a note</span>
            <span className="invite-cta__btn-vi">
              Xem lại hành trình và gửi một lời nhắn
            </span>
          </Link>

          <span className="invite-cta__arrow invite-cta__arrow--flip" aria-hidden="true">
            <svg width="34" height="16" viewBox="0 0 34 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 8h28" />
              <path d="m24 2 6 6-6 6" />
            </svg>
          </span>
        </div>
      </section>
      
      <div className="card-preview">
        <canvas ref={canvasRef} className="card-canvas" />
      </div>

      
    </main>
  );
}

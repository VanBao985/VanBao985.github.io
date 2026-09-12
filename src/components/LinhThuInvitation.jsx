import { SCHEDULE } from '../data/schedule.js';
import { VENUE } from '../data/venue.js';

const MAX_GUEST_NAME = 40;

export function cleanGuestName(rawName) {
  return String(rawName ?? '')
    // `/NguyenVanA` is convenient to type and becomes `Nguyen Van A` on-card.
    .replace(/(\p{Ll})(\p{Lu})/gu, '$1 $2')
    .replace(/[+_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_GUEST_NAME);
}

export default function LinhThuInvitation({ guestName }) {
  const name = cleanGuestName(guestName);
  const ceremony = SCHEDULE.find((slot) => slot.mine) ?? SCHEDULE[0];

  return (
    <section id="invite" className="linhthu-invite" aria-labelledby="linhthu-invite-title">
      <div className="wrap linhthu-invite__layout">
        <div className="linhthu-invite__intro">
          <p className="hero__eyebrow">Graduation invitation · Thiệp mời tốt nghiệp</p>
          <h1 id="linhthu-invite-title">
            Hẹn bạn trong ngày tốt nghiệp của <em>Linh Thư</em>
          </h1>
          <p>
            Cảm ơn bạn đã đồng hành cùng mình trong những năm tháng thanh xuân.
            Sự hiện diện của bạn sẽ khiến ngày đặc biệt này thêm trọn vẹn.
          </p>

          {!name && (
            <p className="linhthu-invite__tip">
              Thêm tên người nhận vào cuối đường dẫn để tạo thiệp riêng, ví dụ{' '}
              <code>/gallery/linhthu/NguyenVanA</code>.
            </p>
          )}
        </div>

        <article className="linhthu-card" aria-label={`Thiệp mời dành cho ${name || 'bạn'}`}>
          <div className="linhthu-card__ornament" aria-hidden="true">✦</div>
          <div className="linhthu-card__topline">
            <span className="linhthu-card__monogram">LT</span>
            <span>HUST · Graduation 2026</span>
          </div>

          <div className="linhthu-card__body">
            <p className="linhthu-card__kicker">Thư mời lễ tốt nghiệp</p>
            <p className="linhthu-card__salutation">Thân gửi</p>
            <h2>{name || 'Bạn thân mến'}</h2>
            <p>
              Linh Thư thân mời bạn đến chung vui trong lễ tốt nghiệp và cùng
              mình lưu lại những khoảnh khắc đáng nhớ.
            </p>
          </div>

          <dl className="linhthu-card__details">
            <div>
              <dt>Thời gian</dt>
              <dd>{ceremony.time}</dd>
              <dd>{ceremony.date}</dd>
            </div>
            <div>
              <dt>Địa điểm</dt>
              <dd>{VENUE.building}</dd>
              <dd>Đại học Bách khoa Hà Nội</dd>
            </div>
          </dl>

          <p className="linhthu-card__signature">Mong được gặp bạn — Linh Thư</p>
        </article>
      </div>
    </section>
  );
}

import { SCHEDULE } from '../data/schedule.js';

/**
 * The university's graduation weekend, with one session marked as the host's.
 *
 * It sits below the guestbook because it is reference material: a guest who
 * came for the photos has already got what they came for, and a guest checking
 * when to turn up can scroll for it. Edit src/data/schedule.js — no changes
 * here are needed to add, remove or re-mark a session.
 */
export default function Schedule() {
  return (
    <section id="schedule" className="schedule">
      <div className="wrap">
        <p className="hero__eyebrow">Graduation weekend</p>
        <h2 className="schedule__title">Four ceremonies across two days</h2>
        <p className="schedule__intro">
          The university hands out degrees in four sessions. Mine is the first
          one, on Saturday morning. <br/>
          Lễ tốt nghiệp diễn ra trong 4 buổi. Buổi của mình là sáng thứ bảy 26.09.2026.
        </p>

        <ol className="schedule__list">
          {SCHEDULE.map((slot) => (
            <li
              key={`${slot.date}-${slot.day}`}
              className={`schedule__item${slot.mine ? ' schedule__item--mine' : ''}`}
              // Marks the host's session for a screen reader too, which the
              // colour and badge alone would not.
              aria-current={slot.mine ? 'true' : undefined}
            >
              <div className="schedule__when">
                <span className="schedule__day">{slot.day}</span>
                <span className="schedule__date">{slot.date}</span>
              </div>

              <div className="schedule__what">
                {slot.mine && <span className="schedule__badge">My ceremony</span>}
                <p className="schedule__detail">{slot.detail}</p>
                {slot.mine && (slot.time || slot.venue) && (
                  <p className="schedule__where">
                    {[slot.time, slot.venue].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

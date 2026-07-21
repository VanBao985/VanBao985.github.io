import StatCounter from './StatCounter.jsx';
import { ACHIEVEMENTS } from '../data/achievements.js';

export default function Achievements() {
  return (
    <section className="wrap achievements" aria-label="Achievements">
      <p className="achievements__eyebrow">Highlights</p>
      <div className="achievements__grid">
        {ACHIEVEMENTS.map((a, i) => (
          <article
            key={a.label}
            className="achievement"
            style={{ animationDelay: `${i * 90}ms` }}
          >
            <div className="achievement__value">
              <StatCounter value={a.value} decimals={a.decimals} />
              {a.unit && <span className="achievement__unit">{a.unit}</span>}
            </div>
            <span className="achievement__label">{a.label}</span>
            {a.note && <p className="achievement__note">{a.note}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}

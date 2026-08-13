import { useEffect, useRef, useState } from 'react';
import { SECTIONS } from '../data/sections.js';

/**
 * Contents list pinned to the right edge of the gallery.
 *
 * The links are real anchors so that keyboard, middle-click and "copy link
 * address" all behave, and the URL ends up pointing at the section. The scroll
 * itself is taken over in JS for one reason: the browser only scrolls when the
 * fragment *changes*, so clicking "Guestbook", scrolling away by hand, then
 * clicking "Guestbook" again did nothing at all.
 *
 * There is only room for it once the viewport is wider than the content plus
 * two margins, so CSS hides it below that instead of letting it sit on top of
 * the photos.
 */
export default function SectionNav() {
  const [active, setActive] = useState(SECTIONS[0].id);
  const onScreen = useRef(new Set());

  useEffect(() => {
    const els = SECTIONS
      .map(({ id }) => document.getElementById(id))
      .filter(Boolean);
    if (!els.length) return undefined;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) onScreen.current.add(entry.target.id);
          else onScreen.current.delete(entry.target.id);
        }

        // Sections overlap this band while scrolling, so take the first one in
        // page order rather than whichever entry fired last — otherwise the
        // highlight jumps backwards on the way down.
        const first = SECTIONS.find((s) => onScreen.current.has(s.id));
        if (first) setActive(first.id);
      },
      // A thin band across the middle of the viewport: a section counts as
      // "where you are" only once it has actually reached the middle, which
      // is what a reader would say too.
      { rootMargin: '-45% 0px -50% 0px' },
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  function goTo(event, id) {
    // Leave modified clicks alone — those mean "open in a new tab", not "jump".
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const target = document.getElementById(id);
    if (!target) return; // no such section: let the anchor do whatever it can

    event.preventDefault();
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // block:'start' honours the section's scroll-margin-top, so it clears the
    // sticky header without repeating the offset here.
    target.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
    // replaceState, not a hash assignment: assigning would make the browser
    // scroll a second time, fighting the animation above.
    history.replaceState(null, '', `#${id}`);
  }

  return (
    <nav className="section-nav" aria-label="Page sections">
      <ul>
        {SECTIONS.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className={`section-nav__link${active === section.id ? ' is-active' : ''}`}
              aria-current={active === section.id ? 'true' : undefined}
              onClick={(event) => goTo(event, section.id)}
            >
              <span className="section-nav__line" aria-hidden="true" />
              <span className="section-nav__label">{section.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

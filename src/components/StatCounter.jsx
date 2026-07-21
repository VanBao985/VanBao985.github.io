import { useEffect, useRef, useState } from 'react';

// Ease-out cubic: fast start, gentle landing.
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

export default function StatCounter({ value, decimals = 0, duration = 1200 }) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef();

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value);
      return;
    }

    // Anchor to the first frame, not mount time: rAF is paused in hidden
    // tabs, so anchoring at mount would skip the animation entirely when
    // the page is first opened in the background.
    let start = null;
    const tick = (now) => {
      if (start === null) start = now;
      const t = Math.min(1, (now - start) / duration);
      setDisplay(value * easeOut(t));
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value, duration]);

  return <>{display.toFixed(decimals)}</>;
}

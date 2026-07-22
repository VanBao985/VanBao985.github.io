import { useEffect, useRef, useState } from 'react';

/**
 * Visit counter.
 *
 * A static site has nowhere to keep a running total, so the number lives on
 * counterapi.dev — a free, keyless counter service. Consequences worth
 * knowing: each page view sends a request to that third party, and because
 * the endpoint is public anyone who reads the bundle could inflate the count.
 * Fine for a personal gallery, not a metric to trust.
 *
 * If the service is unreachable the component renders nothing rather than
 * showing a broken placeholder.
 */
const ENDPOINT = 'https://api.counterapi.dev/v1/vanbao985/college-memories';
const SESSION_KEY = 'visit-counted';

export default function VisitorCounter() {
  const [count, setCount] = useState(null);
  const requested = useRef(false);

  useEffect(() => {
    // StrictMode runs effects twice in development; without this guard the
    // counter would be bumped twice on every local page load.
    if (requested.current) return;
    requested.current = true;

    // Count once per browser session, then only read — so hitting refresh
    // repeatedly does not inflate the total.
    let path = '/up';
    try {
      if (sessionStorage.getItem(SESSION_KEY)) path = '/';
      else sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      /* private mode: fall back to counting this view */
    }

    fetch(`${ENDPOINT}${path}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data) => {
        if (typeof data?.count === 'number') setCount(data.count);
      })
      .catch(() => {
        /* service down — leave the counter hidden */
      });
  }, []);

  if (count === null) return null;

  return (
    <span className="visitor-count" title="Total visits">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      <span className="visitor-count__num">{count.toLocaleString()}</span>
      visits
    </span>
  );
}

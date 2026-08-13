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
 *
 * This is counterapi v2; v1 is deprecated. The two differ in response shape as
 * well as URL, so moving the endpoint alone leaves the counter invisible —
 * see the parsing below.
 */
const ENDPOINT = 'https://api.counterapi.dev/v2/bao-cao-vans-team-4793/pageviews123';
const SESSION_KEY = 'up_count';

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
    //
    // The read path is '' and not '/': a trailing slash makes v2 answer 301,
    // and the redirect carries no CORS header, so the browser kills the
    // request outright. That failed silently for anyone on their second page
    // view — the first view takes /up and works, which is what made it look
    // like the counter worked for some visitors and not others.
    let path = '/up';
    try {
      if (sessionStorage.getItem(SESSION_KEY)) path = '';
      else sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      /* private mode: fall back to counting this view */
    }

    fetch(`${ENDPOINT}${path}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((body) => {
        // v2 nests the counter and renames the field: `{ data: { up_count } }`,
        // where v1 replied with a flat `{ count }`. Reading the old shape gives
        // undefined, which silently hides the counter instead of erroring —
        // exactly how this broke when the endpoint was switched over.
        const total = body?.data?.up_count ?? body?.count;
        if (typeof total === 'number') setCount(total);
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

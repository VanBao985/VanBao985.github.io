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
          <h2>This invitation is incomplete</h2>
          <p>
            The link is missing a name. Ask for a new one — or head straight to the{' '}
            <Link to="/gallery">gallery</Link>.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="wrap invite-page">
      <section className="invite-cta">
        <h2>Four years, in photographs</h2>
        <p>
          Before the ceremony, take a look through the lecture halls, the trips and
          the late nights that led here.
        </p>
        <Link className="btn btn--accent" to="/gallery">
          Explore the gallery
        </Link>
      </section> 
      
      <div className="card-preview">
        <canvas ref={canvasRef} className="card-canvas" />
      </div>

      
    </main>
  );
}

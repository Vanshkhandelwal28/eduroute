/**
 * EduRoute Landing — cinematic redesign (Phase 11 polish).
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthModal } from '../components/AuthModal';
import Experience from '../experience/Experience.js';
import Cursor from '../experience/ui/Cursor.js';
import Loader from '../experience/ui/Loader.js';
import '../experience/styles/landing.css';

export const LandingPage = () => {
  const [auth, setAuth] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const experienceRef = useRef<InstanceType<typeof Experience> | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const loader = new Loader();
    const cursor = new Cursor();

    // Mount WebGL after a short beat so loader is visible
    const experience = new Experience({ canvas: canvasRef.current });
    experienceRef.current = experience;

    // Dismiss loader once first frames are likely ready
    const t = window.setTimeout(() => {
      loader.dismiss();
    }, 900);

    return () => {
      window.clearTimeout(t);
      loader.dispose();
      cursor.dispose();
      experience.destroy();
      experienceRef.current = null;
    };
  }, []);

  return (
    <div className="er-landing">
      <AuthModal isOpen={auth} onClose={() => setAuth(false)} />

      <canvas id="webgl-canvas" ref={canvasRef} />

      <nav className="er-nav">
        <a href="#hero" className="er-nav__logo">
          EduRoute
        </a>
        <div className="er-nav__links">
          <a href="#manifesto">Manifesto</a>
          <a href="#feature-01">Work</a>
          <a href="#team">Team</a>
          <Link to="/roadmaps">Explore</Link>
        </div>
        <button type="button" className="er-nav__cta" onClick={() => setAuth(true)}>
          Begin
        </button>
      </nav>

      <main className="er-main">
        <section id="hero" className="er-section er-hero">
          <p className="er-label">EduRoute</p>
          <h1 className="er-title">
            <span className="er-reveal">
              <span>Intelligence</span>
            </span>
            <span className="er-reveal">
              <span>meets</span>
            </span>
            <span className="er-reveal">
              <span>direction.</span>
            </span>
          </h1>
          <p className="er-body">
            A cinematic platform for discovering skills, mapping opportunity, and building the path that is uniquely yours.
          </p>
          <div className="er-hero__actions er-interactive">
            <button type="button" className="er-btn er-btn--primary" onClick={() => setAuth(true)}>
              Start your journey
              <span className="er-btn__arrow" aria-hidden="true">
                →
              </span>
            </button>
            <a href="#manifesto" className="er-btn er-btn--ghost">
              Scroll to explore
              <span className="er-btn__arrow" aria-hidden="true">
                →
              </span>
            </a>
          </div>
          <p className="er-scroll-hint">Scroll</p>
        </section>

        <section id="manifesto" className="er-section er-manifesto">
          <p className="er-label">01 — Manifesto</p>
          <h2 className="er-title">
            <span className="er-reveal">
              <span>We believe</span>
            </span>
            <span className="er-reveal">
              <span>learning should</span>
            </span>
            <span className="er-reveal">
              <span>feel like</span>
            </span>
            <span className="er-reveal">
              <span>discovery.</span>
            </span>
          </h2>
          <p className="er-body">
            Too many platforms treat education as a checklist. We treat it as a living system — one that adapts to who you are and where the world is heading.
          </p>
        </section>

        <section id="feature-01" className="er-section er-feature">
          <p className="er-label">02 — Discover</p>
          <h2 className="er-title">
            <span className="er-reveal">
              <span>Know your</span>
            </span>
            <span className="er-reveal">
              <span>signal.</span>
            </span>
          </h2>
          <p className="er-body">
            Map strengths, interests and gaps with clarity. The first step is understanding the shape of your own potential.
          </p>
        </section>

        <section id="feature-02" className="er-section er-feature er-feature--right">
          <p className="er-label">03 — Connect</p>
          <h2 className="er-title">
            <span className="er-reveal">
              <span>Skills to</span>
            </span>
            <span className="er-reveal">
              <span>opportunity.</span>
            </span>
          </h2>
          <p className="er-body">
            From curiosity to capability. From capability to real-world paths — internships, projects, and roles that match your trajectory.
          </p>
        </section>

        <section id="feature-03" className="er-section er-feature">
          <p className="er-label">04 — Evolve</p>
          <h2 className="er-title">
            <span className="er-reveal">
              <span>Stay ahead</span>
            </span>
            <span className="er-reveal">
              <span>of the curve.</span>
            </span>
          </h2>
          <p className="er-body">
            Markets shift. Skills age. We keep your route alive with live signals, adaptive roadmaps, and intelligent guidance.
          </p>
        </section>

        <section id="team" className="er-section">
          <p className="er-label">05 — Team</p>
          <h2 className="er-title">
            <span className="er-reveal">
              <span>Built by</span>
            </span>
            <span className="er-reveal">
              <span>curious minds.</span>
            </span>
          </h2>
          <div className="er-team__grid">
            <div className="er-team__member">
              <p className="er-team__name">Alex Rivera</p>
              <p className="er-team__role">Founder & Vision</p>
            </div>
            <div className="er-team__member">
              <p className="er-team__name">Sam Chen</p>
              <p className="er-team__role">Product & Systems</p>
            </div>
            <div className="er-team__member">
              <p className="er-team__name">Jordan Lee</p>
              <p className="er-team__role">Experience Design</p>
            </div>
          </div>
        </section>

        <section id="cta" className="er-section er-cta">
          <p className="er-label">06 — Begin</p>
          <h2 className="er-title">
            <span className="er-reveal">
              <span>Your route</span>
            </span>
            <span className="er-reveal">
              <span>starts here.</span>
            </span>
          </h2>
          <p className="er-body">
            Join a platform designed for the next generation of builders, thinkers, and explorers.
          </p>
          <div className="er-cta__actions er-interactive">
            <button type="button" className="er-btn er-btn--primary" onClick={() => setAuth(true)}>
              Create account
              <span className="er-btn__arrow" aria-hidden="true">
                →
              </span>
            </button>
            <Link to="/roadmaps" className="er-btn er-btn--ghost">
              Explore roadmaps
              <span className="er-btn__arrow" aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        </section>

        <footer className="er-footer">
          <p className="er-footer__brand">EduRoute</p>
          <div className="er-footer__links er-interactive">
            <Link to="/roadmaps">Roadmaps</Link>
            <Link to="/internships">Internships</Link>
            <Link to="/buddy">AI Buddy</Link>
            <a href="#manifesto">Manifesto</a>
          </div>
          <p className="er-footer__copy">© 2026 EduRoute</p>
        </footer>
      </main>
    </div>
  );
};

export default LandingPage;

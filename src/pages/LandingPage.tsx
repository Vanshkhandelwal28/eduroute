/**
 * EduRoute Landing — final cinematic experience.
 * Story: IDEA → STRUCTURE → TRANSFORM → INTELLIGENCE → CONNECTION → ACTION
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthModal } from '../components/AuthModal';
import Experience from '../experience/Experience.js';
import Cursor from '../experience/ui/Cursor.js';
import Loader from '../experience/ui/Loader.js';
import gsap from 'gsap';
import '../experience/styles/landing.css';

function revealHeroNow() {
  const root = document.querySelector('.er-landing');
  if (root) root.classList.add('is-ready');

  const spans = document.querySelectorAll('#hero .er-reveal > span');
  spans.forEach((el) => {
    (el as HTMLElement).style.transform = 'translateY(0)';
    (el as HTMLElement).style.opacity = '1';
  });

  try {
    gsap.fromTo(
      spans,
      { yPercent: 110, opacity: 0 },
      {
        yPercent: 0,
        opacity: 1,
        duration: 1.2,
        ease: 'power3.out',
        stagger: 0.12,
        overwrite: true,
      }
    );
    const body = document.querySelector('#hero .er-body');
    const label = document.querySelector('#hero .er-label');
    if (label) {
      gsap.fromTo(label, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.8 });
    }
    if (body) {
      gsap.fromTo(
        body,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.9, delay: 0.3 }
      );
    }
  } catch {
    /* static visibility already applied */
  }
}

export const LandingPage = () => {
  const [auth, setAuth] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const experienceRef = useRef<InstanceType<typeof Experience> | null>(null);

  useEffect(() => {
    document.body.classList.add('er-on-landing');

    if (!canvasRef.current) {
      revealHeroNow();
      return;
    }

    const loader = new Loader();
    const cursor = new Cursor();

    let experience: InstanceType<typeof Experience> | null = null;
    try {
      experience = new Experience({ canvas: canvasRef.current });
      experienceRef.current = experience;
    } catch {
      document.querySelector('.er-landing')?.classList.add('er-no-webgl');
    }

    // Loader → first frame → hero type: one continuous beat
    const revealT = window.setTimeout(() => {
      revealHeroNow();
      loader.dismiss();
    }, 1100);

    const safetyT = window.setTimeout(() => {
      revealHeroNow();
    }, 2200);

    return () => {
      document.body.classList.remove('er-on-landing');
      window.clearTimeout(revealT);
      window.clearTimeout(safetyT);
      loader.dispose();
      cursor.dispose();
      experience?.destroy();
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
        {/* IDEA */}
        <section id="hero" className="er-section er-hero">
          <p className="er-label">Idea</p>
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

        {/* STRUCTURE */}
        <section id="manifesto" className="er-section er-manifesto">
          <p className="er-label">01 — Structure</p>
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

        {/* TRANSFORM */}
        <section id="feature-01" className="er-section er-feature">
          <p className="er-label">02 — Transform</p>
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

        {/* INTELLIGENCE */}
        <section id="feature-02" className="er-section er-feature er-feature--right">
          <p className="er-label">03 — Intelligence</p>
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

        {/* CONNECTION */}
        <section id="feature-03" className="er-section er-feature">
          <p className="er-label">04 — Connection</p>
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
          <p className="er-label">05 — Minds</p>
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

        {/* ACTION */}
        <section id="cta" className="er-section er-cta">
          <p className="er-label">06 — Action</p>
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

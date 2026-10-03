/**
 * EduRoute Landing — Dala-matched sparse editorial + real brain hero.
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AuthModal } from '../components/AuthModal';
import { DalaBrainHero } from '../components/DalaBrainHero';
import Loader from '../experience/ui/Loader.js';
import gsap from 'gsap';
import '../experience/styles/landing.css';

const SECTIONS = [
  { id: 'hero', label: 'Idea' },
  { id: 'manifesto', label: 'Manifesto' },
  { id: 'feature-01', label: 'Work' },
  { id: 'team', label: 'Team' },
];

const TEAM = [
  { initials: 'AR', name: 'Alex Rivera', role: 'Founder & Vision', hue: 265 },
  { initials: 'SC', name: 'Sam Chen', role: 'Product & Systems', hue: 195 },
  { initials: 'JL', name: 'Jordan Lee', role: 'Experience Design', hue: 35 },
];

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
      gsap.fromTo(label, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.8 });
    }
    if (body) {
      gsap.fromTo(
        body,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.9, delay: 0.3 }
      );
    }
  } catch {
    /* static */
  }
}

export const LandingPage = () => {
  const [auth, setAuth] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');
  const loaderRef = useRef<InstanceType<typeof Loader> | null>(null);
  const revealed = useRef(false);

  const finishLoad = useCallback(() => {
    if (revealed.current) return;
    revealed.current = true;
    const loader = loaderRef.current;
    if (loader) {
      loader.setProgress(1);
      loader.complete().then(() => revealHeroNow());
    } else {
      revealHeroNow();
    }
  }, []);

  const scrollToTop = useCallback(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  }, []);

  useEffect(() => {
    document.body.classList.add('er-on-landing');

    const onScroll = () => {
      setShowTop(window.scrollY > window.innerHeight * 0.75);

      const mid = window.scrollY + window.innerHeight * 0.35;
      let current = 'hero';
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (el && el.offsetTop <= mid) current = s.id;
      }
      const f1 = document.getElementById('feature-01');
      if (f1 && f1.offsetTop <= mid) current = 'feature-01';
      const team = document.getElementById('team');
      if (team && team.offsetTop <= mid) current = 'team';
      setActiveSection(current);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const loader = new Loader();
    loaderRef.current = loader;
    loader.setProgress(0.2);

    const safetyT = window.setTimeout(() => finishLoad(), 8000);

    return () => {
      document.body.classList.remove('er-on-landing');
      window.removeEventListener('scroll', onScroll);
      window.clearTimeout(safetyT);
      loader.dispose();
      loaderRef.current = null;
    };
  }, [finishLoad]);

  const handleBrainReady = useCallback(() => {
    loaderRef.current?.setProgress(0.85);
    window.setTimeout(() => finishLoad(), 200);
  }, [finishLoad]);

  return (
    <div className="er-landing er-landing--dala">
      <AuthModal isOpen={auth} onClose={() => setAuth(false)} />

      <DalaBrainHero mode="fixed" ready onReady={handleBrainReady} />

      <div className="er-progress" aria-hidden="true">
        {['hero', 'manifesto', 'feature-01', 'feature-02', 'feature-03', 'team', 'cta'].map(
          (id) => (
            <span
              key={id}
              className={`er-progress__tick${activeSection === id ? ' is-active' : ''}`}
            />
          )
        )}
      </div>

      <nav className="er-nav">
        <a href="#hero" className="er-nav__logo">
          EduRoute
        </a>
        <div className="er-nav__links">
          <a href="#manifesto" className={activeSection === 'manifesto' ? 'is-active' : ''}>
            Manifesto
          </a>
          <a href="#feature-01" className={activeSection === 'feature-01' ? 'is-active' : ''}>
            Work
          </a>
          <a href="#team" className={activeSection === 'team' ? 'is-active' : ''}>
            Team
          </a>
          <Link to="/roadmaps">Explore</Link>
        </div>
        <button type="button" className="er-nav__cta" onClick={() => setAuth(true)}>
          Begin
        </button>
      </nav>

      <main className="er-main">
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
            Discover skills. Map opportunity. Build the path that is yours.
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
        </section>

        <section id="manifesto" className="er-section er-manifesto">
          <p className="er-label">01 — Structure</p>
          <h2 className="er-title er-title--editorial">
            <span className="er-reveal">
              <span>Learning should</span>
            </span>
            <span className="er-reveal">
              <span>feel like</span>
            </span>
            <span className="er-reveal">
              <span>discovery.</span>
            </span>
          </h2>
          <p className="er-body er-body--wide">
            Not a checklist — a living system that adapts to who you are and where the world is heading.
          </p>
        </section>

        <section id="feature-01" className="er-section er-feature">
          <p className="er-label">02 — Transform</p>
          <h2 className="er-title er-title--short">
            <span className="er-reveal">
              <span>Know your</span>
            </span>
            <span className="er-reveal">
              <span>signal.</span>
            </span>
          </h2>
          <p className="er-body">
            Map strengths, interests, and gaps with clarity.
          </p>
        </section>

        <section id="feature-02" className="er-section er-feature er-feature--right">
          <p className="er-label">03 — Intelligence</p>
          <h2 className="er-title er-title--short">
            <span className="er-reveal">
              <span>Skills to</span>
            </span>
            <span className="er-reveal">
              <span>opportunity.</span>
            </span>
          </h2>
          <p className="er-body">
            From curiosity to capability — internships, projects, and roles that match your trajectory.
          </p>
        </section>

        <section id="feature-03" className="er-section er-feature">
          <p className="er-label">04 — Connection</p>
          <h2 className="er-title er-title--short">
            <span className="er-reveal">
              <span>Stay ahead</span>
            </span>
            <span className="er-reveal">
              <span>of the curve.</span>
            </span>
          </h2>
          <p className="er-body">
            Live signals. Adaptive roadmaps. Intelligent guidance.
          </p>
        </section>

        <section id="team" className="er-section">
          <p className="er-label">05 — Minds</p>
          <h2 className="er-title er-title--short">
            <span className="er-reveal">
              <span>Built by</span>
            </span>
            <span className="er-reveal">
              <span>curious minds.</span>
            </span>
          </h2>
          <div className="er-team__grid">
            {TEAM.map((m) => (
              <div key={m.initials} className="er-team__member">
                <div
                  className="er-team__avatar"
                  style={{
                    background: `linear-gradient(145deg, hsla(${m.hue}, 40%, 22%, 0.9), hsla(${m.hue}, 30%, 8%, 0.95))`,
                    borderColor: `hsla(${m.hue}, 35%, 45%, 0.35)`,
                  }}
                  aria-hidden="true"
                >
                  <span>{m.initials}</span>
                </div>
                <p className="er-team__name">{m.name}</p>
                <p className="er-team__role">{m.role}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="partners" className="er-section er-partners">
          <p className="er-label">Supported by</p>
          <div className="er-partners__row">
            <span>Campus Labs</span>
            <span>Skill Foundry</span>
            <span>Route Ventures</span>
            <span>Open Curriculum</span>
          </div>
        </section>

        <section id="cta" className="er-section er-cta">
          <p className="er-label">06 — Action</p>
          <h2 className="er-title er-title--short">
            <span className="er-reveal">
              <span>Your route</span>
            </span>
            <span className="er-reveal">
              <span>starts here.</span>
            </span>
          </h2>
          <p className="er-body">
            For the next generation of builders, thinkers, and explorers.
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

      <button
        type="button"
        className={`er-to-top${showTop ? ' is-visible' : ''}`}
        onClick={scrollToTop}
        aria-label="Scroll to top"
        title="Back to top"
      >
        <span className="er-to-top__arrow" aria-hidden="true">
          ↑
        </span>
      </button>
    </div>
  );
};

export default LandingPage;

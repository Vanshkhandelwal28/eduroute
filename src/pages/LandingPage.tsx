import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AuthModal } from '../components/AuthModal';
import { DalaBrainHero } from '../components/DalaBrainHero';

/* ================================================================
   EDUROUTE Landing — Dala visual language (dala.craftedbygc.com)
   Pure black · light editorial type · sparse nav · scroll manifesto
   Interactive particle brain · loading gate · line-by-line reveals
   ================================================================ */

const NAV = [
  { label: 'Manifesto', href: '#manifesto' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Roadmaps', href: '/roadmaps' },
  { label: 'Get Started', href: '#get-started', cta: true as const },
];

const STATS = [
  { n: '45K+', l: 'Active Learners' },
  { n: '80+', l: 'Roadmaps' },
  { n: '500+', l: 'Opportunities' },
  { n: '120+', l: 'Hackathons' },
];

const STEPS = [
  { n: '01', t: 'Sign up', b: 'Create a free account and pick the track you care about.' },
  { n: '02', t: 'Skill quiz', b: 'Answer a short quiz so we map your skill gaps with clarity.' },
  { n: '03', t: 'Get your path', b: 'Follow a personal roadmap, practice, and apply with confidence.' },
];

const FEATURES = [
  {
    t: 'Skill Assessment & Analysis',
    b: 'Take industry-aligned tests, get your skill profile and discover strengths and gaps.',
    h: '8.5/10 Overall',
  },
  {
    t: 'Personalized Learning Path',
    b: 'AI-powered roadmaps and curated resources to bridge gaps and reach your goals.',
    h: 'Beginner → Intermediate',
  },
  {
    t: 'Internships & Jobs',
    b: 'Verified openings from top companies. Apply and track progress in one place.',
    h: 'Google · Microsoft · TCS',
  },
  {
    t: 'Hackathons & Compete',
    b: 'Showcase skills, win rewards, and build a portfolio that hiring managers notice.',
    h: 'Win & Showcase',
  },
];

/** Manifesto lines — each reveals on scroll (Dala .js-manifesto-p pattern) */
const MANIFESTO_LINES = [
  'This is learning today. Countless fragments of guidance scattered across courses, Discord threads, and outdated roadmaps.',
  'Hours disappear trying to organise what to learn next — and whether it even matters for the role you want.',
  'The impossible battle to make sense of this chaos leaves learners overwhelmed and stuck.',
  'They face the anxiety of bothering mentors again, or applying with incomplete context and half-built portfolios.',
  'Existing platforms teach or list jobs — almost never both, and almost never with a clear personal path.',
  'They fail to understand what you need from the vast noise of tech content created every day.',
];

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, []);
  return reduced;
}

/** Scroll-reveal wrapper — opacity + rise when section enters viewport */
function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) {
      setOn(true);
      return;
    }
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setOn(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: on ? 1 : 0,
        transform: on ? 'translateY(0)' : 'translateY(28px)',
        transition: reduced
          ? 'none'
          : `opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.9s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

export const LandingPage = () => {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [phase, setPhase] = useState<'loading' | 'ready'>('loading');
  const [showText, setShowText] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('ready'), reduced ? 200 : 1600);
    const t2 = setTimeout(() => setShowText(true), reduced ? 300 : 2000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [reduced]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white antialiased selection:bg-white/20">
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      {/* Sparse fixed nav — Dala style */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-5 transition-colors duration-300 sm:px-10 ${
          scrolled ? 'bg-black/80 backdrop-blur-md' : 'bg-transparent'
        }`}
      >
        <a href="#home" className="text-[13px] font-medium tracking-[0.2em] uppercase">
          EDUROUTE
        </a>
        <div className="hidden items-center gap-10 md:flex">
          {NAV.map((item) =>
            item.cta ? (
              <button
                key={item.label}
                type="button"
                onClick={() => setIsAuthOpen(true)}
                className="border border-white/30 px-4 py-1.5 text-[11px] tracking-[0.14em] uppercase transition hover:bg-white hover:text-black"
              >
                {item.label}
              </button>
            ) : item.href.startsWith('/') ? (
              <Link
                key={item.label}
                to={item.href}
                className="text-[11px] tracking-[0.14em] uppercase text-white/50 transition hover:text-white"
              >
                {item.label}
              </Link>
            ) : (
              <a
                key={item.label}
                href={item.href}
                className="text-[11px] tracking-[0.14em] uppercase text-white/50 transition hover:text-white"
              >
                {item.label}
              </a>
            ),
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsAuthOpen(true)}
          className="border border-white/30 px-3 py-1 text-[11px] tracking-[0.12em] uppercase md:hidden"
        >
          Start
        </button>
      </nav>

      {/* ── Hero: particle brain + headline ── */}
      <section
        id="home"
        className="relative flex h-[100svh] min-h-[640px] flex-col items-center justify-center overflow-hidden"
      >
        <DalaBrainHero ready={phase === 'ready'} />

        {phase === 'loading' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black">
            <div className="mb-10 flex gap-2.5">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="block h-1.5 w-1.5 bg-white"
                  style={{
                    animation: reduced ? undefined : `dalaPulse 1.4s ease-in-out ${i * 0.18}s infinite`,
                  }}
                />
              ))}
            </div>
            <p className="max-w-xs text-center text-[13px] font-light leading-relaxed text-white/70">
              Your career has the answer.
              <br />
              Ask EDUROUTE to find it.
            </p>
            <p className="mt-8 text-[10px] tracking-[0.3em] uppercase text-white/30">Loading</p>
          </div>
        )}

        <div
          className={`relative z-10 mx-auto max-w-3xl px-6 text-center transition-all duration-1000 ${
            showText ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          <p className="mb-6 text-[11px] tracking-[0.28em] uppercase text-white/45">
            Unlock collective growth
          </p>
          <h1 className="text-[clamp(2.75rem,9vw,5.5rem)] font-light leading-[1.02] tracking-[-0.035em]">
            Build Skills.
            <br />
            Get Hired.
          </h1>
          <p className="mx-auto mt-8 max-w-md text-[15px] font-light leading-[1.7] text-white/50">
            Plug into a clear path — roadmaps, internships, hackathons and skill
            clarity in one place. Focus on doing your best work.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/roadmaps"
              className="bg-white px-7 py-3 text-[11px] font-medium tracking-[0.14em] uppercase text-black transition hover:bg-white/90"
            >
              Explore Roadmaps
            </Link>
            <button
              type="button"
              onClick={() => setIsAuthOpen(true)}
              className="border border-white/30 px-7 py-3 text-[11px] tracking-[0.14em] uppercase transition hover:border-white/70 hover:bg-white/5"
            >
              Request Access
            </button>
          </div>
        </div>

        <div
          className={`absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-[10px] tracking-[0.25em] uppercase text-white/30 transition-opacity duration-1000 ${
            showText ? 'opacity-100' : 'opacity-0'
          }`}
        >
          Scroll
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-t border-white/[0.08] px-6 py-14 sm:px-10">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-10 sm:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={s.l} delay={i * 80}>
              <div className="text-[clamp(1.5rem,3vw,2rem)] font-light tracking-tight">{s.n}</div>
              <div className="mt-1.5 text-[11px] tracking-[0.06em] text-white/40">{s.l}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Intro */}
      <section className="px-6 py-[min(18vh,8rem)] sm:px-10">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <h2 className="max-w-2xl text-[clamp(1.9rem,5vw,3.4rem)] font-light leading-[1.12] tracking-[-0.025em]">
              Make decisions
              <br />
              with confidence
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="mt-8 max-w-lg text-[15px] font-light leading-[1.75] text-white/50">
              EDUROUTE maps what you know, what you need, and where to apply — so
              you can take the guesswork out of growing in tech.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Manifesto — line by line (Dala pattern) */}
      <section id="manifesto" className="px-6 py-[min(12vh,5rem)] sm:px-10">
        <div className="mx-auto max-w-3xl">
          {MANIFESTO_LINES.map((line, i) => (
            <Reveal key={i} delay={Math.min(i * 60, 240)} className="mb-10 last:mb-0">
              <p className="text-[clamp(1.05rem,2.4vw,1.45rem)] font-light leading-[1.55] tracking-[-0.015em] text-white/55">
                {line}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Solution */}
      <section className="px-6 py-[min(20vh,9rem)] sm:px-10">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <h2 className="max-w-2xl text-[clamp(1.9rem,5vw,3.4rem)] font-light leading-[1.12] tracking-[-0.025em]">
              Spark lightbulb
              <br />
              moments
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p className="mt-8 max-w-lg text-[15px] font-light leading-[1.75] text-white/50">
              We connect assessment, learning and opportunity behind the scenes —
              and pull together exactly the path you need into one coherent view.
            </p>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-5 max-w-lg text-[15px] font-light leading-[1.75] text-white/50">
              Just ask EDUROUTE for the next step that advances your work — and
              help you decide with more confidence.
            </p>
          </Reveal>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="border-t border-white/[0.08] px-6 py-[min(20vh,9rem)] sm:px-10"
      >
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <p className="mb-3 text-[11px] tracking-[0.22em] uppercase text-white/35">How it works</p>
            <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-light tracking-[-0.02em]">
              Three clear steps.
            </h2>
          </Reveal>
          <div className="mt-16 grid gap-14 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 90}>
                <div className="mb-5 text-[11px] tracking-[0.2em] text-white/35">{s.n}</div>
                <h3 className="text-lg font-normal tracking-tight">{s.t}</h3>
                <p className="mt-3 text-[14px] font-light leading-relaxed text-white/45">{s.b}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-white/[0.08] px-6 py-[min(20vh,9rem)] sm:px-10">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <p className="mb-3 text-[11px] tracking-[0.22em] uppercase text-white/35">What we offer</p>
            <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-light tracking-[-0.02em]">
              Everything you need to grow
            </h2>
          </Reveal>
          <div className="mt-16 grid gap-x-16 gap-y-14 sm:grid-cols-2">
            {FEATURES.map((f, i) => (
              <Reveal key={f.t} delay={i * 70}>
                <h3 className="text-lg font-normal tracking-tight">{f.t}</h3>
                <p className="mt-3 text-[14px] font-light leading-relaxed text-white/45">{f.b}</p>
                <p className="mt-4 text-[11px] tracking-[0.08em] text-white/55">{f.h}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="px-6 py-[min(20vh,9rem)] sm:px-10">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <h2 className="max-w-2xl text-[clamp(1.9rem,5vw,3.4rem)] font-light leading-[1.12] tracking-[-0.025em]">
              Build a better path
              <br />
              into tech
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p className="mt-8 max-w-lg text-[15px] font-light leading-[1.75] text-white/50">
              Our mission is to make career growth coherent and delightful —
              reframing progress from “figure it out alone” to having a clear
              partner every step of the way.
            </p>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section
        id="get-started"
        className="border-y border-white/[0.08] px-6 py-24 text-center sm:px-10"
      >
        <Reveal>
          <h2 className="text-[clamp(1.7rem,3.8vw,2.6rem)] font-light tracking-[-0.02em]">
            Your workplace has the answer.
            <br />
            Your growth starts here.
          </h2>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/roadmaps"
              className="bg-white px-8 py-3.5 text-[11px] font-medium tracking-[0.14em] uppercase text-black transition hover:bg-white/90"
            >
              Explore Roadmaps
            </Link>
            <button
              type="button"
              onClick={() => setIsAuthOpen(true)}
              className="border border-white/30 px-8 py-3.5 text-[11px] tracking-[0.14em] uppercase transition hover:border-white/70"
            >
              Get Started
            </button>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="px-6 py-16 sm:px-10">
        <div className="mx-auto grid max-w-5xl gap-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-[13px] font-medium tracking-[0.16em] uppercase">EDUROUTE</div>
            <p className="mt-4 max-w-[240px] text-[13px] font-light leading-relaxed text-white/40">
              Learn. Build. Compete. Get Hired.
              <br />
              <br />
              One platform to build skills, explore opportunities and grow in tech.
            </p>
          </div>
          <div>
            <div className="mb-5 text-[10px] tracking-[0.18em] uppercase text-white/35">Quick links</div>
            <div className="space-y-2.5 text-[13px] font-light text-white/50">
              <a href="#home" className="block transition hover:text-white">Home</a>
              <a href="#manifesto" className="block transition hover:text-white">Manifesto</a>
              <a href="#how-it-works" className="block transition hover:text-white">How it works</a>
              <Link to="/roadmaps" className="block transition hover:text-white">Roadmaps</Link>
              <Link to="/internships" className="block transition hover:text-white">Internships</Link>
            </div>
          </div>
          <div>
            <div className="mb-5 text-[10px] tracking-[0.18em] uppercase text-white/35">Company</div>
            <div className="space-y-2.5 text-[13px] font-light text-white/50">
              <a href="#manifesto" className="block transition hover:text-white">About</a>
              <a href="#manifesto" className="block transition hover:text-white">Mission</a>
              <a href="#get-started" className="block transition hover:text-white">Contact</a>
              <span className="block text-white/30">Privacy</span>
              <span className="block text-white/30">Terms</span>
            </div>
          </div>
          <div>
            <div className="mb-5 text-[10px] tracking-[0.18em] uppercase text-white/35">Stay updated</div>
            <p className="mb-4 text-[13px] font-light text-white/40">
              Roadmaps, opportunities and tips — occasional, useful.
            </p>
            <input
              type="email"
              placeholder="Your email"
              className="mb-2 w-full border border-white/20 bg-transparent px-3 py-2.5 text-[13px] text-white outline-none placeholder:text-white/25 focus:border-white/50"
            />
            <button
              type="button"
              className="w-full bg-white py-2.5 text-[11px] font-medium tracking-[0.14em] uppercase text-black transition hover:bg-white/90"
            >
              Subscribe
            </button>
          </div>
        </div>
        <div className="mx-auto mt-16 flex max-w-5xl flex-col items-center justify-between gap-4 border-t border-white/[0.08] pt-8 text-[11px] text-white/30 sm:flex-row">
          <div>© 2026 EDUROUTE. All rights reserved.</div>
          <div className="flex gap-8">
            <a href="#manifesto" className="transition hover:text-white">Manifesto</a>
            <a href="#how-it-works" className="transition hover:text-white">How it works</a>
            <Link to="/roadmaps" className="transition hover:text-white">Roadmaps</Link>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes dalaPulse {
          0%, 100% { opacity: 0.2; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;

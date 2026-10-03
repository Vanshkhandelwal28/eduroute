import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AuthModal } from '../components/AuthModal';
import { DalaBrainHero } from '../components/DalaBrainHero';

/* ================================================================
   EDUROUTE landing — Dala-matched brain + editorial UI
   ================================================================ */

const NAV = [
  { label: 'Manifesto', href: '#manifesto' },
  { label: 'Product', href: '#product' },
  { label: 'Roadmaps', href: '/roadmaps' },
  { label: 'Request access', href: '#get-started', cta: true as const },
];

const STATS = [
  { n: '45K+', l: 'Learners' },
  { n: '80+', l: 'Roadmaps' },
  { n: '500+', l: 'Roles' },
  { n: '120+', l: 'Hackathons' },
];

const STEPS = [
  { n: '01', t: 'Sign up', b: 'Create a free account and choose the track you care about.' },
  { n: '02', t: 'Skill quiz', b: 'A short quiz maps your gaps with clarity — no fluff.' },
  { n: '03', t: 'Your path', b: 'Follow a personal roadmap, practice, and apply with confidence.' },
];

const FEATURES = [
  { t: 'Skill assessment', b: 'Industry-aligned tests. See strengths, gaps, and what to learn next.' },
  { t: 'Personal roadmaps', b: 'AI-shaped paths and curated resources from beginner to hire-ready.' },
  { t: 'Internships & jobs', b: 'Verified openings. Apply and track progress in one place.' },
  { t: 'Hackathons', b: 'Compete, ship, and build a portfolio hiring managers notice.' },
];

const MANIFESTO = [
  'This is learning today. Fragments of guidance scattered across courses, threads, and outdated roadmaps.',
  'Hours vanish organising what to learn next — and whether it even matters for the role you want.',
  'Making sense of the chaos leaves people overwhelmed and stuck.',
  'The anxiety of asking again. Applying with incomplete context. Half-built portfolios.',
  'Platforms teach or list jobs — almost never both, and almost never with a personal path.',
  'They fail to understand what you need from the noise created every day.',
];

/** Upstream Dala hero bg */
const DALA_PURPLE =
  'radial-gradient(circle at 50% 45%, #692a84 0%, #3c184c 65%)';

function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fn = () => setR(mq.matches);
    fn();
    mq.addEventListener?.('change', fn);
    return () => mq.removeEventListener?.('change', fn);
  }, []);
  return r;
}

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
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      setOn(true);
      return;
    }
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) {
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
      { threshold: 0.15, rootMargin: '0px 0px -6% 0px' },
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
        transform: on ? 'none' : 'translate3d(0, 32px, 0)',
        transition: reduced
          ? 'none'
          : `opacity 1s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 1s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

export const LandingPage = () => {
  const [auth, setAuth] = useState(false);
  const [phase, setPhase] = useState<'loading' | 'ready'>('loading');
  const [heroIn, setHeroIn] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const a = setTimeout(() => setPhase('ready'), reduced ? 100 : 1600);
    const b = setTimeout(() => setHeroIn(true), reduced ? 150 : 2000);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [reduced]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#12081a] text-white antialiased selection:bg-[#963CBD]/40">
      <AuthModal isOpen={auth} onClose={() => setAuth(false)} />

      <header
        className={`fixed inset-x-0 top-0 z-50 flex items-center justify-between px-5 py-4 sm:px-10 sm:py-5 ${
          scrolled ? 'bg-[#12081a]/80 backdrop-blur-md' : ''
        }`}
      >
        <a href="#home" className="text-[12px] font-medium tracking-[0.22em] uppercase">
          EDUROUTE
        </a>
        <nav className="hidden items-center gap-9 md:flex">
          {NAV.map((item) =>
            item.cta ? (
              <button
                key={item.label}
                type="button"
                onClick={() => setAuth(true)}
                className="border border-white/25 px-3.5 py-1.5 text-[10px] tracking-[0.16em] uppercase transition hover:bg-white hover:text-black"
              >
                {item.label}
              </button>
            ) : item.href.startsWith('/') ? (
              <Link
                key={item.label}
                to={item.href}
                className="text-[10px] tracking-[0.16em] uppercase text-white/45 transition hover:text-white"
              >
                {item.label}
              </Link>
            ) : (
              <a
                key={item.label}
                href={item.href}
                className="text-[10px] tracking-[0.16em] uppercase text-white/45 transition hover:text-white"
              >
                {item.label}
              </a>
            ),
          )}
        </nav>
        <button
          type="button"
          onClick={() => setAuth(true)}
          className="border border-white/25 px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase md:hidden"
        >
          Access
        </button>
      </header>

      <section
        id="home"
        className="relative flex h-[100svh] min-h-[620px] flex-col items-center justify-center overflow-hidden"
        style={{ background: DALA_PURPLE }}
      >
        <DalaBrainHero ready={phase === 'ready'} />

        {phase === 'loading' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black">
            <div className="mb-12 flex gap-3">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="h-1 w-1 bg-white"
                  style={{
                    animation: reduced
                      ? undefined
                      : `dalaDot 1.35s ease-in-out ${i * 0.16}s infinite`,
                  }}
                />
              ))}
            </div>
            <p className="max-w-[280px] text-center text-[15px] font-light leading-[1.55] text-white/75">
              Your workplace has the answer.
              <br />
              Ask EDUROUTE to find it.
            </p>
            <p className="mt-10 text-[9px] tracking-[0.35em] uppercase text-white/25">Loading</p>
          </div>
        )}

        <div
          className={`pointer-events-none relative z-10 mx-auto max-w-2xl px-6 text-center transition-all duration-[1100ms] ease-out ${
            heroIn ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
          }`}
        >
          <p className="mb-5 text-[10px] tracking-[0.32em] uppercase text-white/40">
            Unlock collective growth
          </p>
          <h1 className="text-[clamp(2.8rem,9.5vw,5.75rem)] font-light leading-[0.98] tracking-[-0.04em]">
            Build skills.
            <br />
            Get hired.
          </h1>
          <p className="mx-auto mt-7 max-w-sm text-[14px] font-light leading-[1.65] text-white/45">
            Stop managing your career like a second job. Start using a path that
            connects learning, practice, and real opportunities.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setAuth(true)}
              className="pointer-events-auto bg-white px-6 py-2.5 text-[10px] font-medium tracking-[0.16em] uppercase text-black transition hover:bg-white/90"
            >
              Request access
            </button>
            <Link
              to="/roadmaps"
              className="pointer-events-auto border border-white/20 px-6 py-2.5 text-[10px] tracking-[0.16em] uppercase text-white/80 transition hover:border-white/50"
            >
              Explore roadmaps
            </Link>
          </div>
        </div>

        <p
          className={`pointer-events-none absolute bottom-7 left-1/2 z-10 -translate-x-1/2 text-[9px] tracking-[0.3em] uppercase text-white/25 transition-opacity duration-1000 ${
            heroIn ? 'opacity-100' : 'opacity-0'
          }`}
        >
          Scroll
        </p>
      </section>

      <section className="border-t border-white/[0.06] px-6 py-16 sm:px-10">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 sm:grid-cols-4 sm:gap-6">
          {STATS.map((s, i) => (
            <Reveal key={s.l} delay={i * 70}>
              <p className="text-[1.75rem] font-light tracking-tight sm:text-[2rem]">{s.n}</p>
              <p className="mt-1 text-[10px] tracking-[0.12em] uppercase text-white/35">{s.l}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="px-6 py-28 sm:px-10 sm:py-36">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <h2 className="max-w-xl text-[clamp(2rem,5.5vw,3.6rem)] font-light leading-[1.08] tracking-[-0.03em]">
              Make decisions
              <br />
              with confidence
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p className="mt-8 max-w-md text-[15px] font-light leading-[1.7] text-white/45">
              EDUROUTE extracts clarity from the noise — skills you have, skills
              you need, and where to apply — so growth stops feeling like guesswork.
            </p>
          </Reveal>
        </div>
      </section>

      <section id="manifesto" className="px-6 py-16 sm:px-10 sm:py-24">
        <div className="mx-auto max-w-2xl">
          {MANIFESTO.map((line, i) => (
            <Reveal key={i} delay={Math.min(i * 50, 200)} className="mb-12 last:mb-0 sm:mb-14">
              <p className="text-[clamp(1.15rem,2.6vw,1.55rem)] font-light leading-[1.5] tracking-[-0.02em] text-white/50">
                {line}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="px-6 py-28 sm:px-10 sm:py-36">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <h2 className="max-w-xl text-[clamp(2rem,5.5vw,3.6rem)] font-light leading-[1.08] tracking-[-0.03em]">
              Spark lightbulb
              <br />
              moments
            </h2>
          </Reveal>
          <Reveal delay={90}>
            <p className="mt-8 max-w-md text-[15px] font-light leading-[1.7] text-white/45">
              Assessment, learning, and opportunity — connected. One contextual
              view of the next step that actually advances your work.
            </p>
          </Reveal>
        </div>
      </section>

      <section id="product" className="border-t border-white/[0.06] px-6 py-28 sm:px-10 sm:py-32">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <p className="mb-2 text-[10px] tracking-[0.28em] uppercase text-white/30">How it works</p>
            <h2 className="text-[clamp(1.75rem,4vw,2.6rem)] font-light tracking-[-0.025em]">
              Three clear steps
            </h2>
          </Reveal>
          <div className="mt-16 grid gap-12 sm:grid-cols-3 sm:gap-10">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 80}>
                <p className="mb-4 text-[10px] tracking-[0.22em] text-white/30">{s.n}</p>
                <h3 className="text-[17px] font-normal tracking-tight">{s.t}</h3>
                <p className="mt-3 text-[13px] font-light leading-relaxed text-white/40">{s.b}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/[0.06] px-6 py-28 sm:px-10 sm:py-32">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <p className="mb-2 text-[10px] tracking-[0.28em] uppercase text-white/30">Platform</p>
            <h2 className="text-[clamp(1.75rem,4vw,2.6rem)] font-light tracking-[-0.025em]">
              Everything you need to grow
            </h2>
          </Reveal>
          <div className="mt-16 grid gap-12 sm:grid-cols-2 sm:gap-x-16 sm:gap-y-14">
            {FEATURES.map((f, i) => (
              <Reveal key={f.t} delay={i * 60}>
                <h3 className="text-[17px] font-normal tracking-tight">{f.t}</h3>
                <p className="mt-3 text-[13px] font-light leading-relaxed text-white/40">{f.b}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="get-started" className="border-y border-white/[0.06] px-6 py-24 text-center sm:px-10">
        <Reveal>
          <h2 className="text-[clamp(1.6rem,4vw,2.5rem)] font-light leading-[1.15] tracking-[-0.025em]">
            Your career has the answer.
            <br />
            Start here.
          </h2>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setAuth(true)}
              className="bg-white px-7 py-3 text-[10px] font-medium tracking-[0.16em] uppercase text-black transition hover:bg-white/90"
            >
              Request access
            </button>
            <Link
              to="/roadmaps"
              className="border border-white/25 px-7 py-3 text-[10px] tracking-[0.16em] uppercase transition hover:border-white/60"
            >
              Explore roadmaps
            </Link>
          </div>
        </Reveal>
      </section>

      <footer className="px-6 py-14 sm:px-10">
        <div className="mx-auto flex max-w-4xl flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-medium tracking-[0.2em] uppercase">EDUROUTE</p>
            <p className="mt-3 max-w-[200px] text-[12px] font-light leading-relaxed text-white/35">
              Learn. Build. Compete. Get hired.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-10 gap-y-3 text-[12px] font-light text-white/40">
            <a href="#manifesto" className="hover:text-white">
              Manifesto
            </a>
            <a href="#product" className="hover:text-white">
              Product
            </a>
            <Link to="/roadmaps" className="hover:text-white">
              Roadmaps
            </Link>
            <Link to="/internships" className="hover:text-white">
              Internships
            </Link>
          </div>
        </div>
        <div className="mx-auto mt-12 max-w-4xl border-t border-white/[0.06] pt-6 text-[10px] text-white/25">
          © 2026 EDUROUTE · WebGL brain adapted from{' '}
          <a
            href="https://github.com/kekkorider/threejs-dala"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white/50"
          >
            threejs-dala
          </a>
        </div>
      </footer>

      <style>{`
        @keyframes dalaDot {
          0%, 100% { opacity: 0.15; transform: scale(0.7); }
          50% { opacity: 1; transform: scale(1.25); }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;

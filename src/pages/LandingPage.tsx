/**
 * EduRoute cinematic landing — continuous particle story + spatial typography
 * Inspired by Dala's spatial/scroll philosophy; original EduRoute content & identity.
 * Morph: scatter → brain → bulb → earth → network → EduRoute
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthModal } from '../components/AuthModal';
import { CinematicParticles } from '../components/CinematicParticles';

const ACCENT = '#c8f542';

const SCENES = [
  {
    id: '01',
    label: '01 / DISCOVER',
    title: ['KNOW', 'YOURSELF.'],
    body: 'Understand your strengths, interests and current skills.',
    pos: 'left-bottom' as const,
    range: [0, 0.22],
  },
  {
    id: '02',
    label: '02 / EXPLORE',
    title: ['YOUR SKILLS', 'TELL A STORY.'],
    body: 'Explore possibilities as the path opens.',
    pos: 'left-top' as const,
    range: [0.22, 0.4],
  },
  {
    id: '03',
    label: '03 / SIGNAL',
    title: ['FIND', 'THE SIGNAL.'],
    body: 'Turn curiosity into direction.',
    pos: 'right-bottom' as const,
    range: [0.4, 0.55],
  },
  {
    id: '04',
    label: '04 / WORLD',
    title: ['SEE WHERE', 'THE WORLD', 'IS GOING.'],
    body: 'The world is changing. Your skills should too.',
    pos: 'right-top' as const,
    range: [0.55, 0.7],
  },
  {
    id: '05',
    label: '05 / CONNECT',
    title: ['CONNECT', 'SKILLS TO', 'OPPORTUNITY.'],
    body: 'From interest to skill. From skill to opportunity.',
    pos: 'left-center' as const,
    range: [0.7, 0.85],
  },
  {
    id: '06',
    label: '06 / ROUTE',
    title: ['YOUR ROUTE.', 'YOUR SKILLS.', 'YOUR FUTURE.'],
    body: 'Start building with EduRoute.',
    pos: 'center' as const,
    range: [0.85, 1],
  },
];

const ECOSYSTEM = [
  'AI Buddy',
  'Roadmaps',
  'Skills',
  'DSA',
  'Internships',
  'Projects',
  'Mentors',
  'Market Trends',
];

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

function sceneOpacity(progress: number, range: number[]) {
  const [a, b] = range;
  const mid = (a + b) / 2;
  const half = (b - a) / 2;
  const d = Math.abs(progress - mid);
  if (d > half) return 0;
  return 1 - d / half;
}

function posClass(pos: (typeof SCENES)[0]['pos']) {
  switch (pos) {
    case 'left-bottom':
      return 'left-6 bottom-[18%] sm:left-12 md:left-16 md:bottom-[22%] text-left';
    case 'left-top':
      return 'left-6 top-[22%] sm:left-12 md:left-16 text-left';
    case 'right-bottom':
      return 'right-6 bottom-[18%] sm:right-12 md:right-16 text-right';
    case 'right-top':
      return 'right-6 top-[20%] sm:right-12 md:right-16 text-right';
    case 'left-center':
      return 'left-6 top-1/2 -translate-y-1/2 sm:left-12 md:left-16 text-left';
    case 'center':
      return 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center';
    default:
      return 'left-6 bottom-[20%]';
  }
}

export const LandingPage = () => {
  const [auth, setAuth] = useState(false);
  const progressRef = useRef(0);
  const [progress, setProgress] = useState(0);
  const pinRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const rafRef = useRef(0);

  // Scroll progress of the long track (pinned viewport effect via sticky)
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const update = () => {
      const rect = track.getBoundingClientRect();
      const total = track.offsetHeight - window.innerHeight;
      const scrolled = -rect.top;
      const p = total > 0 ? Math.min(1, Math.max(0, scrolled / total)) : 0;
      progressRef.current = p;
      setProgress(p);
    };

    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Optional Lenis smooth scroll
  useEffect(() => {
    if (reduced) return;
    let lenis: { destroy: () => void; raf: (t: number) => void } | null = null;
    let id = 0;
    (async () => {
      try {
        const { default: Lenis } = await import('lenis');
        lenis = new Lenis({ smoothWheel: true, lerp: 0.08 });
        const loop = (t: number) => {
          lenis?.raf(t);
          id = requestAnimationFrame(loop);
        };
        id = requestAnimationFrame(loop);
      } catch {
        /* lenis optional */
      }
    })();
    return () => {
      cancelAnimationFrame(id);
      lenis?.destroy();
    };
  }, [reduced]);

  return (
    <div className="bg-[#080808] text-[#e8e6e1] antialiased selection:bg-[#c8f542]/30">
      <AuthModal isOpen={auth} onClose={() => setAuth(false)} />

      {/* Minimal floating nav */}
      <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-5 py-4 sm:px-8">
        <a href="#top" className="text-[11px] font-medium tracking-[0.25em] uppercase">
          EduRoute
        </a>
        <nav className="hidden items-center gap-8 md:flex">
          <a href="#story" className="text-[10px] tracking-[0.18em] uppercase text-white/40 hover:text-white">
            Explore
          </a>
          <Link to="/roadmaps" className="text-[10px] tracking-[0.18em] uppercase text-white/40 hover:text-white">
            Roadmap
          </Link>
          <Link to="/buddy" className="text-[10px] tracking-[0.18em] uppercase text-white/40 hover:text-white">
            AI Buddy
          </Link>
          <Link to="/internships" className="text-[10px] tracking-[0.18em] uppercase text-white/40 hover:text-white">
            Internships
          </Link>
        </nav>
        <button
          type="button"
          onClick={() => setAuth(true)}
          className="border border-white/25 px-3 py-1.5 text-[10px] tracking-[0.16em] uppercase transition hover:bg-white hover:text-black"
        >
          Start journey
        </button>
      </header>

      {/* Intro hero — 100vh before the pin */}
      <section id="top" className="relative flex h-[100svh] min-h-[560px] flex-col justify-end overflow-hidden px-6 pb-16 sm:px-12 md:px-16">
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 50% 40% at 70% 45%, #1a1a18 0%, transparent 70%)',
            }}
          />
        </div>
        <div className="relative z-10 max-w-xl">
          <p className="mb-4 text-[10px] tracking-[0.28em] uppercase text-white/35">EduRoute</p>
          <h1 className="text-[clamp(2.75rem,9vw,6.5rem)] font-medium leading-[0.95] tracking-[-0.04em]">
            Your future
            <br />
            starts with
            <br />
            the right
            <br />
            <span style={{ color: ACCENT }}>direction.</span>
          </h1>
          <p className="mt-6 max-w-sm text-[14px] font-light leading-relaxed text-white/45">
            Discover your skills, understand your gaps, and build your route.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setAuth(true)}
              className="bg-[#e8e6e1] px-5 py-2.5 text-[10px] font-medium tracking-[0.16em] uppercase text-black transition hover:bg-white"
            >
              Start your journey
            </button>
            <a
              href="#story"
              className="border border-white/20 px-5 py-2.5 text-[10px] tracking-[0.16em] uppercase text-white/70 transition hover:border-white/50"
            >
              Scroll to explore
            </a>
          </div>
        </div>
        <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[9px] tracking-[0.3em] uppercase text-white/25">
          Scroll
        </p>
      </section>

      {/* Long track — sticky WebGL + scene copy */}
      <div id="story" ref={trackRef} className="relative" style={{ height: reduced ? '100vh' : '700vh' }}>
        <div ref={pinRef} className="sticky top-0 h-[100svh] w-full overflow-hidden">
          {/* WebGL layer */}
          <div className="absolute inset-0 z-0">
            <CinematicParticles progressRef={progressRef} />
          </div>

          {/* Grain */}
          <div
            className="pointer-events-none absolute inset-0 z-[1] opacity-[0.07] mix-blend-overlay"
            style={{
              backgroundImage:
                'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
            }}
          />

          {/* Scene typography layers */}
          {SCENES.map((s) => {
            const o = reduced ? (s.id === '01' ? 1 : 0) : sceneOpacity(progress, s.range);
            if (o < 0.02) return null;
            return (
              <div
                key={s.id}
                className={`pointer-events-none absolute z-10 max-w-md px-2 ${
                  posClass(s.pos)
                }`}
                style={{
                  opacity: o,
                  transform: `translateY(${(1 - o) * 24}px)`,
                  transition: reduced ? 'none' : 'opacity 0.15s linear',
                }}
              >
                <p className="mb-3 text-[10px] tracking-[0.28em] uppercase text-white/35">{s.label}</p>
                <h2 className="text-[clamp(2rem,6vw,4.25rem)] font-medium leading-[0.98] tracking-[-0.035em]">
                  {s.title.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </h2>
                <p className="mt-4 max-w-xs text-[13px] font-light leading-relaxed text-white/40">{s.body}</p>
              </div>
            );
          })}

          {/* Ecosystem floating labels (network phase) */}
          {progress > 0.72 && progress < 0.92 && (
            <div className="pointer-events-none absolute inset-0 z-10">
              {ECOSYSTEM.map((label, i) => {
                const ang = (i / ECOSYSTEM.length) * Math.PI * 2;
                const r = 28 + (i % 3) * 8;
                const x = 50 + Math.cos(ang) * r;
                const y = 48 + Math.sin(ang) * (r * 0.55);
                return (
                  <span
                    key={label}
                    className="absolute text-[9px] tracking-[0.2em] uppercase text-white/50"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: 'translate(-50%, -50%)',
                      opacity: sceneOpacity(progress, [0.72, 0.92]) * 0.9,
                    }}
                  >
                    {label}
                  </span>
                );
              })}
            </div>
          )}

          {/* Progress tick */}
          <div className="pointer-events-none absolute bottom-6 right-6 z-20 text-[9px] tracking-[0.2em] text-white/25">
            {String(Math.round(progress * 100)).padStart(2, '0')}%
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <section className="relative border-t border-white/[0.06] px-6 py-28 text-center sm:px-12">
        <p className="text-[10px] tracking-[0.28em] uppercase text-white/30">EduRoute</p>
        <h2 className="mx-auto mt-4 max-w-2xl text-[clamp(1.75rem,5vw,3rem)] font-medium leading-[1.1] tracking-[-0.03em]">
          Your route. Your skills.
          <br />
          Your future.
        </h2>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setAuth(true)}
            className="bg-[#e8e6e1] px-6 py-3 text-[10px] font-medium tracking-[0.16em] uppercase text-black transition hover:bg-white"
          >
            Start your journey
          </button>
          <Link
            to="/roadmaps"
            className="border border-white/25 px-6 py-3 text-[10px] tracking-[0.16em] uppercase transition hover:border-white/60"
          >
            Explore EduRoute
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] px-6 py-10 sm:px-12">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] tracking-[0.2em] uppercase">EduRoute</p>
          <div className="flex flex-wrap gap-6 text-[12px] text-white/40">
            <Link to="/roadmaps" className="hover:text-white">
              Roadmaps
            </Link>
            <Link to="/internships" className="hover:text-white">
              Internships
            </Link>
            <a href="#story" className="hover:text-white">
              Story
            </a>
          </div>
        </div>
        <p className="mx-auto mt-8 max-w-5xl text-[10px] text-white/25">© 2026 EduRoute</p>
      </footer>
    </div>
  );
};

export default LandingPage;

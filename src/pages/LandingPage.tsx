import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  ClipboardCheck,
  Code2,
  Instagram,
  Mail,
  Map,
  MessageCircle,
  Route,
  Trophy,
  Users,
} from 'lucide-react';
import { AuthModal } from '../components/AuthModal';

/* ═══════════════════════════════════════════════════════════════
   KINETIC BRUTALISM — EDUROUTE Landing
   Rich black · Off-white · Acid yellow · Typography as architecture
   ═══════════════════════════════════════════════════════════════ */

const NAV = [
  { label: 'HOME', href: '#home' },
  { label: 'SYSTEM', href: '#how-it-works' },
  { label: 'ROADMAPS', href: '/roadmaps' },
  { label: 'INTERNSHIPS', href: '/internships' },
  { label: 'JOURNEY', href: '#journey' },
];

const STATS = [
  { target: 45, suffix: 'K+', label: 'ACTIVE LEARNERS' },
  { target: 80, suffix: '+', label: 'ROADMAPS' },
  { target: 500, suffix: '+', label: 'OPPORTUNITIES' },
  { target: 120, suffix: '+', label: 'HACKATHONS' },
];

const HOW_STEPS = [
  {
    step: '01',
    title: 'SIGN UP',
    body: 'Create a free account and pick the track you care about.',
    icon: Users,
  },
  {
    step: '02',
    title: 'SKILL QUIZ',
    body: 'Answer a short yes/no quiz so we map your skill gaps.',
    icon: ClipboardCheck,
  },
  {
    step: '03',
    title: 'GET YOUR PATH',
    body: 'Follow a personal roadmap, practice, and apply with confidence.',
    icon: Route,
  },
];

const JOURNEY = [
  { title: 'LEARN', desc: 'Explore curated roadmaps', icon: BookOpen },
  { title: 'BUILD', desc: 'Work on real projects and practice', icon: Code2 },
  { title: 'COMPETE', desc: 'Join hackathons and challenges', icon: Trophy },
  { title: 'GET HIRED', desc: 'Land internships and full-time roles', icon: Briefcase },
];

const MARQUEE_A = [
  'SKILL MAPPING',
  'INTERNSHIPS',
  'PLACEMENT',
  'AI BUDDY',
  'ROADMAPS',
  'DSA SHEET',
  'HACKATHONS',
  'PORTFOLIO',
];

const MARQUEE_B = [
  'BUILD SKILLS',
  'GET HIRED',
  'LEARN · MAP · MATCH',
  'ACADEMIA × INDUSTRY',
  'EDUROUTE 2026',
];

const QUICK_LINKS = [
  { label: 'Home', href: '#home' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Roadmaps', href: '/roadmaps' },
  { label: 'Internships', href: '/internships' },
  { label: 'Journey', href: '#journey' },
];

const COMPANY_LINKS = [
  { label: 'About Us', href: '#contact' },
  { label: 'Our Mission', href: '#features' },
  { label: 'Contact Us', href: '#contact' },
  { label: 'Privacy Policy', href: '#contact' },
  { label: 'Terms & Conditions', href: '#contact' },
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

function useCountUp(target: number, active: boolean, duration = 1200) {
  const [value, setValue] = useState(0);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (!active) return;
    if (reduced) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration, reduced]);

  return value;
}

function Marquee({
  items,
  reverse = false,
  className = '',
}: {
  items: string[];
  reverse?: boolean;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const content = [...items, ...items, ...items];
  return (
    <div
      className={`kb-marquee overflow-hidden border-y-2 border-[#f5f5f0] ${className}`}
      aria-hidden={reduced}
    >
      <div
        className={`kb-marquee-track flex whitespace-nowrap ${
          reverse ? 'kb-marquee-reverse' : ''
        } ${reduced ? 'kb-marquee-static' : ''}`}
      >
        {content.map((t, i) => (
          <span
            key={`${t}-${i}`}
            className="inline-flex items-center px-6 py-3 text-sm font-black uppercase tracking-[0.2em] text-[#f5f5f0] sm:text-base"
          >
            {t}
            <span className="ml-6 inline-block h-2 w-2 rotate-45 bg-[#d4ff00]" aria-hidden />
          </span>
        ))}
      </div>
    </div>
  );
}

function GhostIndex({ n }: { n: string }) {
  return (
    <span
      className="pointer-events-none absolute -right-2 -top-4 select-none font-black leading-none text-[#f5f5f0]/[0.04] sm:-right-4 sm:-top-8"
      style={{ fontSize: 'clamp(4rem, 18vw, 12rem)' }}
      aria-hidden
    >
      {n}
    </span>
  );
}

function NavItem({
  item,
  onClick,
  className,
}: {
  item: { label: string; href: string };
  onClick?: () => void;
  className: string;
}) {
  if (item.href.startsWith('/')) {
    return (
      <Link to={item.href} onClick={onClick} className={className}>
        {item.label}
      </Link>
    );
  }
  return (
    <a href={item.href} onClick={onClick} className={className}>
      {item.label}
    </a>
  );
}

function StatBlock({
  target,
  suffix,
  label,
  active,
  index,
}: {
  target: number;
  suffix: string;
  label: string;
  active: boolean;
  index: number;
}) {
  const value = useCountUp(target, active);
  return (
    <div className="group relative border-2 border-[#f5f5f0] bg-[#0a0a0a] p-5 transition-colors duration-150 hover:bg-[#d4ff00] hover:text-[#0a0a0a] sm:p-6">
      <span className="absolute right-3 top-2 font-black text-[10px] tracking-widest text-[#f5f5f0]/40 group-hover:text-[#0a0a0a]/50">
        0{index + 1}
      </span>
      <div className="text-3xl font-black tabular-nums tracking-tighter sm:text-4xl lg:text-5xl">
        {value}
        {suffix}
      </div>
      <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.25em] opacity-70 sm:text-xs">
        {label}
      </div>
    </div>
  );
}

export const LandingPage = () => {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [statsActive, setStatsActive] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  const instagramUrl = 'https://www.instagram.com/vanshkhandelwal28/';
  const whatsappUrl = 'https://wa.link/9mfubu';
  const supportEmail = 'vanshkhandelwal777@gmail.com';

  useEffect(() => {
    const el = statsRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setStatsActive(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      id="home"
      className="kb-root min-h-screen bg-[#0a0a0a] text-[#f5f5f0] antialiased selection:bg-[#d4ff00] selection:text-[#0a0a0a]"
    >
      {/* Scoped kinetic-brutalism styles */}
      <style>{`
        .kb-root {
          --kb-black: #0a0a0a;
          --kb-off: #f5f5f0;
          --kb-acid: #d4ff00;
          font-feature-settings: "ss01" 1, "kern" 1;
        }
        .kb-marquee-track {
          animation: kb-scroll 28s linear infinite;
          width: max-content;
        }
        .kb-marquee-reverse {
          animation-direction: reverse;
          animation-duration: 36s;
        }
        .kb-marquee-static {
          animation: none !important;
        }
        @keyframes kb-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-33.333%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .kb-marquee-track { animation: none !important; }
        }
        .kb-invert-btn {
          transition: background-color 0.12s ease, color 0.12s ease, border-color 0.12s ease;
        }
        .kb-invert-btn:hover,
        .kb-invert-btn:focus-visible {
          background-color: var(--kb-acid);
          color: var(--kb-black);
          border-color: var(--kb-acid);
        }
        .kb-invert-btn:focus-visible {
          outline: 3px solid var(--kb-acid);
          outline-offset: 3px;
        }
        .kb-card {
          transition: background-color 0.12s ease, color 0.12s ease;
        }
        .kb-card:hover {
          background-color: var(--kb-acid);
          color: var(--kb-black);
        }
        .kb-card:hover .kb-card-muted {
          color: rgba(10,10,10,0.65);
        }
        .kb-hero-lockup {
          font-size: clamp(2.75rem, 12vw, 7.5rem);
          line-height: 0.88;
          letter-spacing: -0.04em;
          text-transform: uppercase;
          font-weight: 900;
        }
        .kb-section-title {
          font-size: clamp(1.75rem, 5vw, 3.5rem);
          line-height: 0.95;
          letter-spacing: -0.03em;
          text-transform: uppercase;
          font-weight: 900;
        }
      `}</style>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 border-b-2 border-[#f5f5f0] bg-[#0a0a0a]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <a href="#home" className="flex items-center gap-3 group">
            <span className="flex h-10 w-10 items-center justify-center border-2 border-[#f5f5f0] bg-[#d4ff00] text-sm font-black text-[#0a0a0a] transition-colors group-hover:bg-[#0a0a0a] group-hover:text-[#d4ff00] group-hover:border-[#d4ff00]">
              E
            </span>
            <span className="text-base font-black uppercase tracking-[0.15em] text-[#f5f5f0]">
              EDU<span className="text-[#d4ff00]">ROUTE</span>
            </span>
          </a>

          <nav className="hidden items-center gap-0 lg:flex" aria-label="Primary">
            {NAV.map((item) => (
              <NavItem
                key={item.label}
                item={item}
                className="border-2 border-transparent px-3 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-[#f5f5f0]/80 transition-colors hover:border-[#f5f5f0] hover:bg-[#f5f5f0] hover:text-[#0a0a0a]"
              />
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a
              href="#contact"
              className="hidden border-2 border-transparent px-3 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-[#f5f5f0]/70 hover:border-[#f5f5f0] hover:bg-[#f5f5f0] hover:text-[#0a0a0a] sm:inline"
            >
              Contact
            </a>
            <button
              type="button"
              onClick={() => setIsAuthOpen(true)}
              className="kb-invert-btn border-2 border-[#d4ff00] bg-[#d4ff00] px-4 py-2 text-[11px] font-black uppercase tracking-[0.15em] text-[#0a0a0a]"
            >
              Get Started
            </button>
            <button
              type="button"
              className="border-2 border-[#f5f5f0] p-2 text-[#f5f5f0] lg:hidden"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
            >
              <span className="block h-0.5 w-5 bg-current" />
              <span className="mt-1.5 block h-0.5 w-5 bg-current" />
              <span className="mt-1.5 block h-0.5 w-5 bg-current" />
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t-2 border-[#f5f5f0] bg-[#0a0a0a] px-4 py-3 lg:hidden">
            {NAV.map((item) => (
              <NavItem
                key={item.label}
                item={item}
                onClick={() => setMobileOpen(false)}
                className="block border-b border-[#f5f5f0]/15 px-2 py-3 text-sm font-black uppercase tracking-[0.15em] text-[#f5f5f0]"
              />
            ))}
            <a
              href="#contact"
              onClick={() => setMobileOpen(false)}
              className="block px-2 py-3 text-sm font-black uppercase tracking-[0.15em] text-[#d4ff00]"
            >
              Contact Us
            </a>
          </div>
        )}
      </header>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden border-b-2 border-[#f5f5f0]">
        <GhostIndex n="01" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:px-8 lg:pt-24">
          <p className="mb-6 inline-flex items-center gap-2 border-2 border-[#d4ff00] bg-[#d4ff00] px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-[#0a0a0a]">
            Your Growth Partner in Tech
          </p>

          <h1 className="kb-hero-lockup max-w-5xl text-[#f5f5f0]">
            <span className="block">Build</span>
            <span className="block">Skills.</span>
            <span className="mt-1 block text-[#d4ff00]">Get Hired.</span>
          </h1>

          <p className="mt-8 max-w-xl text-base leading-relaxed text-[#f5f5f0]/70 sm:text-lg">
            EDUROUTE maps your skills, fills the gaps, and matches you to internships,
            roadmaps, and industry roles — one portal for students, colleges, and employers.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              to="/roadmaps"
              className="kb-invert-btn inline-flex items-center gap-2 border-2 border-[#d4ff00] bg-[#d4ff00] px-6 py-3.5 text-xs font-black uppercase tracking-[0.2em] text-[#0a0a0a]"
            >
              Explore Roadmaps <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              to="/internships"
              className="kb-invert-btn inline-flex items-center gap-2 border-2 border-[#f5f5f0] bg-transparent px-6 py-3.5 text-xs font-black uppercase tracking-[0.2em] text-[#f5f5f0]"
            >
              Find Opportunities
            </Link>
            <button
              type="button"
              onClick={() => setIsAuthOpen(true)}
              className="kb-invert-btn inline-flex items-center gap-2 border-2 border-[#f5f5f0]/40 bg-transparent px-6 py-3.5 text-xs font-black uppercase tracking-[0.2em] text-[#f5f5f0]/80"
            >
              Start Free
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <div ref={statsRef} className="grid grid-cols-2 gap-0 border-2 border-[#f5f5f0] sm:grid-cols-4">
            {STATS.map((s, i) => (
              <StatBlock key={s.label} {...s} active={statsActive} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── MARQUEE 1 ── */}
      <Marquee items={MARQUEE_A} />

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="relative border-b-2 border-[#f5f5f0] py-20 sm:py-24">
        <GhostIndex n="02" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 max-w-2xl">
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.35em] text-[#d4ff00]">
              System
            </p>
            <h2 className="kb-section-title text-[#f5f5f0]">How it works</h2>
            <p className="mt-4 text-sm text-[#f5f5f0]/60 sm:text-base">
              Three hard steps. No fluff. Sign up → Skill quiz → Get your path.
            </p>
          </div>

          <div className="grid gap-0 border-2 border-[#f5f5f0] sm:grid-cols-3">
            {HOW_STEPS.map((s) => (
              <div
                key={s.step}
                className="kb-card group relative border-b-2 border-[#f5f5f0] p-6 last:border-b-0 sm:border-b-0 sm:border-r-2 sm:last:border-r-0 sm:p-8"
              >
                <div className="mb-6 flex items-center justify-between">
                  <span className="text-4xl font-black tabular-nums tracking-tighter text-[#d4ff00] group-hover:text-[#0a0a0a] sm:text-5xl">
                    {s.step}
                  </span>
                  <s.icon className="h-6 w-6 opacity-50 group-hover:opacity-100" aria-hidden />
                </div>
                <h3 className="text-lg font-black uppercase tracking-[0.1em]">{s.title}</h3>
                <p className="kb-card-muted mt-3 text-sm leading-relaxed text-[#f5f5f0]/60">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES STRIP ── */}
      <section id="features" className="relative border-b-2 border-[#f5f5f0] py-20 sm:py-24">
        <GhostIndex n="03" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.35em] text-[#d4ff00]">
                Product
              </p>
              <h2 className="kb-section-title text-[#f5f5f0]">What you get</h2>
            </div>
            <button
              type="button"
              onClick={() => setIsAuthOpen(true)}
              className="kb-invert-btn self-start border-2 border-[#f5f5f0] px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.2em]"
            >
              Explore all →
            </button>
          </div>

          <div className="grid gap-0 border-2 border-[#f5f5f0] md:grid-cols-2">
            {[
              {
                t: 'AI BUDDY MENTOR',
                d: 'Groq-powered chat that maps skill gaps, suggests roadmaps, and answers career questions with live context.',
              },
              {
                t: 'SKILL → ROLE MATCH',
                d: 'Assessment-driven matching to internships and roles. Industry sees Match %; you see the gap list.',
              },
              {
                t: 'ROADMAPS + DSA',
                d: 'Role-based learning paths and a structured DSA sheet so practice stays measurable.',
              },
              {
                t: 'COLLEGE + INDUSTRY',
                d: 'Placement funnels for colleges. Role posting and shortlisting for industry partners.',
              },
            ].map((f, i) => (
              <div
                key={f.t}
                className="kb-card group relative border-b-2 border-[#f5f5f0] p-6 last:border-b-0 md:border-b-0 md:border-r-2 md:odd:border-r-2 md:even:border-r-0 md:[&:nth-child(-n+2)]:border-b-2 sm:p-8"
              >
                <span className="text-[10px] font-black tracking-[0.3em] text-[#d4ff00] group-hover:text-[#0a0a0a]/50">
                  0{i + 1}
                </span>
                <h3 className="mt-3 text-xl font-black uppercase tracking-tight sm:text-2xl">{f.t}</h3>
                <p className="kb-card-muted mt-3 max-w-md text-sm leading-relaxed text-[#f5f5f0]/60">
                  {f.d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MARQUEE 2 ── */}
      <Marquee items={MARQUEE_B} reverse />

      {/* ── JOURNEY ── */}
      <section id="journey" className="relative border-b-2 border-[#f5f5f0] py-20 sm:py-24">
        <GhostIndex n="04" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 max-w-xl">
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.35em] text-[#d4ff00]">
              Path
            </p>
            <h2 className="kb-section-title text-[#f5f5f0]">From learning to landing</h2>
            <p className="mt-4 text-sm text-[#f5f5f0]/60">
              A linear system: learn → build → compete → get hired.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-0 border-2 border-[#f5f5f0] sm:grid-cols-4">
            {JOURNEY.map((step, i) => (
              <div
                key={step.title}
                className="kb-card group relative border-b-2 border-[#f5f5f0] p-5 last:border-b-0 sm:border-b-0 sm:border-r-2 sm:last:border-r-0 sm:p-6"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center border-2 border-current">
                  <step.icon className="h-5 w-5" aria-hidden />
                </div>
                <div className="text-[10px] font-black tracking-[0.25em] text-[#d4ff00] group-hover:text-[#0a0a0a]/50">
                  0{i + 1}
                </div>
                <div className="mt-1 text-sm font-black uppercase tracking-[0.1em]">{step.title}</div>
                <div className="kb-card-muted mt-2 text-[11px] leading-4 text-[#f5f5f0]/55">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BAND ── */}
      <section className="relative border-b-2 border-[#f5f5f0] bg-[#d4ff00] py-16 text-[#0a0a0a] sm:py-20">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="kb-section-title mx-auto max-w-3xl">
            Ready to map your skills and get hired?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm font-medium opacity-80">
            Join students using EDUROUTE for roadmaps, AI mentoring, and matched internships.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setIsAuthOpen(true)}
              className="border-2 border-[#0a0a0a] bg-[#0a0a0a] px-8 py-3.5 text-xs font-black uppercase tracking-[0.2em] text-[#d4ff00] transition-colors hover:bg-transparent hover:text-[#0a0a0a]"
            >
              Get Started Free
            </button>
            <Link
              to="/roadmaps"
              className="border-2 border-[#0a0a0a] bg-transparent px-8 py-3.5 text-xs font-black uppercase tracking-[0.2em] text-[#0a0a0a] transition-colors hover:bg-[#0a0a0a] hover:text-[#d4ff00]"
            >
              Browse Roadmaps
            </Link>
          </div>
        </div>
      </section>

      {/* ── CONTACT / FOOTER ── */}
      <footer id="contact" className="relative border-t-2 border-[#f5f5f0] bg-[#0a0a0a]">
        <GhostIndex n="05" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
          <div className="grid gap-10 border-b-2 border-[#f5f5f0] pb-12 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center border-2 border-[#d4ff00] bg-[#d4ff00] text-xs font-black text-[#0a0a0a]">
                  E
                </span>
                <span className="text-sm font-black uppercase tracking-[0.15em]">
                  EDU<span className="text-[#d4ff00]">ROUTE</span>
                </span>
              </div>
              <p className="max-w-xs text-xs leading-5 text-[#f5f5f0]/55">
                Academia–Industry collaboration portal for skill mapping, internships and placement.
                Built for SIH 2026.
              </p>
              <div className="mt-5 flex gap-2">
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="kb-invert-btn flex h-10 w-10 items-center justify-center border-2 border-[#f5f5f0]"
                  aria-label="Instagram"
                >
                  <Instagram className="h-4 w-4" />
                </a>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="kb-invert-btn flex h-10 w-10 items-center justify-center border-2 border-[#f5f5f0]"
                  aria-label="WhatsApp"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
                <a
                  href={`mailto:${supportEmail}`}
                  className="kb-invert-btn flex h-10 w-10 items-center justify-center border-2 border-[#f5f5f0]"
                  aria-label="Email"
                >
                  <Mail className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-[10px] font-black uppercase tracking-[0.3em] text-[#d4ff00]">
                Navigate
              </h3>
              <ul className="space-y-2">
                {QUICK_LINKS.map((l) => (
                  <li key={l.label}>
                    {l.href.startsWith('/') ? (
                      <Link
                        to={l.href}
                        className="text-xs font-bold uppercase tracking-[0.1em] text-[#f5f5f0]/60 transition-colors hover:text-[#d4ff00]"
                      >
                        {l.label}
                      </Link>
                    ) : (
                      <a
                        href={l.href}
                        className="text-xs font-bold uppercase tracking-[0.1em] text-[#f5f5f0]/60 transition-colors hover:text-[#d4ff00]"
                      >
                        {l.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-4 text-[10px] font-black uppercase tracking-[0.3em] text-[#d4ff00]">
                Company
              </h3>
              <ul className="space-y-2">
                {COMPANY_LINKS.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-xs font-bold uppercase tracking-[0.1em] text-[#f5f5f0]/60 transition-colors hover:text-[#d4ff00]"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-4 text-[10px] font-black uppercase tracking-[0.3em] text-[#d4ff00]">
                Stay Updated
              </h3>
              <p className="mb-3 text-xs leading-5 text-[#f5f5f0]/55">
                Roadmaps, opportunities and tips — no spam.
              </p>
              <form
                className="flex flex-col gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  setNewsletterEmail('');
                }}
              >
                <label htmlFor="kb-newsletter" className="sr-only">
                  Email
                </label>
                <input
                  id="kb-newsletter"
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="YOUR EMAIL"
                  className="min-w-0 border-2 border-[#f5f5f0] bg-transparent px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-[#f5f5f0] outline-none placeholder:text-[#f5f5f0]/35 focus:border-[#d4ff00]"
                  required
                />
                <button
                  type="submit"
                  className="kb-invert-btn border-2 border-[#d4ff00] bg-[#d4ff00] px-3 py-2.5 text-[11px] font-black uppercase tracking-[0.2em] text-[#0a0a0a]"
                >
                  Subscribe
                </button>
              </form>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-3 py-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[#f5f5f0]/40 sm:flex-row">
            <span>© {new Date().getFullYear()} EDUROUTE. All rights reserved.</span>
            <span className="text-[#d4ff00]/70">Kinetic Brutalism · SIH 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

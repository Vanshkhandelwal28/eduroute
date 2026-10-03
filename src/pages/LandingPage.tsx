import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Code2,
  Trophy,
} from 'lucide-react';
import { AuthModal } from '../components/AuthModal';
import { OfferStackSection } from '../components/OfferStackSection';
import { DalaBrainHero } from '../components/DalaBrainHero';

const NAV = [
  { label: 'Home', href: '#home' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Roadmaps', href: '/roadmaps' },
  { label: 'Internships', href: '/internships' },
  { label: 'Journey', href: '#journey' },
];

const STATS = [
  { target: 45, suffix: 'K+', label: 'Active Learners' },
  { target: 80, suffix: '+', label: 'Roadmaps' },
  { target: 500, suffix: '+', label: 'Job & Internship Opportunities' },
  { target: 120, suffix: '+', label: 'Upcoming Hackathons' },
];

const HOW_STEPS = [
  {
    step: '01',
    title: 'Sign up',
    body: 'Create a free account and pick the track you care about.',
  },
  {
    step: '02',
    title: 'Skill quiz',
    body: 'Answer a short yes/no quiz so we map your skill gaps.',
  },
  {
    step: '03',
    title: 'Get your path',
    body: 'Follow a personal roadmap, practice, and apply with confidence.',
  },
];

const JOURNEY = [
  { title: 'Learn', desc: 'Explore curated roadmaps', icon: BookOpen },
  { title: 'Build', desc: 'Work on real projects and practice', icon: Code2 },
  { title: 'Compete', desc: 'Join hackathons and challenges', icon: Trophy },
  { title: 'Get Hired', desc: 'Land internships and full-time roles', icon: Briefcase },
];

function useCountUp(target: number, active: boolean, duration = 1400) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
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
  }, [active, target, duration]);
  return value;
}

function StatItem({
  target,
  suffix,
  label,
  active,
}: {
  target: number;
  suffix: string;
  label: string;
  active: boolean;
}) {
  const value = useCountUp(target, active);
  return (
    <div className="text-left">
      <div className="text-2xl font-light tracking-tight text-white tabular-nums sm:text-3xl">
        {value}
        {suffix}
      </div>
      <div className="mt-1 text-xs tracking-wide text-white/50">{label}</div>
    </div>
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

export const LandingPage = () => {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [statsActive, setStatsActive] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

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
    <div id="home" className="min-h-screen bg-black text-white">
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      {/* ---------- NAV (Dala-style sparse) ---------- */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <a href="#home" className="text-sm font-medium tracking-[0.15em] uppercase">
            EDUROUTE
          </a>

          <nav className="hidden items-center gap-8 md:flex">
            {NAV.map((item) => (
              <NavItem
                key={item.label}
                item={item}
                className="text-[11px] font-medium tracking-[0.14em] uppercase text-white/55 transition hover:text-white"
              />
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsAuthOpen(true)}
              className="hidden rounded border border-white/25 px-4 py-1.5 text-[11px] font-medium tracking-[0.12em] uppercase transition hover:bg-white hover:text-black sm:inline-block"
            >
              Get Started
            </button>
            <button
              type="button"
              className="rounded p-2 text-white/70 md:hidden"
              aria-label="Menu"
              onClick={() => setMobileOpen((v) => !v)}
            >
              <span className="block h-px w-5 bg-current" />
              <span className="mt-1.5 block h-px w-5 bg-current" />
              <span className="mt-1.5 block h-px w-5 bg-current" />
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-white/10 bg-black px-5 py-4 md:hidden">
            {NAV.map((item) => (
              <NavItem
                key={item.label}
                item={item}
                onClick={() => setMobileOpen(false)}
                className="block py-2.5 text-sm tracking-wide text-white/70"
              />
            ))}
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                setIsAuthOpen(true);
              }}
              className="mt-3 w-full rounded border border-white/25 py-2.5 text-xs tracking-[0.12em] uppercase"
            >
              Get Started
            </button>
          </div>
        )}
      </header>

      {/* ---------- HERO with interactive brain ---------- */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 pt-20">
        <DalaBrainHero />

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <div className="mb-6 text-[11px] font-medium tracking-[0.2em] uppercase text-white/50">
            Your Growth Partner in Tech
          </div>

          <h1 className="text-4xl font-light leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl">
            Build Skills.
            <br />
            <span className="text-white/90">Get Hired.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-lg text-base font-light leading-relaxed text-white/55 sm:text-lg">
            EDUROUTE helps you find the right roadmap, get internships and job
            opportunities, participate in hackathons and build the skills you
            need to grow in tech — all in one place.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/roadmaps"
              className="inline-flex items-center gap-2 rounded bg-white px-6 py-3 text-xs font-medium tracking-[0.1em] uppercase text-black transition hover:bg-white/90"
            >
              Explore Roadmaps <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              to="/internships"
              className="inline-flex items-center gap-2 rounded border border-white/25 px-6 py-3 text-xs font-medium tracking-[0.1em] uppercase text-white transition hover:border-white/50"
            >
              Find Opportunities
            </Link>
            <button
              type="button"
              onClick={() => setIsAuthOpen(true)}
              className="inline-flex items-center gap-2 rounded border border-white/25 px-6 py-3 text-xs font-medium tracking-[0.1em] uppercase text-white transition hover:border-white/50"
            >
              Get Started
            </button>
          </div>
        </div>

        {/* Stats */}
        <div
          ref={statsRef}
          className="relative z-10 mx-auto mt-16 grid w-full max-w-4xl grid-cols-2 gap-8 border-t border-white/10 pt-10 sm:grid-cols-4"
        >
          {STATS.map((s) => (
            <StatItem key={s.label} {...s} active={statsActive} />
          ))}
        </div>
      </section>

      {/* ---------- HOW IT WORKS ---------- */}
      <section id="how-it-works" className="mx-auto max-w-5xl px-5 py-24 sm:px-8">
        <div className="mb-3 text-[11px] font-medium tracking-[0.18em] uppercase text-white/40">
          How it works
        </div>
        <h2 className="text-3xl font-light tracking-tight sm:text-4xl">
          Three clear steps.
        </h2>
        <p className="mt-3 max-w-md text-sm font-light text-white/50">
          Sign up → Skill quiz → Get your path.
        </p>

        <div className="mt-14 grid gap-10 sm:grid-cols-3">
          {HOW_STEPS.map((s) => (
            <div key={s.step}>
              <div className="mb-4 text-[11px] tracking-[0.15em] text-white/40">
                {s.step}
              </div>
              <h3 className="text-lg font-normal tracking-tight">{s.title}</h3>
              <p className="mt-2 text-sm font-light leading-relaxed text-white/50">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- FEATURES (OfferStack) ---------- */}
      <div className="border-t border-white/10">
        <OfferStackSection onExploreAll={() => setIsAuthOpen(true)} />
      </div>

      {/* ---------- JOURNEY ---------- */}
      <section id="journey" className="mx-auto max-w-5xl px-5 py-24 sm:px-8">
        <div className="mb-3 text-[11px] font-medium tracking-[0.18em] uppercase text-white/40">
          Your Journey
        </div>
        <h2 className="text-3xl font-light tracking-tight sm:text-4xl">
          Learn. Build. Compete. Get Hired.
        </h2>
        <p className="mt-4 max-w-lg text-sm font-light leading-relaxed text-white/50">
          Our mission is to make the journey into tech coherent and delightful —
          reframing career growth from “figure it out alone” to having a clear
          partner every step of the way.
        </p>

        <div className="mt-14 grid grid-cols-2 gap-8 sm:grid-cols-4">
          {JOURNEY.map((step) => (
            <div key={step.title}>
              <step.icon className="mb-3 h-5 w-5 text-white/60" />
              <div className="text-base font-normal">{step.title}</div>
              <div className="mt-1 text-xs font-light text-white/45">{step.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="border-y border-white/10 py-20 text-center">
        <h2 className="text-2xl font-light tracking-tight sm:text-3xl">
          Your growth starts here.
        </h2>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/roadmaps"
            className="rounded bg-white px-6 py-3 text-xs font-medium tracking-[0.1em] uppercase text-black transition hover:bg-white/90"
          >
            Explore Roadmaps →
          </Link>
          <button
            type="button"
            onClick={() => setIsAuthOpen(true)}
            className="rounded border border-white/25 px-6 py-3 text-xs font-medium tracking-[0.1em] uppercase transition hover:border-white/50"
          >
            Get Started
          </button>
        </div>
      </section>

      {/* ---------- FOOTER ---------- */}
      <footer className="mx-auto max-w-5xl px-5 py-16 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-sm font-medium tracking-[0.12em] uppercase">
              EDUROUTE
            </div>
            <p className="mt-3 max-w-xs text-sm font-light leading-relaxed text-white/45">
              Learn. Build. Compete. Get Hired.
              <br />
              <br />
              Your one stop platform to build skills, explore opportunities and
              grow your career in tech.
            </p>
          </div>

          <div>
            <div className="mb-4 text-[11px] tracking-[0.14em] uppercase text-white/40">
              Quick links
            </div>
            <div className="space-y-2">
              {NAV.map((l) => (
                <NavItem
                  key={l.label}
                  item={l}
                  className="block text-sm font-light text-white/55 transition hover:text-white"
                />
              ))}
            </div>
          </div>

          <div>
            <div className="mb-4 text-[11px] tracking-[0.14em] uppercase text-white/40">
              Company
            </div>
            <div className="space-y-2 text-sm font-light text-white/55">
              <a href="#contact" className="block hover:text-white">
                About Us
              </a>
              <a href="#journey" className="block hover:text-white">
                Our Mission
              </a>
              <a href="#contact" className="block hover:text-white">
                Contact Us
              </a>
              <a href="#contact" className="block hover:text-white">
                Privacy Policy
              </a>
              <a href="#contact" className="block hover:text-white">
                Terms & Conditions
              </a>
            </div>
          </div>

          <div>
            <div className="mb-4 text-[11px] tracking-[0.14em] uppercase text-white/40">
              Stay Updated
            </div>
            <p className="mb-3 text-sm font-light text-white/45">
              Get the latest roadmaps, opportunities and tips in your inbox.
            </p>
            <input
              type="email"
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder="Your email"
              className="mb-2 w-full border border-white/20 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/40"
            />
            <button
              type="button"
              className="w-full bg-white py-2 text-xs font-medium tracking-[0.1em] uppercase text-black transition hover:bg-white/90"
            >
              Subscribe
            </button>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs text-white/40 sm:flex-row">
          <div>© 2026 EDUROUTE. All rights reserved.</div>
          <div className="flex gap-6">
            <a href="#home" className="hover:text-white">
              Manifesto
            </a>
            <a href="#how-it-works" className="hover:text-white">
              How it works
            </a>
            <a href="/roadmaps" className="hover:text-white">
              Roadmaps
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

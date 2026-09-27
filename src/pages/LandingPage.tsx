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
import { OfferStackSection } from '../components/OfferStackSection';

const HERO_VIDEO_CDN =
  'https://videos.pexels.com/video-files/2278095/2278095-hd_1920_1080_30fps.mp4';
const HERO_VIDEO_LOCAL = '/videos/hero-coding.mp4';

/** Real nav links */
const NAV = [
  { label: 'Home', href: '#home' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Roadmaps', href: '/roadmaps' },
  { label: 'Internships', href: '/internships' },
  { label: 'Journey', href: '#journey' },
];

const STATS = [
  { target: 45, suffix: 'K+', label: 'Active Learners', icon: Users, color: 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300' },
  { target: 80, suffix: '+', label: 'Roadmaps', icon: Map, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300' },
  { target: 500, suffix: '+', label: 'Job & Internship Opportunities', icon: Briefcase, color: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300' },
  { target: 120, suffix: '+', label: 'Upcoming Hackathons', icon: Trophy, color: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300' },
];

const HOW_STEPS = [
  {
    step: '1',
    title: 'Sign up',
    body: 'Create a free account and pick the track you care about.',
    icon: Users,
  },
  {
    step: '2',
    title: 'Skill quiz',
    body: 'Answer a short yes/no quiz so we map your skill gaps.',
    icon: ClipboardCheck,
  },
  {
    step: '3',
    title: 'Get your path',
    body: 'Follow a personal roadmap, practice, and apply with confidence.',
    icon: Route,
  },
];

const JOURNEY = [
  { title: 'Learn', desc: 'Explore curated roadmaps', icon: BookOpen, color: 'bg-violet-600' },
  { title: 'Build', desc: 'Work on real projects and practice', icon: Code2, color: 'bg-emerald-500' },
  { title: 'Compete', desc: 'Join hackathons and challenges', icon: Trophy, color: 'bg-pink-500' },
  { title: 'Get Hired', desc: 'Land internships and full-time roles', icon: Briefcase, color: 'bg-blue-500' },
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

/** Split text into letter spans with staggered reveal (CodeSandbox-style). */
function StaggerText({
  text,
  className = '',
  letterClassName = '',
  baseDelay = 0,
  step = 0.028,
}: {
  text: string;
  className?: string;
  letterClassName?: string;
  baseDelay?: number;
  step?: number;
}) {
  return (
    <span className={className} aria-label={text}>
      {text.split('').map((char, i) =>
        char === ' ' ? (
          <span key={i} className="hero-letter-space" aria-hidden>
            {' '}
          </span>
        ) : (
          <span
            key={i}
            className={`hero-letter ${letterClassName}`}
            style={{ animationDelay: `${baseDelay + i * step}s` }}
            aria-hidden
          >
            {char}
          </span>
        ),
      )}
    </span>
  );
}

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

function useCountUp(target: number, active: boolean, duration = 1400) {
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

function StatItem({
  target,
  suffix,
  label,
  icon: Icon,
  color,
  active,
}: {
  target: number;
  suffix: string;
  label: string;
  icon: typeof Users;
  color: string;
  active: boolean;
}) {
  const value = useCountUp(target, active);
  return (
    <div className="flex items-center gap-3 px-2 py-2">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-lg font-extrabold tabular-nums text-slate-900 dark:text-white">
          {value}
          {suffix}
        </div>
        <div className="text-[11px] font-medium leading-tight text-slate-500 dark:text-slate-400">{label}</div>
      </div>
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
  const [heroVideoSrc, setHeroVideoSrc] = useState(HERO_VIDEO_CDN);
  const [statsActive, setStatsActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  const instagramUrl = 'https://www.instagram.com/vanshkhandelwal28/';
  const whatsappUrl = 'https://wa.link/9mfubu';
  const supportEmail = 'vanshkhandelwal777@gmail.com';

  useEffect(() => {
    const el = videoRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          void el.play().catch(() => undefined);
        } else {
          el.pause();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [heroVideoSrc]);

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
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div id="home" className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          <a href="#home" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-sm font-black text-white shadow-md shadow-violet-200/50 dark:shadow-violet-900/40">
              E
            </span>
            <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
              EDU<span className="text-violet-600 dark:text-violet-400">ROUTE</span>
            </span>
          </a>

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <NavItem
                key={item.label}
                item={item}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              />
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a
              href="#contact"
              className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 sm:inline"
            >
              Contact
            </a>
            <button
              type="button"
              onClick={() => setIsAuthOpen(true)}
              className="rounded-full bg-violet-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700"
            >
              Get Started
            </button>
            <button
              type="button"
              className="rounded-lg p-2 text-slate-600 lg:hidden dark:text-slate-300"
              aria-label="Menu"
              onClick={() => setMobileOpen((v) => !v)}
            >
              <span className="block h-0.5 w-5 bg-current" />
              <span className="mt-1.5 block h-0.5 w-5 bg-current" />
              <span className="mt-1.5 block h-0.5 w-5 bg-current" />
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-slate-100 bg-white px-4 py-3 lg:hidden dark:border-slate-800 dark:bg-slate-950">
            {NAV.map((item) => (
              <NavItem
                key={item.label}
                item={item}
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200"
              />
            ))}
            <a
              href="#contact"
              onClick={() => setMobileOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              Contact Us
            </a>
          </div>
        )}
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <video
            ref={videoRef}
            className="h-full w-full scale-105 object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            src={heroVideoSrc}
            onError={() => setHeroVideoSrc(HERO_VIDEO_LOCAL)}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white from-0% via-white/75 via-35% to-white/15 to-100% dark:from-slate-950 dark:from-0% dark:via-slate-950/80 dark:via-40% dark:to-slate-950/25 dark:to-100%" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white/90 to-transparent dark:from-slate-950/90 dark:to-transparent" />
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/50 to-transparent dark:from-slate-950/40 dark:to-transparent" />
        </div>

        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:px-8 lg:py-24">
          <div className="max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-200/80 bg-white/80 px-3.5 py-1.5 text-xs font-bold tracking-wide text-violet-700 shadow-sm backdrop-blur dark:border-violet-500/30 dark:bg-slate-900/70 dark:text-violet-300">
              <span className="text-sm leading-none">⚡</span>
              Your Growth Partner in Tech
            </div>

            <h1 className="text-5xl font-black leading-[0.95] tracking-tight drop-shadow-sm sm:text-6xl lg:text-7xl">
              <StaggerText
                text="Build Skills."
                className="block"
                letterClassName="text-slate-900 dark:text-white"
                baseDelay={0.1}
                step={0.06}
              />
              <StaggerText
                text="Get Hired."
                className="block"
                letterClassName="text-violet-600 dark:text-violet-400"
                baseDelay={0.84}
                step={0.06}
              />
            </h1>

            <p className="mt-6 max-w-md text-base leading-relaxed text-slate-600 dark:text-slate-300 sm:text-[17px] sm:leading-7">
              EDUROUTE helps you find the right roadmap, get internships and job
              opportunities, participate in hackathons and build the skills you
              need to grow in tech — all in one place.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                to="/roadmaps"
                className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-violet-200/60 transition hover:bg-violet-700 dark:shadow-violet-900/40"
              >
                <ArrowRight className="h-4 w-4" /> Explore Roadmaps
              </Link>
              <Link
                to="/internships"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-6 py-3.5 text-sm font-bold text-slate-800 backdrop-blur transition hover:border-violet-300 hover:text-violet-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:border-violet-500"
              >
                Find Opportunities
              </Link>
            </div>
          </div>
          <div className="hidden min-h-[280px] lg:block" aria-hidden />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <div
            ref={statsRef}
            className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-lg shadow-slate-200/40 backdrop-blur-md sm:grid-cols-4 dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-black/30"
          >
            {STATS.map((s) => (
              <StatItem key={s.label} {...s} active={statsActive} />
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white">How it works</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-400">
            Sign up → Skill quiz → Get your path — in three clear steps.
          </p>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {HOW_STEPS.map((s, i) => (
            <div
              key={s.step}
              className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              {i < HOW_STEPS.length - 1 && (
                <div className="absolute right-0 top-1/2 hidden h-px w-6 translate-x-full border-t border-dashed border-slate-300 sm:block dark:border-slate-600" />
              )}
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-violet-600 text-sm font-black text-white">
                {s.step}
              </div>
              <div className="mb-2 flex items-center gap-2">
                <s.icon className="h-4 w-4 text-violet-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{s.title}</h3>
              </div>
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <OfferStackSection onExploreAll={() => setIsAuthOpen(true)} />

      <section id="journey" className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
            <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-center">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">Your Journey</p>
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">From Learning to Landing</h2>
                <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">Follow a clear path, build real skills, and turn your effort into opportunities.</p>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {JOURNEY.map((step, i) => (
                  <div key={step.title} className="relative text-center">
                    {i < JOURNEY.length - 1 && (
                      <div className="absolute left-[60%] top-5 hidden h-px w-[80%] border-t border-dashed border-slate-300 sm:block dark:border-slate-600" />
                    )}
                    <div className={`relative z-10 mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full text-white shadow-md ${step.color}`}>
                      <step.icon className="h-5 w-5" />
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{step.title}</div>
                    <div className="mt-1 text-[11px] leading-4 text-slate-500 dark:text-slate-400">{step.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-700 px-6 py-12 text-center text-white shadow-xl shadow-violet-200/40 sm:px-12 dark:shadow-violet-900/30">
          <h2 className="text-2xl font-extrabold sm:text-3xl">Ready to start your journey?</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-violet-100">
            Join thousands of students mapping skills, following roadmaps, and landing opportunities with EDUROUTE.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setIsAuthOpen(true)}
              className="rounded-full bg-white px-6 py-3 text-sm font-bold text-violet-700 shadow-md transition hover:bg-violet-50"
            >
              Get Started Free
            </button>
            <Link
              to="/roadmaps"
              className="rounded-full border border-white/40 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
            >
              Explore Roadmaps
            </Link>
          </div>
        </div>
      </section>

      <footer id="contact" className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-sm font-black text-white">
                E
              </span>
              <span className="text-lg font-extrabold tracking-tight">
                EDU<span className="text-violet-600 dark:text-violet-400">ROUTE</span>
              </span>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Your growth partner in tech — roadmaps, skill mapping, internships, and placements in one place.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Quick links</h3>
            <ul className="mt-3 space-y-2">
              {QUICK_LINKS.map((l) => (
                <li key={l.label}>
                  <NavItem
                    item={l}
                    className="text-sm text-slate-500 transition hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-400"
                  />
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Company</h3>
            <ul className="mt-3 space-y-2">
              {COMPANY_LINKS.map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="text-sm text-slate-500 transition hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-400">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Stay updated</h3>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setNewsletterEmail('');
              }}
            >
              <input
                type="email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="Your email"
                className="min-w-0 flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-900"
              />
              <button type="submit" className="rounded-full bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700">
                Join
              </button>
            </form>
            <div className="mt-4 flex items-center gap-3">
              <a href={instagramUrl} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-violet-600" aria-label="Instagram">
                <Instagram className="h-5 w-5" />
              </a>
              <a href={whatsappUrl} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-violet-600" aria-label="WhatsApp">
                <MessageCircle className="h-5 w-5" />
              </a>
              <a href={`mailto:${supportEmail}`} className="text-slate-400 hover:text-violet-600" aria-label="Email">
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-200 py-4 text-center text-xs text-slate-400 dark:border-slate-800">
          © {new Date().getFullYear()} EDUROUTE. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

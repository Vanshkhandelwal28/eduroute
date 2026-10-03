import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthModal } from '../components/AuthModal';
import { DalaBrainHero } from '../components/DalaBrainHero';

/* ================================================================
   EDUROUTE Landing — exact Dala visual language
   Pure black · large light type · sparse nav · manifesto sections
   Interactive triangle particles · text appear sequence
   ================================================================ */

const NAV = [
  { label: 'Manifesto', href: '#manifesto' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Roadmaps', href: '/roadmaps' },
  { label: 'Get Started', href: '#get-started', cta: true },
];

const STATS = [
  { n: '45K+', l: 'Active Learners' },
  { n: '80+', l: 'Roadmaps' },
  { n: '500+', l: 'Job & Internship Opportunities' },
  { n: '120+', l: 'Upcoming Hackathons' },
];

const STEPS = [
  { n: '01', t: 'Sign up', b: 'Create a free account and pick the track you care about.' },
  { n: '02', t: 'Skill quiz', b: 'Answer a short yes/no quiz so we map your skill gaps.' },
  { n: '03', t: 'Get your path', b: 'Follow a personal roadmap, practice, and apply with confidence.' },
];

const FEATURES = [
  {
    t: 'Skill Assessment & Analysis',
    b: 'Take industry-aligned tests, get your skill profile and discover your strengths and skill gaps.',
    h: '8.5/10 Overall',
  },
  {
    t: 'Personalized Learning Path',
    b: 'Get AI-powered roadmaps, curated courses and resources to bridge your skill gaps and achieve your goals.',
    h: 'Beginner → Intermediate',
  },
  {
    t: 'Internships & Job Opportunities',
    b: 'Explore verified internships, projects and job openings from top companies. Apply and track your progress easily.',
    h: 'Google · Microsoft · TCS',
  },
  {
    t: 'Hackathons & Competitions',
    b: 'Participate in exciting hackathons, showcase your skills, win rewards and build your portfolio.',
    h: 'Win & Showcase',
  },
];

export const LandingPage = () => {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [phase, setPhase] = useState<'loading' | 'ready'>('loading');
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('ready'), 1800);
    const t2 = setTimeout(() => setShowText(true), 2100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white antialiased selection:bg-white/20">
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-5 sm:px-10">
        <a href="#home" className="text-[13px] font-medium tracking-[0.18em] uppercase">
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

      <section id="home" className="relative flex h-screen flex-col items-center justify-center overflow-hidden">
        <DalaBrainHero ready={phase === 'ready'} />

        {phase === 'loading' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black">
            <div className="mb-10 flex gap-2">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="block h-1.5 w-1.5 rotate-45 bg-white"
                  style={{
                    animation: `dalaPulse 1.4s ease-in-out ${i * 0.18}s infinite`,
                  }}
                />
              ))}
            </div>
            <p className="text-[11px] tracking-[0.3em] uppercase text-white/40">Loading</p>
          </div>
        )}

        <div
          className={`relative z-10 mx-auto max-w-3xl px-6 text-center transition-all duration-1000 ${
            showText ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
          }`}
        >
          <p className="mb-6 text-[11px] tracking-[0.25em] uppercase text-white/45">
            Your Growth Partner in Tech
          </p>
          <h1 className="text-[clamp(2.6rem,8vw,5.2rem)] font-light leading-[1.05] tracking-[-0.03em]">
            Build Skills.
            <br />
            Get Hired.
          </h1>
          <p className="mx-auto mt-7 max-w-md text-[15px] font-light leading-relaxed text-white/50">
            EDUROUTE helps you find the right roadmap, get internships and job
            opportunities, participate in hackathons and build the skills you
            need to grow in tech — all in one place.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/roadmaps"
              className="bg-white px-7 py-3 text-[11px] font-medium tracking-[0.12em] uppercase text-black transition hover:bg-white/90"
            >
              Explore Roadmaps →
            </Link>
            <Link
              to="/internships"
              className="border border-white/25 px-7 py-3 text-[11px] tracking-[0.12em] uppercase transition hover:border-white/60"
            >
              Find Opportunities
            </Link>
          </div>
        </div>

        <div
          className={`absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-[10px] tracking-[0.2em] uppercase text-white/30 transition-opacity duration-1000 ${
            showText ? 'opacity-100' : 'opacity-0'
          }`}
        >
          Scroll
        </div>
      </section>

      <section className="border-t border-white/10 px-6 py-16 sm:px-10">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-10 sm:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.l}>
              <div className="text-2xl font-light tracking-tight sm:text-3xl">{s.n}</div>
              <div className="mt-1 text-[11px] tracking-wide text-white/40">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="manifesto" className="px-6 py-28 sm:px-10">
        <div className="mx-auto max-w-5xl">
          <h2 className="max-w-2xl text-[clamp(1.8rem,4.5vw,3.2rem)] font-light leading-[1.15] tracking-[-0.02em]">
            The path is unclear.
          </h2>
          <div className="mt-14 grid gap-12 md:grid-cols-2">
            <div className="space-y-6 text-[15px] font-light leading-[1.75] text-white/50">
              <p>
                Most learners jump between random courses, outdated roadmaps and
                scattered job boards. They waste months not knowing which skills
                actually matter for the roles they want.
              </p>
              <p>
                The anxiety of “Am I learning the right thing?” and the
                frustration of applying with incomplete portfolios is real.
              </p>
            </div>
            <div className="space-y-6 text-[15px] font-light leading-[1.75] text-white/50">
              <p>
                Existing platforms either teach or list jobs — almost never both,
                and almost never with a clear personal path.
              </p>
              <p>
                You end up managing your own career like a full-time project
                instead of simply growing.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-28 sm:px-10">
        <div className="mx-auto max-w-5xl">
          <h2 className="max-w-2xl text-[clamp(1.8rem,4.5vw,3.2rem)] font-light leading-[1.15] tracking-[-0.02em]">
            Spark clarity.
            <br />
            Build with purpose.
          </h2>
          <p className="mt-8 max-w-lg text-[15px] font-light leading-[1.75] text-white/50">
            EDUROUTE is your intelligent growth partner. We map your current
            skills, generate a personal roadmap, surface real opportunities and
            let you practice and compete — so you can move from learning to hired
            with confidence.
          </p>
        </div>
      </section>

      <section id="how-it-works" className="border-t border-white/10 px-6 py-28 sm:px-10">
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 text-[11px] tracking-[0.2em] uppercase text-white/35">
            How it works
          </p>
          <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-light tracking-[-0.02em]">
            Three clear steps.
          </h2>
          <div className="mt-16 grid gap-14 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n}>
                <div className="mb-5 text-[11px] tracking-[0.18em] text-white/35">{s.n}</div>
                <h3 className="text-lg font-normal tracking-tight">{s.t}</h3>
                <p className="mt-3 text-[14px] font-light leading-relaxed text-white/45">{s.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 px-6 py-28 sm:px-10">
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 text-[11px] tracking-[0.2em] uppercase text-white/35">
            What we offer
          </p>
          <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-light tracking-[-0.02em]">
            Everything You Need to Grow
          </h2>
          <div className="mt-16 grid gap-x-16 gap-y-14 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.t}>
                <h3 className="text-lg font-normal tracking-tight">{f.t}</h3>
                <p className="mt-3 text-[14px] font-light leading-relaxed text-white/45">{f.b}</p>
                <p className="mt-4 text-[11px] tracking-[0.08em] text-white/60">{f.h}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-28 sm:px-10">
        <div className="mx-auto max-w-5xl">
          <h2 className="max-w-2xl text-[clamp(1.8rem,4.5vw,3.2rem)] font-light leading-[1.15] tracking-[-0.02em]">
            Learn. Build. Compete.
            <br />
            Get Hired.
          </h2>
          <p className="mt-8 max-w-lg text-[15px] font-light leading-[1.75] text-white/50">
            Our mission is to make the journey into tech coherent and delightful —
            reframing career growth from “figure it out alone” to having a clear
            partner every step of the way.
          </p>
          <p className="mt-5 max-w-lg text-[15px] font-light leading-[1.75] text-white/50">
            Your most purposeful moments are when you’re building real skills,
            shipping projects and landing opportunities that matter. We want to
            recreate that every time you use EDUROUTE.
          </p>
        </div>
      </section>

      <section
        id="get-started"
        className="border-y border-white/10 px-6 py-24 text-center sm:px-10"
      >
        <h2 className="text-[clamp(1.6rem,3.5vw,2.4rem)] font-light tracking-[-0.02em]">
          Your growth starts here.
        </h2>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/roadmaps"
            className="bg-white px-8 py-3.5 text-[11px] font-medium tracking-[0.12em] uppercase text-black transition hover:bg-white/90"
          >
            Explore Roadmaps →
          </Link>
          <button
            type="button"
            onClick={() => setIsAuthOpen(true)}
            className="border border-white/30 px-8 py-3.5 text-[11px] tracking-[0.12em] uppercase transition hover:border-white/70"
          >
            Get Started
          </button>
        </div>
      </section>

      <footer className="px-6 py-16 sm:px-10">
        <div className="mx-auto grid max-w-5xl gap-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-[13px] font-medium tracking-[0.14em] uppercase">EDUROUTE</div>
            <p className="mt-4 max-w-[220px] text-[13px] font-light leading-relaxed text-white/40">
              Learn. Build. Compete. Get Hired.
              <br /><br />
              Your one stop platform to build skills, explore opportunities and
              grow your career in tech.
            </p>
          </div>
          <div>
            <div className="mb-5 text-[10px] tracking-[0.16em] uppercase text-white/35">Quick links</div>
            <div className="space-y-2.5 text-[13px] font-light text-white/50">
              <a href="#home" className="block hover:text-white">Home</a>
              <a href="#how-it-works" className="block hover:text-white">How it works</a>
              <Link to="/roadmaps" className="block hover:text-white">Roadmaps</Link>
              <Link to="/internships" className="block hover:text-white">Internships</Link>
              <a href="#manifesto" className="block hover:text-white">Journey</a>
            </div>
          </div>
          <div>
            <div className="mb-5 text-[10px] tracking-[0.16em] uppercase text-white/35">Company</div>
            <div className="space-y-2.5 text-[13px] font-light text-white/50">
              <a href="#manifesto" className="block hover:text-white">About Us</a>
              <a href="#manifesto" className="block hover:text-white">Our Mission</a>
              <a href="#get-started" className="block hover:text-white">Contact Us</a>
              <span className="block">Privacy Policy</span>
              <span className="block">Terms & Conditions</span>
            </div>
          </div>
          <div>
            <div className="mb-5 text-[10px] tracking-[0.16em] uppercase text-white/35">Stay Updated</div>
            <p className="mb-4 text-[13px] font-light text-white/40">
              Get the latest roadmaps, opportunities and tips in your inbox.
            </p>
            <input
              type="email"
              placeholder="Your email"
              className="mb-2 w-full border border-white/20 bg-transparent px-3 py-2.5 text-[13px] text-white placeholder:text-white/25 outline-none focus:border-white/45"
            />
            <button
              type="button"
              className="w-full bg-white py-2.5 text-[11px] font-medium tracking-[0.12em] uppercase text-black transition hover:bg-white/90"
            >
              Subscribe
            </button>
          </div>
        </div>
        <div className="mx-auto mt-16 flex max-w-5xl flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-[11px] text-white/30 sm:flex-row">
          <div>© 2026 EDUROUTE. All rights reserved.</div>
          <div className="flex gap-8">
            <a href="#manifesto" className="hover:text-white">Manifesto</a>
            <a href="#how-it-works" className="hover:text-white">How it works</a>
            <Link to="/roadmaps" className="hover:text-white">Roadmaps</Link>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes dalaPulse {
          0%, 100% { opacity: 0.25; transform: rotate(45deg) scale(0.85); }
          50% { opacity: 1; transform: rotate(45deg) scale(1.15); }
        }
      `}</style>
    </div>
  );
};

import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Code2,
  Terminal,
  LineChart,
  ShieldAlert,
  Palette,
  Database,
  Layers,
  ChevronRight,
  Target,
  Search,
  Sparkles,
  ArrowRight,
  Wand2,
  Briefcase,
  GraduationCap,
  Layers3,
  Flame,
} from 'lucide-react';
import { motion, useScroll, useTransform, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';
import { computePlacementChance, courseTypeImage } from '../../utils/placementChance';
import { PlacementChanceStrip } from '../../components/PlacementChanceStrip';

const ROLES = [
  {
    id: 'frontend',
    title: 'Frontend Developer',
    icon: Code2,
    color: 'bg-blue-500',
    glow: 'rgba(59,130,246,0.45)',
    description: 'Master HTML CSS React',
    fullDescription: 'Master HTML, CSS, React, and modern frontend architecture.',
    level: 'Beginner to Advanced',
    modules: 12,
    trending: true,
  },
  {
    id: 'backend',
    title: 'Backend Developer',
    icon: Terminal,
    color: 'bg-emerald-500',
    glow: 'rgba(16,185,129,0.45)',
    description: 'Node.js, SQL/NoSQL, system design',
    fullDescription: 'Learn Node.js, SQL/NoSQL, and system design patterns.',
    level: 'Beginner to Advanced',
    modules: 15,
    trending: false,
  },
  {
    id: 'data-analyst',
    title: 'Data Analyst',
    icon: LineChart,
    color: 'bg-purple-500',
    glow: 'rgba(168,85,247,0.45)',
    description: 'Python, SQL, data visualization',
    fullDescription: 'Master Python, SQL, and data visualization tools.',
    level: 'Beginner to Pro',
    modules: 10,
    trending: true,
  },
  {
    id: 'cybersecurity',
    title: 'Cybersecurity',
    icon: ShieldAlert,
    color: 'bg-red-500',
    glow: 'rgba(239,68,68,0.45)',
    description: 'Ethical hacking & network defense',
    fullDescription: 'Learn ethical hacking, network security, and defense.',
    level: 'Beginner to Advanced',
    modules: 12,
    trending: false,
  },
  {
    id: 'ui-ux',
    title: 'UI/UX Designer',
    icon: Palette,
    color: 'bg-pink-500',
    glow: 'rgba(236,72,153,0.45)',
    description: 'Figma, research, interactive design',
    fullDescription: 'Learn Figma, user research, and interactive design.',
    level: 'Creative focused',
    modules: 8,
    trending: false,
  },
  {
    id: 'fullstack',
    title: 'Fullstack Engineer',
    icon: Database,
    color: 'bg-indigo-500',
    glow: 'rgba(99,102,241,0.45)',
    description: 'Frontend to infrastructure',
    fullDescription: 'The complete path from frontend to infrastructure.',
    level: 'Beginner to Pro',
    modules: 10,
    trending: true,
  },
  {
    id: 'dsa',
    title: 'DSA Complete Path',
    icon: Layers,
    color: 'bg-violet-500',
    glow: 'rgba(139,92,246,0.45)',
    description: 'Arrays to DP for interviews',
    fullDescription: 'Arrays to DP — structured problem-solving for interviews.',
    level: 'Intermediate',
    modules: 10,
    trending: false,
  },
];

const ROLE_SKILLS: Record<string, { category: string; skillsHint: string }> = {
  frontend: { category: 'Development', skillsHint: 'React TypeScript JavaScript HTML CSS frontend' },
  backend: { category: 'Development', skillsHint: 'Node Express SQL MongoDB backend system design' },
  'data-analyst': { category: 'Data Science', skillsHint: 'Python SQL data science analytics' },
  cybersecurity: { category: 'Development', skillsHint: 'cyber security network ethical hacking' },
  'ui-ux': { category: 'Design', skillsHint: 'UI UX Figma design research' },
  fullstack: { category: 'Development', skillsHint: 'React Node TypeScript MongoDB fullstack' },
  dsa: { category: 'Development', skillsHint: 'DSA algorithms data structures java' },
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.09, delayChildren: 0.12 },
  },
};

const item = {
  hidden: { opacity: 0, y: 28, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 340, damping: 26 },
  },
};

/** Soft floating particles / color sprinkle over the page */
function AuroraParticles({ reduceMotion }: { reduceMotion: boolean | null }) {
  if (reduceMotion) return null;
  const dots = [
    { t: '8%', l: '12%', s: 6, c: 'bg-violet-400/40', d: 0 },
    { t: '18%', l: '78%', s: 4, c: 'bg-fuchsia-400/35', d: 0.4 },
    { t: '32%', l: '22%', s: 5, c: 'bg-cyan-400/30', d: 0.8 },
    { t: '48%', l: '88%', s: 7, c: 'bg-indigo-400/35', d: 1.2 },
    { t: '62%', l: '8%', s: 4, c: 'bg-pink-400/30', d: 0.6 },
    { t: '72%', l: '55%', s: 5, c: 'bg-blue-400/30', d: 1.5 },
    { t: '85%', l: '30%', s: 6, c: 'bg-violet-300/25', d: 0.2 },
    { t: '28%', l: '48%', s: 3, c: 'bg-emerald-400/25', d: 1.0 },
    { t: '55%', l: '70%', s: 4, c: 'bg-amber-300/20', d: 1.8 },
    { t: '12%', l: '42%', s: 5, c: 'bg-purple-400/30', d: 0.9 },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* aurora blobs */}
      <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl dark:bg-violet-600/25" />
      <div className="absolute right-[-10%] top-24 h-80 w-80 rounded-full bg-fuchsia-500/15 blur-3xl dark:bg-fuchsia-600/20" />
      <div className="absolute bottom-20 left-1/3 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl dark:bg-cyan-500/15" />
      <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-violet-500/10 via-transparent to-transparent dark:from-violet-600/15" />
      {dots.map((p, i) => (
        <motion.span
          key={i}
          className={`absolute rounded-full ${p.c}`}
          style={{
            top: p.t,
            left: p.l,
            width: p.s,
            height: p.s,
            boxShadow: `0 0 ${p.s * 2}px currentColor`,
          }}
          animate={{
            y: [0, -14, 0, 10, 0],
            x: [0, 8, -6, 4, 0],
            opacity: [0.35, 0.85, 0.5, 0.9, 0.35],
            scale: [1, 1.25, 0.9, 1.15, 1],
          }}
          transition={{
            duration: 5.5 + (i % 4),
            delay: p.d,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

function SoundWavePath({
  d0,
  d1,
  d2,
  duration,
  delay,
  strokeWidth,
  className,
}: {
  d0: string;
  d1: string;
  d2: string;
  duration: string;
  delay?: string;
  strokeWidth: number;
  className: string;
}) {
  return (
    <path
      d={d0}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      fill="none"
      className={className}
    >
      <animate
        attributeName="d"
        values={`${d0};${d1};${d2};${d1};${d0}`}
        dur={duration}
        begin={delay || '0s'}
        repeatCount="indefinite"
        calcMode="spline"
        keySplines="0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1"
        keyTimes="0;0.25;0.5;0.75;1"
      />
    </path>
  );
}

function UpperWaveBackground({
  scrollYProgress,
}: {
  scrollYProgress: ReturnType<typeof useScroll>['scrollYProgress'];
}) {
  const leftFlowX = useTransform(scrollYProgress, [0, 0.7], [0, -36]);
  const rightFlowX = useTransform(scrollYProgress, [0, 0.7], [0, 42]);
  const leftFlowY = useTransform(scrollYProgress, [0, 0.7], [0, -10]);
  const rightFlowY = useTransform(scrollYProgress, [0, 0.7], [0, 12]);
  const waveOpacity = useTransform(scrollYProgress, [0, 0.15, 0.45], [1, 0.95, 0.28]);

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
      style={{ opacity: waveOpacity }}
    >
      <div className="absolute left-[6%] top-8 h-40 w-40 rounded-full bg-indigo-400/10 blur-3xl dark:bg-indigo-500/15" />
      <div className="absolute right-[3%] top-2 h-56 w-56 rounded-full bg-violet-400/12 blur-3xl dark:bg-violet-600/18" />
      <motion.svg
        className="absolute left-0 top-[10%] h-[62%] w-[30%] max-w-[320px] md:w-[32%] lg:max-w-[360px]"
        viewBox="0 0 340 260"
        fill="none"
        preserveAspectRatio="xMinYMid meet"
        style={{ x: leftFlowX, y: leftFlowY }}
      >
        <defs>
          <linearGradient id="waveFadeLeft" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="65%" stopColor="white" stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <mask id="waveMaskLeft">
            <rect width="340" height="260" fill="url(#waveFadeLeft)" />
          </mask>
        </defs>
        <g mask="url(#waveMaskLeft)">
          <SoundWavePath
            d0="M-8 130 C 50 70, 100 190, 160 130 S 250 70, 340 130"
            d1="M-8 130 C 50 190, 100 70, 160 130 S 250 190, 340 130"
            d2="M-8 130 C 50 80, 100 180, 160 130 S 250 80, 340 130"
            duration="2.8s"
            strokeWidth={1.45}
            className="text-slate-400/55 dark:text-slate-400/50"
          />
          <SoundWavePath
            d0="M-8 155 C 55 210, 105 95, 170 155 S 260 210, 340 155"
            d1="M-8 155 C 55 95, 105 210, 170 155 S 260 95, 340 155"
            d2="M-8 155 C 55 105, 105 200, 170 155 S 260 105, 340 155"
            duration="3.7s"
            delay="-1.5s"
            strokeWidth={1.2}
            className="text-indigo-400/50 dark:text-indigo-300/45"
          />
        </g>
      </motion.svg>
      <motion.div style={{ x: rightFlowX, y: rightFlowY }} className="absolute right-0 top-[15%] h-32 w-32 opacity-40">
        <div className="h-full w-full rounded-full bg-fuchsia-400/20 blur-2xl" />
      </motion.div>
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[var(--bg-primary)] to-transparent" />
    </motion.div>
  );
}

/** 3D glass roadmap card — tilt + glow + image media */
function GlassRoadmapCard({
  role,
  onOpen,
}: {
  role: (typeof ROLES)[number];
  onOpen: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), { stiffness: 280, damping: 22 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-10, 10]), { stiffness: 280, damping: 22 });
  const [hovered, setHovered] = useState(false);

  const Icon = role.icon;
  const meta = ROLE_SKILLS[role.id] || { category: 'Development', skillsHint: role.title };
  const chance = computePlacementChance({
    title: role.title,
    description: `${role.fullDescription} ${meta.skillsHint}`,
    category: meta.category,
  });
  const img = courseTypeImage({ title: role.title, category: meta.category });

  const onMove = (e: React.MouseEvent) => {
    if (reduceMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const onLeave = () => {
    mx.set(0);
    my.set(0);
    setHovered(false);
  };

  return (
    <motion.div
      variants={item}
      style={reduceMotion ? undefined : { rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onMouseMove={onMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={onLeave}
      onClick={onOpen}
      ref={ref}
      className="group relative cursor-pointer"
    >
      {/* outer glow */}
      <div
        className="pointer-events-none absolute -inset-[1px] rounded-[28px] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `linear-gradient(135deg, ${role.glow}, rgba(139,92,246,0.35), transparent)`,
          filter: 'blur(12px)',
        }}
      />

      <div
        className="relative overflow-hidden rounded-[26px] border border-white/15 bg-white/70 shadow-[0_8px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-shadow duration-300 group-hover:shadow-[0_20px_50px_rgba(99,102,241,0.22)] dark:border-white/10 dark:bg-slate-900/55 dark:shadow-[0_8px_40px_rgba(0,0,0,0.45)] dark:group-hover:shadow-[0_24px_60px_rgba(139,92,246,0.25)]"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* media */}
        <div className="relative h-40 overflow-hidden sm:h-44">
          <img
            src={img}
            alt=""
            className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/55 to-slate-900/20" />

          {/* sprinkle particles on image */}
          {!reduceMotion && hovered && (
            <>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <motion.span
                  key={i}
                  className="absolute h-1.5 w-1.5 rounded-full bg-white/80"
                  style={{ left: `${12 + i * 14}%`, top: `${20 + (i % 3) * 18}%` }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: [0, 1, 0], y: [-4, -18], scale: [0.6, 1.2, 0.4] }}
                  transition={{ duration: 1.4, delay: i * 0.12, repeat: Infinity }}
                />
              ))}
            </>
          )}

          {/* ER mark */}
          <div className="absolute left-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-xl border border-white/25 bg-white/15 text-xs font-black tracking-tight text-white shadow-lg backdrop-blur-md">
            <span className="bg-gradient-to-br from-violet-200 to-fuchsia-200 bg-clip-text text-transparent">ER</span>
          </div>

          {role.trending && (
            <div className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full border border-violet-300/40 bg-violet-600/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-lg backdrop-blur-md">
              <Flame className="h-3 w-3 text-amber-300" />
              Trending
            </div>
          )}

          <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-end justify-between gap-2">
            <motion.div
              className={`flex h-11 w-11 items-center justify-center rounded-2xl ${role.color} text-white shadow-lg ring-2 ring-white/20`}
              whileHover={reduceMotion ? undefined : { scale: 1.1, rotate: -4 }}
              transition={{ type: 'spring', stiffness: 400, damping: 16 }}
              style={{ transform: 'translateZ(24px)' }}
            >
              <Icon className="h-5 w-5" />
            </motion.div>
            <div className="max-w-[70%]">
              <PlacementChanceStrip result={chance} compact />
            </div>
          </div>
        </div>

        {/* body */}
        <div className="relative p-5 sm:p-6">
          <div
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              background: `radial-gradient(600px circle at var(--mx,50%) var(--my,0%), ${role.glow}, transparent 40%)`,
            }}
          />

          <h3 className="mb-1.5 text-xl font-black tracking-tight text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-violet-300">
            {role.title}
          </h3>
          <div className="mb-2 h-0.5 w-10 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" />
          <p className="mb-3 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            {role.description}
          </p>

          <PlacementChanceStrip result={chance} className="mb-4" />

          <div className="mb-4 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5 text-violet-500" />
              {role.level}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Layers3 className="h-3.5 w-3.5 text-indigo-500" />
              {role.modules} modules
            </span>
            {chance.roleHints[0] && (
              <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <Briefcase className="h-3.5 w-3.5 text-indigo-500" />
                {chance.roleHints[0].role}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm font-bold text-indigo-600 opacity-90 transition group-hover:opacity-100 dark:text-violet-300">
            Start path <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export const RoadmapList = () => {
  const navigate = useNavigate();
  const pageRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: pageRef,
    offset: ['start start', 'end start'],
  });

  return (
    <div ref={pageRef} className="relative flex-1 overflow-x-hidden bg-[var(--bg-primary)]">
      <AuroraParticles reduceMotion={reduceMotion} />

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 z-0 max-h-[420px] md:max-h-[460px]">
          <UpperWaveBackground scrollYProgress={scrollYProgress} />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-6 pt-4 md:px-8 md:pt-8">
          <motion.header
            className="mb-10 md:mb-12"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl bg-indigo-100 p-3 text-indigo-600 shadow-sm ring-1 ring-indigo-200/60 dark:bg-indigo-500/20 dark:text-indigo-300 dark:ring-indigo-400/30">
                <Target className="h-6 w-6" />
              </div>
              <span className="text-sm font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
                Career Paths
              </span>
            </div>
            <h1 className="mb-5 text-4xl font-black leading-tight text-slate-900 dark:text-white md:text-5xl">
              Your Career Journey,{' '}
              <span className="bg-gradient-to-r from-indigo-600 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent dark:from-indigo-300 dark:via-violet-300 dark:to-fuchsia-300">
                Visualized.
              </span>
            </h1>
            <p className="max-w-2xl text-lg font-medium leading-relaxed text-slate-500 dark:text-slate-400 md:text-xl">
              Skill-matched paths with real placement chance — scores update from your profile.
            </p>
          </motion.header>

          <motion.div
            className="relative mb-4 max-w-2xl"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08 }}
          >
            <Search className="absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search career paths..."
              className="w-full rounded-[28px] border border-white/40 bg-white/70 py-5 pl-16 pr-6 text-lg font-medium text-slate-900 shadow-xl shadow-slate-200/40 outline-none backdrop-blur-md transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:shadow-black/40"
            />
          </motion.div>

          <motion.div
            className="relative mb-8 max-w-2xl"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.14 }}
          >
            <Link
              to="/ai-course-designer"
              className="group relative flex flex-col gap-3 overflow-hidden rounded-[28px] border border-indigo-200/80 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 p-5 text-white shadow-xl shadow-indigo-500/25 transition hover:shadow-2xl hover:shadow-violet-500/30 sm:flex-row sm:items-center sm:justify-between sm:p-6"
            >
              <div className="relative flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm ring-1 ring-white/30">
                  <Wand2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/80">AI Course Designer</p>
                  <h2 className="text-lg font-black leading-tight sm:text-xl">Build a custom mixed path in minutes</h2>
                  <p className="mt-1 max-w-md text-sm font-medium text-white/85">
                    Choose duration + interests — get a roadmap with real YouTube + docs.
                  </p>
                </div>
              </div>
              <span className="relative inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-white px-4 py-2.5 text-sm font-black text-indigo-700 sm:self-center">
                <Sparkles className="h-4 w-4 text-fuchsia-500" />
                Open designer
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </motion.div>
        </div>
      </section>

      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-10 pt-6 md:px-8 md:pb-12">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.08 }}
          className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3"
          style={{ perspective: 1200 }}
        >
          {ROLES.map((role) => (
            <GlassRoadmapCard key={role.id} role={role} onOpen={() => navigate(`/roadmaps/${role.id}`)} />
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default RoadmapList;

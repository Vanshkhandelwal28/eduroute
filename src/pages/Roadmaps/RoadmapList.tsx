import { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Code2,
  Terminal,
  LineChart,
  ShieldAlert,
  Palette,
  Database,
  Layers,
  TrendingUp,
  ChevronRight,
  Target,
  Search,
  Sparkles,
  ArrowRight,
  Wand2,
} from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';

const ROLES = [
  {
    id: 'frontend',
    title: 'Frontend Developer',
    icon: Code2,
    color: 'bg-blue-500',
    description: 'Master HTML, CSS, React, and modern frontend architecture.',
    level: 'Beginner to Advanced',
    modules: 12,
    trending: true,
  },
  {
    id: 'backend',
    title: 'Backend Developer',
    icon: Terminal,
    color: 'bg-emerald-500',
    description: 'Learn Node.js, SQL/NoSQL, and system design patterns.',
    level: 'Beginner to Advanced',
    modules: 15,
    trending: true,
  },
  {
    id: 'data-analyst',
    title: 'Data Analyst',
    icon: LineChart,
    color: 'bg-purple-500',
    description: 'Master Python, SQL, and data visualization tools.',
    level: 'Beginner to Pro',
    modules: 10,
    trending: true,
  },
  {
    id: 'cybersecurity',
    title: 'Cybersecurity',
    icon: ShieldAlert,
    color: 'bg-red-500',
    description: 'Learn ethical hacking, network security, and defense.',
    level: 'Beginner to Advanced',
    modules: 12,
    trending: true,
  },
  {
    id: 'ui-ux',
    title: 'UI/UX Designer',
    icon: Palette,
    color: 'bg-pink-500',
    description: 'Learn Figma, user research, and interactive design.',
    level: 'Creative focused',
    modules: 8,
    trending: true,
  },
  {
    id: 'fullstack',
    title: 'Fullstack Engineer',
    icon: Database,
    color: 'bg-indigo-500',
    description: 'The complete path from frontend to infrastructure.',
    level: 'Beginner to Pro',
    modules: 10,
    trending: true,
  },
  {
    id: 'dsa',
    title: 'DSA Complete Path',
    icon: Layers,
    color: 'bg-violet-500',
    description: 'Arrays to DP — structured problem-solving for interviews.',
    level: 'Intermediate',
    modules: 10,
    trending: true,
  },
];

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
          <SoundWavePath
            d0="M-8 105 C 48 65, 95 150, 155 105 S 245 65, 340 105"
            d1="M-8 105 C 48 160, 95 55, 155 105 S 245 160, 340 105"
            d2="M-8 105 C 48 55, 95 160, 155 105 S 245 55, 340 105"
            duration="4.5s"
            delay="-2.8s"
            strokeWidth={1.05}
            className="text-violet-400/40 dark:text-violet-300/38"
          />
        </g>
      </motion.svg>

      <motion.svg
        className="absolute right-0 top-[2%] h-[82%] w-[46%] max-w-[560px] md:w-[48%] lg:max-w-[600px]"
        viewBox="0 0 560 320"
        fill="none"
        preserveAspectRatio="xMaxYMid meet"
        style={{ x: rightFlowX, y: rightFlowY }}
      >
        <defs>
          <linearGradient id="waveFadeRight" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="50%" stopColor="white" stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <mask id="waveMaskRight">
            <rect width="560" height="320" fill="url(#waveFadeRight)" />
          </mask>
        </defs>
        <g mask="url(#waveMaskRight)">
          <SoundWavePath
            d0="M20 100 C 120 35, 200 170, 310 100 S 450 35, 580 100"
            d1="M20 100 C 120 170, 200 35, 310 100 S 450 170, 580 100"
            d2="M20 100 C 120 45, 200 160, 310 100 S 450 45, 580 100"
            duration="2.6s"
            strokeWidth={1.55}
            className="text-slate-400/55 dark:text-slate-400/52"
          />
          <SoundWavePath
            d0="M20 135 C 130 200, 210 70, 320 135 S 460 200, 580 135"
            d1="M20 135 C 130 70, 210 200, 320 135 S 460 70, 580 135"
            d2="M20 135 C 130 80, 210 190, 320 135 S 460 80, 580 135"
            duration="3.4s"
            delay="-1.1s"
            strokeWidth={1.3}
            className="text-indigo-400/48 dark:text-indigo-300/45"
          />
          <SoundWavePath
            d0="M20 170 C 135 115, 220 220, 330 170 S 470 115, 580 170"
            d1="M20 170 C 135 230, 220 105, 330 170 S 470 230, 580 170"
            d2="M20 170 C 135 105, 220 230, 330 170 S 470 105, 580 170"
            duration="4.3s"
            delay="-2.4s"
            strokeWidth={1.15}
            className="text-violet-400/42 dark:text-violet-300/40"
          />
          <SoundWavePath
            d0="M30 75 C 125 150, 205 25, 305 75 S 445 150, 580 75"
            d1="M30 75 C 125 25, 205 150, 305 75 S 445 25, 580 75"
            d2="M30 75 C 125 35, 205 140, 305 75 S 445 35, 580 75"
            duration="3.1s"
            delay="-0.7s"
            strokeWidth={1.05}
            className="text-sky-400/38 dark:text-sky-300/35"
          />
          <SoundWavePath
            d0="M40 205 C 145 160, 230 250, 340 205 S 480 160, 580 205"
            d1="M40 205 C 145 260, 230 150, 340 205 S 480 260, 580 205"
            d2="M40 205 C 145 150, 230 260, 340 205 S 480 150, 580 205"
            duration="4.8s"
            delay="-3.2s"
            strokeWidth={1}
            className="text-fuchsia-400/32 dark:text-fuchsia-300/30"
          />
          <SoundWavePath
            d0="M50 235 C 155 285, 245 185, 355 235 S 490 285, 580 235"
            d1="M50 235 C 155 185, 245 285, 355 235 S 490 185, 580 235"
            d2="M50 235 C 155 195, 245 275, 355 235 S 490 195, 580 235"
            duration="3.9s"
            delay="-1.9s"
            strokeWidth={0.9}
            className="text-indigo-300/28 dark:text-indigo-200/26"
          />
        </g>
      </motion.svg>

      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[var(--bg-primary)] to-transparent" />
    </motion.div>
  );
}

export const RoadmapList = () => {
  const navigate = useNavigate();
  const pageRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: pageRef,
    offset: ['start start', 'end start'],
  });

  return (
    <div ref={pageRef} className="relative flex-1 bg-[var(--bg-primary)]">
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
              <div className="rounded-2xl bg-indigo-100 p-3 text-indigo-600 shadow-sm dark:bg-indigo-500/20 dark:text-indigo-300">
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
              Follow industry-standard paths designed to take you from absolute zero
              to a professional role. Each step is verified by experts.
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
              className="w-full rounded-[28px] border border-slate-100 bg-white/90 py-5 pl-16 pr-6 text-lg font-medium text-slate-900 shadow-xl shadow-slate-200/50 outline-none backdrop-blur-sm transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-900/90 dark:text-white dark:shadow-black/40"
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
              <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/15 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-8 left-1/4 h-24 w-24 rounded-full bg-fuchsia-300/20 blur-2xl" />
              <div className="relative flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm ring-1 ring-white/30">
                  <Wand2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/80">
                    AI Course Designer
                  </p>
                  <h2 className="text-lg font-black leading-tight sm:text-xl">
                    Build a custom mixed path in minutes
                  </h2>
                  <p className="mt-1 max-w-md text-sm font-medium text-white/85">
                    Choose 3 / 15 / 30 / 90 days + interests — get a roadmap with real YouTube + docs, hours per topic, editable anytime.
                  </p>
                </div>
              </div>
              <span className="relative inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-white px-4 py-2.5 text-sm font-black text-indigo-700 transition group-hover:scale-[1.03] sm:self-center">
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
          viewport={{ once: true, amount: 0.12 }}
          className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3"
        >
          {ROLES.map((role) => {
            const Icon = role.icon;
            return (
              <motion.div
                key={role.id}
                variants={item}
                whileHover={{ y: -8, scale: 1.015 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/roadmaps/${role.id}`)}
                className="group cursor-pointer rounded-[32px] border border-slate-100 bg-white p-7 shadow-sm transition-shadow duration-300 hover:shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:hover:shadow-indigo-950/40 md:p-8"
              >
                <div className="mb-6 flex items-start justify-between">
                  <motion.div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl ${role.color} text-white shadow-lg`}
                    whileHover={{ scale: 1.1, rotate: -3 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                  >
                    <Icon className="h-7 w-7" />
                  </motion.div>
                  {role.trending && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                      <TrendingUp className="h-3 w-3" /> Trending
                    </span>
                  )}
                </div>
                <h3 className="mb-2 text-xl font-black text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                  {role.title}
                </h3>
                <p className="mb-6 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  {role.description}
                </p>
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span>{role.level}</span>
                  <span>{role.modules} modules</span>
                </div>
                <div className="mt-6 flex items-center gap-2 text-sm font-bold text-indigo-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-indigo-400">
                  Start path <ChevronRight className="h-4 w-4" />
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          className="mt-12 flex justify-center"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <button
            type="button"
            onClick={() => navigate('/roadmaps')}
            className="rounded-full bg-indigo-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-500 hover:shadow-indigo-500/40 dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            Explore All Paths
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default RoadmapList;

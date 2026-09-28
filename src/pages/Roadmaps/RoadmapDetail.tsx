import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  BookOpen,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  MapPin,
  Play,
  Sparkles,
  Youtube,
} from 'lucide-react';
import { ROADMAP_DATA, type RoadmapTopic } from './roadmapData';
import { YouTubeCoursePlayer } from '../../components/YouTubeCoursePlayer';
import { CourseCertificate } from '../../components/CourseCertificate';
import { getAuthUser } from '../../utils/rbacAuth';
import {
  formatCertDate,
  getTopicProgress,
  recordWatchProgress,
  setTopicCompleted,
} from '../../utils/courseProgressStore';
import {
  formatWatchDuration,
  minWatchSecondsFromTopics,
} from '../../utils/youtubeDurations';

const storageKey = (role: string) => `eduroute-roadmap-topics-${role}`;

/** Sample placement outcomes per path (template / social proof — not live LinkedIn). */
const PLACED_FROM_PATH: Record<
  string,
  { name: string; role: string; company: string; months: number; quote: string; initials: string }[]
> = {
  frontend: [
    { name: 'Aarav Mehta', role: 'SDE-1', company: 'Amazon', months: 4, quote: 'Roadmap modules + projects helped me clear the UI round.', initials: 'AM' },
    { name: 'Priya Sharma', role: 'Frontend Engineer', company: 'Flipkart', months: 6, quote: 'React + portfolio projects gave me the edge in interviews.', initials: 'PS' },
    { name: 'Rohan Patel', role: 'Full Stack Intern', company: 'Razorpay', months: 3, quote: 'The roadmap gave me structure and real projects.', initials: 'RP' },
  ],
  backend: [
    { name: 'Kabir Singh', role: 'Backend Engineer', company: 'Swiggy', months: 5, quote: 'Node + SQL path matched what the hiring bar expected.', initials: 'KS' },
    { name: 'Ananya Iyer', role: 'SDE-1', company: 'Microsoft', months: 7, quote: 'Auth, APIs, and system design modules were interview gold.', initials: 'AI' },
    { name: 'Dev Mehta', role: 'API Engineer', company: 'PhonePe', months: 4, quote: 'Hands-on Express + MongoDB topics closed my gaps.', initials: 'DM' },
  ],
  'data-analyst': [
    { name: 'Neha Gupta', role: 'Data Analyst', company: 'Zoho', months: 5, quote: 'Python + SQL track mapped directly to the job tests.', initials: 'NG' },
    { name: 'Vikram Rao', role: 'Business Analyst', company: 'Deloitte', months: 6, quote: 'Visualization modules helped me present insights clearly.', initials: 'VR' },
    { name: 'Sana Khan', role: 'Data Intern', company: 'Freshworks', months: 3, quote: 'Structured path made learning analytics less overwhelming.', initials: 'SK' },
  ],
  cybersecurity: [
    { name: 'Arjun Nair', role: 'Security Analyst', company: 'Wipro', months: 6, quote: 'Network + ethical hacking labs built real confidence.', initials: 'AN' },
    { name: 'Meera Joshi', role: 'SOC Analyst', company: 'TCS', months: 5, quote: 'Defense modules aligned with entry SOC interviews.', initials: 'MJ' },
    { name: 'Harsh Vardhan', role: 'Security Intern', company: 'Infosys', months: 4, quote: 'Clear path from basics to practical tools.', initials: 'HV' },
  ],
  'ui-ux': [
    { name: 'Isha Reddy', role: 'UI Designer', company: 'CRED', months: 5, quote: 'Figma + research steps improved my case studies.', initials: 'IR' },
    { name: 'Kunal Shah', role: 'Product Designer', company: 'Paytm', months: 6, quote: 'User research modules stood out in portfolio reviews.', initials: 'KS' },
    { name: 'Diya Kapoor', role: 'UX Intern', company: 'Zomato', months: 3, quote: 'Structured design path helped me ship a solid case study.', initials: 'DK' },
  ],
  fullstack: [
    { name: 'Rahul Verma', role: 'Fullstack Engineer', company: 'Razorpay', months: 6, quote: 'End-to-end path prepared me for product interviews.', initials: 'RV' },
    { name: 'Sneha Pillai', role: 'SDE-1', company: 'Amazon', months: 8, quote: 'Frontend + backend together matched the role scope.', initials: 'SP' },
    { name: 'Aditya Bose', role: 'Fullstack Intern', company: 'Postman', months: 4, quote: 'Projects from the path became my interview talking points.', initials: 'AB' },
  ],
  dsa: [
    { name: 'Yash Agarwal', role: 'SDE-1', company: 'Google', months: 7, quote: 'DSA path discipline helped me clear coding rounds.', initials: 'YA' },
    { name: 'Pooja Nair', role: 'Software Engineer', company: 'Uber', months: 6, quote: 'Arrays to DP order matched what interviewers asked.', initials: 'PN' },
    { name: 'Manav Joshi', role: 'SDE Intern', company: 'Oracle', months: 4, quote: 'Structured problem sets built pattern recognition fast.', initials: 'MJ' },
  ],
};

export const RoadmapDetail = () => {
  const { role = 'frontend' } = useParams();
  const reduceMotion = useReducedMotion();
  const data = ROADMAP_DATA[role] || ROADMAP_DATA.frontend;
  const courseKey = `roadmap:${role}`;
  const user = getAuthUser();

  const initialCompleted = useMemo(() => {
    const map: Record<string, boolean> = {};
    data.topics.forEach((t) => {
      if (t.completed) map[t.id] = true;
    });
    return map;
  }, [data.topics]);

  const [completed, setCompleted] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return initialCompleted;
    try {
      const raw = localStorage.getItem(storageKey(role));
      if (!raw) return initialCompleted;
      return { ...initialCompleted, ...(JSON.parse(raw) as Record<string, boolean>) };
    } catch {
      return initialCompleted;
    }
  });

  const [playingId, setPlayingId] = useState<string | null>(null);
  const [progressTick, setProgressTick] = useState(0);
  const [certOpen, setCertOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(storageKey(role), JSON.stringify(completed));
  }, [role, completed]);

  useEffect(() => {
    const next = { ...completed };
    let changed = false;
    data.topics.forEach((t) => {
      const p = getTopicProgress(courseKey, t.id);
      if (p.completed && !next[t.id]) {
        next[t.id] = true;
        changed = true;
      }
    });
    if (changed) setCompleted(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, courseKey, data.topics]);

  const doneCount = data.topics.filter((t) => completed[t.id]).length;
  const progress = Math.round((doneCount / Math.max(data.topics.length, 1)) * 100);
  const allDone = doneCount === data.topics.length && data.topics.length > 0;

  const minWatchLabel = useMemo(() => {
    const secs = minWatchSecondsFromTopics(
      data.topics.map((t) => ({
        duration: t.duration,
        youtubeUrl: t.youtubeUrl,
      })),
    );
    return formatWatchDuration(secs);
  }, [data.topics, progressTick]);

  const toggleTopic = useCallback(
    (id: string) => {
      setCompleted((prev) => {
        const next = { ...prev, [id]: !prev[id] };
        setTopicCompleted(courseKey, id, !!next[id]);
        return next;
      });
    },
    [courseKey],
  );

  const onVideoProgress = useCallback(
    (topicId: string, ratio: number) => {
      recordWatchProgress(courseKey, topicId, ratio);
      setProgressTick((n) => n + 1);
      if (ratio >= 0.55) {
        setCompleted((prev) => {
          if (prev[topicId]) return prev;
          setTopicCompleted(courseKey, topicId, true);
          return { ...prev, [topicId]: true };
        });
      }
    },
    [courseKey],
  );

  const skillsFromTitle = useMemo(() => {
    const parts = data.title.replace(/Path|Developer|Engineer/gi, '').split(/[,&\/–-]/).map((s) => s.trim()).filter(Boolean);
    return parts.slice(0, 6);
  }, [data.title]);

  const listVariants = {
    hidden: {},
    show: { transition: { staggerChildren: reduceMotion ? 0 : 0.04 } },
  };
  const rowVariants = {
    hidden: reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="relative flex-1 overflow-x-hidden pb-16">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-violet-400/15 blur-3xl dark:bg-violet-600/20" />
        <div className="absolute -right-16 top-40 h-80 w-80 rounded-full bg-indigo-400/10 blur-3xl dark:bg-indigo-500/15" />
        {!reduceMotion && (
          <div className="roadmap-aurora absolute inset-x-0 top-0 h-48 opacity-40 dark:opacity-30" />
        )}
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:px-8">
        <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Link
            to="/roadmaps"
            className="inline-flex items-center gap-1.5 font-semibold transition hover:text-violet-600 dark:hover:text-violet-300"
          >
            <MapPin className="h-3.5 w-3.5 text-violet-500" />
            Roadmaps
          </Link>
          <span className="text-slate-300 dark:text-slate-600">›</span>
          <span className="font-semibold text-slate-700 dark:text-slate-200">{data.title}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
          <div>
            <motion.header
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                    {data.title}
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {data.description}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!allDone}
                  onClick={() => setCertOpen(true)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white ${
                    allDone ? 'bg-emerald-600 hover:bg-emerald-500' : 'cursor-not-allowed bg-slate-400 opacity-70'
                  }`}
                  title={allDone ? 'Download certificate' : 'Complete all topics to unlock'}
                >
                  <Download className="h-3.5 w-3.5" />
                  Certificate
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  {data.level}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  {data.totalHours}
                </span>
              </div>

              <div className="mt-5">
                <div className="mb-1 flex items-center justify-between text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <span>Progress</span>
                  <span className="text-violet-600 dark:text-violet-300">{progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                  Open a lesson and watch ~55%+ on EduRoute to auto-tick. Speed controls stay available.
                </p>
              </div>
            </motion.header>

            <motion.ul
              className="mt-8 space-y-2"
              variants={listVariants}
              initial="hidden"
              animate="show"
            >
              {data.topics.map((topic, index) => (
                <TopicRow
                  key={topic.id}
                  topic={topic}
                  index={index}
                  done={!!completed[topic.id]}
                  playing={playingId === topic.id}
                  watchPct={Math.round(getTopicProgress(courseKey, topic.id).watchedRatio * 100)}
                  onToggle={() => toggleTopic(topic.id)}
                  onPlay={() => setPlayingId(playingId === topic.id ? null : topic.id)}
                  onVideoProgress={(r) => onVideoProgress(topic.id, r)}
                  variants={rowVariants}
                />
              ))}
            </motion.ul>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/90"
            >
              <div className="mb-1 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                <h2 className="text-base font-black text-slate-900 dark:text-white">Resources</h2>
              </div>
              <p className="mb-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Watch lessons in-page for progress tracking.
              </p>

              <div className="space-y-3">
                {data.playlistUrl && (
                  <a
                    href={data.playlistUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3 transition hover:border-violet-200 hover:bg-violet-50 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-violet-500/40 dark:hover:bg-violet-950/30"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300">
                      <Play className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-slate-900 dark:text-white">Full playlist</span>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400">YouTube playlist</span>
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-violet-500" />
                  </a>
                )}

                <Link
                  to="/buddy"
                  className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3 transition hover:border-fuchsia-200 hover:bg-fuchsia-50 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-fuchsia-500/40 dark:hover:bg-fuchsia-950/30"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-500/20 dark:text-fuchsia-300">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-slate-900 dark:text-white">Ask Buddy AI</span>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400">Get help from your AI companion</span>
                  </span>
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="mt-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/90"
            >
              <h2 className="text-sm font-black text-slate-900 dark:text-white">Placed from this path</h2>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                Sample outcomes for inspiration · placement % uses your skill match.
              </p>
              <ul className="mt-3 space-y-3">
                {(PLACED_FROM_PATH[role] || PLACED_FROM_PATH.frontend).map((p) => (
                  <li
                    key={p.name + p.company}
                    className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/50"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-black text-violet-700 ring-2 ring-violet-200 dark:bg-violet-500/20 dark:text-violet-200 dark:ring-violet-500/30"
                        aria-hidden
                      >
                        {p.initials}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{p.name}</p>
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/80 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" /> Placed
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                          {p.role} @ {p.company}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                          Completed path · {p.months} months
                        </p>
                        <p className="mt-1.5 text-[11px] italic leading-snug text-slate-500 dark:text-slate-400">
                          “{p.quote}”
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </motion.div>
          </aside>
        </div>
      </div>

      <CourseCertificate
        open={certOpen}
        onClose={() => setCertOpen(false)}
        data={{
          studentName: user?.name || 'Student',
          courseName: data.title,
          skills: skillsFromTitle.length ? skillsFromTitle : [data.level],
          level: data.level.includes('Beginner')
            ? 'Beginner'
            : data.level.includes('Intermediate')
              ? 'Intermediate'
              : 'Advanced',
          durationLabel: `Min watch ${minWatchLabel}`,
          completionDate: formatCertDate(),
        }}
      />
    </div>
  );
};

function TopicRow({
  topic,
  index,
  done,
  playing,
  watchPct,
  onToggle,
  onPlay,
  onVideoProgress,
  variants,
}: {
  topic: RoadmapTopic;
  index: number;
  done: boolean;
  playing: boolean;
  watchPct: number;
  onToggle: () => void;
  onPlay: () => void;
  onVideoProgress: (ratio: number) => void;
  variants: { hidden: object; show: object };
}) {
  return (
    <motion.li
      variants={variants}
      className={`group flex flex-col gap-3 rounded-2xl border p-3 shadow-sm transition sm:px-4 sm:py-3 ${
        done
          ? 'border-emerald-300/80 bg-emerald-50/80 dark:border-emerald-500/30 dark:bg-emerald-950/20'
          : 'border-slate-200/90 bg-white/95 hover:border-violet-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-violet-500/40'
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <button
          type="button"
          onClick={onToggle}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black ${
            done
              ? 'bg-emerald-500 text-white'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
          }`}
          aria-label={done ? 'Mark incomplete' : 'Mark complete'}
        >
          {done ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
        </button>

        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-bold ${
              done ? 'text-slate-500 line-through dark:text-slate-400' : 'text-slate-900 dark:text-white'
            }`}
          >
            {topic.title}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {topic.duration}
            {watchPct > 0 && !done ? ` · ${watchPct}% watched` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onPlay}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-50 dark:border-rose-500/30 dark:bg-slate-950 dark:text-rose-400 dark:hover:bg-rose-950/40"
          >
            <Youtube className="h-3.5 w-3.5" />
            {playing ? 'Hide' : 'Watch'}
          </button>
          <a
            href={topic.documentUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-bold text-blue-600 transition hover:bg-blue-50 dark:border-blue-500/30 dark:bg-slate-950 dark:text-blue-400 dark:hover:bg-blue-950/40"
          >
            <FileText className="h-3.5 w-3.5" />
            Document
          </a>
        </div>
      </div>

      {playing && topic.youtubeUrl && (
        <YouTubeCoursePlayer
          youtubeUrl={topic.youtubeUrl}
          title={topic.title}
          onProgress={onVideoProgress}
        />
      )}
    </motion.li>
  );
}

export default RoadmapDetail;

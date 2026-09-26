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
  courseCompletionStats,
  formatCertDate,
  getTopicProgress,
  recordWatchProgress,
  setTopicCompleted,
} from '../../utils/courseProgressStore';

const storageKey = (role: string) => `eduroute-roadmap-topics-${role}`;

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
    // Sync progress-store completions into local completed map
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
  }, [role, progressTick, courseKey]);

  const doneCount = data.topics.filter((t) => completed[t.id]).length;
  const progress = Math.round((doneCount / Math.max(data.topics.length, 1)) * 100);
  const allDone = doneCount === data.topics.length && data.topics.length > 0;

  const toggleTopic = (id: string) => {
    setCompleted((prev) => {
      const next = !prev[id];
      setTopicCompleted(courseKey, id, next);
      return { ...prev, [id]: next };
    });
    setProgressTick((n) => n + 1);
  };

  const onVideoProgress = useCallback(
    (topicId: string, ratio: number) => {
      const { justCompleted } = recordWatchProgress(courseKey, topicId, ratio);
      if (justCompleted) {
        setCompleted((prev) => ({ ...prev, [topicId]: true }));
      }
      setProgressTick((n) => n + 1);
    },
    [courseKey],
  );

  const listVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: reduceMotion ? 0 : 0.045,
        delayChildren: reduceMotion ? 0 : 0.06,
      },
    },
  };

  const rowVariants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 10 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 380, damping: 28 },
    },
  };

  const skillsFromTitle = data.title
    .replace(/Path|Developer|Complete|Full Stack/gi, '')
    .split(/[&,]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 5);

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
              transition={{ duration: 0.4 }}
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
                    allDone
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'cursor-not-allowed bg-slate-400 opacity-70'
                  }`}
                  title={allDone ? 'Download certificate' : 'Complete all topics to unlock'}
                >
                  <Download className="h-3.5 w-3.5" />
                  Download certificate
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                  {data.topics.length} topics
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  ★ {data.level}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  ⏱ {data.totalHours}
                </span>
              </div>

              <div className="mt-6">
                <div className="mb-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <span>Progress</span>
                  <span className="tabular-nums text-violet-600 dark:text-violet-300">{progress}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-500"
                    initial={false}
                    animate={{ width: `${progress}%` }}
                    transition={{ type: 'spring', stiffness: 120, damping: 20 }}
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
          durationLabel: data.totalHours,
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
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-label={done ? `Mark ${topic.title} incomplete` : `Mark ${topic.title} complete`}
        >
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black transition ${
              done
                ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/30'
                : 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300'
            }`}
          >
            {done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
          </span>
          <span className="min-w-0">
            <span
              className={`block truncate text-sm font-bold sm:text-[15px] ${
                done ? 'text-slate-500 line-through dark:text-slate-400' : 'text-slate-900 dark:text-white'
              }`}
            >
              {topic.title}
            </span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">
              {topic.duration}
              {watchPct > 0 ? ` · watched ${watchPct}%` : ''}
            </span>
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-2 pl-12 sm:pl-0">
          <button
            type="button"
            onClick={onPlay}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50 dark:border-red-500/30 dark:bg-slate-950 dark:text-red-400 dark:hover:bg-red-950/40"
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

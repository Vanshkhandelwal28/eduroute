import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  Sparkles,
  Trash2,
  Youtube,
  Wand2,
  CheckCircle2,
  Pencil,
  Download,
  Award,
} from 'lucide-react';
import { StarfieldBackground } from '../../components/StarfieldBackground';
import { YouTubeCoursePlayer } from '../../components/YouTubeCoursePlayer';
import { CourseCertificate } from '../../components/CourseCertificate';
import { getAuthUser } from '../../utils/rbacAuth';
import { readOnboarding, writeOnboarding } from '../../utils/onboardingStore';
import { markPathNodeDone } from '../../utils/learningPathStore';
import {
  DURATION_PRESETS,
  INTEREST_PRESETS,
  deleteAiCourse,
  readAiCourses,
  saveAiCourse,
  updateCourseTopics,
  updateTopicVideoDuration,
  type AiDesignedCourse,
  type CourseTopic,
} from '../../utils/aiCourseStore';
import {
  formatWatchDuration,
  minWatchSecondsFromTopics,
} from '../../utils/youtubeDurations';
import {
  generateAiCourse,
  phaseLabel,
  type GeneratePhase,
} from '../../utils/aiCourseGenerator';
import {
  courseCompletionStats,
  getTopicProgress,
  levelFromDurationDays,
  recordWatchProgress,
  setTopicCompleted,
  formatCertDate,
} from '../../utils/courseProgressStore';

const FIELD_FROM_TRACK: Record<string, string> = {
  software: 'Software Engineering',
  cybersecurity: 'Cybersecurity',
  data_analyst: 'Data Analytics',
};

export function AiCourseDesigner() {
  const user = getAuthUser();
  const [searchParams] = useSearchParams();
  const [profile, setProfile] = useState(() => readOnboarding());
  const defaultField =
    profile.interests?.[0] && FIELD_FROM_TRACK[profile.interests[0]]
      ? FIELD_FROM_TRACK[profile.interests[0]]
      : 'Software Engineering';

  const [duration, setDuration] = useState<number>(15);
  const [customDays, setCustomDays] = useState('');
  const [useCustomDays, setUseCustomDays] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState('');
  const [field, setField] = useState(defaultField);
  const autoGenTried = useRef(false);
  const pathNodeId = searchParams.get('nodeId')?.trim() || '';
  const [phase, setPhase] = useState<GeneratePhase>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [courses, setCourses] = useState<AiDesignedCourse[]>(() => readAiCourses());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [playingTopicId, setPlayingTopicId] = useState<string | null>(null);
  const [progressTick, setProgressTick] = useState(0);
  const [certOpen, setCertOpen] = useState(false);

  const refresh = useCallback(() => {
    const list = readAiCourses();
    setCourses(list);
    if (activeId && !list.find((c) => c.id === activeId)) setActiveId(list[0]?.id || null);
  }, [activeId]);

  useEffect(() => {
    const onUp = () => refresh();
    window.addEventListener('eduroute:ai-courses-updated', onUp);
    return () => window.removeEventListener('eduroute:ai-courses-updated', onUp);
  }, [refresh]);

  useEffect(() => {
    const onProg = () => setProgressTick((n) => n + 1);
    window.addEventListener('eduroute:course-progress-updated', onProg);
    return () => window.removeEventListener('eduroute:course-progress-updated', onProg);
  }, []);

  const active = courses.find((c) => c.id === activeId) || courses[0] || null;
  const days = useCustomDays
    ? Math.min(365, Math.max(1, Number(customDays) || 1))
    : duration;

  const stats = useMemo(() => {
    if (!active) return { done: 0, total: 0, percent: 0, allDone: false };
    return courseCompletionStats(
      active.id,
      active.topics.map((t) => t.id),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, progressTick]);

  const minWatchLabel = useMemo(() => {
    if (!active) return '—';
    const sec = minWatchSecondsFromTopics(active.topics);
    if (sec > 0) return formatWatchDuration(sec);
    if (active.totalHours && active.totalHours > 0) return `${active.totalHours}h`;
    return '—';
  }, [active, progressTick]);

  const toggleInterest = (name: string) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name].slice(0, 8),
    );
  };

  const handleGenerate = async () => {
    setError('');
    const qInterest = searchParams.get('interest')?.trim() || '';
    const qTitle = searchParams.get('title')?.trim() || '';
    const interests = selected.length > 0 ? selected : qInterest ? [qInterest] : [];
    const custom = customInterest.trim() || qTitle || undefined;
    if (!interests.length && !custom) {
      setError('Select at least one area of interest (or enter a custom one).');
      return;
    }
    setBusy(true);
    setPhase('analysing_profile');
    try {
      const course = await generateAiCourse(
        {
          durationDays: days,
          interests,
          customInterest: custom,
          field: field.trim() || 'General',
          skillGaps: profile.missingSkills || [],
          userId: user?.email || user?.id || 'demo-student',
        },
        setPhase,
      );
      saveAiCourse(course);
      setActiveId(course.id);
      if (pathNodeId) {
        try {
          localStorage.setItem(`eduroute:course-path-node:${course.id}`, pathNodeId);
        } catch {
          /* ignore */
        }
      }
      refresh();
    } catch (e) {
      setPhase('error');
      setError(e instanceof Error ? e.message : 'Failed to design course');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const interest = searchParams.get('interest')?.trim() || '';
    const title = searchParams.get('title')?.trim() || '';
    const presetList = INTEREST_PRESETS as readonly string[];
    if (interest) {
      const match = presetList.find((p) => p.toLowerCase() === interest.toLowerCase());
      if (match) {
        setSelected([match]);
        setCustomInterest(title && title.toLowerCase() !== match.toLowerCase() ? title : '');
      } else {
        setSelected([]);
        setCustomInterest(title || interest);
      }
    } else if (title) {
      setCustomInterest(title);
    }
    setProfile(readOnboarding());
  }, [searchParams]);

  useEffect(() => {
    if (autoGenTried.current) return;
    if (searchParams.get('auto') !== '1') return;
    if (busy) return;
    const interest = searchParams.get('interest')?.trim();
    const title = searchParams.get('title')?.trim();
    if (!interest && !title && !selected.length && !customInterest.trim()) return;
    const timer = window.setTimeout(() => {
      if (autoGenTried.current) return;
      autoGenTried.current = true;
      void handleGenerate();
    }, 500);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, selected, customInterest, busy]);

  useEffect(() => {
    if (!active || !stats.allDone) return;
    const nodeKey =
      pathNodeId ||
      (typeof window !== 'undefined'
        ? localStorage.getItem(`eduroute:course-path-node:${active.id}`) || ''
        : '');
    if (nodeKey) markPathNodeDone(nodeKey);
    try {
      const onboard = readOnboarding();
      const courseSkills = [
        ...(active.interests || []),
        ...active.topics.flatMap((tp) => tp.skills || []),
      ].map((s) => s.toLowerCase());
      const remaining = (onboard.missingSkills || []).filter((gap) => {
        const g = gap.toLowerCase();
        return !courseSkills.some((cs) => cs.includes(g) || g.includes(cs));
      });
      if (remaining.length !== (onboard.missingSkills || []).length) {
        writeOnboarding({ ...onboard, missingSkills: remaining });
        setProfile({ ...onboard, missingSkills: remaining });
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats.allDone, active?.id]);

  const removeTopic = (courseId: string, topicId: string) => {
    const c = courses.find((x) => x.id === courseId);
    if (!c) return;
    const topics = c.topics.filter((t) => t.id !== topicId);
    updateCourseTopics(courseId, topics);
    refresh();
  };

  const updateTopicHours = (courseId: string, topicId: string, hours: number) => {
    const c = courses.find((x) => x.id === courseId);
    if (!c) return;
    const topics = c.topics.map((t) =>
      t.id === topicId ? { ...t, estimatedHours: Math.max(0.5, hours) } : t,
    );
    updateCourseTopics(courseId, topics);
    refresh();
  };

  const onVideoProgress = useCallback((courseId: string, topicId: string, ratio: number) => {
    recordWatchProgress(courseId, topicId, ratio);
  }, []);

  const selectCls =
    'rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-indigo-500/40';

  const studentName = user?.name || 'Student';
  const certLevel = active ? levelFromDurationDays(active.durationDays) : 'Beginner';
  const certSkills = active?.interests?.length
    ? active.interests
    : active?.topics.flatMap((t) => t.skills).filter(Boolean).slice(0, 6) || [];

  return (
    <div className="relative min-h-full overflow-hidden text-[var(--text-primary)]">
      <div className="pointer-events-none absolute inset-0 z-0 opacity-45 dark:opacity-70">
        <StarfieldBackground />
        <div className="absolute inset-0 bg-gradient-to-b from-violet-500/10 via-transparent to-[var(--bg-primary)]" />
      </div>

      <div className="relative z-10 space-y-6 p-4 sm:p-6 lg:p-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            SIH26134 · AI course designer
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">
            Design your mixed course
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
            Pick duration and interests. Watch lessons in-page — topics auto-tick at ~55% watched.
            Finish the course to unlock your certificate and advance your learning path.
          </p>
        </motion.div>

        <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 p-5 shadow-[var(--shadow-card)] backdrop-blur-sm"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/20 text-violet-400">
                <Wand2 className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold">Course inputs</h2>
                <p className="text-[11px] text-[var(--text-muted)]">Field from signup / onboarding · path auto-fill</p>
              </div>
            </div>

            <label className="block text-xs font-bold uppercase text-[var(--text-muted)]">
              Your field
              <input
                className={`${selectCls} mt-1 w-full`}
                value={field}
                onChange={(e) => setField(e.target.value)}
                placeholder="e.g. Software Engineering"
              />
            </label>

            <div>
              <p className="text-xs font-bold uppercase text-[var(--text-muted)]">Duration (days)</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {DURATION_PRESETS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setUseCustomDays(false);
                      setDuration(d);
                    }}
                    className={`rounded-xl px-3 py-2 text-xs font-black ${
                      !useCustomDays && duration === d
                        ? 'bg-indigo-600 text-white'
                        : 'border border-[var(--border-default)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {d}d
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setUseCustomDays(true)}
                  className={`rounded-xl px-3 py-2 text-xs font-black ${
                    useCustomDays
                      ? 'bg-violet-600 text-white'
                      : 'border border-[var(--border-default)] text-[var(--text-secondary)]'
                  }`}
                >
                  Custom
                </button>
              </div>
              {useCustomDays && (
                <input
                  type="number"
                  min={1}
                  max={365}
                  className={`${selectCls} mt-2 w-full`}
                  placeholder="e.g. 45"
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                />
              )}
            </div>

            <div>
              <p className="text-xs font-bold uppercase text-[var(--text-muted)]">Areas of interest</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {INTEREST_PRESETS.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleInterest(name)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      selected.includes(name)
                        ? 'bg-emerald-600 text-white'
                        : 'border border-[var(--border-default)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <label className="mt-3 block text-xs font-bold text-[var(--text-muted)]">
                Custom (your field)
                <input
                  className={`${selectCls} mt-1 w-full`}
                  placeholder="e.g. Embedded C, GIS, FinTech APIs"
                  value={customInterest}
                  onChange={(e) => setCustomInterest(e.target.value)}
                />
              </label>
            </div>

            {profile.missingSkills?.length > 0 && (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-800 dark:text-amber-200">
                Skill gaps from onboarding: {profile.missingSkills.slice(0, 6).join(', ')}
              </p>
            )}

            {error && (
              <p className="text-xs font-bold text-rose-600 dark:text-rose-400" role="alert">
                {error}
              </p>
            )}

            <button
              type="button"
              disabled={busy}
              onClick={handleGenerate}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-black text-white shadow-lg disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {busy ? 'AI designing…' : 'Generate AI course'}
            </button>

            <AnimatePresence>
              {busy && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4"
                >
                  <div className="flex items-center gap-2 text-sm font-bold text-violet-700 dark:text-violet-200">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {phaseLabel(phase)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {courses.length > 0 && (
              <div className="border-t border-[var(--border-default)] pt-3">
                <p className="mb-2 text-[10px] font-black uppercase text-[var(--text-muted)]">Saved courses</p>
                <ul className="max-h-40 space-y-1 overflow-y-auto">
                  {courses.map((c) => (
                    <li key={c.id} className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setActiveId(c.id)}
                        className={`min-w-0 flex-1 truncate rounded-lg px-2 py-1.5 text-left text-xs font-bold ${
                          active?.id === c.id
                            ? 'bg-indigo-600 text-white'
                            : 'hover:bg-[var(--bg-elevated)]'
                        }`}
                      >
                        {c.title}
                      </button>
                      <button
                        type="button"
                        title="Delete course"
                        onClick={() => {
                          deleteAiCourse(c.id);
                          refresh();
                        }}
                        className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.section>

          <section className="min-w-0">
            {!active ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--border-default)] bg-[var(--bg-card)]/50 p-8 text-center">
                <BookOpen className="mb-3 h-10 w-10 text-[var(--text-muted)]" />
                <p className="font-bold">No course yet</p>
                <p className="mt-1 max-w-sm text-sm text-[var(--text-muted)]">
                  Choose duration + interests and hit Generate. Watch videos here to auto-complete topics.
                </p>
              </div>
            ) : (
              <motion.div key={active.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 p-5 shadow-[var(--shadow-card)] backdrop-blur-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl font-black">{active.title}</h2>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">{active.summary}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold uppercase text-[var(--text-muted)]">
                        <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5">{active.durationDays} days</span>
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">
                          Min watch {minWatchLabel}
                        </span>
                        <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5">{active.topics.length} topics</span>
                        <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-indigo-700 dark:text-indigo-300">{certLevel}</span>
                        {stats.allDone && (
                          <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-white">Path step complete</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(editingId === active.id ? null : active.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] px-3 py-2 text-xs font-bold"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        {editingId === active.id ? 'Done editing' : 'Edit topics'}
                      </button>
                      <button
                        type="button"
                        disabled={!stats.allDone}
                        onClick={() => setCertOpen(true)}
                        title={stats.allDone ? 'Download your certificate' : `Complete all topics (${stats.done}/${stats.total}) to unlock`}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white ${
                          stats.allDone ? 'bg-emerald-600 hover:bg-emerald-500' : 'cursor-not-allowed bg-slate-400 opacity-70'
                        }`}
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download certificate
                      </button>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="mb-1 flex justify-between text-[10px] font-bold text-[var(--text-muted)]">
                      <span>Course progress</span>
                      <span>
                        {stats.done}/{stats.total} topics · {stats.percent}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all"
                        style={{ width: `${stats.percent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <ul className="space-y-3">
                  {active.topics.map((t, index) => (
                    <TopicCard
                      key={t.id}
                      topic={t}
                      index={index}
                      courseId={active.id}
                      editing={editingId === active.id}
                      playing={playingTopicId === t.id}
                      onPlay={() => setPlayingTopicId(playingTopicId === t.id ? null : t.id)}
                      onDelete={() => removeTopic(active.id, t.id)}
                      onHours={(h) => updateTopicHours(active.id, t.id, h)}
                      onVideoProgress={(ratio) => onVideoProgress(active.id, t.id, ratio)}
                      onToggleComplete={() => {
                        const cur = getTopicProgress(active.id, t.id);
                        setTopicCompleted(active.id, t.id, !cur.completed);
                      }}
                      progressTick={progressTick}
                    />
                  ))}
                </ul>
              </motion.div>
            )}
          </section>
        </div>
      </div>

      {active && (
        <CourseCertificate
          open={certOpen}
          onClose={() => setCertOpen(false)}
          data={{
            studentName,
            courseName: active.title,
            skills: certSkills,
            level: certLevel,
            durationLabel: `${active.durationDays} days · min watch ${minWatchLabel}`,
            completionDate: formatCertDate(),
          }}
        />
      )}
    </div>
  );
}

function TopicCard({
  topic,
  index,
  courseId,
  editing,
  playing,
  onPlay,
  onDelete,
  onHours,
  onVideoProgress,
  onToggleComplete,
  progressTick,
}: {
  topic: CourseTopic;
  index: number;
  courseId: string;
  editing: boolean;
  playing: boolean;
  onPlay: () => void;
  onDelete: () => void;
  onHours: (h: number) => void;
  onVideoProgress: (ratio: number) => void;
  onToggleComplete: () => void;
  progressTick: number;
}) {
  const prog = getTopicProgress(courseId, topic.id);
  void progressTick;
  return (
    <motion.li
      layout
      className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 p-4 shadow-sm backdrop-blur-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/15 text-[10px] font-black text-indigo-400">
              {index + 1}
            </span>
            <h3 className="font-bold text-[var(--text-primary)]">{topic.title}</h3>
            {prog.completed && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          </div>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{topic.description}</p>
          <p className="mt-1 text-[10px] text-[var(--text-muted)]">
            {topic.dayRange} · {topic.estimatedHours}h
            {prog.watchedRatio > 0 && ` · watched ${Math.round(prog.watchedRatio * 100)}%`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {editing && (
            <>
              <input
                type="number"
                min={0.5}
                step={0.5}
                className="w-16 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 py-1 text-xs"
                value={topic.estimatedHours}
                onChange={(e) => onHours(Number(e.target.value) || 1)}
              />
              <button type="button" onClick={onDelete} className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-500/10">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onToggleComplete}
            className="rounded-lg border border-[var(--border-default)] px-2 py-1 text-[10px] font-bold"
          >
            {prog.completed ? 'Undo' : 'Mark done'}
          </button>
          {topic.youtubeUrl && (
            <button
              type="button"
              onClick={onPlay}
              className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1.5 text-[10px] font-bold text-white"
            >
              <Youtube className="h-3.5 w-3.5" />
              {playing ? 'Hide' : 'Watch'}
            </button>
          )}
          {topic.docUrl && (
            <a
              href={topic.docUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-default)] px-2.5 py-1.5 text-[10px] font-bold"
            >
              <FileText className="h-3.5 w-3.5" />
              Docs
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
      {playing && topic.youtubeUrl && (
        <div className="mt-3 overflow-hidden rounded-xl">
          <YouTubeCoursePlayer
            url={topic.youtubeUrl}
            title={topic.youtubeTitle || topic.title}
            onProgress={(ratio) => onVideoProgress(ratio)}
          />
        </div>
      )}
    </motion.li>
  );
}

export default AiCourseDesigner;

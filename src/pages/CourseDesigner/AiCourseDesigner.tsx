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
import { CourseFinalAssessment } from '../../components/CourseFinalAssessment';
import { hasPassedAssessment } from '../../utils/courseAssessmentStore';
import { getCourseAchievement } from '../../utils/courseAchievementsStore';
import { quizConfigForDays } from '../../utils/courseQuizGenerator';
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
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<GeneratePhase | 'error' | null>(null);
  const [error, setError] = useState('');
  const [courses, setCourses] = useState(() => readAiCourses());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [playingTopicId, setPlayingTopicId] = useState<string | null>(null);
  const [progressTick, setProgressTick] = useState(0);
  const [certOpen, setCertOpen] = useState(false);
  const [assessOpen, setAssessOpen] = useState(false);
  const [assessTick, setAssessTick] = useState(0);

  const refresh = useCallback(() => setCourses(readAiCourses()), []);

  useEffect(() => {
    const onStorage = () => {
      refresh();
      setProgressTick((n) => n + 1);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [refresh]);

  useEffect(() => {
    const onProg = () => setProgressTick((n) => n + 1);
    window.addEventListener('eduroute:course-progress-updated', onProg);
    return () => window.removeEventListener('eduroute:course-progress-updated', onProg);
  }, []);

  useEffect(() => {
    const onAssess = () => setAssessTick((n) => n + 1);
    window.addEventListener('eduroute:course-assessment-updated', onAssess);
    window.addEventListener('eduroute:course-achievements-updated', onAssess);
    return () => {
      window.removeEventListener('eduroute:course-assessment-updated', onAssess);
      window.removeEventListener('eduroute:course-achievements-updated', onAssess);
    };
  }, []);

  const active = useMemo(
    () => courses.find((c) => c.id === activeId) || courses[0] || null,
    [courses, activeId],
  );

  useEffect(() => {
    if (!activeId && courses.length) setActiveId(courses[0].id);
  }, [courses, activeId]);

  const stats = useMemo(() => {
    if (!active) return { done: 0, total: 0, percent: 0 };
    return courseCompletionStats(
      active.id,
      active.topics.map((t) => t.id),
    );
  }, [active, progressTick]);

  const watchLabel = useMemo(() => {
    if (!active) return '—';
    if (active.totalHours && active.totalHours > 0) return `${active.totalHours}h`;
    return '—';
  }, [active, progressTick]);

  const canAssess = stats.total > 0 && stats.percent >= 95;
  const passedAssess = active ? hasPassedAssessment(active.id) : false;
  const achievement = useMemo(
    () => (active ? getCourseAchievement(active.id) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [active?.id, assessTick],
  );

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
      const urlSkills = (searchParams.get('skills') || '')
        .split(/[,|]/)
        .map((s) => s.trim())
        .filter(Boolean);
      const knownSkills = [
        ...urlSkills,
        ...(profile.customSkills || []),
        ...(profile.cvSkills || []),
      ].filter(Boolean);
      const role =
        searchParams.get('role')?.trim() ||
        profile.customRole?.trim() ||
        field.trim() ||
        'Engineer';
      const days = useCustomDays && customDays ? Number(customDays) || duration : duration;
      const pathNodeId = searchParams.get('pathNode') || '';
      const course = await generateAiCourse(
        {
          durationDays: days,
          interests,
          customInterest: custom,
          field: field.trim() || role || 'General',
          skillGaps: profile.missingSkills || [],
          userId: user?.email || user?.id || 'demo-student',
          role,
          knownSkills: Array.from(new Set(knownSkills)).slice(0, 20),
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

  const handleDelete = (id: string) => {
    if (!confirm('Delete this course?')) return;
    deleteAiCourse(id);
    if (activeId === id) setActiveId(null);
    refresh();
  };

  const studentName = user?.name || 'Student';
  const certLevel = active ? levelFromDurationDays(active.durationDays) : 'Beginner';
  const certSkills = active?.interests?.length
    ? active.interests
    : active?.topics?.slice(0, 5).map((t) => t.title) || [];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)]">
      <StarfieldBackground />
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-8">
        <header className="mb-8">
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight">
            <Wand2 className="h-6 w-6 text-violet-500" />
            AI Course Designer
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Personalized learning path with videos, docs, final assessment & certificate.
          </p>
        </header>

        <section className="mb-8 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)]/80 p-5 backdrop-blur">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--text-muted)]">Field / Track</label>
              <input
                value={field}
                onChange={(e) => setField(e.target.value)}
                className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm"
                placeholder="Software Engineering"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--text-muted)]">Duration</label>
              <div className="flex flex-wrap gap-2">
                {DURATION_PRESETS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setDuration(d);
                      setUseCustomDays(false);
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                      !useCustomDays && duration === d
                        ? 'bg-violet-600 text-white'
                        : 'border border-[var(--border-default)]'
                    }`}
                  >
                    {d}d
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setUseCustomDays(true)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                    useCustomDays ? 'bg-violet-600 text-white' : 'border border-[var(--border-default)]'
                  }`}
                >
                  Custom
                </button>
                {useCustomDays && (
                  <input
                    type="number"
                    min={3}
                    max={90}
                    value={customDays}
                    onChange={(e) => setCustomDays(e.target.value)}
                    className="w-20 rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-2 py-1 text-xs"
                  />
                )}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <label className="mb-1 block text-xs font-bold text-[var(--text-muted)]">Interests</label>
            <div className="flex flex-wrap gap-2">
              {INTEREST_PRESETS.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggleInterest(name)}
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    selected.includes(name)
                      ? 'bg-violet-600 text-white'
                      : 'border border-[var(--border-default)]'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
            <input
              value={customInterest}
              onChange={(e) => setCustomInterest(e.target.value)}
              placeholder="Or type a custom interest / course title…"
              className="mt-2 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm"
            />
          </div>
          {error && <p className="mt-3 text-sm font-bold text-rose-500">{error}</p>}
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleGenerate()}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-black text-white shadow-lg disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy ? phaseLabel(phase as GeneratePhase) || 'Designing…' : 'Design my course'}
          </button>
        </section>

        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Your courses</p>
            {courses.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveId(c.id)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-bold ${
                  active?.id === c.id
                    ? 'bg-violet-600/20 text-violet-600 dark:text-violet-300'
                    : 'hover:bg-[var(--bg-elevated)]'
                }`}
              >
                <span className="truncate">{c.title}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(c.id);
                  }}
                  className="rounded p-1 text-rose-500 hover:bg-rose-500/10"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </button>
            ))}
            {!courses.length && (
              <p className="text-xs text-[var(--text-muted)]">No courses yet — design one above.</p>
            )}
          </aside>

          <section>
            {active && (
              <motion.div
                key={active.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)]/80 p-5 backdrop-blur"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black">{active.title}</h2>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {active.durationDays} days · {watchLabel} · {active.topics.length} modules
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing((e) => !e)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] px-3 py-2 text-xs font-bold"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {editing ? 'Done' : 'Edit'}
                    </button>
                    <button
                      type="button"
                      disabled={!canAssess}
                      onClick={() => setAssessOpen(true)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white ${
                        canAssess ? 'bg-violet-600 hover:bg-violet-500' : 'cursor-not-allowed bg-slate-400 opacity-70'
                      }`}
                    >
                      <Award className="h-3.5 w-3.5" />
                      {passedAssess ? 'Retake assessment' : 'Final assessment'}
                    </button>
                    <button
                      type="button"
                      disabled={!passedAssess}
                      onClick={() => setCertOpen(true)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white ${
                        passedAssess ? 'bg-emerald-600 hover:bg-emerald-500' : 'cursor-not-allowed bg-slate-400 opacity-70'
                      }`}
                    >
                      <Download className="h-3.5 w-3.5" />
                      Certificate
                    </button>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-[10px] font-bold text-[var(--text-muted)]">
                    <span>Course progress</span>
                    <span>
                      {stats.done}/{stats.total} · {stats.percent}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-base)]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all"
                      style={{ width: `${stats.percent}%` }}
                    />
                  </div>
                  {stats.percent >= 95 && !passedAssess && (
                    <p className="mt-2 text-[11px] font-bold text-violet-600 dark:text-violet-300">
                      Ready for final assessment — pass at 60%+ to unlock certificate.
                    </p>
                  )}
                  {passedAssess && achievement && (
                    <p className="mt-2 text-[11px] font-bold text-emerald-600">
                      Assessment passed · {achievement.badge} badge · cert ready
                    </p>
                  )}
                </div>
                <ul className="mt-5 space-y-3">
                  {active.topics.map((topic, index) => (
                    <TopicCard
                      key={topic.id}
                      topic={topic}
                      index={index}
                      courseId={active.id}
                      editing={editing}
                      playing={playingTopicId === topic.id}
                      onPlay={() =>
                        setPlayingTopicId((id) => (id === topic.id ? null : topic.id))
                      }
                      onToggleComplete={() => {
                        const p = getTopicProgress(active.id, topic.id);
                        setTopicCompleted(active.id, topic.id, !p.completed);
                        setProgressTick((n) => n + 1);
                        const pathNode = localStorage.getItem(`eduroute:course-path-node:${active.id}`);
                        if (pathNode && !p.completed) {
                          try {
                            markPathNodeDone(pathNode);
                          } catch {
                            /* ignore */
                          }
                        }
                      }}
                      onHours={(h) => {
                        const next = active.topics.map((t) =>
                          t.id === topic.id ? { ...t, estimatedHours: h } : t,
                        );
                        updateCourseTopics(active.id, next);
                        refresh();
                      }}
                      onDelete={() => {
                        const next = active.topics.filter((t) => t.id !== topic.id);
                        updateCourseTopics(active.id, next);
                        refresh();
                      }}
                      onVideoProgress={(ratio) => {
                        recordWatchProgress(active.id, topic.id, ratio);
                        setProgressTick((n) => n + 1);
                      }}
                    />
                  ))}
                </ul>
              </motion.div>
            )}
          </section>
        </div>
      </div>

      {active && (
        <CourseFinalAssessment
          open={assessOpen}
          onClose={() => setAssessOpen(false)}
          course={active}
          userId={user?.email || user?.id || 'demo-student'}
          onPassed={() => {
            setAssessTick((n) => n + 1);
            setAssessOpen(false);
            setCertOpen(true);
          }}
        />
      )}

      {active && (
        <CourseCertificate
          open={certOpen}
          onClose={() => setCertOpen(false)}
          data={{
            studentName,
            courseName: active.title,
            skills: certSkills,
            level: certLevel,
            durationLabel: `${active.durationDays} days`,
            completionDate: achievement?.completedAt || formatCertDate(),
            certId: achievement?.certId,
            percent: achievement?.percent ?? 100,
            badge: achievement?.badge,
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
  onToggleComplete,
  onHours,
  onDelete,
  onVideoProgress,
}: {
  topic: CourseTopic;
  index: number;
  courseId: string;
  editing: boolean;
  playing: boolean;
  onPlay: () => void;
  onToggleComplete: () => void;
  onHours: (h: number) => void;
  onDelete: () => void;
  onVideoProgress: (ratio: number) => void;
}) {
  const prog = getTopicProgress(courseId, topic.id);
  return (
    <motion.li
      layout
      className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)]/60 p-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-violet-600/15 text-[10px] font-black text-violet-600">
              {index + 1}
            </span>
            <p className="truncate text-sm font-bold">{topic.title}</p>
            {prog.completed && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />}
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-[var(--text-muted)]">{topic.description}</p>
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

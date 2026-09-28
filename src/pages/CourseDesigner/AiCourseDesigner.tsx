import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Wand2,
  Loader2,
  Trash2,
  Play,
  CheckCircle2,
  Award,
  Download,
  Sparkles,
  BookOpen,
  GraduationCap,
  Layers,
  Target,
  Code2,
  FileText,
  BarChart3,
  Bookmark,
  Calendar,
  FolderKanban,
  MessageCircle,
} from 'lucide-react';
import { StarfieldBackground } from '../../components/StarfieldBackground';
import { YouTubeCoursePlayer } from '../../components/YouTubeCoursePlayer';
import { CourseCertificate } from '../../components/CourseCertificate';
import { CourseFinalAssessment } from '../../components/CourseFinalAssessment';
import { hasPassedAssessment } from '../../utils/courseAssessmentStore';
import { getCourseAchievement } from '../../utils/courseAchievementsStore';
import { getAuthUser } from '../../utils/rbacAuth';
import { readOnboarding } from '../../utils/onboardingStore';
import {
  DURATION_PRESETS,
  INTEREST_PRESETS,
  deleteAiCourse,
  readAiCourses,
  saveAiCourse,
  type AiDesignedCourse,
} from '../../utils/aiCourseStore';
import {
  generateAiCourse,
  phaseLabel,
  type GeneratePhase,
} from '../../utils/aiCourseGenerator';
import { computePlacementChance } from '../../utils/placementChance';
import { PlacementChanceStrip } from '../../components/PlacementChanceStrip';
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

const WHY_ITEMS = [
  {
    icon: GraduationCap,
    title: 'Personalized Learning Path',
    desc: 'Based on your goal, skill level & interest',
    color: 'from-violet-500/20 to-indigo-500/10 text-violet-400',
  },
  {
    icon: BookOpen,
    title: 'Curated Courses & Resources',
    desc: 'Best resources from top platforms',
    color: 'from-blue-500/20 to-cyan-500/10 text-blue-400',
  },
  {
    icon: Code2,
    title: 'Real Projects & Practice',
    desc: 'Build your portfolio with hands-on projects',
    color: 'from-fuchsia-500/20 to-pink-500/10 text-fuchsia-400',
  },
  {
    icon: BarChart3,
    title: 'Track Your Progress',
    desc: 'Stay on course with smart suggestions',
    color: 'from-indigo-500/20 to-violet-500/10 text-indigo-400',
  },
];

const TOPIC_COLORS = [
  'from-sky-500 to-blue-600',
  'from-violet-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-pink-500 to-rose-600',
  'from-cyan-500 to-blue-500',
];

export function AiCourseDesigner() {
  const user = getAuthUser();
  const reduceMotion = useReducedMotion();
  const [searchParams] = useSearchParams();
  const [profile] = useState(() => readOnboarding());
  const defaultField =
    profile.interests?.[0] && FIELD_FROM_TRACK[profile.interests[0]]
      ? FIELD_FROM_TRACK[profile.interests[0]]
      : 'Software Engineering';

  const [duration, setDuration] = useState(15);
  const [selected, setSelected] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState('');
  const [field, setField] = useState(defaultField);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<GeneratePhase | 'error' | null>(null);
  const [error, setError] = useState('');
  const [courses, setCourses] = useState<AiDesignedCourse[]>(() => readAiCourses());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [playingTopicId, setPlayingTopicId] = useState<string | null>(null);
  const [progressTick, setProgressTick] = useState(0);
  const [certOpen, setCertOpen] = useState(false);
  const [assessOpen, setAssessOpen] = useState(false);
  const [assessTick, setAssessTick] = useState(0);
  const autoStartedRef = useRef(false);
  const handleGenerateRef = useRef<() => void>(() => {});

  const refresh = useCallback(() => setCourses(readAiCourses()), []);

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

  useEffect(() => {
    const qInterest = searchParams.get('interest')?.trim() || '';
    const qTitle = searchParams.get('title')?.trim() || '';
    const qSkills = (searchParams.get('skills') || '')
      .split(/[,|]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const qDays = Number(searchParams.get('days') || 0);
    const qAuto = searchParams.get('auto') === '1';

    const interestSet: string[] = [];
    const push = (raw: string) => {
      const v = raw.trim();
      if (!v) return;
      const preset = INTEREST_PRESETS.find(
        (p) => p.toLowerCase() === v.toLowerCase() || v.toLowerCase().includes(p.toLowerCase()),
      );
      const label = preset || v;
      if (!interestSet.some((x) => x.toLowerCase() === label.toLowerCase())) interestSet.push(label);
    };
    qSkills.forEach(push);
    if (qInterest) push(qInterest);
    if (interestSet.length) setSelected(interestSet.slice(0, 8));
    if (qTitle) setCustomInterest(qTitle);
    if (qDays > 0) setDuration(Math.min(90, Math.max(3, qDays)));

    if (!qAuto || autoStartedRef.current) return;
    if (!qTitle && !qInterest && !interestSet.length) return;
    autoStartedRef.current = true;
    const timer = window.setTimeout(() => handleGenerateRef.current(), 80);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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

  const canAssess = stats.total > 0 && stats.percent >= 95;
  const passedAssess = active ? hasPassedAssessment(active.id) : false;
  const achievement = useMemo(
    () => (active ? getCourseAchievement(active.id) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [active?.id, assessTick],
  );

  const placement = useMemo(() => {
    if (!active) return null;
    return computePlacementChance({
      title: active.title,
      description: (active.interests || []).join(' '),
      category: 'Development',
    });
  }, [active]);

  const handleGenerate = async () => {
    setError('');
    const interests = selected.length ? selected : customInterest.trim() ? [customInterest.trim()] : [];
    const custom = customInterest.trim() || undefined;
    if (!interests.length && !custom) {
      setError('Select at least one area of interest (or enter a custom one).');
      return;
    }
    setBusy(true);
    setPhase('analysing_profile');
    try {
      const course = await generateAiCourse(
        {
          durationDays: duration,
          interests,
          customInterest: custom,
          field: field.trim() || 'General',
          skillGaps: profile.missingSkills || [],
          userId: user?.email || user?.id || 'demo-student',
          role: field.trim() || 'Engineer',
          knownSkills: Array.from(new Set([...interests, ...(profile.customSkills || [])])).slice(0, 20),
        },
        setPhase,
      );
      saveAiCourse(course);
      setActiveId(course.id);
      refresh();
    } catch (e) {
      setPhase('error');
      setError(e instanceof Error ? e.message : 'Failed to design course');
    } finally {
      setBusy(false);
    }
  };
  handleGenerateRef.current = () => {
    void handleGenerate();
  };

  const studentName = user?.name || 'Student';
  const certLevel = active ? levelFromDurationDays(active.durationDays) : 'Beginner';
  const certSkills = active?.interests?.length
    ? active.interests
    : active?.topics?.slice(0, 5).map((t) => t.title) || [];

  const weeksApprox = Math.max(1, Math.round(duration / 7));

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <StarfieldBackground />

      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-violet-500/15 blur-3xl dark:bg-violet-600/20" />
        <div className="absolute right-0 top-40 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-500/15" />
        <div className="absolute bottom-20 left-1/3 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="min-w-0 space-y-6">
            <motion.section
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-indigo-950/80 to-violet-950/70 p-6 shadow-[0_20px_60px_rgba(79,70,229,0.18)] backdrop-blur-xl dark:from-slate-950/90 dark:via-indigo-950/70 dark:to-violet-950/60 sm:p-8"
            >
              <div className="pointer-events-none absolute -right-6 top-4 h-40 w-40 rounded-full bg-violet-500/20 blur-3xl" />
              <div className="pointer-events-none absolute bottom-0 left-1/2 h-24 w-48 -translate-x-1/2 rounded-full bg-cyan-500/10 blur-2xl" />

              <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-xl">
                  <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-violet-200">
                    <Sparkles className="h-3.5 w-3.5" />
                    AI Powered
                  </span>
                  <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                    AI{' '}
                    <span className="bg-gradient-to-r from-cyan-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                      Course Designer
                    </span>
                  </h1>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300 sm:text-base">
                    Tell us your goal, and let AI create a personalized learning path with the right
                    courses, topics and projects.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {['Personalized', 'AI Powered', 'Step by Step'].map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-200"
                      >
                        <Sparkles className="h-3 w-3 text-violet-300" />
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {!reduceMotion && (
                  <div className="relative mx-auto hidden h-36 w-52 shrink-0 sm:block lg:mx-0">
                    <motion.div
                      className="absolute left-2 top-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-br from-violet-500/40 to-indigo-600/30 shadow-lg backdrop-blur-md"
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <BookOpen className="h-7 w-7 text-white/90" />
                    </motion.div>
                    <motion.div
                      className="absolute right-0 top-0 flex h-20 w-24 items-center justify-center rounded-2xl border border-white/25 bg-gradient-to-br from-cyan-500/30 to-blue-600/40 shadow-xl backdrop-blur-md"
                      animate={{ y: [0, 6, 0] }}
                      transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
                    >
                      <FileText className="h-8 w-8 text-white/90" />
                    </motion.div>
                    <motion.div
                      className="absolute bottom-2 left-10 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-br from-fuchsia-500/35 to-pink-600/30 shadow-lg backdrop-blur-md"
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
                    >
                      <Code2 className="h-6 w-6 text-white/90" />
                    </motion.div>
                    <div className="absolute inset-x-4 bottom-0 h-8 rounded-full bg-violet-500/20 blur-xl" />
                  </div>
                )}
              </div>
            </motion.section>

            <motion.section
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.06 }}
              className="rounded-3xl border border-white/10 bg-white/60 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/8 dark:bg-slate-900/55 dark:shadow-[0_12px_40px_rgba(0,0,0,0.35)] sm:p-6"
            >
              <div className="mb-5 flex flex-wrap items-center gap-2 text-xs font-bold sm:gap-3">
                {[
                  { n: 1, label: 'Describe your goal' },
                  { n: 2, label: 'Choose preferences' },
                  { n: 3, label: 'Get your roadmap' },
                ].map((s, i) => (
                  <div key={s.n} className="flex items-center gap-2">
                    {i > 0 && <span className="hidden text-slate-400 sm:inline">›</span>}
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
                        s.n === 1
                          ? 'bg-violet-600 text-white shadow-md shadow-violet-500/30'
                          : 'border border-slate-300 bg-white text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {s.n}
                    </span>
                    <span
                      className={
                        s.n === 1
                          ? 'text-violet-700 dark:text-violet-300'
                          : 'text-slate-500 dark:text-slate-400'
                      }
                    >
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="relative mb-4">
                <Sparkles className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-400" />
                <input
                  value={customInterest}
                  onChange={(e) => setCustomInterest(e.target.value)}
                  placeholder="e.g. I want to become a full stack developer, learn MERN stack, build real projects, and get a job…"
                  className="w-full rounded-2xl border border-slate-200/80 bg-white/80 py-3.5 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/15 dark:border-slate-700 dark:bg-slate-950/50 dark:text-white dark:focus:border-violet-500"
                />
              </div>

              <div className="mb-3">
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Interests
                </label>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_PRESETS.map((i) => {
                    const on = selected.includes(i);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() =>
                          setSelected((prev) =>
                            on ? prev.filter((x) => x !== i) : [...prev, i].slice(0, 8),
                          )
                        }
                        className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                          on
                            ? 'bg-violet-600 text-white shadow-md shadow-violet-500/25'
                            : 'border border-slate-200 bg-white/70 text-slate-600 hover:border-violet-300 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-violet-500/50'
                        }`}
                      >
                        {i}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mb-4">
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Duration · ~{weeksApprox} weeks ({duration} days)
                </label>
                <div className="flex flex-wrap gap-2">
                  {DURATION_PRESETS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration(d)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                        duration === d
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                          : 'border border-slate-200 bg-white/70 text-slate-600 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300'
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="mb-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm font-bold text-rose-600 dark:text-rose-300">
                  {error}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleGenerate()}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-fuchsia-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-violet-500/30 transition hover:shadow-xl hover:shadow-violet-500/40 disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {busy ? phaseLabel(phase as GeneratePhase) || 'Designing…' : 'Generate Course'}
                  {!busy && <span className="opacity-80">→</span>}
                </button>
                {busy && (
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Building your path…
                  </span>
                )}
              </div>
            </motion.section>

            {active && (
              <motion.section
                key={active.id}
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="rounded-3xl border border-white/10 bg-white/60 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/8 dark:bg-slate-900/55 sm:p-6"
              >
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/15 text-violet-500">
                        <Sparkles className="h-4 w-4" />
                      </span>
                      <h2 className="text-lg font-black text-slate-900 dark:text-white">
                        Your AI Generated Learning Path
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Personalized roadmap based on your goal and preferences
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">{active.title}</p>
                    {placement && (
                      <div className="mt-2">
                        <PlacementChanceStrip result={placement} />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!canAssess}
                      onClick={() => setAssessOpen(true)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white transition ${
                        canAssess
                          ? 'bg-violet-600 hover:bg-violet-500 shadow-md shadow-violet-500/25'
                          : 'cursor-not-allowed bg-slate-400 opacity-70'
                      }`}
                    >
                      <Award className="h-3.5 w-3.5" />
                      {passedAssess ? 'Retake assessment' : 'Final assessment'}
                    </button>
                    <button
                      type="button"
                      disabled={!passedAssess}
                      onClick={() => setCertOpen(true)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white transition ${
                        passedAssess
                          ? 'bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-500/25'
                          : 'cursor-not-allowed bg-slate-400 opacity-70'
                      }`}
                    >
                      <Download className="h-3.5 w-3.5" />
                      Certificate
                    </button>
                  </div>
                </div>

                <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    {
                      icon: Calendar,
                      label: 'Total Duration',
                      value: `${active.durationDays} days`,
                      sub: `~${Math.max(1, Math.round(active.durationDays / 7))} weeks`,
                    },
                    {
                      icon: Layers,
                      label: 'Total Modules',
                      value: `${active.topics.length} modules`,
                      sub: 'structured path',
                    },
                    {
                      icon: FolderKanban,
                      label: 'Projects',
                      value: `${Math.max(1, Math.ceil(active.topics.length / 3))} projects`,
                      sub: 'hands-on',
                    },
                    {
                      icon: Target,
                      label: 'Progress',
                      value: `${stats.percent}%`,
                      sub: `${stats.done}/${stats.total} done`,
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="rounded-2xl border border-slate-200/70 bg-white/70 p-3 dark:border-slate-700/80 dark:bg-slate-950/40"
                    >
                      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        <s.icon className="h-3.5 w-3.5 text-violet-500" />
                        {s.label}
                      </div>
                      <p className="text-sm font-black text-slate-900 dark:text-white">{s.value}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">{s.sub}</p>
                    </div>
                  ))}
                </div>

                <div className="mb-4">
                  <div className="mb-1 flex justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    <span>Course progress</span>
                    <span>
                      {stats.done}/{stats.total} · {stats.percent}%
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-400 transition-all duration-500"
                      style={{ width: `${stats.percent}%` }}
                    />
                  </div>
                </div>

                <ul className="space-y-3">
                  {active.topics.map((topic, index) => {
                    const p = getTopicProgress(active.id, topic.id);
                    const done = p.completed;
                    const color = TOPIC_COLORS[index % TOPIC_COLORS.length];
                    return (
                      <li
                        key={topic.id}
                        className={`group rounded-2xl border p-3.5 transition hover:shadow-md ${
                          done
                            ? 'border-emerald-300/50 bg-emerald-50/60 dark:border-emerald-500/25 dark:bg-emerald-950/25'
                            : 'border-slate-200/80 bg-white/50 hover:border-violet-300/50 dark:border-slate-700/80 dark:bg-slate-950/30 dark:hover:border-violet-500/30'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-sm font-black text-white shadow-md`}
                          >
                            {done ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-sm font-bold text-slate-900 dark:text-white ${
                                done ? 'line-through opacity-70' : ''
                              }`}
                            >
                              {topic.title}
                            </p>
                            {(topic.docTitle || topic.description) && (
                              <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500 dark:text-slate-400">
                                {topic.docTitle || topic.description}
                              </p>
                            )}
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-1.5">
                            {topic.youtubeUrl && (
                              <button
                                type="button"
                                onClick={() =>
                                  setPlayingTopicId(playingTopicId === topic.id ? null : topic.id)
                                }
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-700 transition hover:border-violet-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                              >
                                <Play className="h-3 w-3" /> Watch
                              </button>
                            )}
                            {topic.docUrl && (
                              <a
                                href={topic.docUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={topic.docTitle || 'Open documentation'}
                                className="inline-flex items-center gap-1 rounded-lg border border-indigo-200/80 bg-indigo-50 px-2.5 py-1.5 text-[10px] font-bold text-indigo-700 transition hover:border-indigo-400 hover:bg-indigo-100 dark:border-indigo-500/40 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-950/70"
                              >
                                <FileText className="h-3 w-3" /> Docs
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setTopicCompleted(active.id, topic.id, !done);
                                setProgressTick((n) => n + 1);
                              }}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-700 transition hover:border-emerald-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                            >
                              {done ? 'Undo' : 'Mark done'}
                            </button>
                          </div>
                        </div>
                        {playingTopicId === topic.id && topic.youtubeUrl && (
                          <div className="mt-3 overflow-hidden rounded-xl">
                            <YouTubeCoursePlayer
                              youtubeUrl={topic.youtubeUrl}
                              title={topic.title}
                              onProgress={(ratio) => {
                                recordWatchProgress(active.id, topic.id, ratio);
                                setProgressTick((n) => n + 1);
                                if (ratio >= 0.55) {
                                  setTopicCompleted(active.id, topic.id, true);
                                }
                              }}
                            />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </motion.section>
            )}

            {courses.length > 0 && (
              <section className="rounded-2xl border border-white/10 bg-white/50 p-4 backdrop-blur dark:border-white/8 dark:bg-slate-900/40 lg:hidden">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <Bookmark className="h-3.5 w-3.5" /> Saved paths
                </p>
                <div className="flex flex-wrap gap-2">
                  {courses.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setActiveId(c.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                        active?.id === c.id
                          ? 'bg-violet-600 text-white'
                          : 'border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {c.title.slice(0, 28)}
                      {c.title.length > 28 ? '…' : ''}
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.08 }}
              className="rounded-3xl border border-white/10 bg-white/60 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/8 dark:bg-slate-900/55"
            >
              <h3 className="mb-4 text-sm font-black text-slate-900 dark:text-white">
                Why Use AI Course Designer?
              </h3>
              <ul className="space-y-3.5">
                {WHY_ITEMS.map((item) => (
                  <li key={item.title} className="flex gap-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${item.color}`}
                    >
                      <item.icon className="h-[18px] w-[18px]" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</p>
                      <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                        {item.desc}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.12 }}
              className="relative overflow-hidden rounded-3xl border border-violet-400/20 bg-gradient-to-br from-indigo-600/90 via-violet-600/85 to-fuchsia-600/80 p-5 text-white shadow-lg shadow-violet-500/25"
            >
              <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
              <div className="mb-2 flex items-center gap-2">
                <Target className="h-5 w-5" />
                <h3 className="text-sm font-black">Not sure what to learn?</h3>
              </div>
              <p className="mb-3 text-xs leading-relaxed text-white/85">
                Let AI suggest the best path for you — pick interests and hit Generate.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleGenerate()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-black text-violet-700 shadow-md transition hover:bg-violet-50 disabled:opacity-60"
              >
                Try AI Again →
              </button>
            </motion.div>

            <div className="hidden rounded-3xl border border-white/10 bg-white/60 p-4 backdrop-blur-xl dark:border-white/8 dark:bg-slate-900/55 lg:block">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <Bookmark className="h-3.5 w-3.5" /> Saved paths
              </p>
              <div className="max-h-48 space-y-1.5 overflow-y-auto">
                {courses.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveId(c.id)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-bold transition ${
                      active?.id === c.id
                        ? 'bg-violet-600/15 text-violet-700 dark:text-violet-300'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="truncate">{c.title}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!confirm('Delete this course?')) return;
                        deleteAiCourse(c.id);
                        if (activeId === c.id) setActiveId(null);
                        refresh();
                      }}
                      className="ml-2 text-rose-500 opacity-70 hover:opacity-100"
                    >
                      <Trash2 className="h-3 w-3" />
                    </span>
                  </button>
                ))}
                {!courses.length && (
                  <p className="text-xs text-slate-500">No courses yet — design one above.</p>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/60 p-4 backdrop-blur-xl dark:border-white/8 dark:bg-slate-900/55">
              <div className="mb-2 flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-violet-500" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Need Help?</h3>
              </div>
              <p className="mb-3 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                Ask Buddy anything about courses, roadmaps, or your learning journey from the AI Buddy
                page.
              </p>
              <a
                href="/buddy"
                className="inline-flex items-center gap-1.5 rounded-xl border border-violet-300/50 bg-violet-500/10 px-3 py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-500/20 dark:text-violet-300"
              >
                <Wand2 className="h-3.5 w-3.5" /> Open AI Buddy
              </a>
            </div>
          </aside>
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

export default AiCourseDesigner;

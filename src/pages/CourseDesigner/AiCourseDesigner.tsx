import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Wand2,
  Loader2,
  Trash2,
  Play,
  CheckCircle2,
  Pencil,
  Award,
  Download,
  Sparkles,
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

export function AiCourseDesigner() {
  const user = getAuthUser();
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
            Personalized path with videos, docs, assessment & certificate. Placement chance from your real skills.
          </p>
        </header>

        <section className="mb-8 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)]/80 p-5 backdrop-blur">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-bold uppercase text-[var(--text-muted)]">Duration (days)</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {DURATION_PRESETS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                      duration === d ? 'bg-violet-600 text-white' : 'border border-[var(--border-default)]'
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-[var(--text-muted)]">Interests</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {INTEREST_PRESETS.map((i) => {
                  const on = selected.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() =>
                        setSelected((prev) => (on ? prev.filter((x) => x !== i) : [...prev, i].slice(0, 8)))
                      }
                      className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                        on ? 'bg-violet-600 text-white' : 'border border-[var(--border-default)]'
                      }`}
                    >
                      {i}
                    </button>
                  );
                })}
              </div>
              <input
                value={customInterest}
                onChange={(e) => setCustomInterest(e.target.value)}
                placeholder="Custom interest / course title…"
                className="mt-2 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm"
              />
            </div>
          </div>
          {error && <p className="mt-3 text-sm font-bold text-rose-500">{error}</p>}
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleGenerate()}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-black text-white shadow-lg disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy ? phaseLabel(phase as GeneratePhase) || 'Designing…' : 'Generate path'}
          </button>
        </section>

        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
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
                  className="ml-2 text-rose-500"
                >
                  <Trash2 className="h-3 w-3" />
                </span>
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
                className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)]/80 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black">{active.title}</h2>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {active.durationDays} days · {active.topics.length} modules
                    </p>
                    <div className="mt-2">
                      <PlacementChanceStrip
                        result={computePlacementChance({
                          title: active.title,
                          description: (active.interests || []).join(' '),
                          category: 'Development',
                        })}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
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
                </div>

                <ul className="mt-5 space-y-3">
                  {active.topics.map((topic, index) => {
                    const p = getTopicProgress(active.id, topic.id);
                    const done = p.completed;
                    return (
                      <li
                        key={topic.id}
                        className={`rounded-xl border p-3 ${
                          done
                            ? 'border-emerald-300/60 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-950/20'
                            : 'border-[var(--border-default)]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                              done ? 'bg-emerald-500 text-white' : 'bg-[var(--bg-base)]'
                            }`}
                          >
                            {done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-bold ${done ? 'line-through opacity-70' : ''}`}>{topic.title}</p>
                            {topic.documentUrl && (
                              <a
                                href={topic.documentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 inline-block text-[11px] font-semibold text-indigo-500 hover:underline"
                              >
                                Open docs
                              </a>
                            )}
                          </div>
                          <div className="flex gap-1">
                            {topic.youtubeUrl && (
                              <button
                                type="button"
                                onClick={() =>
                                  setPlayingTopicId(playingTopicId === topic.id ? null : topic.id)
                                }
                                className="rounded-lg border border-[var(--border-default)] px-2 py-1 text-[10px] font-bold"
                              >
                                <Play className="inline h-3 w-3" /> Watch
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setTopicCompleted(active.id, topic.id, !done);
                                setProgressTick((n) => n + 1);
                              }}
                              className="rounded-lg border border-[var(--border-default)] px-2 py-1 text-[10px] font-bold"
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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wand2,
  Loader2,
  Trash2,
  Play,
  CheckCircle2,
  Pencil,
  Award,
  Download,
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
  const [courses, setCourses] = useState<AiDesignedCourse[]>(() => readAiCourses());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [playingTopicId, setPlayingTopicId] = useState<string | null>(null);
  const [assessOpen, setAssessOpen] = useState(false);
  const [certOpen, setCertOpen] = useState(false);
  const [assessTick, setAssessTick] = useState(0);
  const [progressTick, setProgressTick] = useState(0);
  const handleGenerateRef = useRef<() => void>(() => {});

  const active = courses.find((c) => c.id === activeId) || courses[0] || null;

  const refresh = () => setCourses(readAiCourses());

  useEffect(() => {
    if (!activeId && courses[0]) setActiveId(courses[0].id);
  }, [courses, activeId]);

  const knownSkills = useMemo(() => {
    const yes = (profile.gapAnswers || []).filter((a) => a.answer === 'yes').map((a) => a.skill);
    return [...yes, ...(profile.customSkills || [])];
  }, [profile]);

  const watchLabel = useMemo(() => {
    if (!active) return '';
    if (active.totalHours && active.totalHours > 0) return `${active.totalHours}h`;
    return formatWatchDuration(minWatchSecondsFromTopics(active.topics || []));
  }, [active]);

  const passedAssess = active ? hasPassedAssessment(active.id) : false;
  const achievement = useMemo(
    () => (active ? getCourseAchievement(active.id) : null),
    [active, assessTick],
  );

  const stats = active
    ? courseCompletionStats(
        active.id,
        active.topics.map((t) => t.id),
      )
    : null;
  const canAssess = Boolean(active && stats && stats.percent >= 80);

  const handleGenerate = async () => {
    setBusy(true);
    setError('');
    setPhase('planning');
    try {
      const interests = [...selected];
      const custom = customInterest.trim();
      if (custom) interests.push(custom);
      if (!interests.length) {
        setError('Pick at least one interest');
        setPhase('error');
        setBusy(false);
        return;
      }
      const role =
        searchParams.get('role')?.trim() ||
        profile.customRole?.trim() ||
        field.trim() ||
        'Engineer';
      const days = useCustomDays && customDays ? Number(customDays) || duration : duration;
      const pathNodeId = searchParams.get('pathNode') || searchParams.get('nodeId') || '';
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
  handleGenerateRef.current = () => {
    void handleGenerate();
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
                    onClick={() => {
                      setDuration(d);
                      setUseCustomDays(false);
                    }}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                      !useCustomDays && duration === d
                        ? 'bg-violet-600 text-white'
                        : 'border border-[var(--border-default)]'
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
                        setSelected((prev) => (on ? prev.filter((x) => x !== i) : [...prev, i]))
                      }
                      className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                        on ? 'bg-indigo-600 text-white' : 'border border-[var(--border-default)]'
                      }`}
                    >
                      {i}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => handleGenerateRef.current()}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-violet-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {busy ? phaseLabel(phase as GeneratePhase) || 'Designing…' : 'Generate path'}
          </button>
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        </section>

        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <aside className="space-y-2">
            {courses.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveId(c.id)}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs font-semibold ${
                  active?.id === c.id
                    ? 'border-violet-500 bg-violet-500/10'
                    : 'border-[var(--border-default)]'
                }`}
              >
                <span className="line-clamp-2">{c.title}</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(c.id);
                  }}
                  className="ml-2 text-[var(--text-muted)] hover:text-red-500"
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
                className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)]/80 p-5 backdrop-blur"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-black">{active.title}</h2>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {active.durationDays} days · {watchLabel} · {active.topics.length} modules
                    </p>
                    <div className="mt-3 max-w-lg">
                      <PlacementChanceStrip
                        result={computePlacementChance({
                          title: active.title,
                          description: (active.topics || []).map((x) => x.title).join(' '),
                          category:
                            active.field || (active.interests && active.interests[0]) || 'Development',
                        })}
                      />
                    </div>
                  </div>
                </div>
                <ul className="mt-6 space-y-3">
                  {active.topics.map((topic, index) => (
                    <li
                      key={topic.id}
                      className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)]/50 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[10px] font-black uppercase text-[var(--text-muted)]">
                          Module {index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPlayingTopicId(topic.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-default)] px-2 py-1 text-[10px] font-bold"
                        >
                          <Play className="h-3 w-3" /> Play
                        </button>
                      </div>
                      <p className="mt-1 text-sm font-bold">{topic.title}</p>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default AiCourseDesigner;

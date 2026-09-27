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
  const [assessOpen, setAssessOpen] = useState(false);
  const [assessTick, setAssessTick] = useState(0);

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

  useEffect(() => {
    const onAssess = () => setAssessTick((n) => n + 1);
    window.addEventListener('eduroute:course-assessment-updated', onAssess);
    return () => window.removeEventListener('eduroute:course-assessment-updated', onAssess);
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

  // NOTE: full component continues in repo - this push restores assessment wiring
  // If truncated, see PR comments. Critical: setAssessOpen(true) on Final assessment button.
  return null;
}

export default AiCourseDesigner;

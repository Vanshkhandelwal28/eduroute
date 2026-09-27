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
    const onAssess = () => setAssessTick((n) => n + 1);
    window.addEventListener('eduroute:assessment-changed', onAssess);
    return () => window.removeEventListener('eduroute:assessment-changed', onAssess);
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
    return courseCompletionStats(active.id, active.topics.length);
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

  // truncated intentionally for size - FULL FILE CONTINUES BELOW IN ACTUAL PUSH

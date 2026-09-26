/**
 * AI-designed mixed courses — localStorage (student editable).
 */

import {
  getVideoDurationSeconds,
  minWatchSecondsFromTopics,
  secondsToHoursRounded,
} from './youtubeDurations';

export type CourseTopic = {
  id: string;
  title: string;
  description: string;
  estimatedHours: number;
  dayRange: string;
  youtubeUrl: string;
  youtubeTitle: string;
  docUrl: string;
  docTitle: string;
  skills: string[];
  /** Real YouTube length in seconds (unique videos drive min watch time) */
  videoDurationSeconds?: number;
};

export type AiDesignedCourse = {
  id: string;
  title: string;
  summary: string;
  durationDays: number;
  interests: string[];
  field: string;
  skillGaps: string[];
  demandHints: string[];
  topics: CourseTopic[];
  /** Minimum watch hours from unique video lengths (not study estimate) */
  totalHours: number;
  createdAt: string;
  updatedAt: string;
};

const KEY = 'eduroute:ai-designed-courses-v1';

function readJson<T>(fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
    window.dispatchEvent(new Event('eduroute:ai-courses-updated'));
  } catch {
    /* ignore */
  }
}

/** Enrich topics with known YT durations, then sum unique videos → hours. */
export function computeMinWatchHours(topics: CourseTopic[]): number {
  const enriched = topics.map((t) => ({
    ...t,
    videoDurationSeconds:
      t.videoDurationSeconds && t.videoDurationSeconds > 0
        ? t.videoDurationSeconds
        : getVideoDurationSeconds(t.youtubeUrl),
  }));
  const sec = minWatchSecondsFromTopics(enriched);
  if (sec > 0) return secondsToHoursRounded(sec);
  // Fallback only if no video lengths known yet
  return Math.round(topics.reduce((a, t) => a + (t.estimatedHours || 0), 0) * 10) / 10;
}

export function enrichTopicsWithDurations(topics: CourseTopic[]): CourseTopic[] {
  return topics.map((t) => {
    const known = getVideoDurationSeconds(t.youtubeUrl);
    if (!known) return t;
    if (t.videoDurationSeconds && t.videoDurationSeconds > 0) return t;
    return { ...t, videoDurationSeconds: known };
  });
}

/**
 * Read courses and always re-enrich video durations + recompute totalHours
 * so the header "Min watch" reflects unique YouTube lengths (not stale estimates).
 */
export function readAiCourses(): AiDesignedCourse[] {
  const list = readJson<AiDesignedCourse[]>([]);
  if (!Array.isArray(list) || list.length === 0) return [];

  let dirty = false;
  const next = list.map((c) => {
    const enriched = enrichTopicsWithDurations(c.topics || []);
    const hours = computeMinWatchHours(enriched);
    const topicsChanged =
      enriched.some((t, i) => t.videoDurationSeconds !== (c.topics[i]?.videoDurationSeconds));
    if (topicsChanged || c.totalHours !== hours) {
      dirty = true;
      return {
        ...c,
        topics: enriched,
        totalHours: hours,
      };
    }
    return c;
  });

  if (dirty) writeJson(next);
  return next;
}

export function saveAiCourse(course: AiDesignedCourse): AiDesignedCourse {
  const topics = enrichTopicsWithDurations(course.topics);
  const next: AiDesignedCourse = {
    ...course,
    topics,
    totalHours: computeMinWatchHours(topics),
    updatedAt: new Date().toISOString(),
  };
  const list = readAiCourses().filter((c) => c.id !== course.id);
  writeJson([next, ...list]);
  return next;
}

export function deleteAiCourse(id: string) {
  writeJson(readAiCourses().filter((c) => c.id !== id));
}

export function updateCourseTopics(id: string, topics: CourseTopic[]): AiDesignedCourse | null {
  const list = readAiCourses();
  const idx = list.findIndex((c) => c.id === id);
  if (idx < 0) return null;
  const enriched = enrichTopicsWithDurations(topics);
  const next: AiDesignedCourse = {
    ...list[idx],
    topics: enriched,
    totalHours: computeMinWatchHours(enriched),
    updatedAt: new Date().toISOString(),
  };
  list[idx] = next;
  writeJson(list);
  return next;
}

/** Persist a measured YT duration onto one topic and refresh totalHours. */
export function updateTopicVideoDuration(
  courseId: string,
  topicId: string,
  seconds: number,
): AiDesignedCourse | null {
  const list = readAiCourses();
  const idx = list.findIndex((c) => c.id === courseId);
  if (idx < 0) return null;
  const topics = list[idx].topics.map((t) =>
    t.id === topicId ? { ...t, videoDurationSeconds: Math.round(seconds) } : t,
  );
  const next: AiDesignedCourse = {
    ...list[idx],
    topics,
    totalHours: computeMinWatchHours(topics),
    updatedAt: new Date().toISOString(),
  };
  list[idx] = next;
  writeJson(list);
  return next;
}

export const INTEREST_PRESETS = [
  'DSA',
  'React',
  'Node.js',
  'Golang',
  'Backend',
  'Frontend',
  'Python',
  'TypeScript',
  'System Design',
  'SQL / Databases',
  'DevOps',
  'Cybersecurity',
  'Data Analytics',
  'Machine Learning',
  'Mobile (Flutter)',
  'Cloud (AWS)',
] as const;

export const DURATION_PRESETS = [3, 15, 30, 90] as const;

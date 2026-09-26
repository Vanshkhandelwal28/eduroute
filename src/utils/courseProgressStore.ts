/**
 * Course / roadmap video progress — localStorage.
 * Auto-ticks a topic when watched ratio >= COMPLETE_THRESHOLD (default 55%).
 * Writes/events are throttled so playback is not interrupted by re-renders.
 */

export const COMPLETE_THRESHOLD = 0.55;

/** Only persist / notify UI when ratio jumps by this much (unless completing). */
const PERSIST_STEP = 0.05;

export type TopicProgress = {
  /** 0–1 fraction of video watched (high-water mark) */
  watchedRatio: number;
  completed: boolean;
  completedAt?: string;
};

export type CourseProgressMap = Record<string, TopicProgress>;

const KEY_PREFIX = 'eduroute:course-progress:';

function storageKey(courseKey: string) {
  return `${KEY_PREFIX}${courseKey}`;
}

function readMap(courseKey: string): CourseProgressMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(storageKey(courseKey));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CourseProgressMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(courseKey: string, map: CourseProgressMap, notify: boolean) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey(courseKey), JSON.stringify(map));
    if (notify) {
      window.dispatchEvent(
        new CustomEvent('eduroute:course-progress-updated', { detail: { courseKey } }),
      );
    }
  } catch {
    /* ignore */
  }
}

export function getCourseProgress(courseKey: string): CourseProgressMap {
  return readMap(courseKey);
}

export function getTopicProgress(courseKey: string, topicId: string): TopicProgress {
  const map = readMap(courseKey);
  return map[topicId] || { watchedRatio: 0, completed: false };
}

/**
 * Record watch progress. Returns true if topic just became completed.
 * Skips storage + UI events for tiny ratio bumps (keeps video playing smoothly).
 */
export function recordWatchProgress(
  courseKey: string,
  topicId: string,
  ratio: number,
  threshold = COMPLETE_THRESHOLD,
): { progress: TopicProgress; justCompleted: boolean; changed: boolean } {
  const map = readMap(courseKey);
  const prev = map[topicId] || { watchedRatio: 0, completed: false };
  const watchedRatio = Math.min(1, Math.max(prev.watchedRatio, ratio));
  let completed = prev.completed;
  let justCompleted = false;
  let completedAt = prev.completedAt;

  if (!completed && watchedRatio >= threshold) {
    completed = true;
    justCompleted = true;
    completedAt = new Date().toISOString();
  }

  const progress: TopicProgress = { watchedRatio, completed, completedAt };

  // Only write when meaningful: first record, completion, or +5% step
  const ratioDelta = watchedRatio - (prev.watchedRatio || 0);
  const changed =
    justCompleted ||
    (!prev.watchedRatio && watchedRatio > 0) ||
    ratioDelta >= PERSIST_STEP ||
    (completed && !prev.completed);

  if (changed) {
    map[topicId] = progress;
    // Notify UI on completion always; on step updates also so “Watched N%” can refresh
    writeMap(courseKey, map, true);
  }

  return { progress, justCompleted, changed };
}

export function setTopicCompleted(courseKey: string, topicId: string, completed: boolean) {
  const map = readMap(courseKey);
  const prev = map[topicId] || { watchedRatio: 0, completed: false };
  map[topicId] = {
    ...prev,
    completed,
    completedAt: completed ? prev.completedAt || new Date().toISOString() : undefined,
    watchedRatio: completed ? Math.max(prev.watchedRatio, COMPLETE_THRESHOLD) : prev.watchedRatio,
  };
  writeMap(courseKey, map, true);
}

export function courseCompletionStats(
  courseKey: string,
  topicIds: string[],
): { done: number; total: number; percent: number; allDone: boolean } {
  const map = readMap(courseKey);
  const total = topicIds.length;
  const done = topicIds.filter((id) => map[id]?.completed).length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  return { done, total, percent, allDone: total > 0 && done === total };
}

/** Level label from course duration (days). */
export function levelFromDurationDays(days: number): 'Beginner' | 'Intermediate' | 'Advanced' {
  if (days <= 15) return 'Beginner';
  if (days <= 60) return 'Intermediate';
  return 'Advanced';
}

export function formatCertDate(d = new Date()): string {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function makeCertId(): string {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `CERT-${n}`;
}

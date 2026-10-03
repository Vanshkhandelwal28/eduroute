/**
 * Course video progress — localStorage + Neon (Render /api/user-data).
 * Key: course-progress → { [courseKey]: { [topicId]: TopicProgress } }
 */

import { currentUserId } from './apiClient';
import { pullUserData, pushUserData } from './userDataStore';

export const COMPLETE_THRESHOLD = 0.55;
const PERSIST_STEP = 0.05;
const DATA_KEY = 'course-progress';

export type TopicProgress = {
  watchedRatio: number;
  completed: boolean;
  completedAt?: string;
};

export type CourseProgressMap = Record<string, TopicProgress>;

/** All courses for current user */
type AllProgress = Record<string, CourseProgressMap>;

const KEY_PREFIX = 'eduroute:course-progress:';
const ALL_KEY = () => `eduroute:course-progress-all:${currentUserId()}`;

function storageKey(courseKey: string) {
  return `${KEY_PREFIX}${currentUserId()}:${courseKey}`;
}

function readAllLocal(): AllProgress {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(ALL_KEY());
    if (raw) {
      const parsed = JSON.parse(raw) as AllProgress;
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {
    /* ignore */
  }
  return {};
}

function writeAllLocal(all: AllProgress, notifyCourseKey?: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ALL_KEY(), JSON.stringify(all));
    // keep per-course keys for any legacy readers
    for (const [ck, map] of Object.entries(all)) {
      localStorage.setItem(storageKey(ck), JSON.stringify(map));
    }
    if (notifyCourseKey) {
      window.dispatchEvent(
        new CustomEvent('eduroute:course-progress-updated', {
          detail: { courseKey: notifyCourseKey },
        }),
      );
    }
  } catch {
    /* ignore */
  }
  // debounce server push
  schedulePush(all);
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePush(all: AllProgress) {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    void pushUserData(DATA_KEY, all);
  }, 800);
}

function readMap(courseKey: string): CourseProgressMap {
  const all = readAllLocal();
  if (all[courseKey]) return all[courseKey];
  // legacy single-key fallback
  if (typeof window === 'undefined') return {};
  try {
    const raw =
      localStorage.getItem(storageKey(courseKey)) ||
      localStorage.getItem(`eduroute:course-progress:${courseKey}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CourseProgressMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(courseKey: string, map: CourseProgressMap, notify: boolean) {
  const all = readAllLocal();
  all[courseKey] = map;
  writeAllLocal(all, notify ? courseKey : undefined);
}

export function getCourseProgress(courseKey: string): CourseProgressMap {
  return readMap(courseKey);
}

export function getTopicProgress(courseKey: string, topicId: string): TopicProgress {
  const map = readMap(courseKey);
  return map[topicId] || { watchedRatio: 0, completed: false };
}

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
  const ratioDelta = watchedRatio - (prev.watchedRatio || 0);
  const changed =
    justCompleted ||
    (!prev.watchedRatio && watchedRatio > 0) ||
    ratioDelta >= PERSIST_STEP ||
    (completed && !prev.completed);

  if (changed) {
    map[topicId] = progress;
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

/** Pull all progress from Neon and merge into local (server wins on higher watchedRatio). */
export async function syncCourseProgressFromServer(): Promise<void> {
  const remote = await pullUserData<AllProgress>(DATA_KEY);
  if (!remote || typeof remote !== 'object') return;

  const local = readAllLocal();
  let changed = false;

  for (const [courseKey, remoteMap] of Object.entries(remote)) {
    if (!remoteMap || typeof remoteMap !== 'object') continue;
    const localMap = local[courseKey] || {};
    const merged: CourseProgressMap = { ...localMap };

    for (const [topicId, rp] of Object.entries(remoteMap)) {
      const lp = localMap[topicId];
      if (!lp) {
        merged[topicId] = rp;
        changed = true;
        continue;
      }
      const better =
        (rp.completed && !lp.completed) ||
        (rp.watchedRatio || 0) > (lp.watchedRatio || 0);
      if (better) {
        merged[topicId] = {
          watchedRatio: Math.max(lp.watchedRatio || 0, rp.watchedRatio || 0),
          completed: Boolean(lp.completed || rp.completed),
          completedAt: lp.completedAt || rp.completedAt,
        };
        changed = true;
      }
    }
    local[courseKey] = merged;
  }

  if (changed) {
    writeAllLocal(local);
    try {
      window.dispatchEvent(
        new CustomEvent('eduroute:course-progress-updated', { detail: { courseKey: '*' } }),
      );
    } catch {
      /* ignore */
    }
  }
}

if (typeof window !== 'undefined') {
  window.setTimeout(() => {
    void syncCourseProgressFromServer().catch(() => undefined);
  }, 600);
}

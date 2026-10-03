/**
 * AI-designed mixed courses — localStorage + Neon on Render.
 * Always targets Render first so cross-browser works without Netlify rewrites.
 */

import {
  getVideoDurationSeconds,
  minWatchSecondsFromTopics,
  secondsToHoursRounded,
} from './youtubeDurations';
import { apiFetch, currentUserId } from './apiClient';

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
  totalHours: number;
  createdAt: string;
  updatedAt: string;
};

const KEY = 'eduroute:ai-designed-courses-v1';
const KEY_USER = (uid: string) => `eduroute:ai-designed-courses-v1:${uid}`;
const RENDER = 'https://eduroute-api-nho4.onrender.com';

function storageKey(): string {
  try {
    return KEY_USER(currentUserId());
  } catch {
    return KEY;
  }
}

function readJson<T>(fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(storageKey()) || localStorage.getItem(KEY);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    const payload = JSON.stringify(value);
    localStorage.setItem(storageKey(), payload);
    localStorage.setItem(KEY, payload);
    window.dispatchEvent(new Event('eduroute:ai-courses-updated'));
  } catch {
    /* ignore */
  }
}

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

function normalizeCourse(raw: any): AiDesignedCourse | null {
  if (!raw) return null;
  const payload = raw.payload && typeof raw.payload === 'object' ? raw.payload : raw;
  const id = String(raw.id || payload.id || '');
  if (!id) return null;
  const topics = Array.isArray(payload.topics) ? payload.topics : [];
  return {
    id,
    title: String(payload.title || raw.title || 'Untitled course'),
    summary: String(payload.summary || ''),
    durationDays: Number(payload.durationDays || 15),
    interests: Array.isArray(payload.interests) ? payload.interests : [],
    field: String(payload.field || ''),
    skillGaps: Array.isArray(payload.skillGaps) ? payload.skillGaps : [],
    demandHints: Array.isArray(payload.demandHints) ? payload.demandHints : [],
    topics,
    totalHours: Number(payload.totalHours || 0),
    createdAt: String(payload.createdAt || raw.createdAt || new Date().toISOString()),
    updatedAt: String(payload.updatedAt || raw.updatedAt || new Date().toISOString()),
  };
}

export async function syncAiCoursesFromServer(): Promise<AiDesignedCourse[]> {
  const local = readAiCourses();
  const uid = currentUserId();

  const res = await apiFetch<any[]>(`/api/ai-courses?userId=${encodeURIComponent(uid)}`, {
    method: 'GET',
  });
  let rows: any[] | null = res.ok && Array.isArray(res.data) ? res.data : null;

  if (!rows) {
    try {
      const r = await fetch(`${RENDER}/api/ai-courses?userId=${encodeURIComponent(uid)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': uid },
      });
      const ct = r.headers.get('content-type') || '';
      if (r.ok && ct.includes('application/json')) {
        const body = await r.json();
        const data = body?.data ?? body;
        if (Array.isArray(data)) rows = data;
      }
    } catch {
      /* offline */
    }
  }

  if (!rows) return local;

  const byId = new Map(local.map((c) => [c.id, c]));
  for (const row of rows) {
    const c = normalizeCourse(row);
    if (!c) continue;
    const prev = byId.get(c.id);
    if (!prev || new Date(c.updatedAt).getTime() >= new Date(prev.updatedAt).getTime()) {
      byId.set(c.id, {
        ...c,
        topics: enrichTopicsWithDurations(c.topics),
        totalHours: computeMinWatchHours(c.topics),
      });
    }
  }
  const merged = Array.from(byId.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  writeJson(merged);
  return merged;
}

async function pushCourseToServer(course: AiDesignedCourse) {
  const uid = currentUserId();
  const body = JSON.stringify({
    id: course.id,
    title: course.title,
    userId: uid,
    ...course,
  });

  try {
    const r = await fetch(`${RENDER}/api/ai-courses?userId=${encodeURIComponent(uid)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': uid },
      body,
    });
    if (r.ok) return;
  } catch {
    /* fall through */
  }

  await apiFetch(`/api/ai-courses?userId=${encodeURIComponent(uid)}`, {
    method: 'POST',
    body,
  });
}

export function readAiCourses(): AiDesignedCourse[] {
  const list = readJson<AiDesignedCourse[]>([]);
  if (!Array.isArray(list) || list.length === 0) return [];

  let dirty = false;
  const next = list.map((c) => {
    const enriched = enrichTopicsWithDurations(c.topics || []);
    const hours = computeMinWatchHours(enriched);
    const topicsChanged = enriched.some(
      (t, i) => t.videoDurationSeconds !== c.topics[i]?.videoDurationSeconds,
    );
    if (topicsChanged || c.totalHours !== hours) {
      dirty = true;
      return { ...c, topics: enriched, totalHours: hours };
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
  void pushCourseToServer(next);
  return next;
}

export function deleteAiCourse(id: string) {
  writeJson(readAiCourses().filter((c) => c.id !== id));
  const uid = currentUserId();
  void fetch(`${RENDER}/api/ai-courses/${encodeURIComponent(id)}?userId=${encodeURIComponent(uid)}`, {
    method: 'DELETE',
    headers: { 'X-User-Id': uid },
  }).catch(() => undefined);
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
  void pushCourseToServer(next);
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

export const DURATION_PRESETS = [3, 15, 30, 60, 90] as const;

/** Browser: pull from Neon shortly after module load (designer / courses pages). */
if (typeof window !== 'undefined') {
  window.setTimeout(() => {
    void syncAiCoursesFromServer().catch(() => undefined);
  }, 400);
}

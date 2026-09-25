/**
 * AI-designed mixed courses — localStorage (student editable).
 */

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

export function readAiCourses(): AiDesignedCourse[] {
  const list = readJson<AiDesignedCourse[]>([]);
  return Array.isArray(list) ? list : [];
}

export function saveAiCourse(course: AiDesignedCourse): AiDesignedCourse {
  const list = readAiCourses().filter((c) => c.id !== course.id);
  const next = { ...course, updatedAt: new Date().toISOString() };
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
  const totalHours = topics.reduce((a, t) => a + (t.estimatedHours || 0), 0);
  const next: AiDesignedCourse = {
    ...list[idx],
    topics,
    totalHours,
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

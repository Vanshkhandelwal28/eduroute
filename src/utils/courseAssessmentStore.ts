/**
 * Course final assessments — localStorage + Neon (Render).
 */

import { currentUserId } from './apiClient';
import { pullUserData, pushUserData } from './userDataStore';

export type AssessmentRecord = {
  courseId: string;
  passed: boolean;
  percent: number;
  score: number;
  total: number;
  gapTopics: string[];
  completedAt: string;
  attempts: number;
};

const DATA_KEY = 'course-assessments';
const KEY = () => `eduroute:course-assessments-v1:${currentUserId()}`;

function readAll(): Record<string, AssessmentRecord> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(KEY()) || localStorage.getItem('eduroute:course-assessments-v1');
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, AssessmentRecord>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY(), JSON.stringify(map));
    localStorage.setItem('eduroute:course-assessments-v1', JSON.stringify(map));
    window.dispatchEvent(new CustomEvent('eduroute:course-assessment-updated', { detail: map }));
  } catch {
    /* ignore */
  }
  void pushUserData(DATA_KEY, map);
}

export function getAssessment(courseId: string): AssessmentRecord | null {
  return readAll()[courseId] || null;
}

export function hasPassedAssessment(courseId: string): boolean {
  return Boolean(getAssessment(courseId)?.passed);
}

export function saveAssessmentResult(
  courseId: string,
  result: {
    passed: boolean;
    percent: number;
    score: number;
    total: number;
    gapTopics: string[];
  },
): AssessmentRecord {
  const all = readAll();
  const prev = all[courseId];
  const record: AssessmentRecord = {
    courseId,
    passed: result.passed,
    percent: result.percent,
    score: result.score,
    total: result.total,
    gapTopics: result.gapTopics || [],
    completedAt: new Date().toISOString(),
    attempts: (prev?.attempts || 0) + 1,
  };
  all[courseId] = record;
  writeAll(all);
  return record;
}

export async function syncAssessmentsFromServer(): Promise<void> {
  const remote = await pullUserData<Record<string, AssessmentRecord>>(DATA_KEY);
  if (!remote || typeof remote !== 'object') return;
  const local = readAll();
  let changed = false;
  for (const [id, rec] of Object.entries(remote)) {
    const lp = local[id];
    if (!lp || (rec.attempts || 0) >= (lp.attempts || 0)) {
      local[id] = rec;
      changed = true;
    }
  }
  if (changed) {
    try {
      localStorage.setItem(KEY(), JSON.stringify(local));
      window.dispatchEvent(new CustomEvent('eduroute:course-assessment-updated', { detail: local }));
    } catch {
      /* ignore */
    }
  }
}

if (typeof window !== 'undefined') {
  window.setTimeout(() => {
    void syncAssessmentsFromServer().catch(() => undefined);
  }, 700);
}

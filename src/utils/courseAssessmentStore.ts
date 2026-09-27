/**
 * Final assessment results — localStorage.
 * Certificate unlock requires passed === true (score >= 60%).
 */

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

const KEY = 'eduroute:course-assessments-v1';

function readAll(): Record<string, AssessmentRecord> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(KEY);
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
    localStorage.setItem(KEY, JSON.stringify(map));
    window.dispatchEvent(
      new CustomEvent('eduroute:course-assessment-updated', { detail: map }),
    );
  } catch {
    /* ignore */
  }
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
  const map = readAll();
  const prev = map[courseId];
  const next: AssessmentRecord = {
    courseId,
    passed: result.passed || Boolean(prev?.passed),
    percent: result.percent,
    score: result.score,
    total: result.total,
    gapTopics: result.gapTopics,
    completedAt: new Date().toISOString(),
    attempts: (prev?.attempts || 0) + 1,
  };
  // Keep best pass: once passed, stay passed even if later attempt fails
  if (prev?.passed) next.passed = true;
  map[courseId] = next;
  writeAll(map);
  return next;
}

/** Persist final-assessment attempts per AI course. */

export type AssessmentAttempt = {
  courseId: string;
  percent: number;
  passed: boolean;
  answeredAt: string;
};

const KEY = 'eduroute:course-assessment-attempts';

export function getAssessmentAttempt(courseId: string): AssessmentAttempt | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, AssessmentAttempt>;
    return map[courseId] || null;
  } catch {
    return null;
  }
}

export function saveAssessmentAttempt(attempt: AssessmentAttempt): void {
  try {
    const raw = localStorage.getItem(KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, AssessmentAttempt>) : {};
    map[attempt.courseId] = attempt;
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function clearAssessmentAttempt(courseId: string): void {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const map = JSON.parse(raw) as Record<string, AssessmentAttempt>;
    delete map[courseId];
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

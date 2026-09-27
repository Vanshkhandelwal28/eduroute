/**
 * Employer validation loop — localStorage.
 * Course ratings, skill must-have/nice-to-have, curriculum approve/reject, surveys.
 */

export type CourseRating = {
  id: string;
  courseId: string;
  courseTitle: string;
  stars: number;
  comment: string;
  companyName: string;
  createdAt: string;
};

export type SkillFeedback = {
  id: string;
  skill: string;
  kind: 'must_have' | 'nice_to_have';
  note: string;
  companyName: string;
  createdAt: string;
};

export type CurriculumVote = {
  id: string;
  courseId: string;
  courseTitle: string;
  decision: 'approve' | 'reject';
  reason: string;
  companyName: string;
  createdAt: string;
};

export type EmployerSurvey = {
  id: string;
  companyName: string;
  hiringRoles: string;
  topSkills: string;
  feedback: string;
  createdAt: string;
};

const RATINGS_KEY = 'eduroute:employer-course-ratings';
const SKILLS_KEY = 'eduroute:employer-skill-feedback';
const VOTES_KEY = 'eduroute:employer-curriculum-votes';
const SURVEYS_KEY = 'eduroute:employer-surveys';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function readCourseRatings(): CourseRating[] {
  return readJson(RATINGS_KEY, []);
}

export function addCourseRating(input: Omit<CourseRating, 'id' | 'createdAt'>) {
  const next: CourseRating = { ...input, id: uid(), createdAt: new Date().toISOString() };
  const list = [next, ...readCourseRatings()].slice(0, 80);
  writeJson(RATINGS_KEY, list);
  return next;
}

export function readSkillFeedback(): SkillFeedback[] {
  return readJson(SKILLS_KEY, []);
}

export function addSkillFeedback(input: Omit<SkillFeedback, 'id' | 'createdAt'>) {
  const next: SkillFeedback = { ...input, id: uid(), createdAt: new Date().toISOString() };
  const list = [next, ...readSkillFeedback()].slice(0, 80);
  writeJson(SKILLS_KEY, list);
  return next;
}

export function readCurriculumVotes(): CurriculumVote[] {
  return readJson(VOTES_KEY, []);
}

export function addCurriculumVote(input: Omit<CurriculumVote, 'id' | 'createdAt'>) {
  const next: CurriculumVote = { ...input, id: uid(), createdAt: new Date().toISOString() };
  const list = [next, ...readCurriculumVotes()].slice(0, 80);
  writeJson(VOTES_KEY, list);
  return next;
}

export function readEmployerSurveys(): EmployerSurvey[] {
  return readJson(SURVEYS_KEY, []);
}

export function addEmployerSurvey(input: Omit<EmployerSurvey, 'id' | 'createdAt'>) {
  const next: EmployerSurvey = { ...input, id: uid(), createdAt: new Date().toISOString() };
  const list = [next, ...readEmployerSurveys()].slice(0, 40);
  writeJson(SURVEYS_KEY, list);
  return next;
}

/**
 * Employer validation loop — localStorage (SIH26134).
 * Course ratings, skill must-have/nice-to-have, curriculum approve/reject, surveys.
 */

export type CourseRating = {
  id: string;
  courseId: string;
  courseName: string;
  rating: number; // 1–5 job-ready
  comment: string;
  company: string;
  at: string;
};

export type SkillValidation = {
  id: string;
  roleTitle: string;
  skill: string;
  kind: 'must-have' | 'nice-to-have';
  company: string;
  at: string;
};

export type CurriculumDecision = {
  id: string;
  recommendationId: string;
  title: string;
  decision: 'approved' | 'rejected';
  note: string;
  company: string;
  at: string;
};

export type EmployerSurvey = {
  id: string;
  qHiringDifficulty: number; // 1–5
  qCurriculumRelevance: number;
  qWouldHireAgain: number;
  openFeedback: string;
  company: string;
  at: string;
};

const RATINGS_KEY = 'eduroute:employer-course-ratings-v1';
const SKILLS_KEY = 'eduroute:employer-skill-validations-v1';
const CURRICULUM_KEY = 'eduroute:employer-curriculum-decisions-v1';
const SURVEYS_KEY = 'eduroute:employer-surveys-v1';

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event('eduroute:employer-validation-updated'));
  } catch {
    /* ignore */
  }
}

export const VALIDATABLE_COURSES = [
  { id: 'c-react', name: 'Full Stack Web (React + Node)' },
  { id: 'c-data', name: 'Data Analytics Certificate' },
  { id: 'c-banking', name: 'Banking Operations Diploma' },
  { id: 'c-cnc', name: 'CNC & Quality Inspection' },
  { id: 'c-ev', name: 'EV Battery & Solar Basics' },
  { id: 'c-cyber', name: 'Cybersecurity Fundamentals' },
  { id: 'c-office', name: 'Office Automation (MS Office)' },
];

export const ROLE_SKILL_PRESETS: { role: string; skills: string[] }[] = [
  { role: 'Frontend Developer', skills: ['React', 'TypeScript', 'CSS', 'Accessibility'] },
  { role: 'Data Analyst', skills: ['SQL', 'Python', 'Excel', 'Power BI'] },
  { role: 'Cybersecurity Analyst', skills: ['Linux', 'Networking', 'SIEM', 'Cloud Security'] },
  { role: 'EV Technician', skills: ['Battery Systems', 'Safety', 'Diagnostics'] },
];

export function readCourseRatings(): CourseRating[] {
  const list = readJson<CourseRating[]>(RATINGS_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function addCourseRating(input: {
  courseId: string;
  courseName: string;
  rating: number;
  comment: string;
  company?: string;
}): CourseRating {
  const entry: CourseRating = {
    id: `cr-${Date.now()}`,
    courseId: input.courseId,
    courseName: input.courseName,
    rating: Math.min(5, Math.max(1, Math.round(input.rating))),
    comment: (input.comment || '').trim(),
    company: input.company || 'EduRoute Partners',
    at: new Date().toISOString(),
  };
  writeJson(RATINGS_KEY, [entry, ...readCourseRatings()]);
  return entry;
}

export function readSkillValidations(): SkillValidation[] {
  const list = readJson<SkillValidation[]>(SKILLS_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function upsertSkillValidation(input: {
  roleTitle: string;
  skill: string;
  kind: 'must-have' | 'nice-to-have';
  company?: string;
}): SkillValidation {
  const list = readSkillValidations().filter(
    (s) => !(s.roleTitle === input.roleTitle && s.skill === input.skill),
  );
  const entry: SkillValidation = {
    id: `sv-${Date.now()}`,
    roleTitle: input.roleTitle,
    skill: input.skill,
    kind: input.kind,
    company: input.company || 'EduRoute Partners',
    at: new Date().toISOString(),
  };
  writeJson(SKILLS_KEY, [entry, ...list]);
  return entry;
}

export function readCurriculumDecisions(): CurriculumDecision[] {
  const list = readJson<CurriculumDecision[]>(CURRICULUM_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function setCurriculumDecision(input: {
  recommendationId: string;
  title: string;
  decision: 'approved' | 'rejected';
  note?: string;
  company?: string;
}): CurriculumDecision {
  const list = readCurriculumDecisions().filter((d) => d.recommendationId !== input.recommendationId);
  const entry: CurriculumDecision = {
    id: `cd-${Date.now()}`,
    recommendationId: input.recommendationId,
    title: input.title,
    decision: input.decision,
    note: (input.note || '').trim(),
    company: input.company || 'EduRoute Partners',
    at: new Date().toISOString(),
  };
  writeJson(CURRICULUM_KEY, [entry, ...list]);
  return entry;
}

export function readSurveys(): EmployerSurvey[] {
  const list = readJson<EmployerSurvey[]>(SURVEYS_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function addSurvey(input: {
  qHiringDifficulty: number;
  qCurriculumRelevance: number;
  qWouldHireAgain: number;
  openFeedback: string;
  company?: string;
}): EmployerSurvey {
  const entry: EmployerSurvey = {
    id: `es-${Date.now()}`,
    qHiringDifficulty: clamp15(input.qHiringDifficulty),
    qCurriculumRelevance: clamp15(input.qCurriculumRelevance),
    qWouldHireAgain: clamp15(input.qWouldHireAgain),
    openFeedback: (input.openFeedback || '').trim(),
    company: input.company || 'EduRoute Partners',
    at: new Date().toISOString(),
  };
  writeJson(SURVEYS_KEY, [entry, ...readSurveys()]);
  return entry;
}

function clamp15(n: number) {
  return Math.min(5, Math.max(1, Math.round(n)));
}

export function validationSummary() {
  const ratings = readCourseRatings();
  const skills = readSkillValidations();
  const decisions = readCurriculumDecisions();
  const surveys = readSurveys();
  const avgRating =
    ratings.length === 0
      ? 0
      : Math.round((ratings.reduce((a, r) => a + r.rating, 0) / ratings.length) * 10) / 10;
  const approved = decisions.filter((d) => d.decision === 'approved').length;
  const rejected = decisions.filter((d) => d.decision === 'rejected').length;
  const mustHave = skills.filter((s) => s.kind === 'must-have').length;
  const nice = skills.filter((s) => s.kind === 'nice-to-have').length;
  const avgSurveyRelevance =
    surveys.length === 0
      ? 0
      : Math.round(
          (surveys.reduce((a, s) => a + s.qCurriculumRelevance, 0) / surveys.length) * 10,
        ) / 10;
  return {
    ratingsCount: ratings.length,
    avgRating,
    skillsCount: skills.length,
    mustHave,
    nice,
    approved,
    rejected,
    surveysCount: surveys.length,
    avgSurveyRelevance,
    recentRatings: ratings.slice(0, 5),
    recentDecisions: decisions.slice(0, 5),
  };
}

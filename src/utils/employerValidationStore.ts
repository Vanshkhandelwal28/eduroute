/**
 * Employer validation loop — localStorage.
 * Course ratings, skill must-have/nice-to-have, curriculum approve/reject, surveys.
 */

export type CourseRating = {
  id: string;
  courseId: string;
  courseName: string;
  rating: number; // 1–5 job-ready
  comment: string;
  company: string;
  createdAt: string;
};

export type SkillValidation = {
  skill: string;
  importance: 'must_have' | 'nice_to_have' | 'not_needed';
  note: string;
  company: string;
  updatedAt: string;
};

export type CurriculumDecision = {
  courseId: string;
  courseName: string;
  decision: 'approve' | 'reject' | 'revise';
  reason: string;
  company: string;
  updatedAt: string;
};

export type EmployerSurvey = {
  id: string;
  company: string;
  roleHiring: string;
  topSkills: string;
  placementFeedback: string;
  wouldHireFrom: boolean;
  createdAt: string;
};

const KEY_RATINGS = 'eduroute_employer_course_ratings_v1';
const KEY_SKILLS = 'eduroute_employer_skill_validations_v1';
const KEY_CURRICULUM = 'eduroute_employer_curriculum_v1';
const KEY_SURVEYS = 'eduroute_employer_surveys_v1';

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
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Courses employers can rate against (demo catalogue). */
export const VALIDATABLE_COURSES = [
  { id: 'c-react', name: 'Full Stack Web (React + Node)' },
  { id: 'c-data', name: 'Data Analytics Certificate' },
  { id: 'c-banking', name: 'Banking Operations Diploma' },
  { id: 'c-cnc', name: 'CNC & Quality Inspection' },
  { id: 'c-ev', name: 'EV Battery & Solar Basics' },
  { id: 'c-office', name: 'Office Automation (MS Office)' },
  { id: 'c-cyber', name: 'Cybersecurity Fundamentals' },
] as const;

export const ROLE_SKILL_PRESETS: { role: string; skills: string[] }[] = [
  { role: 'Frontend Engineer', skills: ['React', 'TypeScript', 'CSS', 'Git'] },
  { role: 'Data Analyst', skills: ['SQL', 'Python', 'Excel', 'Power BI'] },
  { role: 'DevOps / Cloud', skills: ['Linux', 'Docker', 'AWS', 'CI/CD'] },
  { role: 'EV Technician', skills: ['Battery Systems', 'Safety', 'Diagnostics'] },
  { role: 'Cybersecurity Analyst', skills: ['Linux', 'Networking', 'SIEM'] },
];

export function readCourseRatings(): CourseRating[] {
  return readJson<CourseRating[]>(KEY_RATINGS, []);
}

export function addCourseRating(input: {
  courseId: string;
  courseName: string;
  rating: number;
  comment?: string;
  company?: string;
}): CourseRating {
  const entry: CourseRating = {
    id: uid(),
    courseId: input.courseId,
    courseName: input.courseName,
    rating: Math.max(1, Math.min(5, Math.round(input.rating))),
    comment: (input.comment || '').trim().slice(0, 400),
    company: (input.company || 'Employer').trim().slice(0, 80),
    createdAt: new Date().toISOString(),
  };
  const next = [entry, ...readCourseRatings()].slice(0, 100);
  writeJson(KEY_RATINGS, next);
  return entry;
}

export function readSkillValidations(): SkillValidation[] {
  return readJson<SkillValidation[]>(KEY_SKILLS, []);
}

export function upsertSkillValidation(input: {
  skill: string;
  importance: SkillValidation['importance'];
  note?: string;
  company?: string;
}): SkillValidation {
  const skill = input.skill.trim();
  const list = readSkillValidations().filter((s) => s.skill.toLowerCase() !== skill.toLowerCase());
  const entry: SkillValidation = {
    skill,
    importance: input.importance,
    note: (input.note || '').trim().slice(0, 200),
    company: (input.company || 'Employer').trim().slice(0, 80),
    updatedAt: new Date().toISOString(),
  };
  list.unshift(entry);
  writeJson(KEY_SKILLS, list.slice(0, 80));
  return entry;
}

export function readCurriculumDecisions(): CurriculumDecision[] {
  return readJson<CurriculumDecision[]>(KEY_CURRICULUM, []);
}

export function setCurriculumDecision(input: {
  courseId: string;
  courseName: string;
  decision: CurriculumDecision['decision'];
  reason?: string;
  company?: string;
}): CurriculumDecision {
  const list = readCurriculumDecisions().filter((c) => c.courseId !== input.courseId);
  const entry: CurriculumDecision = {
    courseId: input.courseId,
    courseName: input.courseName,
    decision: input.decision,
    reason: (input.reason || '').trim().slice(0, 300),
    company: (input.company || 'Employer').trim().slice(0, 80),
    updatedAt: new Date().toISOString(),
  };
  list.unshift(entry);
  writeJson(KEY_CURRICULUM, list.slice(0, 40));
  return entry;
}

export function readSurveys(): EmployerSurvey[] {
  return readJson<EmployerSurvey[]>(KEY_SURVEYS, []);
}

export function addSurvey(input: {
  company?: string;
  roleHiring: string;
  topSkills: string;
  placementFeedback?: string;
  wouldHireFrom?: boolean;
}): EmployerSurvey {
  const entry: EmployerSurvey = {
    id: uid(),
    company: (input.company || 'Employer').trim().slice(0, 80),
    roleHiring: input.roleHiring.trim().slice(0, 120),
    topSkills: input.topSkills.trim().slice(0, 240),
    placementFeedback: (input.placementFeedback || '').trim().slice(0, 400),
    wouldHireFrom: Boolean(input.wouldHireFrom),
    createdAt: new Date().toISOString(),
  };
  const next = [entry, ...readSurveys()].slice(0, 50);
  writeJson(KEY_SURVEYS, next);
  return entry;
}

export function validationSummary() {
  const ratings = readCourseRatings();
  const skills = readSkillValidations();
  const curriculum = readCurriculumDecisions();
  const surveys = readSurveys();
  const avgRating =
    ratings.length === 0
      ? 0
      : Math.round((ratings.reduce((a, r) => a + r.rating, 0) / ratings.length) * 10) / 10;
  return {
    ratingCount: ratings.length,
    avgRating,
    skillVotes: skills.length,
    mustHave: skills.filter((s) => s.importance === 'must_have').length,
    curriculumVotes: curriculum.length,
    approved: curriculum.filter((c) => c.decision === 'approve').length,
    rejected: curriculum.filter((c) => c.decision === 'reject').length,
    surveyCount: surveys.length,
    hireYes: surveys.filter((s) => s.wouldHireFrom).length,
  };
}

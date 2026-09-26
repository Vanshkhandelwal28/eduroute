/** SIH26134 — Curriculum ↔ skill gap mock data (Maharashtra training focus) */

export type CourseFlag = 'obsolete' | 'oversupplied' | 'low_placement' | 'healthy' | 'critical_gap';

export type SkillGapRow = {
  skill: string;
  taughtPct: number;
  demandPct: number;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
};

export type CurriculumRecommendation = {
  id: string;
  type: 'add' | 'remove' | 'update';
  title: string;
  detail: string;
  priority: 'high' | 'medium' | 'low';
  courseId: string;
};

export type CourseCurriculum = {
  id: string;
  name: string;
  provider: string;
  sector: string;
  district: string;
  seats: number;
  placementRate12m: number;
  enrollments: number;
  demandIndex: number;
  flag: CourseFlag;
  flagLabel: string;
  skills: SkillGapRow[];
};

export const COURSES: CourseCurriculum[] = [
  {
    id: 'c-react',
    name: 'Full Stack Web (React + Node)',
    provider: 'MIT Skill Centre',
    sector: 'IT / Software',
    district: 'Pune',
    seats: 120,
    placementRate12m: 68,
    enrollments: 118,
    demandIndex: 92,
    flag: 'critical_gap',
    flagLabel: 'Critical skill gaps vs industry demand',
    skills: [
      { skill: 'React', taughtPct: 75, demandPct: 90, level: 'Intermediate' },
      { skill: 'TypeScript', taughtPct: 40, demandPct: 85, level: 'Intermediate' },
      { skill: 'Node.js', taughtPct: 70, demandPct: 80, level: 'Intermediate' },
      { skill: 'System Design', taughtPct: 20, demandPct: 70, level: 'Advanced' },
      { skill: 'Python advanced', taughtPct: 15, demandPct: 55, level: 'Advanced' },
    ],
  },
  {
    id: 'c-data',
    name: 'Data Analytics Certificate',
    provider: 'Mumbai Polytechnic',
    sector: 'BFSI',
    district: 'Mumbai',
    seats: 80,
    placementRate12m: 54,
    enrollments: 76,
    demandIndex: 88,
    flag: 'critical_gap',
    flagLabel: 'Low placement last 12 months',
    skills: [
      { skill: 'SQL', taughtPct: 80, demandPct: 92, level: 'Intermediate' },
      { skill: 'Python', taughtPct: 55, demandPct: 90, level: 'Intermediate' },
      { skill: 'Excel', taughtPct: 90, demandPct: 60, level: 'Beginner' },
      { skill: 'Power BI', taughtPct: 30, demandPct: 78, level: 'Intermediate' },
      { skill: 'Statistics', taughtPct: 45, demandPct: 72, level: 'Intermediate' },
    ],
  },
  {
    id: 'c-banking',
    name: 'Banking Operations Diploma',
    provider: 'Kolhapur ITI',
    sector: 'BFSI',
    district: 'Kolhapur',
    seats: 100,
    placementRate12m: 28,
    enrollments: 95,
    demandIndex: 35,
    flag: 'obsolete',
    flagLabel: 'Obsolete vs declining local demand',
    skills: [
      { skill: 'Banking Ops', taughtPct: 90, demandPct: 40, level: 'Beginner' },
      { skill: 'Compliance', taughtPct: 70, demandPct: 45, level: 'Intermediate' },
      { skill: 'Customer Service', taughtPct: 85, demandPct: 50, level: 'Beginner' },
      { skill: 'Digital Banking', taughtPct: 25, demandPct: 75, level: 'Intermediate' },
    ],
  },
  {
    id: 'c-cnc',
    name: 'CNC & Quality Inspection',
    provider: 'Aurangabad Industrial Training',
    sector: 'Manufacturing',
    district: 'Aurangabad',
    seats: 60,
    placementRate12m: 72,
    enrollments: 58,
    demandIndex: 65,
    flag: 'healthy',
    flagLabel: 'Aligned with district manufacturing demand',
    skills: [
      { skill: 'CNC', taughtPct: 85, demandPct: 80, level: 'Intermediate' },
      { skill: 'Blueprint Reading', taughtPct: 80, demandPct: 75, level: 'Intermediate' },
      { skill: 'Quality Control', taughtPct: 70, demandPct: 78, level: 'Intermediate' },
      { skill: 'Industrial IoT', taughtPct: 20, demandPct: 60, level: 'Advanced' },
    ],
  },
  {
    id: 'c-ev',
    name: 'EV Battery & Solar Basics',
    provider: 'Pune Green Skills Hub',
    sector: 'EV / Green',
    district: 'Pune',
    seats: 40,
    placementRate12m: 61,
    enrollments: 40,
    demandIndex: 95,
    flag: 'critical_gap',
    flagLabel: 'High demand — expand seats & modules',
    skills: [
      { skill: 'Battery Systems', taughtPct: 50, demandPct: 88, level: 'Intermediate' },
      { skill: 'Safety', taughtPct: 80, demandPct: 85, level: 'Beginner' },
      { skill: 'Solar PV', taughtPct: 45, demandPct: 82, level: 'Beginner' },
      { skill: 'Diagnostics', taughtPct: 30, demandPct: 70, level: 'Intermediate' },
    ],
  },
  {
    id: 'c-office',
    name: 'Office Automation (MS Office)',
    provider: 'Thane Community College',
    sector: 'IT / Software',
    district: 'Thane',
    seats: 150,
    placementRate12m: 22,
    enrollments: 148,
    demandIndex: 25,
    flag: 'oversupplied',
    flagLabel: 'Oversupplied in Thane / low placement',
    skills: [
      { skill: 'MS Word', taughtPct: 95, demandPct: 30, level: 'Beginner' },
      { skill: 'Excel', taughtPct: 90, demandPct: 55, level: 'Beginner' },
      { skill: 'PowerPoint', taughtPct: 90, demandPct: 25, level: 'Beginner' },
    ],
  },
  {
    id: 'c-cyber',
    name: 'Cybersecurity Fundamentals',
    provider: 'ShieldOps Academy',
    sector: 'IT / Software',
    district: 'Thane',
    seats: 45,
    placementRate12m: 58,
    enrollments: 42,
    demandIndex: 84,
    flag: 'critical_gap',
    flagLabel: 'Gaps in SIEM & cloud security depth',
    skills: [
      { skill: 'Linux', taughtPct: 65, demandPct: 85, level: 'Intermediate' },
      { skill: 'Networking', taughtPct: 70, demandPct: 80, level: 'Intermediate' },
      { skill: 'SIEM', taughtPct: 25, demandPct: 75, level: 'Advanced' },
      { skill: 'Cloud Security', taughtPct: 15, demandPct: 70, level: 'Advanced' },
    ],
  },
];

export const RECOMMENDATIONS: CurriculumRecommendation[] = [
  {
    id: 'r1',
    type: 'add',
    title: 'Add TypeScript module (40 hrs)',
    detail: 'Taught 40% · industry demand 85%. Pair with existing React track at MIT Skill Centre.',
    priority: 'high',
    courseId: 'c-react',
  },
  {
    id: 'r2',
    type: 'add',
    title: 'Add Power BI lab + case studies',
    detail: 'Close analytics gap for BFSI hiring in Mumbai (demand 78%).',
    priority: 'high',
    courseId: 'c-data',
  },
  {
    id: 'r3',
    type: 'remove',
    title: 'Retire pure manual banking ops blocks',
    detail: 'Demand falling; replace with Digital Banking & KYC tech modules.',
    priority: 'high',
    courseId: 'c-banking',
  },
  {
    id: 'r4',
    type: 'update',
    title: 'Expand EV Battery seats + diagnostics',
    detail: 'Pune EV demand index 95; current seats only 40.',
    priority: 'high',
    courseId: 'c-ev',
  },
  {
    id: 'r5',
    type: 'remove',
    title: 'Downsize Office Automation intake',
    detail: 'Oversupplied in Thane; placement 22% last 12 months.',
    priority: 'medium',
    courseId: 'c-office',
  },
  {
    id: 'r6',
    type: 'add',
    title: 'Add SIEM tools workshop',
    detail: 'Cyber course: SIEM taught 25% · demand 75%.',
    priority: 'high',
    courseId: 'c-cyber',
  },
  {
    id: 'r7',
    type: 'add',
    title: 'Introduce Industrial IoT elective',
    detail: 'CNC program healthy but IoT demand rising in Aurangabad manufacturing.',
    priority: 'medium',
    courseId: 'c-cnc',
  },
  {
    id: 'r8',
    type: 'update',
    title: 'Reduce Excel-only hours; deepen Python',
    detail: 'Data course: Excel over-taught vs Python under-taught for analyst roles.',
    priority: 'medium',
    courseId: 'c-data',
  },
];

export function gapPct(taught: number, demand: number) {
  return Math.max(0, demand - taught);
}

export function avgGap(course: CourseCurriculum) {
  if (!course.skills.length) return 0;
  const sum = course.skills.reduce((a, s) => a + gapPct(s.taughtPct, s.demandPct), 0);
  return Math.round(sum / course.skills.length);
}

export function flagTone(flag: CourseFlag) {
  switch (flag) {
    case 'obsolete':
      return 'bg-rose-500/15 text-rose-700 ring-rose-300/50 dark:text-rose-300';
    case 'oversupplied':
      return 'bg-amber-500/15 text-amber-800 ring-amber-300/50 dark:text-amber-200';
    case 'low_placement':
      return 'bg-orange-500/15 text-orange-800 ring-orange-300/50 dark:text-orange-200';
    case 'critical_gap':
      return 'bg-violet-500/15 text-violet-700 ring-violet-300/50 dark:text-violet-300';
    default:
      return 'bg-emerald-500/15 text-emerald-700 ring-emerald-300/50 dark:text-emerald-300';
  }
}

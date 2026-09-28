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
      { skill: 'Node.js', taughtPct: 60, demandPct: 85, level: 'Intermediate' },
      { skill: 'TypeScript', taughtPct: 40, demandPct: 80, level: 'Intermediate' },
      { skill: 'System Design', taughtPct: 20, demandPct: 70, level: 'Advanced' },
    ],
  },
  {
    id: 'c-data',
    name: 'Data Analytics with Python',
    provider: 'Government ITI',
    sector: 'IT / Analytics',
    district: 'Mumbai',
    seats: 80,
    placementRate12m: 55,
    enrollments: 76,
    demandIndex: 88,
    flag: 'critical_gap',
    flagLabel: 'Analytics tools under-taught',
    skills: [
      { skill: 'Python', taughtPct: 55, demandPct: 88, level: 'Intermediate' },
      { skill: 'SQL', taughtPct: 70, demandPct: 85, level: 'Intermediate' },
      { skill: 'Power BI', taughtPct: 35, demandPct: 78, level: 'Intermediate' },
      { skill: 'Excel', taughtPct: 90, demandPct: 60, level: 'Beginner' },
    ],
  },
  {
    id: 'c-cyber',
    name: 'Cybersecurity Fundamentals',
    provider: 'Polytechnic',
    sector: 'IT / Security',
    district: 'Nagpur',
    seats: 40,
    placementRate12m: 62,
    enrollments: 38,
    demandIndex: 90,
    flag: 'critical_gap',
    flagLabel: 'Limited seats vs high demand',
    skills: [
      { skill: 'Network Security', taughtPct: 50, demandPct: 82, level: 'Intermediate' },
      { skill: 'SIEM', taughtPct: 25, demandPct: 75, level: 'Advanced' },
      { skill: 'Ethical Hacking', taughtPct: 45, demandPct: 70, level: 'Intermediate' },
    ],
  },
  {
    id: 'c-banking',
    name: 'Banking Operations',
    provider: 'Skill India Partner',
    sector: 'BFSI',
    district: 'Mumbai',
    seats: 150,
    placementRate12m: 48,
    enrollments: 142,
    demandIndex: 55,
    flag: 'obsolete',
    flagLabel: 'Manual ops declining',
    skills: [
      { skill: 'Cash Handling', taughtPct: 85, demandPct: 30, level: 'Beginner' },
      { skill: 'Digital Banking', taughtPct: 40, demandPct: 75, level: 'Intermediate' },
      { skill: 'KYC Tech', taughtPct: 35, demandPct: 70, level: 'Intermediate' },
    ],
  },
  {
    id: 'c-ev',
    name: 'EV Battery & Diagnostics',
    provider: 'Auto Cluster Training',
    sector: 'Automotive / EV',
    district: 'Pune',
    seats: 40,
    placementRate12m: 72,
    enrollments: 40,
    demandIndex: 95,
    flag: 'critical_gap',
    flagLabel: 'Seats far below EV demand',
    skills: [
      { skill: 'Battery Management', taughtPct: 50, demandPct: 90, level: 'Intermediate' },
      { skill: 'Power Electronics', taughtPct: 40, demandPct: 85, level: 'Advanced' },
      { skill: 'Diagnostics', taughtPct: 55, demandPct: 80, level: 'Intermediate' },
    ],
  },
  {
    id: 'c-office',
    name: 'Office Automation',
    provider: 'District Skill Centre',
    sector: 'General',
    district: 'Thane',
    seats: 200,
    placementRate12m: 22,
    enrollments: 190,
    demandIndex: 28,
    flag: 'oversupplied',
    flagLabel: 'Oversupplied · low placement',
    skills: [
      { skill: 'MS Office', taughtPct: 95, demandPct: 40, level: 'Beginner' },
      { skill: 'Data Entry', taughtPct: 90, demandPct: 25, level: 'Beginner' },
    ],
  },
  {
    id: 'c-cnc',
    name: 'CNC Machining',
    provider: 'ITI Aurangabad',
    sector: 'Manufacturing',
    district: 'Aurangabad',
    seats: 60,
    placementRate12m: 70,
    enrollments: 58,
    demandIndex: 75,
    flag: 'healthy',
    flagLabel: 'Healthy · add IoT elective',
    skills: [
      { skill: 'CNC Programming', taughtPct: 80, demandPct: 75, level: 'Intermediate' },
      { skill: 'CAD/CAM', taughtPct: 65, demandPct: 70, level: 'Intermediate' },
      { skill: 'Industrial IoT', taughtPct: 20, demandPct: 60, level: 'Beginner' },
    ],
  },
];

export const RECOMMENDATIONS: CurriculumRecommendation[] = [
  {
    id: 'r1',
    type: 'add',
    title: 'Add TypeScript + System Design modules',
    detail: 'Full Stack Web: TypeScript taught 40% · demand 80%; System Design 20% · demand 70%.',
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

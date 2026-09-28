/** Curriculum ↔ skill gap mock data (Maharashtra training focus) */

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
      { skill: 'TypeScript', taughtPct: 40, demandPct: 88, level: 'Beginner' },
      { skill: 'System Design', taughtPct: 20, demandPct: 80, level: 'Beginner' },
    ],
  },
  {
    id: 'c-data',
    name: 'Data Analytics Certificate',
    provider: 'Skill India Hub',
    sector: 'Analytics',
    district: 'Mumbai',
    seats: 80,
    placementRate12m: 72,
    enrollments: 76,
    demandIndex: 88,
    flag: 'healthy',
    flagLabel: 'Aligned with market demand',
    skills: [
      { skill: 'SQL', taughtPct: 85, demandPct: 90, level: 'Intermediate' },
      { skill: 'Python', taughtPct: 70, demandPct: 88, level: 'Intermediate' },
      { skill: 'Power BI', taughtPct: 65, demandPct: 75, level: 'Beginner' },
      { skill: 'Excel', taughtPct: 90, demandPct: 70, level: 'Advanced' },
    ],
  },
  {
    id: 'c-banking',
    name: 'Banking Operations Diploma',
    provider: 'District ITI',
    sector: 'BFSI',
    district: 'Nagpur',
    seats: 60,
    placementRate12m: 45,
    enrollments: 55,
    demandIndex: 55,
    flag: 'low_placement',
    flagLabel: 'Low placement rate',
    skills: [
      { skill: 'Banking ops', taughtPct: 80, demandPct: 50, level: 'Intermediate' },
      { skill: 'Compliance', taughtPct: 60, demandPct: 55, level: 'Beginner' },
    ],
  },
  {
    id: 'c-cnc',
    name: 'CNC & Quality Inspection',
    provider: 'Industrial Training Centre',
    sector: 'Manufacturing',
    district: 'Aurangabad',
    seats: 40,
    placementRate12m: 58,
    enrollments: 38,
    demandIndex: 62,
    flag: 'oversupplied',
    flagLabel: 'Oversupplied relative to local demand',
    skills: [
      { skill: 'CNC', taughtPct: 85, demandPct: 55, level: 'Intermediate' },
      { skill: 'Quality', taughtPct: 70, demandPct: 60, level: 'Intermediate' },
    ],
  },
  {
    id: 'c-ev',
    name: 'EV Battery & Solar Basics',
    provider: 'Green Skills Centre',
    sector: 'Clean Energy',
    district: 'Pune',
    seats: 50,
    placementRate12m: 64,
    enrollments: 48,
    demandIndex: 78,
    flag: 'healthy',
    flagLabel: 'Growing sector demand',
    skills: [
      { skill: 'Battery Systems', taughtPct: 70, demandPct: 80, level: 'Beginner' },
      { skill: 'Solar', taughtPct: 65, demandPct: 72, level: 'Beginner' },
      { skill: 'Safety', taughtPct: 80, demandPct: 75, level: 'Intermediate' },
    ],
  },
  {
    id: 'c-office',
    name: 'Office Automation (MS Office)',
    provider: 'Community College',
    sector: 'General',
    district: 'Nashik',
    seats: 100,
    placementRate12m: 40,
    enrollments: 95,
    demandIndex: 35,
    flag: 'obsolete',
    flagLabel: 'Low differentiation / saturated',
    skills: [
      { skill: 'MS Office', taughtPct: 95, demandPct: 40, level: 'Advanced' },
      { skill: 'Typing', taughtPct: 90, demandPct: 25, level: 'Advanced' },
    ],
  },
  {
    id: 'c-cyber',
    name: 'Cybersecurity Fundamentals',
    provider: 'MIT Skill Centre',
    sector: 'IT / Security',
    district: 'Mumbai',
    seats: 45,
    placementRate12m: 70,
    enrollments: 42,
    demandIndex: 90,
    flag: 'critical_gap',
    flagLabel: 'High demand, limited seats',
    skills: [
      { skill: 'Networking', taughtPct: 70, demandPct: 85, level: 'Intermediate' },
      { skill: 'Linux', taughtPct: 60, demandPct: 88, level: 'Beginner' },
      { skill: 'SIEM', taughtPct: 30, demandPct: 75, level: 'Beginner' },
    ],
  },
];

export const RECOMMENDATIONS: CurriculumRecommendation[] = [
  {
    id: 'r1',
    type: 'add',
    title: 'Add TypeScript module to Full Stack track',
    detail: 'Industry demand for TypeScript is high; current taught % is low.',
    priority: 'high',
    courseId: 'c-react',
  },
  {
    id: 'r2',
    type: 'update',
    title: 'Increase System Design labs',
    detail: 'Product companies in Pune/Bengaluru expect basic system design.',
    priority: 'high',
    courseId: 'c-react',
  },
  {
    id: 'r3',
    type: 'remove',
    title: 'Phase out pure MS Office certificate',
    detail: 'Saturated; pair with data or digital marketing instead.',
    priority: 'medium',
    courseId: 'c-office',
  },
  {
    id: 'r4',
    type: 'add',
    title: 'Expand Cybersecurity seats',
    detail: 'Demand index 90 with limited capacity.',
    priority: 'high',
    courseId: 'c-cyber',
  },
];

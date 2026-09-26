/** Mock labour-market signals for SIH26134 Demand Intelligence (Maharashtra focus) */

export type DistrictKey =
  | 'Pune'
  | 'Mumbai'
  | 'Nagpur'
  | 'Nashik'
  | 'Aurangabad'
  | 'Thane'
  | 'Kolhapur'
  | 'Solapur';

export type SectorKey =
  | 'all'
  | 'IT / Software'
  | 'Manufacturing'
  | 'BFSI'
  | 'Healthcare'
  | 'EV / Green'
  | 'Logistics';

export type ExperienceKey = 'all' | 'Intern' | '0-2 yrs' | '2-5 yrs' | '5+ yrs';
export type WindowKey = '30d' | '90d';

export type JobSignal = {
  id: string;
  title: string;
  company: string;
  district: DistrictKey;
  sector: Exclude<SectorKey, 'all'>;
  skills: string[];
  proficiency: 'Beginner' | 'Intermediate' | 'Advanced';
  experience: Exclude<ExperienceKey, 'all'>;
  salaryBand: string;
  openings: number;
  postedDaysAgo: number;
  emerging?: string[];
  trend: 'rising' | 'stable' | 'declining';
};

export const DISTRICTS: DistrictKey[] = [
  'Pune',
  'Mumbai',
  'Nagpur',
  'Nashik',
  'Aurangabad',
  'Thane',
  'Kolhapur',
  'Solapur',
];

export const SECTORS: SectorKey[] = [
  'all',
  'IT / Software',
  'Manufacturing',
  'BFSI',
  'Healthcare',
  'EV / Green',
  'Logistics',
];

export const EXPERIENCE_LEVELS: ExperienceKey[] = ['all', 'Intern', '0-2 yrs', '2-5 yrs', '5+ yrs'];

export const JOB_SIGNALS: JobSignal[] = [
  {
    id: 'js-1',
    title: 'React Frontend Developer',
    company: 'TechFlow Pune',
    district: 'Pune',
    sector: 'IT / Software',
    skills: ['React', 'TypeScript', 'CSS'],
    proficiency: 'Intermediate',
    experience: '0-2 yrs',
    salaryBand: '₹4–7 LPA',
    openings: 42,
    postedDaysAgo: 3,
    emerging: ['AI'],
    trend: 'rising',
  },
  {
    id: 'js-2',
    title: 'Data Analyst',
    company: 'InsightHive',
    district: 'Mumbai',
    sector: 'BFSI',
    skills: ['SQL', 'Python', 'Excel'],
    proficiency: 'Intermediate',
    experience: '0-2 yrs',
    salaryBand: '₹5–8 LPA',
    openings: 28,
    postedDaysAgo: 5,
    emerging: ['AI'],
    trend: 'rising',
  },
  {
    id: 'js-3',
    title: 'EV Battery Technician',
    company: 'GreenDrive MH',
    district: 'Pune',
    sector: 'EV / Green',
    skills: ['Battery Systems', 'Safety', 'Diagnostics'],
    proficiency: 'Beginner',
    experience: 'Intern',
    salaryBand: '₹18–25k / mo',
    openings: 35,
    postedDaysAgo: 2,
    emerging: ['EV', 'Green'],
    trend: 'rising',
  },
  {
    id: 'js-4',
    title: 'CNC Operator',
    company: 'AutoForge',
    district: 'Aurangabad',
    sector: 'Manufacturing',
    skills: ['CNC', 'Blueprint Reading', 'Quality'],
    proficiency: 'Intermediate',
    experience: '2-5 yrs',
    salaryBand: '₹3–5 LPA',
    openings: 18,
    postedDaysAgo: 12,
    trend: 'stable',
  },
  {
    id: 'js-5',
    title: 'Cloud DevOps Engineer',
    company: 'CloudNest',
    district: 'Mumbai',
    sector: 'IT / Software',
    skills: ['AWS', 'Docker', 'Linux', 'CI/CD'],
    proficiency: 'Advanced',
    experience: '2-5 yrs',
    salaryBand: '₹10–16 LPA',
    openings: 22,
    postedDaysAgo: 7,
    emerging: ['AI'],
    trend: 'rising',
  },
  {
    id: 'js-6',
    title: 'Logistics Coordinator',
    company: 'SwiftHaul',
    district: 'Nagpur',
    sector: 'Logistics',
    skills: ['Supply Chain', 'Excel', 'Communication'],
    proficiency: 'Beginner',
    experience: '0-2 yrs',
    salaryBand: '₹3–4.5 LPA',
    openings: 15,
    postedDaysAgo: 9,
    trend: 'stable',
  },
  {
    id: 'js-7',
    title: 'Clinical Lab Assistant',
    company: 'CareLab MH',
    district: 'Nashik',
    sector: 'Healthcare',
    skills: ['Phlebotomy', 'Lab Safety', 'Records'],
    proficiency: 'Beginner',
    experience: 'Intern',
    salaryBand: '₹15–20k / mo',
    openings: 12,
    postedDaysAgo: 14,
    trend: 'stable',
  },
  {
    id: 'js-8',
    title: 'Full Stack Developer',
    company: 'NovaPath Labs',
    district: 'Pune',
    sector: 'IT / Software',
    skills: ['React', 'Node.js', 'MongoDB'],
    proficiency: 'Intermediate',
    experience: '0-2 yrs',
    salaryBand: '₹6–10 LPA',
    openings: 31,
    postedDaysAgo: 4,
    emerging: ['AI'],
    trend: 'rising',
  },
  {
    id: 'js-9',
    title: 'Solar PV Installer',
    company: 'SunGrid Maharashtra',
    district: 'Solapur',
    sector: 'EV / Green',
    skills: ['Solar PV', 'Electrical Safety', 'Site Survey'],
    proficiency: 'Beginner',
    experience: '0-2 yrs',
    salaryBand: '₹2.5–4 LPA',
    openings: 24,
    postedDaysAgo: 6,
    emerging: ['Green'],
    trend: 'rising',
  },
  {
    id: 'js-10',
    title: 'Cybersecurity Analyst',
    company: 'ShieldOps',
    district: 'Thane',
    sector: 'IT / Software',
    skills: ['Linux', 'Networking', 'SIEM'],
    proficiency: 'Intermediate',
    experience: '2-5 yrs',
    salaryBand: '₹8–14 LPA',
    openings: 11,
    postedDaysAgo: 8,
    emerging: ['AI'],
    trend: 'rising',
  },
  {
    id: 'js-11',
    title: 'Banking Operations Associate',
    company: 'Maharashtra Bank Co.',
    district: 'Kolhapur',
    sector: 'BFSI',
    skills: ['Banking Ops', 'Compliance', 'Customer Service'],
    proficiency: 'Beginner',
    experience: '0-2 yrs',
    salaryBand: '₹3–5 LPA',
    openings: 9,
    postedDaysAgo: 20,
    trend: 'declining',
  },
  {
    id: 'js-12',
    title: 'ML Engineering Intern',
    company: 'QuantLeaf AI',
    district: 'Pune',
    sector: 'IT / Software',
    skills: ['Python', 'ML', 'PyTorch'],
    proficiency: 'Intermediate',
    experience: 'Intern',
    salaryBand: '₹25–35k / mo',
    openings: 16,
    postedDaysAgo: 1,
    emerging: ['AI'],
    trend: 'rising',
  },
  {
    id: 'js-13',
    title: 'Quality Inspector',
    company: 'PrecisionParts',
    district: 'Aurangabad',
    sector: 'Manufacturing',
    skills: ['Quality Control', 'Metrology', 'ISO'],
    proficiency: 'Intermediate',
    experience: '2-5 yrs',
    salaryBand: '₹3.5–5.5 LPA',
    openings: 14,
    postedDaysAgo: 11,
    trend: 'stable',
  },
  {
    id: 'js-14',
    title: 'Warehouse Supervisor',
    company: 'LogiHub MH',
    district: 'Nagpur',
    sector: 'Logistics',
    skills: ['Inventory', 'WMS', 'Team Lead'],
    proficiency: 'Advanced',
    experience: '5+ yrs',
    salaryBand: '₹5–8 LPA',
    openings: 7,
    postedDaysAgo: 15,
    trend: 'stable',
  },
  {
    id: 'js-15',
    title: 'Nurse Trainee',
    company: 'CityCare Hospitals',
    district: 'Mumbai',
    sector: 'Healthcare',
    skills: ['Patient Care', 'EMR', 'First Aid'],
    proficiency: 'Beginner',
    experience: 'Intern',
    salaryBand: '₹18–22k / mo',
    openings: 20,
    postedDaysAgo: 10,
    trend: 'rising',
  },
  {
    id: 'js-16',
    title: 'PLC Programmer',
    company: 'InduAuto',
    district: 'Nashik',
    sector: 'Manufacturing',
    skills: ['PLC', 'SCADA', 'Industrial IoT'],
    proficiency: 'Advanced',
    experience: '2-5 yrs',
    salaryBand: '₹6–11 LPA',
    openings: 10,
    postedDaysAgo: 18,
    emerging: ['AI'],
    trend: 'rising',
  },
];

export type SkillDemandRow = {
  skill: string;
  demand: number;
  openings: number;
  trend: 'rising' | 'stable' | 'declining';
  emerging?: boolean;
};

export type RoleTrendRow = {
  role: string;
  score: number;
  direction: 'rising' | 'declining' | 'stable';
  delta: number;
};

export type DistrictHeat = {
  district: DistrictKey;
  openings: number;
  intensity: number;
};

export function filterSignals(
  signals: JobSignal[],
  opts: {
    sector: SectorKey;
    district: DistrictKey | 'all';
    experience: ExperienceKey;
    window: WindowKey;
  },
): JobSignal[] {
  const maxDays = opts.window === '30d' ? 30 : 90;
  return signals.filter((s) => {
    if (s.postedDaysAgo > maxDays) return false;
    if (opts.sector !== 'all' && s.sector !== opts.sector) return false;
    if (opts.district !== 'all' && s.district !== opts.district) return false;
    if (opts.experience !== 'all' && s.experience !== opts.experience) return false;
    return true;
  });
}

export function aggregateSkills(signals: JobSignal[]): SkillDemandRow[] {
  const map = new Map<string, { openings: number; rising: number; declining: number; emerging: boolean }>();
  for (const s of signals) {
    for (const skill of s.skills) {
      const cur = map.get(skill) || { openings: 0, rising: 0, declining: 0, emerging: false };
      cur.openings += s.openings;
      if (s.trend === 'rising') cur.rising += 1;
      if (s.trend === 'declining') cur.declining += 1;
      if (s.emerging?.length) cur.emerging = true;
      map.set(skill, cur);
    }
  }
  const rows: SkillDemandRow[] = [...map.entries()].map(([skill, v]) => {
    let trend: SkillDemandRow['trend'] = 'stable';
    if (v.rising > v.declining) trend = 'rising';
    else if (v.declining > v.rising) trend = 'declining';
    return {
      skill,
      openings: v.openings,
      demand: Math.min(99, 35 + Math.round(v.openings / 2)),
      trend,
      emerging: v.emerging,
    };
  });
  return rows.sort((a, b) => b.openings - a.openings).slice(0, 12);
}

export function aggregateRoles(signals: JobSignal[]): RoleTrendRow[] {
  const map = new Map<string, { openings: number; rising: number; declining: number }>();
  for (const s of signals) {
    const cur = map.get(s.title) || { openings: 0, rising: 0, declining: 0 };
    cur.openings += s.openings;
    if (s.trend === 'rising') cur.rising += 1;
    if (s.trend === 'declining') cur.declining += 1;
    map.set(s.title, cur);
  }
  return [...map.entries()]
    .map(([role, v]) => {
      let direction: RoleTrendRow['direction'] = 'stable';
      let delta = 0;
      if (v.rising > v.declining) {
        direction = 'rising';
        delta = 8 + (v.rising % 7);
      } else if (v.declining > v.rising) {
        direction = 'declining';
        delta = -(5 + (v.declining % 5));
      }
      return {
        role,
        score: Math.min(99, 40 + Math.round(v.openings / 1.5)),
        direction,
        delta,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

export function aggregateDistricts(signals: JobSignal[]): DistrictHeat[] {
  const map = new Map<DistrictKey, number>();
  for (const d of DISTRICTS) map.set(d, 0);
  for (const s of signals) {
    map.set(s.district, (map.get(s.district) || 0) + s.openings);
  }
  const max = Math.max(...map.values(), 1);
  return DISTRICTS.map((district) => {
    const openings = map.get(district) || 0;
    return {
      district,
      openings,
      intensity: Math.round((openings / max) * 100),
    };
  }).sort((a, b) => b.openings - a.openings);
}

export function kpiFromSignals(signals: JobSignal[]) {
  const totalOpenings = signals.reduce((a, s) => a + s.openings, 0);
  const roles = new Set(signals.map((s) => s.title)).size;
  const skills = new Set(signals.flatMap((s) => s.skills)).size;
  const emerging = signals.filter((s) => s.emerging && s.emerging.length > 0).length;
  const rising = signals.filter((s) => s.trend === 'rising').length;
  return { totalOpenings, roles, skills, emerging, rising, postings: signals.length };
}

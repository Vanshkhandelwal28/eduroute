/**
 * Skill Market Trend Engine — full utilisation of Adzuna + data.gov + curated.
 * Region-aware demand for India (All) vs individual states.
 */
import { normalizeSkillList, normalizeSkillName, skillsMatch } from './skillNormalize';
import { readMarketSnapshot, type MarketSnapshot } from './marketTrendStore';

export type MarketJob = {
  externalId: string;
  source: string;
  title: string;
  company: string;
  location: string;
  experience: string;
  industry: string;
  salaryText?: string;
  postingDate?: string;
  collectedAt: string;
  skills: string[];
};

export type CollectionRun = {
  id: string;
  startedAt: string;
  finishedAt?: string;
  status: 'running' | 'ok' | 'error' | 'partial';
  source: string;
  jobsFetched: number;
  jobsInserted: number;
  jobsDuplicate: number;
  errorMessage?: string;
  note?: string;
};

export type GovIndicator = {
  year?: string;
  state?: string;
  wpr?: number | string;
  unemploymentRate?: number | string;
  lfpr?: number | string;
};

export type SkillDemandRow = {
  skill: string;
  jobCount: number;
  demandPct: number;
  trend: 'rising' | 'stable' | 'declining' | 'insufficient';
  growthLabel: string;
};

export type StudentMarketMatch = {
  matched: string[];
  gaps: string[];
  priority: { skill: string; demandPct: number; reason: string }[];
  recommendations: { skill: string; action: string; roadmapTo: string }[];
  matchScore: number;
  computedAt: string;
  dataAsOf: string;
  sourceNote: string;
};

const JOBS_KEY = 'eduroute:mt-jobs-v1';
const RUNS_KEY = 'eduroute:mt-runs-v1';
const GOV_KEY = 'eduroute:mt-gov-v1';
const LAST_NOTE_KEY = 'eduroute:mt-last-note-v1';

const STUDENT_SKILL_EXPAND: Record<string, string[]> = {
  'project building': ['React', 'Node.js', 'Git', 'JavaScript'],
  'programming fundamentals': ['Python', 'Java', 'JavaScript'],
  'data structures': ['System Design', 'Python', 'Java'],
  'git & github': ['Git'],
  git: ['Git'],
  apis: ['REST APIs', 'Node.js'],
  'practical experience': ['Git', 'REST APIs'],
  'networking basics': ['Networking', 'Linux', 'Cybersecurity'],
  linux: ['Linux'],
  'cryptography basics': ['Cybersecurity'],
  'hands-on security practice': ['Cybersecurity', 'Linux'],
  'web vulnerabilities': ['Cybersecurity'],
  'os & network security': ['Cybersecurity', 'Linux', 'Networking'],
  spreadsheets: ['Excel', 'Data Analysis'],
  sql: ['SQL'],
  'python/r for analysis': ['Python', 'Pandas', 'Data Analysis'],
  visualization: ['Data Analysis', 'Excel'],
  statistics: ['Data Analysis', 'Python'],
  'data cleaning': ['Python', 'Pandas', 'SQL'],
};

/** Location aliases so Maharashtra matches Pune, Mumbai, etc. */
const REGION_LOC_HINTS: Record<string, string[]> = {
  Maharashtra: ['maharashtra', 'mumbai', 'pune', 'nagpur', 'nashik', 'thane'],
  Karnataka: ['karnataka', 'bengaluru', 'bangalore', 'mysore', 'hubli'],
  'Tamil Nadu': ['tamil nadu', 'chennai', 'coimbatore', 'madurai'],
  Telangana: ['telangana', 'hyderabad', 'secunderabad'],
  'Andhra Pradesh': ['andhra', 'vijayawada', 'visakhapatnam'],
  'Delhi NCR': ['delhi', 'noida', 'gurgaon', 'gurugram', 'ncr', 'ghaziabad', 'faridabad'],
  'Uttar Pradesh': ['uttar pradesh', 'lucknow', 'noida', 'kanpur'],
  Gujarat: ['gujarat', 'ahmedabad', 'surat', 'vadodara'],
  Rajasthan: ['rajasthan', 'jaipur', 'udaipur'],
  'West Bengal': ['west bengal', 'kolkata', 'calcutta'],
  Kerala: ['kerala', 'kochi', 'trivandrum', 'thiruvananthapuram'],
  'Madhya Pradesh': ['madhya pradesh', 'indore', 'bhopal'],
  Haryana: ['haryana', 'gurgaon', 'gurugram', 'faridabad'],
  Punjab: ['punjab', 'chandigarh', 'ludhiana', 'amritsar'],
  Bihar: ['bihar', 'patna'],
  Odisha: ['odisha', 'bhubaneswar'],
  Assam: ['assam', 'guwahati'],
  Jharkhand: ['jharkhand', 'ranchi'],
  Chhattisgarh: ['chhattisgarh', 'raipur'],
  Uttarakhand: ['uttarakhand', 'dehradun'],
  'Himachal Pradesh': ['himachal'],
  Goa: ['goa', 'panaji', 'panjim'],
  'Jammu & Kashmir': ['jammu', 'kashmir', 'srinagar'],
  Puducherry: ['puducherry', 'pondicherry'],
  Chandigarh: ['chandigarh'],
};

export function expandStudentSkills(studentSkills: string[]): string[] {
  const out: string[] = [];
  for (const raw of studentSkills || []) {
    const n = normalizeSkillName(raw);
    if (n) out.push(n);
    const key = String(raw || '')
      .trim()
      .toLowerCase();
    const extra = STUDENT_SKILL_EXPAND[key];
    if (extra) out.push(...extra);
  }
  return normalizeSkillList(out);
}

/** Filter jobs for selected region — India (All) = all jobs. */
export function jobsForRegion(jobs: MarketJob[], region?: string): MarketJob[] {
  const r = String(region || 'India (All)').trim();
  if (!r || /^india\s*\(all\)$/i.test(r) || /^india$/i.test(r)) return jobs;
  const hints = REGION_LOC_HINTS[r] || [r.toLowerCase()];
  const filtered = jobs.filter((j) => {
    const loc = String(j.location || '').toLowerCase();
    if (!loc) return true; // keep unknown location for demand
    return hints.some((h) => loc.includes(h));
  });
  // If region filter yields almost nothing, fall back to all (better than empty demand)
  if (filtered.length < 3 && jobs.length > 10) return jobs;
  return filtered.length ? filtered : jobs;
}

export const SEED_JOBS: MarketJob[] = [
  {
    externalId: 'demo-1',
    source: 'curated-public',
    title: 'Full Stack Developer',
    company: 'Pune Product Co',
    location: 'Pune, Maharashtra',
    experience: '0-2 years',
    industry: 'Product SaaS',
    salaryText: '6-10 LPA',
    postingDate: '2026-09-10',
    collectedAt: '2026-09-20T10:00:00.000Z',
    skills: ['React', 'Node.js', 'TypeScript', 'SQL', 'Git'],
  },
  {
    externalId: 'demo-2',
    source: 'curated-public',
    title: 'Java Backend Engineer',
    company: 'Mumbai BFSI',
    location: 'Mumbai, Maharashtra',
    experience: '1-3 years',
    industry: 'BFSI',
    salaryText: '8-14 LPA',
    postingDate: '2026-09-12',
    collectedAt: '2026-09-20T10:00:00.000Z',
    skills: ['Java', 'Spring Boot', 'SQL', 'Microservices', 'AWS'],
  },
  {
    externalId: 'demo-3',
    source: 'curated-public',
    title: 'Data Analyst',
    company: 'Bengaluru Analytics',
    location: 'Bengaluru, Karnataka',
    experience: '0-2 years',
    industry: 'Analytics',
    salaryText: '5-9 LPA',
    postingDate: '2026-09-08',
    collectedAt: '2026-09-20T10:00:00.000Z',
    skills: ['Python', 'SQL', 'Data Analysis', 'Pandas', 'Excel'],
  },
  {
    externalId: 'demo-4',
    source: 'curated-public',
    title: 'Frontend Engineer',
    company: 'Noida Startup',
    location: 'Noida, Delhi NCR',
    experience: 'Fresher',
    industry: 'Startups',
    salaryText: '5-8 LPA',
    postingDate: '2026-09-15',
    collectedAt: '2026-09-20T10:00:00.000Z',
    skills: ['React', 'TypeScript', 'CSS', 'REST APIs', 'Git'],
  },
  {
    externalId: 'demo-5',
    source: 'curated-public',
    title: 'DevOps Engineer',
    company: 'Hyderabad Cloud',
    location: 'Hyderabad, Telangana',
    experience: '2-4 years',
    industry: 'Cloud',
    salaryText: '10-16 LPA',
    postingDate: '2026-09-11',
    collectedAt: '2026-09-20T10:00:00.000Z',
    skills: ['AWS', 'Docker', 'Kubernetes', 'CI/CD', 'Linux'],
  },
  {
    externalId: 'demo-6',
    source: 'curated-public',
    title: 'Cybersecurity Analyst',
    company: 'Delhi SecOps',
    location: 'Gurugram, Delhi NCR',
    experience: '1-2 years',
    industry: 'Security',
    salaryText: '7-12 LPA',
    postingDate: '2026-09-09',
    collectedAt: '2026-09-20T10:00:00.000Z',
    skills: ['Cybersecurity', 'Linux', 'Python', 'Networking'],
  },
  {
    externalId: 'demo-7',
    source: 'curated-public',
    title: 'ML Engineer Junior',
    company: 'Bengaluru AI Lab',
    location: 'Bengaluru, Karnataka',
    experience: '0-2 years',
    industry: 'AI',
    salaryText: '8-15 LPA',
    postingDate: '2026-09-14',
    collectedAt: '2026-09-20T10:00:00.000Z',
    skills: ['Python', 'Machine Learning', 'PyTorch', 'SQL', 'Git'],
  },
  {
    externalId: 'demo-8',
    source: 'curated-public',
    title: 'React Native Developer',
    company: 'Goa Digital',
    location: 'Panaji, Goa',
    experience: '1-3 years',
    industry: 'Mobile',
    salaryText: '6-11 LPA',
    postingDate: '2026-09-13',
    collectedAt: '2026-09-20T10:00:00.000Z',
    skills: ['React Native', 'JavaScript', 'REST APIs', 'Git'],
  },
];

/** Local Skill India catalog (matches server) so gov data always appears even offline. */
const LOCAL_SKILL_INDIA: Omit<MarketJob, 'collectedAt'>[] = [
  {
    externalId: 'skill-india-0',
    source: 'data-gov-in',
    title: 'IT-ITeS Software Developer',
    company: 'Skill India / NCVT (public catalog)',
    location: 'India',
    experience: '',
    industry: 'Skill India',
    skills: ['Java', 'SQL', 'Git', 'REST APIs', 'JavaScript'],
  },
  {
    externalId: 'skill-india-1',
    source: 'data-gov-in',
    title: 'IT-ITeS Web Developer',
    company: 'Skill India / NCVT (public catalog)',
    location: 'India',
    experience: '',
    industry: 'Skill India',
    skills: ['JavaScript', 'React', 'CSS', 'Git', 'REST APIs'],
  },
  {
    externalId: 'skill-india-2',
    source: 'data-gov-in',
    title: 'IT-ITeS Cloud Application Developer',
    company: 'Skill India / NCVT (public catalog)',
    location: 'India',
    experience: '',
    industry: 'Skill India',
    skills: ['AWS', 'Docker', 'Python', 'Linux', 'Kubernetes'],
  },
  {
    externalId: 'skill-india-3',
    source: 'data-gov-in',
    title: 'IT-ITeS Data Analyst',
    company: 'Skill India / NCVT (public catalog)',
    location: 'India',
    experience: '',
    industry: 'Skill India',
    skills: ['Python', 'SQL', 'Data Analysis', 'Excel', 'Pandas'],
  },
  {
    externalId: 'skill-india-4',
    source: 'data-gov-in',
    title: 'IT-ITeS Cyber Security Analyst',
    company: 'Skill India / NCVT (public catalog)',
    location: 'India',
    experience: '',
    industry: 'Skill India',
    skills: ['Cybersecurity', 'Linux', 'Networking', 'Python'],
  },
  {
    externalId: 'skill-india-5',
    source: 'data-gov-in',
    title: 'IT-ITeS Machine Learning Engineer',
    company: 'Skill India / NCVT (public catalog)',
    location: 'India',
    experience: '',
    industry: 'Skill India',
    skills: ['Python', 'Machine Learning', 'SQL', 'Git', 'PyTorch'],
  },
  {
    externalId: 'skill-india-6',
    source: 'data-gov-in',
    title: 'IT-ITeS DevOps Engineer',
    company: 'Skill India / NCVT (public catalog)',
    location: 'India',
    experience: '',
    industry: 'Skill India',
    skills: ['DevOps', 'CI/CD', 'Docker', 'Linux', 'AWS'],
  },
  {
    externalId: 'skill-india-7',
    source: 'data-gov-in',
    title: 'IT-ITeS Full Stack Developer',
    company: 'Skill India / NCVT (public catalog)',
    location: 'India',
    experience: '',
    industry: 'Skill India',
    skills: ['React', 'Node.js', 'TypeScript', 'SQL', 'Git'],
  },
];

export function readJobs(): MarketJob[] {
  try {
    const raw = localStorage.getItem(JOBS_KEY);
    if (!raw) return SEED_JOBS.map((j) => ({ ...j, skills: normalizeSkillList(j.skills) }));
    const parsed = JSON.parse(raw) as MarketJob[];
    return Array.isArray(parsed) && parsed.length
      ? parsed.map((j) => ({ ...j, skills: normalizeSkillList(j.skills || []) }))
      : SEED_JOBS;
  } catch {
    return SEED_JOBS;
  }
}

export function writeJobs(jobs: MarketJob[]) {
  try {
    localStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
    window.dispatchEvent(new Event('eduroute:mt-jobs-updated'));
  } catch {
    /* */
  }
}

export function readGovIndicators(): GovIndicator[] {
  try {
    const raw = localStorage.getItem(GOV_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeGovIndicators(list: GovIndicator[]) {
  try {
    localStorage.setItem(GOV_KEY, JSON.stringify(list || []));
    window.dispatchEvent(new Event('eduroute:mt-gov-updated'));
  } catch {
    /* */
  }
}

export function readLastCollectNote(): string {
  try {
    return localStorage.getItem(LAST_NOTE_KEY) || '';
  } catch {
    return '';
  }
}

export function writeLastCollectNote(note: string) {
  try {
    localStorage.setItem(LAST_NOTE_KEY, note || '');
  } catch {
    /* */
  }
}

export function readRuns(): CollectionRun[] {
  try {
    const raw = localStorage.getItem(RUNS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CollectionRun[];
  } catch {
    return [];
  }
}

export function writeRuns(runs: CollectionRun[]) {
  try {
    localStorage.setItem(RUNS_KEY, JSON.stringify(runs.slice(0, 40)));
    window.dispatchEvent(new Event('eduroute:mt-runs-updated'));
  } catch {
    /* */
  }
}

export type JobFilters = {
  role?: string;
  industry?: string;
  location?: string;
  experience?: string;
  fromDate?: string;
  toDate?: string;
};

export function filterJobs(jobs: MarketJob[], f: JobFilters): MarketJob[] {
  return jobs.filter((j) => {
    if (f.role && !j.title.toLowerCase().includes(f.role.toLowerCase())) return false;
    if (f.industry && !j.industry.toLowerCase().includes(f.industry.toLowerCase())) return false;
    if (f.location && !j.location.toLowerCase().includes(f.location.toLowerCase())) return false;
    if (f.experience && !j.experience.toLowerCase().includes(f.experience.toLowerCase())) return false;
    if (f.fromDate && j.postingDate && j.postingDate < f.fromDate) return false;
    if (f.toDate && j.postingDate && j.postingDate > f.toDate) return false;
    return true;
  });
}

export function computeSkillDemand(jobs: MarketJob[]): SkillDemandRow[] {
  const total = jobs.length || 1;
  const counts = new Map<string, number>();
  for (const j of jobs) {
    for (const s of normalizeSkillList(j.skills)) {
      counts.set(s, (counts.get(s) || 0) + 1);
    }
  }
  const rows: SkillDemandRow[] = [];
  counts.forEach((jobCount, skill) => {
    const demandPct = Math.round((jobCount / total) * 1000) / 10;
    rows.push({
      skill,
      jobCount,
      demandPct,
      trend: 'insufficient',
      growthLabel: 'Insufficient historical data',
    });
  });
  return rows.sort((a, b) => b.jobCount - a.jobCount);
}

export function risingFromDemand(jobs: MarketJob[], limit = 6) {
  const demand = computeSkillDemand(jobs).slice(0, limit);
  const maxPct = demand[0]?.demandPct || 1;
  return demand.map((d) => ({
    skill: d.skill,
    demandScore: Math.min(95, Math.round(40 + (d.demandPct / maxPct) * 55)),
    trend: 'rising' as const,
    note: `${d.jobCount} jobs · ${d.demandPct}% share`,
  }));
}

export function matchStudentToMarket(
  studentSkills: string[],
  jobs: MarketJob[],
  market?: MarketSnapshot | null,
): StudentMarketMatch {
  const mineRaw = normalizeSkillList(studentSkills);
  const mine = expandStudentSkills(studentSkills);
  const demand = computeSkillDemand(jobs);
  const topN = demand.slice(0, 12);

  const matchedMarket = topN
    .filter((d) => mine.some((s) => skillsMatch(s, d.skill)))
    .map((d) => d.skill);

  const matchedLabels = mineRaw.filter(
    (s) =>
      demand.some((d) => skillsMatch(d.skill, s)) ||
      expandStudentSkills([s]).some((e) => demand.some((d) => skillsMatch(d.skill, e))),
  );

  const matched = normalizeSkillList([...matchedMarket, ...matchedLabels]);

  const gapCandidates = demand
    .filter((d) => !mine.some((s) => skillsMatch(s, d.skill)))
    .slice(0, 10);
  const gaps = gapCandidates.map((g) => g.skill);

  const priority = gapCandidates.slice(0, 5).map((g) => ({
    skill: g.skill,
    demandPct: g.demandPct,
    reason: `Appears in ${g.jobCount} of ${jobs.length} job(s) (${g.demandPct}% across all sources)`,
  }));

  const recommendations = priority.map((p) => ({
    skill: p.skill,
    action: `Learn ${p.skill} to close a high-demand gap`,
    roadmapTo: roadmapLinkForSkill(p.skill),
  }));

  const focus = topN.slice(0, 8);
  const weightSum = focus.reduce((s, d) => s + Math.max(1, d.demandPct), 0) || 1;
  const earned = focus.reduce((s, d) => {
    const has = mine.some((m) => skillsMatch(m, d.skill));
    return s + (has ? Math.max(1, d.demandPct) : 0);
  }, 0);
  let matchScore = Math.round((earned / weightSum) * 100);
  if (mine.length === 0) matchScore = 0;
  matchScore = Math.min(100, Math.max(0, matchScore));

  const latest =
    jobs
      .map((j) => j.collectedAt)
      .sort()
      .reverse()[0] ||
    market?.updatedAt ||
    new Date().toISOString();

  const hasAdzuna = jobs.some((j) => j.source === 'adzuna');
  const hasGov = jobs.some((j) => j.source === 'data-gov-in');

  return {
    matched,
    gaps,
    priority,
    recommendations,
    matchScore,
    computedAt: new Date().toISOString(),
    dataAsOf: latest,
    sourceNote:
      hasAdzuna || hasGov
        ? `Live sources: ${hasAdzuna ? 'Adzuna' : ''}${hasAdzuna && hasGov ? ' + ' : ''}${hasGov ? 'data.gov.in' : ''} + curated-public.`
        : 'Curated public demo jobs. Configure ADZUNA_* and DATA_GOV_API_KEY, then Collect jobs.',
  };
}

export function buildComparisonBars(
  jobs: MarketJob[],
  studentSkills: string[],
  limit = 8,
): { skill: string; market: number; student: number }[] {
  const demand = computeSkillDemand(jobs).slice(0, limit);
  const mine = expandStudentSkills(studentSkills);
  const maxPct = demand[0]?.demandPct || 1;
  return demand.map((d) => {
    const has = mine.some((s) => skillsMatch(s, d.skill));
    const market = Math.min(100, Math.round((d.demandPct / maxPct) * 100));
    const student = has ? Math.min(95, Math.round(55 + (d.demandPct / maxPct) * 35)) : 18;
    return { skill: d.skill, market, student };
  });
}

function roadmapLinkForSkill(skill: string): string {
  const s = skill.toLowerCase();
  if (/dsa|algorithm|data structure|system design/.test(s)) return '/dsa-sheet';
  if (/react|typescript|javascript|node|frontend|backend|python|java|sql|cloud|aws|devops|docker|kubernetes/.test(s)) {
    return `/ai-course-designer?interest=${encodeURIComponent(skill)}&title=${encodeURIComponent(skill + ' fundamentals')}`;
  }
  if (/cyber|linux|network/.test(s)) return '/roadmaps/cybersecurity';
  if (/data|pandas|excel|analysis/.test(s)) return '/roadmaps/data-analyst';
  return `/roadmaps`;
}

function mergeLocal(existing: MarketJob[], incoming: MarketJob[]) {
  const key = (j: MarketJob) => `${j.source}::${j.externalId}`;
  const map = new Map(existing.map((j) => [key(j), j]));
  let inserted = 0;
  let dup = 0;
  for (const j of incoming) {
    const k = key(j);
    if (map.has(k)) dup += 1;
    else {
      map.set(k, { ...j, skills: normalizeSkillList(j.skills), collectedAt: new Date().toISOString() });
      inserted += 1;
    }
  }
  return { jobs: Array.from(map.values()), inserted, dup };
}

export async function apiCollectJobs(region?: string): Promise<{
  ok: boolean;
  jobs?: MarketJob[];
  run?: CollectionRun;
  govIndicators?: GovIndicator[];
  note?: string;
  error?: string;
}> {
  const existing = readJobs();
  const scope = region || 'India (All)';
  try {
    const res = await fetch('/api/market-trends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'collect_jobs',
        region: scope,
        existingJobs: existing,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok && Array.isArray(data.jobs)) {
      writeJobs(data.jobs);
      if (Array.isArray(data.govIndicators)) writeGovIndicators(data.govIndicators);
      if (data.note) writeLastCollectNote(String(data.note));
      if (data.run) {
        writeRuns([{ ...(data.run as CollectionRun), note: data.note }, ...readRuns()]);
      }
      return {
        ok: true,
        jobs: data.jobs,
        run: data.run,
        govIndicators: data.govIndicators,
        note: data.note,
      };
    }
  } catch {
    /* network / timeout */
  }

  // Fallback: keep existing live jobs + merge Skill India + curated (never wipe Adzuna)
  const loc = /^india/i.test(scope) ? 'India' : scope;
  const skillIndia: MarketJob[] = LOCAL_SKILL_INDIA.map((j) => ({
    ...j,
    location: loc,
    externalId: `${j.externalId}-${loc.replace(/\s+/g, '-').toLowerCase()}`,
    collectedAt: new Date().toISOString(),
    skills: normalizeSkillList(j.skills),
  }));
  const seed = SEED_JOBS.map((j) => ({
    ...j,
    skills: normalizeSkillList(j.skills),
    collectedAt: new Date().toISOString(),
  }));
  const merged = mergeLocal(existing, [...seed, ...skillIndia]);
  writeJobs(merged.jobs);
  const note =
    'Server timed out or failed — kept existing jobs + Skill India catalog + curated. Redeploy PR #5 for full Adzuna+gov collect.';
  writeLastCollectNote(note);
  const run: CollectionRun = {
    id: `local-${Date.now()}`,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    status: 'partial',
    source: 'curated-public+data-gov-in+(existing)',
    jobsFetched: seed.length + skillIndia.length,
    jobsInserted: merged.inserted,
    jobsDuplicate: merged.dup,
    note,
  };
  writeRuns([run, ...readRuns()]);
  return { ok: true, jobs: merged.jobs, run, note };
}

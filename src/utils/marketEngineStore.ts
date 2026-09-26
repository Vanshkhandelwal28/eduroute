/**
 * Skill Market Trend Engine — client cache + local matching.
 * Server collect: Adzuna API (if configured) + curated seed; no restricted scraping.
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

/** Curated public-style demo postings (not scraped from restricted sites). */
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

export function matchStudentToMarket(
  studentSkills: string[],
  jobs: MarketJob[],
  market?: MarketSnapshot | null,
): StudentMarketMatch {
  const mine = normalizeSkillList(studentSkills);
  const demand = computeSkillDemand(jobs);
  const topMarket =
    market?.risingSkills?.map((s) => normalizeSkillName(s.skill)).filter(Boolean) ||
    demand.slice(0, 12).map((d) => d.skill);

  const matched = mine.filter(
    (s) => topMarket.some((m) => skillsMatch(s, m)) || demand.some((d) => skillsMatch(d.skill, s)),
  );

  const gapCandidates = demand.filter((d) => !mine.some((s) => skillsMatch(s, d.skill))).slice(0, 10);
  const gaps = gapCandidates.map((g) => g.skill);

  const priority = gapCandidates.slice(0, 5).map((g) => ({
    skill: g.skill,
    demandPct: g.demandPct,
    reason: `Appears in ${g.jobCount} of ${jobs.length} filtered job(s) (${g.demandPct}% demand share)`,
  }));

  const recommendations = priority.map((p) => ({
    skill: p.skill,
    action: `Learn ${p.skill} to close a high-demand gap`,
    roadmapTo: roadmapLinkForSkill(p.skill),
  }));

  const matchScore =
    topMarket.length === 0
      ? 0
      : Math.round((matched.length / Math.max(1, Math.min(topMarket.length, 8))) * 100);

  const latest =
    jobs.map((j) => j.collectedAt).sort().reverse()[0] ||
    market?.updatedAt ||
    new Date().toISOString();

  const hasAdzuna = jobs.some((j) => j.source === 'adzuna');

  return {
    matched,
    gaps,
    priority,
    recommendations,
    matchScore: Math.min(100, matchScore),
    computedAt: new Date().toISOString(),
    dataAsOf: latest,
    sourceNote: hasAdzuna
      ? 'Adzuna Jobs API (India) + curated-public seed + admin AI snapshot. No restricted scraping. Growth: Insufficient historical data until multiple collection windows exist.'
      : 'Curated public demo jobs + admin market snapshot (Adzuna when keys configured on Netlify). No restricted scraping. Growth: Insufficient historical data until multiple collection windows exist.',
  };
}

function roadmapLinkForSkill(skill: string): string {
  const s = skill.toLowerCase();
  if (/dsa|algorithm|data structure/.test(s)) return '/dsa-sheet';
  if (/react|typescript|javascript|node|frontend|backend|python|java|sql|cloud|aws|devops/.test(s)) {
    return `/ai-course-designer?interest=${encodeURIComponent(skill)}&title=${encodeURIComponent(skill + ' fundamentals')}`;
  }
  return `/roadmaps`;
}

export async function apiCollectJobs(region?: string): Promise<{
  ok: boolean;
  jobs?: MarketJob[];
  run?: CollectionRun;
  error?: string;
}> {
  const res = await fetch('/api/market-trends', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'collect_jobs', region: region || 'India (All)' }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    const run: CollectionRun = {
      id: `local-${Date.now()}`,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      status: 'ok',
      source: 'curated-public',
      jobsFetched: SEED_JOBS.length,
      jobsInserted: 0,
      jobsDuplicate: 0,
    };
    const existing = readJobs();
    const key = (j: MarketJob) => `${j.source}::${j.externalId}`;
    const map = new Map(existing.map((j) => [key(j), j]));
    let inserted = 0;
    let dup = 0;
    for (const j of SEED_JOBS) {
      const k = key(j);
      if (map.has(k)) {
        dup += 1;
      } else {
        map.set(k, { ...j, skills: normalizeSkillList(j.skills), collectedAt: new Date().toISOString() });
        inserted += 1;
      }
    }
    run.jobsInserted = inserted;
    run.jobsDuplicate = dup;
    const merged = Array.from(map.values());
    writeJobs(merged);
    const runs = [run, ...readRuns()];
    writeRuns(runs);
    return { ok: true, jobs: merged, run };
  }
  if (Array.isArray(data.jobs)) writeJobs(data.jobs);
  if (data.run) {
    writeRuns([data.run as CollectionRun, ...readRuns()]);
  }
  return { ok: true, jobs: data.jobs, run: data.run };
}

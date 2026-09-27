/**
 * Client cache for market trends + student trend analysis.
 * Admin controls shared market snapshot (region/state + AI).
 * Students may refresh personal analysis anytime (no cooldown).
 * Market snapshot is shared; only admin collects jobs / refreshes AI trends.
 */

export type MarketSkill = {
  skill: string;
  demandScore: number;
  trend: string;
  note?: string;
};

export type MarketSnapshot = {
  updatedAt: string;
  region?: string;
  summary?: string;
  risingSkills?: MarketSkill[];
  stableSkills?: MarketSkill[];
  decliningSkills?: MarketSkill[];
  topRoles?: { role: string; openingsIndex: number; avgSalaryLpa?: number }[];
  sectors?: { name: string; demandScore: number }[];
  emergingTech?: string[];
  sourcesNote?: string;
  provider?: string;
  isSeed?: boolean;
};

export type StudentAnalysis = {
  generatedAt: string;
  summary?: string;
  matchScore?: number;
  marketSkills?: {
    skill: string;
    marketDemand: number;
    studentLevel: number;
    status: string;
  }[];
  skillGaps?: { skill: string; priority: string; why: string; action: string }[];
  strengths?: string[];
  recommendations?: string[];
  comparisonBars?: { skill: string; market: number; student: number }[];
  provider?: string;
};

/** India + major states/UTs for market scope selector */
export const MARKET_REGIONS = [
  'India (All)',
  'Maharashtra',
  'Karnataka',
  'Tamil Nadu',
  'Telangana',
  'Andhra Pradesh',
  'Delhi NCR',
  'Uttar Pradesh',
  'Gujarat',
  'Rajasthan',
  'West Bengal',
  'Kerala',
  'Madhya Pradesh',
  'Haryana',
  'Punjab',
  'Bihar',
  'Odisha',
  'Assam',
  'Jharkhand',
  'Chhattisgarh',
  'Uttarakhand',
  'Himachal Pradesh',
  'Goa',
  'Jammu & Kashmir',
  'Puducherry',
  'Chandigarh',
] as const;

export type MarketRegion = (typeof MARKET_REGIONS)[number] | string;

const MARKET_KEY = 'eduroute:market-trends-v1';
const ANALYSIS_KEY = 'eduroute:student-trend-analysis-v1';
const REGION_KEY = 'eduroute:market-region-v1';
/** Admin AI refresh nudge after 24 hours. */
const ADMIN_DUE_MS = 24 * 60 * 60 * 1000;

export const SEED_MARKET: MarketSnapshot = {
  updatedAt: '2026-09-01T00:00:00.000Z',
  region: 'India / Maharashtra',
  summary:
    'Placeholder market snapshot. Admin: select region → Collect jobs (Adzuna + data.gov.in Skill India/PLFS + curated public) → Refresh AI trends. Students then see demand, gaps, and actions in Trend Analyse anytime.',
  risingSkills: [
    { skill: 'React / Next.js', demandScore: 88, trend: 'rising', note: 'Frontend hiring strong' },
    { skill: 'Python / AI basics', demandScore: 86, trend: 'rising', note: 'GenAI + automation' },
    { skill: 'Cloud (AWS/Azure)', demandScore: 82, trend: 'rising' },
    { skill: 'SQL + data analysis', demandScore: 80, trend: 'rising' },
    { skill: 'DevOps / CI-CD', demandScore: 78, trend: 'rising' },
    { skill: 'TypeScript', demandScore: 76, trend: 'rising' },
    { skill: 'Cybersecurity fundamentals', demandScore: 74, trend: 'rising' },
    { skill: 'System design', demandScore: 72, trend: 'rising' },
  ],
  decliningSkills: [
    { skill: 'jQuery-only stacks', demandScore: 28, trend: 'declining' },
    { skill: 'Legacy PHP (no frameworks)', demandScore: 32, trend: 'declining' },
    { skill: 'Flash / outdated UI kits', demandScore: 12, trend: 'declining' },
  ],
  topRoles: [
    { role: 'SDE / Fullstack', openingsIndex: 90, avgSalaryLpa: 8 },
    { role: 'Data Analyst', openingsIndex: 78, avgSalaryLpa: 6 },
    { role: 'Cloud / DevOps', openingsIndex: 72, avgSalaryLpa: 9 },
    { role: 'Cybersecurity junior', openingsIndex: 65, avgSalaryLpa: 7 },
  ],
  sectors: [
    { name: 'Product SaaS', demandScore: 88 },
    { name: 'IT Services', demandScore: 82 },
    { name: 'BFSI / FinTech', demandScore: 78 },
  ],
  emergingTech: ['GenAI apps', 'Edge computing', 'Platform engineering'],
  sourcesNote:
    'Seed only until admin Collect jobs. Live: Adzuna + data.gov.in (Skill India Mission + PLFS) + curated-public + AI (Groq/Gemini). Official OGD APIs — not note-only alignment.',
  provider: 'seed',
  isSeed: true,
};

export function readPreferredRegion(): string {
  try {
    return localStorage.getItem(REGION_KEY) || 'Maharashtra';
  } catch {
    return 'Maharashtra';
  }
}

export function writePreferredRegion(region: string) {
  try {
    localStorage.setItem(REGION_KEY, region);
  } catch {
    /* */
  }
}

export function readMarketSnapshot(): MarketSnapshot | null {
  try {
    const raw = localStorage.getItem(MARKET_KEY);
    if (!raw) return SEED_MARKET;
    return JSON.parse(raw) as MarketSnapshot;
  } catch {
    return SEED_MARKET;
  }
}

export function writeMarketSnapshot(data: MarketSnapshot) {
  try {
    const payload = { ...data, isSeed: false };
    localStorage.setItem(MARKET_KEY, JSON.stringify(payload));
    window.dispatchEvent(new Event('eduroute:market-trends-updated'));
  } catch {
    /* */
  }
}

export function readStudentAnalysis(): StudentAnalysis | null {
  try {
    const raw = localStorage.getItem(ANALYSIS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StudentAnalysis;
  } catch {
    return null;
  }
}

export function writeStudentAnalysis(data: StudentAnalysis) {
  try {
    localStorage.setItem(ANALYSIS_KEY, JSON.stringify(data));
    window.dispatchEvent(new Event('eduroute:student-trend-updated'));
  } catch {
    /* */
  }
}

/** Always 0 — student personal analysis has no timeout. */
export function studentRefreshDaysLeft(): number {
  return 0;
}

/** Always true — students may refresh analysis anytime. */
export function canStudentRefresh(): boolean {
  return true;
}

export async function apiRefreshMarket(
  region?: string,
): Promise<{ ok: boolean; market?: MarketSnapshot; error?: string; provider?: string }> {
  const scope = (region || readPreferredRegion() || 'India (All)').trim();
  // Send collected jobs so AI trends are grounded on Adzuna + data.gov.in + curated
  let existingJobs: unknown[] = [];
  try {
    const raw = localStorage.getItem('eduroute:mt-jobs-v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) existingJobs = parsed;
    }
  } catch {
    /* */
  }
  const res = await fetch('/api/market-trends', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'refresh_market',
      region: scope,
      existingJobs,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    return { ok: false, error: data.error || `HTTP ${res.status}` };
  }
  if (data.market) {
    writeMarketSnapshot(data.market);
    if (data.market.region) {
      const first = String(data.market.region).split('/')[0].trim();
      writePreferredRegion(first || scope);
    }
  }
  return { ok: true, market: data.market, provider: data.provider };
}

export async function apiAnalyzeStudent(payload: {
  skills: string[];
  strengths: string[];
  gaps: string[];
  field: string;
  interests: string[];
  region?: string;
}): Promise<{ ok: boolean; analysis?: StudentAnalysis; error?: string }> {
  const res = await fetch('/api/market-trends', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'analyze_student',
      ...payload,
      region: payload.region || readPreferredRegion(),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    return { ok: false, error: data.error || `HTTP ${res.status}` };
  }
  if (data.analysis) writeStudentAnalysis(data.analysis);
  if (data.market) writeMarketSnapshot(data.market);
  return { ok: true, analysis: data.analysis };
}

/** Admin AI snapshot due after 24h (or seed / missing). */
export function monthDueForRefresh(lastUpdated?: string | null): boolean {
  if (!lastUpdated) return true;
  const d = new Date(lastUpdated);
  if (Number.isNaN(d.getTime())) return true;
  if (lastUpdated.startsWith('2026-09-01')) return true;
  return Date.now() - d.getTime() >= ADMIN_DUE_MS;
}

export function hoursSinceMarketRefresh(lastUpdated?: string | null): number | null {
  if (!lastUpdated) return null;
  const d = new Date(lastUpdated);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (60 * 60 * 1000));
}

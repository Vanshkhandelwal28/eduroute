import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Briefcase,
  ClipboardCheck,
  Database,
  Filter,
  Loader2,
  MapPin,
  MessageSquare,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { StarfieldBackground } from '../../components/StarfieldBackground';
import {
  DISTRICTS,
  EXPERIENCE_LEVELS,
  JOB_SIGNALS,
  SECTORS,
  aggregateDistricts,
  aggregateRoles,
  aggregateSkills,
  filterSignals,
  kpiFromSignals,
  type DistrictKey,
  type ExperienceKey,
  type JobSignal,
  type SectorKey,
  type WindowKey,
} from './demandIntelligenceData';
import { validationSummary } from '../../utils/employerValidationStore';
import {
  apiCollectJobs,
  computeSkillDemand,
  jobsForRegion,
  readJobs,
  type MarketJob,
} from '../../utils/marketEngineStore';
import {
  apiRefreshMarket,
  MARKET_REGIONS,
  readMarketSnapshot,
  readPreferredRegion,
  writePreferredRegion,
  type MarketSnapshot,
} from '../../utils/marketTrendStore';

const EMERGING_COLORS: Record<string, string> = {
  AI: 'bg-violet-500/15 text-violet-700 ring-violet-300/50 dark:text-violet-300 dark:ring-violet-500/40',
  EV: 'bg-emerald-500/15 text-emerald-700 ring-emerald-300/50 dark:text-emerald-300 dark:ring-emerald-500/40',
  Green: 'bg-teal-500/15 text-teal-700 ring-teal-300/50 dark:text-teal-300 dark:ring-teal-500/40',
};

function mapLocationToDistrict(loc: string): DistrictKey {
  const l = loc.toLowerCase();
  if (l.includes('pune')) return 'Pune';
  if (l.includes('mumbai') || l.includes('bombay')) return 'Mumbai';
  if (l.includes('nagpur')) return 'Nagpur';
  if (l.includes('nashik') || l.includes('nasik')) return 'Nashik';
  if (l.includes('aurangabad') || l.includes('chhatrapati sambhajinagar')) return 'Aurangabad';
  if (l.includes('thane') || l.includes('navi mumbai')) return 'Thane';
  if (l.includes('kolhapur')) return 'Kolhapur';
  if (l.includes('solapur')) return 'Solapur';
  return 'Pune';
}

function mapSector(industry: string, title: string): Exclude<SectorKey, 'all'> {
  const t = `${industry} ${title}`.toLowerCase();
  if (/bfsi|bank|fintech|finance/.test(t)) return 'BFSI';
  if (/health|hospital|clinical|pharma/.test(t)) return 'Healthcare';
  if (/manufactur|cnc|plc|auto|industrial/.test(t)) return 'Manufacturing';
  if (/logistics|warehouse|supply/.test(t)) return 'Logistics';
  if (/ev|solar|green|renewable|battery/.test(t)) return 'EV / Green';
  return 'IT / Software';
}

function mapExperience(exp: string): Exclude<ExperienceKey, 'all'> {
  const e = (exp || '').toLowerCase();
  if (/intern|fresher|0\s*-\s*0|trainee/.test(e)) return 'Intern';
  if (/0\s*-\s*2|1\s*-\s*2|junior|entry/.test(e)) return '0-2 yrs';
  if (/2\s*-\s*5|3\s*-\s*5|mid/.test(e)) return '2-5 yrs';
  if (/5\+|5\s*-|senior|lead/.test(e)) return '5+ yrs';
  return '0-2 yrs';
}

function marketJobsToSignals(jobs: MarketJob[]): JobSignal[] {
  return jobs.map((j, i) => {
    const district = mapLocationToDistrict(j.location || '');
    const skills = (j.skills || []).slice(0, 6);
    const emerging: string[] = [];
    const blob = `${j.title} ${skills.join(' ')}`.toLowerCase();
    if (/ai|ml|machine learning|genai|llm/.test(blob)) emerging.push('AI');
    if (/ev|electric vehicle|battery/.test(blob)) emerging.push('EV');
    if (/solar|green|sustainab/.test(blob)) emerging.push('Green');
    return {
      id: `live-${j.source}-${j.externalId || i}`,
      title: j.title || 'Job',
      company: j.company || 'Unknown',
      district,
      sector: mapSector(j.industry || '', j.title || ''),
      skills: skills.length ? skills : ['Software'],
      proficiency: 'Intermediate' as const,
      experience: mapExperience(j.experience || ''),
      salaryBand: j.salaryText || '—',
      openings: 1,
      postedDaysAgo: j.postingDate
        ? Math.min(
            89,
            Math.max(0, Math.floor((Date.now() - new Date(j.postingDate).getTime()) / 86400000) || 7),
          )
        : 7,
      emerging: emerging.length ? emerging : undefined,
      trend: 'rising' as const,
    };
  });
}

export function DemandIntelligence() {
  const [sector, setSector] = useState<SectorKey>('all');
  const [district, setDistrict] = useState<DistrictKey | 'all'>('all');
  const [experience, setExperience] = useState<ExperienceKey>('all');
  const [timeWindow, setTimeWindow] = useState<WindowKey>('90d');
  const [vSummary, setVSummary] = useState(() => validationSummary());
  const [jobs, setJobs] = useState<MarketJob[]>(() => readJobs());
  const [market, setMarket] = useState<MarketSnapshot | null>(() => readMarketSnapshot());
  const [region, setRegion] = useState(() => readPreferredRegion() || 'Maharashtra');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const reloadLive = useCallback(() => {
    setJobs(readJobs());
    setMarket(readMarketSnapshot());
  }, []);

  useEffect(() => {
    const refresh = () => setVSummary(validationSummary());
    refresh();
    window.addEventListener('eduroute:employer-validation-updated', refresh);
    return () => window.removeEventListener('eduroute:employer-validation-updated', refresh);
  }, []);

  useEffect(() => {
    const onUp = () => reloadLive();
    window.addEventListener('eduroute:mt-jobs-updated', onUp);
    window.addEventListener('eduroute:market-trends-updated', onUp);
    window.addEventListener('storage', onUp);
    window.addEventListener('focus', onUp);
    return () => {
      window.removeEventListener('eduroute:mt-jobs-updated', onUp);
      window.removeEventListener('eduroute:market-trends-updated', onUp);
      window.removeEventListener('storage', onUp);
      window.removeEventListener('focus', onUp);
    };
  }, [reloadLive]);

  const regionJobs = useMemo(() => jobsForRegion(jobs, region), [jobs, region]);
  const liveSignals = useMemo(() => marketJobsToSignals(regionJobs), [regionJobs]);
  const useLive = liveSignals.length >= 8;
  const baseSignals: JobSignal[] = useLive ? liveSignals : JOB_SIGNALS;

  const filtered = useMemo(
    () => filterSignals(baseSignals, { sector, district, experience, window: timeWindow }),
    [baseSignals, sector, district, experience, timeWindow],
  );

  const kpis = useMemo(() => kpiFromSignals(filtered), [filtered]);
  const skills = useMemo(() => {
    if (useLive && regionJobs.length) {
      const demand = computeSkillDemand(regionJobs).slice(0, 12);
      const maxPct = demand[0]?.demandPct || 1;
      return demand.map((d) => ({
        skill: d.skill,
        openings: d.jobCount,
        demand: Math.min(99, Math.round((d.demandPct / maxPct) * 95)),
        trend: 'rising' as const,
        emerging: /ai|ml|cloud|kubernetes|genai/i.test(d.skill),
      }));
    }
    return aggregateSkills(filtered);
  }, [useLive, regionJobs, filtered]);

  const roles = useMemo(() => {
    if (market?.topRoles?.length) {
      return market.topRoles.slice(0, 8).map((r) => ({
        role: r.role,
        score: r.openingsIndex,
        direction: 'rising' as const,
        delta: Math.max(5, Math.round(r.openingsIndex / 10)),
      }));
    }
    return aggregateRoles(filtered);
  }, [market, filtered]);

  const heat = useMemo(() => aggregateDistricts(filtered), [filtered]);
  const risingSkills = market?.risingSkills?.slice(0, 6) || [];
  const decliningSkills = market?.decliningSkills?.slice(0, 4) || [];

  const selectCls =
    'rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--accent)]';

  const collect = async () => {
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      writePreferredRegion(region);
      const res = await apiCollectJobs(region);
      if (!res.ok) {
        setErr(res.error || 'Collect failed');
        return;
      }
      reloadLive();
      setMsg(
        `Collected live jobs for ${region}. Sources: Adzuna + data.gov.in + curated. ${res.note || ''}`.slice(
          0,
          200,
        ),
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Collect error');
    } finally {
      setBusy(false);
    }
  };

  const refreshAi = async () => {
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      writePreferredRegion(region);
      if (readJobs().length < 10) await apiCollectJobs(region);
      const res = await apiRefreshMarket(region);
      if (!res.ok) {
        setErr(res.error || 'AI refresh failed');
        return;
      }
      reloadLive();
      setMsg(`AI trends refreshed for ${region} via ${res.provider || 'AI'} on live API job data.`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Refresh error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-full overflow-hidden text-[var(--text-primary)]">
      <div className="pointer-events-none absolute inset-0 z-0 opacity-40 dark:opacity-70">
        <StarfieldBackground />
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 via-transparent to-[var(--bg-primary)]" />
      </div>

      <div className="relative z-10 space-y-6 p-4 sm:p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              SIH26134 · Labour market intelligence
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">Demand Intelligence</h1>
            <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
              Live job signals from the same pipeline as Market Trend Engine (Adzuna + data.gov.in +
              curated). Collect / AI refresh pulls real API data. Mock signals only if no live jobs yet.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 px-3 py-2 text-xs font-bold shadow-[var(--shadow-card)] backdrop-blur-sm">
              <Activity className={`h-3.5 w-3.5 ${useLive ? 'text-emerald-500' : 'text-amber-500'}`} />
              {useLive ? `Live · ${filtered.length} postings` : `Mock · ${filtered.length} postings`}
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void collect()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-xs font-bold disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
              Collect jobs
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void refreshAi()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white shadow-lg disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Refresh AI
            </button>
          </div>
        </motion.div>

        {msg && (
          <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-800 dark:text-emerald-200">
            {msg}
          </p>
        )}
        {err && (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-700 dark:text-rose-300" role="alert">
            {err}
          </p>
        )}

        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 p-4">
          <label className="flex min-w-[200px] flex-1 flex-col gap-1">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-[var(--text-muted)]">
              <MapPin className="h-3 w-3" /> Region (live data)
            </span>
            <select
              className={selectCls}
              value={region}
              disabled={busy}
              onChange={(e) => {
                setRegion(e.target.value);
                writePreferredRegion(e.target.value);
              }}
            >
              {MARKET_REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <p className="pb-2 text-xs text-[var(--text-muted)]">
            {useLive
              ? `${regionJobs.length} live jobs in scope · same pool as admin Market Trend Engine`
              : 'No live jobs yet — showing mock signals. Click Collect jobs.'}
          </p>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-emerald-500/30 bg-[var(--bg-card)]/90 p-4 shadow-[var(--shadow-card)] backdrop-blur-sm"
        >
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
              <ClipboardCheck className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold">Employer validation results</h2>
              <p className="text-xs text-[var(--text-muted)]">From Industry workspace</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: 'Course ratings', value: vSummary.ratingsCount, sub: vSummary.avgRating ? `avg ${vSummary.avgRating}/5` : '—' },
              { label: 'Skills tagged', value: vSummary.skillsCount, sub: `${vSummary.mustHave} must` },
              { label: 'Curriculum OK', value: vSummary.approved, sub: 'approved' },
              { label: 'Curriculum no', value: vSummary.rejected, sub: 'rejected' },
              { label: 'Surveys', value: vSummary.surveysCount, sub: 'employer' },
              { label: 'Job-ready', value: vSummary.avgRating || '—', sub: 'avg rating' },
            ].map((k) => (
              <div key={k.label} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)]/80 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase text-[var(--text-muted)]">{k.label}</p>
                <p className="text-xl font-black">{k.value}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{k.sub}</p>
              </div>
            ))}
          </div>
          {vSummary.ratingsCount === 0 && vSummary.surveysCount === 0 && (
            <p className="mt-2 flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <MessageSquare className="h-3.5 w-3.5" /> No employer input yet.
            </p>
          )}
        </motion.section>

        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase text-[var(--text-muted)]">
            <Filter className="h-3.5 w-3.5" /> Filters
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Sector</span>
              <select className={selectCls} value={sector} onChange={(e) => setSector(e.target.value as SectorKey)}>
                {SECTORS.map((s) => (
                  <option key={s} value={s}>{s === 'all' ? 'All sectors' : s}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">District</span>
              <select className={selectCls} value={district} onChange={(e) => setDistrict(e.target.value as DistrictKey | 'all')}>
                <option value="all">All districts</option>
                {DISTRICTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Experience</span>
              <select className={selectCls} value={experience} onChange={(e) => setExperience(e.target.value as ExperienceKey)}>
                {EXPERIENCE_LEVELS.map((x) => (
                  <option key={x} value={x}>{x === 'all' ? 'All levels' : x}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Window</span>
              <select className={selectCls} value={timeWindow} onChange={(e) => setTimeWindow(e.target.value as WindowKey)}>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </label>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            { label: 'Openings', value: kpis.totalOpenings, icon: Briefcase, tone: 'bg-indigo-500/20 text-indigo-300' },
            { label: 'Unique roles', value: kpis.roles, icon: Target, tone: 'bg-violet-500/20 text-violet-300' },
            { label: 'Skills in demand', value: kpis.skills, icon: Zap, tone: 'bg-amber-500/20 text-amber-300' },
            { label: 'Emerging-tagged', value: kpis.emerging, icon: Sparkles, tone: 'bg-emerald-500/20 text-emerald-300' },
            { label: 'Rising roles', value: kpis.rising, icon: TrendingUp, tone: 'bg-sky-500/20 text-sky-300' },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 p-4">
              <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${k.tone}`}>
                <k.icon className="h-4 w-4" />
              </div>
              <p className="text-xs font-bold uppercase text-[var(--text-muted)]">{k.label}</p>
              <p className="mt-1 text-2xl font-black">{k.value}</p>
            </div>
          ))}
        </div>

        {(risingSkills.length > 0 || decliningSkills.length > 0) && (
          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
                <Sparkles className="h-4 w-4 text-violet-400" /> AI rising skills ({region})
              </h2>
              <ul className="space-y-2">
                {risingSkills.map((s) => (
                  <li key={s.skill} className="flex justify-between text-sm">
                    <span className="font-semibold">{s.skill}</span>
                    <span className="text-[var(--text-muted)]">{s.demandScore}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
                <ArrowDownRight className="h-4 w-4 text-rose-400" /> AI declining skills
              </h2>
              <ul className="space-y-2">
                {decliningSkills.map((s) => (
                  <li key={s.skill} className="flex justify-between text-sm">
                    <span className="font-semibold">{s.skill}</span>
                    <span className="text-[var(--text-muted)]">{s.demandScore}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 p-5 xl:col-span-3">
            <h2 className="mb-1 text-sm font-bold">Top skills in demand</h2>
            <p className="mb-4 text-xs text-[var(--text-muted)]">
              {useLive ? 'From live Adzuna + data.gov + curated' : 'From mock signals'}
            </p>
            {skills.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No signals match.</p>
            ) : (
              <ul className="space-y-3">
                {skills.map((row) => (
                  <li key={row.skill}>
                    <div className="mb-1 flex justify-between text-xs font-bold">
                      <span>{row.skill}{row.emerging ? ' · EMERGING' : ''}</span>
                      <span className="text-[var(--text-muted)]">{row.openings} · {row.demand}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                      <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" style={{ width: `${Math.max(6, row.demand)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 p-5 xl:col-span-2">
            <h2 className="mb-3 text-sm font-bold">Roles</h2>
            <ul className="space-y-2.5">
              {roles.map((r) => (
                <li key={r.role} className="flex items-center justify-between rounded-xl border border-[var(--border-default)] px-3 py-2.5">
                  <div>
                    <p className="text-xs font-bold">{r.role}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">Score {r.score}</p>
                  </div>
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-emerald-600 dark:text-emerald-300">
                    <ArrowUpRight className="h-3 w-3" />+{r.delta}%
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 p-5">
          <h2 className="mb-4 text-sm font-bold">District heatmap</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {heat.map((d) => (
              <button
                key={d.district}
                type="button"
                onClick={() => setDistrict(d.district)}
                className={`rounded-2xl border p-4 text-left ${
                  district === d.district ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-[var(--border-default)]'
                }`}
                style={{ background: `linear-gradient(135deg, rgba(99,102,241,${0.08 + d.intensity / 200}) 0%, rgba(139,92,246,${0.05 + d.intensity / 250}) 100%)` }}
              >
                <p className="text-sm font-bold">{d.district}</p>
                <p className="mt-1 text-2xl font-black">{d.openings}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 p-5">
          <h2 className="mb-3 text-sm font-bold">Job postings sample</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-default)] text-[10px] uppercase text-[var(--text-muted)]">
                  <th className="py-2 pr-2">Role</th>
                  <th className="py-2 pr-2">Company</th>
                  <th className="py-2 pr-2">District</th>
                  <th className="py-2 pr-2">Skills</th>
                  <th className="py-2">Flags</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 20).map((job) => (
                  <tr key={job.id} className="border-b border-[var(--border-default)]/60">
                    <td className="py-2.5 pr-2 font-bold">{job.title}</td>
                    <td className="py-2.5 pr-2 text-[var(--text-secondary)]">{job.company}</td>
                    <td className="py-2.5 pr-2">{job.district}</td>
                    <td className="py-2.5 pr-2 text-[var(--text-muted)]">{job.skills.slice(0, 4).join(', ')}</td>
                    <td className="py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {(job.emerging || []).map((tag) => (
                          <span key={tag} className={`rounded-full px-2 py-0.5 text-[10px] font-black ring-1 ${EMERGING_COLORS[tag] || EMERGING_COLORS.AI}`}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="py-6 text-center text-sm text-[var(--text-muted)]">No postings match.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default DemandIntelligence;

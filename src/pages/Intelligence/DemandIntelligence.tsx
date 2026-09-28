import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Briefcase,
  Database,
  Loader2,
  MapPin,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { StarfieldBackground } from '../../components/StarfieldBackground';
import {
  apiCollectJobs,
  computeSkillDemand,
  jobsForRegion,
  readJobs,
  type MarketJob,
} from '../../utils/marketEngineStore';
import { nsqfNosBadgeText } from '../../utils/nsqfNosMap';
import {
  apiRefreshMarket,
  MARKET_REGIONS,
  readMarketSnapshot,
  readPreferredRegion,
  writePreferredRegion,
  type MarketSnapshot,
} from '../../utils/marketTrendStore';

const REGION_OPTIONS = MARKET_REGIONS;

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 p-4 shadow-[var(--shadow-card)] backdrop-blur-sm"
    >
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-black text-[var(--text-primary)]">{value}</p>
      {hint && <p className="mt-1 text-[10px] font-semibold text-[var(--text-muted)]">{hint}</p>}
    </motion.div>
  );
}

export function DemandIntelligence() {
  const [region, setRegion] = useState(() => readPreferredRegion() || 'Maharashtra');
  const [jobs, setJobs] = useState<MarketJob[]>(() => readJobs());
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(() => readMarketSnapshot());
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const refreshLocal = useCallback(() => {
    setJobs(readJobs());
    setSnapshot(readMarketSnapshot());
  }, []);

  useEffect(() => {
    writePreferredRegion(region);
  }, [region]);

  useEffect(() => {
    const onJobs = () => refreshLocal();
    const onMarket = () => refreshLocal();
    window.addEventListener('eduroute:jobs-updated', onJobs);
    window.addEventListener('eduroute:market-updated', onMarket);
    return () => {
      window.removeEventListener('eduroute:jobs-updated', onJobs);
      window.removeEventListener('eduroute:market-updated', onMarket);
    };
  }, [refreshLocal]);

  const regionJobs = useMemo(() => jobsForRegion(jobs, region), [jobs, region]);
  const skillDemand = useMemo(() => computeSkillDemand(regionJobs), [regionJobs]);

  const roles = useMemo(() => {
    const map = new Map<string, { role: string; score: number; delta: number; count: number }>();
    for (const j of regionJobs) {
      const role = (j.title || 'Role').split(/[-|@]/)[0].trim() || 'Role';
      const cur = map.get(role) || { role, score: 0, delta: 0, count: 0 };
      cur.count += 1;
      cur.score += Number(j.salaryMax || j.salaryMin || 0) > 0 ? 1 : 0.5;
      map.set(role, cur);
    }
    return Array.from(map.values())
      .map((r) => ({
        ...r,
        score: Math.round(r.score * 10 + r.count),
        delta: Math.min(28, 4 + r.count * 2),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [regionJobs]);

  const topSkills = useMemo(
    () =>
      skillDemand.slice(0, 10).map((s) => ({
        skill: s.skill,
        openings: s.count,
        demand: Math.min(100, Math.round((s.count / Math.max(1, regionJobs.length)) * 100 + s.count * 3)),
        emerging: s.count <= 3,
      })),
    [skillDemand, regionJobs.length],
  );

  const collect = async () => {
    setLoading(true);
    setMsg('');
    try {
      const res = await apiCollectJobs({ region, limit: 40 });
      refreshLocal();
      setMsg(`Collected ${res?.added ?? 0} jobs for ${region}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Collect failed');
    } finally {
      setLoading(false);
    }
  };

  const refreshTrends = async () => {
    setLoading(true);
    setMsg('');
    try {
      await apiRefreshMarket(region);
      refreshLocal();
      setMsg('Market snapshot refreshed');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Refresh failed');
    } finally {
      setLoading(false);
    }
  };

  const totalOpenings = regionJobs.length;
  const avgDemand = topSkills.length
    ? Math.round(topSkills.reduce((a, s) => a + s.demand, 0) / topSkills.length)
    : 0;
  const emergingCount = topSkills.filter((s) => s.emerging).length;

  return (
    <div className="relative min-h-full overflow-hidden text-[var(--text-primary)]">
      <div className="pointer-events-none absolute inset-0 z-0 opacity-35 dark:opacity-65">
        <StarfieldBackground />
        <div className="absolute inset-0 bg-gradient-to-b from-violet-500/5 via-transparent to-[var(--bg-primary)]" />
      </div>

      <div className="relative z-10 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Live market signal
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">Demand Intelligence</h1>
            <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
              State-wise skill demand from job collection + trend snapshot. NSQF/NOS badges map skills to
              qualification levels (local catalog).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 px-3 py-2 text-xs font-bold shadow-[var(--shadow-card)] backdrop-blur-sm">
              <MapPin className="h-3.5 w-3.5 text-violet-500" />
              <select
                className="bg-transparent text-[var(--text-primary)] outline-none"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                {REGION_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={loading}
              onClick={collect}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
              Collect jobs
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={refreshTrends}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3.5 py-2 text-xs font-bold disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Trends
            </button>
          </div>
        </motion.div>

        {msg && (
          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{msg}</p>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Openings"
            value={totalOpenings}
            hint={region}
            icon={Briefcase}
            tone="bg-indigo-500/20 text-indigo-300"
          />
          <StatCard
            label="Avg skill demand"
            value={`${avgDemand}%`}
            hint="Top skills"
            icon={Activity}
            tone="bg-violet-500/20 text-violet-300"
          />
          <StatCard
            label="Emerging skills"
            value={emergingCount}
            hint="Low volume / rising"
            icon={Sparkles}
            tone="bg-amber-500/20 text-amber-300"
          />
          <StatCard
            label="Snapshot"
            value={snapshot?.updatedAt ? 'Live' : '—'}
            hint={snapshot?.region || region}
            icon={TrendingUp}
            tone="bg-emerald-500/20 text-emerald-300"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 p-5 shadow-[var(--shadow-card)] backdrop-blur-sm xl:col-span-3">
            <h2 className="mb-1 text-sm font-bold">Top skills in demand — {region}</h2>
            <p className="mb-4 text-xs text-[var(--text-muted)]">
              From collected jobs · NSQF/NOS badges where mapped
            </p>
            {topSkills.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">Collect jobs to see demand for this state.</p>
            ) : (
              <ul className="space-y-3">
                {topSkills.map((row) => (
                  <li key={row.skill}>
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                      <span className="inline-flex flex-wrap items-center gap-1.5">
                        {row.skill}
                        {row.emerging ? ' · EMERGING' : ''}
                        {nsqfNosBadgeText(row.skill) && (
                          <span className="rounded-full border border-indigo-400/30 bg-indigo-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-indigo-300">
                            {nsqfNosBadgeText(row.skill)}
                          </span>
                        )}
                      </span>
                      <span className="text-[var(--text-muted)]">
                        {row.openings} jobs · {row.demand}%
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                        style={{ width: `${Math.max(6, row.demand)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 p-5 xl:col-span-2">
            <h2 className="mb-3 text-sm font-bold">Top roles — {region}</h2>
            <ul className="space-y-2.5">
              {roles.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">No roles yet.</p>
              ) : (
                roles.map((r) => (
                  <li
                    key={r.role}
                    className="flex items-center justify-between rounded-xl border border-[var(--border-default)] px-3 py-2.5"
                  >
                    <div>
                      <p className="text-xs font-bold">{r.role}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        Score {r.score}
                        {nsqfNosBadgeText(r.role) ? ` · ${nsqfNosBadgeText(r.role)}` : ''}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-emerald-600 dark:text-emerald-300">
                      <ArrowUpRight className="h-3 w-3" />+{r.delta}%
                    </span>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>

        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 p-5 shadow-[var(--shadow-card)] backdrop-blur-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold">Recent jobs — {region}</h2>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--text-muted)]">
              <Zap className="h-3 w-3 text-amber-500" />
              {regionJobs.length} rows
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-default)] text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="pb-2 pr-3">Title</th>
                  <th className="pb-2 pr-3">Company</th>
                  <th className="pb-2 pr-3">Location</th>
                  <th className="pb-2">Skills</th>
                </tr>
              </thead>
              <tbody>
                {regionJobs.slice(0, 20).map((j) => (
                  <tr key={j.id} className="border-b border-[var(--border-default)]/60">
                    <td className="py-2.5 pr-3 font-bold">{j.title}</td>
                    <td className="py-2.5 pr-3 text-[var(--text-secondary)]">{j.company || '—'}</td>
                    <td className="py-2.5 pr-3 text-[var(--text-muted)]">{j.location || region}</td>
                    <td className="py-2.5 text-[var(--text-muted)]">
                      {(j.skills || []).slice(0, 4).join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {regionJobs.length === 0 && (
              <p className="py-6 text-center text-sm text-[var(--text-muted)]">
                No jobs for this state — click Collect jobs.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default DemandIntelligence;

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Loader2,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  MapPin,
  Database,
  Filter,
  History,
  Briefcase,
  Layers,
  Zap,
} from 'lucide-react';
import {
  apiRefreshMarket,
  hoursSinceMarketRefresh,
  MARKET_REGIONS,
  monthDueForRefresh,
  readMarketSnapshot,
  readPreferredRegion,
  writePreferredRegion,
  type MarketSnapshot,
} from '../../utils/marketTrendStore';
import {
  apiCollectJobs,
  computeSkillDemand,
  filterJobs,
  readJobs,
  readRuns,
  type CollectionRun,
  type MarketJob,
} from '../../utils/marketEngineStore';

export function AdminMarketTrends() {
  const [market, setMarket] = useState<MarketSnapshot | null>(() => readMarketSnapshot());
  const [region, setRegion] = useState(() => readPreferredRegion());
  const [jobs, setJobs] = useState<MarketJob[]>(() => readJobs());
  const [runs, setRuns] = useState<CollectionRun[]>(() => readRuns());
  const [busy, setBusy] = useState(false);
  const [collectBusy, setCollectBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [filters, setFilters] = useState({ role: '', industry: '', location: '', experience: '' });

  const reload = useCallback(() => {
    setMarket(readMarketSnapshot());
    setJobs(readJobs());
    setRuns(readRuns());
  }, []);

  useEffect(() => {
    const onUp = () => reload();
    window.addEventListener('eduroute:market-trends-updated', onUp);
    window.addEventListener('eduroute:mt-jobs-updated', onUp);
    window.addEventListener('eduroute:mt-runs-updated', onUp);
    return () => {
      window.removeEventListener('eduroute:market-trends-updated', onUp);
      window.removeEventListener('eduroute:mt-jobs-updated', onUp);
      window.removeEventListener('eduroute:mt-runs-updated', onUp);
    };
  }, [reload]);

  const due = monthDueForRefresh(market?.updatedAt);
  const hoursAgo = hoursSinceMarketRefresh(market?.updatedAt);
  const filtered = useMemo(() => filterJobs(jobs, filters), [jobs, filters]);
  const demand = useMemo(() => computeSkillDemand(filtered), [filtered]);
  const sourceBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    jobs.forEach((j) => {
      counts[j.source] = (counts[j.source] || 0) + 1;
    });
    return counts;
  }, [jobs]);

  const maxDemand = demand[0]?.demandPct || 1;

  const onRegionChange = (value: string) => {
    setRegion(value);
    writePreferredRegion(value);
  };

  const refresh = async () => {
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      writePreferredRegion(region);
      const res = await apiRefreshMarket(region);
      if (!res.ok) {
        setErr(res.error || 'Refresh failed');
        return;
      }
      setMarket(res.market || readMarketSnapshot());
      const who =
        res.provider === 'groq' ? 'Groq' : res.provider === 'local-fallback' ? 'baseline + job demand' : 'Gemini AI';
      const n = (res.market as { jobCount?: number } | undefined)?.jobCount;
      setMsg(
        `Market trends refreshed for ${region} via ${who}` +
          (typeof n === 'number' ? ` using ${n} collected jobs (Adzuna + data.gov + curated).` : '.'),
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Network error');
    } finally {
      setBusy(false);
    }
  };

  const collect = async () => {
    setCollectBusy(true);
    setErr('');
    setMsg('');
    try {
      const res = await apiCollectJobs(region);
      if (!res.ok) {
        setErr(res.error || 'Collect failed');
        return;
      }
      setJobs(res.jobs || readJobs());
      setRuns(readRuns());
      const r = res.run;
      setMsg(
        r
          ? `Collection ${r.status}: fetched ${r.jobsFetched}, inserted ${r.jobsInserted}, duplicates ${r.jobsDuplicate}. Source: ${r.source}.`
          : 'Jobs collected.',
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Collect error');
    } finally {
      setCollectBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 text-[var(--text-primary)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Admin · LMI Engine</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">Market Trend Engine</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
            Live job + open-gov signals → skill demand by <strong>state / All-India</strong> → AI trends grounded on
            collected data → student gaps. Sources: <strong>Adzuna</strong> + <strong>data.gov.in</strong> (Skill India /
            PLFS) + <strong>curated-public</strong>. Official APIs only — no restricted scraping.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={collectBusy}
            onClick={collect}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-2.5 text-sm font-bold disabled:opacity-60"
          >
            {collectBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            Collect jobs
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={refresh}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {busy ? 'Refreshing…' : 'Refresh AI trends'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
        <label className="flex min-w-[200px] flex-1 flex-col gap-1.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
            <MapPin className="h-3.5 w-3.5" /> Region / State
          </span>
          <select
            value={region}
            onChange={(e) => onRegionChange(e.target.value)}
            disabled={busy || collectBusy}
            className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/40"
          >
            {MARKET_REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2 pb-1">
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300">
            adzuna
          </span>
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase text-amber-800 dark:text-amber-200">
            data.gov.in
          </span>
          <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-[10px] font-bold uppercase text-sky-700 dark:text-sky-300">
            curated-public
          </span>
          <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-[10px] font-bold uppercase text-violet-700 dark:text-violet-300">
            AI on collected data
          </span>
        </div>
      </div>

      {due && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          AI snapshot due (24h+ or seed). Click <strong>Refresh AI trends</strong> for the selected region.
          {hoursAgo != null && !market?.isSeed && (
            <span className="ml-1 opacity-80">Last refresh ~{hoursAgo}h ago.</span>
          )}
        </div>
      )}
      {msg && (
        <p className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-800 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4" /> {msg}
        </p>
      )}
      {err && (
        <p
          className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-700 dark:text-rose-300"
          role="alert"
        >
          {err}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi title="Jobs stored" value={String(jobs.length)} sub="After dedupe" />
        <Kpi title="Filtered view" value={String(filtered.length)} sub="Role / industry / location" />
        <Kpi
          title="By source"
          value={
            Object.keys(sourceBreakdown).length === 0
              ? '—'
              : Object.entries(sourceBreakdown)
                  .map(([k, v]) => `${k.split('-')[0]} ${v}`)
                  .join(' · ')
          }
          sub="Live + public"
        />
        <Kpi
          title="Last collection"
          value={runs[0] ? new Date(runs[0].finishedAt || runs[0].startedAt).toLocaleDateString() : '—'}
          sub={runs[0]?.status || 'No runs yet'}
        />
      </div>

      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase text-[var(--text-muted)]">
          <Filter className="h-4 w-4" /> Job filters
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(['role', 'industry', 'location', 'experience'] as const).map((key) => (
            <input
              key={key}
              value={filters[key]}
              onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}
              placeholder={key.charAt(0).toUpperCase() + key.slice(1)}
              className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
        <h2 className="mb-4 text-sm font-black uppercase tracking-wide text-[var(--text-muted)]">
          Skill demand from collected jobs
        </h2>
        {demand.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Collect jobs to compute demand %.</p>
        ) : (
          <ul className="space-y-3">
            {demand.slice(0, 12).map((row) => (
              <li key={row.skill}>
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-semibold">{row.skill}</span>
                  <span className="tabular-nums text-[var(--text-muted)]">
                    {row.jobCount} jobs · <strong className="text-[var(--text-primary)]">{row.demandPct}%</strong>
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all"
                    style={{ width: `${Math.min(100, (row.demandPct / maxDemand) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[11px] text-[var(--text-muted)]">
          Share of filtered postings mentioning each skill. Historical growth needs multiple collection windows.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase text-[var(--text-muted)]">
          <History className="h-4 w-4" /> Collection history
        </h2>
        {runs.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No collection runs yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {runs.slice(0, 8).map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border-default)] px-3 py-2"
              >
                <span className="font-semibold">{r.source}</span>
                <span className="text-[var(--text-muted)]">
                  {r.status} · +{r.jobsInserted} / dup {r.jobsDuplicate}
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  {new Date(r.finishedAt || r.startedAt).toLocaleString()}
                </span>
                {r.errorMessage && <span className="w-full text-xs text-rose-500">{r.errorMessage}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {!market ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--bg-card)] p-10 text-center">
          <TrendingUp className="mx-auto mb-3 h-10 w-10 text-[var(--text-muted)]" />
          <p className="font-bold">No AI market snapshot yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2 py-0.5 text-violet-700 dark:text-violet-300">
                <Sparkles className="h-3 w-3" />{' '}
                {market.provider === 'groq'
                  ? 'Groq'
                  : market.provider === 'local-fallback'
                    ? 'Baseline'
                    : market.provider === 'seed'
                      ? 'Seed'
                      : 'Gemini'}
              </span>
              <span>{market.region || region}</span>
              <span>· Updated {new Date(market.updatedAt).toLocaleString()}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{market.summary}</p>
            {market.sourcesNote && (
              <p className="mt-2 text-[11px] text-[var(--text-muted)]">{market.sourcesNote}</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <SkillList title="Rising skills (AI)" items={market.risingSkills} tone="emerald" />
            <SkillList title="Declining skills (AI)" items={market.decliningSkills} tone="rose" />
          </div>

          {(market.topRoles?.length || market.sectors?.length) && (
            <div className="grid gap-4 md:grid-cols-2">
              {market.topRoles && market.topRoles.length > 0 && (
                <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase text-[var(--text-muted)]">
                    <Briefcase className="h-4 w-4" /> Top roles
                  </h2>
                  <ul className="space-y-2">
                    {market.topRoles.map((r) => (
                      <li key={r.role} className="flex items-center justify-between gap-2 text-sm">
                        <span className="font-semibold">{r.role}</span>
                        <span className="tabular-nums text-[var(--text-muted)]">
                          {r.openingsIndex}
                          {r.avgSalaryLpa != null ? ` · ~${r.avgSalaryLpa} LPA` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {market.sectors && market.sectors.length > 0 && (
                <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase text-[var(--text-muted)]">
                    <Layers className="h-4 w-4" /> Sectors
                  </h2>
                  <ul className="space-y-3">
                    {market.sectors.map((s) => (
                      <li key={s.name}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="font-semibold">{s.name}</span>
                          <span className="tabular-nums text-[var(--text-muted)]">{s.demandScore}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                          <div
                            className="h-full rounded-full bg-indigo-500"
                            style={{ width: `${Math.min(100, s.demandScore)}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {market.emergingTech && market.emergingTech.length > 0 && (
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase text-[var(--text-muted)]">
                <Zap className="h-4 w-4" /> Emerging tech
              </h2>
              <div className="flex flex-wrap gap-2">
                {market.emergingTech.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Kpi({ title, value, sub }: { title: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
      <p className="text-xs font-bold uppercase text-[var(--text-muted)]">{title}</p>
      <p className="mt-1 truncate text-xl font-black tracking-tight">{value}</p>
      <p className="text-xs text-[var(--text-muted)]">{sub}</p>
    </div>
  );
}

function SkillList({
  title,
  items,
  tone,
}: {
  title: string;
  items?: { skill: string; demandScore: number; note?: string }[];
  tone: 'emerald' | 'rose';
}) {
  if (!items?.length) return null;
  const bar = tone === 'emerald' ? 'bg-emerald-500' : 'bg-rose-500';
  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
      <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-[var(--text-muted)]">{title}</h2>
      <ul className="space-y-3">
        {items.slice(0, 10).map((s) => (
          <li key={s.skill}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="font-semibold">{s.skill}</span>
              <span className="tabular-nums text-[var(--text-muted)]">{s.demandScore}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
              <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.min(100, s.demandScore)}%` }} />
            </div>
            {s.note && <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{s.note}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AdminMarketTrends;

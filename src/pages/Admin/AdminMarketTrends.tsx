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
} from 'lucide-react';
import {
  apiRefreshMarket,
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
  const filtered = useMemo(() => filterJobs(jobs, filters), [jobs, filters]);
  const demand = useMemo(() => computeSkillDemand(filtered), [filtered]);
  const sourceBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    jobs.forEach((j) => {
      counts[j.source] = (counts[j.source] || 0) + 1;
    });
    return counts;
  }, [jobs]);

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
        res.provider === 'groq' ? 'Groq' : res.provider === 'local-fallback' ? 'baseline data' : 'Gemini AI';
      setMsg(`Market trends refreshed for ${region} via ${who}.`);
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
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Admin · Engine</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">Market Trend Engine</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
            Collect live jobs via <strong>Adzuna API</strong> (when configured) plus curated public seed. Dedupe,
            normalize skills, demand %. AI refresh updates the student-facing snapshot. No restricted scraping.
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
        <p className="max-w-lg pb-1 text-xs text-[var(--text-muted)]">
          Sources:{' '}
          <strong>adzuna</strong> (official Jobs API, India) + <strong>curated-public</strong> seed. Netlify env:{' '}
          <code className="text-[10px]">ADZUNA_APP_ID</code>, <code className="text-[10px]">ADZUNA_APP_KEY</code>. Optional
          SQL: <code className="text-[10px]">docs/sql/market_trend_schema.sql</code>
        </p>
      </div>

      {due && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Monthly AI refresh due (or no snapshot yet).
        </div>
      )}
      {msg && (
        <p className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-800 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4" /> {msg}
        </p>
      )}
      {err && (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-700 dark:text-rose-300" role="alert">
          {err}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
          <p className="text-xs font-bold uppercase text-[var(--text-muted)]">Jobs stored</p>
          <p className="mt-1 text-2xl font-black">{jobs.length}</p>
          <p className="text-xs text-[var(--text-muted)]">After dedupe by source + external id</p>
        </div>
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
          <p className="text-xs font-bold uppercase text-[var(--text-muted)]">Filtered</p>
          <p className="mt-1 text-2xl font-black">{filtered.length}</p>
          <p className="text-xs text-[var(--text-muted)]">Role / industry / location / experience</p>
        </div>
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
          <p className="text-xs font-bold uppercase text-[var(--text-muted)]">By source</p>
          <p className="mt-1 text-xs font-semibold leading-relaxed">
            {Object.keys(sourceBreakdown).length === 0
              ? '—'
              : Object.entries(sourceBreakdown)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(' · ')}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
          <p className="text-xs font-bold uppercase text-[var(--text-muted)]">Last collection</p>
          <p className="mt-1 text-sm font-bold">
            {runs[0] ? new Date(runs[0].finishedAt || runs[0].startedAt).toLocaleString() : '—'}
          </p>
          <p className="text-xs text-[var(--text-muted)]">{runs[0]?.status || 'No runs yet'}</p>
        </div>
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
        <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-[var(--text-muted)]">
          Skill demand (from collected jobs)
        </h2>
        {demand.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Collect jobs to compute demand %.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border-default)] text-xs uppercase text-[var(--text-muted)]">
                  <th className="py-2 pr-3">Skill</th>
                  <th className="py-2 pr-3">Jobs</th>
                  <th className="py-2 pr-3">Demand %</th>
                  <th className="py-2">Trend / growth</th>
                </tr>
              </thead>
              <tbody>
                {demand.slice(0, 15).map((row) => (
                  <tr key={row.skill} className="border-b border-[var(--border-default)]/60">
                    <td className="py-2 pr-3 font-semibold">{row.skill}</td>
                    <td className="py-2 pr-3 tabular-nums">{row.jobCount}</td>
                    <td className="py-2 pr-3 tabular-nums">{row.demandPct}%</td>
                    <td className="py-2 text-xs text-[var(--text-muted)]">{row.growthLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-[11px] text-[var(--text-muted)]">
          Historical growth requires multiple collection windows — shown as “Insufficient historical data” until then.
          Live rows come from Adzuna when API keys are set on Netlify.
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
                    : 'Gemini'}
              </span>
              <span>{market.region || region}</span>
              <span>· Updated {new Date(market.updatedAt).toLocaleString()}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{market.summary}</p>
            {market.sourcesNote && <p className="mt-2 text-[11px] text-[var(--text-muted)]">{market.sourcesNote}</p>}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <SkillList title="Rising skills (AI)" items={market.risingSkills} tone="emerald" />
            <SkillList title="Declining skills (AI)" items={market.decliningSkills} tone="rose" />
          </div>
        </div>
      )}
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
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AdminMarketTrends;

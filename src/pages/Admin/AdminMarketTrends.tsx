import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, TrendingUp, AlertTriangle, CheckCircle2, Sparkles, MapPin } from 'lucide-react';
import {
  apiRefreshMarket,
  MARKET_REGIONS,
  monthDueForRefresh,
  readMarketSnapshot,
  readPreferredRegion,
  writePreferredRegion,
  type MarketSnapshot,
} from '../../utils/marketTrendStore';

export function AdminMarketTrends() {
  const [market, setMarket] = useState<MarketSnapshot | null>(() => readMarketSnapshot());
  const [region, setRegion] = useState(() => readPreferredRegion());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const reload = useCallback(() => setMarket(readMarketSnapshot()), []);

  useEffect(() => {
    const onUp = () => reload();
    window.addEventListener('eduroute:market-trends-updated', onUp);
    return () => window.removeEventListener('eduroute:market-trends-updated', onUp);
  }, [reload]);

  const due = monthDueForRefresh(market?.updatedAt);

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
      const who = res.provider === 'groq' ? 'Groq' : res.provider === 'local-fallback' ? 'baseline data' : 'Gemini AI';
      setMsg(`Market trends refreshed for ${region} via ${who}.`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Network error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 text-[var(--text-primary)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Admin</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">Market trends</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
            Pick a <strong>state</strong> or <strong>India (All)</strong>, then refresh labour-market demand with AI.
            Recommended at least once a month. Students use this snapshot in Trend Analyse.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={refresh}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {busy ? 'Refreshing…' : 'Refresh market trends'}
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
        <label className="flex min-w-[220px] flex-1 flex-col gap-1.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
            <MapPin className="h-3.5 w-3.5" /> Region / State
          </span>
          <select
            value={region}
            onChange={(e) => onRegionChange(e.target.value)}
            disabled={busy}
            className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm font-semibold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-indigo-500/40"
          >
            {MARKET_REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <p className="max-w-md pb-1 text-xs text-[var(--text-muted)]">
          AI will tailor rising skills, roles, and salaries to the selected scope. Choose <strong>India (All)</strong> for
          pan-India demand.
        </p>
      </div>

      {due && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Monthly refresh due (or no snapshot yet). Select region and click refresh.
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

      {!market ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--bg-card)] p-10 text-center">
          <TrendingUp className="mx-auto mb-3 h-10 w-10 text-[var(--text-muted)]" />
          <p className="font-bold">No market snapshot yet</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Select a region and refresh. Requires <code className="text-xs">GEMINI_API_KEY</code> or{' '}
            <code className="text-xs">GROQ_API_KEY</code> on Netlify.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2 py-0.5 text-violet-700 dark:text-violet-300">
                <Sparkles className="h-3 w-3" /> {market.provider === 'groq' ? 'Groq' : market.provider === 'local-fallback' ? 'Baseline' : 'Gemini'}
              </span>
              <span>{market.region || region}</span>
              <span>· Updated {new Date(market.updatedAt).toLocaleString()}</span>
              {market.isSeed && (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-700 dark:text-amber-300">
                  Placeholder
                </span>
              )}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{market.summary}</p>
            {market.sourcesNote && (
              <p className="mt-2 text-[11px] text-[var(--text-muted)]">{market.sourcesNote}</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <SkillList title="Rising skills" items={market.risingSkills} tone="emerald" />
            <SkillList title="Declining skills" items={market.decliningSkills} tone="rose" />
          </div>

          {market.topRoles && market.topRoles.length > 0 && (
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
              <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-[var(--text-muted)]">Top roles</h2>
              <ul className="space-y-2">
                {market.topRoles.map((r) => (
                  <li key={r.role} className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-semibold">{r.role}</span>
                    <span className="text-[var(--text-muted)]">
                      demand {r.openingsIndex}
                      {r.avgSalaryLpa != null ? ` · ~${r.avgSalaryLpa} LPA` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {market.emergingTech && market.emergingTech.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {market.emergingTech.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
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
            {s.note && <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{s.note}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AdminMarketTrends;

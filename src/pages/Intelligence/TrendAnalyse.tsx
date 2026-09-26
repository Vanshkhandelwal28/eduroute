import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Loader2,
  RefreshCw,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  apiAnalyzeStudent,
  canStudentRefresh,
  readMarketSnapshot,
  readStudentAnalysis,
  studentRefreshDaysLeft,
  type MarketSnapshot,
  type StudentAnalysis,
} from '../../utils/marketTrendStore';
import {
  interestLabel,
  readOnboarding,
  type InterestTrack,
} from '../../utils/onboardingStore';

function strengthsFromOnboarding() {
  const o = readOnboarding();
  return (o.gapAnswers || []).filter((a) => a.answer === 'yes').map((a) => a.skill);
}

export function TrendAnalyse() {
  const onboarding = readOnboarding();
  const [market, setMarket] = useState<MarketSnapshot | null>(() => readMarketSnapshot());
  const [analysis, setAnalysis] = useState<StudentAnalysis | null>(() => readStudentAnalysis());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const daysLeft = studentRefreshDaysLeft();
  const canRefresh = canStudentRefresh();

  const reload = useCallback(() => {
    setMarket(readMarketSnapshot());
    setAnalysis(readStudentAnalysis());
  }, []);

  useEffect(() => {
    const onUp = () => reload();
    window.addEventListener('eduroute:market-trends-updated', onUp);
    window.addEventListener('eduroute:student-trend-updated', onUp);
    return () => {
      window.removeEventListener('eduroute:market-trends-updated', onUp);
      window.removeEventListener('eduroute:student-trend-updated', onUp);
    };
  }, [reload]);

  const field =
    onboarding.interests?.[0] != null
      ? interestLabel(onboarding.interests[0] as InterestTrack)
      : 'Software Engineering';
  const strengths = strengthsFromOnboarding();
  const gaps = onboarding.missingSkills || [];
  const allSkills = [...new Set([...strengths, ...gaps])];

  const runAnalysis = async () => {
    if (!canRefresh && analysis) {
      setErr(`You can refresh again in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`);
      return;
    }
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      const res = await apiAnalyzeStudent({
        skills: allSkills,
        strengths,
        gaps,
        field,
        interests: (onboarding.interests || []).map((id) => interestLabel(id)),
      });
      if (!res.ok) {
        setErr(res.error || 'Analysis failed');
        return;
      }
      setAnalysis(res.analysis || readStudentAnalysis());
      setMarket(readMarketSnapshot());
      setMsg('Trend analysis updated via Gemini AI.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Network error');
    } finally {
      setBusy(false);
    }
  };

  const chartData = useMemo(() => {
    if (analysis?.comparisonBars?.length) {
      return analysis.comparisonBars.map((b) => ({
        skill: b.skill.length > 14 ? b.skill.slice(0, 12) + '…' : b.skill,
        full: b.skill,
        market: b.market,
        student: b.student,
      }));
    }
    if (analysis?.marketSkills?.length) {
      return analysis.marketSkills.slice(0, 10).map((s) => ({
        skill: s.skill.length > 14 ? s.skill.slice(0, 12) + '…' : s.skill,
        full: s.skill,
        market: s.marketDemand,
        student: s.studentLevel,
      }));
    }
    return [];
  }, [analysis]);

  return (
    <div className="er-page mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
            Skill gaps · Market vs you
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[var(--text-primary)] md:text-3xl">
            Trend Analyse
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
            Real market demand (admin Gemini snapshot) compared to your onboarding skill profile.
            Refresh personal analysis at most once every 7 days.
          </p>
        </div>
        <button
          type="button"
          disabled={busy || (!canRefresh && Boolean(analysis))}
          onClick={runAnalysis}
          className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {busy
            ? 'Calling Gemini…'
            : !analysis
              ? 'Generate analysis'
              : canRefresh
                ? 'Refresh analysis'
                : `Refresh in ${daysLeft}d`}
        </button>
      </div>

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

      {!onboarding.completedAt && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            Complete the{' '}
            <Link to="/onboarding" className="font-bold underline">
              skill quiz
            </Link>{' '}
            so Gemini can compare your real profile to market demand.
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="er-card p-4">
          <p className="text-xs font-bold uppercase text-[var(--text-muted)]">Match score</p>
          <p className="mt-1 text-3xl font-black text-[var(--text-primary)]">
            {analysis?.matchScore != null ? `${analysis.matchScore}%` : '—'}
          </p>
        </div>
        <div className="er-card p-4">
          <p className="text-xs font-bold uppercase text-[var(--text-muted)]">Your track</p>
          <p className="mt-1 text-lg font-bold text-[var(--text-primary)]">{field}</p>
        </div>
        <div className="er-card p-4">
          <p className="text-xs font-bold uppercase text-[var(--text-muted)]">Market snapshot</p>
          <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
            {market?.updatedAt
              ? new Date(market.updatedAt).toLocaleDateString()
              : 'Admin has not refreshed yet'}
          </p>
        </div>
      </div>

      {analysis?.summary && (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-violet-600 dark:text-violet-400">
            <Sparkles className="h-3.5 w-3.5" /> Gemini summary
          </div>
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{analysis.summary}</p>
        </div>
      )}

      {chartData.length > 0 && (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-[var(--text-muted)]">
            <BarChart3 className="h-4 w-4" /> Market demand vs your skill level
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="skill" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number, name: string) => [value, name === 'market' ? 'Market' : 'You']}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.full || ''}
                />
                <Legend />
                <Bar dataKey="market" name="Market" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="student" name="You" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[11px] text-[var(--text-muted)]">
            Bars come from Gemini analysis of your profile + live market snapshot (not hardcoded).
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase text-[var(--text-muted)]">
            <TrendingUp className="h-4 w-4" /> Market trend (admin)
          </h2>
          {market?.summary ? (
            <>
              <p className="text-sm text-[var(--text-secondary)]">{market.summary}</p>
              {market.risingSkills && market.risingSkills.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {market.risingSkills.slice(0, 6).map((s) => (
                    <li key={s.skill} className="flex justify-between text-sm">
                      <span className="font-semibold">{s.skill}</span>
                      <span className="text-[var(--text-muted)]">{s.demandScore}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">
              No admin market snapshot yet. Ask admin to open <strong>Market Trends</strong> and refresh with
              Gemini.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase text-[var(--text-muted)]">
            <Target className="h-4 w-4" /> Your skill gaps
          </h2>
          {analysis?.skillGaps && analysis.skillGaps.length > 0 ? (
            <ul className="space-y-3">
              {analysis.skillGaps.map((g) => (
                <li key={g.skill} className="text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[var(--text-primary)]">{g.skill}</span>
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300">
                      {g.priority}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[var(--text-secondary)]">{g.why}</p>
                  <p className="mt-0.5 text-xs font-medium text-cyan-700 dark:text-cyan-300">{g.action}</p>
                </li>
              ))}
            </ul>
          ) : gaps.length > 0 ? (
            <ul className="list-inside list-disc text-sm text-[var(--text-secondary)]">
              {gaps.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">
              Generate analysis to see Gemini skill-gap recommendations.
            </p>
          )}
        </div>
      </div>

      {analysis?.recommendations && analysis.recommendations.length > 0 && (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
          <h2 className="mb-2 text-sm font-black uppercase text-[var(--text-muted)]">Recommendations</h2>
          <ul className="list-inside list-disc space-y-1 text-sm text-[var(--text-secondary)]">
            {analysis.recommendations.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          to="/skill-profile"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent)]"
        >
          Open skill profile <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          to="/ai-course-designer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-fuchsia-600 dark:text-fuchsia-400"
        >
          Design mixed course <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export default TrendAnalyse;

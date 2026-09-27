import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Database,
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
  readMarketSnapshot,
  readStudentAnalysis,
  type MarketSnapshot,
  type StudentAnalysis,
} from '../../utils/marketTrendStore';
import {
  interestLabel,
  readOnboarding,
  type InterestTrack,
  type OnboardingProfile,
} from '../../utils/onboardingStore';
import {
  computeSkillDemand,
  matchStudentToMarket,
  readJobs,
  type MarketJob,
  type SkillDemandRow,
} from '../../utils/marketEngineStore';
import { normalizeSkillList } from '../../utils/skillNormalize';

function strengthsFromProfile(o: OnboardingProfile) {
  return (o.gapAnswers || []).filter((a) => a.answer === 'yes').map((a) => a.skill);
}

function gapsFromProfile(o: OnboardingProfile) {
  const missing = [...(o.missingSkills || [])];
  if (missing.length === 0 && o.gapAnswers?.length) {
    o.gapAnswers.forEach((a) => {
      if (a.answer === 'no' && a.skill && !missing.includes(a.skill)) missing.push(a.skill);
    });
  }
  return missing;
}

export function TrendAnalyse() {
  const [profile, setProfile] = useState<OnboardingProfile>(() => readOnboarding());
  const [market, setMarket] = useState<MarketSnapshot | null>(() => readMarketSnapshot());
  const [analysis, setAnalysis] = useState<StudentAnalysis | null>(() => readStudentAnalysis());
  const [jobs, setJobs] = useState<MarketJob[]>(() => readJobs());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const skillKeyRef = useRef('');
  const autoAiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reloadAll = useCallback(() => {
    setProfile(readOnboarding());
    setMarket(readMarketSnapshot());
    setAnalysis(readStudentAnalysis());
    setJobs(readJobs());
  }, []);

  useEffect(() => {
    const onUp = () => reloadAll();
    window.addEventListener('eduroute:market-trends-updated', onUp);
    window.addEventListener('eduroute:student-trend-updated', onUp);
    window.addEventListener('eduroute:mt-jobs-updated', onUp);
    window.addEventListener('eduroute:onboarding-updated', onUp);
    window.addEventListener('storage', onUp);
    window.addEventListener('focus', onUp);
    return () => {
      window.removeEventListener('eduroute:market-trends-updated', onUp);
      window.removeEventListener('eduroute:student-trend-updated', onUp);
      window.removeEventListener('eduroute:mt-jobs-updated', onUp);
      window.removeEventListener('eduroute:onboarding-updated', onUp);
      window.removeEventListener('storage', onUp);
      window.removeEventListener('focus', onUp);
    };
  }, [reloadAll]);

  const field =
    profile.interests?.[0] != null
      ? interestLabel(profile.interests[0] as InterestTrack)
      : 'Software Engineering';
  const strengths = useMemo(() => strengthsFromProfile(profile), [profile]);
  const gaps = useMemo(() => gapsFromProfile(profile), [profile]);
  const allSkills = useMemo(
    () => normalizeSkillList([...new Set([...strengths, ...gaps])]),
    [strengths, gaps],
  );

  // Same demand engine as Admin Market Trend panel (from collected jobs)
  const demandRows: SkillDemandRow[] = useMemo(() => computeSkillDemand(jobs), [jobs]);
  const maxDemand = demandRows[0]?.demandPct || 1;

  const localMatch = useMemo(
    () => matchStudentToMarket(allSkills, jobs, market),
    [allSkills, jobs, market],
  );

  const sourceBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    jobs.forEach((j) => {
      counts[j.source] = (counts[j.source] || 0) + 1;
    });
    return counts;
  }, [jobs]);

  const runAnalysis = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setBusy(true);
      setErr('');
      setMsg('');
    }
    try {
      const o = readOnboarding();
      const s = strengthsFromProfile(o);
      const g = gapsFromProfile(o);
      const skills = normalizeSkillList([...new Set([...s, ...g])]);
      const f =
        o.interests?.[0] != null
          ? interestLabel(o.interests[0] as InterestTrack)
          : 'Software Engineering';
      const res = await apiAnalyzeStudent({
        skills,
        strengths: s,
        gaps: g,
        field: f,
        interests: (o.interests || []).map((id) => interestLabel(id)),
      });
      if (!res.ok) {
        if (!opts?.silent) setErr(res.error || 'Analysis failed');
        return;
      }
      setAnalysis(res.analysis || readStudentAnalysis());
      setMarket(readMarketSnapshot());
      if (!opts?.silent) setMsg('Trend analysis updated from admin market demand + your skills.');
    } catch (e) {
      if (!opts?.silent) setErr(e instanceof Error ? e.message : 'Network error');
    } finally {
      if (!opts?.silent) setBusy(false);
    }
  }, []);

  // When skills change, recompute local gaps immediately and soft-refresh AI (debounced)
  useEffect(() => {
    const key = allSkills.slice().sort().join('|') + '::' + gaps.join(',');
    if (key === skillKeyRef.current) return;
    const prev = skillKeyRef.current;
    skillKeyRef.current = key;
    if (!prev) return; // initial mount — don't auto-call AI
    if (autoAiTimer.current) clearTimeout(autoAiTimer.current);
    autoAiTimer.current = setTimeout(() => {
      void runAnalysis({ silent: true });
    }, 900);
    return () => {
      if (autoAiTimer.current) clearTimeout(autoAiTimer.current);
    };
  }, [allSkills, gaps, runAnalysis]);

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
    // Bars from admin job demand + whether student has the skill
    return demandRows.slice(0, 8).map((d) => ({
      skill: d.skill.length > 14 ? d.skill.slice(0, 12) + '…' : d.skill,
      full: d.skill,
      market: Math.min(100, Math.round(d.demandPct * 1.5 + 20)),
      student: allSkills.some((s) => s.toLowerCase() === d.skill.toLowerCase()) ? 72 : 22,
    }));
  }, [analysis, demandRows, allSkills]);

  const displayScore = analysis?.matchScore ?? localMatch.matchScore;

  return (
    <div className="er-page mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
            Skill Market Trends · Live admin demand
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[var(--text-primary)] md:text-3xl">
            Skill Trend Analysis
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
            Your skills are matched against the <strong>same job demand</strong> Admin collects (Adzuna +
            data.gov.in + curated). Gaps update automatically when you change skills (onboarding / skill
            profile).
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void runAnalysis()}
          className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {busy ? 'Analyzing…' : !analysis ? 'Generate analysis' : 'Refresh analysis'}
        </button>
      </div>

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

      {!profile.completedAt && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            Complete the{' '}
            <Link to="/onboarding" className="font-bold underline">
              skill quiz
            </Link>{' '}
            so gaps update against live market demand.
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="er-card p-4">
          <p className="text-xs font-bold uppercase text-[var(--text-muted)]">Match score</p>
          <p className="mt-1 text-3xl font-black text-[var(--text-primary)]">
            {displayScore != null ? `${displayScore}%` : '—'}
          </p>
        </div>
        <div className="er-card p-4">
          <p className="text-xs font-bold uppercase text-[var(--text-muted)]">Your track</p>
          <p className="mt-1 text-lg font-bold text-[var(--text-primary)]">{field}</p>
        </div>
        <div className="er-card p-4">
          <p className="text-xs font-bold uppercase text-[var(--text-muted)]">Jobs (admin pool)</p>
          <p className="mt-1 text-2xl font-black text-[var(--text-primary)]">{jobs.length}</p>
          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
            {Object.keys(sourceBreakdown).length
              ? Object.entries(sourceBreakdown)
                  .map(([k, v]) => `${k.split('-')[0]} ${v}`)
                  .join(' · ')
              : 'No jobs yet'}
          </p>
        </div>
        <div className="er-card p-4">
          <p className="text-xs font-bold uppercase text-[var(--text-muted)]">Data as of</p>
          <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
            {new Date(localMatch.dataAsOf).toLocaleString()}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[11px] text-[var(--text-muted)]">{localMatch.sourceNote}</p>
        </div>
      </div>

      {/* Admin demand — same numbers as Market Trend Engine */}
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-[var(--text-muted)]">
          <Database className="h-4 w-4" /> Skill demand from admin job pool
        </h2>
        <p className="mb-4 text-xs text-[var(--text-muted)]">
          Same demand % Admin sees after Collect jobs (Adzuna + data.gov.in + curated). Used to rank your
          gaps.
        </p>
        {demandRows.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            Admin has not collected jobs yet — showing curated seed when available.
          </p>
        ) : (
          <ul className="space-y-3">
            {demandRows.slice(0, 10).map((row) => {
              const have = allSkills.some((s) => s.toLowerCase() === row.skill.toLowerCase());
              return (
                <li key={row.skill}>
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-semibold">
                      {row.skill}{' '}
                      {have ? (
                        <span className="ml-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300">
                          you have
                        </span>
                      ) : (
                        <span className="ml-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-800 dark:text-amber-200">
                          gap
                        </span>
                      )}
                    </span>
                    <span className="tabular-nums text-[var(--text-muted)]">
                      {row.jobCount} jobs ·{' '}
                      <strong className="text-[var(--text-primary)]">{row.demandPct}%</strong>
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                    <div
                      className={`h-full rounded-full transition-all ${
                        have
                          ? 'bg-gradient-to-r from-emerald-500 to-cyan-500'
                          : 'bg-gradient-to-r from-indigo-500 to-cyan-500'
                      }`}
                      style={{ width: `${Math.min(100, (row.demandPct / maxDemand) * 100)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Matched → Gaps → Priority → Roadmap */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
          <h2 className="mb-2 text-sm font-black uppercase text-emerald-600 dark:text-emerald-400">
            Matched skills
          </h2>
          {localMatch.matched.length ? (
            <div className="flex flex-wrap gap-2">
              {localMatch.matched.map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-200"
                >
                  {s}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">
              No strong matches yet — complete onboarding or expand skills.
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
          <h2 className="mb-2 text-sm font-black uppercase text-amber-600 dark:text-amber-400">
            Skill gaps (live)
          </h2>
          {localMatch.gaps.length ? (
            <div className="flex flex-wrap gap-2">
              {localMatch.gaps.map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-900 dark:text-amber-200"
                >
                  {s}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">No major gaps against current job demand.</p>
          )}
          <p className="mt-2 text-[11px] text-[var(--text-muted)]">
            Updates automatically when you retake the skill quiz or admin refreshes jobs.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
        <h2 className="mb-3 text-sm font-black uppercase text-[var(--text-muted)]">
          Priority skills → learning recommendations
        </h2>
        <ul className="space-y-3">
          {localMatch.recommendations.map((r) => (
            <li
              key={r.skill}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border-default)] px-3 py-2 text-sm"
            >
              <div>
                <span className="font-bold">{r.skill}</span>
                <p className="text-xs text-[var(--text-secondary)]">{r.action}</p>
              </div>
              <Link
                to={r.roadmapTo}
                className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white"
              >
                Open path <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </li>
          ))}
        </ul>
        {localMatch.priority[0]?.reason && (
          <p className="mt-2 text-[11px] text-[var(--text-muted)]">{localMatch.priority[0].reason}</p>
        )}
      </div>

      {analysis?.summary && (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-violet-600 dark:text-violet-400">
            <Sparkles className="h-3.5 w-3.5" /> AI summary
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
            Market bars track admin job demand share. Student bars update when your skills change.
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase text-[var(--text-muted)]">
            <TrendingUp className="h-4 w-4" /> In-demand / rising (admin AI)
          </h2>
          {market?.risingSkills?.length ? (
            <ul className="mt-1 space-y-2">
              {market.risingSkills.slice(0, 6).map((s) => (
                <li key={s.skill} className="flex justify-between text-sm">
                  <span className="font-semibold">{s.skill}</span>
                  <span className="text-[var(--text-muted)]">{s.demandScore}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">Admin has not refreshed AI trends yet.</p>
          )}
          {market?.decliningSkills && market.decliningSkills.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold uppercase text-rose-600 dark:text-rose-400">Declining</p>
              <ul className="mt-1 space-y-1 text-sm text-[var(--text-secondary)]">
                {market.decliningSkills.slice(0, 4).map((s) => (
                  <li key={s.skill}>{s.skill}</li>
                ))}
              </ul>
            </div>
          )}
          {market?.sourcesNote && (
            <p className="mt-3 text-[11px] text-[var(--text-muted)]">{market.sourcesNote}</p>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase text-[var(--text-muted)]">
            <Target className="h-4 w-4" /> AI skill gaps
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
          ) : (
            <p className="text-sm text-[var(--text-muted)]">
              Gaps refresh when skills change; click Refresh for a full AI narrative.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link to="/skill-profile" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent)]">
          Open skill profile <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          to="/ai-course-designer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-fuchsia-600 dark:text-fuchsia-400"
        >
          Design mixed course <ArrowRight className="h-4 w-4" />
        </Link>
        <Link to="/roadmaps" className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
          Learning roadmaps <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export default TrendAnalyse;

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Loader2,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Database,
  MapPin,
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
  MARKET_REGIONS,
  readMarketSnapshot,
  readPreferredRegion,
  readStudentAnalysis,
  writePreferredRegion,
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
  buildComparisonBars,
  computeSkillDemand,
  jobsForRegion,
  matchStudentToMarket,
  readJobs,
  risingFromDemand,
  type MarketJob,
  type SkillDemandRow,
} from '../../utils/marketEngineStore';
import { normalizeSkillList } from '../../utils/skillNormalize';
import {
  buildStudentSkillProfile,
  sourceLabel,
  type StudentSkillProfile,
} from '../../utils/studentSkillProfile';

export function TrendAnalyse() {
  const [profile, setProfile] = useState<OnboardingProfile>(() => readOnboarding());
  const [market, setMarket] = useState<MarketSnapshot | null>(() => readMarketSnapshot());
  const [analysis, setAnalysis] = useState<StudentAnalysis | null>(() => readStudentAnalysis());
  const [jobs, setJobs] = useState<MarketJob[]>(() => readJobs());
  const [region, setRegion] = useState(() => readPreferredRegion() || 'India (All)');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [tick, setTick] = useState(0);
  const skillKeyRef = useRef('');
  const regionKeyRef = useRef(region);
  const autoAiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reloadAll = useCallback(() => {
    setProfile(readOnboarding());
    setMarket(readMarketSnapshot());
    setAnalysis(readStudentAnalysis());
    setJobs(readJobs());
    setTick((t) => t + 1);
  }, []);

  // Full page refresh whenever admin jobs, market, skill-gap, CV, or certificates change
  useEffect(() => {
    const onUp = () => {
      reloadAll();
    };
    window.addEventListener('eduroute:market-trends-updated', onUp);
    window.addEventListener('eduroute:student-trend-updated', onUp);
    window.addEventListener('eduroute:mt-jobs-updated', onUp);
    window.addEventListener('eduroute:onboarding-updated', onUp);
    window.addEventListener('eduroute:course-achievements-updated', onUp);
    window.addEventListener('eduroute:cv-updated', onUp);
    window.addEventListener('storage', onUp);
    window.addEventListener('focus', onUp);
    return () => {
      window.removeEventListener('eduroute:market-trends-updated', onUp);
      window.removeEventListener('eduroute:student-trend-updated', onUp);
      window.removeEventListener('eduroute:mt-jobs-updated', onUp);
      window.removeEventListener('eduroute:onboarding-updated', onUp);
      window.removeEventListener('eduroute:course-achievements-updated', onUp);
      window.removeEventListener('eduroute:cv-updated', onUp);
      window.removeEventListener('storage', onUp);
      window.removeEventListener('focus', onUp);
    };
  }, [reloadAll]);

  // Recompute unified skill template on every tick / profile change
  const skillProfile: StudentSkillProfile = useMemo(
    () => buildStudentSkillProfile(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile, tick],
  );
  const field = skillProfile.field;
  const strengths = skillProfile.ownedSkills;
  const gaps = skillProfile.quizGaps;
  const allSkills = skillProfile.allSkills;

  // State-wise: filter admin job pool to selected region
  const regionJobs = useMemo(() => jobsForRegion(jobs, region), [jobs, region]);

  const demandRows: SkillDemandRow[] = useMemo(
    () => computeSkillDemand(regionJobs),
    [regionJobs],
  );
  const maxDemand = demandRows[0]?.demandPct || 1;

  const localMatch = useMemo(
    () => matchStudentToMarket(allSkills, regionJobs, market),
    [allSkills, regionJobs, market],
  );

  const risingDisplay = useMemo(() => {
    if (regionJobs.length > 0) return risingFromDemand(regionJobs, 6);
    return market?.risingSkills || [];
  }, [regionJobs, market]);

  const sourceBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    regionJobs.forEach((j) => {
      counts[j.source] = (counts[j.source] || 0) + 1;
    });
    return counts;
  }, [regionJobs]);

  const onRegionChange = (value: string) => {
    setRegion(value);
    writePreferredRegion(value);
    setMsg(`Gap analysis scoped to ${value}. Match score & demand updated.`);
  };

  const runAnalysis = useCallback(
    async (opts?: { silent?: boolean; regionOverride?: string }) => {
      if (!opts?.silent) {
        setBusy(true);
        setErr('');
        setMsg('');
      }
      try {
        const o = readOnboarding();
        const sp = buildStudentSkillProfile();
        const scope = opts?.regionOverride || region;
        const res = await apiAnalyzeStudent({
          skills: sp.allSkills,
          strengths: sp.ownedSkills,
          gaps: sp.quizGaps.length ? sp.quizGaps : sp.allSkills.length === 0 ? [] : [],
          field: sp.field,
          interests: (o.interests || []).map((id) => interestLabel(id as InterestTrack)),
          region: scope,
        });
        if (!res.ok) {
          if (!opts?.silent) setErr(res.error || 'Analysis failed');
          return;
        }
        setAnalysis(res.analysis || readStudentAnalysis());
        setMarket(readMarketSnapshot());
        setProfile(readOnboarding());
        setJobs(readJobs());
        setTick((t) => t + 1);
        if (!opts?.silent) {
          setMsg(
            `Trend analysis updated for ${scope} from market demand + quiz, CV, and certificate skills.`,
          );
        }
      } catch (e) {
        if (!opts?.silent) setErr(e instanceof Error ? e.message : 'Network error');
      } finally {
        if (!opts?.silent) setBusy(false);
      }
    },
    [region],
  );

  // Skills / certs / region change → local recompute + AI refresh
  useEffect(() => {
    const key =
      allSkills.slice().sort().join('|') +
      '::' +
      gaps.join(',') +
      '::' +
      region +
      '::' +
      String(skillProfile.certCount) +
      '::' +
      String(skillProfile.cvSkillCount);
    if (key === skillKeyRef.current) return;
    const prev = skillKeyRef.current;
    skillKeyRef.current = key;
    if (!prev) return;
    if (autoAiTimer.current) clearTimeout(autoAiTimer.current);
    autoAiTimer.current = setTimeout(() => {
      reloadAll();
      void runAnalysis({ silent: true });
    }, 700);
    return () => {
      if (autoAiTimer.current) clearTimeout(autoAiTimer.current);
    };
  }, [
    allSkills,
    gaps,
    region,
    skillProfile.certCount,
    skillProfile.cvSkillCount,
    runAnalysis,
    reloadAll,
  ]);

  // Region change alone also triggers analysis
  useEffect(() => {
    if (regionKeyRef.current === region) return;
    regionKeyRef.current = region;
    void runAnalysis({ silent: true, regionOverride: region });
  }, [region, runAnalysis]);

  // Every visit / hard refresh → recompute local match + AI with full skill template
  useEffect(() => {
    void runAnalysis({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chartData = useMemo(() => {
    const bars = buildComparisonBars(regionJobs, allSkills, 8);
    if (bars.length) {
      return bars.map((b) => ({
        skill: b.skill.length > 14 ? b.skill.slice(0, 12) + '…' : b.skill,
        full: b.skill,
        market: b.market,
        student: b.student,
      }));
    }
    return [];
  }, [regionJobs, allSkills]);

  const displayScore = localMatch.matchScore;

  const ownedBySource = useMemo(() => {
    const groups: Record<string, string[]> = {
      onboarding_strength: [],
      cv: [],
      certificate: [],
      custom: [],
    };
    skillProfile.bySource.forEach((s) => {
      s.sources.forEach((src) => {
        if (src === 'onboarding_gap') return;
        if (!groups[src]) groups[src] = [];
        if (!groups[src].includes(s.skill)) groups[src].push(s.skill);
      });
    });
    return groups;
  }, [skillProfile.bySource]);

  return (
    <div className="er-page mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
            Skill Market Trends · State-wise gaps
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[var(--text-primary)] md:text-3xl">
            Skill Trend Analysis
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
            Match score uses <strong>quiz + CV + course certificates</strong> against the{' '}
            <strong>selected state</strong> job pool (Adzuna + data.gov.in + curated). Recomputes on
            every refresh.
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

      {/* State / region selector for gap analysis */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
        <label className="flex min-w-[220px] flex-1 flex-col gap-1.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
            <MapPin className="h-3.5 w-3.5" /> Gap analysis region
          </span>
          <select
            value={region}
            onChange={(e) => onRegionChange(e.target.value)}
            disabled={busy}
            className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-cyan-500/40"
          >
            {MARKET_REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <p className="pb-2 text-xs text-[var(--text-muted)]">
          Demand, match score, rising skills & gaps are computed only from jobs in this region (
          {regionJobs.length} of {jobs.length} jobs).
        </p>
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

      {/* Skill sources template — all present data */}
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-[var(--text-muted)]">
          <Sparkles className="h-4 w-4 text-cyan-500" /> Your skill template
        </h2>
        <p className="mb-4 text-xs text-[var(--text-muted)]">
          Built from onboarding quiz, CV builder, course certificates, and custom role. Used for
          match score, gaps, and AI analysis on every page load.
        </p>
        <div className="mb-3 flex flex-wrap gap-2 text-[11px]">
          <span className="rounded-full border border-[var(--border-default)] px-2.5 py-1 font-semibold">
            Owned: {skillProfile.ownedSkills.length}
          </span>
          <span className="rounded-full border border-[var(--border-default)] px-2.5 py-1 font-semibold">
            Quiz gaps: {skillProfile.quizGaps.length}
          </span>
          <span className="rounded-full border border-[var(--border-default)] px-2.5 py-1 font-semibold">
            CV skills: {skillProfile.cvSkillCount}
          </span>
          <span className="rounded-full border border-[var(--border-default)] px-2.5 py-1 font-semibold">
            Certificates: {skillProfile.certCount}
          </span>
        </div>
        {skillProfile.ownedSkills.length === 0 && skillProfile.quizGaps.length === 0 ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              No skills recorded yet. Complete the{' '}
              <Link to="/onboarding" className="font-bold underline">
                skill gap quiz
              </Link>
              , add skills in{' '}
              <Link to="/cv-builder" className="font-bold underline">
                CV Builder
              </Link>
              , or earn a{' '}
              <Link to="/certifications" className="font-bold underline">
                course certificate
              </Link>
              . Analysis will update automatically.
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {(['onboarding_strength', 'cv', 'certificate', 'custom'] as const).map((src) => {
              const list = ownedBySource[src] || [];
              if (!list.length) return null;
              return (
                <div key={src} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                    {sourceLabel(src)}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {list.slice(0, 12).map((sk) => (
                      <span
                        key={sk}
                        className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-200"
                      >
                        {sk}
                      </span>
                    ))}
                    {list.length > 12 && (
                      <span className="text-[11px] text-[var(--text-muted)]">+{list.length - 12}</span>
                    )}
                  </div>
                </div>
              );
            })}
            {skillProfile.quizGaps.length > 0 && (
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 sm:col-span-2">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                  Quiz gaps
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {skillProfile.quizGaps.map((sk) => (
                    <span
                      key={sk}
                      className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-900 dark:text-amber-200"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {skillProfile.summary && (
          <p className="mt-3 text-[11px] leading-relaxed text-[var(--text-muted)]">{skillProfile.summary}</p>
        )}
      </div>

      {!skillProfile.onboardingDone && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            Complete the{' '}
            <Link to="/onboarding" className="font-bold underline">
              skill gap quiz
            </Link>
            . Each answer refreshes match score, gaps, and demand for <strong>{region}</strong>.
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="er-card p-4">
          <p className="text-xs font-bold uppercase text-[var(--text-muted)]">Match score</p>
          <p className="mt-1 text-3xl font-black text-[var(--text-primary)]">{displayScore}%</p>
          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">vs {region} demand</p>
        </div>
        <div className="er-card p-4">
          <p className="text-xs font-bold uppercase text-[var(--text-muted)]">Your track</p>
          <p className="mt-1 text-lg font-bold text-[var(--text-primary)]">{field}</p>
        </div>
        <div className="er-card p-4">
          <p className="text-xs font-bold uppercase text-[var(--text-muted)]">Jobs in region</p>
          <p className="mt-1 text-2xl font-black text-[var(--text-primary)]">{regionJobs.length}</p>
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

      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-[var(--text-muted)]">
          <Database className="h-4 w-4" /> Skill demand — {region}
        </h2>
        <p className="mb-4 text-xs text-[var(--text-muted)]">
          Demand % from {regionJobs.length} jobs in this region (Adzuna + data.gov.in + curated).
        </p>
        {demandRows.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            Admin has not collected jobs for this region yet. Open Admin → Market Trends to refresh
            live sources.
          </p>
        ) : (
          <ul className="space-y-3">
            {demandRows.slice(0, 10).map((row) => {
              const have = localMatch.matched.some(
                (s) => s.toLowerCase() === row.skill.toLowerCase(),
              );
              return (
                <li key={row.skill}>
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-semibold">
                      {row.skill}{' '}
                      {have ? (
                        <span className="ml-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300">
                          matched
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

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
          <h2 className="mb-2 text-sm font-black uppercase text-emerald-600 dark:text-emerald-400">
            Matched skills ({region})
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
              No strong matches yet — add CV/certificate skills or complete the quiz.
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
          <h2 className="mb-2 text-sm font-black uppercase text-amber-600 dark:text-amber-400">
            Skill gaps (live · {region})
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
            <p className="text-sm text-[var(--text-muted)]">No major gaps against {region} demand.</p>
          )}
          <p className="mt-2 text-[11px] text-[var(--text-muted)]">
            Recalculates on every refresh, skill change, certificate, and region change.
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
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-cyan-600 dark:text-cyan-400">
            <Sparkles className="h-4 w-4" /> AI analysis ({region})
          </div>
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{analysis.summary}</p>
          {analysis.careerFit && (
            <p className="mt-2 text-sm text-[var(--text-primary)]">
              <span className="font-bold">Career fit:</span> {analysis.careerFit}
            </p>
          )}
        </div>
      )}

      {chartData.length > 0 && (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase text-[var(--text-muted)]">
            <BarChart3 className="h-4 w-4" /> You vs market demand
          </h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="skill" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, fontSize: 12 }}
                  labelFormatter={(_, payload) =>
                    (payload?.[0]?.payload as { full?: string })?.full || ''
                  }
                />
                <Legend />
                <Bar dataKey="market" name="Market %" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="student" name="You" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {risingDisplay.length > 0 && (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase text-[var(--text-muted)]">
            <TrendingUp className="h-4 w-4" /> Rising skills — {region}
          </h2>
          <div className="flex flex-wrap gap-2">
            {risingDisplay.map((s) => (
              <span
                key={typeof s === 'string' ? s : s.skill}
                className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-800 dark:text-indigo-200"
              >
                {typeof s === 'string' ? s : s.skill}
                {typeof s !== 'string' && s.growth != null ? ` · +${s.growth}%` : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
          <h2 className="mb-2 text-sm font-black uppercase text-[var(--text-muted)]">
            Local priority gaps
          </h2>
          {localMatch.priority.length ? (
            <ul className="space-y-3">
              {localMatch.priority.map((g) => (
                <li key={g.skill} className="text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[var(--text-primary)]">{g.skill}</span>
                    <span className="tabular-nums text-[var(--text-muted)]">{g.demandPct}%</span>
                  </div>
                  <p className="mt-0.5 text-[var(--text-secondary)]">{g.reason}</p>
                </li>
              ))}
            </ul>
          ) : analysis?.skillGaps && analysis.skillGaps.length > 0 ? (
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
            <p className="text-sm text-[var(--text-muted)]">No priority gaps against current demand.</p>
          )}
        </div>
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
          <h2 className="mb-2 text-sm font-black uppercase text-[var(--text-muted)]">Next actions</h2>
          <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
            <li>
              · Refresh analysis after updating CV or earning a certificate — match score updates
              automatically.
            </li>
            <li>
              · Switch state above to see demand & gaps for that region only (live job pool).
            </li>
            <li>
              · Use AI summary + priority list to pick roadmaps and design mixed courses.
            </li>
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          to="/onboarding"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 dark:text-amber-400"
        >
          Retake skill gap quiz <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          to="/cv-builder"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent)]"
        >
          Update CV skills <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          to="/certifications"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400"
        >
          Earn certificates <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          to="/ai-course-designer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-fuchsia-600 dark:text-fuchsia-400"
        >
          Design mixed course <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          to="/roadmaps"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400"
        >
          Learning roadmaps <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export default TrendAnalyse;

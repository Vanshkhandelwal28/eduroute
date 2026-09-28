import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { staggerContainer } from '../../utils/motionPresets';
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
import { buildStudentSkillProfile } from '../../utils/studentSkillProfile';

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
  const [region, setRegion] = useState(() => readPreferredRegion() || 'India (All)');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const skillKeyRef = useRef('');
  const regionKeyRef = useRef(region);
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

  const skillProfile = useMemo(() => buildStudentSkillProfile(), [profile, jobs]);
  const field = skillProfile.field || 'Software Engineering';
  const gaps = skillProfile.quizGaps;
  const allSkills = skillProfile.allSkills;

  const regionJobs = useMemo(() => jobsForRegion(jobs, region), [jobs, region]);
  const demandRows: SkillDemandRow[] = useMemo(() => computeSkillDemand(regionJobs), [regionJobs]);
  const maxDemand = demandRows[0]?.demandPct || 1;
  const localMatch = useMemo(
    () => matchStudentToMarket(allSkills, regionJobs, market),
    [allSkills, regionJobs, market],
  );
  const risingDisplay = useMemo(() => {
    if (regionJobs.length > 0) return risingFromDemand(regionJobs, 6);
    return market?.risingSkills || [];
  }, [regionJobs, market]);

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
        const s = sp.ownedSkills.length ? sp.ownedSkills : strengthsFromProfile(o);
        const g = sp.quizGaps.length ? sp.quizGaps : gapsFromProfile(o);
        const skills = sp.allSkills.length ? sp.allSkills : normalizeSkillList([...new Set([...s, ...g])]);
        const f =
          sp.field ||
          (o.interests?.[0] != null
            ? interestLabel(o.interests[0] as InterestTrack)
            : 'Software Engineering');
        const scope = opts?.regionOverride || region;
        const res = await apiAnalyzeStudent({
          skills,
          strengths: s,
          gaps: g,
          field: f,
          interests: (o.interests || []).map((id) => interestLabel(id)),
          region: scope,
          liveCollect: !opts?.silent,
        });
        if (!res.ok) {
          if (!opts?.silent) setErr(res.error || 'Analysis failed');
          return;
        }
        setAnalysis(res.analysis || readStudentAnalysis());
        setMarket(readMarketSnapshot());
        setProfile(readOnboarding());
        setJobs(readJobs());
        if (!opts?.silent) {
          const provider = res.provider ? ` via ${res.provider}` : '';
          setMsg(`Trend analysis updated for ${scope}${provider} (quiz + CV + certs + live demand).`);
        }
      } catch (e) {
        if (!opts?.silent) setErr(e instanceof Error ? e.message : 'Network error');
      } finally {
        if (!opts?.silent) setBusy(false);
      }
    },
    [region],
  );

  useEffect(() => {
    const key =
      allSkills.slice().sort().join('|') +
      '::' +
      gaps.join(',') +
      '::' +
      region +
      '::' +
      skillProfile.certCount;
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
  }, [allSkills, gaps, region, skillProfile.certCount, runAnalysis, reloadAll]);

  useEffect(() => {
    if (regionKeyRef.current === region) return;
    regionKeyRef.current = region;
    void runAnalysis({ silent: true, regionOverride: region });
  }, [region, runAnalysis]);

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

  return (
    <motion.div
      className="er-page mx-auto max-w-5xl space-y-6"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
            Skill Market Trends · State-wise gaps
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[var(--text-primary)] md:text-3xl">
            Skill Trend Analysis
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
            Match uses quiz + CV + certificates vs admin job pool for the selected region. Refresh collects
            live Adzuna/gov jobs then AI.
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
          {regionJobs.length} of {jobs.length} jobs · Certs: {skillProfile.certCount} · CV skills:{' '}
          {skillProfile.cvSkillCount}
        </p>
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

      {!profile.completedAt && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            Complete the{' '}
            <Link to="/onboarding" className="font-bold underline">
              skill gap quiz
            </Link>
            . Each answer refreshes match score for <strong>{region}</strong>.
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-5">
        <div className={`er-card p-4 ring-1 ${displayScore === 0 ? 'ring-amber-500/30 bg-amber-500/5' : 'ring-cyan-500/20'}`}>
          <p className="text-xs font-bold uppercase text-[var(--text-muted)]">Match score</p>
          <p className={`mt-1 text-3xl font-black ${displayScore === 0 ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--text-primary)]'}`}>
            {displayScore}%
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
            {displayScore === 0 ? 'Complete quiz or Refresh to score' : `vs ${region} demand`}
          </p>
        </div>
        <div className="er-card p-4">
          <p className="text-xs font-bold uppercase text-[var(--text-muted)]">Your track</p>
          <p className="mt-1 text-lg font-bold text-[var(--text-primary)]">{field}</p>
        </div>
        <div className="er-card p-4">
          <p className="text-xs font-bold uppercase text-[var(--text-muted)]">Jobs in region</p>
          <p className="mt-1 text-2xl font-black text-[var(--text-primary)]">{regionJobs.length}</p>
        </div>
        <div className="er-card p-4">
          <p className="text-xs font-bold uppercase text-[var(--text-muted)]">Skill sources</p>
          <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
            {allSkills.length} skills · {skillProfile.certCount} certs
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-[var(--text-muted)]">
          <Database className="h-4 w-4" /> Skill demand — {region}
        </h2>
        {demandRows.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            Admin has not collected jobs for this region yet. Click Refresh analysis to live-collect.
          </p>
        ) : (
          <ul className="space-y-3">
            {demandRows.slice(0, 10).map((row) => {
              const have = localMatch.matched.some((s) => s.toLowerCase() === row.skill.toLowerCase());
              return (
                <li key={row.skill}>
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-semibold">
                      {row.skill}{' '}
                      {have ? (
                        <span className="ml-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300">matched</span>
                      ) : (
                        <span className="ml-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-800 dark:text-amber-200">gap</span>
                      )}
                    </span>
                    <span className="tabular-nums text-[var(--text-muted)]">
                      {row.jobCount} jobs · <strong className="text-[var(--text-primary)]">{row.demandPct}%</strong>
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                    <motion.div
                      className={`h-full rounded-full ${
                        have ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' : 'bg-gradient-to-r from-indigo-500 to-cyan-500'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (row.demandPct / maxDemand) * 100)}%` }}
                      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="er-signal-card er-signal-card--match p-5">
          <h2 className="mb-2 text-sm font-black uppercase text-emerald-600 dark:text-emerald-400">Matched skills</h2>
          {localMatch.matched.length ? (
            <div className="flex flex-wrap gap-2">
              {localMatch.matched.map((s) => (
                <span key={s} className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-200">{s}</span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">No strong matches yet — complete the skill gap quiz.</p>
          )}
        </div>
        <div className="er-signal-card er-signal-card--gap p-5">
          <h2 className="mb-2 text-sm font-black uppercase text-amber-600 dark:text-amber-400">Skill gaps</h2>
          {localMatch.gaps.length ? (
            <div className="flex flex-wrap gap-2">
              {localMatch.gaps.map((s) => (
                <span key={s} className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-900 dark:text-amber-200">{s}</span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">No major gaps against {region} demand.</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
        <h2 className="mb-3 text-sm font-black uppercase text-[var(--text-muted)]">Priority skills → learning recommendations</h2>
        <ul className="space-y-3">
          {localMatch.recommendations.map((r) => (
            <li key={r.skill} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border-default)] px-3 py-2 text-sm">
              <div>
                <span className="font-bold">{r.skill}</span>
                <p className="text-xs text-[var(--text-secondary)]">{r.action}</p>
              </div>
              <Link to={r.roadmapTo} className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white">
                Open path <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {analysis?.summary && (
        <div className="er-signal-card er-signal-card--ai p-5">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
            <Sparkles className="h-4 w-4" /> AI market summary
          </div>
          <p className="er-ai-prose text-sm leading-relaxed text-[var(--text-secondary)]">{analysis.summary}</p>
          {analysis.provider && (
            <p className="mt-2 text-[10px] text-[var(--text-muted)]">Provider: {analysis.provider}</p>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase text-[var(--text-muted)]">
          <BarChart3 className="h-4 w-4" /> You vs market demand — {region}
        </h2>
        {chartData.length > 0 ? (
          <div className="h-72 w-full min-h-[18rem]">
            <ResponsiveContainer width="100%" height={288} minWidth={0}>
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="skill" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number, name: string) => [value, name === 'market' ? 'Market demand' : 'Your level']}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.full || ''}
                />
                <Legend />
                <Bar dataKey="market" name="Market" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="student" name="You" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--bg-elevated)]/50 px-4 py-12 text-center">
            <BarChart3 className="h-8 w-8 text-[var(--text-muted)] opacity-50" />
            <p className="text-sm font-semibold text-[var(--text-secondary)]">No chart data yet</p>
            <p className="max-w-sm text-xs text-[var(--text-muted)]">
              Click <strong>Refresh analysis</strong> to live-collect jobs and compare your skills to market demand.
            </p>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase text-cyan-600 dark:text-cyan-400">
          <TrendingUp className="h-4 w-4" /> Rising skills in {region}
        </h2>
        {risingDisplay.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No rising-skill signals yet.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {risingDisplay.map((r: { skill?: string; demandScore?: number; note?: string }, i: number) => (
              <li key={(r.skill || 's') + i} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 text-sm">
                <span className="font-bold">{r.skill}</span>
                {r.demandScore != null && (
                  <span className="ml-2 tabular-nums text-[var(--text-muted)]">{r.demandScore}</span>
                )}
                {r.note && <p className="text-[11px] text-[var(--text-muted)]">{r.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  );
}

export default TrendAnalyse;

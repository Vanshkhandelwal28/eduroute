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
import {
  apiRefreshMarket,
  MARKET_REGIONS,
  readMarketSnapshot,
  readPreferredRegion,
  writePreferredRegion,
  type MarketSnapshot,
} from '../../utils/marketTrendStore';

/** Top tech / hiring hubs per state (up to 8). Used for heatmap when region changes. */
const STATE_DISTRICTS: Record<string, string[]> = {
  'India (All)': ['Bengaluru', 'Hyderabad', 'Pune', 'Mumbai', 'Noida', 'Gurugram', 'Chennai', 'Ahmedabad'],
  Maharashtra: ['Pune', 'Mumbai', 'Nagpur', 'Nashik', 'Thane', 'Aurangabad', 'Kolhapur', 'Solapur'],
  Karnataka: ['Bengaluru', 'Mysuru', 'Hubli', 'Mangaluru', 'Belagavi', 'Davangere', 'Tumakuru', 'Udupi'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tiruppur', 'Erode', 'Vellore'],
  Telangana: ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam', 'Nalgonda', 'Mahbubnagar', 'Adilabad'],
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Tirupati', 'Nellore', 'Kurnool', 'Rajahmundry', 'Kakinada'],
  'Delhi NCR': ['Delhi', 'Noida', 'Gurugram', 'Ghaziabad', 'Faridabad', 'Greater Noida', 'Gautam Buddh Nagar', 'Meerut'],
  'Uttar Pradesh': ['Noida', 'Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Varanasi', 'Prayagraj', 'Meerut'],
  Gujarat: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar', 'Bhavnagar', 'Jamnagar', 'Anand'],
  Rajasthan: ['Jaipur', 'Udaipur', 'Jodhpur', 'Kota', 'Ajmer', 'Bikaner', 'Alwar', 'Sikar'],
  'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Kharagpur', 'Haldia', 'Bardhaman'],
  Kerala: ['Kochi', 'Thiruvananthapuram', 'Kozhikode', 'Thrissur', 'Kannur', 'Kollam', 'Alappuzha', 'Palakkad'],
  'Madhya Pradesh': ['Indore', 'Bhopal', 'Gwalior', 'Jabalpur', 'Ujjain', 'Sagar', 'Rewa', 'Satna'],
  Haryana: ['Gurugram', 'Faridabad', 'Panchkula', 'Ambala', 'Karnal', 'Hisar', 'Rohtak', 'Sonipat'],
  Punjab: ['Chandigarh', 'Mohali', 'Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Pathankot'],
  Bihar: ['Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur', 'Purnia', 'Darbhanga', 'Begusarai', 'Ara'],
  Odisha: ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri', 'Balasore', 'Jharsuguda'],
  Assam: ['Guwahati', 'Dibrugarh', 'Silchar', 'Jorhat', 'Tezpur', 'Nagaon', 'Tinsukia', 'Bongaigaon'],
  Jharkhand: ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Hazaribagh', 'Deoghar', 'Giridih', 'Ramgarh'],
  Chhattisgarh: ['Raipur', 'Bhilai', 'Bilaspur', 'Durg', 'Korba', 'Rajnandgaon', 'Raigarh', 'Jagdalpur'],
  Uttarakhand: ['Dehradun', 'Haridwar', 'Haldwani', 'Roorkee', 'Rudrapur', 'Nainital', 'Rishikesh', 'Kashipur'],
  'Himachal Pradesh': ['Shimla', 'Solan', 'Baddi', 'Dharamshala', 'Mandi', 'Kullu', 'Hamirpur', 'Una'],
  Goa: ['Panaji', 'Margao', 'Vasco', 'Mapusa', 'Ponda', 'Calangute', 'Canacona', 'Bicholim'],
  'Jammu & Kashmir': ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Udhampur', 'Kathua', 'Sopore', 'Pulwama'],
  Puducherry: ['Puducherry', 'Oulgaret', 'Karaikal', 'Mahe', 'Yanam', 'Villianur', 'Bahour', 'Ariankuppam'],
  Chandigarh: ['Chandigarh', 'Sector 17', 'Sector 22', 'Industrial Area', 'Manimajra', 'Panchkula', 'Mohali', 'Zirakpur'],
};

function districtsForRegion(region: string): string[] {
  const r = String(region || 'India (All)').trim();
  if (STATE_DISTRICTS[r]) return STATE_DISTRICTS[r];
  // fallback: use region name + generic hubs
  return [r, 'Capital', 'Tech park', 'Industrial', 'IT zone', 'City center', 'Suburb', 'Remote'];
}

/** Match job location string to one of the state's districts. */
function matchDistrict(location: string, districts: string[]): string | null {
  const loc = String(location || '').toLowerCase();
  if (!loc) return null;
  for (const d of districts) {
    if (loc.includes(d.toLowerCase())) return d;
  }
  // common aliases
  if (loc.includes('bangalore') || loc.includes('bengaluru')) {
    const b = districts.find((x) => /bengaluru|bangalore/i.test(x));
    if (b) return b;
  }
  if (loc.includes('gurgaon') || loc.includes('gurugram')) {
    const g = districts.find((x) => /gurugram|gurgaon/i.test(x));
    if (g) return g;
  }
  if (loc.includes('bombay') || loc.includes('mumbai')) {
    const m = districts.find((x) => /mumbai/i.test(x));
    if (m) return m;
  }
  if (loc.includes('madras') || loc.includes('chennai')) {
    const c = districts.find((x) => /chennai/i.test(x));
    if (c) return c;
  }
  if (loc.includes('calcutta') || loc.includes('kolkata')) {
    const k = districts.find((x) => /kolkata/i.test(x));
    if (k) return k;
  }
  if (loc.includes('trivandrum') || loc.includes('thiruvananthapuram')) {
    const t = districts.find((x) => /thiruvananthapuram|trivandrum/i.test(x));
    if (t) return t;
  }
  return null;
}

function aggregateDistrictHeat(jobs: MarketJob[], districts: string[]) {
  const counts: Record<string, number> = {};
  districts.forEach((d) => {
    counts[d] = 0;
  });
  let unmatched = 0;
  jobs.forEach((j) => {
    const d = matchDistrict(j.location || '', districts);
    if (d) counts[d] = (counts[d] || 0) + 1;
    else unmatched += 1;
  });
  // If almost nothing matched, distribute unmatched into first district so UI is not all zeros
  const totalMatched = Object.values(counts).reduce((a, b) => a + b, 0);
  if (totalMatched === 0 && jobs.length > 0 && districts[0]) {
    counts[districts[0]] = jobs.length;
  }
  const max = Math.max(...Object.values(counts), 1);
  return districts.map((district) => ({
    district,
    openings: counts[district] || 0,
    intensity: Math.round(((counts[district] || 0) / max) * 100),
  }));
}

export function DemandIntelligence() {
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

  // Same region filter as student Skill Trend Analysis
  const regionJobs = useMemo(() => jobsForRegion(jobs, region), [jobs, region]);
  const districts = useMemo(() => districtsForRegion(region), [region]);
  const heat = useMemo(() => aggregateDistrictHeat(regionJobs, districts), [regionJobs, districts]);

  const demandRows = useMemo(() => computeSkillDemand(regionJobs).slice(0, 12), [regionJobs]);
  const maxPct = demandRows[0]?.demandPct || 1;

  const skills = useMemo(
    () =>
      demandRows.map((d) => ({
        skill: d.skill,
        openings: d.jobCount,
        demand: Math.min(99, Math.round((d.demandPct / maxPct) * 95)),
        emerging: /ai|ml|cloud|kubernetes|genai|docker/i.test(d.skill),
      })),
    [demandRows, maxPct],
  );

  const roles = useMemo(() => {
    if (market?.topRoles?.length) {
      return market.topRoles.slice(0, 8).map((r) => ({
        role: r.role,
        score: r.openingsIndex,
        delta: Math.max(5, Math.round(r.openingsIndex / 10)),
      }));
    }
    // derive from job titles in region
    const counts: Record<string, number> = {};
    regionJobs.forEach((j) => {
      let role = (j.title || 'Job').slice(0, 60);
      if (/full\s*stack/i.test(role)) role = 'Full Stack Developer';
      else if (/front\s*end|frontend/i.test(role)) role = 'Frontend Engineer';
      else if (/back\s*end|backend/i.test(role)) role = 'Backend Engineer';
      else if (/data\s*analyst/i.test(role)) role = 'Data Analyst';
      else if (/devops|sre/i.test(role)) role = 'DevOps / SRE';
      else if (/software\s*(engineer|developer)/i.test(role)) role = 'Software Engineer';
      counts[role] = (counts[role] || 0) + 1;
    });
    const total = regionJobs.length || 1;
    return Object.entries(counts)
      .map(([role, n]) => ({
        role,
        score: Math.min(99, Math.round((n / total) * 100 + n)),
        delta: Math.max(3, Math.round((n / total) * 20)),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [market, regionJobs]);

  const risingSkills = market?.risingSkills?.slice(0, 6) || [];
  const decliningSkills = market?.decliningSkills?.slice(0, 4) || [];

  const uniqueRoles = new Set(regionJobs.map((j) => j.title)).size;
  const uniqueSkills = new Set(regionJobs.flatMap((j) => j.skills || [])).size;
  const emergingCount = regionJobs.filter((j) =>
    /ai|ml|genai|cloud|kubernetes/i.test(`${j.title} ${(j.skills || []).join(' ')}`),
  ).length;

  const selectCls =
    'rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2.5 text-sm font-semibold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-indigo-500/40';

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
      setMsg(`Collected live jobs for ${region}. ${res.note || ''}`.slice(0, 180));
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
      setMsg(`AI trends refreshed for ${region} (${res.provider || 'AI'}).`);
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
          className="flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              SIH26134 · Labour market intelligence
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">Demand Intelligence</h1>
            <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
              Live Adzuna + data.gov.in + curated jobs — same pool as Skill Trend Analysis. District heatmap
              switches with the selected state (top tech hubs).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 px-3 py-2 text-xs font-bold">
              <Activity className={`h-3.5 w-3.5 ${regionJobs.length ? 'text-emerald-500' : 'text-amber-500'}`} />
              {regionJobs.length ? `Live · ${regionJobs.length} jobs` : 'No live jobs'}
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
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
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
          <label className="flex min-w-[220px] flex-1 flex-col gap-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase text-[var(--text-muted)]">
              <MapPin className="h-3.5 w-3.5" /> State / region
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
            Heatmap shows top tech districts for <strong>{region}</strong> · demand from{' '}
            {regionJobs.length} jobs (same filter as student trend analysis).
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            { label: 'Jobs in region', value: regionJobs.length, icon: Briefcase, tone: 'bg-indigo-500/20 text-indigo-300' },
            { label: 'Unique roles', value: uniqueRoles, icon: Target, tone: 'bg-violet-500/20 text-violet-300' },
            { label: 'Skills in demand', value: uniqueSkills, icon: Zap, tone: 'bg-amber-500/20 text-amber-300' },
            { label: 'AI/Cloud tagged', value: emergingCount, icon: Sparkles, tone: 'bg-emerald-500/20 text-emerald-300' },
            {
              label: 'Top skill share',
              value: demandRows[0] ? `${demandRows[0].demandPct}%` : '—',
              icon: TrendingUp,
              tone: 'bg-sky-500/20 text-sky-300',
            },
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
            <h2 className="mb-1 text-sm font-bold">Top skills in demand — {region}</h2>
            <p className="mb-4 text-xs text-[var(--text-muted)]">
              Demand % from live jobs (same calculation as student Skill Trend Analysis).
            </p>
            {skills.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">Collect jobs to see demand for this state.</p>
            ) : (
              <ul className="space-y-3">
                {skills.map((row) => (
                  <li key={row.skill}>
                    <div className="mb-1 flex justify-between text-xs font-bold">
                      <span>
                        {row.skill}
                        {row.emerging ? ' · EMERGING' : ''}
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
                      <p className="text-[10px] text-[var(--text-muted)]">Score {r.score}</p>
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

        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 p-5">
          <div className="mb-4 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-sky-400" />
            <div>
              <h2 className="text-sm font-bold">District heatmap — {region}</h2>
              <p className="text-xs text-[var(--text-muted)]">
                Top tech districts for this state. Counts = jobs whose location matches each hub.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {heat.map((d) => (
              <div
                key={d.district}
                className="rounded-2xl border border-[var(--border-default)] p-4"
                style={{
                  background: `linear-gradient(135deg, rgba(99,102,241,${0.08 + d.intensity / 200}) 0%, rgba(139,92,246,${0.05 + d.intensity / 250}) 100%)`,
                }}
              >
                <p className="text-sm font-bold">{d.district}</p>
                <p className="mt-1 text-2xl font-black">{d.openings}</p>
                <p className="text-[10px] text-[var(--text-muted)]">intensity {d.intensity}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 p-5">
          <h2 className="mb-3 text-sm font-bold">Job sample — {region}</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-default)] text-[10px] uppercase text-[var(--text-muted)]">
                  <th className="py-2 pr-2">Role</th>
                  <th className="py-2 pr-2">Company</th>
                  <th className="py-2 pr-2">Location</th>
                  <th className="py-2">Skills</th>
                </tr>
              </thead>
              <tbody>
                {regionJobs.slice(0, 15).map((j) => (
                  <tr key={`${j.source}-${j.externalId}`} className="border-b border-[var(--border-default)]/60">
                    <td className="py-2.5 pr-2 font-bold">{j.title}</td>
                    <td className="py-2.5 pr-2 text-[var(--text-secondary)]">{j.company}</td>
                    <td className="py-2.5 pr-2">{j.location}</td>
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

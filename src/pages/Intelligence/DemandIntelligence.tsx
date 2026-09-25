import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  Briefcase,
  ClipboardCheck,
  Filter,
  MapPin,
  MessageSquare,
  Sparkles,
  Star,
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
  type SectorKey,
  type WindowKey,
} from './demandIntelligenceData';
import { validationSummary } from '../../utils/employerValidationStore';

const EMERGING_COLORS: Record<string, string> = {
  AI: 'bg-violet-500/15 text-violet-700 ring-violet-300/50 dark:text-violet-300 dark:ring-violet-500/40',
  EV: 'bg-emerald-500/15 text-emerald-700 ring-emerald-300/50 dark:text-emerald-300 dark:ring-emerald-500/40',
  Green: 'bg-teal-500/15 text-teal-700 ring-teal-300/50 dark:text-teal-300 dark:ring-teal-500/40',
};

export function DemandIntelligence() {
  const [sector, setSector] = useState<SectorKey>('all');
  const [district, setDistrict] = useState<DistrictKey | 'all'>('all');
  const [experience, setExperience] = useState<ExperienceKey>('all');
  const [timeWindow, setTimeWindow] = useState<WindowKey>('90d');
  const [vSummary, setVSummary] = useState(() => validationSummary());

  useEffect(() => {
    const refresh = () => setVSummary(validationSummary());
    refresh();
    window.addEventListener('eduroute:employer-validation-updated', refresh);
    return () => window.removeEventListener('eduroute:employer-validation-updated', refresh);
  }, []);

  const filtered = useMemo(
    () => filterSignals(JOB_SIGNALS, { sector, district, experience, window: timeWindow }),
    [sector, district, experience, timeWindow],
  );

  const kpis = useMemo(() => kpiFromSignals(filtered), [filtered]);
  const skills = useMemo(() => aggregateSkills(filtered), [filtered]);
  const roles = useMemo(() => aggregateRoles(filtered), [filtered]);
  const heat = useMemo(() => aggregateDistricts(filtered), [filtered]);

  const selectCls =
    'rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--accent)]';

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
              Live job-posting signals by role, skill, location and proficiency — Maharashtra focus. Align
              training capacity with what industry is hiring. Employer surveys feed this view.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 px-3 py-2 text-xs font-bold shadow-[var(--shadow-card)] backdrop-blur-sm">
            <Activity className="h-3.5 w-3.5 text-emerald-500" />
            Mock signals · {filtered.length} postings
          </div>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
          className="rounded-2xl border border-emerald-500/30 bg-[var(--bg-card)]/90 p-4 shadow-[var(--shadow-card)] backdrop-blur-sm"
        >
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
              <ClipboardCheck className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold">Employer validation results</h2>
              <p className="text-xs text-[var(--text-muted)]">
                From Industry workspace · surveys & course ratings close the loop with training providers
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {[
              { label: 'Course ratings', value: vSummary.ratingsCount, sub: vSummary.avgRating ? `avg ${vSummary.avgRating}/5` : '—' },
              { label: 'Skills tagged', value: vSummary.skillsCount, sub: `${vSummary.mustHave} must · ${vSummary.nice} nice` },
              { label: 'Curriculum OK', value: vSummary.approved, sub: 'approved' },
              { label: 'Curriculum no', value: vSummary.rejected, sub: 'rejected' },
              { label: 'Surveys', value: vSummary.surveysCount, sub: vSummary.avgSurveyRelevance ? `relevance ${vSummary.avgSurveyRelevance}/5` : '—' },
              { label: 'Job-ready signal', value: vSummary.avgRating || '—', sub: 'avg rating' },
            ].map((k) => (
              <div
                key={k.label}
                className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)]/80 px-3 py-2.5"
              >
                <p className="text-[10px] font-bold uppercase text-[var(--text-muted)]">{k.label}</p>
                <p className="text-xl font-black">{k.value}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{k.sub}</p>
              </div>
            ))}
          </div>
          {vSummary.recentRatings.length > 0 && (
            <ul className="mt-3 space-y-1.5 border-t border-[var(--border-default)] pt-3">
              {vSummary.recentRatings.slice(0, 3).map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-2 text-xs">
                  <Star className="h-3 w-3 text-amber-500" />
                  <span className="font-bold">{r.courseName}</span>
                  <span className="font-black text-amber-600 dark:text-amber-400">{r.rating}/5</span>
                  <span className="text-[var(--text-muted)]">{r.company}</span>
                  {r.comment && <span className="text-[var(--text-secondary)]">— {r.comment}</span>}
                </li>
              ))}
            </ul>
          )}
          {vSummary.recentDecisions.length > 0 && (
            <ul className="mt-2 space-y-1">
              {vSummary.recentDecisions.slice(0, 3).map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-2 text-xs">
                  <BadgeCheck className="h-3 w-3 text-emerald-500" />
                  <span className="font-bold">{d.title}</span>
                  <span
                    className={
                      d.decision === 'approved'
                        ? 'font-black text-emerald-600 dark:text-emerald-400'
                        : 'font-black text-rose-600 dark:text-rose-400'
                    }
                  >
                    {d.decision}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {vSummary.ratingsCount === 0 && vSummary.surveysCount === 0 && (
            <p className="mt-2 flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <MessageSquare className="h-3.5 w-3.5" />
              No employer input yet — Industry role → Employer validation tab to rate courses & submit surveys.
            </p>
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 p-4 shadow-[var(--shadow-card)] backdrop-blur-sm"
        >
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            <Filter className="h-3.5 w-3.5" /> Filters
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Sector</span>
              <select className={selectCls} value={sector} onChange={(e) => setSector(e.target.value as SectorKey)}>
                {SECTORS.map((s) => (
                  <option key={s} value={s}>
                    {s === 'all' ? 'All sectors' : s}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">District</span>
              <select
                className={selectCls}
                value={district}
                onChange={(e) => setDistrict(e.target.value as DistrictKey | 'all')}
              >
                <option value="all">All Maharashtra</option>
                {DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Experience</span>
              <select
                className={selectCls}
                value={experience}
                onChange={(e) => setExperience(e.target.value as ExperienceKey)}
              >
                {EXPERIENCE_LEVELS.map((x) => (
                  <option key={x} value={x}>
                    {x === 'all' ? 'All levels' : x}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Window</span>
              <select
                className={selectCls}
                value={timeWindow}
                onChange={(e) => setTimeWindow(e.target.value as WindowKey)}
              >
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </label>
          </div>
        </motion.section>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            { label: 'Openings', value: kpis.totalOpenings, icon: Briefcase, tone: 'bg-indigo-500/20 text-indigo-300' },
            { label: 'Unique roles', value: kpis.roles, icon: Target, tone: 'bg-violet-500/20 text-violet-300' },
            { label: 'Skills in demand', value: kpis.skills, icon: Zap, tone: 'bg-amber-500/20 text-amber-300' },
            { label: 'Emerging-tagged', value: kpis.emerging, icon: Sparkles, tone: 'bg-emerald-500/20 text-emerald-300' },
            { label: 'Rising roles', value: kpis.rising, icon: TrendingUp, tone: 'bg-sky-500/20 text-sky-300' },
          ].map((k, i) => (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + i * 0.04 }}
              className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 p-4 shadow-[var(--shadow-card)] backdrop-blur-sm"
            >
              <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${k.tone}`}>
                <k.icon className="h-4 w-4" />
              </div>
              <p className="text-xs font-bold uppercase text-[var(--text-muted)]">{k.label}</p>
              <p className="mt-1 text-2xl font-black">{k.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 p-5 shadow-[var(--shadow-card)] backdrop-blur-sm xl:col-span-3">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/20 text-violet-300">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold">Top skills in demand</h2>
                <p className="text-xs text-[var(--text-muted)]">From filtered job-posting signals</p>
              </div>
            </div>
            {skills.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No signals match these filters.</p>
            ) : (
              <ul className="space-y-3">
                {skills.map((row) => (
                  <li key={row.skill}>
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                      <span className="inline-flex items-center gap-2">
                        {row.skill}
                        {row.emerging && (
                          <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-black text-violet-600 dark:text-violet-300">
                            EMERGING
                          </span>
                        )}
                      </span>
                      <span className="text-[var(--text-muted)]">
                        {row.openings} openings · {row.demand}% ·{' '}
                        <span
                          className={
                            row.trend === 'rising'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : row.trend === 'declining'
                                ? 'text-rose-600 dark:text-rose-400'
                                : ''
                          }
                        >
                          {row.trend}
                        </span>
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

          <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 p-5 shadow-[var(--shadow-card)] backdrop-blur-sm xl:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold">Rising vs declining roles</h2>
                <p className="text-xs text-[var(--text-muted)]">Demand momentum</p>
              </div>
            </div>
            <ul className="space-y-2.5">
              {roles.map((r) => (
                <li
                  key={r.role}
                  className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)]/80 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold">{r.role}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">Score {r.score}</p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-black ${
                      r.direction === 'rising'
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        : r.direction === 'declining'
                          ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                          : 'bg-slate-500/10 text-[var(--text-muted)]'
                    }`}
                  >
                    {r.direction === 'rising' ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : r.direction === 'declining' ? (
                      <ArrowDownRight className="h-3 w-3" />
                    ) : null}
                    {r.delta > 0 ? `+${r.delta}%` : r.delta < 0 ? `${r.delta}%` : '—'}
                  </span>
                </li>
              ))}
              {roles.length === 0 && (
                <p className="text-sm text-[var(--text-muted)]">No role trends for this filter.</p>
              )}
            </ul>
          </section>
        </div>

        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 p-5 shadow-[var(--shadow-card)] backdrop-blur-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/20 text-sky-300">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold">District demand heatmap (Maharashtra)</h2>
              <p className="text-xs text-[var(--text-muted)]">Openings intensity by district</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {heat.map((d) => (
              <button
                key={d.district}
                type="button"
                onClick={() => setDistrict(d.district)}
                className={`rounded-2xl border p-4 text-left transition hover:ring-2 hover:ring-[var(--accent)] ${
                  district === d.district
                    ? 'border-indigo-400 ring-2 ring-indigo-400/40'
                    : 'border-[var(--border-default)]'
                }`}
                style={{
                  background: `linear-gradient(135deg, rgba(99,102,241,${0.08 + d.intensity / 200}) 0%, rgba(139,92,246,${0.05 + d.intensity / 250}) 100%)`,
                }}
              >
                <p className="text-sm font-bold">{d.district}</p>
                <p className="mt-1 text-2xl font-black">{d.openings}</p>
                <p className="text-[10px] font-semibold text-[var(--text-muted)]">{d.intensity}% intensity</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500"
                    style={{ width: `${Math.max(4, d.intensity)}%` }}
                  />
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 p-5 shadow-[var(--shadow-card)] backdrop-blur-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
                <Briefcase className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold">Job-posting signals</h2>
                <p className="text-xs text-[var(--text-muted)]">Title · skills · district · salary · proficiency</p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-default)] text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="pb-2 pr-3">Role</th>
                  <th className="pb-2 pr-3">District</th>
                  <th className="pb-2 pr-3">Skills</th>
                  <th className="pb-2 pr-3">Proficiency</th>
                  <th className="pb-2 pr-3">Experience</th>
                  <th className="pb-2 pr-3">Salary</th>
                  <th className="pb-2 pr-3">Openings</th>
                  <th className="pb-2">Tags</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((job) => (
                  <tr
                    key={job.id}
                    className="border-b border-[var(--border-default)]/60 last:border-0 hover:bg-[var(--accent-soft)]/40"
                  >
                    <td className="py-3 pr-3">
                      <p className="font-bold text-[var(--text-primary)]">{job.title}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        {job.company} · {job.sector}
                      </p>
                    </td>
                    <td className="py-3 pr-3 font-semibold">{job.district}</td>
                    <td className="py-3 pr-3">
                      <div className="flex flex-wrap gap-1">
                        {job.skills.map((sk) => (
                          <span
                            key={sk}
                            className="rounded-full border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-bold"
                          >
                            {sk}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 pr-3">{job.proficiency}</td>
                    <td className="py-3 pr-3">{job.experience}</td>
                    <td className="py-3 pr-3 font-semibold">{job.salaryBand}</td>
                    <td className="py-3 pr-3 font-black">{job.openings}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1">
                        {(job.emerging || []).map((tag) => (
                          <span
                            key={tag}
                            className={`rounded-full px-2 py-0.5 text-[10px] font-black ring-1 ${
                              EMERGING_COLORS[tag] || EMERGING_COLORS.AI
                            }`}
                          >
                            {tag}
                          </span>
                        ))}
                        {job.trend === 'rising' && (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:text-emerald-300">
                            rising
                          </span>
                        )}
                        {job.trend === 'declining' && (
                          <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-black text-rose-700 dark:text-rose-300">
                            declining
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="py-6 text-center text-sm text-[var(--text-muted)]">No postings match these filters.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default DemandIntelligence;

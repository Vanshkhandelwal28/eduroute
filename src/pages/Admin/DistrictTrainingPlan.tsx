import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  Briefcase,
  ClipboardList,
  Lightbulb,
  MapPin,
  PlusCircle,
  RefreshCw,
  Target,
  Users,
  Wand2,
} from 'lucide-react';
import { AuroraMeshBackground } from '../../components/AuroraMeshBackground';
import {
  DISTRICTS,
  actionLabel,
  actionTone,
  coursesForDistrict,
  flagToneLocal,
  generateDistrictPlan,
  summarizePlan,
  topSkillsForDistrict,
  type DistrictKey,
  type PlanActionType,
} from './districtTrainingPlanData';

const ACTION_FILTERS: { id: PlanActionType | 'all'; label: string }[] = [
  { id: 'all', label: 'All actions' },
  { id: 'expand', label: 'Expand' },
  { id: 'reduce', label: 'Reduce' },
  { id: 'add_module', label: 'Add module' },
  { id: 'new_course', label: 'New course' },
];

export function DistrictTrainingPlan() {
  const [district, setDistrict] = useState<DistrictKey>('Pune');
  const [actionFilter, setActionFilter] = useState<PlanActionType | 'all'>('all');
  const [generatedAt, setGeneratedAt] = useState(() => new Date());

  const actions = useMemo(() => generateDistrictPlan(district), [district, generatedAt]);
  const summary = useMemo(() => summarizePlan(district, actions), [district, actions]);
  const skills = useMemo(() => topSkillsForDistrict(district), [district]);
  const localCourses = useMemo(() => coursesForDistrict(district), [district]);

  const filtered = useMemo(() => {
    if (actionFilter === 'all') return actions;
    return actions.filter((a) => a.action === actionFilter);
  }, [actions, actionFilter]);

  const selectCls =
    'rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--accent)]';

  const regenerate = () => setGeneratedAt(new Date());

  return (
    <div className="relative min-h-full overflow-hidden text-[var(--text-primary)]">
      <div className="pointer-events-none absolute inset-0 z-0 opacity-40 dark:opacity-70">
        <AuroraMeshBackground />
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-[var(--bg-primary)]" />
      </div>

      <div className="relative z-10 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              SIH26134 · District training plans
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">
              District training plan — {district}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
              Turn job demand and local course capacity into concrete actions: expand, cut seats, add
              modules, or pilot new programmes — with trainer hints for skill planners.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 px-3 py-2 text-xs font-bold shadow-[var(--shadow-card)] backdrop-blur-sm">
              <MapPin className="h-3.5 w-3.5 text-emerald-500" />
              Maharashtra · mock signals
            </div>
            <button
              type="button"
              onClick={regenerate}
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-500/25"
            >
              <Wand2 className="h-3.5 w-3.5" /> Generate plan
            </button>
          </div>
        </motion.div>

        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 p-4 shadow-[var(--shadow-card)] backdrop-blur-sm">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            <ClipboardList className="h-3.5 w-3.5" /> Plan controls
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">District</span>
              <select
                className={selectCls}
                value={district}
                onChange={(e) => setDistrict(e.target.value as DistrictKey)}
              >
                {DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Action type</span>
              <select
                className={selectCls}
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value as PlanActionType | 'all')}
              >
                {ACTION_FILTERS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-col justify-end">
              <p className="text-[10px] font-semibold text-[var(--text-muted)]">
                Generated {generatedAt.toLocaleTimeString()} · {actions.length} actions
              </p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            {
              label: 'Openings',
              value: summary.totalOpenings,
              icon: Briefcase,
              tone: 'bg-indigo-500/20 text-indigo-300',
            },
            {
              label: 'Local courses',
              value: summary.courseCount,
              icon: BookOpen,
              tone: 'bg-violet-500/20 text-violet-300',
            },
            {
              label: 'Expand',
              value: summary.expandCount,
              icon: ArrowUpRight,
              tone: 'bg-emerald-500/20 text-emerald-300',
            },
            {
              label: 'Reduce / new',
              value: `${summary.reduceCount} / ${summary.newCourseCount}`,
              icon: Target,
              tone: 'bg-amber-500/20 text-amber-300',
            },
            {
              label: 'Trainer pressure',
              value: summary.trainerShortfall,
              icon: Users,
              tone: 'bg-sky-500/20 text-sky-300',
            },
          ].map((k, i) => (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i }}
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

        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 px-4 py-3 text-sm shadow-[var(--shadow-card)] backdrop-blur-sm">
          <span className="font-bold text-[var(--text-primary)]">Readiness: </span>
          <span className="text-[var(--text-secondary)]">{summary.readinessNote}</span>
          <span className="ml-2 text-xs text-[var(--text-muted)]">
            · {summary.uniqueRoles} unique roles in demand signals
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 p-5 shadow-[var(--shadow-card)] backdrop-blur-sm xl:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/20 text-violet-300">
                <Lightbulb className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold">Skills in demand · {district}</h2>
                <p className="text-xs text-[var(--text-muted)]">From job-posting signals</p>
              </div>
            </div>
            {skills.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No skill signals for this district.</p>
            ) : (
              <ul className="space-y-3">
                {skills.map((row) => (
                  <li key={row.skill}>
                    <div className="mb-1 flex justify-between text-xs font-bold">
                      <span>{row.skill}</span>
                      <span className="text-[var(--text-muted)]">
                        {row.openings} · {row.trend}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-indigo-500"
                        style={{ width: `${Math.max(6, row.demand)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 p-5 shadow-[var(--shadow-card)] backdrop-blur-sm xl:col-span-3">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
                <BookOpen className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold">Courses in / for {district}</h2>
                <p className="text-xs text-[var(--text-muted)]">Capacity · placement · flag</p>
              </div>
            </div>
            {localCourses.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">
                No curriculum courses mapped to this district — plan may recommend new pilots.
              </p>
            ) : (
              <ul className="space-y-2">
                {localCourses.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)]/70 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold">{c.name}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        {c.provider} · {c.seats} seats · placement {c.placementRate12m}%
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase ring-1 ring-black/5 ${flagToneLocal(c.flag)}`}
                    >
                      {c.flag.replace('_', ' ')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 p-5 shadow-[var(--shadow-card)] backdrop-blur-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
                <ClipboardList className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold">Actionable plan</h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Action · course / role · why · suggested seats · trainers
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={regenerate}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] px-3 py-1.5 text-[10px] font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
            >
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>

          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--text-muted)]">
              No actions for this filter. Try another district or action type.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-default)] text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    <th className="pb-2 pr-3">Action</th>
                    <th className="pb-2 pr-3">Course / role</th>
                    <th className="pb-2 pr-3">Why</th>
                    <th className="pb-2 pr-3">Suggested seats</th>
                    <th className="pb-2">Trainers / capacity</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-[var(--border-default)]/60 last:border-0 hover:bg-[var(--accent-soft)]/40"
                    >
                      <td className="py-3 pr-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ring-1 ${actionTone(row.action)}`}
                        >
                          {row.action === 'expand' && <ArrowUpRight className="h-3 w-3" />}
                          {row.action === 'reduce' && <ArrowDownRight className="h-3 w-3" />}
                          {row.action === 'add_module' && <PlusCircle className="h-3 w-3" />}
                          {row.action === 'new_course' && <Wand2 className="h-3 w-3" />}
                          {actionLabel(row.action)}
                        </span>
                        <p className="mt-1 text-[9px] font-bold uppercase text-[var(--text-muted)]">
                          {row.priority} priority
                        </p>
                      </td>
                      <td className="py-3 pr-3">
                        <p className="font-bold text-[var(--text-primary)]">{row.courseOrRole}</p>
                        {row.sector && (
                          <p className="text-[10px] text-[var(--text-muted)]">{row.sector}</p>
                        )}
                      </td>
                      <td className="max-w-xs py-3 pr-3 text-[var(--text-secondary)]">{row.why}</td>
                      <td className="py-3 pr-3 font-black text-[var(--text-primary)]">{row.seatDelta}</td>
                      <td className="py-3 text-[var(--text-muted)]">
                        {row.trainersHint || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="text-center text-xs text-[var(--text-muted)]">
          EDUROUTE · SIH26134 district plans · reuses Demand Intel signals + Curriculum Gaps courses
        </p>
      </div>
    </div>
  );
}

export default DistrictTrainingPlan;

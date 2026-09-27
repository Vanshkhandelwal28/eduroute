import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Filter,
  Lightbulb,
  MinusCircle,
  PlusCircle,
  RefreshCw,
  Target,
  TrendingDown,
} from 'lucide-react';
import { StarfieldBackground } from '../../components/StarfieldBackground';
import {
  COURSES,
  RECOMMENDATIONS,
  avgGap,
  flagTone,
  gapPct,
  type CourseCurriculum,
  type CourseFlag,
} from './curriculumGapData';

const FLAG_FILTERS: { id: CourseFlag | 'all'; label: string }[] = [
  { id: 'all', label: 'All courses' },
  { id: 'critical_gap', label: 'Critical gaps' },
  { id: 'obsolete', label: 'Obsolete' },
  { id: 'oversupplied', label: 'Oversupplied' },
  { id: 'healthy', label: 'Healthy' },
];

export function CurriculumGapMapper() {
  const [flagFilter, setFlagFilter] = useState<CourseFlag | 'all'>('all');
  const [selectedId, setSelectedId] = useState(COURSES[0]?.id || '');
  const [sector, setSector] = useState('all');

  const sectors = useMemo(
    () => ['all', ...Array.from(new Set(COURSES.map((c) => c.sector)))],
    [],
  );

  const filtered = useMemo(() => {
    return COURSES.filter((c) => {
      if (flagFilter !== 'all' && c.flag !== flagFilter) return false;
      if (sector !== 'all' && c.sector !== sector) return false;
      return true;
    });
  }, [flagFilter, sector]);

  const selected: CourseCurriculum | undefined =
    filtered.find((c) => c.id === selectedId) || filtered[0] || COURSES[0];

  const recsForSelected = useMemo(
    () => RECOMMENDATIONS.filter((r) => !selected || r.courseId === selected.id),
    [selected],
  );

  const kpis = useMemo(() => {
    const list = filtered.length ? filtered : COURSES;
    const critical = list.filter((c) => c.flag === 'critical_gap' || c.flag === 'obsolete').length;
    const oversupply = list.filter((c) => c.flag === 'oversupplied').length;
    const avgPlacement = Math.round(
      list.reduce((a, c) => a + c.placementRate12m, 0) / Math.max(1, list.length),
    );
    const avgGapAll = Math.round(list.reduce((a, c) => a + avgGap(c), 0) / Math.max(1, list.length));
    return { courses: list.length, critical, oversupply, avgPlacement, avgGapAll };
  }, [filtered]);

  const selectCls =
    'rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--accent)]';

  return (
    <div className="relative min-h-full overflow-hidden text-[var(--text-primary)]">
      <div className="pointer-events-none absolute inset-0 z-0 opacity-35 dark:opacity-65">
        <StarfieldBackground />
        <div className="absolute inset-0 bg-gradient-to-b from-violet-500/5 via-transparent to-[var(--bg-primary)]" />
      </div>

      <div className="relative z-10 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Curriculum alignment
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">
              Curriculum ↔ Skill Gap Mapper
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
              Map course curriculum to industry skill demand, recommend updates, and flag obsolete or
              oversupplied programmes.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 px-3 py-2 text-xs font-bold shadow-[var(--shadow-card)] backdrop-blur-sm">
            <Target className="h-3.5 w-3.5 text-violet-500" />
            Training-provider view · mock cohort
          </div>
        </motion.div>

        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 p-4 shadow-[var(--shadow-card)] backdrop-blur-sm">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            <Filter className="h-3.5 w-3.5" /> Filters
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Flag</span>
              <select
                className={selectCls}
                value={flagFilter}
                onChange={(e) => setFlagFilter(e.target.value as CourseFlag | 'all')}
              >
                {FLAG_FILTERS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Sector</span>
              <select className={selectCls} value={sector} onChange={(e) => setSector(e.target.value)}>
                {sectors.map((s) => (
                  <option key={s} value={s}>
                    {s === 'all' ? 'All sectors' : s}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            { label: 'Courses', value: kpis.courses, icon: BookOpen, tone: 'bg-indigo-500/20 text-indigo-300' },
            { label: 'Critical / obsolete', value: kpis.critical, icon: AlertTriangle, tone: 'bg-rose-500/20 text-rose-300' },
            { label: 'Oversupplied', value: kpis.oversupply, icon: TrendingDown, tone: 'bg-amber-500/20 text-amber-300' },
            { label: 'Avg placement 12m', value: `${kpis.avgPlacement}%`, icon: CheckCircle2, tone: 'bg-emerald-500/20 text-emerald-300' },
            { label: 'Avg skill gap', value: `${kpis.avgGapAll} pts`, icon: Target, tone: 'bg-violet-500/20 text-violet-300' },
          ].map((k, i) => (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
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
          <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 p-4 shadow-[var(--shadow-card)] backdrop-blur-sm xl:col-span-2">
            <h2 className="mb-3 text-sm font-bold">Courses & flags</h2>
            <ul className="max-h-[28rem] space-y-2 overflow-y-auto">
              {filtered.map((c) => {
                const active = selected?.id === c.id;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(c.id)}
                      className={`w-full rounded-2xl border p-3 text-left transition ${
                        active
                          ? 'border-indigo-400 ring-2 ring-indigo-400/30 bg-[var(--accent-soft)]/50'
                          : 'border-[var(--border-default)] bg-[var(--bg-elevated)]/60 hover:border-indigo-300/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">{c.name}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">
                            {c.provider} · {c.district} · {c.sector}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase ring-1 ${flagTone(c.flag)}`}
                        >
                          {c.flag.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold text-[var(--text-muted)]">
                        <span>Placement {c.placementRate12m}%</span>
                        <span>· Gap avg {avgGap(c)} pts</span>
                        <span>· Seats {c.seats}</span>
                      </div>
                    </button>
                  </li>
                );
              })}
              {filtered.length === 0 && (
                <p className="py-6 text-center text-sm text-[var(--text-muted)]">No courses match filters.</p>
              )}
            </ul>
          </section>

          <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 p-5 shadow-[var(--shadow-card)] backdrop-blur-sm xl:col-span-3">
            {selected ? (
              <>
                <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-bold">{selected.name}</h2>
                    <p className="text-xs text-[var(--text-muted)]">{selected.flagLabel}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ring-1 ${flagTone(selected.flag)}`}>
                    {selected.flag.replace('_', ' ')}
                  </span>
                </div>

                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Curriculum → industry skill map
                </p>
                <ul className="space-y-4">
                  {selected.skills.map((s) => {
                    const gap = gapPct(s.taughtPct, s.demandPct);
                    return (
                      <li key={s.skill}>
                        <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                          <span>
                            {s.skill}{' '}
                            <span className="font-semibold text-[var(--text-muted)]">({s.level})</span>
                          </span>
                          <span className="text-[var(--text-muted)]">
                            taught {s.taughtPct}% · demand {s.demandPct}%
                            {gap > 0 && (
                              <span className="ml-1 text-rose-600 dark:text-rose-400">· gap {gap} pts</span>
                            )}
                          </span>
                        </div>
                        <div className="relative h-3 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                          <div
                            className="absolute inset-y-0 left-0 rounded-full bg-indigo-500/40"
                            style={{ width: `${s.demandPct}%` }}
                            title="Demand"
                          />
                          <div
                            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                            style={{ width: `${s.taughtPct}%` }}
                            title="Taught"
                          />
                        </div>
                        <div className="mt-0.5 flex justify-between text-[9px] font-semibold text-[var(--text-muted)]">
                          <span>Taught (fill)</span>
                          <span>Demand (track)</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">Select a course.</p>
            )}
          </section>
        </div>

        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 p-5 shadow-[var(--shadow-card)] backdrop-blur-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300">
              <Lightbulb className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold">Curriculum update recommendations</h2>
              <p className="text-xs text-[var(--text-muted)]">
                {selected ? `For ${selected.name}` : 'All courses'} — add / remove / update modules
              </p>
            </div>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {(recsForSelected.length ? recsForSelected : RECOMMENDATIONS).map((r) => {
              const Icon = r.type === 'add' ? PlusCircle : r.type === 'remove' ? MinusCircle : RefreshCw;
              const tone =
                r.type === 'add'
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : r.type === 'remove'
                    ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                    : 'bg-sky-500/15 text-sky-700 dark:text-sky-300';
              return (
                <li
                  key={r.id}
                  className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)]/80 p-4"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${tone}`}>
                      <Icon className="h-3 w-3" />
                      {r.type}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        r.priority === 'high'
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-300'
                          : 'bg-slate-500/10 text-[var(--text-muted)]'
                      }`}
                    >
                      {r.priority} priority
                    </span>
                  </div>
                  <p className="text-sm font-bold">{r.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">{r.detail}</p>
                </li>
              );
            })}
          </ul>
        </section>

        <p className="pb-2 text-center text-[10px] text-[var(--text-muted)]">
          EDUROUTE · Curriculum gap mapper · Red badges = obsolete / oversupplied /
          low placement
        </p>
      </div>
    </div>
  );
}

export default CurriculumGapMapper;

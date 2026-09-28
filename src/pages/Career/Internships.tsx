import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Clock,
  IndianRupee,
} from 'lucide-react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';
import {
  applyToInternship,
  hasApplied,
  readApplications,
  statusBadgeClass,
  type InternshipApplication,
} from '../../utils/internshipApplications';
import { industryPostingsAsInternships } from '../../utils/industryStore';
import { BuildCvCta } from '../../components/BuildCvCta';
import { LiveAdzunaInternships } from '../../components/LiveAdzunaInternships';
import { INTERNSHIPS } from './internshipData';

export { INTERNSHIPS };

function AuroraBg({ reduceMotion }: { reduceMotion: boolean | null }) {
  if (reduceMotion) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute -left-20 top-10 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl" />
      <div className="absolute right-0 top-40 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="absolute bottom-20 left-1/3 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />
    </div>
  );
}

function MyApplicationsPanel() {
  const [apps, setApps] = useState<InternshipApplication[]>(() => readApplications());
  useEffect(() => {
    const refresh = () => setApps(readApplications());
    window.addEventListener('eduroute:applications-updated', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('eduroute:applications-updated', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);
  if (apps.length === 0) return null;
  return (
    <section className="mb-10 rounded-[28px] border border-white/15 bg-white/70 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/55">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-lg font-black text-slate-900 dark:text-white">My Applications</h2>
        <span className="text-xs font-bold text-slate-400 dark:text-slate-500">{apps.length} total</span>
      </div>
      <ul className="space-y-3">
        {apps.map((app) => (
          <li key={app.internshipId} className="rounded-2xl border border-slate-100/80 bg-white/60 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="truncate font-bold text-slate-900 dark:text-white">{app.role}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {app.company} · Applied {new Date(app.appliedAt).toLocaleDateString()}
                </div>
              </div>
              <span className={`shrink-0 self-start rounded-full px-3 py-1 text-[11px] font-bold sm:self-center ${statusBadgeClass(app.status)}`}>
                {app.status}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function InternshipCard({ job }: { job: (typeof INTERNSHIPS)[number] & { fromIndustry?: boolean } }) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [7, -7]), { stiffness: 280, damping: 22 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-9, 9]), { stiffness: 280, damping: 22 });
  const applied = hasApplied(job.id);

  const onMove = (e: React.MouseEvent) => {
    if (reduceMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <motion.div
      ref={ref}
      style={reduceMotion ? undefined : { rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      whileHover={reduceMotion ? undefined : { y: -6 }}
      className="group relative"
    >
      <div className="pointer-events-none absolute -inset-[1px] rounded-[26px] bg-gradient-to-br from-violet-500/40 via-indigo-500/25 to-transparent opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative overflow-hidden rounded-[24px] border border-white/20 bg-white/75 p-5 shadow-[0_8px_32px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-shadow duration-300 group-hover:shadow-[0_20px_50px_rgba(99,102,241,0.18)] dark:border-white/10 dark:bg-slate-900/60 dark:group-hover:shadow-[0_20px_50px_rgba(139,92,246,0.22)]">
        <div className="mb-3 flex items-start gap-3">
          <img src={job.logo} alt="" className="h-12 w-12 rounded-2xl object-cover ring-2 ring-white/30 shadow-md" />
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-bold text-slate-900 dark:text-white">{job.role}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{job.company}</p>
          </div>
        </div>
        <div className="mb-3 flex flex-wrap gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-violet-500" />{job.location}</span>
          <span className="inline-flex items-center gap-1"><IndianRupee className="h-3.5 w-3.5 text-emerald-500" />{job.stipend}</span>
          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-indigo-500" />{job.duration}</span>
        </div>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {(job.tags || []).slice(0, 4).map((t) => (
            <span key={t} className="rounded-full border border-slate-200/80 bg-white/70 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300">{t}</span>
          ))}
        </div>
        <div className="flex gap-2">
          <Link to={`/company/${job.id}`} className="flex-1 rounded-xl bg-slate-900 py-2.5 text-center text-sm font-bold text-white transition hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-500">
            View
          </Link>
          <button
            type="button"
            disabled={applied}
            onClick={() => {
              if (applied) return;
              applyToInternship({
                internshipId: job.id,
                role: job.role,
                company: job.company,
                location: job.location,
                stipend: job.stipend,
                logo: job.logo,
              });
            }}
            className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${applied ? 'bg-emerald-600 text-white' : 'border border-indigo-200/80 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-500/40 dark:bg-indigo-950/50 dark:text-indigo-300'}`}
          >
            {applied ? 'Applied' : 'Apply'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export const Internships = () => {
  const reduceMotion = useReducedMotion();
  const [filter, setFilter] = useState('all');
  const jobs = useMemo(() => {
    const industry = industryPostingsAsInternships();
    const all = [...industry, ...INTERNSHIPS];
    if (filter === 'all') return all;
    return all.filter((j) => j.sector === filter || (j.tags || []).join(' ').toLowerCase().includes(filter));
  }, [filter]);

  return (
    <div className="relative mx-auto max-w-6xl flex-1 overflow-x-hidden px-4 py-8 md:px-8">
      <AuroraBg reduceMotion={reduceMotion} />
      <div className="relative z-10">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white md:text-4xl">Internships & Jobs</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">Curated roles + live openings from the job market.</p>
        </div>

        <MyApplicationsPanel />
        <LiveAdzunaInternships />

        <div className="mb-6 flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'All' },
            { id: 'software', label: 'Software' },
            { id: 'data', label: 'Data / ML' },
            { id: 'cyber', label: 'Cyber' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                filter === f.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'border border-slate-200/80 bg-white/70 text-slate-600 backdrop-blur dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="mb-8">
          <BuildCvCta />
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" style={{ perspective: 1200 }}>
          {jobs.map((job) => (
            <InternshipCard key={job.id} job={job as any} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Internships;

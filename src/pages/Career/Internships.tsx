import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  MapPin,
  Clock,
  IndianRupee,
  Building2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
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
    <section className="mb-10 rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/90 p-6 shadow-sm dark:border-slate-700/80 dark:from-slate-900 dark:to-slate-950">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-lg font-black text-slate-900 dark:text-white">My Applications</h2>
        <span className="text-xs font-bold text-slate-400 dark:text-slate-500">{apps.length} total</span>
      </div>
      <ul className="space-y-3">
        {apps.map((app) => (
          <li key={app.internshipId} className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40">
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
  const applied = hasApplied(job.id);
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800">
      <div className="mb-3 flex items-start gap-3">
        <img src={job.logo} alt="" className="h-12 w-12 rounded-2xl object-cover" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-bold text-slate-900 dark:text-white">{job.role}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{job.company}</p>
        </div>
      </div>
      <div className="mb-3 flex flex-wrap gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span>
        <span className="inline-flex items-center gap-1"><IndianRupee className="h-3.5 w-3.5" />{job.stipend}</span>
        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{job.duration}</span>
      </div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {(job.tags || []).slice(0, 4).map((t) => (
          <span key={t} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{t}</span>
        ))}
      </div>
      <div className="flex gap-2">
        <Link to={`/company/${job.id}`} className="flex-1 rounded-xl bg-slate-900 py-2.5 text-center text-sm font-bold text-white hover:bg-indigo-600 dark:bg-indigo-600">
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
          className={`rounded-xl px-4 py-2.5 text-sm font-bold ${applied ? 'bg-emerald-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300'}`}
        >
          {applied ? 'Applied' : 'Apply'}
        </button>
      </div>
    </div>
  );
}

export const Internships = () => {
  const [filter, setFilter] = useState('all');
  const jobs = useMemo(() => {
    const industry = industryPostingsAsInternships();
    const all = [...industry, ...INTERNSHIPS];
    if (filter === 'all') return all;
    return all.filter((j) => j.sector === filter || (j.tags || []).join(' ').toLowerCase().includes(filter));
  }, [filter]);

  return (
    <div className="mx-auto max-w-6xl flex-1 px-4 py-8 md:px-8">
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
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mb-8">
        <BuildCvCta />
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {jobs.map((job) => (
          <InternshipCard key={job.id} job={job as any} />
        ))}
      </div>
    </div>
  );
};

export default Internships;

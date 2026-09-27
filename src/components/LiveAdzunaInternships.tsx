import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Loader2, RefreshCw, Sparkles } from 'lucide-react';

type LiveJob = {
  id: string;
  role: string;
  company: string;
  location: string;
  stipend: string;
  type: string;
  duration: string;
  mode: string;
  posted: string;
  description: string;
  applyUrl: string;
  tags?: string[];
  source?: string;
};

export function LiveAdzunaInternships() {
  const [jobs, setJobs] = useState<LiveJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('software internship');

  const load = useCallback(async (q: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/internship-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ what: q, where: 'India', page: 1 }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || 'Could not load live roles');
        setJobs([]);
      } else {
        setJobs(Array.isArray(data.jobs) ? data.jobs : []);
        if (!(data.jobs && data.jobs.length)) {
          setError('No live openings returned — try another keyword or check Adzuna keys.');
        }
      }
    } catch (e) {
      setError(String((e as Error).message || e));
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(query);
  }, []); // initial load only

  return (
    <section className="mb-10 rounded-[28px] border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-5 shadow-sm dark:border-emerald-500/30 dark:from-emerald-950/40 dark:via-slate-900 dark:to-teal-950/30 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">Live roles · Adzuna</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Real India openings with official redirect links
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void load(query);
            }}
            placeholder="e.g. react internship"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900"
          />
          <button
            type="button"
            onClick={() => void load(query)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Fetch live
          </button>
        </div>
      </div>

      {error && !jobs.length && (
        <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          {error}
        </p>
      )}

      {loading && !jobs.length ? (
        <p className="py-8 text-center text-sm text-slate-500">Loading live internships…</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <li
              key={job.id}
              className="flex flex-col rounded-2xl border border-slate-200/80 bg-white/90 p-4 dark:border-slate-700 dark:bg-slate-900/80"
            >
              <p className="line-clamp-2 text-sm font-black text-slate-900 dark:text-white">{job.role}</p>
              <p className="mt-0.5 text-xs font-semibold text-slate-500">{job.company}</p>
              <p className="mt-2 line-clamp-2 text-[11px] text-slate-500">{job.description}</p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold text-slate-500">
                <span className="rounded-lg bg-slate-100 px-2 py-0.5 dark:bg-slate-800">{job.location}</span>
                <span className="rounded-lg bg-slate-100 px-2 py-0.5 dark:bg-slate-800">{job.stipend}</span>
              </div>
              {job.applyUrl ? (
                <a
                  href={job.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-500"
                >
                  Apply on source <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default LiveAdzunaInternships;

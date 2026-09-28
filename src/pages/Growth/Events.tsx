import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { fadeUpItem, staggerContainer } from '../../utils/motionPresets';
import {
  ArrowRight,
  Calendar,
  ExternalLink,
  Globe2,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';

type Region = 'india' | 'international' | 'all';

type LiveEvent = {
  id: string;
  title: string;
  date: string;
  location: string;
  category: string;
  region?: string;
  attendees?: string;
  description?: string;
  url: string;
  source?: string;
  company?: string;
  tags?: string[];
  aiSummary?: string;
  verified?: boolean;
};

const TABS: { id: Region; label: string }[] = [
  { id: 'india', label: 'India' },
  { id: 'international', label: 'International' },
  { id: 'all', label: 'All' },
];

const CATEGORY_FILTERS = ['All', 'Hackathon', 'Internship', 'Workshop', 'Meetup', 'Gov', 'Career'] as const;

function sourceBadge(source?: string) {
  const s = (source || '').toLowerCase();
  if (s === 'adzuna') return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400';
  if (s === 'gov') return 'bg-amber-500/15 text-amber-700 dark:text-amber-400';
  if (s === 'mlh' || s === 'devpost' || s === 'devfolio') return 'bg-violet-500/15 text-violet-600 dark:text-violet-400';
  return 'bg-sky-500/15 text-sky-600 dark:text-sky-400';
}

export const Events = () => {
  const [region, setRegion] = useState<Region>('india');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORY_FILTERS)[number]>('All');
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');
  const [meta, setMeta] = useState({ liveCount: 0, curatedCount: 0, aiNote: '', aiUsed: false, warnings: [] as string[] });

  const load = useCallback(async (opts: { region: Region; query: string; aiRefresh?: boolean }) => {
    const isAi = Boolean(opts.aiRefresh);
    if (isAi) setAiLoading(true);
    else setLoading(true);
    setError('');
    try {
      const res = await fetch('/.netlify/functions/events-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region: opts.region,
          query: opts.query,
          page: 1,
          aiRefresh: isAi,
        }),
      });
      const data = await res.json();
      if (!data.ok && !(data.events && data.events.length)) {
        setError(data.error || 'Could not load events');
        setEvents([]);
        return;
      }
      const list: LiveEvent[] = Array.isArray(data.events) ? data.events.filter((e: LiveEvent) => e.url) : [];
      setEvents(list);
      setMeta({
        liveCount: data.liveCount || 0,
        curatedCount: data.curatedCount || 0,
        aiNote: data.aiNote || '',
        aiUsed: Boolean(data.aiUsed),
        warnings: Array.isArray(data.warnings) ? data.warnings : [],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
      setEvents([]);
    } finally {
      setLoading(false);
      setAiLoading(false);
    }
  }, []);

  useEffect(() => {
    void load({ region, query: query.trim() });
  }, [region]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (category === 'All') return true;
      return (e.category || '').toLowerCase().includes(category.toLowerCase());
    });
  }, [events, category]);

  return (
    <motion.div
      className="mx-auto max-w-7xl flex-1 p-4 md:p-8"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex-1">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-600 dark:text-sky-400">
            <Globe2 className="h-3.5 w-3.5" />
            Live · Adzuna + platforms + gov hubs
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-4xl">
            Growth Events
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Live openings and event hubs with <strong>working redirect links</strong> to the organizer page.
            Switch to <strong>International</strong> for out-of-India listings. Use <strong>AI Refresh</strong> to
            re-rank results for students.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loading || aiLoading}
            onClick={() => void load({ region, query: query.trim() })}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </button>
          <button
            type="button"
            disabled={loading || aiLoading}
            onClick={() => void load({ region, query: query.trim(), aiRefresh: true })}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/30 ring-2 ring-violet-400/40 transition hover:opacity-95 disabled:opacity-60"
          >
            {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            AI Refresh
          </button>
        </div>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setRegion(t.id)}
            className={`rounded-2xl px-5 py-2.5 text-sm font-bold transition ${
              region === t.id
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void load({ region, query: query.trim() });
            }}
            placeholder="Search hackathons, internships…"
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>
        <button
          type="button"
          onClick={() => void load({ region, query: query.trim() })}
          className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white dark:bg-slate-100 dark:text-slate-900"
        >
          Search
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {CATEGORY_FILTERS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
              category === c
                ? 'bg-indigo-600 text-white'
                : 'border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-2.5 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
        <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 font-semibold text-emerald-700 dark:text-emerald-400">
          {meta.liveCount} live (Adzuna)
        </span>
        <span className="rounded-lg bg-sky-500/10 px-2.5 py-1 font-semibold text-sky-700 dark:text-sky-400">
          {meta.curatedCount} platforms / gov
        </span>
        <span>{filtered.length} showing</span>
        {meta.aiUsed && meta.aiNote && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-violet-500/10 px-2.5 py-1 font-medium text-violet-700 dark:text-violet-300">
            <Sparkles className="h-3 w-3" /> {meta.aiNote}
          </span>
        )}
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-200">
          {error}
        </p>
      )}

      {loading && !filtered.length ? (
        <div className="flex items-center justify-center gap-2 py-24 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading live events…
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {filtered.map((event) => (
            <motion.article
              key={event.id}
              variants={fadeUpItem}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="group flex flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-md transition-shadow hover:border-sky-400/40 hover:shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30 dark:hover:border-sky-500/40"
            >
              <div className="flex flex-1 flex-col p-6">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-indigo-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                    {event.category}
                  </span>
                  <span className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase ${sourceBadge(event.source)}`}>
                    {event.source || 'web'}
                  </span>
                  {event.region === 'international' && (
                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      International
                    </span>
                  )}
                </div>
                <h3 className="mb-2 line-clamp-2 text-lg font-bold text-slate-900 dark:text-white">{event.title}</h3>
                {event.company && (
                  <p className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">{event.company}</p>
                )}
                <p className="mb-4 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  {event.aiSummary || event.description}
                </p>
                <div className="mb-5 space-y-2 text-sm text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2 font-medium">
                    <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
                    {event.date}
                  </div>
                  <div className="flex items-center gap-2 font-medium">
                    <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                    {event.location}
                  </div>
                </div>
                <a
                  href={event.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-50 py-3.5 text-sm font-bold text-slate-900 transition-all group-hover:bg-indigo-600 group-hover:text-white dark:bg-slate-800 dark:text-white dark:group-hover:bg-indigo-600"
                >
                  Open event page
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </motion.article>
          ))}
        </motion.div>
      )}

      {!loading && filtered.length === 0 && (
        <p className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">No events match your filters.</p>
      )}

      <p className="mt-10 text-center text-[11px] text-slate-400 dark:text-slate-500">
        Links open the official organizer page. Live roles need Adzuna keys. AI Refresh never invents URLs.
      </p>
    </motion.div>
  );
};

export default Events;

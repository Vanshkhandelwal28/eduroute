import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Award,
  ExternalLink,
  Search,
  Sparkles,
  GraduationCap,
  Building2,
  Clock,
  Bot,
  Loader2,
  Target,
} from 'lucide-react';
import { CosmicParticleBackground } from '../../components/CosmicParticleBackground';
import { CertLottieHero, CertBadgeSuccess } from '../../components/CertLottieHero';
import {
  CATEGORIES,
  CERT_COURSES,
  buildDefaultPrompt,
  suggestFromCatalog,
  type Suggestion,
} from './certCatalog';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const cardAnim = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 360, damping: 28 },
  },
};

export const Certifications = () => {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('All');
  const [query, setQuery] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestNote, setSuggestNote] = useState('');
  const [badgeShow, setBadgeShow] = useState(false);

  useEffect(() => {
    if (!badgeShow) return;
    const id = window.setTimeout(() => setBadgeShow(false), 2800);
    return () => window.clearTimeout(id);
  }, [badgeShow]);

  useEffect(() => {
    const defaults = buildDefaultPrompt();
    if (defaults) setAiPrompt(defaults);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CERT_COURSES.filter((c) => {
      const catOk = category === 'All' || c.category === category;
      const searchOk =
        !q ||
        c.title.toLowerCase().includes(q) ||
        c.provider.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q);
      return catOk && searchOk;
    });
  }, [category, query]);

  const suggestedIds = useMemo(() => new Set((suggestions || []).map((s) => s.course.id)), [suggestions]);

  const runSuggest = () => {
    const text = aiPrompt.trim();
    if (!text) {
      setSuggestNote('Type what you want, e.g. cyber related course or frontend with React.');
      setSuggestions(null);
      return;
    }
    setSuggesting(true);
    setSuggestNote('');
    window.setTimeout(() => {
      const results = suggestFromCatalog(text);
      setSuggestions(results);
      if (results.length === 0) {
        setSuggestNote('No strong match. Try: cyber, frontend, data, cloud, AWS, Python, marketing.');
      } else {
        setSuggestNote(`Found ${results.length} course${results.length > 1 ? 's' : ''} from our free list based on your interest.`);
      }
      setSuggesting(false);
    }, 400);
  };

  return (
    <div className="relative flex-1 min-h-[calc(100vh-4rem)] overflow-hidden">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
        <CosmicParticleBackground />
        <div className="absolute inset-0 bg-gradient-to-b from-white/85 via-white/70 to-white/80 dark:from-slate-950/80 dark:via-slate-950/55 dark:to-slate-950/75" />
        <div className="absolute inset-0 bg-violet-50/20 dark:bg-indigo-950/20" />
        <div className="absolute -left-16 top-24 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="absolute right-0 top-40 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <CertBadgeSuccess show={badgeShow} />

      <div className="relative z-10 p-4 md:p-8 max-w-7xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-violet-100/90 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 backdrop-blur-sm">
                <Award className="h-6 w-6" />
              </div>
              <span className="text-sm font-black uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400">
                Free industry certs
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-3 leading-tight drop-shadow-sm">
              Courses & Certificates
            </h1>
            <p className="text-slate-600 dark:text-slate-300 text-lg max-w-2xl leading-relaxed">
              Ask in plain language (e.g. cyber related course). AI Suggest returns 1-2 courses from this free list only.
            </p>
          </div>
          <CertLottieHero className="hidden sm:flex h-36 w-44 shrink-0" />
        </header>

        <section className="mb-10 rounded-[28px] border border-violet-200/80 dark:border-violet-500/30 bg-gradient-to-br from-violet-50/90 via-white/90 to-indigo-50/80 dark:from-violet-950/50 dark:via-slate-900/85 dark:to-indigo-950/40 p-6 md:p-8 shadow-sm backdrop-blur-md">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                AI Suggest course
                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-300 bg-violet-100 dark:bg-violet-500/20 px-2 py-0.5 rounded-full">
                  Buddy-style
                </span>
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Type your interest naturally. Only our free catalog is used.
              </p>
            </div>
          </div>

          <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
            What do you want to learn?
          </label>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                runSuggest();
              }
            }}
            rows={3}
            placeholder="e.g. I want cyber related course"
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/60 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-violet-500/30 resize-y min-h-[88px]"
          />

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={runSuggest}
              disabled={suggesting}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/25 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-60"
            >
              {suggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {suggesting ? 'Finding matches...' : 'Suggest courses'}
            </button>
            {suggestNote && <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{suggestNote}</p>}
          </div>

          {suggestions && suggestions.length > 0 && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {suggestions.map(({ course, reason }) => (
                <div
                  key={course.id}
                  className="rounded-2xl border border-violet-200 dark:border-violet-500/30 bg-white/80 dark:bg-slate-900/80 p-5 shadow-sm backdrop-blur-md"
                >
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-violet-600 dark:text-violet-300 mb-2">
                    <Target className="h-3.5 w-3.5" /> AI pick · {course.provider}
                  </div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base leading-snug">{course.title}</h3>
                  <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">{reason}</p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{course.description}</p>
                  <a
                    href={course.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setBadgeShow(true)}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-violet-500"
                  >
                    Start free course <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`rounded-2xl px-4 py-2.5 text-xs font-black uppercase tracking-wide transition ${
                  category === cat
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-950/40'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search provider or skill..."
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-3 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
        </div>

        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" style={{ perspective: 1200 }}>
          {filtered.map((course) => {
            const isAiPick = suggestedIds.has(course.id);
            return (
              <motion.article
                key={course.id}
                variants={cardAnim}
                whileHover={{ y: -10, scale: 1.02, rotateX: 5, rotateY: -4 }}
                whileTap={{ scale: 0.99 }}
                style={{ transformPerspective: 900 }}
                className={`group relative flex flex-col overflow-hidden rounded-[28px] border p-6 shadow-[0_8px_32px_rgba(15,23,42,0.06)] hover:shadow-[0_24px_50px_rgba(139,92,246,0.2)] dark:hover:shadow-violet-950/40 transition-shadow duration-300 ${
                  isAiPick
                    ? 'border-violet-400/70 dark:border-violet-500/50 bg-violet-50/70 dark:bg-violet-950/45 backdrop-blur-xl ring-2 ring-violet-400/25'
                    : 'border-white/20 dark:border-white/10 bg-white/75 dark:bg-slate-900/60 backdrop-blur-xl'
                }`}
              >
                <div className="pointer-events-none absolute -inset-[1px] rounded-[28px] bg-gradient-to-br from-violet-500/35 via-indigo-500/15 to-transparent opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative flex items-start justify-between gap-3 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg">
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="rounded-full bg-emerald-50 dark:bg-emerald-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                      Free
                    </span>
                    {isAiPick && (
                      <span className="rounded-full bg-violet-100 dark:bg-violet-500/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-violet-700 dark:text-violet-300">
                        AI pick
                      </span>
                    )}
                  </div>
                </div>
                <div className="relative text-xs font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-400 mb-1">
                  {course.category} · {course.level}
                </div>
                <h3 className="relative text-lg font-black text-slate-900 dark:text-white leading-snug mb-2">{course.title}</h3>
                <p className="relative text-sm text-slate-500 dark:text-slate-400 leading-relaxed flex-1 mb-4">{course.description}</p>
                <div className="relative flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-400 dark:text-slate-500 mb-5">
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" /> {course.provider}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {course.duration}
                  </span>
                </div>
                <a
                  href={course.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setBadgeShow(true)}
                  className="relative mt-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-500/25 hover:from-violet-500 hover:to-indigo-500 transition-colors"
                >
                  <Sparkles className="h-4 w-4" />
                  Start free course
                  <ExternalLink className="h-4 w-4 opacity-90" />
                </a>
              </motion.article>
            );
          })}
        </motion.div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <CertLottieHero className="h-40 w-48" />
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              No courses match your filters. Try another category or search.
            </p>
          </div>
        )}

        <p className="mt-10 text-center text-xs text-slate-400 dark:text-slate-500 max-w-xl mx-auto">
          AI Suggest only picks from this EDUROUTE free catalog. Links open official provider sites.
        </p>
      </div>
    </div>
  );
};

export default Certifications;

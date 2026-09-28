/**
 * Living Learning Path — career-aware progress toward job readiness.
 * Loads path from onboarding career + Groq (buddy-chat), falls back to templates.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeUpItem, staggerContainer } from '../utils/motionPresets';
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Lock,
  RefreshCw,
  Sparkles,
  Target,
} from 'lucide-react';
import {
  careerLabelForUser,
  continueHrefForNode,
  resolveLearningPath,
  type PathNode,
} from '../utils/learningPathStore';

export function LivingLearningPath() {
  const [nodes, setNodes] = useState<PathNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'cache' | 'ai' | 'template'>('cache');
  const [track, setTrack] = useState(careerLabelForUser());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async (forceRefresh?: boolean) => {
    setLoading(true);
    try {
      const res = await resolveLearningPath({ forceRefresh });
      setNodes(res.nodes);
      setSource(res.source);
      setTrack(res.track);
      const current = res.nodes.find((n) => n.status === 'current') || res.nodes[0];
      setSelectedId(current?.id || null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const onUp = () => void load();
    window.addEventListener('eduroute:learning-path-updated', onUp);
    window.addEventListener('eduroute:onboarding-updated', onUp);
    return () => {
      window.removeEventListener('eduroute:learning-path-updated', onUp);
      window.removeEventListener('eduroute:onboarding-updated', onUp);
    };
  }, [load]);

  const selected = useMemo(
    () => nodes.find((n) => n.id === selectedId) || nodes.find((n) => n.status === 'current') || nodes[0],
    [nodes, selectedId],
  );

  const progressPct = useMemo(() => {
    if (!nodes.length) return 0;
    const done = nodes.filter((n) => n.status === 'completed').length;
    return Math.round((done / nodes.length) * 100);
  }, [nodes]);

  const completedCount = useMemo(
    () => nodes.filter((n) => n.status === 'completed').length,
    [nodes],
  );

  return (
    <section className="relative overflow-hidden rounded-3xl border border-indigo-500/25 bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)] ring-1 ring-indigo-500/15 backdrop-blur-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Your Learning Path</p>
          <h2 className="mt-1 text-lg font-black text-[var(--text-primary)]">
            Path for <span className="text-indigo-400">{track}</span>{' '}
            <span className="font-semibold text-[var(--text-secondary)]">— master in-demand skills toward internship & job readiness.</span>
          </h2>
        </div>
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] hover:border-indigo-500/40 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh path
        </button>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="font-semibold text-[var(--text-muted)]">
            {completedCount}/{nodes.length || 0} steps · {progressPct}%
          </span>
          <span className="text-[var(--text-muted)]">
            {source === 'ai' ? 'AI path' : source === 'template' ? 'Template' : 'Saved'}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>

      {loading && !nodes.length ? (
        <p className="mt-6 text-sm text-[var(--text-muted)]">Loading your path…</p>
      ) : (
        <motion.ul className="mt-5 space-y-2" variants={staggerContainer} initial="initial" animate="animate">
          {nodes.map((n, i) => {
            const active = selected?.id === n.id;
            const done = n.status === 'completed';
            const current = n.status === 'current';
            return (
              <motion.li key={n.id} variants={fadeUpItem}>
                <button
                  type="button"
                  onClick={() => setSelectedId(n.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition ${
                    active
                      ? 'border-indigo-500/40 bg-indigo-500/10'
                      : 'border-[var(--border-default)] bg-[var(--bg-elevated)]/50 hover:border-indigo-500/25'
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                      done
                        ? 'bg-emerald-500/20 text-emerald-600'
                        : current
                          ? 'bg-indigo-500/20 text-indigo-400'
                          : 'bg-[var(--bg-card)] text-[var(--text-muted)]'
                    }`}
                  >
                    {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-[var(--text-primary)]">{n.title}</span>
                    <span className="text-[11px] text-[var(--text-muted)]">{n.status}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                </button>
              </motion.li>
            );
          })}
        </motion.ul>
      )}

      {selected && (
        <div className="mt-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4">
          <p className="text-sm font-bold text-[var(--text-primary)]">{selected.title}</p>
          {selected.summary && (
            <p className="mt-1 text-xs text-[var(--text-secondary)]">{selected.summary}</p>
          )}
          <Link
            to={continueHrefForNode(selected)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-500"
          >
            Continue <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </section>
  );
}

export default LivingLearningPath;

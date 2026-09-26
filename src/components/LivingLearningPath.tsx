/**
 * Living Learning Path — career-aware progress toward job readiness.
 * Loads path from onboarding career + Groq (buddy-chat), falls back to templates.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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

  return (
    <section className="relative overflow-hidden rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 p-5 shadow-[var(--shadow-card)] backdrop-blur-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Your Learning Path</p>
          <h2 className="mt-1 text-lg font-black text-[var(--text-primary)]">
            Path for <span className="text-indigo-400">{track}</span>{' '}
            <span className="font-semibold text-[var(--text-secondary)]">— master in-demand skills toward internship & job readiness.</span>
          </h2>
          <p className="mt-1 text-[11px] text-[var(--text-muted)]">
            {source === 'ai' ? 'AI-designed for your career' : source === 'template' ? 'Career template path' : 'Saved path for your account'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-bold text-indigo-300">{progressPct}% Complete</span>
          <button
            type="button"
            disabled={loading}
            onClick={() => void load(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh AI
          </button>
        </div>
      </div>

      {loading && !nodes.length ? (
        <div className="mt-8 flex items-center justify-center gap-2 py-12 text-sm text-[var(--text-muted)]">
          <Sparkles className="h-4 w-4 animate-pulse text-indigo-400" />
          Designing your path…
        </div>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-0 sm:gap-1">
            {nodes.map((node, i) => {
              const isSelected = selected?.id === node.id;
              const done = node.status === 'completed';
              const current = node.status === 'current';
              const locked = node.status === 'locked';
              return (
                <div key={node.id} className="flex items-center">
                  {i > 0 && (
                    <div
                      className={`mx-0.5 h-0.5 w-4 sm:w-8 ${
                        nodes[i - 1]?.status === 'completed' ? 'bg-indigo-500' : 'bg-[var(--border-default)]'
                      }`}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedId(node.id)}
                    className="group flex flex-col items-center gap-1.5"
                  >
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition ${
                        done
                          ? 'border-indigo-500 bg-indigo-600 text-white'
                          : current
                            ? 'border-violet-400 bg-violet-500/20 text-violet-200 ring-4 ring-violet-500/20'
                            : 'border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                      } ${isSelected ? 'scale-110' : ''}`}
                    >
                      {done ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : locked ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        <Target className="h-4 w-4" />
                      )}
                    </span>
                    <span className="max-w-[72px] text-center text-[10px] font-bold leading-tight text-[var(--text-secondary)]">
                      {node.short}
                    </span>
                    <span
                      className={`text-[9px] font-semibold ${
                        done ? 'text-emerald-400' : current ? 'text-violet-300' : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {done ? 'Completed' : current ? 'In Progress' : 'Locked'}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          <p className="mt-4 text-center text-[11px] text-[var(--text-muted)]">
            Tip: click a node for details · Continue opens the matching course or AI designer
          </p>
        </>
      )}

      <AnimatePresence mode="wait">
        {selected && (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-6 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)]/80 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-indigo-400" />
                  <h3 className="text-base font-black text-[var(--text-primary)]">{selected.title}</h3>
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />{' '}
                    {selected.days
                      ? `${selected.days} days · ${selected.hours}h`
                      : `${selected.hours} hours`}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      selected.status === 'completed'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : selected.status === 'current'
                          ? 'bg-violet-500/20 text-violet-300'
                          : 'bg-slate-500/20 text-slate-400'
                    }`}
                  >
                    {selected.status === 'completed'
                      ? 'Completed'
                      : selected.status === 'current'
                        ? 'In Progress'
                        : 'Locked'}
                  </span>
                </p>
                {selected.skills?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Key skills</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {selected.skills.map((s) => (
                        <span
                          key={s}
                          className="rounded-full border border-[var(--border-default)] bg-[var(--bg-card)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--text-secondary)]"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {selected.resources?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Resources</p>
                    <ul className="mt-1.5 space-y-1.5">
                      {selected.resources.map((r, idx) => (
                        <li
                          key={`${r.label}-${idx}`}
                          className="flex items-center justify-between rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)]/80 px-3 py-2 text-xs"
                        >
                          <span className="font-semibold text-[var(--text-primary)]">{r.label}</span>
                          <span className="text-[10px] text-[var(--text-muted)]">
                            {r.kind} · {r.mins} min
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {selected.status !== 'locked' ? (
                  <Link
                    to={continueHrefForNode(selected)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-500"
                  >
                    {selected.status === 'current' ? 'Continue learning' : 'Review module'}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  <p className="rounded-xl border border-[var(--border-default)] px-3 py-2 text-[11px] text-[var(--text-muted)]">
                    Complete previous steps to unlock
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export default LivingLearningPath;

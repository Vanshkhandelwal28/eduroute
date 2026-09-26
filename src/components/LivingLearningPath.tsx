/**
 * Living Learning Path — career-aware progress toward job readiness.
 * Loads path from onboarding career + Groq (buddy-chat), falls back to templates.
 */
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Check,
  Clock,
  Loader2,
  Lock,
  Play,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react';
import {
  resolveLearningPath,
  continueHrefForNode,
  careerLabelForUser,
  type PathNode,
  type PathNodeStatus,
} from '../utils/learningPathStore';

export type { PathNode, PathNodeStatus };

type CtxMenu = { x: number; y: number; node: PathNode } | null;

export function LivingLearningPath({ nodes: nodesProp }: { nodes?: PathNode[] }) {
  const [nodes, setNodes] = useState<PathNode[]>(nodesProp || []);
  const [loading, setLoading] = useState(!nodesProp?.length);
  const [source, setSource] = useState<'cache' | 'ai' | 'template' | 'prop'>('prop');
  const [track, setTrack] = useState(careerLabelForUser());
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [ctx, setCtx] = useState<CtxMenu>(null);

  const load = useCallback(
    async (force = false) => {
      if (nodesProp?.length) {
        setNodes(nodesProp);
        setSource('prop');
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await resolveLearningPath({ forceRefresh: force });
        setNodes(res.nodes);
        setSource(res.source);
        setTrack(res.track);
        setSelectedId(res.nodes.find((n) => n.status === 'current')?.id || res.nodes[0]?.id);
      } catch {
        /* keep previous */
      } finally {
        setLoading(false);
      }
    },
    [nodesProp],
  );

  useEffect(() => {
    void load(false);
    const onUpdate = () => void load(false);
    window.addEventListener('eduroute:learning-path-updated', onUpdate);
    window.addEventListener('eduroute:onboarding-updated', onUpdate);
    return () => {
      window.removeEventListener('eduroute:learning-path-updated', onUpdate);
      window.removeEventListener('eduroute:onboarding-updated', onUpdate);
    };
  }, [load]);

  useEffect(() => {
    if (!selectedId && nodes.length) {
      setSelectedId(nodes.find((n) => n.status === 'current')?.id || nodes[0]?.id);
    }
  }, [nodes, selectedId]);

  const selected = useMemo(
    () => nodes.find((n) => n.id === selectedId) || nodes[0],
    [nodes, selectedId],
  );

  const completed = nodes.filter((n) => n.status === 'completed').length;
  const percent = Math.round((completed / Math.max(nodes.length, 1)) * 100);
  const onContext = (e: MouseEvent, node: PathNode) => {
    e.preventDefault();
    setCtx({ x: e.clientX, y: e.clientY, node });
    setSelectedId(node.id);
  };
  const continueTo = selected ? continueHrefForNode(selected) : '/ai-course-designer';

  return (
    <section className="relative overflow-hidden rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)] md:p-6">
      <div className="pointer-events-none absolute -left-16 top-0 h-40 w-40 rounded-full bg-violet-400/15 blur-3xl dark:bg-violet-600/10" />
      <div className="pointer-events-none absolute -right-10 bottom-0 h-36 w-36 rounded-full bg-indigo-400/15 blur-3xl dark:bg-indigo-500/10" />

      <div className="relative z-10 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">Your Learning Path</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Path for <span className="font-semibold text-[var(--text-primary)]">{track}</span>
            {' — '}master in-demand skills toward internship & job readiness.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-1 text-xs font-bold text-[var(--text-secondary)]">
            {loading ? '…' : `${percent}% Complete`}
          </span>
          <div className="h-2 w-28 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={loading}
            title="Regenerate path with AI from your career"
            className="inline-flex items-center gap-1 rounded-full border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2.5 py-1 text-[10px] font-bold text-[var(--text-secondary)] hover:border-indigo-400/50 hover:text-indigo-400 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Refresh AI
          </button>
        </div>
      </div>

      {source !== 'prop' && (
        <p className="relative z-10 mt-2 text-[10px] text-[var(--text-muted)]">
          {source === 'ai' && (
            <span className="inline-flex items-center gap-1 text-indigo-400">
              <Sparkles className="h-3 w-3" /> Generated from your career via AI
            </span>
          )}
          {source === 'template' && 'Career template (AI offline — still matches your track)'}
          {source === 'cache' && 'Saved path for your account'}
        </p>
      )}

      <div className="relative z-10 mt-6 flex flex-col gap-6 lg:flex-row">
        <div className="min-w-0 flex-1">
          {loading && nodes.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-[var(--text-muted)]">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
              Building your path from career & skill gaps…
            </div>
          ) : (
            <div className="flex flex-wrap items-start justify-between gap-y-8 px-1 sm:flex-nowrap sm:justify-start sm:gap-0">
              {nodes.map((node, i) => {
                const isSel = selectedId === node.id;
                const isLast = i === nodes.length - 1;
                return (
                  <div key={node.id} className="relative flex min-w-[72px] flex-1 flex-col items-center">
                    {!isLast && (
                      <div
                        className={`absolute left-1/2 top-5 h-0.5 w-full ${
                          node.status === 'completed' ? 'bg-indigo-500' : 'bg-[var(--border-default)]'
                        }`}
                        style={{ zIndex: 0 }}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedId(node.id)}
                      onContextMenu={(e) => onContext(e, node)}
                      className={`relative z-[1] flex h-10 w-10 items-center justify-center rounded-full border-2 transition ${
                        node.status === 'completed'
                          ? 'border-indigo-500 bg-indigo-500 text-white'
                          : node.status === 'current'
                            ? 'border-violet-400 bg-[var(--bg-card)] text-violet-400 shadow-[0_0_0_4px_rgba(139,92,246,0.25)]'
                            : 'border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                      } ${isSel ? 'ring-2 ring-offset-2 ring-offset-[var(--bg-card)] ring-violet-400/60' : ''}`}
                    >
                      {node.status === 'completed' ? (
                        <Check className="h-4 w-4" />
                      ) : node.status === 'locked' ? (
                        <Lock className="h-3.5 w-3.5" />
                      ) : (
                        <span className="h-2.5 w-2.5 rounded-full bg-violet-400" />
                      )}
                    </button>
                    <p className="mt-2 max-w-[88px] text-center text-[11px] font-bold leading-tight text-[var(--text-primary)]">
                      {node.short}
                    </p>
                    <p
                      className={`mt-0.5 text-[10px] font-semibold ${
                        node.status === 'completed'
                          ? 'text-indigo-500'
                          : node.status === 'current'
                            ? 'text-violet-400'
                            : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {node.status === 'completed'
                        ? 'Completed'
                        : node.status === 'current'
                          ? 'In Progress'
                          : 'Locked'}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
          <p className="mt-4 text-center text-[10px] text-[var(--text-muted)]">
            Tip: click a node for details · Continue opens the matching course or AI designer
          </p>
        </div>

        <AnimatePresence mode="wait">
          {selected && (
            <motion.aside
              key={selected.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.2 }}
              className="w-full shrink-0 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4 lg:w-[300px]"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-black text-[var(--text-primary)]">{selected.title}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {selected.hours} hours
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        selected.status === 'completed'
                          ? 'bg-indigo-500/15 text-indigo-400'
                          : selected.status === 'current'
                            ? 'bg-violet-500/15 text-violet-400'
                            : 'bg-[var(--bg-card)] text-[var(--text-muted)]'
                      }`}
                    >
                      {selected.status === 'completed'
                        ? 'Completed'
                        : selected.status === 'current'
                          ? 'In Progress'
                          : 'Locked'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Key skills</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selected.skills.map((s) => (
                    <span
                      key={s}
                      className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-2 py-1 text-[10px] font-semibold text-[var(--text-secondary)]"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Resources</p>
                <ul className="mt-2 space-y-2">
                  {selected.resources.map((r) => (
                    <li
                      key={r.label}
                      className="flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-xs"
                    >
                      <BookOpen className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                      <span className="min-w-0 flex-1 font-semibold text-[var(--text-primary)]">
                        {r.label}
                        <span className="block text-[10px] font-normal text-[var(--text-muted)]">
                          {r.kind}
                          {r.mins > 0 ? ` · ${r.mins} min` : ''}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {selected.status !== 'locked' ? (
                <Link
                  to={continueTo}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-500"
                >
                  <Play className="h-4 w-4" />
                  {selected.status === 'current' ? 'Continue learning' : 'Review module'}
                </Link>
              ) : (
                <div className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border-default)] py-3 text-xs font-semibold text-[var(--text-muted)]">
                  <Lock className="h-3.5 w-3.5" /> Complete previous steps to unlock
                </div>
              )}
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {ctx && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed z-50 min-w-[180px] rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-2 shadow-xl"
            style={{ left: ctx.x, top: ctx.y }}
          >
            <button
              type="button"
              className="absolute right-1 top-1 rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
              onClick={() => setCtx(null)}
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <p className="px-2 py-1 text-xs font-bold text-[var(--text-primary)]">{ctx.node.title}</p>
            {ctx.node.status !== 'locked' && (
              <Link
                to={continueHrefForNode(ctx.node)}
                className="mt-1 flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-indigo-400 hover:bg-indigo-500/10"
                onClick={() => setCtx(null)}
              >
                <Play className="h-3.5 w-3.5" /> Open module
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export default LivingLearningPath;

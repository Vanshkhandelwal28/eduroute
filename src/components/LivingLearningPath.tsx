/**
 * Living Learning Path — career rail + soft animated background.
 * Data from onboarding career + Groq (buddy-chat), falls back to templates.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { fadeUpItem, staggerContainer } from '../utils/motionPresets';
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Lock,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { EmptyCoach } from './EmptyCoach';
import {
  careerLabelForUser,
  continueHrefForNode,
  resolveLearningPath,
  type PathNode,
} from '../utils/learningPathStore';

function statusStyles(status: PathNode['status'], active: boolean) {
  if (status === 'completed') {
    return {
      node: 'border-emerald-400/50 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
      rail: 'bg-emerald-500',
      label: 'Done',
    };
  }
  if (status === 'current') {
    return {
      node: active
        ? 'border-indigo-400 bg-indigo-500/25 text-indigo-300 ring-2 ring-indigo-400/40'
        : 'border-indigo-400/50 bg-indigo-500/15 text-indigo-400',
      rail: 'bg-indigo-500',
      label: 'Now',
    };
  }
  return {
    node: active
      ? 'border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-muted)] ring-1 ring-indigo-400/20'
      : 'border-[var(--border-default)] bg-[var(--bg-card)]/80 text-[var(--text-muted)]',
    rail: 'bg-[var(--border-default)]',
    label: 'Locked',
  };
}

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
    const onPath = () => void load();
    // Retake MCQ / onboarding change → rebuild path (replace old)
    const onOnboarding = () => void load(true);
    window.addEventListener('eduroute:learning-path-updated', onPath);
    window.addEventListener('eduroute:onboarding-updated', onOnboarding);
    return () => {
      window.removeEventListener('eduroute:learning-path-updated', onPath);
      window.removeEventListener('eduroute:onboarding-updated', onOnboarding);
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
    <section className="relative overflow-hidden rounded-3xl border border-indigo-500/25 bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)] ring-1 ring-indigo-500/15 md:p-6">
      <div className="er-ambient-motion pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <motion.div
          className="absolute -left-16 -top-20 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl"
          animate={{ x: [0, 24, 0], y: [0, 16, 0], scale: [1, 1.12, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-24 -right-10 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl"
          animate={{ x: [0, -20, 0], y: [0, -14, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
        <motion.div
          className="absolute left-1/3 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-3xl"
          animate={{ opacity: [0.35, 0.65, 0.35] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div
          className="absolute inset-0 opacity-[0.04] dark:opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
            backgroundSize: '20px 20px',
          }}
        />
      </div>

      <div className="relative z-10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-300">
              <Sparkles className="h-3.5 w-3.5" /> Your Learning Path
            </p>
            <h2 className="mt-1 text-lg font-black text-[var(--text-primary)]">
              Path for <span className="text-indigo-400">{track}</span>
            </h2>
            <p className="mt-0.5 max-w-xl text-xs text-[var(--text-secondary)]">
              Career rail toward internship & job readiness — follow steps left to right.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={loading}
            className="er-cta-ghost !px-3 !py-1.5 !text-xs disabled:opacity-50"
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
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>

        {loading && !nodes.length ? (
          <EmptyCoach
            className="mt-6 !py-8"
            loading
            title="Building your path…"
            tip="Aligning career steps from your onboarding track. Hang tight."
          />
        ) : (
          <>
            <div className="relative mt-6 -mx-1 overflow-x-auto pb-2 pt-1">
              <div className="pointer-events-none absolute left-6 right-6 top-[22px] h-0.5 bg-gradient-to-r from-emerald-500/40 via-indigo-500/50 to-[var(--border-default)] md:left-8 md:right-8" />

              <motion.ol
                className="relative z-[1] flex min-w-max gap-0 px-1"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                {nodes.map((n, i) => {
                  const active = selected?.id === n.id;
                  const styles = statusStyles(n.status, active);
                  const isLast = i === nodes.length - 1;
                  return (
                    <motion.li
                      key={n.id}
                      variants={fadeUpItem}
                      className={`flex items-start ${isLast ? '' : 'pr-2 md:pr-4'}`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedId(n.id)}
                        className="group flex w-[7.5rem] flex-col items-center text-center md:w-32"
                      >
                        <span
                          className={`relative z-[1] flex h-11 w-11 items-center justify-center rounded-full border-2 text-sm font-black shadow-sm transition ${styles.node}`}
                        >
                          {n.status === 'completed' ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : n.status === 'locked' ? (
                            <Lock className="h-4 w-4" />
                          ) : (
                            i + 1
                          )}
                        </span>
                        <span className="mt-2 line-clamp-2 min-h-[2.5rem] px-1 text-[11px] font-bold leading-tight text-[var(--text-primary)] group-hover:text-indigo-400">
                          {n.title}
                        </span>
                        <span
                          className={`mt-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                            n.status === 'completed'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                              : n.status === 'current'
                                ? 'bg-indigo-500/15 text-indigo-500 dark:text-indigo-300'
                                : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                          }`}
                        >
                          {styles.label}
                        </span>
                      </button>
                      {!isLast && (
                        <span className="mt-5 hidden h-0.5 w-2 shrink-0 rounded-full bg-transparent md:block" aria-hidden />
                      )}
                    </motion.li>
                  );
                })}
              </motion.ol>
            </div>

            {selected && (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="er-signal-card er-signal-card--path mt-4 !bg-[var(--bg-elevated)]/90 p-4 backdrop-blur-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-[var(--text-primary)]">{selected.title}</p>
                    {selected.short && (
                      <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                        {selected.short}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-muted)]">
                      {selected.hours > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--bg-card)] px-2 py-0.5 font-semibold">
                          <Clock className="h-3 w-3" /> ~{selected.hours}h
                        </span>
                      )}
                      {selected.skills?.slice(0, 4).map((s) => (
                        <span
                          key={s}
                          className="rounded-lg bg-indigo-500/10 px-2 py-0.5 font-semibold text-indigo-600 dark:text-indigo-300"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  {selected.status !== 'locked' && (
                    <Link
                      to={continueHrefForNode(selected)}
                      className="er-cta-primary !px-3.5 !py-2 !text-xs shrink-0"
                    >
                      Continue <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default LivingLearningPath;

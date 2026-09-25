import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  Sparkles,
  Trash2,
  Youtube,
  Wand2,
  CheckCircle2,
  Pencil,
} from 'lucide-react';
import { StarfieldBackground } from '../../components/StarfieldBackground';
import { getAuthUser } from '../../utils/rbacAuth';
import { readOnboarding } from '../../utils/onboardingStore';
import {
  DURATION_PRESETS,
  INTEREST_PRESETS,
  deleteAiCourse,
  readAiCourses,
  saveAiCourse,
  updateCourseTopics,
  type AiDesignedCourse,
  type CourseTopic,
} from '../../utils/aiCourseStore';
import {
  generateAiCourse,
  phaseLabel,
  type GeneratePhase,
} from '../../utils/aiCourseGenerator';

const FIELD_FROM_TRACK: Record<string, string> = {
  software: 'Software Engineering',
  cybersecurity: 'Cybersecurity',
  data_analyst: 'Data Analytics',
};

export function AiCourseDesigner() {
  const user = getAuthUser();
  const profile = useMemo(() => readOnboarding(), []);
  const defaultField =
    profile.interests?.[0] && FIELD_FROM_TRACK[profile.interests[0]]
      ? FIELD_FROM_TRACK[profile.interests[0]]
      : user?.name
        ? 'Software Engineering'
        : 'Software Engineering';

  const [duration, setDuration] = useState<number>(15);
  const [customDays, setCustomDays] = useState('');
  const [useCustomDays, setUseCustomDays] = useState(false);
  const [selected, setSelected] = useState<string[]>(['DSA', 'React']);
  const [customInterest, setCustomInterest] = useState('');
  const [field, setField] = useState(defaultField);
  const [phase, setPhase] = useState<GeneratePhase>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [courses, setCourses] = useState<AiDesignedCourse[]>(() => readAiCourses());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    const list = readAiCourses();
    setCourses(list);
    if (activeId && !list.find((c) => c.id === activeId)) setActiveId(list[0]?.id || null);
  }, [activeId]);

  useEffect(() => {
    const onUp = () => refresh();
    window.addEventListener('eduroute:ai-courses-updated', onUp);
    return () => window.removeEventListener('eduroute:ai-courses-updated', onUp);
  }, [refresh]);

  const active = courses.find((c) => c.id === activeId) || courses[0] || null;
  const days = useCustomDays
    ? Math.min(365, Math.max(1, Number(customDays) || 1))
    : duration;

  const toggleInterest = (name: string) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name].slice(0, 8),
    );
  };

  const handleGenerate = async () => {
    setError('');
    if (!selected.length && !customInterest.trim()) {
      setError('Select at least one area of interest (or enter a custom one).');
      return;
    }
    setBusy(true);
    setPhase('analysing_profile');
    try {
      const course = await generateAiCourse(
        {
          durationDays: days,
          interests: selected,
          customInterest: customInterest.trim() || undefined,
          field: field.trim() || 'General',
          skillGaps: profile.missingSkills || [],
          userId: user?.email || user?.id || 'demo-student',
        },
        setPhase,
      );
      saveAiCourse(course);
      setActiveId(course.id);
      refresh();
    } catch (e) {
      setPhase('error');
      setError(e instanceof Error ? e.message : 'Failed to design course');
    } finally {
      setBusy(false);
    }
  };

  const removeTopic = (courseId: string, topicId: string) => {
    const c = courses.find((x) => x.id === courseId);
    if (!c) return;
    const topics = c.topics.filter((t) => t.id !== topicId);
    updateCourseTopics(courseId, topics);
    refresh();
  };

  const updateTopicHours = (courseId: string, topicId: string, hours: number) => {
    const c = courses.find((x) => x.id === courseId);
    if (!c) return;
    const topics = c.topics.map((t) =>
      t.id === topicId ? { ...t, estimatedHours: Math.max(0.5, hours) } : t,
    );
    updateCourseTopics(courseId, topics);
    refresh();
  };

  const selectCls =
    'rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-indigo-500/40';

  return (
    <div className="relative min-h-full overflow-hidden text-[var(--text-primary)]">
      <div className="pointer-events-none absolute inset-0 z-0 opacity-45 dark:opacity-70">
        <StarfieldBackground />
        <div className="absolute inset-0 bg-gradient-to-b from-violet-500/10 via-transparent to-[var(--bg-primary)]" />
      </div>

      <div className="relative z-10 space-y-6 p-4 sm:p-6 lg:p-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            SIH26134 · AI course designer
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">
            Design your mixed course
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
            Pick duration and interests. We blend your signup field, skill gaps, and industry demand into
            a day-by-day roadmap with YouTube + docs — then you can edit topics.
          </p>
        </motion.div>

        <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
          {/* Builder panel */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 p-5 shadow-[var(--shadow-card)] backdrop-blur-sm"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/20 text-violet-400">
                <Wand2 className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold">Course inputs</h2>
                <p className="text-[11px] text-[var(--text-muted)]">Field from signup / onboarding</p>
              </div>
            </div>

            <label className="block text-xs font-bold uppercase text-[var(--text-muted)]">
              Your field
              <input
                className={`${selectCls} mt-1 w-full`}
                value={field}
                onChange={(e) => setField(e.target.value)}
                placeholder="e.g. Software Engineering"
              />
            </label>

            <div>
              <p className="text-xs font-bold uppercase text-[var(--text-muted)]">Duration (days)</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {DURATION_PRESETS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setUseCustomDays(false);
                      setDuration(d);
                    }}
                    className={`rounded-xl px-3 py-2 text-xs font-black ${
                      !useCustomDays && duration === d
                        ? 'bg-indigo-600 text-white'
                        : 'border border-[var(--border-default)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {d}d
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setUseCustomDays(true)}
                  className={`rounded-xl px-3 py-2 text-xs font-black ${
                    useCustomDays
                      ? 'bg-violet-600 text-white'
                      : 'border border-[var(--border-default)] text-[var(--text-secondary)]'
                  }`}
                >
                  Custom
                </button>
              </div>
              {useCustomDays && (
                <input
                  type="number"
                  min={1}
                  max={365}
                  className={`${selectCls} mt-2 w-full`}
                  placeholder="e.g. 45"
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                />
              )}
            </div>

            <div>
              <p className="text-xs font-bold uppercase text-[var(--text-muted)]">Areas of interest</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {INTEREST_PRESETS.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleInterest(name)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      selected.includes(name)
                        ? 'bg-emerald-600 text-white'
                        : 'border border-[var(--border-default)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <label className="mt-3 block text-xs font-bold text-[var(--text-muted)]">
                Custom (your field)
                <input
                  className={`${selectCls} mt-1 w-full`}
                  placeholder="e.g. Embedded C, GIS, FinTech APIs"
                  value={customInterest}
                  onChange={(e) => setCustomInterest(e.target.value)}
                />
              </label>
            </div>

            {profile.missingSkills?.length > 0 && (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-800 dark:text-amber-200">
                Skill gaps from onboarding: {profile.missingSkills.slice(0, 6).join(', ')}
              </p>
            )}

            {error && (
              <p className="text-xs font-bold text-rose-600 dark:text-rose-400" role="alert">
                {error}
              </p>
            )}

            <button
              type="button"
              disabled={busy}
              onClick={handleGenerate}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-black text-white shadow-lg disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {busy ? 'AI designing…' : 'Generate AI course'}
            </button>

            <AnimatePresence>
              {busy && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4"
                >
                  <div className="flex items-center gap-2 text-sm font-bold text-violet-700 dark:text-violet-200">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {phaseLabel(phase)}
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {(
                      [
                        'analysing_profile',
                        'mapping_demand',
                        'building_outline',
                        'attaching_resources',
                        'finalising',
                      ] as GeneratePhase[]
                    ).map((p) => {
                      const order = [
                        'analysing_profile',
                        'mapping_demand',
                        'building_outline',
                        'attaching_resources',
                        'finalising',
                        'done',
                      ];
                      const done =
                        order.indexOf(phase) > order.indexOf(p) || phase === 'done';
                      const current = phase === p;
                      return (
                        <div
                          key={p}
                          className={`flex items-center gap-2 text-[11px] font-semibold ${
                            done
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : current
                                ? 'text-violet-700 dark:text-violet-200'
                                : 'text-[var(--text-muted)]'
                          }`}
                        >
                          {done ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : current ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <span className="h-3.5 w-3.5 rounded-full border border-current opacity-40" />
                          )}
                          {phaseLabel(p)}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {courses.length > 0 && (
              <div className="border-t border-[var(--border-default)] pt-3">
                <p className="mb-2 text-[10px] font-black uppercase text-[var(--text-muted)]">
                  Saved courses
                </p>
                <ul className="max-h-40 space-y-1 overflow-y-auto">
                  {courses.map((c) => (
                    <li key={c.id} className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setActiveId(c.id)}
                        className={`min-w-0 flex-1 truncate rounded-lg px-2 py-1.5 text-left text-xs font-bold ${
                          active?.id === c.id
                            ? 'bg-indigo-600 text-white'
                            : 'hover:bg-[var(--bg-elevated)]'
                        }`}
                      >
                        {c.title}
                      </button>
                      <button
                        type="button"
                        title="Delete course"
                        onClick={() => {
                          deleteAiCourse(c.id);
                          refresh();
                        }}
                        className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.section>

          {/* Course view */}
          <section className="min-w-0">
            {!active ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--border-default)] bg-[var(--bg-card)]/50 p-8 text-center">
                <BookOpen className="mb-3 h-10 w-10 text-[var(--text-muted)]" />
                <p className="font-bold">No course yet</p>
                <p className="mt-1 max-w-sm text-sm text-[var(--text-muted)]">
                  Choose duration + interests and hit Generate. AI will build a roadmap with YT + docs.
                </p>
              </div>
            ) : (
              <motion.div
                key={active.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 p-5 shadow-[var(--shadow-card)] backdrop-blur-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-black">{active.title}</h2>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">{active.summary}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold uppercase text-[var(--text-muted)]">
                        <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5">
                          {active.durationDays} days
                        </span>
                        <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5">
                          {active.totalHours}h total
                        </span>
                        <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5">
                          {active.topics.length} topics
                        </span>
                        <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5">
                          {active.field}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingId(editingId === active.id ? null : active.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] px-3 py-2 text-xs font-bold"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {editingId === active.id ? 'Done editing' : 'Edit topics'}
                    </button>
                  </div>
                  {active.demandHints?.length > 0 && (
                    <p className="mt-3 text-[11px] text-[var(--text-muted)]">
                      Demand signals: {active.demandHints.join(' · ')}
                    </p>
                  )}
                </div>

                <ul className="space-y-3">
                  {active.topics.map((t, idx) => (
                    <TopicCard
                      key={t.id}
                      topic={t}
                      index={idx}
                      editing={editingId === active.id}
                      onDelete={() => removeTopic(active.id, t.id)}
                      onHours={(h) => updateTopicHours(active.id, t.id, h)}
                    />
                  ))}
                </ul>

                {active.topics.length === 0 && (
                  <p className="text-sm text-[var(--text-muted)]">All topics removed — generate again or undo by regenerating.</p>
                )}
              </motion.div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function TopicCard({
  topic,
  index,
  editing,
  onDelete,
  onHours,
}: {
  topic: CourseTopic;
  index: number;
  editing: boolean;
  onDelete: () => void;
  onHours: (h: number) => void;
}) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 p-4 shadow-[var(--shadow-card)] backdrop-blur-sm"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 px-2.5 py-1 text-[10px] font-black uppercase text-indigo-700 dark:text-indigo-300">
          <Clock className="h-3 w-3" />
          {topic.estimatedHours}h · {topic.dayRange}
        </div>
        {editing && (
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-[10px] font-bold text-[var(--text-muted)]">
              Hours
              <input
                type="number"
                min={0.5}
                step={0.5}
                className="w-16 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 py-1 text-xs"
                value={topic.estimatedHours}
                onChange={(e) => onHours(Number(e.target.value))}
              />
            </label>
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-1 rounded-lg bg-rose-600/90 px-2 py-1 text-[10px] font-black uppercase text-white"
            >
              <Trash2 className="h-3 w-3" /> Delete topic
            </button>
          </div>
        )}
      </div>
      <h3 className="text-sm font-black">{topic.title}</h3>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">{topic.description}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {topic.skills.map((s) => (
          <span
            key={s}
            className="rounded-full border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-bold"
          >
            {s}
          </span>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {topic.youtubeUrl && (
          <a
            href={topic.youtubeUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600/90 px-3 py-1.5 text-[11px] font-bold text-white"
          >
            <Youtube className="h-3.5 w-3.5" />
            {topic.youtubeTitle || 'YouTube'}
            <ExternalLink className="h-3 w-3 opacity-80" />
          </a>
        )}
        {topic.docUrl && (
          <a
            href={topic.docUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-1.5 text-[11px] font-bold"
          >
            <FileText className="h-3.5 w-3.5" />
            {topic.docTitle || 'Document'}
            <ExternalLink className="h-3 w-3 opacity-80" />
          </a>
        )}
      </div>
    </motion.li>
  );
}

export default AiCourseDesigner;

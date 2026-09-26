import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  Loader2,
  Target,
  X,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import type { AiDesignedCourse } from '../utils/aiCourseStore';
import {
  evaluateQuiz,
  generateCourseQuiz,
  quizConfigForDays,
  type QuizQuestion,
  type QuizResult,
} from '../utils/courseQuizGenerator';
import { saveAssessmentResult } from '../utils/courseAssessmentStore';

type Phase = 'loading' | 'ready' | 'running' | 'result' | 'error';

type Props = {
  open: boolean;
  onClose: () => void;
  course: AiDesignedCourse;
  userId?: string;
  /** Called when student passes — parent can open certificate */
  onPassed: () => void;
};

function formatTime(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export function CourseFinalAssessment({ open, onClose, course, userId, onPassed }: Props) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [source, setSource] = useState<'ai' | 'template'>('template');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [idx, setIdx] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const config = useMemo(() => quizConfigForDays(course.durationDays), [course.durationDays]);

  const loadQuiz = useCallback(async () => {
    setPhase('loading');
    setError('');
    setResult(null);
    setAnswers({});
    setIdx(0);
    try {
      const { questions: qs, config: cfg, source: src } = await generateCourseQuiz(course, userId);
      setQuestions(qs);
      setSource(src);
      setRemaining(cfg.timerSeconds);
      setPhase('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate assessment');
      setPhase('error');
    }
  }, [course, userId]);

  useEffect(() => {
    if (open) void loadQuiz();
  }, [open, loadQuiz]);

  // Timer only while running
  useEffect(() => {
    if (phase !== 'running' || remaining <= 0) return;
    const t = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          window.clearInterval(t);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [phase, remaining]);

  // Auto-submit when time hits 0
  useEffect(() => {
    if (phase === 'running' && remaining === 0 && questions.length) {
      void finish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, phase]);

  const finish = async () => {
    if (submitting || !questions.length) return;
    setSubmitting(true);
    try {
      const res = evaluateQuiz(questions, answers, config.passPercent);
      setResult(res);
      saveAssessmentResult(course.id, {
        passed: res.passed,
        percent: res.percent,
        score: res.score,
        total: res.total,
        gapTopics: res.gapTopics,
      });
      setPhase('result');
      if (res.passed) {
        // slight delay so user sees score, then parent can open cert
      }
    } finally {
      setSubmitting(false);
    }
  };

  const start = () => {
    setPhase('running');
    setRemaining(config.timerSeconds);
  };

  const setAnswer = (qid: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  };

  if (!open) return null;

  const q = questions[idx];
  const answeredCount = questions.filter((qq) => (answers[qq.id] || '').trim() !== '').length;
  const timerUrgent = remaining > 0 && remaining <= 60;

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/65 p-3 backdrop-blur-sm sm:p-6">
      <div className="relative flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border-default)] px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">
              Final assessment
            </p>
            <h2 className="truncate text-sm font-black text-[var(--text-primary)]">{course.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            {phase === 'running' && (
              <div
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black ${
                  timerUrgent
                    ? 'bg-rose-500/20 text-rose-600 dark:text-rose-300'
                    : 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                {formatTime(remaining)}
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--border-default)] p-2 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {phase === 'loading' && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              <p className="text-sm font-bold text-[var(--text-primary)]">Generating your quiz with AI…</p>
              <p className="max-w-sm text-xs text-[var(--text-muted)]">
                ~{config.questionCount} questions · {Math.round(config.timerSeconds / 60)} min timer · Pass at{' '}
                {config.passPercent}%
              </p>
            </div>
          )}

          {phase === 'error' && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <AlertTriangle className="h-8 w-8 text-rose-500" />
              <p className="text-sm font-bold text-rose-600">{error || 'Could not build assessment'}</p>
              <button
                type="button"
                onClick={() => void loadQuiz()}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </button>
            </div>
          )}

          {phase === 'ready' && (
            <div className="space-y-4 py-4">
              <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4">
                <p className="text-sm font-black text-[var(--text-primary)]">Before you get the certificate</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                  Complete this final quiz on what you learned. Score <strong>{config.passPercent}% or above</strong> to
                  unlock download. Below that, we show topics you should revise.
                </p>
              </div>
              <ul className="grid gap-2 text-xs text-[var(--text-secondary)] sm:grid-cols-2">
                <li className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2">
                  <span className="font-black text-[var(--text-primary)]">{questions.length}</span> questions
                </li>
                <li className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2">
                  <span className="font-black text-[var(--text-primary)]">{Math.round(config.timerSeconds / 60)} min</span>{' '}
                  timer
                </li>
                <li className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2">
                  MCQ · True/False · short answers
                </li>
                <li className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2">
                  Source: {source === 'ai' ? 'AI-generated' : 'course templates'}
                </li>
              </ul>
              <button
                type="button"
                onClick={start}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-black text-white shadow-lg"
              >
                <Target className="h-4 w-4" /> Start assessment
              </button>
            </div>
          )}

          {phase === 'running' && q && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-muted)]">
                <span>
                  Question {idx + 1} / {questions.length}
                </span>
                <span>
                  Answered {answeredCount}/{questions.length}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all"
                  style={{ width: `${((idx + 1) / questions.length) * 100}%` }}
                />
              </div>

              <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-500">{q.topic}</p>
              <p className="text-sm font-bold leading-relaxed text-[var(--text-primary)]">{q.prompt}</p>
              <p className="text-[10px] font-semibold uppercase text-[var(--text-muted)]">
                {q.type === 'mcq' ? 'Multiple choice' : q.type === 'true_false' ? 'True / False' : 'Short answer'}
              </p>

              {q.type === 'mcq' && (
                <div className="space-y-2">
                  {q.options.map((opt, oi) => {
                    const selected = answers[q.id] === String(oi);
                    return (
                      <button
                        key={oi}
                        type="button"
                        onClick={() => setAnswer(q.id, String(oi))}
                        className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                          selected
                            ? 'border-indigo-500 bg-indigo-500/15 font-bold text-[var(--text-primary)]'
                            : 'border-[var(--border-default)] hover:bg-[var(--bg-elevated)]'
                        }`}
                      >
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-elevated)] text-[11px] font-black">
                          {String.fromCharCode(65 + oi)}
                        </span>
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {q.type === 'true_false' && (
                <div className="grid grid-cols-2 gap-2">
                  {(['true', 'false'] as const).map((v) => {
                    const selected = (answers[q.id] || '').toLowerCase() === v;
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setAnswer(q.id, v)}
                        className={`rounded-xl border px-4 py-3 text-sm font-black capitalize ${
                          selected
                            ? 'border-indigo-500 bg-indigo-500/15 text-indigo-700 dark:text-indigo-200'
                            : 'border-[var(--border-default)]'
                        }`}
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>
              )}

              {q.type === 'short' && (
                <input
                  type="text"
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  placeholder="Type a short answer…"
                  className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => setIdx((i) => Math.max(0, i - 1))}
                  className="rounded-xl border border-[var(--border-default)] px-3 py-2 text-xs font-bold disabled:opacity-40"
                >
                  Previous
                </button>
                {idx < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setIdx((i) => Math.min(questions.length - 1, i + 1))}
                    className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void finish()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                  >
                    {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    Submit assessment
                  </button>
                )}
              </div>
            </div>
          )}

          {phase === 'result' && result && (
            <div className="space-y-4 py-2">
              <div
                className={`rounded-2xl border p-5 text-center ${
                  result.passed
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : 'border-amber-500/40 bg-amber-500/10'
                }`}
              >
                {result.passed ? (
                  <Award className="mx-auto h-10 w-10 text-emerald-600" />
                ) : (
                  <Target className="mx-auto h-10 w-10 text-amber-600" />
                )}
                <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">{result.percent}%</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {result.score} / {result.total} correct · Pass mark {config.passPercent}%
                </p>
                <p className="mt-2 text-sm font-bold text-[var(--text-primary)]">
                  {result.passed ? 'You passed! Certificate unlocked.' : 'Not yet — revise the gaps below and retry.'}
                </p>
              </div>

              {!result.passed && result.gapTopics.length > 0 && (
                <div className="rounded-2xl border border-[var(--border-default)] p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-[var(--text-muted)]">
                    Topics to revise
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {result.gapTopics.map((t) => (
                      <li
                        key={t}
                        className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold text-amber-800 dark:text-amber-200"
                      >
                        {t}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-[11px] text-[var(--text-muted)]">
                    Go back to those modules in your course, then retake the assessment.
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {result.passed ? (
                  <button
                    type="button"
                    onClick={() => {
                      onPassed();
                      onClose();
                    }}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white"
                  >
                    <Award className="h-4 w-4" /> Download certificate
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void loadQuiz()}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black text-white"
                  >
                    <RefreshCw className="h-4 w-4" /> Retake assessment
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-2xl border border-[var(--border-default)] px-4 py-3 text-sm font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CourseFinalAssessment;

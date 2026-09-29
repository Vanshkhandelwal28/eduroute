import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';
import { StarfieldBackground } from '../../components/StarfieldBackground';
import {
  Trophy,
  Timer,
  HelpCircle,
  ChevronRight,
  BarChart2,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useUISound } from '../../contexts/SoundContext';
import { ASSESSMENTS, QUIZ_QUESTIONS_BY_ASSESSMENT } from './assessmentsData';

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const buildQuestionSet = (
  availableQuestions: Array<{ id: string; question: string; options: string[]; correctAnswer: string }>,
  requestedCount: number
) => {
  const safeCount = Math.max(0, Math.min(requestedCount, availableQuestions.length));
  return availableQuestions.slice(0, safeCount);
};

function AuroraBg({ reduceMotion }: { reduceMotion: boolean | null }) {
  if (reduceMotion) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute -left-20 top-10 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl" />
      <div className="absolute right-0 top-40 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="absolute bottom-20 left-1/3 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />
    </div>
  );
}

function GlassStatCard({
  stat,
}: {
  stat: {
    id: string;
    value: string;
    label: string;
    Icon: React.ComponentType<{ className?: string }>;
    idleIcon: string;
  };
}) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [7, -7]), { stiffness: 280, damping: 22 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-9, 9]), { stiffness: 280, damping: 22 });

  const onMove = (e: React.MouseEvent) => {
    if (reduceMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <motion.div
      ref={ref}
      style={reduceMotion ? undefined : { rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      whileHover={reduceMotion ? undefined : { y: -6 }}
      className="group relative"
    >
      <div className="pointer-events-none absolute -inset-[1px] rounded-[32px] bg-gradient-to-br from-violet-500/40 via-indigo-500/25 to-transparent opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative overflow-hidden rounded-[30px] border border-white/20 bg-white/75 p-8 shadow-[0_8px_32px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-all duration-300 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-[0_20px_50px_rgba(99,102,241,0.22)] dark:border-white/10 dark:bg-slate-900/60 dark:group-hover:bg-indigo-600 dark:group-hover:shadow-[0_20px_50px_rgba(139,92,246,0.25)]">
        <div className="pointer-events-none absolute -right-4 -top-4 h-28 w-28 rounded-full bg-indigo-400/0 blur-2xl transition-all duration-300 group-hover:bg-white/20" />
        <div
          className={`mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50/90 transition-all duration-300 group-hover:rotate-6 group-hover:bg-white/20 group-hover:text-white dark:bg-slate-800/80 ${stat.idleIcon}`}
        >
          <stat.Icon className="h-6 w-6" />
        </div>
        <div className="text-4xl font-black text-slate-900 transition-colors duration-300 group-hover:text-white dark:text-white">
          {stat.value}
        </div>
        <div className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 transition-colors duration-300 group-hover:text-indigo-100 dark:text-slate-200">
          {stat.label}
        </div>
      </div>
    </motion.div>
  );
}

function GlassTestCard({
  test,
  onTake,
}: {
  test: (typeof ASSESSMENTS)[number];
  onTake: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [5, -5]), { stiffness: 280, damping: 22 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-7, 7]), { stiffness: 280, damping: 22 });

  const onMove = (e: React.MouseEvent) => {
    if (reduceMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <motion.div
      ref={ref}
      style={reduceMotion ? undefined : { rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      whileHover={reduceMotion ? undefined : { y: -4 }}
      className="group relative"
    >
      <div className="pointer-events-none absolute -inset-[1px] rounded-[32px] bg-gradient-to-br from-violet-500/35 via-indigo-500/20 to-transparent opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative flex flex-col items-center justify-between overflow-hidden rounded-[28px] border border-white/20 bg-white/75 p-8 shadow-[0_8px_32px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-shadow duration-300 group-hover:shadow-[0_20px_50px_rgba(99,102,241,0.18)] dark:border-white/10 dark:bg-slate-900/60 dark:group-hover:shadow-[0_20px_50px_rgba(139,92,246,0.22)] md:flex-row">
        <div className="mb-6 flex items-center gap-8 md:mb-0">
          <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-slate-50/90 text-indigo-600 shadow-sm transition-all group-hover:rotate-6 group-hover:bg-indigo-600 group-hover:text-white dark:bg-slate-800/80 dark:text-indigo-300">
            <HelpCircle className="h-10 w-10" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">{test.title}</h3>
            <div className="mt-2 flex items-center gap-4 text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-300">
              <span className="font-black text-indigo-600 dark:text-indigo-400">{test.category}</span>
              <span className="h-1 w-1 rounded-full bg-slate-200 dark:bg-slate-600" />
              <span>{test.questions} Questions</span>
              <span className="h-1 w-1 rounded-full bg-slate-200 dark:bg-slate-600" />
              <span>{test.time}</span>
            </div>
          </div>
        </div>
        <div className="flex w-full items-center gap-6 md:w-auto">
          <div className="mr-6 hidden flex-col items-end lg:flex">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 dark:text-slate-400">
              Difficulty
            </span>
            <span className="mt-1 text-xs font-black text-slate-700 dark:text-slate-200">
              {test.level.toUpperCase()}
            </span>
          </div>
          <button
            type="button"
            onClick={onTake}
            className="flex flex-1 items-center justify-center gap-3 rounded-[24px] bg-slate-900 px-10 py-5 text-sm font-black text-white shadow-xl shadow-slate-100/50 transition-all hover:bg-indigo-600 dark:shadow-none md:flex-none"
          >
            Take Test <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export const Assessments = () => {
  const reduceMotion = useReducedMotion();
  const [view, setView] = useState<'list' | 'quiz' | 'results'>('list');
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('1');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerRecords, setAnswerRecords] = useState<
    Array<{ questionId: string; selectedAnswer: string; correctAnswer: string }>
  >([]);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ASSESSMENTS[0].timeSeconds);
  const { playAchievement } = useUISound();

  const activeAssessment = ASSESSMENTS.find((test) => test.id === selectedAssessmentId) ?? ASSESSMENTS[0];
  const activeQuizQuestions = buildQuestionSet(
    QUIZ_QUESTIONS_BY_ASSESSMENT[selectedAssessmentId] ?? QUIZ_QUESTIONS_BY_ASSESSMENT['1'],
    activeAssessment.questions
  );
  const currentQuestion = activeQuizQuestions[currentQuestionIndex];
  const totalQuestions = activeQuizQuestions.length;

  const resetQuiz = (testId: string) => {
    const nextAssessment = ASSESSMENTS.find((test) => test.id === testId) ?? ASSESSMENTS[0];
    setSelectedAssessmentId(testId);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setAnswerRecords([]);
    setCorrectAnswers(0);
    setTimeLeft(nextAssessment.timeSeconds);
    setView('quiz');
  };

  const handleSubmitAnswer = () => {
    if (!selectedAnswer || !currentQuestion) return;
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    setAnswerRecords((prev) => [
      ...prev,
      {
        questionId: currentQuestion.id,
        selectedAnswer,
        correctAnswer: currentQuestion.correctAnswer,
      },
    ]);
    setCorrectAnswers((prevCount) => prevCount + (isCorrect ? 1 : 0));
    if (currentQuestionIndex === totalQuestions - 1) {
      setView('results');
      return;
    }
    setCurrentQuestionIndex((prevIndex) => prevIndex + 1);
    setSelectedAnswer(null);
  };

  useEffect(() => {
    if (view === 'results') playAchievement();
  }, [view, playAchievement]);

  useEffect(() => {
    if (view !== 'quiz') return;
    setTimeLeft(activeAssessment.timeSeconds);
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          setView('results');
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [view]);

  const stats = [
    {
      id: 'points',
      value: '1,250',
      label: 'Total Points',
      Icon: Trophy,
      idleIcon: 'text-indigo-600 dark:text-indigo-300',
    },
    {
      id: 'accuracy',
      value: '84%',
      label: 'Avg. Accuracy',
      Icon: BarChart2,
      idleIcon: 'text-emerald-500',
    },
    {
      id: 'tests',
      value: '12',
      label: 'Tests Completed',
      Icon: Clock,
      idleIcon: 'text-amber-500',
    },
  ] as const;

  return (
    <div className="relative flex-1 overflow-hidden">
      <StarfieldBackground />
      <AuroraBg reduceMotion={reduceMotion} />
      <div className="relative z-10 mx-auto max-w-7xl p-4 md:p-8">
        {view === 'list' && (
          <>
            <header className="mb-16">
              <h1 className="mb-6 text-5xl font-black text-slate-900 dark:text-white">Skill Assessments</h1>
              <p className="max-w-2xl text-xl font-medium leading-relaxed text-slate-500 dark:text-slate-300">
                Validate your knowledge, earn points, and unlock exclusive rewards. Our tests are designed to find
                your learning gaps.
              </p>
            </header>

            <div className="mb-16 grid grid-cols-1 gap-8 md:grid-cols-3" style={{ perspective: 1200 }}>
              {stats.map((stat) => (
                <GlassStatCard key={stat.id} stat={stat} />
              ))}
            </div>

            <div className="space-y-6">
              <h2 className="mb-8 text-3xl font-black text-slate-900 dark:text-white">Weekly Challenges</h2>
              <div className="space-y-6" style={{ perspective: 1200 }}>
                {ASSESSMENTS.map((test) => (
                  <GlassTestCard key={test.id} test={test} onTake={() => resetQuiz(test.id)} />
                ))}
              </div>
            </div>
          </>
        )}

        {view === 'quiz' && currentQuestion && (
          <div className="mx-auto max-w-4xl py-12">
            <div className="mb-12 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <button
                  type="button"
                  onClick={() => setView('list')}
                  className="rounded-2xl border border-white/20 bg-white/70 p-4 text-slate-400 shadow-sm backdrop-blur-xl transition-all hover:text-slate-900 dark:border-white/10 dark:bg-slate-900/60 dark:hover:text-white"
                >
                  <ChevronRight className="h-6 w-6 rotate-180" />
                </button>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">{activeAssessment.title}</h2>
                  <div className="mt-2 h-2 w-48 rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-indigo-600"
                      style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-[20px] border border-amber-100/80 bg-amber-50/90 px-6 py-3 text-lg font-black text-amber-600 shadow-sm backdrop-blur-sm dark:border-amber-500/20 dark:bg-amber-950/40 dark:text-amber-400">
                <Timer className="h-6 w-6" /> {formatTime(timeLeft)}
              </div>
            </div>

            <div className="rounded-[40px] border border-white/20 bg-white/80 p-12 shadow-[0_8px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/65">
              <div className="mb-12">
                <span className="text-sm font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
                  Question {currentQuestionIndex + 1} / {totalQuestions}
                </span>
                <h3 className="mt-4 text-3xl font-black leading-tight text-slate-900 dark:text-white">
                  {currentQuestion.question}
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {currentQuestion.options.map((opt, i) => {
                  const isSelected = selectedAnswer === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setSelectedAnswer(opt)}
                      className={`group flex w-full items-center rounded-[28px] border-2 p-6 text-left transition-all ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/90 dark:border-indigo-400 dark:bg-slate-800/80'
                          : 'border-white/30 bg-white/50 hover:border-indigo-600 hover:bg-indigo-50/80 dark:border-white/10 dark:bg-slate-900/40 dark:hover:border-indigo-500 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <span
                        className={`mr-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl font-black transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white dark:bg-slate-700 dark:text-slate-300 dark:group-hover:bg-indigo-500'
                        }`}
                      >
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span
                        className={`text-lg font-bold ${
                          isSelected
                            ? 'text-indigo-900 dark:text-indigo-200'
                            : 'text-slate-700 group-hover:text-indigo-900 dark:text-slate-200 dark:group-hover:text-indigo-200'
                        }`}
                      >
                        {opt}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-16 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    if (currentQuestionIndex === totalQuestions - 1) {
                      setView('results');
                      return;
                    }
                    setCurrentQuestionIndex((prevIndex) => prevIndex + 1);
                    setSelectedAnswer(null);
                  }}
                  className="px-8 py-4 text-sm font-black uppercase tracking-widest text-slate-400 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={handleSubmitAnswer}
                  disabled={!selectedAnswer}
                  className="rounded-[24px] bg-indigo-600 px-12 py-5 text-lg font-black text-white shadow-2xl shadow-indigo-200/50 transition-all hover:scale-105 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 dark:shadow-indigo-950/40"
                >
                  {currentQuestionIndex === totalQuestions - 1 ? 'Submit Assessment' : 'Confirm & Next'}
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'results' && (
          <div className="mx-auto max-w-3xl py-12 text-center">
            <div className="mb-10 inline-flex h-32 w-32 items-center justify-center rounded-[40px] border border-green-100/80 bg-green-50/90 text-green-600 shadow-sm backdrop-blur-sm dark:border-green-500/20 dark:bg-green-950/40 dark:text-green-400">
              <CheckCircle2 className="h-16 w-16" />
            </div>
            <h2 className="mb-6 text-5xl font-black text-slate-900 dark:text-white">Great Progress!</h2>
            <p className="mb-16 text-xl font-medium leading-relaxed text-slate-500 dark:text-slate-300">
              You've completed the assessment with an impressive score. Points have been added to your profile.
            </p>

            <div className="mb-16 grid grid-cols-2 gap-8">
              <div className="rounded-[40px] border border-white/20 bg-white/80 p-10 shadow-[0_8px_32px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/60">
                <div className="text-5xl font-black text-indigo-600 dark:text-indigo-400">
                  {correctAnswers}/{totalQuestions}
                </div>
                <div className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-300 dark:text-slate-400">
                  Correct Answers
                </div>
              </div>
              <div className="rounded-[40px] border border-white/20 bg-white/80 p-10 shadow-[0_8px_32px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/60">
                <div className="text-5xl font-black text-amber-500">
                  +{Math.round((activeAssessment.points * correctAnswers) / totalQuestions)}
                </div>
                <div className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-300 dark:text-slate-400">
                  Points Gained
                </div>
              </div>
            </div>

            <div className="mb-16 flex items-start gap-8 rounded-[40px] border border-indigo-100/80 bg-indigo-50/90 p-10 text-left backdrop-blur-sm dark:border-indigo-500/20 dark:bg-slate-800/70">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg">
                <AlertCircle className="h-7 w-7" />
              </div>
              <div>
                <h4 className="mb-2 text-xl font-black text-indigo-900 dark:text-indigo-200">Identify Your Gap</h4>
                <p className="font-medium leading-relaxed text-indigo-700 dark:text-indigo-300">
                  {correctAnswers >= Math.ceil(totalQuestions / 2)
                    ? `Nice work — you answered ${correctAnswers} out of ${totalQuestions} questions correctly. Keep going to strengthen your understanding.`
                    : 'You struggled with some key concepts. We have highlighted the most relevant topics in the roadmap so you can revisit them.'}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-6 sm:flex-row">
              <button
                type="button"
                onClick={() => setView('list')}
                className="flex-1 rounded-[24px] bg-slate-900 py-5 text-lg font-black text-white shadow-2xl shadow-slate-200/50 transition-all hover:bg-indigo-600 dark:shadow-none"
              >
                Back to Skill Center
              </button>
              <button
                type="button"
                className="flex-1 rounded-[24px] border border-white/30 bg-white/80 py-5 text-lg font-black text-slate-900 backdrop-blur-sm transition-all hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:hover:bg-slate-800"
              >
                Download Certificate
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Assessments;

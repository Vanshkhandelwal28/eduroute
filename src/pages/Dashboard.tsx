import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Flame,
  Star,
  Trophy,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Target,
  Briefcase,
  FileText,
  TrendingUp,
  Clock,
  Wand2,
  BookOpen,
} from 'lucide-react';
import { COURSES } from '../data/mockData';
import { getCurrentUser, getDisplayFirstName } from '../utils/userProfile';
import { VerificationStatusCard } from '../components/VerificationStatusCard';
import { getNextStepPlan, readOnboarding, interestLabel } from '../utils/onboardingStore';
import {
  readApplications,
  type InternshipApplication,
} from '../utils/internshipApplications';
import { courseCompletionStats } from '../utils/courseProgressStore';
import { getAllEarnedCourseSkills } from '../utils/courseAchievementsStore';
import {
  computePlacementChance,
  runDashboardSkillAnalyze,
  readDashboardSkillAnalyze,
} from '../utils/placementChance';
import { DashboardHero3D } from '../components/dashboard/DashboardHero3D';

function courseTopicIds(course: (typeof COURSES)[0]): string[] {
  const ids: string[] = [];
  for (const m of course.modules || []) {
    for (const l of m.lessons || []) ids.push(l.id);
  }
  return ids;
}

function courseHref(course: (typeof COURSES)[0]): string {
  const topics = courseTopicIds(course);
  if (topics.length > 0) return `/courses/${course.id}`;
  const skills = encodeURIComponent(
    [course.title, course.category].filter(Boolean).join(', '),
  );
  return `/ai-course-designer?skills=${skills}&auto=1&days=30`;
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.05 * i, duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export const Dashboard = () => {
  const currentUser = getCurrentUser();
  const firstName = getDisplayFirstName() || 'there';
  const onboarding = readOnboarding();
  const nextPlan = getNextStepPlan(onboarding);
  const hasSkillProfile = Boolean(onboarding.completedAt);
  const [applications, setApplications] = useState<InternshipApplication[]>(() => readApplications());
  const earnedSkills = useMemo(() => {
    try {
      return getAllEarnedCourseSkills() || [];
    } catch {
      return [];
    }
  }, []);
  const [skillAnalyze, setSkillAnalyze] = useState(() => readDashboardSkillAnalyze());

  useEffect(() => {
    setSkillAnalyze(runDashboardSkillAnalyze());
  }, []);

  const userSkills = useMemo(() => {
    const strengths = (onboarding.gapAnswers || [])
      .filter((a) => a.answer === 'yes')
      .map((a) => a.skill);
    const interests = (onboarding.interests || []).map(interestLabel);
    return Array.from(
      new Set([...strengths, ...interests, ...earnedSkills].map((s) => String(s).trim()).filter(Boolean)),
    );
  }, [onboarding, earnedSkills]);

  const isNewLearner =
    !hasSkillProfile &&
    (currentUser.enrolledCourses?.length || 0) === 0 &&
    earnedSkills.length === 0;

  const enrolledCourses = useMemo(() => {
    const ids = currentUser.enrolledCourses || [];
    return COURSES.filter((c) => ids.includes(c.id)).slice(0, 4);
  }, [currentUser.enrolledCourses]);

  const recommendedCourses = useMemo(() => {
    const enrolled = new Set(currentUser.enrolledCourses || []);
    const scored = COURSES.filter((c) => !enrolled.has(c.id)).map((c) => ({
      course: c,
      boost: computePlacementChance(c, userSkills).boostPercent,
    }));
    scored.sort((a, b) => b.boost - a.boost);
    return scored.slice(0, 3);
  }, [currentUser.enrolledCourses, userSkills]);

  const pathPercent = useMemo(() => {
    if (!enrolledCourses.length) return 0;
    let sum = 0;
    for (const c of enrolledCourses) {
      const topics = courseTopicIds(c);
      if (!topics.length) continue;
      sum += courseCompletionStats(c.id, topics).percent;
    }
    return Math.round(sum / enrolledCourses.length);
  }, [enrolledCourses]);

  useEffect(() => {
    const refresh = () => setApplications(readApplications());
    window.addEventListener('eduroute:applications-updated', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('eduroute:applications-updated', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const stats = [
    {
      label: 'Completed',
      value: String(earnedSkills.length > 0 ? Math.max(1, Math.floor(earnedSkills.length / 3)) : 0),
      delta: isNewLearner ? 'Start first course' : 'Keep learning',
      icon: CheckCircle2,
      color: 'text-emerald-400',
    },
    {
      label: 'Streak',
      value: isNewLearner ? '0d' : '3d',
      delta: isNewLearner ? 'Lesson today' : 'On track',
      icon: Flame,
      color: 'text-orange-400',
    },
    {
      label: 'Skills',
      value: String(userSkills.length || 0),
      delta: userSkills.length ? 'Mapped' : 'Add profile',
      icon: Star,
      color: 'text-amber-400',
    },
    {
      label: 'Apps',
      value: String(applications.length),
      delta: applications.length ? 'Tracked' : 'Browse roles',
      icon: Trophy,
      color: 'text-sky-400',
    },
  ];

  return (
    <div className="er-page space-y-5 md:space-y-6">
      {/* ZONE 1: HERO (3D-A) */}
      <motion.section
        custom={0}
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-slate-950 min-h-[200px] md:min-h-[240px]"
      >
        <DashboardHero3D percent={Math.max(pathPercent, isNewLearner ? 0 : 12)} />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/70 to-transparent" />
        <div className="relative z-10 flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-7">
          <div className="max-w-xl">
            <p className="mb-1 text-sm font-semibold text-indigo-200/90">
              {isNewLearner ? '🚀 Welcome,' : '👋 Welcome back,'}
            </p>
            <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">{firstName}!</h1>
            <p className="mt-2 text-sm font-medium text-slate-300">
              {isNewLearner
                ? 'Start a course or design your own path — placement chance rises as your skills match courses.'
                : enrolledCourses.length
                  ? `You're about ${pathPercent}% through your current path. Finish modules to unlock the final assessment & certificate.`
                  : 'Enroll in a course or design a mixed path matched to market demand.'}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-2 flex-1 max-w-xs overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all"
                  style={{ width: `${Math.max(4, pathPercent)}%` }}
                />
              </div>
              <span className="text-sm font-bold text-white md:hidden">{pathPercent}%</span>
            </div>
          </div>
          <Link
            to="/skill-profile"
            className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-md transition hover:bg-white/10"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/30">
              <ShieldCheck className="h-5 w-5 text-violet-300" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Skill profile</p>
              <p className="text-sm font-bold text-white">
                {hasSkillProfile ? `${userSkills.length} skills mapped` : 'Complete skill profile'}
              </p>
            </div>
          </Link>
        </div>
      </motion.section>

      <motion.div custom={1} variants={fadeUp} initial="hidden" animate="show">
        <VerificationStatusCard />
      </motion.div>

      {skillAnalyze && (
        <motion.section
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-3 rounded-2xl border border-indigo-500/25 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Skill analysis</p>
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              {skillAnalyze.hasProfile
                ? `Analyzed ${skillAnalyze.skillCount} skills · high placement chance paths`
                : 'Run skill quiz for real placement-chance scores'}
            </h2>
            {skillAnalyze.top?.[0] && skillAnalyze.hasProfile && (
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Top lift:{' '}
                <span className="font-semibold text-[var(--text-primary)]">{skillAnalyze.top[0].title}</span>
                {' · '}high placement chance by +{skillAnalyze.top[0].boostPercent}%
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSkillAnalyze(runDashboardSkillAnalyze())}
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-500/25"
          >
            AI Analyze
          </button>
        </motion.section>
      )}

      {/* ZONE 2: STATS STRIP */}
      <motion.section
        custom={3}
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/80 p-3 backdrop-blur-md sm:grid-cols-4 sm:gap-0 sm:divide-x sm:divide-[var(--border-default)] sm:p-1"
      >
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="group flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-[var(--bg-elevated)]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-elevated)] transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110">
                <Icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">{s.label}</div>
                <div className="text-lg font-black text-[var(--text-primary)]">{s.value}</div>
                <div className="text-[11px] text-[var(--text-secondary)]">{s.delta}</div>
              </div>
            </div>
          );
        })}
      </motion.section>

      {/* ZONE 3: ACTION */}
      <motion.section
        custom={4}
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 lg:grid-cols-2"
      >
        <Link
          to="/ai-course-designer"
          className="group relative overflow-hidden rounded-2xl border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-950/50 via-violet-950/40 to-indigo-950/50 p-5 shadow-lg transition hover:border-fuchsia-400/50 hover:shadow-fuchsia-500/10"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white shadow-lg shadow-fuchsia-500/30 transition-transform duration-500 group-hover:rotate-6 group-hover:scale-105">
              <BookOpen className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-300">New · AI-powered</p>
              <h2 className="text-lg font-bold text-white">Design AI mixed course</h2>
              <p className="mt-1 text-sm text-slate-300">
                Pick duration + interests. AI builds a roadmap with real YouTube + docs.
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-fuchsia-600 px-4 py-2 text-sm font-bold text-white">
                Start <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        </Link>

        <div className="flex flex-col gap-3">
          <Link
            to="/trend-analyse"
            className="group flex flex-1 items-center gap-4 rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-950/40 to-teal-950/30 p-4 transition hover:border-sky-400/50"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-teal-600 text-white shadow-md transition-transform group-hover:scale-110">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-sky-300">Market vs you</p>
              <h2 className="text-base font-bold text-white">Trend Analyse</h2>
              <p className="text-xs text-slate-400">Skill gaps vs market demand</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-sky-300" />
          </Link>

          {nextPlan.kind === 'gaps' && nextPlan.primary ? (
            <div className="flex flex-1 flex-col gap-2 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 to-orange-950/30 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
                  <Target className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300">Close gaps</p>
                  <p className="text-sm font-bold text-white">
                    {nextPlan.primary.skill} → {nextPlan.primary.courseTitle}
                  </p>
                </div>
              </div>
              <Link
                to={nextPlan.primary.to}
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-white"
              >
                Start course <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : nextPlan.kind === 'quiz' ? (
            <Link
              to="/onboarding"
              className="group flex flex-1 items-center gap-4 rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 to-violet-950/30 p-4 transition hover:border-indigo-400/50"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">Next step</p>
                <h2 className="text-base font-bold text-white">Complete skill quiz</h2>
                <p className="text-xs text-slate-400">Unlock personal path & internship matches</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-indigo-300" />
            </Link>
          ) : nextPlan.kind === 'internships' ? (
            <Link
              to="/internships"
              className="group flex flex-1 items-center gap-4 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 to-teal-950/30 p-4 transition hover:border-emerald-400/50"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-md">
                <Briefcase className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">Next step</p>
                <h2 className="text-base font-bold text-white">Apply with skill match</h2>
                <p className="text-xs text-slate-400">
                  Browse internships ranked by match
                  {nextPlan.trackLabel ? ` · ${nextPlan.trackLabel}` : ''}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-emerald-300" />
            </Link>
          ) : (
            <Link
              to="/onboarding"
              className="group flex flex-1 items-center gap-4 rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 to-violet-950/30 p-4"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
                <Wand2 className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">Next step</p>
                <h2 className="text-base font-bold text-white">Build your path</h2>
                <p className="text-xs text-slate-400">Quiz or enroll to get started</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-indigo-300" />
            </Link>
          )}
        </div>
      </motion.section>

      {enrolledCourses.length > 0 && (
        <motion.section custom={5} variants={fadeUp} initial="hidden" animate="show">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Continue Learning</h2>
            <Link to="/courses" className="text-xs font-semibold text-indigo-500 hover:underline">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {enrolledCourses.map((course) => {
              const topics = courseTopicIds(course);
              const pct = topics.length ? courseCompletionStats(course.id, topics).percent : 0;
              return (
                <Link
                  key={course.id}
                  to={courseHref(course)}
                  className="group overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] transition hover:shadow-md"
                >
                  <div className="relative aspect-video overflow-hidden bg-slate-800">
                    <img
                      src={course.thumbnail}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                      <div className="h-full bg-indigo-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-2 text-sm font-bold text-[var(--text-primary)]">{course.title}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{pct}% complete</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </motion.section>
      )}

      {/* ZONE 4: RECOMMENDED */}
      <motion.section custom={6} variants={fadeUp} initial="hidden" animate="show">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Recommended for you</h2>
          <Link to="/courses" className="text-xs font-semibold text-indigo-500 hover:underline">
            Browse all
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recommendedCourses.map(({ course, boost }) => (
            <Link
              key={course.id}
              to={courseHref(course)}
              className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10"
            >
              <div className="relative aspect-video overflow-hidden bg-slate-100 dark:bg-slate-800">
                <img
                  src={course.thumbnail}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-transparent" />
                <span className="absolute left-2 top-2 rounded-full bg-emerald-600/95 px-2 py-0.5 text-[10px] font-bold text-white">
                  High chance +{boost}%
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-1 p-3">
                <p className="line-clamp-2 text-sm font-bold leading-snug text-[var(--text-primary)] group-hover:text-[var(--accent)]">
                  {course.title}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">{course.category}</p>
                <div className="mt-auto flex items-center justify-between pt-1 text-[11px] text-[var(--text-muted)]">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3 shrink-0" /> {course.duration}
                  </span>
                  <span className="inline-flex items-center gap-0.5 font-semibold text-amber-600 dark:text-amber-400">
                    <Star className="h-3 w-3 fill-current" /> {course.rating}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </motion.section>

      <motion.section
        custom={7}
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        <Link to="/internships" className="er-card er-card-hover flex items-center gap-3 p-4">
          <Briefcase className="h-5 w-5 text-blue-500" />
          <div>
            <p className="text-sm font-bold text-[var(--text-primary)]">Internships</p>
            <p className="text-xs text-[var(--text-secondary)]">{applications.length} tracked</p>
          </div>
        </Link>
        <Link to="/cv-builder" className="er-card er-card-hover flex items-center gap-3 p-4">
          <FileText className="h-5 w-5 text-violet-500" />
          <div>
            <p className="text-sm font-bold text-[var(--text-primary)]">CV Builder</p>
            <p className="text-xs text-[var(--text-secondary)]">Build & export</p>
          </div>
        </Link>
        <Link to="/buddy" className="er-card er-card-hover flex items-center gap-3 p-4">
          <Clock className="h-5 w-5 text-amber-500" />
          <div>
            <p className="text-sm font-bold text-[var(--text-primary)]">AI Buddy</p>
            <p className="text-xs text-[var(--text-secondary)]">Ask anything</p>
          </div>
        </Link>
      </motion.section>
    </div>
  );
};

export default Dashboard;

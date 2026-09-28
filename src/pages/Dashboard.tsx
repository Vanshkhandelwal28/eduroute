import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
} from 'lucide-react';
import { COURSES } from '../data/mockData';
import { getCurrentUser, getDisplayFirstName } from '../utils/userProfile';
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

export const Dashboard = () => {
  const currentUser = getCurrentUser();
  const firstName = getDisplayFirstName() || 'there';
  const onboarding = readOnboarding();
  const nextPlan = getNextStepPlan(onboarding);
  const gapCount =
    nextPlan.kind === 'gaps' ? nextPlan.gapCount : onboarding.missingSkills?.length || 0;
  const hasSkillProfile = Boolean(onboarding.completedAt);
  const [applications, setApplications] = useState<InternshipApplication[]>(() => readApplications());
  const earnedSkills = useMemo(() => getAllEarnedCourseSkills(), []);
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
    return scored.slice(0, 4);
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
      iconBg: 'bg-emerald-100 dark:bg-emerald-500/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Streak',
      value: isNewLearner ? '0d' : '3d',
      delta: isNewLearner ? 'Lesson today' : 'On track',
      icon: Flame,
      iconBg: 'bg-violet-100 dark:bg-violet-500/20',
      iconColor: 'text-violet-600 dark:text-violet-400',
    },
    {
      label: 'Skills',
      value: String(userSkills.length || 0),
      delta: userSkills.length ? 'Mapped' : 'Add profile',
      icon: Star,
      iconBg: 'bg-amber-100 dark:bg-amber-500/20',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Apps',
      value: String(applications.length),
      delta: applications.length ? 'Tracked' : 'Browse roles',
      icon: Trophy,
      iconBg: 'bg-blue-100 dark:bg-blue-500/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
  ];

  return (
    <div className="er-page space-y-6">
      <section className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-default)] min-h-[160px] md:min-h-[176px]">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?auto=format&fit=crop&w=1600&q=85')",
            filter: 'brightness(1.18) contrast(1.12) saturate(1.2)',
          }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white/88 via-white/45 to-transparent dark:from-slate-950/92 dark:via-slate-950/70 dark:to-slate-950/35" aria-hidden />
        <div className="relative z-10 flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6">
          <div className="max-w-xl">
            <p className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <span className="mr-1">{isNewLearner ? '🚀' : '👋'}</span>{' '}
              {isNewLearner ? 'Welcome,' : 'Welcome back,'}
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-3xl">
              {firstName}!
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              {isNewLearner
                ? 'Start a course or design your own path — placement chance rises as your skills match courses.'
                : enrolledCourses.length
                  ? `You're about ${pathPercent}% through your current path. Finish modules to unlock the final assessment & certificate.`
                  : 'Enroll in a course or design a mixed path matched to market demand.'}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div className="er-progress flex-1 max-w-xs">
                <div className="er-progress-bar" style={{ width: `${Math.max(4, pathPercent)}%` }} />
              </div>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{pathPercent}%</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-card)]/80 px-4 py-3 shadow-sm backdrop-blur-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-500/20">
              <ShieldCheck className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Skill profile</p>
              <p className="text-sm font-bold text-[var(--text-primary)]">
                {hasSkillProfile ? `${userSkills.length} skills mapped` : 'Complete skill profile'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {skillAnalyze && (
        <section className="er-card flex flex-col gap-3 border border-indigo-500/20 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Skill analysis</p>
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
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-bold text-white"
          >
            AI Analyze
          </button>
        </section>
      )}

      <section className="er-stat-grid">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="er-stat-card">
              <div className={`er-stat-icon ${s.iconBg}`}>
                <Icon className={`shrink-0 ${s.iconColor}`} />
              </div>
              <div>
                <div className="er-stat-label">{s.label}</div>
                <div className="er-stat-value">{s.value}</div>
                <div className="er-stat-delta">{s.delta}</div>
              </div>
            </div>
          );
        })}
      </section>

      <Link
        to="/ai-course-designer"
        className="group relative block overflow-hidden rounded-[var(--radius-xl)] border border-fuchsia-200/70 bg-gradient-to-br from-fuchsia-50 via-violet-50 to-indigo-50 p-5 shadow-sm transition-all hover:shadow-lg dark:border-fuchsia-500/25 dark:from-fuchsia-950/40 dark:via-violet-950/30 dark:to-indigo-950/30 sm:p-5"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white shadow-md">
              <Wand2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-600 dark:text-fuchsia-300">New · AI-powered</p>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Design your own mixed course</h2>
              <p className="mt-1 max-w-xl text-sm text-[var(--text-secondary)]">
                Pick duration + interests. AI builds a roadmap with real YouTube + docs.
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-fuchsia-600 px-4 py-2 text-sm font-bold text-white shadow-sm sm:self-center">
            Start <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </Link>

      <Link
        to="/trend-analyse"
        className="group relative block overflow-hidden rounded-[var(--radius-xl)] border border-sky-200/70 bg-gradient-to-br from-sky-50 via-cyan-50 to-teal-50 p-5 shadow-sm transition-all hover:shadow-lg dark:border-sky-500/25 dark:from-sky-950/40 dark:via-cyan-950/30 dark:to-teal-950/30 sm:p-5"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-teal-600 text-white shadow-md">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-sky-600 dark:text-sky-300">Market vs you</p>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Trend Analyse — skill gaps vs market demand</h2>
              <p className="mt-1 max-w-xl text-sm text-[var(--text-secondary)]">
                Compare market trends with your skill profile. Gaps, charts, refresh every 7 days.
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-sky-600 px-4 py-2 text-sm font-bold text-white shadow-sm sm:self-center">
            Open <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </Link>

      <section>
        {nextPlan.kind === 'gaps' && nextPlan.primary ? (
          <div className="er-card border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50 p-5 dark:border-amber-500/30 dark:from-amber-950/30 dark:to-orange-950/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300">Close gaps</p>
                  <h2 className="text-base font-bold text-[var(--text-primary)]">Skill gaps on your path</h2>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    Track <span className="font-semibold text-[var(--text-primary)]">{nextPlan.trackLabel}</span>
                    {' · '}start with{' '}
                    <span className="font-semibold text-[var(--text-primary)]">{nextPlan.primary.skill}</span>
                    {' → '}{nextPlan.primary.courseTitle}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-stretch gap-2 sm:items-end">
                <Link
                  to={nextPlan.primary.to}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-amber-400"
                >
                  Start: {nextPlan.primary.courseTitle} <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/skill-profile" className="text-xs font-semibold text-amber-600 hover:underline dark:text-amber-400">
                  View full gap analysis
                </Link>
              </div>
            </div>
          </div>
        ) : nextPlan.kind === 'quiz' ? (
          <Link
            to="/onboarding"
            className="er-card er-card-hover group flex flex-col gap-4 border-indigo-200/80 bg-gradient-to-r from-indigo-50 to-violet-50 p-5 transition-all dark:border-indigo-500/30 dark:from-indigo-950/30 dark:to-violet-950/20 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Next step</p>
                <h2 className="text-base font-bold text-[var(--text-primary)]">Complete your skill quiz</h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Map strengths and gaps to unlock a personal learning path and better internship matches.
                </p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-sm font-bold text-white">
              Start quiz <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        ) : nextPlan.kind === 'internships' ? (
          <Link
            to="/internships"
            className="er-card er-card-hover group flex flex-col gap-4 border-emerald-200/80 bg-gradient-to-r from-emerald-50 to-teal-50 p-5 transition-all dark:border-emerald-500/30 dark:from-emerald-950/30 dark:to-teal-950/20 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-md">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Next step</p>
                <h2 className="text-base font-bold text-[var(--text-primary)]">Apply with skill match</h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Your profile{nextPlan.trackLabel ? ` for ${nextPlan.trackLabel}` : ''} is ready. Browse internships ranked by match.
                </p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-white">
              View internships <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        ) : null}
      </section>

      {enrolledCourses.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Continue Learning</h2>
            <Link to="/courses" className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {enrolledCourses.map((course) => {
              const topics = courseTopicIds(course);
              const pct = topics.length ? courseCompletionStats(course.id, topics).percent : 0;
              const boost = computePlacementChance(course, userSkills).boostPercent;
              return (
                <Link
                  key={course.id}
                  to={courseHref(course)}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm transition hover:shadow-md"
                >
                  <div className="relative h-28 overflow-hidden bg-slate-200 dark:bg-slate-800">
                    <img src={course.thumbnail} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-transparent" />
                    {boost > 0 && (
                      <span className="absolute left-2 top-2 rounded-full bg-emerald-600/95 px-2 py-0.5 text-[10px] font-bold text-white">
                        High chance +{boost}%
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1 p-3">
                    <p className="line-clamp-2 text-sm font-bold leading-snug text-[var(--text-primary)] group-hover:text-[var(--accent)]">{course.title}</p>
                    <div className="mt-auto">
                      <div className="er-progress h-1.5">
                        <div className="er-progress-bar" style={{ width: `${Math.max(4, pct)}%` }} />
                      </div>
                      <p className="mt-1 text-[11px] text-[var(--text-muted)]">{pct}% complete</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Recommended for placement</h2>
          <Link to="/browse" className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
            Browse all
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {recommendedCourses.map(({ course, boost }) => (
            <Link
              key={course.id}
              to={courseHref(course)}
              className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm transition hover:shadow-md"
            >
              <div className="relative h-28 overflow-hidden bg-slate-200 dark:bg-slate-800">
                <img src={course.thumbnail} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-transparent" />
                <span className="absolute left-2 top-2 rounded-full bg-emerald-600/95 px-2 py-0.5 text-[10px] font-bold text-white">
                  High chance +{boost}%
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-1 p-3">
                <p className="line-clamp-2 text-sm font-bold leading-snug text-[var(--text-primary)] group-hover:text-[var(--accent)]">{course.title}</p>
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
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
      </section>
    </div>
  );
};

export default Dashboard;

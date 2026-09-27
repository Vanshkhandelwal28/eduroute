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

/** Stable placement-boost % (50–88) from skills + course. */
function placementBoostPercent(
  course: { id: string; title: string; category: string; level?: string },
  skills: string[],
): number {
  const hay = `${course.title} ${course.category} ${course.level || ''}`.toLowerCase();
  const tokens = skills.map((s) => s.toLowerCase().trim()).filter((s) => s.length > 1);
  let hits = 0;
  for (const t of tokens) {
    if (hay.includes(t) || t.split(/\s+/).some((w) => w.length > 2 && hay.includes(w))) hits += 1;
  }
  const matchRatio = tokens.length ? hits / tokens.length : 0.25;
  let seed = 0;
  for (let i = 0; i < course.id.length; i++) seed += course.id.charCodeAt(i) * (i + 3);
  const base = 50 + (seed % 18);
  const skillLift = Math.round(matchRatio * 21);
  return Math.min(88, Math.max(50, base + skillLift));
}

function courseTopicIds(course: (typeof COURSES)[0]): string[] {
  const ids: string[] = [];
  for (const m of course.modules || []) {
    for (const l of m.lessons || []) ids.push(l.id);
  }
  return ids;
}

/** Real course page if it has modules; otherwise AI designer with skills prefilled + auto. */
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

  // ONLY real enrollments — never invent courses the user did not start
  const enrolledCourses = useMemo(() => {
    const ids = currentUser.enrolledCourses || [];
    return COURSES.filter((c) => ids.includes(c.id)).slice(0, 4);
  }, [currentUser.enrolledCourses]);

  const recommendedCourses = useMemo(() => {
    const enrolled = new Set(currentUser.enrolledCourses || []);
    const scored = COURSES.filter((c) => !enrolled.has(c.id)).map((c) => ({
      course: c,
      boost: placementBoostPercent(c, userSkills),
    }));
    scored.sort((a, b) => b.boost - a.boost);
    return scored.slice(0, 4);
  }, [currentUser.enrolledCourses, userSkills]);

  const pathPercent = useMemo(() => {
    if (!enrolledCourses.length) return 0;
    let sum = 0;
    for (const c of enrolledCourses) {
      const topics = courseTopicIds(c);
      if (!topics.length) {
        sum += 0;
        continue;
      }
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
      deltaPositive: true,
      icon: CheckCircle2,
      iconBg: 'bg-emerald-100 dark:bg-emerald-500/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Streak',
      value: isNewLearner ? '0d' : '3d',
      delta: isNewLearner ? 'Lesson today' : 'On track',
      deltaPositive: true,
      icon: Flame,
      iconBg: 'bg-violet-100 dark:bg-violet-500/20',
      iconColor: 'text-violet-600 dark:text-violet-400',
    },
    {
      label: 'Skills',
      value: String(userSkills.length || 0),
      delta: userSkills.length ? 'Mapped' : 'Add profile',
      deltaPositive: true,
      icon: Star,
      iconBg: 'bg-amber-100 dark:bg-amber-500/20',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Apps',
      value: String(applications.length),
      delta: applications.length ? 'Tracked' : 'Browse roles',
      deltaPositive: true,
      icon: Trophy,
      iconBg: 'bg-blue-100 dark:bg-blue-500/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
  ];

  return (
    <div className="er-page space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-default)] min-h-[180px] md:min-h-[200px]">
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
        <div className="relative z-10 flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div className="max-w-xl">
            <p className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <span className="mr-1">{isNewLearner ? '🚀' : '👋'}</span>{' '}
              {isNewLearner ? 'Welcome,' : 'Welcome back,'}
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-4xl">
              {firstName}!
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              {isNewLearner
                ? 'Start a course or design your own path — placement readiness climbs as you complete modules.'
                : enrolledCourses.length
                  ? `You're about ${pathPercent}% through your current path. Finish modules to unlock the final assessment & certificate.`
                  : 'Enroll in a course or design a mixed path matched to market demand.'}
            </p>
            <div className="mt-5 flex items-center gap-3">
              <div className="er-progress flex-1 max-w-xs">
                <div className="er-progress-bar" style={{ width: `${Math.max(4, pathPercent)}%` }} />
              </div>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{pathPercent}%</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-card)]/80 px-5 py-4 shadow-sm backdrop-blur-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-500/20">
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

      {/* Stat cards — short labels + min-w-0 so text does not break weirdly */}
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="er-stat-card min-w-0 overflow-hidden">
              <div className={`er-stat-icon ${s.iconBg}`}>
                <Icon className={`h-5 w-5 shrink-0 ${s.iconColor}`} />
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs font-medium text-[var(--text-secondary)]">{s.label}</div>
                <div className="mt-0.5 text-2xl font-bold tracking-tight text-[var(--text-primary)]">{s.value}</div>
                <div className="mt-1 truncate text-xs font-medium text-emerald-600 dark:text-emerald-400">{s.delta}</div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Design your own mixed course */}
      <Link
        to="/ai-course-designer"
        className="group relative mb-2 block overflow-hidden rounded-[var(--radius-xl)] border border-fuchsia-200/70 bg-gradient-to-br from-fuchsia-50 via-violet-50 to-indigo-50 p-5 shadow-sm transition-all hover:shadow-lg dark:border-fuchsia-500/25 dark:from-fuchsia-950/40 dark:via-violet-950/30 dark:to-indigo-950/30 sm:p-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white shadow-md">
              <Wand2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-600 dark:text-fuchsia-300">
                New · AI-powered
              </p>
              <h2 className="text-base font-bold text-[var(--text-primary)] sm:text-lg">Design your own mixed course</h2>
              <p className="mt-1 max-w-xl text-sm text-[var(--text-secondary)]">
                Pick duration + interests (DSA, React, Data Analytics…). AI builds a roadmap with real YouTube + docs you can edit.
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-fuchsia-600 px-4 py-2 text-sm font-bold text-white shadow-sm sm:self-center">
            Start <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </Link>

      {/* Trend Analyse */}
      <Link
        to="/trend-analyse"
        className="group relative mb-2 block overflow-hidden rounded-[var(--radius-xl)] border border-sky-200/70 bg-gradient-to-br from-sky-50 via-cyan-50 to-teal-50 p-5 shadow-sm transition-all hover:shadow-lg dark:border-sky-500/25 dark:from-sky-950/40 dark:via-cyan-950/30 dark:to-teal-950/30 sm:p-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-teal-600 text-white shadow-md">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-sky-600 dark:text-sky-300">
                Gemini · Market vs you
              </p>
              <h2 className="text-base font-bold text-[var(--text-primary)] sm:text-lg">
                Trend Analyse — skill gaps vs market demand
              </h2>
              <p className="mt-1 max-w-xl text-sm text-[var(--text-secondary)]">
                Compare real market trends with your skill profile. See demand vs current skills, gaps, and charts (refresh every 7 days).
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-sky-600 px-4 py-2 text-sm font-bold text-white shadow-sm sm:self-center">
            Open <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </Link>

      {/* Next step / gaps */}
      <section>
        {nextPlan.kind === 'gaps' && nextPlan.primary ? (
          <div className="er-card border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50 p-5 dark:border-amber-500/30 dark:from-amber-950/30 dark:to-orange-950/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md">
                  <Target className="h-6 w-6" />
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
              <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                <Link
                  to={nextPlan.primary.to}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-amber-600"
                >
                  Start: {nextPlan.primary.courseTitle}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/skill-profile" className="text-center text-xs font-semibold text-amber-800 hover:underline dark:text-amber-300">
                  View full gap analysis
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <Link
            to="/internships"
            className="er-card er-card-hover group flex flex-col gap-4 border-emerald-200/80 bg-gradient-to-r from-emerald-50 to-teal-50 p-5 transition-all dark:border-emerald-500/30 dark:from-emerald-950/30 dark:to-teal-950/20 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-md">
                <Briefcase className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Next step</p>
                <h2 className="text-base font-bold text-[var(--text-primary)]">Apply with skill match</h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Your profile{nextPlan.trackLabel ? ` for ${nextPlan.trackLabel}` : ''} is ready. Browse internships ranked by how well you match.
                </p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-white">
              View internships <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        )}
      </section>

      {/* Skill profile CTA */}
      <section>
        <Link
          to="/skill-profile"
          className="er-card er-card-hover group flex flex-col gap-4 p-5 transition-all sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <Target className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)]">Student Skill Profile</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {hasSkillProfile
                  ? gapCount > 0
                    ? `You have ${gapCount} skill gap${gapCount === 1 ? '' : 's'} marked — view strengths, tracks, and next steps.`
                    : 'View your strengths, target tracks, and recommended next steps.'
                  : 'Complete onboarding to unlock strengths, gaps, and a personal path.'}
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-[var(--accent)]">
            Open profile <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
        </Link>
      </section>

      {/* Continue Learning — only real enrollments */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Continue Learning</h2>
          <Link to="/my-courses" className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent)] hover:underline">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {enrolledCourses.length > 0 ? (
            enrolledCourses.map((course) => {
              const topics = courseTopicIds(course);
              const prog = topics.length ? courseCompletionStats(course.id, topics).percent : 0;
              const boost = placementBoostPercent(course, userSkills);
              return (
                <Link
                  key={course.id}
                  to={courseHref(course)}
                  className="er-card er-card-hover group overflow-hidden p-0"
                >
                  <div className="relative aspect-[16/7] w-full overflow-hidden bg-[var(--bg-elevated)]">
                    <img
                      src={course.thumbnail}
                      alt=""
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent" />
                    <span className="absolute left-3 top-3 rounded-full bg-indigo-600/95 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      In progress
                    </span>
                    <span className="absolute right-3 top-3 rounded-full bg-black/50 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur">
                      {course.category} · {prog}%
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)]">{course.title}</h3>
                    <p className="mt-1 line-clamp-2 text-xs text-[var(--text-secondary)]">{course.description}</p>
                    <div className="mt-3">
                      <div className="er-progress h-1.5">
                        <div className="er-progress-bar" style={{ width: `${prog}%` }} />
                      </div>
                      <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                        <TrendingUp className="h-3.5 w-3.5" />
                        Placement readiness up to ~{boost}%
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="er-card col-span-full p-8 text-center text-[var(--text-secondary)]">
              No enrolled courses yet.{' '}
              <Link to="/browse" className="font-semibold text-[var(--accent)]">
                Browse courses
              </Link>{' '}
              or{' '}
              <Link to="/ai-course-designer" className="font-semibold text-[var(--accent)]">
                design your own
              </Link>
              .
            </div>
          )}
        </div>
      </section>

      {/* Recommended for You — 2×2 / 4-col, fixed image height, no layout break */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--text-primary)]">
            <Sparkles className="h-5 w-5 text-[var(--accent)]" /> Recommended for You
          </h2>
          <Link to="/browse" className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent)] hover:underline">
            Explore all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {recommendedCourses.map(({ course, boost }) => (
            <Link
              key={course.id}
              to={courseHref(course)}
              className="er-card er-card-hover group flex h-full flex-col overflow-hidden p-0"
            >
              <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-[var(--bg-elevated)]">
                <img
                  src={course.thumbnail}
                  alt=""
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" />
                <span className="absolute left-2 top-2 rounded-full bg-emerald-600/95 px-2 py-0.5 text-[10px] font-bold text-white">
                  ~{boost}% readiness
                </span>
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-1 p-3">
                <h3 className="line-clamp-2 text-sm font-bold leading-snug text-[var(--text-primary)] group-hover:text-[var(--accent)]">
                  {course.title}
                </h3>
                <p className="line-clamp-2 text-[11px] text-[var(--text-secondary)]">{course.description}</p>
                <div className="mt-auto flex items-center justify-between pt-2 text-[11px] text-[var(--text-muted)]">
                  <span className="inline-flex items-center gap-1 truncate">
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

      <Link
        to="/cv-builder"
        className="mb-8 mt-6 flex flex-col gap-3 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-violet-50 to-white p-5 transition hover:border-indigo-300 hover:shadow-md dark:border-indigo-700/60 dark:from-indigo-950 dark:via-slate-900 dark:to-slate-900 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/25">
            <FileText className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-black text-slate-900 dark:text-white">Build CV</p>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
              Free templates · step-by-step editor · download PDF for internships & placements.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 self-start rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md sm:self-center">
          Open builder <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </Link>
    </div>
  );
};

export default Dashboard;

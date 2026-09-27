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

/** Stable placement-boost % (50–88) from skills + course — not random fake stats. */
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
  // Seed from course id so the same course always shows the same boost
  let seed = 0;
  for (let i = 0; i < course.id.length; i++) seed += course.id.charCodeAt(i) * (i + 3);
  const base = 50 + (seed % 18); // 50–67
  const skillLift = Math.round(matchRatio * 21); // up to +21 → max ~88
  return Math.min(88, Math.max(50, base + skillLift));
}

function courseTopicIds(course: (typeof COURSES)[0]): string[] {
  const ids: string[] = [];
  for (const m of course.modules || []) {
    for (const l of m.lessons || []) ids.push(l.id);
  }
  return ids;
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

  const enrolledCourses = useMemo(() => {
    const ids = currentUser.enrolledCourses || [];
    const list = COURSES.filter((c) => ids.includes(c.id));
    if (list.length) return list.slice(0, 2);
    // Continue learning: show in-progress style first courses if enrolled empty but they opened progress
    return COURSES.slice(0, 2);
  }, [currentUser.enrolledCourses]);

  const recommendedCourses = useMemo(() => {
    const enrolled = new Set(currentUser.enrolledCourses || []);
    const scored = COURSES.filter((c) => !enrolled.has(c.id)).map((c) => ({
      course: c,
      score: placementBoostPercent(c, userSkills),
      boost: placementBoostPercent(c, userSkills),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 4);
  }, [currentUser.enrolledCourses, userSkills]);

  const pathPercent = useMemo(() => {
    if (!enrolledCourses.length) return isNewLearner ? 0 : 12;
    let sum = 0;
    for (const c of enrolledCourses) {
      const topics = courseTopicIds(c);
      if (!topics.length) {
        sum += 40;
        continue;
      }
      sum += courseCompletionStats(c.id, topics).percent;
    }
    return Math.round(sum / enrolledCourses.length);
  }, [enrolledCourses, isNewLearner]);

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
      label: 'Completed Courses',
      value: String(earnedSkills.length > 0 ? Math.max(1, Math.floor(earnedSkills.length / 3)) : isNewLearner ? '0' : '1'),
      delta: isNewLearner ? 'Start your first course' : 'Keep learning',
      deltaPositive: true,
      icon: CheckCircle2,
      iconBg: 'bg-emerald-100 dark:bg-emerald-500/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Learning Streak',
      value: isNewLearner ? '0 days' : '3 days',
      delta: isNewLearner ? 'Complete a lesson today' : 'On track',
      deltaPositive: true,
      icon: Flame,
      iconBg: 'bg-violet-100 dark:bg-violet-500/20',
      iconColor: 'text-violet-600 dark:text-violet-400',
    },
    {
      label: 'Skills tracked',
      value: String(userSkills.length || 0),
      delta: userSkills.length ? 'From profile & courses' : 'Complete skill profile',
      deltaPositive: true,
      icon: Star,
      iconBg: 'bg-amber-100 dark:bg-amber-500/20',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Applications',
      value: String(applications.length),
      delta: applications.length ? 'Internships tracked' : 'Browse internships',
      deltaPositive: true,
      icon: Trophy,
      iconBg: 'bg-blue-100 dark:bg-blue-500/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
  ];

  return (
    <div className="er-page space-y-8">
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
        <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-transparent to-white/30 dark:from-slate-950/40 dark:via-transparent dark:to-slate-950/50" aria-hidden />
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
                ? 'Start a course below — learners who complete a path see placement readiness climb toward 70–88% on matched roles.'
                : pathPercent > 0
                  ? `You're about ${pathPercent}% through your current path. Finish modules to unlock the final assessment & certificate.`
                  : 'Continue a course or pick a recommendation matched to your skills.'}
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
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Skill profile</p>
              <p className="text-sm font-bold text-[var(--text-primary)]">
                {hasSkillProfile ? `${userSkills.length} skills mapped` : 'Complete skill profile'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="er-stat-card">
              <div className={`mb-3 inline-flex rounded-xl p-2.5 ${s.iconBg}`}>
                <Icon className={`h-5 w-5 ${s.iconColor}`} />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{s.label}</p>
              <p className="mt-1 text-2xl font-black text-[var(--text-primary)]">{s.value}</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">{s.delta}</p>
            </div>
          );
        })}
      </div>

      {/* Quick actions — unchanged structure */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Link
          to="/skill-profile"
          className="er-card er-card-hover group flex flex-col gap-4 border-violet-200/80 bg-gradient-to-r from-violet-50 to-indigo-50 p-5 transition-all dark:border-violet-500/30 dark:from-violet-950/40 dark:to-indigo-950/30 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white">
              <Target className="h-5 w-5" />
            </span>
            <div>
              <p className="font-bold text-[var(--text-primary)]">Student Skill Profile</p>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                View your strengths, target tracks, and recommended next steps.
                {gapCount > 0 ? ` · ${gapCount} gaps to close` : ''}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-bold text-violet-700 dark:text-violet-300">
            Open profile <ArrowRight className="h-4 w-4" />
          </span>
        </Link>

        <Link
          to="/internships"
          className="er-card er-card-hover group flex flex-col gap-4 border-emerald-200/80 bg-gradient-to-r from-emerald-50 to-teal-50 p-5 transition-all dark:border-emerald-500/30 dark:from-emerald-950/30 dark:to-teal-950/20 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <Briefcase className="h-5 w-5" />
            </span>
            <div>
              <p className="font-bold text-[var(--text-primary)]">Internships</p>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                Roles matched to your skills · track applications
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700 dark:text-emerald-300">
            Explore <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      </div>

      {/* Continue Learning — photo cards */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Continue Learning</h2>
          <Link to="/my-courses" className="text-sm font-semibold text-[var(--accent)] hover:underline inline-flex items-center gap-1">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {enrolledCourses.map((course) => {
            const topics = courseTopicIds(course);
            const prog = topics.length ? courseCompletionStats(course.id, topics).percent : 40;
            const boost = placementBoostPercent(course, userSkills);
            return (
              <Link
                key={course.id}
                to={`/courses/${course.id}`}
                className="er-card er-card-hover group overflow-hidden p-0"
              >
                <div className="relative h-36 w-full overflow-hidden sm:h-40">
                  <img
                    src={course.thumbnail}
                    alt=""
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                  <span className="absolute left-3 top-3 rounded-full bg-indigo-600/95 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    In progress
                  </span>
                  <span className="absolute right-3 top-3 rounded-full bg-black/50 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur">
                    {course.category} · {prog}% done
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)]">
                    {course.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs text-[var(--text-secondary)]">{course.description}</p>
                  <div className="mt-3">
                    <div className="er-progress h-1.5">
                      <div className="er-progress-bar" style={{ width: `${prog}%` }} />
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                      <TrendingUp className="h-3.5 w-3.5" />
                      Complete this path → placement readiness up to ~{boost}%
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
          {!enrolledCourses.length && (
            <div className="er-card col-span-full p-8 text-center text-[var(--text-secondary)]">
              No enrolled courses yet.{' '}
              <Link to="/browse" className="font-semibold text-[var(--accent)]">
                Browse courses
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Recommended for You — photo cards + placement boost */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--text-primary)]">
            <Sparkles className="h-5 w-5 text-[var(--accent)]" /> Recommended for You
          </h2>
          <Link to="/browse" className="text-sm font-semibold text-[var(--accent)] hover:underline inline-flex items-center gap-1">
            Explore all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {recommendedCourses.map(({ course, boost }) => (
            <Link
              key={course.id}
              to={`/courses/${course.id}`}
              className="er-card er-card-hover group flex flex-col overflow-hidden p-0"
            >
              <div className="relative h-32 w-full overflow-hidden">
                <img
                  src={course.thumbnail}
                  alt=""
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 to-transparent" />
                <span className="absolute left-2 top-2 rounded-full bg-emerald-600/95 px-2 py-0.5 text-[10px] font-bold text-white">
                  +{boost}% placement readiness
                </span>
                {course.level && (
                  <span className="absolute bottom-2 left-2 rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-bold uppercase text-white backdrop-blur">
                    {course.level}
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-3">
                <h3 className="line-clamp-2 text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)]">
                  {course.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-[11px] text-[var(--text-secondary)]">{course.description}</p>
                <div className="mt-auto flex items-center justify-between pt-3 text-[11px] text-[var(--text-muted)]">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {course.duration}
                  </span>
                  <span className="inline-flex items-center gap-0.5 font-semibold text-amber-600 dark:text-amber-400">
                    <Star className="h-3 w-3 fill-current" /> {course.rating}
                  </span>
                </div>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
                  Do this course · raise placement chance to ~{boost}%
                </p>
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

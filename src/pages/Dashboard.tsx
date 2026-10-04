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
import { VerificationStatusCard } from '../components/VerificationStatusCard';

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
        <div
          className="absolute inset-0 bg-gradient-to-r from-white/88 via-white/45 to-transparent dark:from-slate-950/92 dark:via-slate-950/70 dark:to-slate-950/35"
          aria-hidden
        />
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

      <VerificationStatusCard />

      {skillAnalyze && (
        <section className="er-card flex flex-col gap-3 border border-indigo-500/20 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              Skill analysis
            </p>
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
          <Link
            to={skillAnalyze.hasProfile ? '/skill-profile' : '/onboarding'}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white"
          >
            <Wand2 className="h-4 w-4" />
            {skillAnalyze.hasProfile ? 'View profile' : 'Skill quiz'}
          </Link>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="er-card flex items-center gap-3 p-4">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${s.iconBg}`}>
              <s.icon className={`h-5 w-5 ${s.iconColor}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{s.label}</p>
              <p className="text-xl font-black text-[var(--text-primary)]">{s.value}</p>
              <p className="truncate text-[11px] text-[var(--text-secondary)]">{s.delta}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="er-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold">Continue Learning</h2>
            <Link to="/courses" className="text-xs font-bold text-indigo-600">
              View all
            </Link>
          </div>
          {enrolledCourses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border-default)] p-6 text-center">
              <p className="text-sm text-[var(--text-secondary)]">No enrolled courses yet.</p>
              <Link to="/courses" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-indigo-600">
                Browse courses <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {enrolledCourses.map((c) => {
                const topics = courseTopicIds(c);
                const pct = topics.length ? courseCompletionStats(c.id, topics).percent : 0;
                return (
                  <li key={c.id}>
                    <Link
                      to={courseHref(c)}
                      className="flex items-center gap-3 rounded-xl border border-[var(--border-default)] p-3 hover:bg-[var(--bg-elevated)]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{c.title}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="er-progress h-1.5 flex-1">
                            <div className="er-progress-bar" style={{ width: `${Math.max(3, pct)}%` }} />
                          </div>
                          <span className="text-[11px] font-bold text-[var(--text-muted)]">{pct}%</span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-[var(--text-muted)]" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="er-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold">Recommended for you</h2>
            <Link to="/ai-course-designer" className="text-xs font-bold text-indigo-600">
              Design path
            </Link>
          </div>
          <ul className="space-y-3">
            {recommendedCourses.map(({ course: c, boost }) => (
              <li key={c.id}>
                <Link
                  to={courseHref(c)}
                  className="flex items-center gap-3 rounded-xl border border-[var(--border-default)] p-3 hover:bg-[var(--bg-elevated)]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{c.title}</p>
                    <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                      {c.category} · +{boost}% placement lift
                    </p>
                  </div>
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="er-card p-5">
        <h2 className="mb-4 text-base font-bold">Quick actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { to: '/internships', label: 'Internships', icon: Briefcase },
            { to: '/cv-builder', label: 'CV Builder', icon: FileText },
            { to: '/skill-profile', label: 'Skill profile', icon: Target },
            { to: '/ai-course-designer', label: 'AI path', icon: Sparkles },
          ].map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="flex flex-col items-center gap-2 rounded-xl border border-[var(--border-default)] p-4 text-center hover:bg-[var(--bg-elevated)]"
            >
              <a.icon className="h-5 w-5 text-indigo-500" />
              <span className="text-xs font-bold">{a.label}</span>
            </Link>
          ))}
        </div>
        {gapCount > 0 && (
          <p className="mt-4 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <Clock className="h-3.5 w-3.5" />
            {gapCount} skill gap{gapCount === 1 ? '' : 's'} left — keep learning.
          </p>
        )}
      </section>
    </div>
  );
};

export default Dashboard;

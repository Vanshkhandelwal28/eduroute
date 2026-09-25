import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Flame,
  Star,
  Trophy,
  Play,
  Clock,
  BarChart2,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Target,
  Briefcase,
  FileText,
} from 'lucide-react';
import { COURSES } from '../data/mockData';
import { Course } from '../types';
import { getCurrentUser, getDisplayFirstName } from '../utils/userProfile';
import { getNextStepPlan, readOnboarding } from '../utils/onboardingStore';
import {
  readApplications,
  statusBadgeClass,
  type InternshipApplication,
} from '../utils/internshipApplications';

export const Dashboard = () => {
  const currentUser = getCurrentUser();
  const firstName = getDisplayFirstName() || 'there';
  const enrolledCourses = COURSES.filter((c) => currentUser.enrolledCourses.includes(c.id)).slice(0, 2);
  const recommendedCourses = COURSES.filter((c) => !currentUser.enrolledCourses.includes(c.id)).slice(0, 4);
  const onboarding = readOnboarding();
  const nextPlan = getNextStepPlan(onboarding);
  const gapCount =
    nextPlan.kind === 'gaps' ? nextPlan.gapCount : onboarding.missingSkills?.length || 0;
  const hasSkillProfile = Boolean(onboarding.completedAt);
  const [applications, setApplications] = useState<InternshipApplication[]>(() => readApplications());

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
      value: '12',
      delta: '+3 this month',
      deltaPositive: true,
      icon: CheckCircle2,
      iconBg: 'bg-emerald-100 dark:bg-emerald-500/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Learning Streak',
      value: '7 days',
      delta: '+2',
      deltaPositive: true,
      icon: Flame,
      iconBg: 'bg-violet-100 dark:bg-violet-500/20',
      iconColor: 'text-violet-600 dark:text-violet-400',
    },
    {
      label: 'Total Points',
      value: '2,850',
      delta: '+320',
      deltaPositive: true,
      icon: Star,
      iconBg: 'bg-amber-100 dark:bg-amber-500/20',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Rank',
      value: '#12',
      delta: 'in your batch',
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
              <span className="mr-1">👋</span> Welcome back,
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-4xl">
              {firstName}! <span className="inline-block">👋</span>
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              You've completed 45% of your current path. Keep it up!
            </p>
            <div className="mt-5 flex items-center gap-3">
              <div className="er-progress flex-1 max-w-xs">
                <div className="er-progress-bar" style={{ width: '45%' }} />
              </div>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">45%</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-card)]/80 px-5 py-4 shadow-sm backdrop-blur-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-500/20">
              <ShieldCheck className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[var(--text-primary)]">Verify College ID</div>
              <p className="text-xs text-[var(--text-secondary)]">Unlock 50% discount on certifications</p>
            </div>
            <Link to="/verify-college" className="er-btn er-btn-primary ml-2 shrink-0 !px-4 !py-2 text-xs">
              Verify
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="er-stat-card">
            <div className={`er-stat-icon ${s.iconBg}`}>
              <s.icon className={`h-5 w-5 ${s.iconColor}`} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-[var(--text-secondary)]">{s.label}</div>
              <div className="mt-0.5 text-2xl font-bold tracking-tight text-[var(--text-primary)]">{s.value}</div>
              <div className={`mt-1 text-xs font-medium ${s.deltaPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--text-muted)]'}`}>
                {s.deltaPositive && s.delta.startsWith('+') ? (
                  <span className="inline-flex items-center gap-0.5">
                    <span className="text-[10px]">↑</span> {s.delta}
                  </span>
                ) : (
                  s.delta
                )}
              </div>
            </div>
          </div>
        ))}
      </section>

      <Link to="/ai-course-designer" className="group relative mb-2 block overflow-hidden rounded-[var(--radius-xl)] border border-fuchsia-200/70 bg-gradient-to-br from-fuchsia-50 via-violet-50 to-indigo-50 p-5 shadow-sm transition-all hover:shadow-lg dark:border-fuchsia-500/25 dark:from-fuchsia-950/40 dark:via-violet-950/30 dark:to-indigo-950/30 sm:p-6">
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white shadow-md"><Sparkles className="h-6 w-6" /></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-600 dark:text-fuchsia-400">New · AI-powered</p>
              <h2 className="text-base font-bold text-[var(--text-primary)] sm:text-lg">Design your own mixed course</h2>
              <p className="mt-1 max-w-xl text-sm text-[var(--text-secondary)]">Pick duration + interests (DSA, React, Data Analytics…). AI builds a roadmap with real YouTube + docs you can edit.</p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-fuchsia-600 to-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-md">Start designing <ArrowRight className="h-4 w-4" /></span>
        </div>
      </Link>

      <section>
        {nextPlan.kind === 'quiz' ? (
          <Link
            to="/onboarding"
            className="er-card er-card-hover group flex flex-col gap-4 border-violet-200/80 bg-gradient-to-r from-violet-50 to-indigo-50 p-5 transition-all dark:border-violet-500/30 dark:from-violet-950/40 dark:to-indigo-950/30 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-md shadow-violet-600/25">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">Next step</p>
                <h2 className="text-base font-bold text-[var(--text-primary)]">Finish your skill quiz</h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Pick interests and answer a short Yes/No quiz to unlock match scores and a personal path.
                </p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-violet-600 px-4 py-2 text-sm font-bold text-white">
              Start quiz <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        ) : nextPlan.kind === 'gaps' ? (
          <div className="er-card border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50 p-5 dark:border-amber-500/30 dark:from-amber-950/30 dark:to-orange-950/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md">
                  <Target className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">Next step</p>
                  <h2 className="text-base font-bold text-[var(--text-primary)]">
                    Close {nextPlan.gapCount} skill gap{nextPlan.gapCount === 1 ? '' : 's'}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    For <span className="font-semibold text-[var(--text-primary)]">{nextPlan.trackLabel}</span>
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
                  Your profile for {nextPlan.trackLabel} is ready. Browse internships ranked by how well you match.
                </p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-white">
              View internships <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        )}
      </section>

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

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Continue Learning</h2>
          <Link to="/courses" className="text-sm font-semibold text-[var(--accent)] hover:underline inline-flex items-center gap-1">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {enrolledCourses.length > 0 ? (
            enrolledCourses.map((course) => (
              <div key={course.id} className="er-card p-4">
                <h3 className="font-bold text-[var(--text-primary)]">{course.title}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{course.category}</p>
              </div>
            ))
          ) : (
            <div className="er-card col-span-full p-8 text-center text-[var(--text-secondary)]">
              No enrolled courses yet.{' '}
              <Link to="/browse" className="font-semibold text-[var(--accent)]">Browse courses</Link>
            </div>
          )}
        </div>
      </section>

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
          {recommendedCourses.slice(0, 4).map((course) => (
            <Link key={course.id} to={`/courses/${course.id}`} className="er-card er-card-hover p-4">
              <h3 className="font-bold text-[var(--text-primary)]">{course.title}</h3>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">{course.category}</p>
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

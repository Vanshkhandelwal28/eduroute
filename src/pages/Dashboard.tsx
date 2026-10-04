import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Boxes,
  CheckCircle2,
  Cpu,
  Flame,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  BarChart3,
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
import {
  getStudentVerificationState,
  syncVerificationFromServer,
  type StudentVerificationState,
} from '../utils/pendingVerificationStore';
import { getAuthUser } from '../utils/rbacAuth';
import { getStoredUserProfile } from '../utils/userProfile';
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
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.06 * i, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const COURSE_ICONS = [Cpu, BarChart3, Briefcase, Boxes, BookOpen, Star];

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

  // College verification state for action-zone card (keeps admin approve/reject sync)
  const auth = getAuthUser();
  const profile = getStoredUserProfile();
  const email = auth?.email || profile?.email || '';
  const [verifyState, setVerifyState] = useState<StudentVerificationState>(() =>
    getStudentVerificationState(email),
  );

  useEffect(() => {
    setSkillAnalyze(runDashboardSkillAnalyze());
  }, []);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const next = await syncVerificationFromServer(email);
      if (!cancelled) setVerifyState(next);
    };
    void refresh();
    const onUpd = () => {
      void refresh();
    };
    window.addEventListener('eduroute:verification-updated', onUpd);
    window.addEventListener('focus', onUpd);
    const interval = window.setInterval(() => {
      void refresh();
    }, 8000);
    return () => {
      cancelled = true;
      window.removeEventListener('eduroute:verification-updated', onUpd);
      window.removeEventListener('focus', onUpd);
      window.clearInterval(interval);
    };
  }, [email]);

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
    if (!enrolledCourses.length) {
      if (userSkills.length >= 8) return 62;
      if (userSkills.length >= 4) return 38;
      if (hasSkillProfile) return 22;
      return isNewLearner ? 0 : 12;
    }
    let sum = 0;
    let n = 0;
    for (const c of enrolledCourses) {
      const topics = courseTopicIds(c);
      if (!topics.length) continue;
      sum += courseCompletionStats(c.id, topics).percent;
      n += 1;
    }
    return n ? Math.round(sum / n) : 12;
  }, [enrolledCourses, userSkills.length, hasSkillProfile, isNewLearner]);

  useEffect(() => {
    const refresh = () => setApplications(readApplications());
    window.addEventListener('eduroute:applications-updated', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('eduroute:applications-updated', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const completedCoursesCount =
    earnedSkills.length > 0 ? Math.max(1, Math.floor(earnedSkills.length / 3)) : enrolledCourses.length || 0;
  const streakDays = isNewLearner ? 0 : Math.max(3, Math.min(18, userSkills.length + 2));
  const skillsUnlocked = userSkills.length || 0;
  const appsTracked = applications.length;

  const verifyBadge =
    verifyState === 'verified'
      ? { label: 'Verified', sub: 'Your college is verified. Unlock exclusive opportunities.', cls: 'text-emerald-400', pill: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40' }
      : verifyState === 'pending'
        ? { label: 'Under review', sub: 'College ID submitted — awaiting admin approval.', cls: 'text-amber-400', pill: 'bg-amber-500/20 text-amber-300 border-amber-400/40' }
        : verifyState === 'rejected'
          ? { label: 'Not verified', sub: 'Previous ID rejected — upload again to get verified.', cls: 'text-rose-400', pill: 'bg-rose-500/20 text-rose-300 border-rose-400/40' }
          : { label: 'Not verified', sub: 'Upload college ID to unlock verified benefits.', cls: 'text-slate-300', pill: 'bg-slate-500/20 text-slate-300 border-slate-400/40' };

  return (
    <div className="er-page space-y-6 md:space-y-7">
      {/* ZONE 1: CINEMATIC HERO */}
      <motion.section
        custom={0}
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="relative overflow-hidden rounded-3xl border border-indigo-500/25 bg-[#06061a] min-h-[220px] md:min-h-[260px]"
      >
        <DashboardHero3D percent={Math.max(pathPercent, isNewLearner ? 0 : 12)} />
        <div className="absolute inset-0 bg-gradient-to-r from-[#06061a] via-[#06061a]/75 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col justify-center gap-3 p-6 md:p-8 md:max-w-[48%]">
          <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl lg:text-[2.6rem]">
            Welcome, {firstName}!
          </h1>
          <p className="text-sm font-medium text-indigo-100/85 md:text-[15px]">
            Your placement journey starts here.
          </p>
          {nextPlan.kind === 'gaps' && nextPlan.primary ? (
            <Link
              to={nextPlan.primary.to}
              className="mt-1 inline-flex max-w-fit items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/25"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Next: {nextPlan.primary.skill}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : nextPlan.kind === 'quiz' ? (
            <Link
              to="/onboarding"
              className="mt-1 inline-flex max-w-fit items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/15 px-3 py-1.5 text-xs font-semibold text-indigo-200 transition hover:bg-indigo-500/25"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Complete skill quiz
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : null}
          <div className="mt-2 flex items-center gap-3 md:hidden">
            <div className="h-2 flex-1 max-w-[140px] overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
                style={{ width: `${Math.max(4, pathPercent)}%` }}
              />
            </div>
            <span className="text-sm font-bold text-white">{pathPercent}%</span>
          </div>
        </div>
      </motion.section>

      {/* ZONE 2: STATS STRIP */}
      <motion.section
        custom={1}
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-3 rounded-2xl border border-indigo-500/20 bg-[#0b0b22]/90 p-2 backdrop-blur-md sm:grid-cols-4 sm:gap-0 sm:divide-x sm:divide-indigo-500/15 sm:p-1"
      >
        {[
          { label: 'Completed courses', value: completedCoursesCount, icon: Boxes, color: 'text-violet-400', glow: 'from-violet-500/25 to-indigo-500/10' },
          { label: 'Streak days', value: streakDays, icon: Flame, color: 'text-orange-400', glow: 'from-orange-500/25 to-amber-500/10' },
          { label: 'Skills unlocked', value: skillsUnlocked, icon: Star, color: 'text-sky-400', glow: 'from-sky-500/25 to-cyan-500/10' },
          { label: 'Apps tracked', value: appsTracked, icon: Briefcase, color: 'text-indigo-300', glow: 'from-indigo-500/25 to-violet-500/10' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="group flex items-center gap-3 rounded-xl px-3 py-3.5 transition hover:bg-white/[0.04]">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${s.glow} transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110`}>
                <Icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-black tabular-nums text-white">{s.value}</div>
                <div className="truncate text-[11px] font-medium text-slate-400">{s.label}</div>
              </div>
            </div>
          );
        })}
      </motion.section>

      {skillAnalyze && (
        <motion.div custom={2} variants={fadeUp} initial="hidden" animate="show" className="flex flex-col gap-2 rounded-2xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-indigo-100/90">
            {skillAnalyze.hasProfile
              ? `AI analyzed ${skillAnalyze.skillCount} skills · top lift: ${skillAnalyze.top?.[0]?.title || '—'} (+${skillAnalyze.top?.[0]?.boostPercent ?? 0}%)`
              : 'Run AI skill analyze for real placement-chance scores'}
          </p>
          <button type="button" onClick={() => setSkillAnalyze(runDashboardSkillAnalyze())} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/30">
            <Sparkles className="h-3.5 w-3.5" />
            AI Analyze
          </button>
        </motion.div>
      )}

      {/* ZONE 3: ACTION ZONE */}
      <motion.section custom={3} variants={fadeUp} initial="hidden" animate="show">
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Action Zone</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Link to="/ai-course-designer" className="group relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-[#12123a] via-[#1a1040] to-[#0d1b3a] p-5 shadow-[0_0_40px_-12px_rgba(99,102,241,0.45)] transition hover:border-indigo-400/50 hover:shadow-[0_0_50px_-10px_rgba(99,102,241,0.55)]">
            <div className="flex items-center gap-5">
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-white md:text-xl">Design AI mixed course</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-300">Build job-ready skills with AI-curated courses and hands-on projects.</p>
                <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-500/35 transition group-hover:bg-indigo-500">Start <ArrowRight className="h-4 w-4" /></span>
              </div>
              <div className="relative flex h-28 w-28 shrink-0 items-end justify-center">
                <div className="absolute bottom-0 h-3 w-20 rounded-full bg-indigo-500/40 blur-md" />
                <div className="absolute bottom-1 h-2.5 w-16 rounded-full bg-cyan-400/30 blur-sm" />
                <div className="relative animate-[pulse_3s_ease-in-out_infinite]">
                  <BookOpen className="h-16 w-16 text-cyan-300 drop-shadow-[0_0_18px_rgba(34,211,238,0.65)] transition-transform duration-700 group-hover:scale-110 group-hover:-rotate-6" strokeWidth={1.25} />
                  <div className="absolute -inset-2 rounded-xl bg-cyan-400/10 blur-xl" />
                </div>
              </div>
            </div>
          </Link>

          <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-[#0f1a3a] via-[#12123a] to-[#0a1628] p-5 shadow-[0_0_40px_-12px_rgba(56,189,248,0.35)]">
            <div className="flex items-center gap-5">
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-white md:text-xl">College verification</h3>
                <div className="mt-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${verifyBadge.pill}`}>
                    {verifyState === 'verified' && <CheckCircle2 className="h-3.5 w-3.5" />}
                    {verifyBadge.label}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{verifyBadge.sub}</p>
                {verifyState !== 'verified' && (
                  <Link to="/verify-college" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-300 hover:text-cyan-200">
                    {verifyState === 'pending' ? 'View status' : 'Upload college ID'}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
              <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
                <div className="absolute h-20 w-20 animate-ping rounded-full bg-cyan-400/10" style={{ animationDuration: '2.5s' }} />
                <div className="absolute h-16 w-16 rounded-full bg-cyan-500/15 blur-md" />
                <Shield className="relative h-16 w-16 text-cyan-300 drop-shadow-[0_0_20px_rgba(34,211,238,0.7)]" strokeWidth={1.2} />
                {verifyState === 'verified' && (
                  <CheckCircle2 className="absolute h-6 w-6 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="sr-only" aria-hidden>
          <VerificationStatusCard />
        </div>
      </motion.section>

      {/* ZONE 4: RECOMMENDED COURSES */}
      <motion.section custom={4} variants={fadeUp} initial="hidden" animate="show">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Recommended Courses</h2>
          <Link to="/courses" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">View all →</Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {recommendedCourses.map(({ course, boost }, idx) => {
            const Icon = COURSE_ICONS[idx % COURSE_ICONS.length];
            const badge =
              boost >= 15
                ? { text: 'High Demand', cls: 'bg-sky-500/20 text-sky-300 border-sky-400/30' }
                : boost >= 8
                  ? { text: 'Trending', cls: 'bg-violet-500/20 text-violet-300 border-violet-400/30' }
                  : { text: 'Advanced', cls: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30' };
            const modules =
              (course.modules && course.modules.length) ||
              Math.max(6, Math.round(Number(course.duration?.match(/\d+/)?.[0] || 8)));
            const level = course.level || (idx === 0 ? 'Beginner' : idx === 1 ? 'Intermediate' : 'Advanced');
            return (
              <Link
                key={course.id}
                to={courseHref(course)}
                className="group relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-[#0c0c24] p-4 transition duration-300 hover:-translate-y-1 hover:border-indigo-400/40 hover:shadow-[0_12px_40px_-16px_rgba(99,102,241,0.5)]"
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/30 to-violet-600/20 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                  <Icon className="h-6 w-6 text-indigo-300" />
                </div>
                <h3 className="text-sm font-bold leading-snug text-white group-hover:text-indigo-200">{course.title}</h3>
                <p className="mt-1 text-xs text-slate-400">{modules} Modules · {level}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${badge.cls}`}>{badge.text}</span>
                  {boost > 0 && <span className="text-[10px] font-semibold text-emerald-400">+{boost}% chance</span>}
                </div>
              </Link>
            );
          })}
          {recommendedCourses.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-indigo-500/25 bg-[#0c0c24]/60 p-8 text-center text-sm text-slate-400">
              Complete onboarding or enroll in a course to get personalized recommendations.
            </div>
          )}
        </div>
      </motion.section>

      {enrolledCourses.length > 0 && (
        <motion.section custom={5} variants={fadeUp} initial="hidden" animate="show">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Continue Learning</h2>
            <Link to="/courses" className="text-xs font-semibold text-indigo-400 hover:underline">View all</Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {enrolledCourses.map((course) => {
              const topics = courseTopicIds(course);
              const pct = topics.length ? courseCompletionStats(course.id, topics).percent : 0;
              return (
                <Link key={course.id} to={courseHref(course)} className="group overflow-hidden rounded-2xl border border-indigo-500/15 bg-[#0c0c24] transition hover:border-indigo-400/35">
                  <div className="relative aspect-video overflow-hidden bg-slate-900">
                    <img src={course.thumbnail} alt="" className="h-full w-full object-cover opacity-90 transition group-hover:scale-105" />
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-2 text-sm font-bold text-white">{course.title}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{pct}% complete</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </motion.section>
      )}

      <motion.section custom={6} variants={fadeUp} initial="hidden" animate="show" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link to="/internships" className="flex items-center gap-3 rounded-2xl border border-indigo-500/15 bg-[#0c0c24] p-4 transition hover:border-indigo-400/35">
          <Briefcase className="h-5 w-5 text-blue-400" />
          <div>
            <p className="text-sm font-bold text-white">Internships</p>
            <p className="text-xs text-slate-400">{applications.length} tracked</p>
          </div>
        </Link>
        <Link to="/trend-analyse" className="flex items-center gap-3 rounded-2xl border border-indigo-500/15 bg-[#0c0c24] p-4 transition hover:border-indigo-400/35">
          <TrendingUp className="h-5 w-5 text-teal-400" />
          <div>
            <p className="text-sm font-bold text-white">Trend Analyse</p>
            <p className="text-xs text-slate-400">Market vs you</p>
          </div>
        </Link>
        <Link to="/buddy" className="flex items-center gap-3 rounded-2xl border border-indigo-500/15 bg-[#0c0c24] p-4 transition hover:border-indigo-400/35">
          <Sparkles className="h-5 w-5 text-amber-400" />
          <div>
            <p className="text-sm font-bold text-white">AI Buddy</p>
            <p className="text-xs text-slate-400">Ask anything</p>
          </div>
        </Link>
      </motion.section>
    </div>
  );
};

export default Dashboard;

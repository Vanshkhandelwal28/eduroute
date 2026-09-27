import { useMemo, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Award,
  Briefcase,
  CheckCircle2,
  Code2,
  Download,
  FolderGit2,
  GraduationCap,
  Share2,
  Shield,
  Sparkles,
  Target,
  Trophy,
  Copy,
  ExternalLink,
} from 'lucide-react';
import {
  interestLabel,
  readOnboarding,
  type OnboardingProfile,
} from '../../utils/onboardingStore';
import { getAuthUser } from '../../utils/rbacAuth';
import { getDisplayFirstName, getStoredUserProfile } from '../../utils/userProfile';
import { readApplications, readCompletions, type InternshipApplication } from '../../utils/internshipApplications';
import {
  getStoredPublicUsername,
  isSupabaseConfigured,
  publicProfileUrl,
  slugifyUsername,
  syncMyPublicData,
} from '../../utils/supabaseAuth';
import type { PublicProfilePayload } from '../../utils/publicProfilePayload';

type PortfolioProject = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  link?: string;
  verified?: boolean;
};

const DEMO_PROJECTS: PortfolioProject[] = [
  {
    id: 'p1',
    title: 'EduRoute Buddy Chat',
    description: 'AI mentor chatbot with skill-gap context and multilingual support.',
    tags: ['React', 'TypeScript', 'AI'],
    verified: true,
  },
  {
    id: 'p2',
    title: 'Internship Match Engine',
    description: 'Skill-based matching of student profiles to internship tags with match %.',
    tags: ['TypeScript', 'Algorithms'],
    verified: true,
  },
  {
    id: 'p3',
    title: 'DSA Practice Tracker',
    description: 'Beginner sheet progress and problem tracking for interview prep.',
    tags: ['DSA', 'React'],
    verified: false,
  },
];

const DEMO_ACHIEVEMENTS = [
  { id: 'a1', title: '7-Day Streak', icon: '🔥', detail: 'Consistent daily learning' },
  { id: 'a2', title: 'First Internship Completed', icon: '🎓', detail: 'Pipeline finished with mentor feedback' },
  { id: 'a3', title: 'Skill Profile Ready', icon: '✅', detail: 'Onboarding + gap analysis complete' },
];

function resolvePublicUsername(fullName: string, email: string): string {
  const stored = getStoredPublicUsername();
  if (stored) return stored;
  return slugifyUsername(fullName || email.split('@')[0] || 'user');
}

export const DigitalPortfolio = () => {
  const auth = getAuthUser();
  const stored = getStoredUserProfile();
  const firstName = getDisplayFirstName() || auth?.name?.split(' ')[0] || 'Learner';
  const fullName = auth?.name || stored?.name || firstName;
  const email = auth?.email || stored?.email || '';
  const bio = stored?.roleBio || 'Student learner building industry-ready skills';
  const username = resolvePublicUsername(fullName, email);
  const shareUrl = publicProfileUrl(username);

  const [onboarding, setOnboarding] = useState<OnboardingProfile>(() => readOnboarding());
  const [apps, setApps] = useState<InternshipApplication[]>(() => readApplications());
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const [syncNote, setSyncNote] = useState<string | null>(null);

  const strengths = useMemo(
    () =>
      (onboarding.gapAnswers || [])
        .filter((a) => a.answer === 'yes')
        .map((a) => a.skill),
    [onboarding.gapAnswers],
  );
  const gaps = onboarding.missingSkills || [];
  const interests = (onboarding.interests || []).map(interestLabel);
  const completions = useMemo(() => readCompletions(), [apps]);
  const activeApps = apps.filter((a) => a.status !== 'Completed');

  const buildPublicPayload = useCallback((): PublicProfilePayload => {
    const skills =
      strengths.length > 0
        ? strengths
        : interests.length > 0
          ? interests
          : ['JavaScript', 'React', 'Problem Solving'];
    const internships = [...completions, ...activeApps].slice(0, 8).map((a) => ({
      role: a.role,
      company: a.company,
      status: a.status,
      duration: a.duration,
    }));
    // If no real internships yet, still show a lean placeholder only when nothing else — skip empty noise
    const certs = DEMO_CERTS.map((c) => ({
      title: c.title,
      issuer: c.issuer,
      date: c.date,
    }));
    const achievements = DEMO_ACHIEVEMENTS.map((a) => ({
      title: a.title,
      detail: a.detail,
      icon: a.icon,
    }));
    return {
      skills,
      skillGaps: gaps.slice(0, 12),
      certs,
      internships,
      achievements,
      xp: 120 + completions.length * 50,
      solved: 0,
      pathSummary: skills.slice(0, 5).map((t) => ({ title: t, status: 'active' })),
    };
  }, [strengths, interests, gaps, completions, activeApps]);

  // Push portfolio snapshot to Supabase public_data so /u/:username is rich
  useEffect(() => {
    if (!isSupabaseConfigured || !auth?.id) return;
    const payload = buildPublicPayload();
    void syncMyPublicData(payload)
      .then(() => setSyncNote('Public profile updated'))
      .catch(() => setSyncNote(null));
  }, [auth?.id, buildPublicPayload]);

  useEffect(() => {
    const refresh = () => {
      setOnboarding(readOnboarding());
      setApps(readApplications());
      setAchievements(listCourseAchievements());
    };
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    window.addEventListener('eduroute:applications-updated', refresh);
    window.addEventListener('eduroute:course-achievements-updated', refresh);
    window.addEventListener('eduroute:course-assessment-updated', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', refresh);
      window.removeEventListener('eduroute:applications-updated', refresh);
      window.removeEventListener('eduroute:course-achievements-updated', refresh);
      window.removeEventListener('eduroute:course-assessment-updated', refresh);
    };
  }, []);

  const completeness = useMemo(() => {
    let score = 0;
    if (fullName) score += 15;
    if (email) score += 10;
    if (onboarding.completedAt) score += 20;
    if (allSkills.length) score += 15;
    if (completions.length) score += 15;
    if (achievements.length) score += 10;
    if (DEMO_PROJECTS.length) score += 15;
    return Math.min(100, score);
  }, [fullName, email, onboarding.completedAt, allSkills.length, completions.length, achievements.length]);

  const handleShare = async () => {
    const text = `${fullName} — EduRoute profile\n${shareUrl}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${fullName} | EduRoute`, text, url: shareUrl });
        setShareMsg('Shared');
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setShareMsg('Public link copied');
      }
      setTimeout(() => setShareMsg(null), 2500);
    } catch {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShareMsg('Public link copied');
        setTimeout(() => setShareMsg(null), 2500);
      } catch {
        /* ignore */
      }
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareMsg('Public link copied');
      setTimeout(() => setShareMsg(null), 2500);
    } catch {
      setShareMsg(shareUrl);
    }
  };

  const openCert = (a: CourseAchievement) => {
    setCertData(a);
    setCertOpen(true);
  };

  return (
    <div className="mx-auto max-w-6xl flex-1 space-y-8 p-4 md:p-8">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-8"
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-2xl font-black text-white shadow-lg shadow-indigo-500/30">
              {(fullName || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white md:text-3xl">
                  {fullName}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                  <Shield className="h-3 w-3" /> Digital Portfolio
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400">@{username}</p>
              {email && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{email}</p>}
              <p className="mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-300">{bio}</p>
              {interests.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {interests.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <Copy className="h-4 w-4" /> Copy link
              </button>
              <button
                type="button"
                onClick={() => void handleShare()}
                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-500"
              >
                <Share2 className="h-4 w-4" /> Share
              </button>
              <Link
                to={`/u/${username}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-200"
              >
                <ExternalLink className="h-4 w-4" /> Public page
              </Link>
            </div>
            <p className="max-w-xs truncate text-right text-[11px] text-slate-400" title={shareUrl}>
              {shareUrl}
            </p>
            {shareMsg && <p className="text-right text-xs font-semibold text-emerald-600">{shareMsg}</p>}
            {syncNote && <p className="text-right text-[11px] text-slate-400">{syncNote}</p>}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/40">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-bold text-slate-800 dark:text-slate-100">Portfolio completeness</span>
            <span className="font-black text-indigo-600 dark:text-indigo-400">{completeness}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
              style={{ width: `${completeness}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Share link: /u/{username} (skills, certs, internships, achievements).
          </p>
        </div>
      </motion.section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
            <Target className="h-5 w-5 text-indigo-600" /> Verified Skills
          </h2>
          <Link to="/skill-profile" className="text-xs font-bold text-indigo-600 hover:underline">
            Full gap analysis →
          </Link>
        </div>

        {courseSkills.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-violet-600 dark:text-violet-300">
              Skills gained through courses
            </p>
            <div className="flex flex-wrap gap-2">
              {courseSkills.map((s) => (
                <span
                  key={`course-${s}`}
                  className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-800 dark:bg-violet-500/15 dark:text-violet-200"
                >
                  <Award className="h-3.5 w-3.5" /> {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {!onboarding.completedAt && courseSkills.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center dark:border-slate-700">
            <p className="text-sm text-slate-500">
              Complete skill check or pass a course assessment to unlock verified skills.
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Link
                to="/onboarding"
                className="inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white"
              >
                Start skill check
              </Link>
              <Link
                to="/ai-course-designer"
                className="inline-flex rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200"
              >
                AI Course Designer
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-emerald-600">Strengths</p>
              <div className="flex flex-wrap gap-2">
                {allSkills.length === 0 ? (
                  <span className="text-sm text-slate-400">None marked yet</span>
                ) : (
                  allSkills.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> {s}
                    </span>
                  ))
                )}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-rose-600">Skill gaps to close</p>
              <div className="flex flex-wrap gap-2">
                {gaps.length === 0 ? (
                  <span className="text-sm text-slate-400">No major gaps</span>
                ) : (
                  gaps.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-800 dark:bg-rose-500/15 dark:text-rose-300"
                    >
                      {s}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
            <Briefcase className="h-5 w-5 text-indigo-600" /> Internships & Experience
          </h2>
          <Link to="/internships" className="text-xs font-bold text-indigo-600 hover:underline">
            Board →
          </Link>
        </div>
        {completions.length === 0 && activeApps.length === 0 ? (
          <p className="text-sm text-slate-500">No applications yet. Apply from Internships to build this section.</p>
        ) : (
          <ul className="space-y-3">
            {[...completions, ...activeApps.filter((a) => a.status !== 'Completed')].map((a) => (
              <li
                key={a.internshipId}
                className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40"
              >
                <div className="font-bold text-slate-900 dark:text-white">{a.role}</div>
                <div className="text-xs text-slate-500">
                  {a.company}
                  {a.duration ? ` · ${a.duration}` : ''} · {a.status}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
            <FolderGit2 className="h-5 w-5 text-indigo-600" /> Projects
          </h2>
          <ul className="space-y-3">
            {DEMO_PROJECTS.map((p) => (
              <li key={p.id} className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-white">{p.title}</h3>
                <p className="mt-1 text-xs text-slate-500">{p.description}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
            <Award className="h-5 w-5 text-indigo-600" /> Certifications
          </h2>
          <ul className="space-y-3">
            {DEMO_CERTS.map((c) => (
              <li key={c.id} className="rounded-2xl border border-slate-100 px-4 py-3 dark:border-slate-800">
                <div className="font-bold text-slate-900 dark:text-white">{c.title}</div>
                <div className="text-xs text-slate-500">{c.issuer} · {c.date}</div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
          <Trophy className="h-5 w-5 text-amber-500" /> Achievements
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {DEMO_ACHIEVEMENTS.map((a) => (
            <article key={a.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <span className="text-2xl">{a.icon}</span>
              <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">{a.title}</p>
              <p className="text-xs text-slate-500">{a.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          to="/profile"
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200"
        >
          <GraduationCap className="h-4 w-4" /> Profile dashboard
        </Link>
        <Link
          to="/cv-builder"
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200"
        >
          <Code2 className="h-4 w-4" /> CV Builder
        </Link>
        <Link
          to="/skill-profile"
          className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white"
        >
          <Sparkles className="h-4 w-4" /> Skill gap analysis
        </Link>
      </div>

      {certData && (
        <CourseCertificate
          open={certOpen}
          onClose={() => {
            setCertOpen(false);
            setCertData(null);
          }}
          data={{
            studentName: fullName,
            courseName: certData.courseTitle,
            skills: certData.skills,
            level: certData.level,
            durationLabel: certData.durationLabel,
            completionDate: certData.completedAt,
            certId: certData.certId,
            percent: certData.percent,
            badge: certData.badge,
          }}
        />
      )}
    </div>
  );
};

export default DigitalPortfolio;

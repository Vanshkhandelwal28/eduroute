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
  updateMyProfile,
  ensureUniqueUsername,
} from '../../utils/supabaseAuth';
import type { PublicProfilePayload } from '../../utils/publicProfilePayload';
import {
  listCourseAchievements,
  getAllEarnedCourseSkills,
  type CourseAchievement,
} from '../../utils/courseAchievementsStore';
import { CourseCertificate } from '../../components/CourseCertificate';

const DEMO_PROJECTS = [
  { title: 'Campus Placement Portal', stack: 'React · Node · PostgreSQL', impact: 'Automated shortlisting for 200+ applicants' },
  { title: 'DSA Practice Tracker', stack: 'TypeScript · Local Storage', impact: 'Tracked 400+ solved problems with streaks' },
];

const DEMO_CERTS = [
  { title: 'Full-Stack Web Development', issuer: 'EduRoute', date: '2025-11' },
  { title: 'Data Structures & Algorithms', issuer: 'EduRoute', date: '2025-09' },
];

const DEMO_ACHIEVEMENTS = [
  { title: 'Consistency Streak', detail: '30-day learning streak', icon: '🔥' },
  { title: 'Assessment Ace', detail: 'Scored 85%+ on final assessment', icon: '🏆' },
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
  const [achievements, setAchievements] = useState<CourseAchievement[]>(() => listCourseAchievements());
  const [certData, setCertData] = useState<CourseAchievement | null>(null);
  const [certOpen, setCertOpen] = useState(false);

  const strengths = useMemo(
    () =>
      (onboarding.gapAnswers || [])
        .filter((a) => a.answer === 'yes')
        .map((a) => a.skill),
    [onboarding.gapAnswers],
  );
  const gaps = onboarding.missingSkills || [];
  const interests = (onboarding.interests || []).map(interestLabel);
  const courseSkills = useMemo(() => getAllEarnedCourseSkills(), [achievements]);
  const allSkills = useMemo(() => {
    const s = new Set<string>(
      [...strengths, ...courseSkills, ...interests]
        .map((x) => String(x || '').trim())
        .filter(Boolean),
    );
    return Array.from(s);
  }, [strengths, courseSkills, interests]);
  const completions = useMemo(() => readCompletions(), [apps]);
  const activeApps = apps.filter((a) => a.status !== 'Completed');

  const buildPublicPayload = useCallback((): PublicProfilePayload => {
    // Merge ALL skill sources so public portfolio shows everything the learner has
    const skillsMerged = Array.from(
      new Set(
        [...strengths, ...courseSkills, ...interests]
          .map((s) => String(s || '').trim())
          .filter(Boolean),
      ),
    );
    const skills =
      skillsMerged.length > 0
        ? skillsMerged
        : ['JavaScript', 'React', 'Problem Solving'];
    const internships = [...completions, ...activeApps].slice(0, 8).map((a) => ({
      role: a.role,
      company: a.company,
      status: a.status,
      duration: a.duration,
    }));
    const certs =
      achievements.length > 0
        ? achievements.slice(0, 8).map((a) => ({
            title: a.courseTitle,
            issuer: 'EduRoute',
            date: (a.completedAt || '').slice(0, 10),
          }))
        : DEMO_CERTS.map((c) => ({
            title: c.title,
            issuer: c.issuer,
            date: c.date,
          }));
    const demoAchievements = DEMO_ACHIEVEMENTS.map((a) => ({
      title: a.title,
      detail: a.detail,
      icon: a.icon,
    }));
    const courseAchievements = achievements.slice(0, 6).map((a) => ({
      title: `${a.courseTitle} · ${a.badge.toUpperCase()}`,
      detail: `${a.percent}% · ${a.level}`,
      icon: a.badge === 'gold' ? '🥇' : a.badge === 'silver' ? '🥈' : '🥉',
    }));
    return {
      skills,
      skillGaps: gaps.slice(0, 12),
      certs,
      internships,
      achievements: [...courseAchievements, ...demoAchievements].slice(0, 10),
      xp: 250,
      solved: 0,
      pathSummary: skills.slice(0, 8).map((t) => ({ title: t, status: 'active' })),
    };
  }, [strengths, interests, gaps, completions, activeApps, courseSkills, achievements]);

  useEffect(() => {
    if (!isSupabaseConfigured || !auth?.id) return;
    const payload = buildPublicPayload();
    void syncMyPublicData(payload)
      .then(() => setSyncNote('Public profile updated'))
      .catch(() => setSyncNote(null));
  }, [auth?.id, buildPublicPayload]);

  // Ensure public username is unique in Supabase (portfolio share link)
  useEffect(() => {
    if (!isSupabaseConfigured || !auth?.id) return;
    let cancelled = false;
    const claim = async () => {
      try {
        const base = slugifyUsername(username || fullName || email.split('@')[0] || 'user');
        const unique = await ensureUniqueUsername(base, auth.id);
        if (cancelled) return;
        if (unique !== username) {
          try {
            localStorage.setItem('eduroute:public-username', unique);
          } catch {
            /* */
          }
        }
        await updateMyProfile({ username: unique, name: fullName, bio });
        try {
          localStorage.setItem('eduroute:public-username', unique);
        } catch {
          /* */
        }
      } catch (e) {
        console.warn('[portfolio] username claim failed', e);
      }
    };
    void claim();
    return () => {
      cancelled = true;
    };
  }, [auth?.id]);

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
    try {
      if (navigator.share) {
        await navigator.share({ title: `${fullName} · EduRoute Portfolio`, url: shareUrl });
        setShareMsg('Shared!');
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setShareMsg('Link copied');
      }
      setTimeout(() => setShareMsg(null), 2000);
    } catch {
      setShareMsg(null);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareMsg('Link copied');
      setTimeout(() => setShareMsg(null), 2000);
    } catch {
      setShareMsg(null);
    }
  };

  const openCert = (a: CourseAchievement) => {
    setCertData(a);
    setCertOpen(true);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">Digital Portfolio</p>
            <h1 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{fullName}</h1>
            <p className="mt-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400">@{username}</p>
            <p className="mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-300">{bio}</p>
            <p className="mt-2 text-xs text-slate-500">Portfolio completeness · {completeness}%</p>
            {syncNote && <p className="mt-1 text-xs font-semibold text-emerald-600">{syncNote}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleShare} className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white">
              <Share2 className="h-4 w-4" /> Share
            </button>
            <button type="button" onClick={handleCopy} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">
              <Copy className="h-4 w-4" /> Copy link
            </button>
            <Link to={`/u/${username}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-200">
              <ExternalLink className="h-4 w-4" /> Public view
            </Link>
          </div>
        </div>
        {shareMsg && <p className="mt-3 text-sm font-semibold text-emerald-600">{shareMsg}</p>}
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Share link: /u/{username}</p>
      </motion.section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
          <Target className="h-5 w-5 text-indigo-600" /> Verified Skills
        </h2>
        {courseSkills.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-violet-600">Skills gained through courses</p>
            <div className="flex flex-wrap gap-2">
              {courseSkills.map((s) => (
                <span key={`course-${s}`} className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-800 dark:bg-violet-500/15 dark:text-violet-200">
                  <Award className="h-3.5 w-3.5" /> {s}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-emerald-600">Strengths</p>
            <div className="flex flex-wrap gap-2">
              {allSkills.length === 0 ? (
                <span className="text-sm text-slate-400">None marked yet</span>
              ) : (
                allSkills.map((s) => (
                  <span key={s} className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
                    {s}
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
                  <span key={s} className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-800 dark:bg-rose-500/15 dark:text-rose-300">
                    {s}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <Link to="/skill-profile" className="text-xs font-bold text-indigo-600 hover:underline">
            Full gap analysis →
          </Link>
        </div>
      </section>

      {achievements.length > 0 && (
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
            <Award className="h-5 w-5 text-indigo-600" /> Course certificates
          </h2>
          <ul className="space-y-3">
            {achievements.map((a) => (
              <li key={a.courseId} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-100 px-4 py-3 dark:border-slate-800">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">{a.courseTitle}</div>
                  <div className="text-xs text-slate-500">
                    {a.badge.toUpperCase()} · {a.percent}% · {a.level}
                  </div>
                </div>
                <button type="button" onClick={() => openCert(a)} className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white">
                  <Download className="h-3.5 w-3.5" /> Download
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
          <FolderGit2 className="h-5 w-5 text-indigo-600" /> Projects
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {DEMO_PROJECTS.map((p) => (
            <article key={p.title} className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
              <p className="font-bold text-slate-900 dark:text-white">{p.title}</p>
              <p className="mt-1 text-xs text-slate-500">{p.stack}</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{p.impact}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
          <Briefcase className="h-5 w-5 text-indigo-600" /> Internships
        </h2>
        {completions.length + activeApps.length === 0 ? (
          <p className="text-sm text-slate-500">No internship applications yet.</p>
        ) : (
          <ul className="space-y-2">
            {[...completions, ...activeApps].slice(0, 8).map((a, i) => (
              <li key={`${a.company}-${i}`} className="rounded-xl border border-slate-100 px-3 py-2 text-sm dark:border-slate-800">
                <span className="font-bold">{a.role}</span> · {a.company}
                <span className="ml-2 text-xs text-slate-500">{a.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap gap-3">
        <Link to="/profile" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">
          <GraduationCap className="h-4 w-4" /> Profile dashboard
        </Link>
        <Link to="/ai-course-designer" className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white">
          <Sparkles className="h-4 w-4" /> AI Course Designer
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
            courseTitle: certData.courseTitle,
            skills: certData.skills,
            level: certData.level,
            durationDays: certData.durationDays,
            percent: certData.percent,
            badge: certData.badge,
            completedAt: certData.completedAt,
            certId: certData.certId,
          }}
        />
      )}
    </div>
  );
};

export default DigitalPortfolio;

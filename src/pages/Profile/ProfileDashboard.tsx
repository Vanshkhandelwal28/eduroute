import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Award,
  Flame,
  PenLine,
  Sparkles,
  Target,
  Trophy,
  ArrowRight,
  Download,
  Code2,
  CheckCircle2,
  Lock,
  Clock,
  Bus,
  Flag,
  Star,
  Zap,
  BookOpen,
  Briefcase,
} from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { getProfileDashboardData } from '../../services/profileDashboardApi';
import { PROFILE_DASHBOARD_MOCK, type ProfileDashboardData } from '../../data/profileMockData';
import { getAuthToken, getAuthUser, saveAuthSession } from '../../utils/rbacAuth';
import { getStoredUserProfile, saveUserProfile } from '../../utils/userProfile';
import { readOnboarding } from '../../utils/onboardingStore';
import { readCompletions } from '../../utils/internshipApplications';
import {
  listCourseAchievements,
  getAllEarnedCourseSkills,
  type CourseAchievement,
} from '../../utils/courseAchievementsStore';
import { syncMyPublicData, isSupabaseConfigured } from '../../utils/supabaseAuth';
import { BuildCvCta } from '../../components/BuildCvCta';
import { CourseCertificate } from '../../components/CourseCertificate';
import {
  resolveLearningPath,
  continueHrefForNode,
  careerLabelForUser,
  type PathNode,
} from '../../utils/learningPathStore';

const difficultyColors = {
  easy: '#22c55e',
  medium: '#f59e0b',
  hard: '#ef4444',
};

function AmbientGlow() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-violet-600/12 blur-3xl" />
      <div className="absolute right-0 top-32 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="absolute bottom-40 left-1/3 h-64 w-64 rounded-full bg-cyan-500/8 blur-3xl" />
    </div>
  );
}

function RailwayLearningPath() {
  const [nodes, setNodes] = useState<PathNode[]>([]);
  const [track, setTrack] = useState(careerLabelForUser());
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await resolveLearningPath();
      setNodes(res.nodes);
      setTrack(res.track);
      const current = res.nodes.find((n) => n.status === 'current') || res.nodes[0];
      setSelectedId(current?.id || null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const onUp = () => void load();
    window.addEventListener('eduroute:learning-path-updated', onUp);
    window.addEventListener('eduroute:onboarding-updated', onUp);
    window.addEventListener('focus', onUp);
    return () => {
      window.removeEventListener('eduroute:learning-path-updated', onUp);
      window.removeEventListener('eduroute:onboarding-updated', onUp);
      window.removeEventListener('focus', onUp);
    };
  }, [load]);

  const selected = nodes.find((n) => n.id === selectedId) || nodes.find((n) => n.status === 'current') || nodes[0];
  const completedCount = nodes.filter((n) => n.status === 'completed').length;
  const currentIdx = Math.max(0, nodes.findIndex((n) => n.status === 'current'));
  const progressPct =
    nodes.length <= 1
      ? completedCount > 0
        ? 100
        : 0
      : Math.min(100, ((currentIdx + (completedCount > currentIdx ? 1 : 0.45)) / (nodes.length - 1)) * 100);

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-slate-900/70 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.35)] backdrop-blur-xl md:p-6">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -right-10 top-0 h-40 w-40 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-32 w-32 rounded-full bg-indigo-500/10 blur-2xl" />
      </div>

      <div className="relative mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-violet-300">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-black uppercase tracking-[0.15em]">Your Learning Path</span>
          </div>
          <h2 className="text-lg font-black text-white md:text-xl">{track || 'Career path'}</h2>
          <p className="mt-1 text-sm text-slate-400">
            Personalized from your goal, skills & progress · {completedCount}/{nodes.length || 0} stations done
          </p>
        </div>
        <Link
          to="/roadmaps"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/10"
        >
          View All <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="flex h-28 items-center justify-center text-sm text-slate-500">Loading your path…</div>
      ) : nodes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-center">
          <p className="text-sm text-slate-400">Complete onboarding to unlock your personalized railway.</p>
          <Link to="/skill-profile" className="mt-3 inline-flex text-sm font-bold text-indigo-400 hover:underline">
            Set career goal →
          </Link>
        </div>
      ) : (
        <>
          <div className="relative overflow-x-auto pb-1">
            <div className="relative mx-auto min-w-[560px] max-w-full px-1 pt-6">
              <div className="absolute left-10 right-10 top-[38px] h-[5px] rounded-full bg-slate-700/90">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-500 via-indigo-500 to-violet-500/40 transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="pointer-events-none absolute left-12 right-12 top-[36px] flex justify-between" aria-hidden>
                {Array.from({ length: Math.min(8, nodes.length + 1) }).map((_, i) => (
                  <span key={i} className="text-[8px] leading-none text-slate-500/80">
                    ›
                  </span>
                ))}
              </div>

              <div className="relative z-10 flex items-start justify-between gap-1">
                <div className="flex w-12 shrink-0 flex-col items-center">
                  <div className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-teal-400/70 bg-teal-500/25 text-teal-300 shadow-md shadow-teal-500/20">
                    <Flag className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-teal-400">Start</span>
                </div>

                {nodes.map((node, idx) => {
                  const isDone = node.status === 'completed';
                  const isCurrent = node.status === 'current';
                  const isLocked = node.status === 'locked';
                  const isSel = selectedId === node.id;
                  return (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => setSelectedId(node.id)}
                      className="group relative flex min-w-0 flex-1 flex-col items-center focus:outline-none"
                    >
                      {isCurrent && (
                        <motion.div
                          initial={{ y: -6, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          className="absolute -top-5 left-1/2 z-20 -translate-x-1/2"
                          title="You are here"
                        >
                          <div className="flex h-6 w-8 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/40 ring-2 ring-indigo-400/30">
                            <Bus className="h-3 w-3" />
                          </div>
                        </motion.div>
                      )}
                      <div
                        className={`mb-1.5 flex h-8 w-8 items-center justify-center rounded-xl border-2 text-xs font-black shadow-sm transition ${
                          isDone
                            ? 'border-teal-400/70 bg-teal-500/25 text-teal-300'
                            : isCurrent
                              ? 'border-indigo-400 bg-indigo-500/30 text-indigo-200 ring-2 ring-indigo-400/35'
                              : 'border-slate-600 bg-slate-800/90 text-slate-500'
                        } ${isSel ? 'scale-110' : 'group-hover:scale-105'}`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : isLocked ? (
                          <Lock className="h-3 w-3" />
                        ) : (
                          <span>{idx + 1}</span>
                        )}
                      </div>
                      <span
                        className={`line-clamp-2 max-w-[72px] text-center text-[10px] font-bold leading-tight ${
                          isDone ? 'text-teal-300' : isCurrent ? 'text-indigo-200' : 'text-slate-500'
                        }`}
                      >
                        {node.short || node.title}
                      </span>
                    </button>
                  );
                })}

                <div className="flex w-12 shrink-0 flex-col items-center">
                  <div className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-violet-400/60 bg-violet-500/20 text-violet-300">
                    <Trophy className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-violet-400">End</span>
                </div>
              </div>
            </div>
          </div>

          {selected && (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-2xl border border-white/10 bg-slate-950/50 p-3.5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-black text-white">{selected.title}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                        selected.status === 'completed'
                          ? 'bg-teal-500/20 text-teal-300'
                          : selected.status === 'current'
                            ? 'bg-indigo-500/25 text-indigo-300'
                            : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {selected.status === 'completed' ? 'Done' : selected.status === 'current' ? 'Current' : 'Upcoming'}
                    </span>
                  </div>
                  {selected.short && <p className="text-xs leading-relaxed text-slate-400">{selected.short}</p>}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selected.hours > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-slate-400">
                        <Clock className="h-3 w-3" /> ~{selected.hours}h
                      </span>
                    )}
                    {(selected.skills || []).slice(0, 5).map((s) => (
                      <span key={s} className="rounded-lg bg-indigo-500/15 px-2 py-0.5 text-[11px] font-semibold text-indigo-300">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                {selected.status !== 'locked' && (
                  <Link
                    to={continueHrefForNode(selected)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-violet-500"
                  >
                    Continue <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </>
      )}
    </section>
  );
}

export const ProfileDashboard = () => {
  const [profileData, setProfileData] = useState<ProfileDashboardData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editBio, setEditBio] = useState('');
  const onboarding = useMemo(() => readOnboarding(), []);
  const skillGapCount = onboarding.missingSkills?.length || 0;
  const completions = useMemo(() => readCompletions(), []);
  const [achievements, setAchievements] = useState<CourseAchievement[]>(() => listCourseAchievements());
  const courseSkills = useMemo(() => getAllEarnedCourseSkills(), [achievements]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const skills = Array.from(new Set([...courseSkills].map((s) => String(s || '').trim()).filter(Boolean)));
    if (skills.length === 0 && achievements.length === 0) return;
    void syncMyPublicData({
      skills: skills.length ? skills : undefined,
      certs: achievements.slice(0, 8).map((a) => ({
        title: a.courseTitle,
        issuer: 'EduRoute',
        date: (a.completedAt || '').slice(0, 10),
      })),
    }).catch(() => {});
  }, [courseSkills, achievements]);

  const [certOpen, setCertOpen] = useState(false);
  const [certData, setCertData] = useState<CourseAchievement | null>(null);

  useEffect(() => {
    const refreshAchievements = () => setAchievements(listCourseAchievements());
    window.addEventListener('eduroute:course-achievements-updated', refreshAchievements);
    window.addEventListener('eduroute:course-assessment-updated', refreshAchievements);
    window.addEventListener('focus', refreshAchievements);
    return () => {
      window.removeEventListener('eduroute:course-achievements-updated', refreshAchievements);
      window.removeEventListener('eduroute:course-assessment-updated', refreshAchievements);
      window.removeEventListener('focus', refreshAchievements);
    };
  }, []);

  useEffect(() => {
    const authUser = getAuthUser();
    const storedProfile = getStoredUserProfile();
    const userName = authUser?.name || storedProfile?.name;
    const userEmail = authUser?.email || storedProfile?.email;
    const userAvatar = authUser?.avatar || storedProfile?.avatar;
    const userBio = storedProfile?.roleBio;
    const userIdentity = userName
      ? {
          fullName: userName,
          username: userEmail?.split('@')[0] || userName.toLowerCase().replace(/\s+/g, ''),
          profilePhoto: userAvatar,
          roleBio: userBio || 'Student learner',
        }
      : null;

    const loadData = async () => {
      const base = { ...PROFILE_DASHBOARD_MOCK };
      try {
        const payload = await getProfileDashboardData();
        const merged = {
          ...base,
          ...(payload && typeof payload === 'object' ? payload : {}),
          badges: Array.isArray((payload as any)?.badges) ? (payload as any).badges : base.badges,
          activityHeatmap: Array.isArray((payload as any)?.activityHeatmap)
            ? (payload as any).activityHeatmap
            : base.activityHeatmap,
          recentActivity: Array.isArray((payload as any)?.recentActivity)
            ? (payload as any).recentActivity
            : Array.isArray((payload as any)?.recentSubmissions)
              ? (payload as any).recentSubmissions
              : base.recentActivity,
          rank: { ...base.rank, ...((payload as any)?.rank || {}) },
          xp: { ...base.xp, ...((payload as any)?.xp || {}) },
          solved: { ...base.solved, ...((payload as any)?.solved || {}) },
          streak: {
            current: (payload as any)?.streak?.current ?? base.streak.current,
            max: (payload as any)?.streak?.max ?? (payload as any)?.streak?.best ?? base.streak.max,
          },
        };
        setProfileData(userIdentity ? { ...merged, ...userIdentity } : merged);
      } catch {
        setProfileData(userIdentity ? { ...base, ...userIdentity } : base);
      }
    };

    void loadData();
    window.addEventListener('focus', loadData);
    return () => window.removeEventListener('focus', loadData);
  }, []);

  const progressPercent = useMemo(() => {
    if (!profileData?.xp) return 0;
    const levelSpan = (profileData.xp.nextLevelXp || 0) - (profileData.xp.currentLevelXp || 0);
    if (levelSpan <= 0) return 0;
    const earned = (profileData.xp.total || 0) - (profileData.xp.currentLevelXp || 0);
    return Math.max(0, Math.min(100, Math.round((earned / levelSpan) * 100)));
  }, [profileData]);

  const chartData = useMemo(() => {
    if (!profileData?.solved) return [];
    return [
      { name: 'Easy', value: profileData.solved.easy || 0, color: difficultyColors.easy },
      { name: 'Medium', value: profileData.solved.medium || 0, color: difficultyColors.medium },
      { name: 'Hard', value: profileData.solved.hard || 0, color: difficultyColors.hard },
    ];
  }, [profileData]);

  const skillPills = useMemo(() => {
    const fromCourse = courseSkills.slice(0, 6);
    const fromOnboard = (onboarding.gapAnswers || [])
      .filter((a) => a.answer === 'yes')
      .map((a) => a.skill)
      .slice(0, 6);
    return Array.from(new Set([...fromCourse, ...fromOnboard])).slice(0, 8);
  }, [courseSkills, onboarding]);

  const heatmap = useMemo(() => {
    const WEEKS = 17;
    const raw = (profileData as any)?.activityHeatmap;
    const values: number[] = [];
    if (Array.isArray(raw) && raw.length > 0) {
      for (const cell of raw) {
        const c = typeof cell === 'number' ? cell : Number(cell?.count ?? cell?.level ?? 0);
        values.push(Number.isFinite(c) ? Math.max(0, Math.min(4, Math.round(c))) : 0);
      }
    }
    while (values.length < WEEKS * 7) {
      const i = values.length;
      values.push(i % 13 === 0 ? 3 : i % 7 === 0 ? 2 : i % 5 === 0 ? 1 : 0);
    }
    const grid = values.slice(-WEEKS * 7);
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - (WEEKS * 7 - 1));
    const day = start.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diffToMon);
    const months: { label: string; col: number }[] = [];
    let lastMonth = -1;
    for (let w = 0; w < WEEKS; w++) {
      const d = new Date(start);
      d.setDate(start.getDate() + w * 7);
      const m = d.getMonth();
      if (m !== lastMonth) {
        months.push({ label: d.toLocaleString('en', { month: 'short' }), col: w });
        lastMonth = m;
      }
    }
    return { grid, weeks: WEEKS, months, start };
  }, [profileData]);

  const recentActivity = useMemo(() => {
    const raw = (profileData as any)?.recentActivity;
    if (Array.isArray(raw) && raw.length > 0) return raw.slice(0, 5);
    return [];
  }, [profileData]);

  if (!profileData) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#0B1220] p-8 text-slate-400">Loading profile…</div>
    );
  }

  const firstName = (profileData.fullName || 'Learner').split(' ')[0];

  const openEditor = () => {
    setEditName(profileData.fullName);
    setEditEmail(getStoredUserProfile()?.email || getAuthUser()?.email || '');
    setEditBio(profileData.roleBio);
    setIsEditing(true);
  };

  const saveProfile = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = editName.trim();
    const email = editEmail.trim();
    if (!name || !email) return;
    const storedProfile = getStoredUserProfile();
    const avatar = getAuthUser()?.avatar || storedProfile?.avatar;
    const roleBio = editBio.trim() || 'Student learner';
    saveUserProfile({ name, email, avatar, roleBio, enrolledCourses: storedProfile?.enrolledCourses });
    const authUser = getAuthUser();
    const authToken = getAuthToken();
    if (authUser && authToken) {
      saveAuthSession(authToken, { ...authUser, name, email });
    }
    setProfileData((current) =>
      current
        ? {
            ...current,
            fullName: name,
            username: email.split('@')[0] || name.toLowerCase().replace(/\s+/g, ''),
            profilePhoto: avatar,
            roleBio,
          }
        : current,
    );
    setIsEditing(false);
  };

  const openCert = (a: CourseAchievement) => {
    setCertData(a);
    setCertOpen(true);
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0B1220] text-slate-100">
      <AmbientGlow />

      <div className="relative z-10 mx-auto max-w-7xl space-y-6 p-4 md:p-8">
        <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-900/90 via-indigo-950/50 to-slate-900/80 p-5 shadow-[0_16px_48px_rgba(15,23,42,0.4)] backdrop-blur-xl md:p-7">
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1400&q=60')",
              backgroundSize: 'cover',
              backgroundPosition: 'center right',
              filter: 'brightness(0.55) saturate(1.1)',
            }}
            aria-hidden
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B1220] via-[#0B1220]/92 to-transparent" aria-hidden />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <p className="mb-1 text-sm font-semibold text-slate-300">{greeting},</p>
              <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">
                {firstName} <span className="inline-block" aria-hidden>👋</span>
              </h1>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-300 md:text-base">
                {profileData.roleBio || 'Build your dream career with the right skills, one step at a time.'}
              </p>

              {skillPills.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {skillPills.map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold text-slate-200 backdrop-blur-sm"
                    >
                      {s}
                    </span>
                  ))}
                  {skillGapCount > 0 && (
                    <span className="rounded-full border border-rose-400/30 bg-rose-500/15 px-3 py-1 text-[11px] font-bold text-rose-300">
                      +{skillGapCount} gaps
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col items-stretch gap-3 sm:flex-row lg:flex-col">
              <div className="min-w-[200px] rounded-2xl border border-white/15 bg-slate-950/55 p-4 backdrop-blur-md">
                <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-300">
                  <Zap className="h-3.5 w-3.5" /> Level {profileData.xp?.level ?? 1}
                </div>
                <div className="text-sm font-semibold text-slate-300">{profileData.xp?.levelName || 'Advanced'}</div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="mt-1.5 text-[11px] font-semibold text-slate-500">
                  {(profileData.xp?.total ?? 0).toLocaleString()} / {(profileData.xp?.nextLevelXp ?? 0).toLocaleString()} XP
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  to="/skill-profile"
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-xs font-bold text-white backdrop-blur-sm transition hover:bg-white/15"
                >
                  <Target className="h-3.5 w-3.5" /> Skill Profile
                </Link>
                <button
                  type="button"
                  onClick={openEditor}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-xs font-bold text-white backdrop-blur-sm transition hover:bg-white/15"
                >
                  <PenLine className="h-3.5 w-3.5" /> Edit
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {[
            {
              label: 'Day Streak',
              value: String(profileData.streak?.current ?? 0),
              delta: profileData.streak?.max ? `Best ${profileData.streak.max}` : undefined,
              icon: Flame,
              accent: 'from-orange-500/20 to-amber-500/10 text-orange-300',
              iconBg: 'bg-orange-500/20 text-orange-400',
            },
            {
              label: 'Total Problems',
              value: String(profileData.solved?.total ?? 0),
              icon: Code2,
              accent: 'from-blue-500/20 to-cyan-500/10 text-blue-300',
              iconBg: 'bg-blue-500/20 text-blue-400',
            },
            {
              label: 'XP Earned',
              value: (profileData.xp?.total ?? 0).toLocaleString(),
              icon: Star,
              accent: 'from-amber-500/20 to-yellow-500/10 text-amber-300',
              iconBg: 'bg-amber-500/20 text-amber-400',
            },
            {
              label: 'Global Rank',
              value: `#${(profileData.rank?.global ?? 0).toLocaleString()}`,
              icon: Trophy,
              accent: 'from-violet-500/20 to-fuchsia-500/10 text-violet-300',
              iconBg: 'bg-violet-500/20 text-violet-400',
            },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${s.accent} p-4 shadow-[0_8px_24px_rgba(15,23,42,0.25)] backdrop-blur-md`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.iconBg}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-white">{s.value}</div>
                <div className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">{s.label}</div>
                {s.delta && <div className="mt-1 text-[10px] font-semibold text-slate-500">{s.delta}</div>}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <RailwayLearningPath />
          </div>

          <div className="space-y-4">
            <div className="rounded-[24px] border border-white/10 bg-slate-900/70 p-3.5 shadow-[0_8px_28px_rgba(15,23,42,0.3)] backdrop-blur-xl">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-1.5 text-xs font-black text-white">
                  <Flame className="h-3.5 w-3.5 text-orange-400" /> Activity
                </h3>
                <span className="text-[10px] font-semibold text-slate-500">Last {heatmap.weeks} weeks</span>
              </div>

              <div className="mb-0.5 ml-6 flex text-[9px] font-semibold text-slate-500">
                {heatmap.months.map((m, i) => (
                  <span
                    key={`${m.label}-${m.col}-${i}`}
                    className="shrink-0"
                    style={{
                      marginLeft: i === 0 ? `${m.col * 12}px` : undefined,
                      width:
                        i < heatmap.months.length - 1
                          ? `${Math.max(1, (heatmap.months[i + 1].col - m.col) * 12)}px`
                          : undefined,
                    }}
                  >
                    {m.label}
                  </span>
                ))}
              </div>

              <div className="flex gap-1">
                <div className="flex w-5 flex-col justify-between py-[1px] text-[9px] font-medium leading-none text-slate-500">
                  <span className="h-[10px]" />
                  <span className="flex h-[10px] items-center">M</span>
                  <span className="h-[10px]" />
                  <span className="flex h-[10px] items-center">W</span>
                  <span className="h-[10px]" />
                  <span className="flex h-[10px] items-center">F</span>
                  <span className="h-[10px]" />
                </div>

                <div className="flex gap-[3px]">
                  {Array.from({ length: heatmap.weeks }).map((_, week) => (
                    <div key={week} className="flex flex-col gap-[3px]">
                      {Array.from({ length: 7 }).map((_, day) => {
                        const idx = week * 7 + day;
                        const c = heatmap.grid[idx] ?? 0;
                        const level =
                          c >= 4
                            ? 'bg-teal-300'
                            : c >= 3
                              ? 'bg-teal-400'
                              : c >= 2
                                ? 'bg-teal-600'
                                : c >= 1
                                  ? 'bg-teal-800'
                                  : 'bg-slate-800';
                        return (
                          <div
                            key={day}
                            className={`h-[10px] w-[10px] rounded-[2px] ${level}`}
                            title={c ? `${c} contributions` : 'No activity'}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-2 flex items-center justify-end gap-1 text-[9px] text-slate-500">
                <span>Less</span>
                <span className="h-[10px] w-[10px] rounded-[2px] bg-slate-800" />
                <span className="h-[10px] w-[10px] rounded-[2px] bg-teal-800" />
                <span className="h-[10px] w-[10px] rounded-[2px] bg-teal-600" />
                <span className="h-[10px] w-[10px] rounded-[2px] bg-teal-400" />
                <span className="h-[10px] w-[10px] rounded-[2px] bg-teal-300" />
                <span>More</span>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-slate-900/70 p-4 shadow-[0_8px_28px_rgba(15,23,42,0.3)] backdrop-blur-xl">
              <h3 className="mb-3 text-sm font-black text-white">Quick Stats</h3>
              <ul className="space-y-2.5">
                {[
                  { label: 'Certificates', value: String(achievements.length), icon: Award, color: 'text-emerald-400' },
                  { label: 'Course skills', value: String(courseSkills.length), icon: BookOpen, color: 'text-indigo-400' },
                  { label: 'Internships tracked', value: String(completions.length), icon: Briefcase, color: 'text-amber-400' },
                  { label: 'Skill gaps', value: String(skillGapCount), icon: Target, color: 'text-rose-400' },
                ].map((row) => {
                  const Icon = row.icon;
                  return (
                    <li key={row.label} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                        <Icon className={`h-3.5 w-3.5 ${row.color}`} />
                        {row.label}
                      </span>
                      <span className="text-sm font-black text-white">{row.value}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <section className="rounded-[24px] border border-white/10 bg-slate-900/70 p-5 shadow-[0_8px_28px_rgba(15,23,42,0.3)] backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-black text-white">
                <Sparkles className="h-4 w-4 text-violet-400" /> Skills from courses
              </h2>
              <Link to="/ai-course-designer" className="text-[11px] font-bold text-indigo-400 hover:underline">
                AI Course Designer →
              </Link>
            </div>
            {courseSkills.length === 0 ? (
              <p className="text-sm text-slate-500">
                Pass a final assessment (60%+) on a designed course to show skills here.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {courseSkills.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 rounded-full border border-violet-500/25 bg-violet-500/15 px-3 py-1.5 text-xs font-bold text-violet-200"
                  >
                    <Award className="h-3.5 w-3.5" /> {s}
                  </span>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[24px] border border-white/10 bg-slate-900/70 p-5 shadow-[0_8px_28px_rgba(15,23,42,0.3)] backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-black text-white">
                <Award className="h-4 w-4 text-indigo-400" /> Course certificates
              </h2>
              <span className="text-[11px] text-slate-500">{achievements.length} earned</span>
            </div>
            {achievements.length === 0 ? (
              <p className="text-sm text-slate-500">
                Complete ~95% of a course, pass the AI final quiz, then download certificates here.
              </p>
            ) : (
              <ul className="space-y-2">
                {achievements.slice(0, 4).map((a) => (
                  <li
                    key={a.courseId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-white">{a.courseTitle}</div>
                      <div className="text-[10px] text-slate-500">
                        Score {a.percent}% · {(a.badge || 'bronze').toUpperCase()}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openCert(a)}
                      className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-indigo-500"
                    >
                      <Download className="h-3 w-3" /> Cert
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <section className="rounded-[24px] border border-white/10 bg-slate-900/70 p-5 shadow-[0_8px_28px_rgba(15,23,42,0.3)] backdrop-blur-xl">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-white">
              <Trophy className="h-4 w-4 text-amber-400" /> Achievements
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {(profileData.badges || []).slice(0, 6).map((b: any, i: number) => (
                <div key={b.id || b.name || i} className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-center">
                  <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
                    <Star className="h-4 w-4" />
                  </div>
                  <div className="line-clamp-2 text-[11px] font-bold text-amber-100">{b.name || b.title || 'Badge'}</div>
                  {b.xp && <div className="mt-0.5 text-[10px] font-semibold text-amber-400/80">+{b.xp} XP</div>}
                </div>
              ))}
              {(profileData.badges || []).length === 0 && (
                <p className="col-span-2 text-sm text-slate-500">Earn badges by solving problems and completing modules.</p>
              )}
            </div>
          </section>

          <section className="rounded-[24px] border border-white/10 bg-slate-900/70 p-5 shadow-[0_8px_28px_rgba(15,23,42,0.3)] backdrop-blur-xl">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-white">
              <Clock className="h-4 w-4 text-slate-400" /> Recent Activity
            </h2>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-slate-500">Your recent solves and completions will show here.</p>
            ) : (
              <ul className="space-y-2">
                {recentActivity.map((item: any, i: number) => (
                  <li key={item.id || i} className="flex items-start gap-2 rounded-xl border border-white/5 bg-slate-950/30 px-3 py-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-400" />
                    <div className="min-w-0">
                      <div className="line-clamp-2 text-xs font-semibold text-slate-200">
                        {item.title || item.problem || item.description || 'Activity'}
                      </div>
                      {(item.time || item.date) && (
                        <div className="text-[10px] text-slate-500">{item.time || item.date}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-[24px] border border-white/10 bg-slate-900/70 p-5 shadow-[0_8px_28px_rgba(15,23,42,0.3)] backdrop-blur-xl">
            <h2 className="mb-3 text-sm font-black text-white">Solved by difficulty</h2>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={3}>
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      background: '#0f172a',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-1 flex justify-center gap-4 text-[11px] font-semibold">
              {chartData.map((d) => (
                <span key={d.name} className="flex items-center gap-1.5 text-slate-400">
                  <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                  {d.name} {d.value}
                </span>
              ))}
            </div>
          </section>
        </div>

        <BuildCvCta />

        <p className="text-center text-xs text-slate-600">
          Completions: {completions.length} internships tracked ·{' '}
          <Link to="/portfolio" className="font-semibold text-indigo-400 hover:underline">
            Portfolio
          </Link>
        </p>
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <form onSubmit={saveProfile} className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-black text-white">Edit Profile</h2>
              <button type="button" onClick={() => setIsEditing(false)} className="text-sm font-semibold text-slate-500 hover:text-slate-300">
                Close
              </button>
            </div>
            <label className="block text-sm font-semibold text-slate-300">
              Name
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500"
                required
              />
            </label>
            <label className="mt-4 block text-sm font-semibold text-slate-300">
              Email
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500"
                required
              />
            </label>
            <label className="mt-4 block text-sm font-semibold text-slate-300">
              Bio
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                rows={3}
                className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500"
              />
            </label>
            <button type="submit" className="mt-6 w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-500">
              Save Changes
            </button>
          </form>
        </div>
      )}

      {certOpen && certData && (
        <CourseCertificate open={certOpen} onClose={() => setCertOpen(false)} achievement={certData} />
      )}
    </div>
  );
};

export default ProfileDashboard;

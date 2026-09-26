import { useEffect, useMemo, useState } from 'react';
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
import { BuildCvCta } from '../../components/BuildCvCta';
import { LivingLearningPath } from '../../components/LivingLearningPath';
import { CourseCertificate } from '../../components/CourseCertificate';

const difficultyColors = {
  easy: '#22c55e',
  medium: '#f59e0b',
  hard: '#ef4444',
};

const statsMeta = [
  { key: 'totalProblems', label: 'Total Solved', icon: Target, description: 'All accepted problems.' },
  { key: 'rank', label: 'Rank', icon: Trophy, description: 'Global ranking among all users.' },
  { key: 'xp', label: 'XP', icon: Sparkles, description: 'Experience gained from solved questions.' },
  { key: 'badges', label: 'Badges', icon: Award, description: 'Achievements unlocked by milestones.' },
] as const;

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

  if (!profileData) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] p-8 text-[var(--text-secondary)]">Loading profile...</div>
    );
  }

  const avatarFallback = (profileData.username || profileData.fullName || 'U').charAt(0).toUpperCase();

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

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-4 text-[var(--text-primary)] md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)] backdrop-blur md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4 md:gap-6">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-[var(--border-default)] bg-linear-to-br from-indigo-500 to-violet-600 text-3xl font-black uppercase text-white">
                {profileData.profilePhoto ? (
                  <img src={profileData.profilePhoto} alt={profileData.username} className="h-full w-full object-cover" />
                ) : (
                  avatarFallback
                )}
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">{profileData.fullName}</h1>
                <p className="text-sm font-semibold text-[var(--accent)]">@{profileData.username}</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{profileData.roleBio}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/skill-profile"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--border-default)] bg-[var(--accent-soft)] px-5 py-3 text-sm font-bold text-[var(--accent)] hover:bg-[var(--accent-muted)]"
              >
                <Target className="h-4 w-4" /> Skill Profile
                {skillGapCount > 0 && (
                  <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-300">
                    {skillGapCount} gaps
                  </span>
                )}
              </Link>
              <button
                type="button"
                onClick={openEditor}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--border-default)] bg-[var(--accent-soft)] px-5 py-3 text-sm font-bold text-[var(--accent)] hover:bg-[var(--accent-muted)]"
              >
                <PenLine className="h-4 w-4" /> Edit Profile
              </button>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-5">
            <div className="mb-2 flex items-center justify-between text-sm">
              <div>
                <p className="font-semibold text-[var(--accent)]">
                  Level {profileData.xp.level}: {profileData.xp.levelName}
                </p>
                <p className="text-xs text-[var(--text-muted)]">Gamification: solve problems to gain XP and level up.</p>
              </div>
              <span className="text-xs font-bold text-[var(--text-secondary)]">
                {profileData.xp.total} / {profileData.xp.nextLevelXp} XP
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[var(--bg-input)]">
              <div
                className="h-full rounded-full bg-linear-to-r from-indigo-500 to-purple-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <Link
            to="/skill-profile"
            className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--accent-soft)] px-4 py-3 text-sm transition hover:border-[var(--accent)] hover:bg-[var(--accent-muted)]"
          >
            <span className="font-semibold text-[var(--accent)]">View strengths, skill gaps & recommended next steps</span>
            <ArrowRight className="h-4 w-4 shrink-0 text-[var(--accent)]" />
          </Link>
        </section>

        {/* Skills gained through courses */}
        <section className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--text-primary)]">
              <Sparkles className="h-5 w-5 text-violet-500" /> Skills gained through courses
            </h2>
            <Link to="/ai-course-designer" className="text-xs font-bold text-[var(--accent)] hover:underline">
              AI Course Designer →
            </Link>
          </div>
          {courseSkills.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              Pass a final assessment (60%+) on a designed course to show skills here.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {courseSkills.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-3 py-1.5 text-xs font-bold text-violet-800 dark:text-violet-200"
                >
                  <Award className="h-3.5 w-3.5" /> {s}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Course certificates with download */}
        <section className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--text-primary)]">
              <Award className="h-5 w-5 text-indigo-500" /> Course certificates
            </h2>
            <span className="text-xs text-[var(--text-muted)]">{achievements.length} earned</span>
          </div>
          {achievements.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              Complete ~95% of a course, pass the AI final quiz, then download certificates here.
            </p>
          ) : (
            <ul className="space-y-3">
              {achievements.map((a) => (
                <li
                  key={a.courseId}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-[var(--text-primary)]">{a.courseTitle}</div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      {a.level} · {a.durationLabel} · Score {a.percent}% · {a.completedAt}
                    </div>
                    {a.skills.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {a.skills.slice(0, 5).map((s) => (
                          <span
                            key={s}
                            className="rounded-full bg-[var(--bg-card)] px-2 py-0.5 text-[10px] font-bold text-[var(--text-secondary)]"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => openCert(a)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-500"
                  >
                    <Download className="h-3.5 w-3.5" /> Download certificate
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <BuildCvCta />

        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 dark:bg-black/70" role="dialog" aria-modal="true">
            <form onSubmit={saveProfile} className="w-full max-w-md rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-elevated)]">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-black text-[var(--text-primary)]">Edit Profile</h2>
                <button type="button" onClick={() => setIsEditing(false)} className="text-sm font-semibold text-[var(--text-muted)]">
                  Close
                </button>
              </div>
              <label className="block text-sm font-semibold text-[var(--text-secondary)]">
                Name
                <input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] px-4 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]" required />
              </label>
              <label className="mt-4 block text-sm font-semibold text-[var(--text-secondary)]">
                Email
                <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] px-4 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]" required />
              </label>
              <label className="mt-4 block text-sm font-semibold text-[var(--text-secondary)]">
                Bio
                <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} rows={3} className="mt-2 w-full resize-none rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] px-4 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]" />
              </label>
              <button type="submit" className="mt-6 w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-500">
                Save Changes
              </button>
            </form>
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statsMeta.map((item) => {
            const Icon = item.icon;
            const valueMap: Record<string, string> = {
              totalProblems: String(profileData.solved?.total ?? 0),
              rank: `#${(profileData.rank?.global ?? 0).toLocaleString()}`,
              xp: (profileData.xp?.total ?? 0).toLocaleString(),
              badges: String((profileData.badges || []).length),
            };
            return (
              <article key={item.key} className="group rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:border-[var(--accent)]">
                <div className="mb-4 flex items-center justify-between">
                  <div className="rounded-2xl bg-[var(--accent-soft)] p-2.5 text-[var(--accent)]">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{item.label}</p>
                <p className="mt-2 text-3xl font-black text-[var(--text-primary)]">{valueMap[item.key]}</p>
              </article>
            );
          })}
        </section>

        <LivingLearningPath />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <section className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)] xl:col-span-1">
            <h2 className="mb-4 text-lg font-bold text-[var(--text-primary)]">Progress Breakdown</h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={5}>
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: number | undefined, name: string | undefined) => [`${value ?? 0} solved`, name ?? '']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)] xl:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Badges Earned</h2>
              <span className="text-xs text-[var(--text-muted)]">{(profileData.badges || []).length} total</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(profileData.badges || []).map((badge) => (
                <article key={badge.id} className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4">
                  <p className="text-2xl">{badge.icon}</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{badge.title}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">Earned: {badge.earnedAt}</p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <section className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
          <div className="mb-4 flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Streak</h2>
            <span className="text-sm text-[var(--text-secondary)]">
              {profileData.streak?.current ?? 0} day current · best {profileData.streak?.max ?? 0}
            </span>
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
          <h2 className="mb-1 text-lg font-bold text-[var(--text-primary)]">Internship completions</h2>
          <p className="mb-4 text-xs text-[var(--text-secondary)]">Certificate / completion log from finished internships.</p>
          {completions.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No completed internships yet. Finish a pipeline to see records here.</p>
          ) : (
            <ul className="space-y-3">
              {completions.map((c) => (
                <li key={c.internshipId} className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-[var(--text-primary)]">{c.role}</div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        {c.company}
                        {c.completedAt ? ` · ${new Date(c.completedAt).toLocaleDateString()}` : ''}
                      </div>
                    </div>
                    <span className="rounded-full bg-teal-100 px-2.5 py-1 text-[10px] font-black uppercase text-teal-800 dark:bg-teal-500/20 dark:text-teal-200">
                      Certificate logged
                    </span>
                  </div>
                  {c.mentorFeedback && (
                    <p className="mt-2 text-xs text-[var(--text-secondary)]">
                      Mentor {c.mentorFeedback.mentorName}: {'★'.repeat(c.mentorFeedback.rating)} — {c.mentorFeedback.comment}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {certData && (
        <CourseCertificate
          open={certOpen}
          onClose={() => {
            setCertOpen(false);
            setCertData(null);
          }}
          data={{
            studentName: profileData.fullName,
            courseName: certData.courseTitle,
            skills: certData.skills,
            level: certData.level,
            durationLabel: certData.durationLabel,
            completionDate: certData.completedAt,
            certId: certData.certId,
          }}
        />
      )}
    </div>
  );
};

export default ProfileDashboard;

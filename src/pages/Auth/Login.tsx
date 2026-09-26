import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Lock,
  Mail,
  ArrowRight,
  GraduationCap,
  Building2,
  BookOpen,
  UserCog,
  Briefcase,
  Eye,
  EyeOff,
  ChevronDown,
} from 'lucide-react';

import { saveAuthSession, type UserRole } from '../../utils/rbacAuth';
import { setAdminSession } from '../../utils/adminSession';
import { handleSocialAuth } from '../../utils/socialAuth';
import { INDUSTRY_DEMO_CREDENTIALS } from '../../utils/industryStore';
import { FACULTY_DEMO_CREDENTIALS } from '../../utils/facultyStore';
import { COLLEGE_DEMO_CREDENTIALS } from '../../utils/placementDashboard';
import { ThemeToggle } from '../../components/ThemeToggle';
import { useTheme } from '../../contexts/ThemeContext';

const LOCAL_STAFF = {
  email: 'admin@gmail.com',
  password: 'timepass',
  user: {
    id: 'local-admin-1',
    name: 'EduRoute Admin',
    email: 'admin@gmail.com',
    role: 'admin' as const,
    verificationStatus: 'verified',
  },
};

const ROLE_OPTIONS: { id: UserRole; label: string; icon: typeof GraduationCap }[] = [
  { id: 'student', label: 'Student', icon: GraduationCap },
  { id: 'faculty', label: 'Faculty', icon: BookOpen },
  { id: 'industry', label: 'Industry', icon: Briefcase },
  { id: 'college', label: 'College', icon: Building2 },
  { id: 'admin', label: 'Staff', icon: UserCog },
];

export const Login = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [role, setRole] = useState<UserRole>('student');
  const [error, setError] = useState('');
  const [socialMsg, setSocialMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [usedDemoMode, setUsedDemoMode] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const roleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) setRoleOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const goHome = (userRole: UserRole) => {
    if (userRole === 'admin') navigate('/admin/pending-approvals', { replace: true });
    else if (userRole === 'industry') navigate('/industry', { replace: true });
    else if (userRole === 'college') navigate('/college/placements', { replace: true });
    else if (userRole === 'faculty') navigate('/faculty', { replace: true });
    else navigate('/dashboard', { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    setUsedDemoMode(true);
    try {
      // Open demo mode: no password / API checks until Railway MySQL is connected.
      // Pick a role and continue — email is optional (defaults applied).
      const emailRaw = formData.email.trim();
      const email =
        emailRaw ||
        (role === 'admin'
          ? LOCAL_STAFF.email
          : role === 'industry'
            ? INDUSTRY_DEMO_CREDENTIALS.email
            : role === 'faculty'
              ? FACULTY_DEMO_CREDENTIALS.email
              : role === 'college'
                ? COLLEGE_DEMO_CREDENTIALS.email
                : 'student@demo.eduroute.app');
      const nameFromEmail = email.split('@')[0]?.replace(/[._]/g, ' ') || 'Demo User';
      const displayName =
        role === 'admin'
          ? 'EduRoute Admin'
          : role === 'industry'
            ? 'Industry Partner'
            : role === 'faculty'
              ? 'Faculty Member'
              : role === 'college'
                ? 'College Admin'
                : nameFromEmail
                    .split(' ')
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' ') || 'Student Demo';

      if (role === 'admin') {
        saveAuthSession(`open-admin-${Date.now()}`, {
          id: 'open-admin-1',
          name: displayName,
          email,
          role: 'admin',
          verificationStatus: 'verified',
        });
        setAdminSession(true);
        goHome('admin');
        return;
      }

      if (role === 'industry') {
        saveAuthSession(`open-industry-${Date.now()}`, {
          id: 'open-industry-1',
          name: displayName,
          email,
          role: 'industry',
          verificationStatus: 'verified',
        });
        goHome('industry');
        return;
      }

      if (role === 'faculty') {
        saveAuthSession(`open-faculty-${Date.now()}`, {
          id: 'open-faculty-1',
          name: displayName,
          email,
          role: 'faculty',
          verificationStatus: 'verified',
        });
        goHome('faculty');
        return;
      }

      if (role === 'college') {
        saveAuthSession(`open-college-${Date.now()}`, {
          id: 'open-college-1',
          name: displayName,
          email,
          role: 'college',
          verificationStatus: 'verified',
          institutionName: 'Modi Institute of Technology',
        });
        goHome('college');
        return;
      }

      // student (default)
      saveAuthSession(`open-student-${Date.now()}`, {
        id: `open-student-${Date.now()}`,
        name: displayName,
        email,
        role: 'student',
        verificationStatus: 'verified',
      });
      goHome('student');
    } finally {
      setIsLoading(false);
    }
  };

  const fieldCls = isDark
    ? 'border-white/10 bg-slate-800/80 text-white'
    : 'border-slate-200 bg-white text-slate-900';
  const cardCls = isDark
    ? 'border-white/15 bg-slate-900/70 shadow-black/40'
    : 'border-slate-200 bg-white/95 shadow-slate-300/40';
  const muted = isDark ? 'text-slate-400' : 'text-slate-500';
  const selected = ROLE_OPTIONS.find((r) => r.id === role) || ROLE_OPTIONS[0];

  return (
    <div className={`relative min-h-screen overflow-hidden ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'}`}>
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=2000&q=80')" }}
      />
      <div className={`absolute inset-0 ${isDark ? 'bg-gradient-to-br from-indigo-950/90 via-slate-950/85 to-violet-950/80' : 'bg-gradient-to-br from-violet-100/92 via-white/90 to-indigo-100/85'}`} />

      <div className="relative z-20 flex items-center justify-between px-6 py-5 md:px-10">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-black text-white shadow-lg shadow-violet-500/30">E</div>
          <span className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>EDUROUTE</span>
        </Link>
        <ThemeToggle className={isDark ? '!border-white/20' : '!border-slate-300'} />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-88px)] max-w-6xl flex-col items-center gap-10 px-4 pb-12 pt-4 lg:flex-row lg:items-center lg:justify-between lg:gap-16 lg:px-10">
        <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} className="hidden max-w-lg flex-1 lg:block">
          <p className={`mb-3 text-xs font-semibold uppercase tracking-[0.2em] ${isDark ? 'text-violet-300/90' : 'text-violet-600'}`}>Your education · Your path · Your future</p>
          <h1 className={`text-4xl font-black leading-tight md:text-5xl ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Welcome to <span className="bg-gradient-to-r from-violet-500 to-indigo-500 bg-clip-text text-transparent">EduRoute</span>
          </h1>
          <p className={`mt-4 text-base leading-relaxed ${muted}`}>
            Sign in to continue skill mapping, internships, roadmaps, and placement preparation — all in one place.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3">
            {[
              { t: 'Skill mapping', d: 'Know your gaps' },
              { t: 'Internships', d: 'Match & apply' },
              { t: 'Roadmaps', d: 'Learn with path' },
              { t: 'Placement', d: 'Track outcomes' },
            ].map((item) => (
              <div key={item.t} className={`rounded-2xl border p-4 backdrop-blur-sm ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-200/80 bg-white/70 shadow-sm'}`}>
                <p className="text-sm font-bold">{item.t}</p>
                <p className={`mt-0.5 text-xs ${muted}`}>{item.d}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className={`rounded-3xl border p-6 shadow-2xl backdrop-blur-md sm:p-8 ${cardCls}`}>
            <div className="mb-6 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-black text-white">E</div>
              <div>
                <div className="text-base font-bold">Sign in</div>
                <div className={`text-xs ${muted}`}>Open demo — pick a role (no password needed)</div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div ref={roleRef} className="relative">
                <label className={`mb-1.5 block text-xs font-semibold ${muted}`}>I am a</label>
                <button
                  type="button"
                  onClick={() => setRoleOpen((v) => !v)}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-left text-sm ${fieldCls}`}
                >
                  <span className="flex items-center gap-2">
                    <selected.icon className="h-4 w-4 text-violet-500" />
                    <span className="font-semibold">{selected.label}</span>
                  </span>
                  <ChevronDown className={`h-4 w-4 transition ${roleOpen ? 'rotate-180' : ''} ${muted}`} />
                </button>
                {roleOpen && (
                  <div className={`absolute z-30 mt-1 w-full overflow-hidden rounded-xl border shadow-xl ${isDark ? 'border-white/10 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                    {ROLE_OPTIONS.map((opt) => {
                      const active = role === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setRole(opt.id);
                            setRoleOpen(false);
                            setError('');
                            if (opt.id === 'industry') {
                              setFormData({
                                email: INDUSTRY_DEMO_CREDENTIALS.email,
                                password: INDUSTRY_DEMO_CREDENTIALS.password,
                              });
                            } else if (opt.id === 'faculty') {
                              setFormData({
                                email: FACULTY_DEMO_CREDENTIALS.email,
                                password: FACULTY_DEMO_CREDENTIALS.password,
                              });
                            } else if (opt.id === 'college') {
                              setFormData({
                                email: COLLEGE_DEMO_CREDENTIALS.email,
                                password: COLLEGE_DEMO_CREDENTIALS.password,
                              });
                            } else if (opt.id === 'admin') {
                              setFormData({
                                email: LOCAL_STAFF.email,
                                password: LOCAL_STAFF.password,
                              });
                            } else {
                              setFormData({ email: '', password: '' });
                            }
                          }}
                          className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm transition ${active ? (isDark ? 'bg-violet-600/30 text-violet-200' : 'bg-violet-100 text-violet-800') : (isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-700 hover:bg-slate-50')}`}
                        >
                          <opt.icon className="h-4 w-4" />
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className={`mb-1.5 block text-xs font-semibold ${muted}`}>Email (optional)</label>
                <div className="relative">
                  <Mail className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${muted}`} />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                    placeholder="you@college.edu"
                    className={`w-full rounded-xl border py-2.5 pl-10 pr-3.5 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 ${fieldCls}`}
                  />
                </div>
              </div>

              <div>
                <label className={`mb-1.5 block text-xs font-semibold ${muted}`}>Password (optional)</label>
                <div className="relative">
                  <Lock className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${muted}`} />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                    placeholder="Not required in open demo"
                    className={`w-full rounded-xl border py-2.5 pl-10 pr-10 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 ${fieldCls}`}
                  />
                  <button type="button" onClick={() => setShowPass((v) => !v)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${muted}`} aria-label="Toggle password">
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}
              {usedDemoMode && (
                <p className="text-xs text-amber-500">
                  Open demo mode — credentials not checked until Railway is connected.
                </p>
              )}
              <p className={`text-[11px] ${muted}`}>
                Tip: select Student / Faculty / Industry / College / Staff and click Sign in.
              </p>

              <button type="submit" disabled={isLoading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-600/30 transition hover:from-violet-500 hover:to-indigo-400 disabled:opacity-60">
                {isLoading ? 'Signing in…' : 'Sign in'}
                {!isLoading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className={`h-px flex-1 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
              <span className={`text-xs ${muted}`}>OR</span>
              <div className={`h-px flex-1 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
            </div>

            <div className="flex items-center justify-center gap-3">
              <button type="button" onClick={() => navigate('/signup')} className={`flex h-11 w-11 items-center justify-center rounded-xl border text-sm font-bold ${isDark ? 'border-white/10 bg-slate-800/80 text-white' : 'border-slate-200 bg-white text-slate-800'}`}>G</button>
              <button type="button" onClick={() => handleSocialAuth('github', 'login', (msg) => setSocialMsg(msg))} className={`flex h-11 w-11 items-center justify-center rounded-xl border ${isDark ? 'border-white/10 bg-slate-800/80' : 'border-slate-200 bg-white'}`} title="Sign in with GitHub" aria-label="Sign in with GitHub">
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.26.82-.577 0-.285-.01-1.04-.016-2.04-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.757-1.333-1.757-1.09-.745.083-.73.083-.73 1.205.085 1.84 1.238 1.84 1.238 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.305.76-1.605-2.665-.303-5.467-1.333-5.467-5.93 0-1.31.468-2.382 1.236-3.222-.124-.303-.536-1.523.117-3.176 0 0 1.008-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.29-1.232 3.297 1.23 3.297 1.23.653 1.653.242 2.873.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.61-2.807 5.625-5.48 5.922.43.372.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .319.216.694.825.576C20.565 21.796 24 17.3 24 12c0-6.63-5.37-12-12-12z"/></svg>
              </button>
            </div>
            {socialMsg && <p className={`mt-3 text-center text-xs ${muted}`}>{socialMsg}</p>}

            <p className={`mt-6 text-center text-sm ${muted}`}>
              New here?{' '}
              <Link to="/signup" className="font-semibold text-violet-500 hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;

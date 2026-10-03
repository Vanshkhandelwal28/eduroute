import { Outlet, Link, useLocation } from 'react-router-dom';
import { getAuthUser, clearAuthSession } from '../utils/rbacAuth';
import { getStoredUserProfile } from '../utils/userProfile';
import {
  LayoutDashboard,
  Map,
  ClipboardCheck,
  MessageSquare,
  Trophy,
  Gift,
  Users,
  Briefcase,
  Award,
  TrendingUp,
  LogOut,
  Menu,
  X,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  FolderOpen,
  FileText,
  Bell,
  BarChart3,
  BookOpen,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ThemeToggle } from '../components/ThemeToggle';
import { FloatingBuddyWidget } from '../components/FloatingBuddyWidget';
import { syncAiCoursesFromServer } from '../utils/aiCourseStore';
import { GlobalSearch } from '../components/GlobalSearch';
import { EduRouteLogo } from '../components/EduRouteLogo';

type NavItem = { name: string; path: string; icon: LucideIcon };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Learn',
    items: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { name: 'My Courses', path: '/courses', icon: FolderOpen },
      { name: 'Browse', path: '/browse', icon: BookOpen },
      { name: 'Paths', path: '/paths', icon: Map },
      { name: 'Roadmaps', path: '/roadmaps', icon: Map },
      { name: 'Assessments', path: '/assessments', icon: ClipboardCheck },
      { name: 'AI Course Designer', path: '/ai-course-designer', icon: SparklesIcon },
    ],
  },
  {
    label: 'Career',
    items: [
      { name: 'Internships', path: '/internships', icon: Briefcase },
      { name: 'Certifications', path: '/certifications', icon: Award },
      { name: 'CV Builder', path: '/cv-builder', icon: FileText },
    ],
  },
  {
    label: 'Growth',
    items: [
      { name: 'Buddy AI', path: '/buddy', icon: MessageSquare },
      { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
      { name: 'Rewards', path: '/rewards', icon: Gift },
      { name: 'Community', path: '/community', icon: Users },
      { name: 'Events', path: '/events', icon: Bell },
      { name: 'Soft Skills', path: '/soft-skills', icon: TrendingUp },
    ],
  },
];

function SparklesIcon(props: any) {
  return <BarChart3 {...props} />;
}

export const MainLayout = () => {
  const location = useLocation();
  const user = getAuthUser();
  const profile = getStoredUserProfile();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    void syncAiCoursesFromServer().catch(() => undefined);
  }, []);

  const displayName = user?.name || profile?.name || 'Student';

  const onLogout = () => {
    clearAuthSession();
    window.location.href = '/login';
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <aside
        className={`hidden border-r border-white/10 bg-[var(--bg-secondary)] md:flex md:flex-col ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-3">
          {!collapsed && (
            <Link to="/dashboard" className="flex items-center gap-2 font-bold">
              <EduRouteLogo className="h-7 w-7" />
              <span>EduRoute</span>
            </Link>
          )}
          <button type="button" onClick={() => setCollapsed((v) => !v)} className="rounded p-1 hover:bg-white/10">
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          {NAV_GROUPS.map((g) => (
            <div key={g.label} className="mb-3">
              {!collapsed && (
                <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">{g.label}</div>
              )}
              {g.items.map((item) => {
                const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`mb-0.5 flex items-center gap-2 rounded-lg px-2 py-2 text-sm ${
                      active ? 'bg-violet-600/20 text-violet-300' : 'hover:bg-white/5'
                    }`}
                    title={item.name}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 p-2">
          <Link to="/profile" className="mb-1 flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-white/5">
            <Users className="h-4 w-4" />
            {!collapsed && <span className="truncate">{displayName}</span>}
          </Link>
          <button type="button" onClick={onLogout} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-white/5">
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Log out</span>}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-white/10 px-3 py-2 md:px-4">
          <button type="button" className="rounded p-2 hover:bg-white/10 md:hidden" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <GlobalSearch />
          </div>
          <ThemeToggle />
        </header>
        <main className="min-h-0 flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button type="button" className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} aria-label="Close menu" />
          <div className="absolute left-0 top-0 flex h-full w-72 flex-col bg-[var(--bg-secondary)] shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-3">
              <span className="font-bold">EduRoute</span>
              <button type="button" onClick={() => setOpen(false)} className="rounded p-1 hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-2">
              {NAV_GROUPS.flatMap((g) => g.items).map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setOpen(false)}
                    className="mb-0.5 flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-white/5"
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      <FloatingBuddyWidget />
    </div>
  );
};

export default MainLayout;

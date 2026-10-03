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
import { syncAllFeatureData } from '../utils/featureDataSync';
import { GlobalSearch } from '../components/GlobalSearch';
import { EduRouteLogo } from '../components/EduRouteLogo';

type NavItem = { name: string; path: string; icon: LucideIcon };
type NavGroup = { label: string; items: NavItem[] };

const SIDEBAR_KEY = 'eduroute:sidebar-collapsed';

type Notif = { id: string; title: string; body: string; unread: boolean };
const SAMPLE_NOTIFICATIONS: Notif[] = [
  { id: '1', title: 'Welcome', body: 'Explore AI Course Designer and Buddy AI.', unread: true },
  { id: '2', title: 'Tip', body: 'Your progress syncs across browsers when logged in.', unread: true },
];

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
      { name: 'AI Course Designer', path: '/ai-course-designer', icon: BarChart3 },
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

export const MainLayout = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState(SAMPLE_NOTIFICATIONS);
  const notifRef = useRef<HTMLDivElement>(null);

  const user = getAuthUser();
  const profile = getStoredUserProfile();
  const displayName = user?.name || profile?.name || 'Student';
  const unreadCount = notifications.filter((n) => n.unread).length;

  useEffect(() => {
    void syncAllFeatureData().catch(() => undefined);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SIDEBAR_KEY);
      if (raw === '1') setCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setNotifOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!notifOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [notifOpen]);

  const onLogout = () => {
    clearAuthSession();
    window.location.href = '/login';
  };

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
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
          <button type="button" onClick={toggleCollapsed} className="rounded p-1 hover:bg-white/10">
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
          <button type="button" className="rounded p-2 hover:bg-white/10 md:hidden" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <GlobalSearch />
          </div>
          <div className="relative" ref={notifRef}>
            <button type="button" className="relative rounded p-2 hover:bg-white/10" onClick={() => setNotifOpen((v) => !v)}>
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500" />
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 z-40 mt-2 w-72 rounded-xl border border-white/10 bg-[var(--bg-secondary)] p-2 shadow-xl">
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className="mb-1 w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-white/5"
                    onClick={() =>
                      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, unread: false } : x)))
                    }
                  >
                    <div className="font-semibold">{n.title}</div>
                    <div className="text-xs opacity-70">{n.body}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <ThemeToggle />
        </header>
        <main className="min-h-0 flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button type="button" className="absolute inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} aria-label="Close menu" />
          <div className="absolute left-0 top-0 flex h-full w-72 flex-col bg-[var(--bg-secondary)] shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-3">
              <span className="font-bold">EduRoute</span>
              <button type="button" onClick={() => setIsMobileMenuOpen(false)} className="rounded p-1 hover:bg-white/10">
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
                    onClick={() => setIsMobileMenuOpen(false)}
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

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
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ThemeToggle } from '../components/ThemeToggle';
import { FloatingBuddyWidget } from '../components/FloatingBuddyWidget';
import { GlobalSearch } from '../components/GlobalSearch';
import { EduRouteLogo } from '../components/EduRouteLogo';

type NavItem = { name: string; path: string; icon: LucideIcon };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Learn',
    items: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { name: 'Roadmaps', path: '/roadmaps', icon: Map },
      { name: 'Assessments', path: '/assessments', icon: ClipboardCheck },
      { name: 'AI Buddy', path: '/buddy', icon: MessageSquare },
    ],
  },
  {
    label: 'Career',
    items: [
      { name: 'Internships', path: '/internships', icon: Briefcase },
      { name: 'Certifications', path: '/certifications', icon: Award },
      { name: 'CV Builder', path: '/cv-builder', icon: FileText },
      { name: 'Portfolio', path: '/portfolio', icon: FolderOpen },
      { name: 'Events', path: '/events', icon: TrendingUp },
      { name: 'Demand Intel', path: '/demand-intelligence', icon: BarChart3 },
    ],
  },
  {
    label: 'Community',
    items: [
      { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
      { name: 'Rewards', path: '/rewards', icon: Gift },
      { name: 'Community', path: '/community', icon: Users },
    ],
  },
];

const FLAT_NAV = NAV_GROUPS.flatMap((g) => g.items);

export default function MainLayout() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const authUser = getAuthUser();
  const profile = getStoredUserProfile();
  const profileIdentity = useMemo(() => {
    const name = profile?.fullName || authUser?.name || 'Student';
    const initial = (name.trim()[0] || 'S').toUpperCase();
    return { name, initial, photo: profile?.photoUrl };
  }, [profile, authUser]);

  const handleLogout = () => {
    clearAuthSession();
    window.location.href = '/login';
  };

  const toggleCollapsed = () => setCollapsed((c) => !c);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const renderNavLink = (item: NavItem, onClick?: () => void) => {
    const active = isActive(item.path);
    const Icon = item.icon;
    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={onClick}
        className={`er-nav-item ${active ? 'active' : ''} ${collapsed ? '!justify-center !px-0' : ''}`}
        title={item.name}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
        {!collapsed && <span className="truncate">{item.name}</span>}
      </Link>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <aside
        className={`er-sidebar !hidden lg:!flex shrink-0 transition-[width] duration-300 ease-out ${
          collapsed ? 'w-[72px]' : 'w-[var(--sidebar-width)]'
        }`}
      >
        <div className={`flex h-16 items-center gap-2 border-b border-[var(--border-default)] ${collapsed ? 'justify-center px-2' : 'px-4'}`}>
          <Link to="/dashboard" className="flex items-center gap-2 min-w-0">
            <EduRouteLogo className="h-8 w-8 shrink-0" />
            {!collapsed && <span className="truncate text-sm font-black tracking-tight">EDUROUTE</span>}
          </Link>
        </div>
        <div className={`flex items-center border-b border-[var(--border-default)] ${collapsed ? 'justify-center p-2' : 'justify-end px-3 py-2'}`}>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="rounded-xl p-2 text-[var(--text-muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>
        <nav className={`flex-1 overflow-y-auto py-2 ${collapsed ? 'px-2 space-y-0.5' : 'px-3 space-y-3'}`}>
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">{group.items.map((item) => renderNavLink(item))}</div>
            </div>
          ))}
        </nav>
        <div className={`border-t border-[var(--border-default)] p-3 space-y-1 ${collapsed ? 'px-2' : ''}`}>
          <Link
            to="/profile"
            className={`er-nav-item ${collapsed ? '!justify-center !px-0' : ''}`}
            title={profileIdentity.name}
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--accent)] text-xs font-bold text-white">
              {profileIdentity.photo ? (
                <img src={profileIdentity.photo} alt="" className="h-full w-full object-cover" />
              ) : (
                profileIdentity.initial
              )}
            </div>
            {!collapsed && <span className="truncate text-sm font-semibold">{profileIdentity.name}</span>}
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className={`er-nav-item w-full text-left hover:!bg-red-500/10 hover:!text-red-500 ${collapsed ? '!justify-center !px-0' : ''}`}
          >
            <LogOut className="h-[18px] w-[18px]" />
            {!collapsed && <span>Logout</span>}
          </button>
          {collapsed && (
            <button type="button" onClick={toggleCollapsed} className="er-nav-item !justify-center !px-0 w-full" title="Expand sidebar" aria-label="Expand sidebar">
              <PanelLeftOpen className="h-[18px] w-[18px]" />
            </button>
          )}
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden transition-all duration-300">
        <header className="er-header">
          <button
            type="button"
            className="lg:hidden shrink-0 p-2 -ml-1 rounded-xl hover:bg-[var(--accent-soft)]"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <GlobalSearch />
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <ThemeToggle />
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotifOpen((o) => !o)}
                className="relative rounded-xl p-2 text-[var(--text-muted)] hover:bg-[var(--accent-soft)]"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(100vw-1.5rem,22rem)] overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-[var(--shadow-elevated)]">
                  <div className="border-b border-[var(--border-default)] px-4 py-3">
                    <p className="text-sm font-bold">Notifications</p>
                  </div>
                  <ul className="max-h-[min(60vh,20rem)] overflow-y-auto">
                    <li className="px-4 py-3 text-sm text-[var(--text-secondary)]">You're all caught up.</li>
                  </ul>
                </div>
              )}
            </div>
            <Link to="/profile" className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-[var(--accent-soft)]">
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[var(--accent)] text-xs font-bold text-white">
                {profileIdentity.photo ? (
                  <img src={profileIdentity.photo} alt="" className="h-full w-full object-cover" />
                ) : (
                  profileIdentity.initial
                )}
              </div>
              <span className="hidden sm:inline text-sm font-semibold">{profileIdentity.name}</span>
              <ChevronDown className="h-3.5 w-3.5 text-[var(--text-muted)] hidden sm:block" />
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))] lg:pb-0">
          <Outlet />
        </main>
      </div>

      {isMobileMenuOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} aria-hidden />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-[min(280px,85vw)] flex-col bg-[var(--bg-sidebar)] shadow-2xl er-safe-pt lg:hidden">
            <div className="flex h-14 items-center justify-between border-b border-[var(--border-default)] px-4">
              <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2">
                <EduRouteLogo className="h-8 w-8" />
                <span className="text-sm font-black">EDUROUTE</span>
              </Link>
              <button type="button" onClick={() => setIsMobileMenuOpen(false)} className="rounded-xl p-2" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 space-y-3">
              {NAV_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{group.label}</p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`er-nav-item ${isActive(item.path) ? 'active' : ''}`}
                      >
                        <item.icon className="h-[18px] w-[18px]" />
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
            <div className="border-t border-[var(--border-default)] p-3 space-y-1 er-safe-pb">
              <Link to="/profile" onClick={() => setIsMobileMenuOpen(false)} className="er-nav-item">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white">
                  {profileIdentity.initial}
                </div>
                <span className="truncate">{profileIdentity.name}</span>
              </Link>
              <button type="button" onClick={handleLogout} className="er-nav-item w-full text-left hover:!text-red-500">
                <LogOut className="h-[18px] w-[18px]" />
                Logout
              </button>
            </div>
          </aside>
        </>
      )}

      <nav className="er-bottom-nav lg:!hidden" aria-label="Primary">
        <Link to="/dashboard" className={isActive('/dashboard') ? 'active' : ''}>
          <LayoutDashboard />
          Home
        </Link>
        <Link to="/profile" className={isActive('/profile') ? 'active' : ''}>
          <Map />
          Path
        </Link>
        <Link to="/events" className={isActive('/events') ? 'active' : ''}>
          <TrendingUp />
          Events
        </Link>
        <Link to="/buddy" className={isActive('/buddy') ? 'active' : ''}>
          <MessageSquare />
          Buddy
        </Link>
      </nav>

      <FloatingBuddyWidget />
    </div>
  );
}

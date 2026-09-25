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
  Sparkles,
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
      { name: 'AI Course', path: '/ai-course-designer', icon: Sparkles },
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
    label: 'Compete',
    items: [
      { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
      { name: 'Rewards', path: '/rewards', icon: Gift },
      { name: 'Community', path: '/community', icon: Users },
    ],
  },
];

const FLAT_NAV = NAV_GROUPS.flatMap((g) => g.items);

const SIDEBAR_KEY = 'eduroute-sidebar-collapsed';

const SAMPLE_NOTIFICATIONS = [
  {
    id: '1',
    title: 'Complete your skill quiz',
    body: 'Unlock match scores and a personal learning path.',
    time: 'Just now',
    to: '/onboarding',
    unread: true,
  },
  {
    id: '2',
    title: 'New internship matches',
    body: 'Roles aligned with your track are open on the board.',
    time: '2h ago',
    to: '/internships',
    unread: true,
  },
  {
    id: '3',
    title: 'Hall of Fame updated',
    body: 'Check the leaderboard and climb the ranks.',
    time: 'Yesterday',
    to: '/leaderboard',
    unread: false,
  },
];

export const MainLayout = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState(SAMPLE_NOTIFICATIONS);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => n.unread).length;

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
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNotifOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [notifOpen]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0');
        window.dispatchEvent(
          new CustomEvent('eduroute:sidebar-collapsed', { detail: { collapsed: next } }),
        );
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const handleLogout = () => {
    clearAuthSession();
    setIsMobileMenuOpen(false);
    window.location.href = '/login';
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const profileIdentity = useMemo(() => {
    const authUser = getAuthUser();
    const storedProfile = getStoredUserProfile();
    const name = authUser?.name || storedProfile?.name || 'Learner';
    const photo = storedProfile?.avatar || authUser?.avatar || '';
    return {
      name,
      photo,
      initial: name.trim().charAt(0).toUpperCase() || 'L',
      role: 'Learner',
    };
  }, []);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const renderNavLink = (item: NavItem, onClick?: () => void) => {
    const active = isActive(item.path);
    return (
      <Link
        key={item.path}
        to={item.path}
        title={item.name}
        onClick={onClick}
        className={`er-nav-item ${active ? 'active' : ''} ${collapsed ? '!justify-center !px-0' : ''}`}
      >
        <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2.25 : 1.75} />
        {!collapsed && item.name}
      </Link>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <aside
        className={`er-sidebar !hidden lg:!flex shrink-0 transition-[width] duration-300 ease-out ${
          collapsed ? '!w-[72px]' : ''
        }`}
        style={collapsed ? { width: 72 } : undefined}
      >
        <div className={`flex items-center px-3 py-5 ${collapsed ? 'justify-center' : 'gap-2 px-5'}`}>
          <button
            type="button"
            onClick={toggleCollapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex items-center gap-2.5 rounded-xl hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          >
            <EduRouteLogo size={36} className="shadow-md" />
            {!collapsed && (
              <span className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
                EDU<span className="text-[var(--accent)]">ROUTE</span>
              </span>
            )}
          </button>
          {!collapsed && (
            <button
              type="button"
              onClick={toggleCollapsed}
              className="ml-auto p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>

        <nav className={`flex-1 overflow-y-auto py-2 ${collapsed ? 'px-2 space-y-0.5' : 'px-3 space-y-3'}`}>
          {collapsed
            ? FLAT_NAV.map((item) => renderNavLink(item))
            : NAV_GROUPS.map((group) => (
                <div key={group.label}>
                  <div className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                    {group.label}
                  </div>
                  <div className="space-y-0.5">{group.items.map((item) => renderNavLink(item))}</div>
                </div>
              ))}
        </nav>

        <div className={`mt-auto border-t border-[var(--border-default)] space-y-1 ${collapsed ? 'p-2' : 'p-3'}`}>
          <Link
            to="/profile"
            title={profileIdentity.name}
            className={`flex items-center rounded-2xl hover:bg-[var(--accent-soft)] transition-colors ${
              collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2.5'
            }`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--accent)] text-sm font-bold text-white">
              {profileIdentity.photo ? (
                <img src={profileIdentity.photo} alt="" className="h-full w-full object-cover" />
              ) : (
                profileIdentity.initial
              )}
            </div>
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-[var(--text-primary)]">{profileIdentity.name}</div>
                  <div className="text-xs text-[var(--text-muted)]">{profileIdentity.role}</div>
                </div>
                <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
              </>
            )}
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            title="Logout"
            className={`er-nav-item w-full text-left hover:!bg-red-500/10 hover:!text-red-500 ${collapsed ? '!justify-center !px-0' : ''}`}
          >
            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
            {!collapsed && 'Logout'}
          </button>

          {collapsed && (
            <button type="button" onClick={toggleCollapsed} className="er-nav-item !justify-center !px-0 w-full" title="Expand sidebar" aria-label="Expand sidebar">
              <PanelLeftOpen className="h-[18px] w-[18px]" />
            </button>
          )}
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden transition-all duration-300">
        <header className="er-header shrink-0">
          <button
            type="button"
            className="lg:hidden shrink-0 p-2 -ml-1 rounded-xl hover:bg-[var(--accent-soft)]"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <GlobalSearch variant="header" />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotifOpen((v) => !v)}
                className="relative flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
                aria-label="Notifications"
                aria-expanded={notifOpen}
                aria-haspopup="true"
              >
                <Bell className="h-[18px] w-[18px]" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-2 min-w-[8px] items-center justify-center rounded-full bg-red-500 ring-2 ring-[var(--bg-sidebar)]" />
                )}
              </button>

              {notifOpen && (
                <div
                  className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(100vw-1.5rem,22rem)] overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-[var(--shadow-elevated)]"
                  role="menu"
                >
                  <div className="flex items-center justify-between border-b border-[var(--border-default)] px-4 py-3">
                    <div>
                      <p className="text-sm font-bold text-[var(--text-primary)]">Notifications</p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                      </p>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllRead}
                        className="text-xs font-semibold text-[var(--accent)] hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <ul className="max-h-[min(60vh,20rem)] overflow-y-auto">
                    {notifications.map((n) => (
                      <li key={n.id}>
                        <Link
                          to={n.to}
                          onClick={() => {
                            setNotifications((prev) =>
                              prev.map((x) => (x.id === n.id ? { ...x, unread: false } : x)),
                            );
                            setNotifOpen(false);
                          }}
                          className={`block border-b border-[var(--border-default)] px-4 py-3 transition last:border-b-0 hover:bg-[var(--accent-soft)] ${
                            n.unread ? 'bg-[var(--accent-soft)]/40' : ''
                          }`}
                          role="menuitem"
                        >
                          <div className="flex items-start gap-2">
                            {n.unread && (
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                            )}
                            <div className={n.unread ? '' : 'pl-3.5'}>
                              <p className="text-sm font-semibold text-[var(--text-primary)]">{n.title}</p>
                              <p className="mt-0.5 text-xs leading-5 text-[var(--text-secondary)]">{n.body}</p>
                              <p className="mt-1 text-[10px] font-medium text-[var(--text-muted)]">{n.time}</p>
                            </div>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <ThemeToggle />
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

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {isMobileMenuOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} aria-hidden />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-[min(280px,85vw)] flex-col bg-[var(--bg-sidebar)] shadow-2xl er-safe-pt lg:hidden">
            <div className="flex items-center justify-between px-4 py-4">
              <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2">
                <EduRouteLogo size={32} className="rounded-lg shadow-sm" />
                <span className="font-bold">EDUROUTE</span>
              </Link>
              <button type="button" onClick={() => setIsMobileMenuOpen(false)} className="p-2 rounded-xl hover:bg-[var(--accent-soft)]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-3 pb-2">
              <GlobalSearch variant="full" />
            </div>
            <nav className="flex-1 overflow-y-auto px-3 space-y-3">
              {NAV_GROUPS.map((group) => (
                <div key={group.label}>
                  <div className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                    {group.label}
                  </div>
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

      <FloatingBuddyWidget />
    </div>
  );
};

export default MainLayout;

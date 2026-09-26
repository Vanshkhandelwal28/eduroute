import { useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Users,
  BookOpen,
  Target,
  Map,
  TrendingUp,
  LogOut,
  Bell,
  Search,
} from 'lucide-react';
import { clearAuthSession, getAuthUser } from '../utils/rbacAuth';
import { clearAdminSession, isAdminSessionActive } from '../utils/adminSession';
import { ThemeToggle } from '../components/ThemeToggle';

/** Slim admin nav: SIH features + core ops (no Dashboard / Pending / Partners / Reports / Settings). */
const NAV = [
  { name: 'Student Management', path: '/admin/students', icon: Users },
  { name: 'Courses', path: '/admin/courses', icon: BookOpen },
  { name: 'Curriculum Gaps', path: '/admin/curriculum-gaps', icon: Target },
  { name: 'District Plans', path: '/admin/district-plans', icon: Map },
  { name: 'Market Trends', path: '/admin/market-trends', icon: TrendingUp },
];

export const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const authUser = getAuthUser();
  const sessionOk = authUser?.role === 'admin' || isAdminSessionActive();

  useEffect(() => {
    if (!sessionOk) {
      navigate('/login', { replace: true });
    }
  }, [sessionOk, navigate]);

  const handleLogout = () => {
    clearAuthSession();
    clearAdminSession();
    navigate('/login', { replace: true });
  };

  if (!sessionOk) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-[var(--text-secondary)] bg-[var(--bg-primary)]">
        Checking admin access…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <aside className="hidden md:flex w-64 flex-col border-r border-[var(--border-default)] bg-[var(--bg-sidebar)] text-[var(--text-primary)]">
        <div className="px-5 py-6 border-b border-[var(--border-default)] flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-500 flex items-center justify-center font-black text-white">E</div>
          <div>
            <div className="font-black tracking-tight">EduRoute</div>
            <div className="text-xs text-[var(--text-muted)]">Admin Panel</div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const active =
              location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[var(--border-default)] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-9 w-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0">
              {(authUser?.name || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold truncate">{authUser?.name || 'Admin'}</div>
              <div className="text-[11px] text-[var(--text-muted)]">Super Admin</div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 border-b border-[var(--border-default)] bg-[var(--bg-card)] backdrop-blur-md px-4 md:px-6 py-3 flex items-center gap-3">
          <div className="md:hidden font-black text-indigo-600">EduRoute</div>
          <div className="flex-1 max-w-xl relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
            <input
              type="search"
              placeholder="Search students or courses..."
              className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] pl-10 pr-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>
          <ThemeToggle />
          <button
            type="button"
            className="relative p-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)]"
          >
            <Bell className="h-4 w-4 text-[var(--text-secondary)]" />
          </button>
          <div className="hidden sm:flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-1.5">
            <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold">
              {(authUser?.name || 'A').charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              {authUser?.name || 'Admin'}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[var(--bg-primary)] text-[var(--text-primary)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

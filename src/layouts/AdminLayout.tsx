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

/** Slim admin nav: core ops (students, courses, curriculum, districts, market). */
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

  useEffect(() => {
    if (!isAdminSessionActive() && authUser?.role !== 'admin') {
      navigate('/admin/login', { replace: true });
    }
  }, [navigate, authUser?.role]);

  const logout = () => {
    clearAdminSession();
    clearAuthSession();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-[var(--border-default)] bg-[var(--bg-card)]">
        <div className="flex h-16 items-center gap-2 border-b border-[var(--border-default)] px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-black text-white">
            E
          </div>
          <div>
            <p className="text-sm font-black tracking-tight">EDUROUTE</p>
            <p className="text-[10px] font-semibold uppercase text-[var(--text-muted)]">Admin</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV.map((item) => {
            const active = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  active
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[var(--border-default)] p-3">
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-500/10"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-[var(--border-default)] bg-[var(--bg-card)]/90 px-6 backdrop-blur">
          <div className="flex max-w-md flex-1 items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2">
            <Search className="h-4 w-4 text-[var(--text-muted)]" />
            <input
              type="search"
              placeholder="Search admin…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
            />
          </div>
          <div className="flex items-center gap-3">
            <button type="button" className="rounded-xl p-2 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]">
              <Bell className="h-4 w-4" />
            </button>
            <ThemeToggle />
            <div className="text-right">
              <p className="text-xs font-bold">{authUser?.name || 'Admin'}</p>
              <p className="text-[10px] text-[var(--text-muted)]">Administrator</p>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

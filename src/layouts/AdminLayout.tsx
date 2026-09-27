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

const NAV = [
  { name: 'Students', path: '/admin/students', icon: Users },
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
    <div className="flex min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] kb-animate-fade">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r-2 border-[var(--border-default)] bg-[var(--bg-sidebar)]">
        <div className="flex h-14 items-center gap-3 border-b-2 border-[var(--border-default)] px-4">
          <div className="flex h-9 w-9 items-center justify-center border-2 border-[var(--accent)] bg-[var(--accent)] text-xs font-black text-[var(--text-inverse)]">
            E
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-[0.12em]">
              EDU<span className="text-[var(--accent)]">ROUTE</span>
            </p>
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[var(--accent)]">Admin</p>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {NAV.map((item) => {
            const active = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`er-nav-item ${active ? 'active' : ''}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="border-t-2 border-[var(--border-default)] p-2">
          <button
            type="button"
            onClick={logout}
            className="er-nav-item w-full text-left hover:!bg-transparent hover:!text-red-500 hover:!border-red-500"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b-2 border-[var(--border-default)] bg-[var(--bg-sidebar)] px-5">
          <div className="flex max-w-md flex-1 items-center gap-2 border-2 border-[var(--border-default)] bg-transparent px-3 py-2">
            <Search className="h-4 w-4 text-[var(--text-muted)]" />
            <input
              type="search"
              placeholder="SEARCH ADMIN"
              className="w-full bg-transparent text-xs font-bold uppercase tracking-wider outline-none placeholder:text-[var(--text-muted)]"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="border-2 border-[var(--border-default)] p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)]"
            >
              <Bell className="h-4 w-4" />
            </button>
            <ThemeToggle />
            <div className="text-right">
              <p className="text-xs font-black uppercase tracking-wide">{authUser?.name || 'Admin'}</p>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Administrator</p>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 kb-animate-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

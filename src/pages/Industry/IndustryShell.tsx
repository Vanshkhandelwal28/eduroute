import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, LogOut } from 'lucide-react';
import { clearAuthSession, getAuthUser } from '../../utils/rbacAuth';
import { ThemeToggle } from '../../components/ThemeToggle';
import { EmployerValidationPanel } from './EmployerValidationPanel';
import { IndustryWorkspaceInner } from './IndustryWorkspaceInner';

/** Industry entry: Openings | Employer validation tabs */
export function IndustryShell() {
  const navigate = useNavigate();
  const user = getAuthUser();
  const [tab, setTab] = useState<'openings' | 'validation'>('openings');

  const handleLogout = () => {
    clearAuthSession();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-black">Industry workspace</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {user?.name || 'Company'} · openings & employer validation
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              to="/"
              className="hidden rounded-xl px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 sm:inline"
            >
              Home
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
            >
              <LogOut className="h-3.5 w-3.5" /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab('openings')}
            className={`rounded-xl px-4 py-2 text-xs font-black uppercase ${
              tab === 'openings'
                ? 'bg-indigo-600 text-white'
                : 'border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
            }`}
          >
            Openings
          </button>
          <button
            type="button"
            onClick={() => setTab('validation')}
            className={`rounded-xl px-4 py-2 text-xs font-black uppercase ${
              tab === 'validation'
                ? 'bg-emerald-600 text-white'
                : 'border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
            }`}
          >
            Employer validation
          </button>
        </div>
        {tab === 'validation' ? (
          <EmployerValidationPanel companyName={user?.name || 'EduRoute Partners'} />
        ) : (
          <IndustryWorkspaceInner />
        )}
      </main>
    </div>
  );
}

export default IndustryShell;

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { getAuthUser } from '../utils/rbacAuth';
import { apiGetGoal, apiSetGoal } from '../utils/authApi';

export const SetGoal = () => {
  const navigate = useNavigate();
  const user = getAuthUser();

  const [goal, setGoal] = useState(500);
  const [currentGoal, setCurrentGoal] = useState(500);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadGoal = async () => {
      try {
        const response = await apiGetGoal();
        setCurrentGoal(response.data.goal);
        setGoal(response.data.goal);
      } catch (err) {
        console.error('Unable to load goal:', err);
      } finally {
        setLoading(false);
      }
    };

    loadGoal();
  }, []);

  const handleSave = async () => {
    if (!Number.isInteger(goal) || goal <= 0) {
      setError('Please enter a valid goal.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await apiSetGoal(goal);

      navigate('/dashboard', {
        replace: true,
        state: {
          goalUpdated: true,
          message: 'New goal set done',
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save goal');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  return (
    <div className="flex min-h-full items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-3xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-700 dark:bg-slate-900 md:p-12">

        <div className="mb-10 text-center">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">
            SET NEW GOAL
          </h1>
          <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">
            Set your weekly learning target
          </p>
        </div>

        <div className="mx-auto max-w-xl space-y-8">

          <div>
            <label className="mb-2 block text-sm font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              User Name
            </label>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-lg font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
              {user?.name || 'User'}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Current Goal
            </label>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-lg font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
              {loading ? 'Loading...' : `${currentGoal} / 500`}
            </div>
          </div>

          <div>
            <label
              htmlFor="new-goal"
              className="mb-2 block text-sm font-black uppercase tracking-wider text-slate-500 dark:text-slate-400"
            >
              Set New Goal
            </label>

            <div className="relative">
              <input
                id="new-goal"
                type="number"
                min="1"
                step="10"
                value={goal}
                onChange={(e) => setGoal(Number(e.target.value))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 pr-20 text-lg font-black text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />

              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                points
              </span>
            </div>

            {error && (
              <p className="mt-2 text-sm font-bold text-red-500">
                {error}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:justify-center">

            <button
              type="button"
              onClick={handleBack}
              className="flex items-center justify-center gap-2 rounded-2xl border border-slate-300 px-10 py-4 font-black text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="h-5 w-5" />
              BACK
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-10 py-4 font-black text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-5 w-5" />
              {saving ? 'SAVING...' : 'SAVE'}
            </button>

          </div>
        </div>
      </div>
    </div>
  );
};
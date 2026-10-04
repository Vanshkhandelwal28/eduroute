import { Link } from 'react-router-dom';

/** Temporary stub while full ProfileDashboard is restored from git history. */
export const ProfileDashboard = () => {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-black text-slate-900 dark:text-white">Profile</h1>
      <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
        Profile dashboard file is being restored. Other pages (Rewards, Leaderboard, Learning Path) work normally.
        XP and rewards are stored in Neon under key gamification.
      </p>
      <Link to="/rewards" className="text-sm font-bold text-indigo-600 hover:underline dark:text-indigo-400">
        Open Rewards →
      </Link>
    </div>
  );
};

export default ProfileDashboard;

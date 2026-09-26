import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Award, Copy, Share2, Target, Trophy, User } from 'lucide-react';
import { fetchPublicProfile, type ProfileRow } from '../../utils/supabaseAuth';
import { isSupabaseConfigured } from '../../lib/supabase';

export const PublicProfile = () => {
  const { username = '' } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      if (!isSupabaseConfigured) {
        setError('Public profiles need Supabase (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY).');
        setLoading(false);
        return;
      }
      const row = await fetchPublicProfile(username);
      if (cancelled) return;
      if (!row) {
        setError('Profile not found');
        setProfile(null);
      } else {
        setProfile(row);
      }
      setLoading(false);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [username]);

  const shareUrl =
    typeof window !== 'undefined' ? window.location.href : `/u/${username}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const nativeShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${profile?.name || username} — EduRoute`,
          url: shareUrl,
        });
      } else {
        await copyLink();
      }
    } catch {
      /* cancelled */
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        Loading profile…
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 dark:bg-slate-950">
        <p className="text-lg font-bold text-slate-800 dark:text-white">{error || 'Not found'}</p>
        <Link to="/" className="text-sm font-semibold text-indigo-600 hover:underline">
          ← EduRoute home
        </Link>
      </div>
    );
  }

  const pd = (profile.public_data || {}) as {
    skills?: string[];
    pathSummary?: { title: string; status?: string }[];
    xp?: number;
    solved?: number;
    certs?: { title: string; issuer?: string }[];
  };
  const skills = Array.isArray(pd.skills) ? pd.skills : [];
  const pathSummary = Array.isArray(pd.pathSummary) ? pd.pathSummary : [];
  const certs = Array.isArray(pd.certs) ? pd.certs : [];
  const xp = Number(pd.xp) || 0;
  const solved = Number(pd.solved) || 0;
  const initial = (profile.name || profile.username || 'U').charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2 font-black tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-sm text-white">
              E
            </span>
            EDUROUTE
          </Link>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void copyLink()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold dark:border-slate-700"
            >
              <Copy className="h-3.5 w-3.5" /> {copied ? 'Copied' : 'Copy link'}
            </button>
            <button
              type="button"
              onClick={() => void nativeShare()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white"
            >
              <Share2 className="h-3.5 w-3.5" /> Share
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-3xl font-black text-white">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-black tracking-tight md:text-3xl">{profile.name}</h1>
              <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">@{profile.username}</p>
              {profile.bio ? (
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{profile.bio}</p>
              ) : (
                <p className="mt-2 text-sm text-slate-400">EduRoute learner</p>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                <Trophy className="h-3.5 w-3.5" /> XP
              </div>
              <p className="mt-1 text-2xl font-black">{xp.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                <Target className="h-3.5 w-3.5" /> Solved
              </div>
              <p className="mt-1 text-2xl font-black">{solved}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50 sm:col-span-1 col-span-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                <Award className="h-3.5 w-3.5" /> Certs
              </div>
              <p className="mt-1 text-2xl font-black">{certs.length}</p>
            </div>
          </div>
        </section>

        {skills.length > 0 && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
              <User className="h-5 w-5 text-indigo-600" /> Skills
            </h2>
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-200"
                >
                  {s}
                </span>
              ))}
            </div>
          </section>
        )}

        {pathSummary.length > 0 && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-3 text-lg font-bold">Learning path</h2>
            <ul className="space-y-2">
              {pathSummary.map((n, i) => (
                <li
                  key={`${n.title}-${i}`}
                  className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm dark:border-slate-800"
                >
                  <span className="font-medium">{n.title}</span>
                  <span className="text-xs uppercase text-slate-500">{n.status || '—'}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {certs.length > 0 && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-3 text-lg font-bold">Certificates</h2>
            <ul className="space-y-2">
              {certs.map((c, i) => (
                <li key={`${c.title}-${i}`} className="rounded-xl border border-slate-100 px-3 py-2 text-sm dark:border-slate-800">
                  <div className="font-semibold">{c.title}</div>
                  {c.issuer && <div className="text-xs text-slate-500">{c.issuer}</div>}
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="text-center text-xs text-slate-400">
          Public profile · only non-private data is shown ·{' '}
          <Link to="/signup" className="text-indigo-600 hover:underline">
            Join EduRoute
          </Link>
        </p>
      </main>
    </div>
  );
};

export default PublicProfile;

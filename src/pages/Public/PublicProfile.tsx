import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Award,
  Briefcase,
  Copy,
  Share2,
  Target,
  Trophy,
  User,
  CheckCircle2,
} from 'lucide-react';
import { fetchPublicProfile, type ProfileRow } from '../../utils/supabaseAuth';
import { isSupabaseConfigured } from '../../lib/supabase';
import type { PublicProfilePayload } from '../../utils/publicProfilePayload';

function asPayload(raw: unknown): PublicProfilePayload {
  const pd = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    skills: Array.isArray(pd.skills) ? (pd.skills as string[]) : [],
    skillGaps: Array.isArray(pd.skillGaps) ? (pd.skillGaps as string[]) : [],
    certs: Array.isArray(pd.certs) ? (pd.certs as PublicProfilePayload['certs']) : [],
    internships: Array.isArray(pd.internships)
      ? (pd.internships as PublicProfilePayload['internships'])
      : [],
    achievements: Array.isArray(pd.achievements)
      ? (pd.achievements as PublicProfilePayload['achievements'])
      : [],
    xp: Number(pd.xp) || 0,
    solved: Number(pd.solved) || 0,
    pathSummary: Array.isArray(pd.pathSummary)
      ? (pd.pathSummary as PublicProfilePayload['pathSummary'])
      : [],
  };
}

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
        <p className="max-w-sm text-center text-sm text-slate-500">
          Use the exact username from Supabase (e.g. ansh1). Demo login does not create a public row.
        </p>
        <Link to="/" className="text-sm font-semibold text-indigo-600 hover:underline">
          ← EduRoute home
        </Link>
      </div>
    );
  }

  const pd = asPayload(profile.public_data);
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
                <p className="mt-2 text-sm text-slate-400">EduRoute learner · public portfolio</p>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                <Trophy className="h-3.5 w-3.5" /> XP
              </div>
              <p className="mt-1 text-2xl font-black">{(pd.xp || 0).toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                <Target className="h-3.5 w-3.5" /> Skills
              </div>
              <p className="mt-1 text-2xl font-black">{pd.skills.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                <Briefcase className="h-3.5 w-3.5" /> Internships
              </div>
              <p className="mt-1 text-2xl font-black">{pd.internships.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                <Award className="h-3.5 w-3.5" /> Certs
              </div>
              <p className="mt-1 text-2xl font-black">{pd.certs.length}</p>
            </div>
          </div>
        </section>

        {(pd.skills.length > 0 || (pd.skillGaps && pd.skillGaps.length > 0)) && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
              <User className="h-5 w-5 text-indigo-600" /> Skills
            </h2>
            {pd.skills.length > 0 && (
              <div className="mb-3">
                <p className="mb-2 text-xs font-bold uppercase text-emerald-600">Strengths</p>
                <div className="flex flex-wrap gap-2">
                  {pd.skills.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200"
                    >
                      <CheckCircle2 className="h-3 w-3" /> {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {pd.skillGaps && pd.skillGaps.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase text-rose-600">Closing gaps</p>
                <div className="flex flex-wrap gap-2">
                  {pd.skillGaps.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-800 dark:bg-rose-500/15 dark:text-rose-200"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {pd.internships.length > 0 && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
              <Briefcase className="h-5 w-5 text-indigo-600" /> Internships
            </h2>
            <ul className="space-y-2">
              {pd.internships.map((it, i) => (
                <li
                  key={`${it.role}-${it.company}-${i}`}
                  className="rounded-xl border border-slate-100 px-3 py-2.5 text-sm dark:border-slate-800"
                >
                  <div className="font-semibold">{it.role}</div>
                  <div className="text-xs text-slate-500">
                    {it.company}
                    {it.duration ? ` · ${it.duration}` : ''}
                    {it.status ? ` · ${it.status}` : ''}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {pd.certs.length > 0 && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
              <Award className="h-5 w-5 text-indigo-600" /> Certificates
            </h2>
            <ul className="space-y-2">
              {pd.certs.map((c, i) => (
                <li key={`${c.title}-${i}`} className="rounded-xl border border-slate-100 px-3 py-2 text-sm dark:border-slate-800">
                  <div className="font-semibold">{c.title}</div>
                  <div className="text-xs text-slate-500">
                    {[c.issuer, c.date].filter(Boolean).join(' · ')}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {pd.achievements.length > 0 && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
              <Trophy className="h-5 w-5 text-amber-500" /> Achievements
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {pd.achievements.map((a, i) => (
                <article
                  key={`${a.title}-${i}`}
                  className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <div className="text-lg">{a.icon || '🏅'}</div>
                  <p className="mt-1 text-sm font-bold">{a.title}</p>
                  {a.detail && <p className="text-xs text-slate-500">{a.detail}</p>}
                </article>
              ))}
            </div>
          </section>
        )}

        {pd.skills.length === 0 &&
          pd.certs.length === 0 &&
          pd.internships.length === 0 &&
          pd.achievements.length === 0 && (
            <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
              This learner has not published portfolio details yet. After they open Portfolio while logged in,
              skills / certs / internships appear here.
            </p>
          )}

        <p className="text-center text-xs text-slate-400">
          Public profile · only non-private data ·{' '}
          <Link to="/signup" className="text-indigo-600 hover:underline">
            Join EduRoute
          </Link>
        </p>
      </main>
    </div>
  );
};

export default PublicProfile;

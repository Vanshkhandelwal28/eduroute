import { getSupabase, isSupabaseConfigured, type ProfileRow } from '../lib/supabase';
import { saveAuthSession, type AuthUser, type UserRole } from './rbacAuth';
import { saveUserProfile } from './userProfile';

const USERNAME_RE = /^[a-z0-9_]{3,24}$/;

export function slugifyUsername(input: string): string {
  const s = input
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20);
  return s.length >= 3 ? s : `user${Date.now().toString(36).slice(-6)}`;
}

async function ensureUniqueUsername(base: string): Promise<string> {
  const sb = getSupabase();
  if (!sb) return base;
  let candidate = base;
  for (let i = 0; i < 12; i++) {
    const { data } = await sb
      .from('profiles')
      .select('id')
      .ilike('username', candidate)
      .maybeSingle();
    if (!data) return candidate;
    candidate = `${base.slice(0, 18)}${i + 1}`;
  }
  return `${base.slice(0, 12)}${Date.now().toString(36).slice(-6)}`;
}

function toAuthUser(row: ProfileRow, role?: UserRole): AuthUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatar: row.avatar_url || undefined,
    role: (role || (row.role as UserRole) || 'student') as UserRole,
    verificationStatus: 'pending',
  };
}

/** Sign up with email/password → Supabase Auth + profiles row. */
export async function supabaseSignUp(payload: {
  name: string;
  email: string;
  password: string;
}): Promise<{ token: string; user: AuthUser; username: string }> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase is not configured');

  const email = payload.email.trim().toLowerCase();
  const name = payload.name.trim();
  const base = slugifyUsername(name || email.split('@')[0] || 'user');
  const username = await ensureUniqueUsername(base);

  const { data, error } = await sb.auth.signUp({
    email,
    password: payload.password,
    options: {
      data: { name, username, avatar_url: null },
    },
  });

  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('Signup failed — no user returned');

  // Trigger may insert profile; upsert for certainty
  const { error: upsertErr } = await sb.from('profiles').upsert(
    {
      id: data.user.id,
      email,
      name,
      username,
      avatar_url: null,
      bio: '',
      role: 'student',
      public_data: {
        skills: [],
        pathSummary: [],
        xp: 0,
        solved: 0,
        certs: [],
      },
    },
    { onConflict: 'id' },
  );
  if (upsertErr) {
    // Non-fatal if trigger already created row
    console.warn('[supabaseSignUp] profile upsert', upsertErr.message);
  }

  const session = data.session;
  const token = session?.access_token || `sb-${data.user.id}`;
  const user = toAuthUser({
    id: data.user.id,
    email,
    name,
    username,
    avatar_url: null,
    bio: '',
    role: 'student',
    public_data: {},
  });

  saveUserProfile({ name, email });
  saveAuthSession(token, user);
  try {
    localStorage.setItem('eduroute:public-username', username);
  } catch {
    /* ignore */
  }

  return { token, user, username };
}

/** Login with email/password (student). */
export async function supabaseSignIn(payload: {
  email: string;
  password: string;
}): Promise<{ token: string; user: AuthUser; username: string }> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase is not configured');

  const email = payload.email.trim().toLowerCase();
  const { data, error } = await sb.auth.signInWithPassword({
    email,
    password: payload.password,
  });

  if (error) throw new Error(error.message);
  if (!data.user || !data.session) throw new Error('Login failed');

  let profile: ProfileRow | null = null;
  const { data: row } = await sb.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
  profile = row as ProfileRow | null;

  if (!profile) {
    const name =
      (data.user.user_metadata?.name as string) || email.split('@')[0] || 'Student';
    const username = await ensureUniqueUsername(slugifyUsername(name));
    await sb.from('profiles').upsert({
      id: data.user.id,
      email,
      name,
      username,
      role: 'student',
      public_data: {},
    });
    profile = {
      id: data.user.id,
      email,
      name,
      username,
      avatar_url: null,
      bio: '',
      role: 'student',
      public_data: {},
    };
  }

  const token = data.session.access_token;
  const user = toAuthUser(profile);
  saveUserProfile({
    name: profile.name,
    email: profile.email,
    avatar: profile.avatar_url || undefined,
    roleBio: profile.bio || undefined,
  });
  saveAuthSession(token, user);
  try {
    localStorage.setItem('eduroute:public-username', profile.username);
  } catch {
    /* ignore */
  }

  return { token, user, username: profile.username };
}

export async function fetchPublicProfile(username: string): Promise<ProfileRow | null> {
  const sb = getSupabase();
  if (!sb || !username) return null;
  const clean = username.trim().toLowerCase();
  if (!USERNAME_RE.test(clean) && !/^[a-z0-9_]{3,32}$/.test(clean)) return null;

  const { data, error } = await sb
    .from('profiles')
    .select('id,email,name,username,avatar_url,bio,role,public_data,created_at')
    .ilike('username', clean)
    .maybeSingle();

  if (error || !data) return null;
  return data as ProfileRow;
}

/** Sync lean public_data from local stores (call after onboarding / path updates). */
export async function syncMyPublicData(partial: Record<string, unknown>): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return;

  const { data: existing } = await sb
    .from('profiles')
    .select('public_data')
    .eq('id', user.id)
    .maybeSingle();

  const prev = (existing?.public_data as Record<string, unknown>) || {};
  await sb
    .from('profiles')
    .update({ public_data: { ...prev, ...partial } })
    .eq('id', user.id);
}

export async function updateMyProfile(fields: {
  name?: string;
  bio?: string;
  username?: string;
  avatar_url?: string | null;
}): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return;

  const patch: Record<string, unknown> = {};
  if (fields.name !== undefined) patch.name = fields.name;
  if (fields.bio !== undefined) patch.bio = fields.bio;
  if (fields.avatar_url !== undefined) patch.avatar_url = fields.avatar_url;
  if (fields.username !== undefined) {
    const u = slugifyUsername(fields.username);
    if (!USERNAME_RE.test(u)) throw new Error('Username must be 3–24 chars: a-z, 0-9, _');
    patch.username = await ensureUniqueUsername(u);
  }
  if (Object.keys(patch).length === 0) return;
  const { error } = await sb.from('profiles').update(patch).eq('id', user.id);
  if (error) throw new Error(error.message);
}

export function getStoredPublicUsername(): string | null {
  try {
    return localStorage.getItem('eduroute:public-username');
  } catch {
    return null;
  }
}

export function publicProfileUrl(username: string): string {
  if (typeof window === 'undefined') return `/u/${username}`;
  return `${window.location.origin}/u/${username}`;
}

export { isSupabaseConfigured };

export type UserRole = 'student' | 'admin' | 'industry' | 'college' | 'faculty';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: UserRole;
  verificationStatus?: string;
  /** Institution display name when role is college */
  institutionName?: string;
};

/**
 * TEMP: auth gate disabled.
 * The Render-hosted auth/DB API (https://eduroute-api-nho4.onrender.com) is
 * unreachable, so real login/signup fail and visitors get stuck on /login.
 * While AUTH_DISABLED is true, every visitor is treated as the demo student
 * and routed straight into the app — no DB auth check is performed.
 * Set AUTH_DISABLED back to false to restore real authentication.
 */
export const AUTH_DISABLED = true;

const DEMO_BYPASS_USER: AuthUser = {
  id: 'demo-student',
  name: 'Demo Student',
  email: 'demo.student@eduroute.app',
  role: 'student',
  verificationStatus: 'verified',
};

const DEMO_BYPASS_TOKEN = 'demo-bypass-token';

const TOKEN_KEY = 'eduroute:auth-token';
const USER_KEY = 'eduroute:auth-user';

const readStorage = (key: string): string | null => {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorage = (key: string, value: string) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage access errors (e.g. private mode restrictions)
  }
};

const removeStorage = (key: string) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage access errors (e.g. private mode restrictions)
  }
};

export const saveAuthSession = (token: string, user: AuthUser) => {
  writeStorage(TOKEN_KEY, token);
  writeStorage(USER_KEY, JSON.stringify(user));
  writeStorage('eduroute:is-authenticated', 'true');
};

export const clearAuthSession = () => {
  removeStorage(TOKEN_KEY);
  removeStorage(USER_KEY);
  removeStorage('eduroute:is-authenticated');
};

export const getAuthToken = () => {
  const token = readStorage(TOKEN_KEY);
  if (token) return token;
  return AUTH_DISABLED ? DEMO_BYPASS_TOKEN : '';
};

export const getAuthUser = (): AuthUser | null => {
  const raw = readStorage(USER_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      // fall through to bypass user when auth is disabled
    }
  }
  return AUTH_DISABLED ? DEMO_BYPASS_USER : null;
};

export const isAuthenticated = () => {
  if (AUTH_DISABLED) return true;
  return Boolean(getAuthToken() && getAuthUser());
};

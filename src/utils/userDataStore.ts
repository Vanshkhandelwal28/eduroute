/**
 * Generic Neon-backed JSON store via Render Go API.
 * Keys: course-progress | course-assessments | skill-profile | cv | onboarding
 */
import { currentUserId } from './apiClient';

const RENDER = 'https://eduroute-api-nho4.onrender.com';

function headers(): HeadersInit {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const token =
      localStorage.getItem('eduroute_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('authToken');
    if (token && token.includes('.') && !token.startsWith('open-')) {
      h.Authorization = `Bearer ${token}`;
    }
    h['X-User-Id'] = currentUserId();
  } catch {
    /* ignore */
  }
  return h;
}

function urls(key: string, uid: string): string[] {
  const q = `key=${encodeURIComponent(key)}&userId=${encodeURIComponent(uid)}`;
  return [
    `${RENDER}/api/user-data?${q}`,
    `/.netlify/functions/user-data?${q}`,
    `/api/user-data?${q}`,
  ];
}

export async function pullUserData<T = unknown>(key: string): Promise<T | null> {
  const uid = currentUserId();
  for (const url of urls(key, uid)) {
    try {
      const res = await fetch(url, { method: 'GET', headers: headers() });
      const ct = res.headers.get('content-type') || '';
      if (!res.ok || ct.includes('text/html')) continue;
      const body = await res.json();
      const data = body?.data ?? body;
      if (!data || data.empty) return null;
      return (data.payload as T) ?? null;
    } catch {
      continue;
    }
  }
  return null;
}

export async function pushUserData(key: string, payload: unknown): Promise<boolean> {
  const uid = currentUserId();
  const body = JSON.stringify({ userId: uid, key, payload });
  const targets = [
    `${RENDER}/api/user-data`,
    '/.netlify/functions/user-data',
    '/api/user-data',
  ];
  for (const url of targets) {
    try {
      const res = await fetch(url, { method: 'POST', headers: headers(), body });
      const ct = res.headers.get('content-type') || '';
      if (!res.ok || ct.includes('text/html')) continue;
      const json = await res.json();
      if (json?.success || json?.data?.ok || json?.ok) return true;
    } catch {
      continue;
    }
  }
  return false;
}

/**
 * Generic Neon-backed JSON store (via /api/user-data → Render).
 * Keys: skill-profile | cv | course-progress | onboarding | applications
 */
import { currentUserId } from './apiClient';

const URLS = ['/api/user-data', '/.netlify/functions/user-data'];

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

async function request(method: 'GET' | 'POST', key: string, payload?: unknown) {
  const uid = currentUserId();
  for (const base of URLS) {
    try {
      const url =
        method === 'GET'
          ? `${base}?key=${encodeURIComponent(key)}&userId=${encodeURIComponent(uid)}`
          : base;
      const res = await fetch(url, {
        method,
        headers: headers(),
        body:
          method === 'POST'
            ? JSON.stringify({ userId: uid, key, payload })
            : undefined,
      });
      const ct = res.headers.get('content-type') || '';
      if (!res.ok || ct.includes('text/html')) continue;
      return await res.json();
    } catch {
      continue;
    }
  }
  return null;
}

export async function pullUserData<T = unknown>(key: string): Promise<T | null> {
  const body = await request('GET', key);
  const data = body?.data ?? body;
  if (!data || data.empty) return null;
  return (data.payload as T) ?? null;
}

export async function pushUserData(key: string, payload: unknown): Promise<boolean> {
  const body = await request('POST', key, payload);
  return Boolean(body?.success || body?.data?.ok || body?.ok);
}

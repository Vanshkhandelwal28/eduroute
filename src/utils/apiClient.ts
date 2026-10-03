/**
 * Shared API client — prefers Render Go API (Neon).
 * VITE_API_URL at build time, else hardcoded Render fallback.
 */
import { getAuthToken, getAuthUser } from './rbacAuth';

/** Production Render API — always available so Netlify rewrite bugs cannot block DB. */
const RENDER_API = 'https://eduroute-api-nho4.onrender.com';

const ENV_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || '';

export function apiBase(): string {
  if (ENV_BASE) return ENV_BASE.replace(/\/$/, '');
  // Prefer Render in production so /api/* Netlify 404 never blocks persistence
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.includes('netlify.app') || host.includes('eduroute')) {
      return RENDER_API;
    }
  }
  return '/api';
}

export function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extra || {}),
  };
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const uid = currentUserId();
  if (uid) headers['X-User-Id'] = uid;
  return headers;
}

export function currentUserId(): string {
  const u = getAuthUser();
  if (u?.id && !u.id.startsWith('open-student-')) return u.id;
  if (u?.email) return u.email.toLowerCase();
  return u?.id || 'demo-student';
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status?: number };

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResult<T>> {
  const base = apiBase();
  const url = path.startsWith('http')
    ? path
    : `${base}${path.startsWith('/') ? path : `/${path}`}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...authHeaders(),
        ...(options.headers as Record<string, string> | undefined),
      },
    });

    let body: any = null;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      try {
        body = await res.json();
      } catch {
        body = null;
      }
    } else {
      body = await res.text().catch(() => null);
      // HTML from Netlify = wrong route; try Render absolute once
      if (typeof body === 'string' && body.includes('<!DOCTYPE') && !url.startsWith(RENDER_API)) {
        return apiFetch<T>(
          path.startsWith('/') ? `${RENDER_API}${path.startsWith('/api') ? path : `/api${path}`}` : path,
          options,
        );
      }
    }

    if (!res.ok) {
      const err =
        (body && (body.error || body.message)) ||
        (typeof body === 'string' ? body.slice(0, 200) : null) ||
        `Request failed (${res.status})`;
      return { ok: false, error: String(err), status: res.status };
    }

    if (body && typeof body === 'object') {
      if ('data' in body && (body.success === true || body.ok === true || body.success === undefined)) {
        return { ok: true, data: (body.data ?? body) as T };
      }
      if (body.ok === true || body.success === true) {
        return { ok: true, data: body as T };
      }
      return { ok: true, data: body as T };
    }

    return { ok: true, data: body as T };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Network error' };
  }
}

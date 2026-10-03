/**
 * Shared API client — talks to Netlify functions / Go backend.
 * Always attaches JWT when present. Falls back gracefully offline.
 */
import { getAuthToken, getAuthUser } from './rbacAuth';

const ENV_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || '';

/** Resolve API base. Prefer absolute VITE_API_URL (Render), else same-origin /api (Netlify). */
export function apiBase(): string {
  if (ENV_BASE) return ENV_BASE.replace(/\/$/, '');
  return '/api';
}

export function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extra || {}),
  };
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export function currentUserId(): string {
  const u = getAuthUser();
  // Prefer stable id, then email (stable across browsers), never a random per-session id alone
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
    }

    if (!res.ok) {
      const err =
        (body && (body.error || body.message)) ||
        (typeof body === 'string' ? body.slice(0, 200) : null) ||
        `Request failed (${res.status})`;
      return { ok: false, error: String(err), status: res.status };
    }

    // Go API envelope: { success, data }  | Netlify: { ok, ... }
    if (body && typeof body === 'object') {
      if ('data' in body && (body.success === true || body.ok === true || body.success === undefined)) {
        return { ok: true, data: (body.data ?? body) as T };
      }
      if (body.ok === true || body.success === true) {
        return { ok: true, data: body as T };
      }
    }
    return { ok: true, data: body as T };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Network error',
    };
  }
}

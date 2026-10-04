/**
 * Client helpers for shared college-ID queue (Netlify function → Neon via Go).
 */

export type QueueVerification = {
  id: string;
  verificationId: string;
  name: string;
  email: string;
  phone?: string;
  course?: string;
  college?: string;
  location?: string;
  fileName?: string;
  documentDataUrl?: string;
  mimeType?: string;
  appliedAt: string;
  status: 'pending' | 'verified' | 'rejected';
  compressed?: boolean;
  source?: string;
};

const ENDPOINTS = [
  '/.netlify/functions/college-verifications',
  '/api/college-verifications',
];

async function tryFetch(path: string, init?: RequestInit): Promise<Response | null> {
  try {
    const res = await fetch(path, init);
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('text/html')) return null;
    return res;
  } catch {
    return null;
  }
}

export async function submitCollegeVerificationQueue(
  payload: Omit<QueueVerification, 'id' | 'verificationId' | 'status' | 'appliedAt'> &
    { status?: string },
): Promise<{ ok: boolean; data?: QueueVerification; error?: string }> {
  const body = JSON.stringify({ ...payload, status: 'pending' });
  for (const url of ENDPOINTS) {
    const res = await tryFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    if (!res) continue;
    const json = await res.json().catch(() => ({}));
    if (res.ok && (json.ok || json.data)) return { ok: true, data: json.data };
    if (!res.ok) return { ok: false, error: json.error || `HTTP ${res.status}` };
  }
  return { ok: false, error: 'Queue unavailable' };
}

export async function fetchCollegeVerificationQueue(
  all = false,
): Promise<QueueVerification[]> {
  const q = all ? '?all=1' : '';
  for (const url of ENDPOINTS) {
    const res = await tryFetch(`${url}${q}`, { method: 'GET' });
    if (!res || !res.ok) continue;
    const json = await res.json().catch(() => ({}));
    if (Array.isArray(json.data)) return json.data;
  }
  return [];
}

export async function patchCollegeVerificationQueue(
  id: string,
  action: 'approve' | 'reject',
  email?: string | null,
): Promise<boolean> {
  const payload: Record<string, string> = { id, action };
  if (email) payload.email = String(email).toLowerCase().trim();
  for (const url of ENDPOINTS) {
    const res = await tryFetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res) continue;
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.ok) return true;
  }
  return false;
}

/** Latest queue status for a student email (shared Neon queue). */
export async function fetchVerificationStatusForEmail(
  email?: string | null,
): Promise<{ status: 'none' | QueueVerification['status']; row: QueueVerification | null }> {
  const key = String(email || '')
    .toLowerCase()
    .trim();
  if (!key) return { status: 'none', row: null };

  const all = await fetchCollegeVerificationQueue(true);
  const mine = all.filter((x) => String(x.email || '').toLowerCase().trim() === key);
  if (!mine.length) return { status: 'none', row: null };

  const rank = (s: string) => (s === 'verified' ? 3 : s === 'pending' ? 2 : 1);
  mine.sort((a, b) => {
    const r = rank(b.status) - rank(a.status);
    if (r !== 0) return r;
    return String(b.appliedAt || '').localeCompare(String(a.appliedAt || ''));
  });
  const row = mine[0];
  return { status: row.status, row };
}

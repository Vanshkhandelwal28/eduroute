/**
 * Local queue for student college-ID uploads so they appear in the admin panel
 * when the backend is unreachable. Backend data takes priority when available.
 */

export type LocalPendingVerification = {
  id: string;
  verificationId: string;
  name: string;
  email: string;
  phone?: string;
  course?: string;
  college?: string;
  location?: string;
  dateOfBirth?: string;
  year?: string;
  fileName?: string;
  documentDataUrl?: string;
  mimeType?: string;
  appliedAt: string;
  status: 'pending' | 'verified' | 'rejected';
  compressed?: boolean;
};

/** Student-facing verification state */
export type StudentVerificationState =
  | 'none' // never submitted (skipped signup)
  | 'pending' // submitted, waiting admin
  | 'verified' // admin approved
  | 'rejected'; // admin rejected — may resubmit

const STORE_KEY = 'eduroute.localPendingVerifications';

const readAll = (): LocalPendingVerification[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeAll = (items: LocalPendingVerification[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event('eduroute:verification-updated'));
  } catch {
    // ignore quota / private mode
  }
};

export const listLocalPendingVerifications = (): LocalPendingVerification[] =>
  readAll().filter((item) => item.status === 'pending');

/** All rows (any status) — for admin history if needed */
export const listAllLocalVerifications = (): LocalPendingVerification[] => readAll();

export const addLocalPendingVerification = (
  payload: Omit<LocalPendingVerification, 'id' | 'verificationId' | 'status' | 'appliedAt'> &
    { appliedAt?: string; status?: LocalPendingVerification['status'] },
): LocalPendingVerification => {
  const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = String(payload.email || '').toLowerCase().trim();
  // Replace prior pending/rejected for same email (keep verified history)
  const withoutSamePending = readAll().filter(
    (item) =>
      !(item.email.toLowerCase() === email && (item.status === 'pending' || item.status === 'rejected')),
  );
  const entry: LocalPendingVerification = {
    id,
    verificationId: id,
    status: payload.status || 'pending',
    appliedAt: payload.appliedAt || new Date().toISOString(),
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    course: payload.course,
    college: payload.college,
    location: payload.location,
    dateOfBirth: payload.dateOfBirth,
    year: payload.year,
    fileName: payload.fileName,
    documentDataUrl: payload.documentDataUrl,
    mimeType: payload.mimeType,
    compressed: payload.compressed,
  };
  writeAll([entry, ...withoutSamePending]);
  return entry;
};

export const updateLocalVerificationStatus = (
  id: string,
  status: 'verified' | 'rejected',
): void => {
  const next = readAll().map((item) =>
    item.id === id || item.verificationId === id ? { ...item, status } : item,
  );
  writeAll(next);
};

export const getLocalVerificationDocument = (id: string): LocalPendingVerification | null => {
  return readAll().find((item) => item.id === id || item.verificationId === id) || null;
};

/** Latest verification row for an email (any status). */
export const getLatestVerificationForEmail = (
  email?: string | null,
): LocalPendingVerification | null => {
  const key = String(email || '')
    .toLowerCase()
    .trim();
  if (!key) return null;
  const rows = readAll().filter((item) => item.email.toLowerCase() === key);
  if (!rows.length) return null;
  // Prefer verified > pending > rejected by recency within group
  const rank = (s: string) => (s === 'verified' ? 3 : s === 'pending' ? 2 : 1);
  rows.sort((a, b) => {
    const r = rank(b.status) - rank(a.status);
    if (r !== 0) return r;
    return String(b.appliedAt).localeCompare(String(a.appliedAt));
  });
  return rows[0];
};

export const getStudentVerificationState = (email?: string | null): StudentVerificationState => {
  const row = getLatestVerificationForEmail(email);
  if (!row) return 'none';
  if (row.status === 'verified') return 'verified';
  if (row.status === 'pending') return 'pending';
  if (row.status === 'rejected') return 'rejected';
  return 'none';
};

/** True if student already submitted and cannot upload again (pending or verified). */
export const hasActiveSubmission = (email?: string | null): boolean => {
  const s = getStudentVerificationState(email);
  return s === 'pending' || s === 'verified';
};

/** Can open upload form: never submitted or rejected. */
export const canSubmitCollegeId = (email?: string | null): boolean => {
  const s = getStudentVerificationState(email);
  return s === 'none' || s === 'rejected';
};

/**
 * Apply admin decision to local store by email so the student UI updates
 * after shared-queue approve/reject (cross-browser).
 */
export const applyVerificationStatusByEmail = (
  email: string | null | undefined,
  status: 'verified' | 'rejected' | 'pending',
  meta?: Partial<LocalPendingVerification>,
): void => {
  const key = String(email || '')
    .toLowerCase()
    .trim();
  if (!key) return;
  const all = readAll();
  let found = false;
  const next = all.map((item) => {
    if (item.email.toLowerCase() === key) {
      found = true;
      return { ...item, status, ...meta };
    }
    return item;
  });
  if (!found) {
    const id = `sync-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    next.unshift({
      id,
      verificationId: meta?.verificationId || id,
      name: meta?.name || 'Student',
      email: email || key,
      status,
      appliedAt: meta?.appliedAt || new Date().toISOString(),
      fileName: meta?.fileName,
      documentDataUrl: meta?.documentDataUrl,
      mimeType: meta?.mimeType,
      compressed: meta?.compressed,
    });
  }
  writeAll(next);
};

/** Pull status from shared college-verifications queue into local store. */
export async function syncVerificationFromServer(
  email?: string | null,
): Promise<StudentVerificationState> {
  const key = String(email || '')
    .toLowerCase()
    .trim();
  if (!key) return getStudentVerificationState(email);

  try {
    const { fetchVerificationStatusForEmail } = await import('./collegeVerificationApi');
    const { status, row } = await fetchVerificationStatusForEmail(key);
    if (status === 'none') {
      return getStudentVerificationState(email);
    }
    applyVerificationStatusByEmail(key, status, {
      verificationId: row?.verificationId || row?.id,
      name: row?.name,
      fileName: row?.fileName,
      appliedAt: row?.appliedAt,
      documentDataUrl: row?.documentDataUrl,
      mimeType: row?.mimeType,
      compressed: row?.compressed,
    });
    return status;
  } catch {
    return getStudentVerificationState(email);
  }
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Clock, ShieldAlert, Upload, ChevronDown, ChevronUp } from 'lucide-react';
import { getAuthUser, saveAuthSession, getAuthToken } from '../utils/rbacAuth';
import { getStoredUserProfile } from '../utils/userProfile';
import {
  canSubmitCollegeId,
  getLatestVerificationForEmail,
  getStudentVerificationState,
  type StudentVerificationState,
} from '../utils/pendingVerificationStore';

const BENEFITS = [
  'Verified badge on profile & dashboard',
  'Stronger trust for internships & campus drives',
  'Access to student-only premium features after approval',
  'Priority when recruiters filter verified students',
];

export function VerificationStatusCard() {
  const profile = getStoredUserProfile();
  const auth = getAuthUser();
  const email = auth?.email || profile?.email || '';
  const [state, setState] = useState<StudentVerificationState>(() => getStudentVerificationState(email));
  const [open, setOpen] = useState(false);

  const refresh = () => {
    const next = getStudentVerificationState(email);
    setState(next);
    // Keep session in sync when admin approved on same browser
    if (auth && next === 'verified' && auth.verificationStatus !== 'verified') {
      saveAuthSession(getAuthToken() || 'session', { ...auth, verificationStatus: 'verified' });
    }
    if (auth && next === 'pending' && auth.verificationStatus !== 'pending') {
      saveAuthSession(getAuthToken() || 'session', { ...auth, verificationStatus: 'pending' });
    }
  };

  useEffect(() => {
    refresh();
    const onUpd = () => refresh();
    window.addEventListener('eduroute:verification-updated', onUpd);
    window.addEventListener('focus', onUpd);
    return () => {
      window.removeEventListener('eduroute:verification-updated', onUpd);
      window.removeEventListener('focus', onUpd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const row = getLatestVerificationForEmail(email);
  const canUpload = canSubmitCollegeId(email);

  const badge =
    state === 'verified'
      ? {
          label: 'Verified',
          sub: 'College ID approved by admin',
          cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30',
          Icon: BadgeCheck,
        }
      : state === 'pending'
        ? {
            label: 'Under review',
            sub: row?.fileName ? `Submitted: ${row.fileName}` : 'ID submitted — awaiting admin',
            cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
            Icon: Clock,
          }
        : state === 'rejected'
          ? {
              label: 'Not verified',
              sub: 'Previous ID was rejected — you can upload again',
              cls: 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30',
              Icon: ShieldAlert,
            }
          : {
              label: 'Not verified',
              sub: 'Upload college ID to get a Verified badge',
              cls: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-[var(--border-default)]',
              Icon: ShieldAlert,
            };

  return (
    <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${badge.cls}`}
          >
            <badge.Icon className="h-3.5 w-3.5" />
            {badge.label}
            {state === 'verified' ? ' ✓' : ''}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--text-primary)]">College verification</p>
            <p className="truncate text-xs text-[var(--text-muted)]">{badge.sub}</p>
          </div>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
        )}
      </button>

      {open && (
        <div className="mt-4 space-y-3 border-t border-[var(--border-default)] pt-4">
          {state === 'pending' && (
            <p className="text-sm text-[var(--text-secondary)]">
              You already submitted your college ID. You cannot upload another until admin approves or rejects it.
            </p>
          )}
          {state === 'verified' && (
            <p className="text-sm text-[var(--text-secondary)]">
              Your profile is verified. Recruiters and the platform can trust your student status.
            </p>
          )}
          {(state === 'none' || state === 'rejected') && (
            <>
              <p className="text-sm text-[var(--text-secondary)]">
                {state === 'rejected'
                  ? 'Upload a clearer college ID or admission letter.'
                  : 'You skipped ID upload at signup. Verify now to unlock benefits.'}
              </p>
              <ul className="space-y-1">
                {BENEFITS.map((b) => (
                  <li key={b} className="flex gap-2 text-xs text-[var(--text-muted)]">
                    <span className="font-bold text-emerald-500">✓</span> {b}
                  </li>
                ))}
              </ul>
              {canUpload && (
                <Link
                  to="/verify-college"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload college ID
                </Link>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

export default VerificationStatusCard;

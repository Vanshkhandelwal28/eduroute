import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveAuthSession, getAuthUser, getAuthToken } from '../../utils/rbacAuth';
import { getStoredUserProfile } from '../../utils/userProfile';
import { apiSubmitCollegeVerification } from '../../utils/authApi';
import {
  addLocalPendingVerification,
  canSubmitCollegeId,
  getStudentVerificationState,
  hasActiveSubmission,
} from '../../utils/pendingVerificationStore';
import { compressImageToDataUrl, compressUploadFile } from '../../utils/imageCompress';
import { pushUserData } from '../../utils/userDataStore';
import { motion } from 'framer-motion';
import { Upload, CheckCircle2, Info, ChevronRight, ShieldCheck, Lock } from 'lucide-react';

const BENEFITS = [
  'Verified student badge on your profile & dashboard',
  'Priority visibility for internships and campus drives',
  'Unlock premium student features after admin approval',
  'Build trust with colleges and recruiters',
];

export const VerifyCollege = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'pending' | 'locked'>('idle');
  const [error, setError] = useState('');
  const [storedForAdmin, setStoredForAdmin] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const storedProfile = getStoredUserProfile();
  const authUser = getAuthUser();
  const email = authUser?.email || storedProfile?.email || '';

  useEffect(() => {
    const state = getStudentVerificationState(email);
    if (state === 'pending' || state === 'verified') {
      setStatus('locked');
    }
  }, [email]);

  const completeVerification = (verificationStatus: string = 'pending') => {
    const existing = getAuthUser();
    const profile = getStoredUserProfile();
    const token = getAuthToken() || localStorage.getItem('eduroute:auth-token') || 'pending-verification-session';

    saveAuthSession(token, {
      id: existing?.id || (profile?.email ? `pending-${profile.email}` : `pending-${Date.now()}`),
      name: existing?.name || profile?.name || 'Student',
      email: existing?.email || profile?.email || 'student@eduroute.app',
      role: 'student',
      verificationStatus,
    });

    navigate('/onboarding', { replace: true });
  };

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) return;
    if (!canSubmitCollegeId(email)) {
      setError('You already submitted a college ID. Wait for admin review or check your dashboard badge.');
      setStatus('locked');
      return;
    }
    setError('');
    setStatus('uploading');
    setStoredForAdmin(false);

    const name = authUser?.name || storedProfile?.name || 'Student';
    const studentEmail = email || 'student@eduroute.app';

    let uploadFile = file;
    let documentDataUrl = '';
    let mimeType = file.type || 'image/jpeg';
    let fileName = file.name;

    try {
      // Compress images; PDFs pass through size-checked
      uploadFile = await compressUploadFile(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.65,
        maxBytes: 800_000,
      });
      fileName = uploadFile.name;
      mimeType = uploadFile.type || mimeType;
      documentDataUrl = await compressImageToDataUrl(file, 1200, 0.65).catch(async () => {
        // fallback: read compressed file
        return new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result || ''));
          r.onerror = () => reject(new Error('read failed'));
          r.readAsDataURL(uploadFile);
        });
      });
    } catch (compressErr) {
      console.warn('Compress failed, using original', compressErr);
      documentDataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result || ''));
        r.onerror = () => reject(new Error('read failed'));
        r.readAsDataURL(file);
      });
    }

    let backendOk = false;
    if (getAuthToken()) {
      try {
        await apiSubmitCollegeVerification(uploadFile);
        backendOk = true;
      } catch (uploadError) {
        console.warn('Backend college verification failed, using local queue', uploadError);
      }
    }

    const entry = addLocalPendingVerification({
      name,
      email: studentEmail,
      fileName,
      documentDataUrl,
      mimeType,
      course: (storedProfile as any)?.course,
      college: (storedProfile as any)?.college,
      location: (storedProfile as any)?.location,
      phone: (storedProfile as any)?.phone,
      compressed: true,
    });
    setStoredForAdmin(true);

    // Also push JSON blob to Neon/Render user-data (best effort)
    void pushUserData('college-verification', {
      verificationId: entry.verificationId,
      name,
      email: studentEmail,
      fileName,
      mimeType,
      documentDataUrl,
      status: 'pending',
      appliedAt: entry.appliedAt,
      compressed: true,
    }).catch(() => undefined);

    if (!backendOk && !getAuthToken()) {
      setError('Saved for admin review locally. Log in as a student before upload to also store on the server.');
    }

    setStatus('pending');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">College ID Verification</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Upload your college ID card or admission letter. Photos are compressed before storage.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 py-8 px-6 shadow-xl rounded-3xl border border-slate-100 dark:border-slate-800"
        >
          {status === 'locked' && (
            <div className="py-8 text-center space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center">
                {hasActiveSubmission(email) && getStudentVerificationState(email) === 'verified' ? (
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                ) : (
                  <Lock className="h-8 w-8 text-indigo-600" />
                )}
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {getStudentVerificationState(email) === 'verified'
                  ? 'You are verified'
                  : 'ID already submitted'}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {getStudentVerificationState(email) === 'verified'
                  ? 'Admin approved your college ID. Your profile shows a Verified badge.'
                  : 'Your college ID is under admin review. You cannot submit another until a decision is made.'}
              </p>
              <button
                type="button"
                onClick={() => navigate('/dashboard', { replace: true })}
                className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold"
              >
                Go to Dashboard
              </button>
            </div>
          )}

          {status === 'idle' && (
            <form className="space-y-6" onSubmit={handleUpload}>
              <button
                type="button"
                className="w-full border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-12 text-center hover:border-indigo-400 transition-colors cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  if (event.dataTransfer.files[0]) setFile(event.dataTransfer.files[0]);
                }}
              >
                <Upload className="mx-auto h-12 w-12 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                  {file ? file.name : 'Drag and drop your ID card here, or click to browse'}
                </p>
                <p className="mt-1 text-xs text-slate-400">Image or PDF · auto-compressed</p>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,.pdf"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />

              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-4 text-left">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" /> Benefits of verification
                </p>
                <ul className="space-y-1.5">
                  {BENEFITS.map((b) => (
                    <li key={b} className="text-xs text-slate-600 dark:text-slate-400 flex gap-2">
                      <span className="text-emerald-500 font-bold">✓</span> {b}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/40 p-4 rounded-xl flex gap-3">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                  ID is compressed, stored for admin review (Admin → Pending Approvals), and synced to the server when available.
                </p>
              </div>
              {error && <p className="text-sm text-rose-600" role="alert">{error}</p>}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={!file}
                  className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-xl font-bold disabled:opacity-50 hover:bg-indigo-700 transition-all active:scale-95"
                >
                  Submit for Verification
                </button>
                <button
                  type="button"
                  onClick={() => completeVerification('none')}
                  className="flex-1 py-3 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                >
                  Skip for Now
                </button>
              </div>
            </form>
          )}

          {status === 'uploading' && (
            <div className="py-12 text-center">
              <div className="mx-auto h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
              <p className="text-slate-600 dark:text-slate-300 font-medium">Compressing & storing your ID…</p>
            </div>
          )}

          {status === 'pending' && (
            <div className="py-8 text-center">
              <div className="mx-auto h-20 w-20 bg-green-100 dark:bg-green-950 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Application Received!</h3>
              <p className="mt-2 text-slate-600 dark:text-slate-400 mb-2">
                Your verification is pending. Admins can review your ID under Pending Approvals.
              </p>
              {storedForAdmin && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mb-6">
                  Compressed ID stored for admin review (local + server when available).
                </p>
              )}
              <button
                onClick={() => completeVerification('pending')}
                className="inline-flex items-center px-8 py-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl font-bold hover:bg-slate-800 transition-all group"
              >
                Continue <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default VerifyCollege;

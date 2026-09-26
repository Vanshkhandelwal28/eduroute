import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';

import { apiRegisterUser } from '../../utils/authApi';
import { saveAuthSession } from '../../utils/rbacAuth';
import { parseGoogleCredential, saveUserProfile } from '../../utils/userProfile';
import { isAuthDbConfigError, localDemoRegister } from '../../utils/localDemoAuth';
import { handleSocialAuth } from '../../utils/socialAuth';
import { isSupabaseConfigured, supabaseSignUp } from '../../utils/supabaseAuth';
import { ThemeToggle } from '../../components/ThemeToggle';
import { useTheme } from '../../contexts/ThemeContext';

const GOOGLE_CLIENT_SCRIPT_ID = 'google-identity-services';
const MIN_PASSWORD_LENGTH = 8;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SignupForm = { name: string; email: string; password: string };
type FormErrors = Partial<Record<keyof SignupForm, string>>;

const loadGoogleScript = () => {
  if (document.getElementById(GOOGLE_CLIENT_SCRIPT_ID)) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.id = GOOGLE_CLIENT_SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Unable to load Google Identity Services script.'));
    document.head.appendChild(script);
  });
};

const validateForm = (formData: SignupForm): FormErrors => {
  const errors: FormErrors = {};
  if (!formData.name.trim()) errors.name = 'Full name is required.';
  if (!formData.email.trim()) errors.email = 'Email is required.';
  else if (!EMAIL_REGEX.test(formData.email.trim())) errors.email = 'Please enter a valid email address.';
  if (!formData.password) errors.password = 'Password is required.';
  else if (formData.password.length < MIN_PASSWORD_LENGTH)
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  return errors;
};

export const Signup = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [formData, setFormData] = useState<SignupForm>({ name: '', email: '', password: '' });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [demoHint, setDemoHint] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [socialMsg, setSocialMsg] = useState<string | null>(null);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleClientId = useMemo(
    () =>
      import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ||
      '234757313390-8ihis6sl6h1635ievvaitfcjjndqv1je.apps.googleusercontent.com',
    [],
  );

  const goToCollegeIdUpload = () => navigate('/verify-college', { replace: true });

  useEffect(() => {
    if (!googleClientId) {
      setGoogleError('Google sign up is not configured yet.');
      return;
    }
    let isMounted = true;
    const setupGoogleButton = async () => {
      try {
        await loadGoogleScript();
        if (!isMounted || !window.google?.accounts?.id || !googleButtonRef.current) return;
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: ({ credential }) => {
            if (!credential) {
              setGoogleError('Google sign up was canceled. Please try again.');
              return;
            }
            const googleProfile = parseGoogleCredential(credential);
            if (!googleProfile) {
              setGoogleError('Unable to read your Google profile. Please use email sign up.');
              return;
            }
            saveUserProfile(googleProfile);
            saveAuthSession(credential, {
              id: `google-${googleProfile.email}`,
              name: googleProfile.name,
              email: googleProfile.email,
              avatar: googleProfile.avatar,
              role: 'student',
              verificationStatus: 'pending',
            });
            goToCollegeIdUpload();
          },
        });
        googleButtonRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          type: 'icon',
          size: 'large',
          shape: 'circle',
          theme: isDark ? 'filled_black' : 'outline',
        });
      } catch (error) {
        console.error('[Signup] Google button setup failed:', error);
        if (isMounted) setGoogleError('Unable to load Google sign up right now.');
      }
    };
    setupGoogleButton();
    return () => {
      isMounted = false;
    };
  }, [googleClientId, navigate, isDark]);

  const handleInputChange = (field: keyof SignupForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    setApiError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setApiError(null);
    setDemoHint(false);
    const errors = validateForm(formData);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setIsSubmitting(true);
    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
    };
    try {
      // 1) Supabase (production)
      if (isSupabaseConfigured) {
        await supabaseSignUp(payload);
        goToCollegeIdUpload();
        return;
      }

      // 2) MySQL / Go API
      let token: string;
      let user: { id: string; name?: string; email?: string; verificationStatus?: string };
      try {
        const registerResponse = await apiRegisterUser(payload);
        if (!registerResponse.token || !registerResponse.user) {
          throw new Error('Registration succeeded but no session was returned.');
        }
        token = registerResponse.token;
        user = registerResponse.user;
      } catch (apiErr) {
        const msg = apiErr instanceof Error ? apiErr.message : '';
        if (isAuthDbConfigError(msg)) {
          const demo = localDemoRegister(payload);
          token = demo.token;
          user = demo.user;
          setDemoHint(true);
        } else throw apiErr;
      }
      saveUserProfile({ name: payload.name, email: payload.email });
      saveAuthSession(token, {
        id: String(user.id),
        name: user.name || payload.name,
        email: user.email || payload.email,
        role: 'student',
        verificationStatus: user.verificationStatus || 'pending',
      });
      goToCollegeIdUpload();
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Signup failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldCls = isDark
    ? 'border-white/10 bg-slate-800/80 text-white'
    : 'border-slate-200 bg-white text-slate-900';
  const cardCls = isDark
    ? 'border-white/15 bg-slate-900/95 shadow-black/40'
    : 'border-slate-200 bg-white shadow-slate-300/40';
  const muted = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`relative min-h-screen overflow-hidden ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'}`}>
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=2000&q=80')" }}
      />
      <div className={`absolute inset-0 ${isDark ? 'bg-gradient-to-br from-indigo-950/90 via-slate-950/85 to-violet-950/80' : 'bg-gradient-to-br from-violet-100/92 via-white/90 to-indigo-100/85'}`} />

      <div className="relative z-20 flex items-center justify-between px-6 py-5 md:px-10">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-black text-white shadow-lg shadow-violet-500/30">E</div>
          <span className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>EDUROUTE</span>
        </Link>
        <ThemeToggle className={isDark ? '!border-white/20' : '!border-slate-300'} />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-88px)] max-w-6xl flex-col items-center gap-10 px-4 pb-12 pt-4 lg:flex-row lg:items-center lg:justify-between lg:gap-16 lg:px-10">
        <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} className="hidden max-w-lg flex-1 lg:block">
          <p className={`mb-3 text-xs font-semibold uppercase tracking-[0.2em] ${isDark ? 'text-violet-300/90' : 'text-violet-600'}`}>Your education · Your path · Your future</p>
          <h1 className={`text-4xl font-black leading-tight md:text-5xl ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Join <span className="bg-gradient-to-r from-violet-500 to-indigo-500 bg-clip-text text-transparent">EduRoute</span>
          </h1>
          <p className={`mt-4 text-base leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            Create your account, verify your college ID, and start building skills and applying to internships.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className={`rounded-3xl border p-7 shadow-2xl backdrop-blur-xl md:p-8 ${cardCls}`}>
            <div className="mb-6 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-black text-white">E</div>
              <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>EDUROUTE</span>
            </div>
            <h2 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Create account</h2>
            <p className={`mt-1 text-sm ${muted}`}>
              {isSupabaseConfigured ? 'Secure signup (Supabase)' : 'Start your learning journey today'}
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
              <div>
                <label className={`mb-1.5 block text-xs font-medium ${muted}`}>Full name</label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input type="text" autoComplete="name" placeholder="Your name" className={`w-full rounded-xl border py-3 pl-10 pr-3 text-sm outline-none ring-violet-500/40 focus:ring-2 placeholder:text-slate-500 ${fieldCls}`} value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} />
                </div>
                {formErrors.name && <p className="mt-1 text-xs text-red-400">{formErrors.name}</p>}
              </div>
              <div>
                <label className={`mb-1.5 block text-xs font-medium ${muted}`}>Email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input type="email" autoComplete="email" placeholder="you@example.com" className={`w-full rounded-xl border py-3 pl-10 pr-3 text-sm outline-none ring-violet-500/40 focus:ring-2 placeholder:text-slate-500 ${fieldCls}`} value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} />
                </div>
                {formErrors.email && <p className="mt-1 text-xs text-red-400">{formErrors.email}</p>}
              </div>
              <div>
                <label className={`mb-1.5 block text-xs font-medium ${muted}`}>Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input type={showPass ? 'text' : 'password'} autoComplete="new-password" placeholder="Min 8 characters" className={`w-full rounded-xl border py-3 pl-10 pr-10 text-sm outline-none ring-violet-500/40 focus:ring-2 placeholder:text-slate-500 ${fieldCls}`} value={formData.password} onChange={(e) => handleInputChange('password', e.target.value)} />
                  <button type="button" onClick={() => setShowPass((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">{showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                </div>
                {formErrors.password && <p className="mt-1 text-xs text-red-400">{formErrors.password}</p>}
              </div>
              {apiError && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{apiError}</p>}
              {demoHint && <p className="text-xs text-amber-500">DB not configured — account saved in this browser (demo mode).</p>}
              <button type="submit" disabled={isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-600/30 disabled:opacity-60">
                {isSubmitting ? 'Creating account…' : 'Sign Up'}{!isSubmitting && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className={`h-px flex-1 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
              <span className={`text-xs ${muted}`}>OR</span>
              <div className={`h-px flex-1 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
            </div>

            <div className="flex items-center justify-center gap-3">
              <div ref={googleButtonRef} className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl" title="Continue with Google" />
              <button
                type="button"
                onClick={() => handleSocialAuth('github', 'signup', (msg) => setSocialMsg(msg))}
                className={`flex h-11 w-11 items-center justify-center rounded-xl border transition hover:scale-105 ${isDark ? 'border-white/10 bg-slate-800/80 text-white' : 'border-slate-200 bg-white text-slate-900'}`}
                title="Continue with GitHub"
                aria-label="Sign up with GitHub"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.26.82-.577 0-.285-.01-1.04-.016-2.04-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.757-1.333-1.757-1.09-.745.083-.73.083-.73 1.205.085 1.84 1.238 1.84 1.238 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.305.76-1.605-2.665-.303-5.467-1.333-5.467-5.93 0-1.31.468-2.382 1.236-3.222-.124-.303-.536-1.523.117-3.176 0 0 1.008-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.29-1.552 3.297-1.23 3.297-1.23.655 1.653.243 2.873.12 3.176.77.84 1.235 1.912 1.235 3.222 0 4.61-2.807 5.624-5.48 5.92.43.37.814 1.102.814 2.222 0 1.606-.015 2.898-.015 3.293 0 .32.216.694.825.576C20.565 21.796 24 17.297 24 12c0-6.63-5.37-12-12-12z" /></svg>
              </button>
              <button
                type="button"
                onClick={() => handleSocialAuth('linkedin', 'signup', (msg) => setSocialMsg(msg))}
                className={`flex h-11 w-11 items-center justify-center rounded-xl border text-sm font-bold text-[#0A66C2] transition hover:scale-105 ${isDark ? 'border-white/10 bg-slate-800/80' : 'border-slate-200 bg-white'}`}
                title="Continue with LinkedIn"
                aria-label="Sign up with LinkedIn"
              >
                in
              </button>
            </div>
            {googleError && <p className="mt-3 text-center text-xs text-amber-500">{googleError}</p>}
            {socialMsg && <p className="mt-3 text-center text-xs text-amber-500">{socialMsg}</p>}

            <p className={`mt-6 text-center text-sm ${muted}`}>
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-violet-500 hover:text-violet-400">Sign in</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Signup;

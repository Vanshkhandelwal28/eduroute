import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Code2,
  Database,
  FileUp,
  GraduationCap,
  Loader2,
  Shield,
  Sparkles,
  Wand2,
} from 'lucide-react';
import {
  GAP_QUESTIONS,
  INTEREST_OPTIONS,
  InterestTrack,
  GapAnswer,
  markOnboardingSkipped,
  saveGapResults,
  saveInterests,
} from '../../utils/onboardingStore';
import { extractSkillsFromText, saveCustomCareer } from '../../utils/customCareer';
import { saveSkillGap } from '../../services/buddyApi';
import { getAuthUser } from '../../utils/rbacAuth';

type Step = 'interests' | 'gaps' | 'custom_role' | 'custom_skills';

const iconFor = (icon: 'software' | 'cyber' | 'data') => {
  if (icon === 'software') return <Code2 className="h-8 w-8 text-indigo-600" />;
  if (icon === 'cyber') return <Shield className="h-8 w-8 text-violet-600" />;
  return <Database className="h-8 w-8 text-emerald-600" />;
};

export const OnboardingAnalyze = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('interests');
  const [selected, setSelected] = useState<InterestTrack[]>([]);
  const [answers, setAnswers] = useState<Record<string, 'yes' | 'no'>>({});
  const [saving, setSaving] = useState(false);
  const [customRole, setCustomRole] = useState('');
  const [skillText, setSkillText] = useState('');
  const [cvSkills, setCvSkills] = useState<string[]>([]);
  const [cvFileName, setCvFileName] = useState('');
  const [cvPreview, setCvPreview] = useState('');
  const [customError, setCustomError] = useState('');
  const [pathStatus, setPathStatus] = useState('');

  const isCustomOnly = selected.length === 1 && selected[0] === 'custom';

  const gapQuestions = useMemo(() => {
    const tracks = selected.filter((t) => t !== 'custom');
    if (!tracks.length) return [];
    const map = new Map<string, { id: string; question: string; skill: string }>();
    tracks.forEach((track) => {
      (GAP_QUESTIONS[track] || []).forEach((q) => {
        if (!map.has(q.id)) map.set(q.id, q);
      });
    });
    return Array.from(map.values()).slice(0, 6);
  }, [selected]);

  const answeredCount = Object.keys(answers).length;
  const canFinishGaps = gapQuestions.length > 0 && answeredCount === gapQuestions.length;
  const goDashboard = () => navigate('/dashboard', { replace: true });

  const toggleInterest = (id: InterestTrack) => {
    setSelected((prev) => {
      if (id === 'custom') return prev.includes('custom') ? [] : ['custom'];
      const without = prev.filter((x) => x !== 'custom');
      return without.includes(id) ? without.filter((x) => x !== id) : [...without, id];
    });
  };

  const finishToBuddy = async (
    gapAnswers: GapAnswer[],
    missingSkills: string[],
    interests: InterestTrack[],
  ) => {
    setSaving(true);
    try {
      saveInterests(interests);
      saveGapResults(gapAnswers, missingSkills);
      const user = getAuthUser();
      if (user?.id && missingSkills.length) {
        try {
          await saveSkillGap({ userId: user.id, missingSkills });
        } catch {
          /* local is enough */
        }
      }
    } finally {
      setSaving(false);
      goDashboard();
    }
  };

  const parsedSkills = useMemo(
    () =>
      skillText
        .split(/[,|/;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 40),
    [skillText],
  );

  const onCvFile = async (file: File | null) => {
    setCvFileName(file?.name || '');
    setCvSkills([]);
    setCvPreview('');
    if (!file) return;
    try {
      if (file.type.startsWith('text/') || /\.(txt|md|csv|json)$/i.test(file.name)) {
        const text = await file.text();
        setCvPreview(text.slice(0, 4000));
        setCvSkills(extractSkillsFromText(text));
        return;
      }
      const buf = await file.arrayBuffer();
      const raw = new TextDecoder('utf-8', { fatal: false }).decode(buf);
      const cleaned = raw.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, ' ').replace(/\s+/g, ' ');
      setCvPreview(cleaned.slice(0, 4000));
      const extracted = extractSkillsFromText(cleaned);
      setCvSkills(extracted);
      if (!extracted.length) {
        setCustomError('Could not auto-read skills from this file. Paste skills below or use a .txt CV.');
      } else setCustomError('');
    } catch {
      setCustomError('Could not read that file. Try .txt or paste skills.');
    }
  };

  const handleCustomFinish = async () => {
    setCustomError('');
    const role = customRole.trim();
    if (!role) {
      setCustomError('Please enter your target role (e.g. SDE 2).');
      return;
    }
    const skills = [...parsedSkills];
    if (!skills.length && !cvSkills.length) {
      setCustomError('Add skills you already have, or upload a CV.');
      return;
    }
    setSaving(true);
    setPathStatus('Building your career path with AI…');
    try {
      saveCustomCareer({ role, skills, cvSkills, missingSkills: [] });
      let nodes: any[] | null = null;
      try {
        const res = await fetch('/api/career-path', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role,
            skills,
            cvSkills,
            cvText: cvPreview.slice(0, 3000),
            userId: getAuthUser()?.email || getAuthUser()?.id || 'demo',
          }),
        });
        const data = await res.json();
        if (data?.ok && Array.isArray(data.nodes) && data.nodes.length >= 3) {
          nodes = data.nodes;
          setPathStatus(
            data.source === 'template'
              ? 'AI offline — used role template'
              : `Path designed via ${data.provider || data.source}`,
          );
        }
      } catch {
        setPathStatus('AI unreachable — template path will load on Profile');
      }
      if (nodes) {
        try {
          const email = (getAuthUser()?.email || 'guest').trim().toLowerCase();
          const key = `eduroute:learning-path-v2:${email}`;
          const withStatus = nodes.map((n, i) => ({
            ...n,
            status: i === 0 ? 'current' : 'locked',
            href:
              n.href ||
              `/ai-course-designer?interest=${encodeURIComponent((n.skills && n.skills[0]) || n.short || role)}&title=${encodeURIComponent(n.title)}&nodeId=${encodeURIComponent(n.id)}&auto=1`,
          }));
          localStorage.setItem(
            key,
            JSON.stringify({
              nodes: withStatus,
              track: role,
              source: 'ai',
              updatedAt: new Date().toISOString(),
            }),
          );
          window.dispatchEvent(new CustomEvent('eduroute:learning-path-updated'));
        } catch {
          /* ignore */
        }
      }
      goDashboard();
    } finally {
      setSaving(false);
    }
  };

  const progressPct =
    step === 'interests' ? 40 : step === 'custom_role' ? 65 : step === 'custom_skills' ? 90 : 100;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f8f9ff] text-slate-900">
      <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold text-slate-800">EduRoute</span>
        </div>
        <span className="text-xs font-semibold text-slate-500">{progressPct}%</span>
      </header>

      <main className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-4 pb-16 pt-4">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-4 py-1.5 text-sm font-semibold text-indigo-600">
          <Sparkles className="h-4 w-4" /> Tell us about yourself
        </div>

        <AnimatePresence mode="wait">
          {step === 'interests' && (
            <motion.div key="interests" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="w-full">
              <h1 className="text-center text-3xl font-black tracking-tight sm:text-4xl">Which one are you interested in?</h1>
              <p className="mx-auto mt-3 max-w-xl text-center text-sm text-slate-500">Pick a track — or Custom for any role + skills / CV.</p>
              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {INTEREST_OPTIONS.map((opt) => {
                  const active = selected.includes(opt.id);
                  return (
                    <button key={opt.id} type="button" onClick={() => toggleInterest(opt.id)}
                      className={`relative rounded-3xl border-2 p-5 text-left transition ${active ? 'border-indigo-500 bg-white shadow-lg' : `border-transparent bg-gradient-to-br ${opt.accent}`}`}>
                      {active && (
                        <span className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      )}
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
                        {opt.id === 'custom' ? <Wand2 className="h-8 w-8 text-amber-600" /> : iconFor(opt.icon)}
                      </div>
                      <h3 className="text-base font-bold">{opt.title}</h3>
                      <p className="mt-1 text-xs text-slate-500">{opt.description}</p>
                    </button>
                  );
                })}
              </div>
              <div className="mt-10 flex flex-wrap justify-center gap-3">
                <button type="button" disabled={!selected.length}
                  onClick={() => (isCustomOnly ? setStep('custom_role') : setStep('gaps'))}
                  className="rounded-2xl bg-indigo-600 px-8 py-3 text-sm font-bold text-white disabled:opacity-50">
                  Continue →
                </button>
                <button type="button" onClick={() => { markOnboardingSkipped(); goDashboard(); }}
                  className="rounded-2xl border border-slate-200 bg-white px-8 py-3 text-sm font-bold text-slate-600">
                  Skip for now
                </button>
              </div>
            </motion.div>
          )}

          {step === 'custom_role' && (
            <motion.div key="custom_role" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="w-full max-w-lg">
              <h1 className="text-center text-3xl font-black">What role are you aiming for?</h1>
              <p className="mt-3 text-center text-sm text-slate-500">e.g. SDE 2, DevOps Engineer, ML Engineer</p>
              <input className="mt-8 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/30"
                placeholder="e.g. SDE 2" value={customRole} onChange={(e) => setCustomRole(e.target.value)} autoFocus />
              {customError && <p className="mt-3 text-center text-xs font-bold text-rose-600">{customError}</p>}
              <div className="mt-10 flex justify-center gap-3">
                <button type="button" onClick={() => setStep('interests')} className="rounded-2xl border border-slate-200 px-6 py-3 text-sm font-bold">Back</button>
                <button type="button" disabled={!customRole.trim()} onClick={() => { setCustomError(''); setStep('custom_skills'); }}
                  className="rounded-2xl bg-indigo-600 px-8 py-3 text-sm font-bold text-white disabled:opacity-50">Quick skill check →</button>
              </div>
            </motion.div>
          )}

          {step === 'custom_skills' && (
            <motion.div key="custom_skills" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="w-full max-w-lg">
              <h1 className="text-center text-3xl font-black">Quick skill check</h1>
              <p className="mt-3 text-center text-sm text-slate-500">
                For <span className="font-bold text-indigo-600">{customRole}</span> — skills you already have + optional CV.
              </p>
              <textarea className="mt-8 min-h-[100px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30"
                placeholder="e.g. backend, jwt, golang, restapi" value={skillText} onChange={(e) => setSkillText(e.target.value)} />
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white/80 p-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500"><FileUp className="h-4 w-4" /> Upload CV (optional)</div>
                <input type="file" accept=".txt,.md,.csv,.json,.pdf,.doc,.docx,text/plain"
                  className="mt-3 block w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:font-bold file:text-indigo-700"
                  onChange={(e) => void onCvFile(e.target.files?.[0] || null)} />
                {cvFileName && (
                  <p className="mt-2 text-[11px] text-slate-500">
                    {cvFileName}{cvSkills.length ? ` · ${cvSkills.length} skill(s): ${cvSkills.slice(0, 8).join(', ')}` : ''}
                  </p>
                )}
              </div>
              {(parsedSkills.length > 0 || cvSkills.length > 0) && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {[...parsedSkills, ...cvSkills].map((s) => (
                    <span key={s} className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">{s}</span>
                  ))}
                </div>
              )}
              {customError && <p className="mt-3 text-center text-xs font-bold text-rose-600">{customError}</p>}
              {pathStatus && <p className="mt-2 text-center text-xs font-semibold text-indigo-600">{pathStatus}</p>}
              <div className="mt-10 flex justify-center gap-3">
                <button type="button" disabled={saving} onClick={() => setStep('custom_role')} className="rounded-2xl border border-slate-200 px-6 py-3 text-sm font-bold">Back</button>
                <button type="button" disabled={saving} onClick={() => void handleCustomFinish()}
                  className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-8 py-3 text-sm font-bold text-white disabled:opacity-60">
                  {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Designing path…</> : <><Sparkles className="h-4 w-4" /> Create my path</>}
                </button>
              </div>
            </motion.div>
          )}

          {step === 'gaps' && (
            <motion.div key="gaps" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="w-full max-w-2xl">
              <h1 className="text-center text-3xl font-black">Quick skill check</h1>
              <div className="mt-8 space-y-4">
                {gapQuestions.map((q) => (
                  <div key={q.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm font-semibold">{q.question}</p>
                    <div className="mt-4 flex gap-3">
                      {(['yes', 'no'] as const).map((val) => (
                        <button key={val} type="button" onClick={() => setAnswers((p) => ({ ...p, [q.id]: val }))}
                          className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold capitalize ${
                            answers[q.id] === val
                              ? val === 'yes' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-rose-400 bg-rose-50 text-rose-700'
                              : 'border-slate-200 bg-slate-50 text-slate-600'
                          }`}>{val}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-center text-xs text-slate-400">{answeredCount}/{gapQuestions.length} answered</p>
              <div className="mt-10 flex flex-wrap justify-center gap-3">
                <button type="button" onClick={() => setStep('interests')} className="rounded-2xl border border-slate-200 px-6 py-3 text-sm font-bold">Back</button>
                <button type="button" disabled={!canFinishGaps || saving}
                  onClick={() => {
                    const gapAnswers: GapAnswer[] = gapQuestions.map((q) => ({
                      questionId: q.id, question: q.question, answer: answers[q.id] || 'no', skill: q.skill,
                    }));
                    const missing = gapAnswers.filter((a) => a.answer === 'no').map((a) => a.skill);
                    void finishToBuddy(gapAnswers, missing, selected.filter((t) => t !== 'custom'));
                  }}
                  className="rounded-2xl bg-indigo-600 px-8 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Done →'}</button>
                <button type="button" disabled={saving} onClick={() => void finishToBuddy([], [], selected.filter((t) => t !== 'custom'))}
                  className="rounded-2xl border border-slate-200 px-8 py-3 text-sm font-bold">Skip</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default OnboardingAnalyze;

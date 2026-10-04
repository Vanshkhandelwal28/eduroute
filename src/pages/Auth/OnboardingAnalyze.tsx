import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Code2,
  Database,
  FileUp,
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
import {
  extractSkillsFromText,
  extractSkillsWithAI,
  saveCustomCareer,
  applySkillProgressToNodes,
} from '../../utils/customCareer';
import { extractCvContent, formatCvReport } from '../../utils/pdfTextExtract';
import { saveSkillGap } from '../../services/buddyApi';
import { getAuthUser } from '../../utils/rbacAuth';
import { clearLearningPath } from '../../utils/learningPathClear';
import { pushUserData } from '../../utils/userDataStore';

type Step = 'interests' | 'gaps' | 'custom_role' | 'custom_skills';

const iconFor = (icon: 'software' | 'cyber' | 'data') => {
  if (icon === 'software') return <Code2 className="h-7 w-7 text-indigo-400" />;
  if (icon === 'cyber') return <Shield className="h-7 w-7 text-violet-400" />;
  return <Database className="h-7 w-7 text-emerald-400" />;
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
  const [analyzing, setAnalyzing] = useState(false);

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
  const canFinishGaps = gapQuestions.length > 0 && answeredCount >= gapQuestions.length;
  const goDashboard = () => navigate('/profile', { replace: true });

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
      clearLearningPath();
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
      window.dispatchEvent(new CustomEvent('eduroute:onboarding-updated'));
    } finally {
      setSaving(false);
      goDashboard();
    }
  };

  const parsedSkills = useMemo(
    () =>
      skillText
        .split(',')
        .flatMap((p) => p.split('|'))
        .flatMap((p) => p.split('/'))
        .flatMap((p) => p.split(';'))
        .flatMap((p) => p.split(' '))
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
    setPathStatus('Reading CV…');
    try {
      const info = await extractCvContent(file, extractSkillsFromText);
      setCvPreview(info.rawText);
      if (info.skills.length) setCvSkills(info.skills);
      setPathStatus(`Found ${info.skills.length} skills`);
      setTimeout(() => setPathStatus(''), 3000);
      setCustomError('');
    } catch (e) {
      console.error(e);
      setPathStatus('');
      setCustomError('Could not read that file.');
    }
  };

  const analyzeCv = async () => {
    setCustomError('');
    const text = (cvPreview || skillText || '').trim();
    if (text.length < 10) {
      setCustomError('Upload a CV or paste skills first.');
      return;
    }
    setAnalyzing(true);
    setPathStatus('AI analyzing…');
    try {
      const combined = [skillText, cvPreview].filter(Boolean).join('\n');
      const aiSkills = await extractSkillsWithAI(combined);
      if (aiSkills.length) {
        setCvSkills(aiSkills);
        setPathStatus(`Found ${aiSkills.length} skills`);
        setTimeout(() => setPathStatus(''), 2500);
      } else {
        setCustomError('AI found few skills. Paste skills manually.');
        setPathStatus('');
      }
    } catch {
      setCustomError('AI analyze failed.');
      setPathStatus('');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCustomFinish = async () => {
    setCustomError('');
    const role = customRole.trim();
    if (!role) {
      setCustomError('Please enter your target role.');
      return;
    }
    const skills = Array.from(
      new Set([...parsedSkills, ...cvSkills].map((s) => s.trim()).filter(Boolean)),
    );
    if (!skills.length) {
      setCustomError('Add skills or upload a CV.');
      return;
    }
    setSaving(true);
    setPathStatus('Designing career path…');
    try {
      clearLearningPath();
      saveCustomCareer({ role, skills, cvSkills, missingSkills: [] });
      let nodes: any[] | null = null;
      try {
        const res = await fetch('/api/career-path', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role,
            skills,
            cvSkills: skills,
            cvText: (cvPreview || skillText).slice(0, 8000),
            userId: getAuthUser()?.email || getAuthUser()?.id || 'demo',
          }),
        });
        const data = await res.json();
        if (data?.ok && Array.isArray(data.nodes) && data.nodes.length >= 3) {
          nodes = data.nodes;
          setPathStatus(
            data.source === 'template'
              ? 'AI offline — template'
              : `Path via ${data.provider || data.source}`,
          );
        }
      } catch {
        setPathStatus('AI unreachable — template on Profile');
      }
      if (nodes) {
        try {
          const email = (getAuthUser()?.email || 'guest').trim().toLowerCase();
          const key = `eduroute:learning-path-v2:${email}`;
          const enriched = nodes.map((n: any) => {
            const hours = Math.max(8, Number(n.hours) || 20);
            const days =
              Number(n.days) > 0
                ? Number(n.days)
                : Math.min(90, Math.max(5, Math.round(hours / 2.5)));
            const skillFocus =
              Array.isArray(n.skills) && n.skills.length
                ? n.skills.slice(0, 4).join(', ')
                : n.title;
            const interest = (n.skills && n.skills[0]) || n.short || role;
            return {
              ...n,
              hours,
              days,
              href:
                n.href ||
                `/ai-course-designer?interest=${encodeURIComponent(interest)}&title=${encodeURIComponent(n.title)}&nodeId=${encodeURIComponent(n.id)}&auto=1&days=${days}&hours=${hours}&skills=${encodeURIComponent(skillFocus)}&role=${encodeURIComponent(role)}`,
            };
          });
          const withStatus = applySkillProgressToNodes(enriched, skills);
          const pathPayload = {
            nodes: withStatus,
            track: role,
            source: 'ai',
            updatedAt: new Date().toISOString(),
          };
          localStorage.setItem(key, JSON.stringify(pathPayload));
          void pushUserData('learning-path', pathPayload);
          try {
            const doneIds = withStatus
              .filter((n: any) => n.status === 'completed')
              .map((n: any) => n.id);
            localStorage.setItem(`${key}:done`, JSON.stringify(doneIds));
            void pushUserData('learning-path-progress', {
              completedNodeIds: doneIds,
              updatedAt: new Date().toISOString(),
            });
          } catch {
            /* ignore */
          }
          window.dispatchEvent(new CustomEvent('eduroute:learning-path-updated'));
        } catch {
          /* ignore */
        }
      }
      window.dispatchEvent(new CustomEvent('eduroute:onboarding-updated'));
    } finally {
      setSaving(false);
      goDashboard();
    }
  };

  const handleGapsFinish = async () => {
    if (!canFinishGaps) return;
    const gapAnswers: GapAnswer[] = gapQuestions.map((q) => ({
      questionId: q.id,
      skill: q.skill,
      answer: answers[q.id] || 'no',
    }));
    const missing = gapAnswers.filter((a) => a.answer === 'no').map((a) => a.skill);
    await finishToBuddy(gapAnswers, missing, selected);
  };

  const handleSkip = () => {
    markOnboardingSkipped();
    goDashboard();
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-10">
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-400">
            <Sparkles className="h-3.5 w-3.5" /> Tell us about yourself
          </span>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-white">
            {step === 'interests' && 'What are you aiming for?'}
            {step === 'gaps' && 'Quick skill check'}
            {step === 'custom_role' && 'Your target role'}
            {step === 'custom_skills' && 'Quick skill check'}
          </h1>
          <p className="mt-2 text-sm text-white/50">
            {step === 'custom_skills'
              ? `For ${customRole || 'your role'} — skills + optional CV.`
              : 'We use this to design your learning path.'}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'interests' && (
            <motion.div
              key="interests"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {INTEREST_OPTIONS.map((opt) => {
                  const active = selected.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleInterest(opt.id)}
                      className={`group relative flex flex-col gap-3 rounded-2xl border p-5 text-left transition-all ${
                        active
                          ? 'border-indigo-400 bg-indigo-500/15 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-400/30'
                          : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                            active ? 'bg-indigo-500/20' : 'bg-white/5'
                          }`}
                        >
                          {iconFor(opt.icon as 'software' | 'cyber' | 'data')}
                        </span>
                        {active && (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500">
                            <Check className="h-3.5 w-3.5 text-white" />
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="block text-[15px] font-semibold leading-snug text-white">
                          {opt.title}
                        </span>
                        <span className="mt-1.5 block text-xs leading-relaxed text-white/55">
                          {opt.description}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-between pt-4">
                <button type="button" onClick={handleSkip} className="text-sm text-white/40 hover:text-white/70">
                  Skip for now
                </button>
                <button
                  type="button"
                  disabled={!selected.length}
                  onClick={() => setStep(isCustomOnly ? 'custom_role' : 'gaps')}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          )}

          {step === 'gaps' && (
            <motion.div
              key="gaps"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              {gapQuestions.map((q) => (
                <div key={q.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm font-medium text-white">{q.question}</p>
                  <div className="mt-3 flex gap-2">
                    {(['yes', 'no'] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: v }))}
                        className={`rounded-lg px-4 py-1.5 text-sm font-medium ${
                          answers[q.id] === v
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                        }`}
                      >
                        {v === 'yes' ? 'Yes' : 'No'}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex justify-between pt-4">
                <button type="button" onClick={() => setStep('interests')} className="text-sm text-white/40 hover:text-white/70">
                  Back
                </button>
                <button
                  type="button"
                  disabled={!canFinishGaps || saving}
                  onClick={() => void handleGapsFinish()}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create my path
                </button>
              </div>
            </motion.div>
          )}

          {step === 'custom_role' && (
            <motion.div
              key="custom_role"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              <input
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                placeholder="e.g. SDE 2, Data Scientist"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-indigo-500"
              />
              <div className="flex justify-between pt-4">
                <button type="button" onClick={() => setStep('interests')} className="text-sm text-white/40 hover:text-white/70">
                  Back
                </button>
                <button
                  type="button"
                  disabled={!customRole.trim()}
                  onClick={() => setStep('custom_skills')}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          )}

          {step === 'custom_skills' && (
            <motion.div
              key="custom_skills"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              <textarea
                value={skillText}
                onChange={(e) => setSkillText(e.target.value)}
                placeholder="Skills you already have (comma-separated)"
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-indigo-500"
              />
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-white/70 hover:border-white/20">
                  <FileUp className="h-4 w-4" />
                  {cvFileName || 'Upload CV'}
                  <input
                    type="file"
                    accept=".pdf,.txt,.doc,.docx"
                    className="hidden"
                    onChange={(e) => void onCvFile(e.target.files?.[0] || null)}
                  />
                </label>
                <button
                  type="button"
                  disabled={analyzing}
                  onClick={() => void analyzeCv()}
                  className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/40 px-3 py-2 text-sm text-indigo-400"
                >
                  {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  Analyze
                </button>
                {pathStatus && <span className="text-xs text-white/40">{pathStatus}</span>}
              </div>
              {cvSkills.length > 0 && (
                <p className="text-xs text-white/50">
                  Detected: {cvSkills.slice(0, 12).join(', ')}
                  {cvSkills.length > 12 ? '…' : ''}
                </p>
              )}
              {customError && <p className="text-sm text-red-400">{customError}</p>}
              <div className="flex justify-between pt-4">
                <button type="button" onClick={() => setStep('custom_role')} className="text-sm text-white/40 hover:text-white/70">
                  Back
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleCustomFinish()}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create my path
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default OnboardingAnalyze;

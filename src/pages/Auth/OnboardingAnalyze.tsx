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
  const [analyzing, setAnalyzing] = useState(false);
  const [cvReady, setCvReady] = useState(false);

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
    setCvReady(false);
    if (!file) return;
    setPathStatus('Reading CV file…');
    try {
      let text = '';
      if (file.type.startsWith('text/') || /\.(txt|md|csv|json)$/i.test(file.name)) {
        text = await file.text();
      } else {
        const buf = await file.arrayBuffer();
        const raw = new TextDecoder('utf-8', { fatal: false }).decode(buf);
        text = raw
          .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u024F]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
      setCvPreview(text.slice(0, 8000));
      const quick = extractSkillsFromText(text);
      if (quick.length) setCvSkills(quick);
      setCvReady(true);
      setPathStatus('');
      setCustomError('');
    } catch {
      setPathStatus('');
      setCustomError('Could not read that file. Try .txt or paste skills in the box above.');
    }
  };

  const analyzeCv = async () => {
    setCustomError('');
    const text = (cvPreview || skillText || '').trim();
    if (text.length < 10) {
      setCustomError('Upload a CV or paste skills first, then click Analyze.');
      return;
    }
    setAnalyzing(true);
    setPathStatus('AI analyzing full CV text…');
    try {
      const combined = [skillText, cvPreview].filter(Boolean).join('\n');
      const aiSkills = await extractSkillsWithAI(combined);
      if (aiSkills.length) {
        setCvSkills(aiSkills);
        setPathStatus(`Found ${aiSkills.length} skills`);
        setTimeout(() => setPathStatus(''), 2500);
      } else {
        setCustomError(
          'AI found few skills. Paste your skills above (e.g. backend, jwt, golang) or use a .txt CV.',
        );
        setPathStatus('');
      }
    } catch {
      setCustomError('AI analyze failed. Check connection or paste skills manually.');
      setPathStatus('');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCustomFinish = async () => {
    setCustomError('');
    const role = customRole.trim();
    if (!role) {
      setCustomError('Please enter your target role (e.g. SDE 2).');
      return;
    }
    const skills = Array.from(
      new Set([...parsedSkills, ...cvSkills].map((s) => s.trim()).filter(Boolean)),
    );
    if (!skills.length) {
      setCustomError('Add skills you already have, or upload a CV and click Analyze.');
      return;
    }
    setSaving(true);
    setPathStatus('Designing full career path from your skills…');
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
          localStorage.setItem(
            key,
            JSON.stringify({
              nodes: withStatus,
              track: role,
              source: 'ai',
              updatedAt: new Date().toISOString(),
            }),
          );
          try {
            const doneIds = withStatus
              .filter((n: any) => n.status === 'completed')
              .map((n: any) => n.id);
            localStorage.setItem(`${key}:done`, JSON.stringify(doneIds));
          } catch {
            /* ignore */
          }
          window.dispatchEvent(new CustomEvent('eduroute:learning-path-updated'));
        } catch {
          /* ignore */
        }
      }
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
          <h1 className="mt-4 text-3xl font-black tracking-tight">
            {step === 'interests' && 'What are you aiming for?'}
            {step === 'gaps' && 'Quick skill check'}
            {step === 'custom_role' && 'Your target role'}
            {step === 'custom_skills' && 'Quick skill check'}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {step === 'custom_skills'
              ? `For ${customRole || 'your role'} — skills you already have + optional CV.`
              : 'We use this to design your learning path and courses.'}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'interests' && (
            <motion.div key="interests" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="grid gap-3 sm:grid-cols-2">
                {INTEREST_OPTIONS.map((opt) => {
                  const on = selected.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleInterest(opt.id)}
                      className={`rounded-2xl border p-4 text-left transition ${
                        on
                          ? 'border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/30'
                          : 'border-[var(--border-default)] bg-[var(--bg-card)]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {opt.icon ? iconFor(opt.icon as any) : <Wand2 className="h-8 w-8 text-violet-500" />}
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-[var(--text-primary)]">{opt.title}</p>
                          <p className="mt-1 text-xs text-[var(--text-muted)]">{opt.description}</p>
                        </div>
                        {on && <Check className="ml-auto h-5 w-5 shrink-0 text-indigo-400" />}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-6 flex justify-between">
                <button type="button" onClick={handleSkip} className="text-sm font-bold text-[var(--text-muted)]">
                  Skip for now
                </button>
                <button
                  type="button"
                  disabled={!selected.length}
                  onClick={() => setStep(isCustomOnly ? 'custom_role' : 'gaps')}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          )}

          {step === 'gaps' && (
            <motion.div key="gaps" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <ul className="space-y-3">
                {gapQuestions.map((q) => (
                  <li key={q.id} className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
                    <p className="text-sm font-semibold">{q.question}</p>
                    <div className="mt-3 flex gap-2">
                      {(['yes', 'no'] as const).map((a) => (
                        <button
                          key={a}
                          type="button"
                          onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: a }))}
                          className={`rounded-xl px-4 py-2 text-xs font-bold capitalize ${
                            answers[q.id] === a
                              ? 'bg-indigo-600 text-white'
                              : 'border border-[var(--border-default)]'
                          }`}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex justify-between">
                <button type="button" onClick={() => setStep('interests')} className="text-sm font-bold">
                  Back
                </button>
                <button
                  type="button"
                  disabled={!canFinishGaps || saving}
                  onClick={() => void handleGapsFinish()}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Finish
                </button>
              </div>
            </motion.div>
          )}

          {step === 'custom_role' && (
            <motion.div key="role" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <label className="block">
                <span className="text-xs font-bold uppercase text-[var(--text-muted)]">Target role</span>
                <input
                  className="mt-2 w-full rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
                  placeholder="e.g. SDE 2, Senior Backend Engineer"
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                />
              </label>
              <div className="mt-6 flex justify-between">
                <button type="button" onClick={() => setStep('interests')} className="text-sm font-bold">
                  Back
                </button>
                <button
                  type="button"
                  disabled={!customRole.trim()}
                  onClick={() => setStep('custom_skills')}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          )}

          {step === 'custom_skills' && (
            <motion.div key="skills" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <textarea
                className="min-h-[100px] w-full rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
                placeholder="e.g. backend, jwt, golang, restapi, docker, postgresql"
                value={skillText}
                onChange={(e) => setSkillText(e.target.value)}
              />
              <div className="mt-4 rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--bg-card)] p-4">
                <p className="flex items-center gap-2 text-xs font-bold uppercase text-[var(--text-muted)]">
                  <FileUp className="h-4 w-4" /> Upload CV (optional)
                </p>
                <input
                  type="file"
                  accept=".txt,.md,.csv,.json,.pdf,.doc,.docx,text/plain"
                  className="mt-2 block w-full text-sm"
                  onChange={(e) => void onCvFile(e.target.files?.[0] || null)}
                />
                {cvFileName && (
                  <p className="mt-2 text-xs text-[var(--text-secondary)]">
                    {cvFileName}
                    {cvReady && !cvSkills.length && ' · ready — click Analyze'}
                    {cvSkills.length > 0 && ` · ${cvSkills.length} skill(s)`}
                  </p>
                )}
                {cvSkills.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {cvSkills.map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10px] text-[var(--text-muted)] max-w-[60%]">
                    AI reads full CV text and replies with only skills you already have
                  </p>
                  <button
                    type="button"
                    disabled={analyzing || (!cvPreview && !skillText.trim())}
                    onClick={() => void analyzeCv()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white shadow disabled:opacity-50"
                  >
                    {analyzing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {analyzing ? 'Analyzing…' : 'Analyze CV'}
                  </button>
                </div>
                {pathStatus && (
                  <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-indigo-400">
                    {(analyzing || saving) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {pathStatus}
                  </p>
                )}
              </div>
              {customError && <p className="mt-2 text-xs font-bold text-rose-500">{customError}</p>}
              <div className="mt-6 flex justify-between">
                <button type="button" onClick={() => setStep('custom_role')} className="text-sm font-bold">
                  Back
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleCustomFinish()}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
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

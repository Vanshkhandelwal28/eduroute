import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Download, FileText, Plus, Trash2, Sparkles, Check, LayoutTemplate,
  User, GraduationCap, Briefcase, FolderKanban, Wrench, Palette, Wand2, Award, Languages,
} from 'lucide-react';
import { getAuthUser } from '../../utils/rbacAuth';
import { sendBuddyMessage } from '../../services/buddyApi';
import { getStoredUserProfile } from '../../utils/userProfile';
import {
  ACCENT_COLORS, CV_TEMPLATES, SAMPLE_SUMMARIES, SUGGESTED_SKILLS,
  SUGGESTED_CERTIFICATES, SUGGESTED_LANGUAGES,
  emptyEducation, emptyExperience, emptyProject,
  readCvData, saveCvData, normalizeCvData,
  type CvAccentId, type CvData, type CvTemplateId,
} from '../../utils/cvStore';
import {
  SECTIONS,
  parseList,
  accentHex,
  buildSummaryPrompt,
  localAiSummary,
  openPrintPreview,
  type Phase,
  type SectionId,
} from './CvBuilderHelpers';

export const CvBuilder = () => {
  const [phase, setPhase] = useState<Phase>('templates');
  const [section, setSection] = useState<SectionId>('contact');
  const [data, setData] = useState<CvData>(() => normalizeCvData(readCvData()));
  const [skillsText, setSkillsText] = useState('');
  const [certsText, setCertsText] = useState('');
  const [langsText, setLangsText] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);
  const [aiWriting, setAiWriting] = useState(false);
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    const auth = getAuthUser();
    const profile = getStoredUserProfile();
    setData((prev) => {
      const next = { ...prev };
      if (!next.fullName && (profile?.name || auth?.name)) next.fullName = profile?.name || auth?.name || '';
      if (!next.email && (profile?.email || auth?.email)) next.email = profile?.email || auth?.email || '';
      return normalizeCvData(next);
    });
  }, []);

  useEffect(() => {
    setSkillsText((data.skills || []).join(', '));
    setCertsText((data.certificates || []).join(', '));
    setLangsText((data.languages || []).join(', '));
  }, [data.skills, data.certificates, data.languages]);

  const update = useCallback((patch: Partial<CvData>) => {
    setData((prev) => {
      const next = normalizeCvData({ ...prev, ...patch });
      saveCvData(next);
      return next;
    });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  }, []);

  const applySkills = () => update({ skills: parseList(skillsText) });
  const applyCerts = () => update({ certificates: parseList(certsText) });
  const applyLangs = () => update({ languages: parseList(langsText) });

  const handleDownloadPdf = () => {
    openPrintPreview({
      ...data,
      skills: data.skills || parseList(skillsText),
      certificates: data.certificates || parseList(certsText),
      languages: data.languages || parseList(langsText),
    });
  };

  if (phase === 'templates') {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-600">
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white">Choose a template</h1>
          <p className="mt-1 text-sm text-slate-500">Pick a layout — you can change it anytime in Design.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CV_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                update({ templateId: t.id, template: t.id });
                setPhase('editor');
              }}
              className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="mb-3 flex h-28 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-slate-800 dark:to-slate-800">
                <LayoutTemplate className="h-10 w-10 text-indigo-500 transition group-hover:scale-110" />
              </div>
              <p className="font-bold text-slate-900 dark:text-white">{t.label}</p>
              <p className="mt-1 text-xs text-slate-500">{t.description}</p>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setPhase('editor')}
          className="mt-6 text-sm font-semibold text-indigo-600 hover:underline"
        >
          Skip — open editor with current template
        </button>
      </div>
    );
  }

  const liveSkills = data.skills || [];
  const liveCerts = data.certificates || [];
  const liveLangs = data.languages || [];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 lg:flex-row lg:px-6">
      {/* Sidebar */}
      <aside className="w-full shrink-0 lg:w-56">
        <div className="mb-4 flex items-center gap-2">
          <button type="button" onClick={() => setPhase('templates')} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white">CV Editor</h1>
            {savedFlash && <span className="text-[10px] font-bold text-emerald-500">Saved</span>}
          </div>
        </div>
        <nav className="flex flex-wrap gap-1 lg:flex-col">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSection(s.id)}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  section === s.id
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="h-4 w-4" /> {s.label}
              </button>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={handleDownloadPdf}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-indigo-500"
        >
          <Download className="h-4 w-4" /> Download PDF
        </button>
      </aside>

      {/* Editor + Live preview */}
      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Sparkles className="h-3.5 w-3.5 text-indigo-500" /> Live preview · {data.template}
        </div>

        {section === 'contact' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-3 font-bold text-slate-900 dark:text-white">Contact</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {([['fullName', 'Full name'], ['title', 'Target role'], ['email', 'Email'], ['phone', 'Phone'], ['city', 'City'], ['linkedin', 'LinkedIn']] as const).map(([k, lab]) => (
                <label key={k} className="block text-sm">
                  <span className="text-slate-500">{lab}</span>
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
                    value={(data as any)[k] || ''}
                    onChange={(e) => update({ [k]: e.target.value } as any)}
                  />
                </label>
              ))}
            </div>
          </div>
        )}

        {section === 'summary' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold text-slate-900 dark:text-white">Summary</h2>
              <button
                type="button"
                disabled={aiWriting}
                onClick={async () => {
                  setAiWriting(true);
                  setAiError('');
                  try {
                    const skills = liveSkills;
                    const prompt = buildSummaryPrompt(data, skills);
                    const auth = getAuthUser();
                    const res = await sendBuddyMessage({
                      userId: String(auth?.id || auth?.email || 'cv'),
                      message: prompt,
                      language: 'english',
                    });
                    const reply = (res.reply || localAiSummary(data, skills)).trim();
                    update({ summary: reply });
                  } catch {
                    update({ summary: localAiSummary(data, liveSkills) });
                    setAiError('Used offline summary');
                  } finally {
                    setAiWriting(false);
                  }
                }}
                className="inline-flex items-center gap-1 rounded-full bg-violet-600 px-3 py-1.5 text-xs font-bold text-white"
              >
                <Wand2 className="h-3.5 w-3.5" /> {aiWriting ? 'Writing…' : 'AI Write'}
              </button>
            </div>
            {aiError && <p className="mb-2 text-xs text-amber-500">{aiError}</p>}
            <textarea
              className="min-h-[120px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              value={data.summary || ''}
              onChange={(e) => update({ summary: e.target.value })}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {SAMPLE_SUMMARIES.map((s, i) => (
                <button key={i} type="button" className="rounded-full border border-slate-200 px-2 py-1 text-[10px] dark:border-slate-600" onClick={() => update({ summary: s })}>
                  Sample {i + 1}
                </button>
              ))}
            </div>
          </div>
        )}

        {section === 'skills' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-3 font-bold">Skills</h2>
            <textarea className="w-full rounded-xl border px-3 py-2 text-sm" value={skillsText} onChange={(e) => setSkillsText(e.target.value)} onBlur={applySkills} placeholder="React, TypeScript, …" />
            <button type="button" onClick={applySkills} className="mt-2 rounded-full bg-indigo-600 px-3 py-1 text-xs text-white">Apply</button>
            <div className="mt-2 flex flex-wrap gap-2">{liveSkills.map((s) => <span key={s} className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs dark:bg-indigo-900">{s}</span>)}</div>
            <div className="mt-2 flex flex-wrap gap-1">{SUGGESTED_SKILLS.filter((s) => !liveSkills.includes(s)).slice(0, 12).map((s) => (
              <button key={s} type="button" className="rounded-full border px-2 py-0.5 text-[10px]" onClick={() => update({ skills: [...liveSkills, s] })}>+ {s}</button>
            ))}</div>
          </div>
        )}

        {section === 'certificates' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-3 font-bold">Certificates</h2>
            <textarea className="w-full rounded-xl border px-3 py-2 text-sm" value={certsText} onChange={(e) => setCertsText(e.target.value)} onBlur={applyCerts} />
            <button type="button" onClick={applyCerts} className="mt-2 rounded-full bg-indigo-600 px-3 py-1 text-xs text-white">Apply</button>
            <div className="mt-2 flex flex-wrap gap-2">{liveCerts.map((s) => <span key={s} className="rounded-full bg-amber-100 px-2 py-0.5 text-xs">{s}</span>)}</div>
          </div>
        )}

        {section === 'languages' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-3 font-bold">Languages</h2>
            <textarea className="w-full rounded-xl border px-3 py-2 text-sm" value={langsText} onChange={(e) => setLangsText(e.target.value)} onBlur={applyLangs} />
            <button type="button" onClick={applyLangs} className="mt-2 rounded-full bg-indigo-600 px-3 py-1 text-xs text-white">Apply</button>
            <div className="mt-2 flex flex-wrap gap-2">{liveLangs.map((s) => <span key={s} className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs">{s}</span>)}</div>
          </div>
        )}

        {section === 'education' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">Education</h2>
              <button type="button" onClick={() => update({ education: [...(data.education || []), emptyEducation()] })} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600"><Plus className="h-3.5 w-3.5" /> Add</button>
            </div>
            {(data.education || []).map((edu, idx) => (
              <div key={edu.id || idx} className="mb-3 space-y-2 rounded-xl border border-slate-100 p-3 dark:border-slate-700">
                <div className="flex justify-between"><span className="text-xs text-slate-400">#{idx + 1}</span>
                  <button type="button" onClick={() => update({ education: (data.education || []).filter((_, i) => i !== idx) })}><Trash2 className="h-3.5 w-3.5 text-red-500" /></button>
                </div>
                {([['school', 'School'], ['degree', 'Degree'], ['field', 'Field'], ['year', 'Year'], ['location', 'Location']] as const).map(([k, lab]) => (
                  <input key={k} placeholder={lab} className="w-full rounded-lg border px-2 py-1.5 text-sm" value={(edu as any)[k] || ''} onChange={(e) => {
                    const next = [...(data.education || [])];
                    next[idx] = { ...edu, [k]: e.target.value };
                    update({ education: next });
                  }} />
                ))}
              </div>
            ))}
          </div>
        )}

        {section === 'experience' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">Experience</h2>
              <button type="button" onClick={() => update({ experience: [...(data.experience || []), emptyExperience()] })} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600"><Plus className="h-3.5 w-3.5" /> Add</button>
            </div>
            {(data.experience || []).map((exp, idx) => (
              <div key={exp.id || idx} className="mb-3 space-y-2 rounded-xl border border-slate-100 p-3 dark:border-slate-700">
                <div className="flex justify-between"><span className="text-xs text-slate-400">#{idx + 1}</span>
                  <button type="button" onClick={() => update({ experience: (data.experience || []).filter((_, i) => i !== idx) })}><Trash2 className="h-3.5 w-3.5 text-red-500" /></button>
                </div>
                {([['role', 'Role'], ['company', 'Company'], ['duration', 'Duration'], ['location', 'Location']] as const).map(([k, lab]) => (
                  <input key={k} placeholder={lab} className="w-full rounded-lg border px-2 py-1.5 text-sm" value={(exp as any)[k] || (exp as any)[k === 'role' ? 'title' : k] || ''} onChange={(e) => {
                    const next = [...(data.experience || [])];
                    next[idx] = { ...exp, [k]: e.target.value, ...(k === 'role' ? { title: e.target.value } : {}) };
                    update({ experience: next });
                  }} />
                ))}
                <textarea placeholder="Description / bullets (one per line)" className="w-full rounded-lg border px-2 py-1.5 text-sm" value={exp.description || exp.details || ''} onChange={(e) => {
                  const next = [...(data.experience || [])];
                  next[idx] = { ...exp, description: e.target.value, details: e.target.value };
                  update({ experience: next });
                }} />
              </div>
            ))}
          </div>
        )}

        {section === 'projects' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">Projects</h2>
              <button type="button" onClick={() => update({ projects: [...(data.projects || []), emptyProject()] })} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600"><Plus className="h-3.5 w-3.5" /> Add</button>
            </div>
            {(data.projects || []).map((pr, idx) => (
              <div key={pr.id || idx} className="mb-3 space-y-2 rounded-xl border border-slate-100 p-3 dark:border-slate-700">
                <div className="flex justify-between"><span className="text-xs text-slate-400">#{idx + 1}</span>
                  <button type="button" onClick={() => update({ projects: (data.projects || []).filter((_, i) => i !== idx) })}><Trash2 className="h-3.5 w-3.5 text-red-500" /></button>
                </div>
                <input placeholder="Name" className="w-full rounded-lg border px-2 py-1.5 text-sm" value={pr.name || ''} onChange={(e) => {
                  const next = [...(data.projects || [])]; next[idx] = { ...pr, name: e.target.value }; update({ projects: next });
                }} />
                <input placeholder="Tech / link" className="w-full rounded-lg border px-2 py-1.5 text-sm" value={pr.tech || pr.link || ''} onChange={(e) => {
                  const next = [...(data.projects || [])]; next[idx] = { ...pr, tech: e.target.value, link: e.target.value }; update({ projects: next });
                }} />
                <textarea placeholder="Details" className="w-full rounded-lg border px-2 py-1.5 text-sm" value={pr.description || pr.details || ''} onChange={(e) => {
                  const next = [...(data.projects || [])]; next[idx] = { ...pr, description: e.target.value, details: e.target.value }; update({ projects: next });
                }} />
              </div>
            ))}
          </div>
        )}

        {section === 'design' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-3 font-bold">Design</h2>
            <p className="mb-2 text-sm text-slate-500">Accent color</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {(Object.keys(ACCENT_COLORS) as CvAccentId[]).map((id) => (
                <button key={id} type="button" onClick={() => update({ accent: id })} className={`h-8 w-8 rounded-full border-2 ${data.accent === id ? 'border-white ring-2 ring-indigo-500' : 'border-transparent'}`} style={{ background: ACCENT_COLORS[id].hex }} title={ACCENT_COLORS[id].label} />
              ))}
            </div>
            <p className="mb-2 text-sm text-slate-500">Template</p>
            <div className="flex flex-wrap gap-2">
              {CV_TEMPLATES.map((t) => (
                <button key={t.id} type="button" onClick={() => update({ templateId: t.id, template: t.id })} className={`rounded-full px-3 py-1 text-xs font-semibold ${data.templateId === t.id || data.template === t.id ? 'bg-indigo-600 text-white' : 'border border-slate-200 dark:border-slate-600'}`}>{t.label}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CvBuilder;

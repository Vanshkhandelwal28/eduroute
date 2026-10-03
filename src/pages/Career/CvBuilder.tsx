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
  const [data, setData] = useState<CvData>(() => readCvData());
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

  // Minimal full UI restore - templates + editor core
  if (phase === 'templates') {
    return (
      <div className="er-page space-y-6 p-4 md:p-6">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="rounded-full p-2 hover:bg-[var(--bg-muted)]">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">CV Builder</h1>
            <p className="text-sm text-[var(--text-secondary)]">Choose a template to start</p>
          </div>
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
              className="er-card er-card-hover flex flex-col gap-2 p-4 text-left"
            >
              <LayoutTemplate className="h-8 w-8 text-indigo-500" />
              <p className="font-bold text-[var(--text-primary)]">{t.label}</p>
              <p className="text-xs text-[var(--text-secondary)]">{t.description}</p>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setPhase('editor')}
          className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-bold text-white"
        >
          Skip — open editor
        </button>
      </div>
    );
  }

  const liveSkills = data.skills || [];
  const liveCerts = data.certificates || [];
  const liveLangs = data.languages || [];

  return (
    <div className="er-page flex flex-col gap-4 p-4 md:flex-row md:p-6">
      <aside className="w-full shrink-0 md:w-56">
        <div className="mb-4 flex items-center gap-2">
          <button type="button" onClick={() => setPhase('templates')} className="rounded-full p-2 hover:bg-[var(--bg-muted)]">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-bold">CV Editor</h1>
          {savedFlash && <span className="text-xs text-emerald-500">Saved</span>}
        </div>
        <nav className="flex flex-wrap gap-1 md:flex-col">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSection(s.id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${section === s.id ? 'bg-indigo-600 text-white' : 'hover:bg-[var(--bg-muted)]'}`}
              >
                <Icon className="h-4 w-4" /> {s.label}
              </button>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={() => openPrintPreview(data)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-bold text-white"
        >
          <Download className="h-4 w-4" /> Print / PDF
        </button>
      </aside>

      <main className="min-w-0 flex-1 space-y-4">
        {section === 'contact' && (
          <div className="er-card space-y-3 p-4">
            <h2 className="font-bold">Contact</h2>
            {([['fullName', 'Full name'], ['title', 'Target role'], ['email', 'Email'], ['phone', 'Phone'], ['city', 'City'], ['linkedin', 'LinkedIn']] as const).map(([k, lab]) => (
              <label key={k} className="block text-sm">
                <span className="text-[var(--text-secondary)]">{lab}</span>
                <input
                  className="mt-1 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2"
                  value={(data as any)[k] || ''}
                  onChange={(e) => update({ [k]: e.target.value } as any)}
                />
              </label>
            ))}
          </div>
        )}

        {section === 'summary' && (
          <div className="er-card space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Summary</h2>
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
            {aiError && <p className="text-xs text-amber-500">{aiError}</p>}
            <textarea
              className="min-h-[120px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm"
              value={data.summary || ''}
              onChange={(e) => update({ summary: e.target.value })}
            />
            <div className="flex flex-wrap gap-2">
              {SAMPLE_SUMMARIES.map((s, i) => (
                <button key={i} type="button" className="rounded-full border px-2 py-1 text-[10px]" onClick={() => update({ summary: s })}>
                  Sample {i + 1}
                </button>
              ))}
            </div>
          </div>
        )}

        {section === 'skills' && (
          <div className="er-card space-y-3 p-4">
            <h2 className="font-bold">Skills</h2>
            <textarea className="w-full rounded-lg border px-3 py-2 text-sm" value={skillsText} onChange={(e) => setSkillsText(e.target.value)} onBlur={applySkills} placeholder="React, TypeScript, …" />
            <button type="button" onClick={applySkills} className="rounded-full bg-indigo-600 px-3 py-1 text-xs text-white">Apply</button>
            <div className="flex flex-wrap gap-2">{liveSkills.map((s) => <span key={s} className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs dark:bg-indigo-900">{s}</span>)}</div>
            <div className="flex flex-wrap gap-1">{SUGGESTED_SKILLS.filter((s) => !liveSkills.includes(s)).slice(0, 10).map((s) => (
              <button key={s} type="button" className="rounded-full border px-2 py-0.5 text-[10px]" onClick={() => update({ skills: [...liveSkills, s] })}>+ {s}</button>
            ))}</div>
          </div>
        )}

        {section === 'certificates' && (
          <div className="er-card space-y-3 p-4">
            <h2 className="font-bold">Certificates</h2>
            <textarea className="w-full rounded-lg border px-3 py-2 text-sm" value={certsText} onChange={(e) => setCertsText(e.target.value)} onBlur={applyCerts} />
            <button type="button" onClick={applyCerts} className="rounded-full bg-indigo-600 px-3 py-1 text-xs text-white">Apply</button>
            <div className="flex flex-wrap gap-2">{liveCerts.map((s) => <span key={s} className="rounded-full bg-amber-100 px-2 py-0.5 text-xs">{s}</span>)}</div>
          </div>
        )}

        {section === 'languages' && (
          <div className="er-card space-y-3 p-4">
            <h2 className="font-bold">Languages</h2>
            <textarea className="w-full rounded-lg border px-3 py-2 text-sm" value={langsText} onChange={(e) => setLangsText(e.target.value)} onBlur={applyLangs} />
            <button type="button" onClick={applyLangs} className="rounded-full bg-indigo-600 px-3 py-1 text-xs text-white">Apply</button>
            <div className="flex flex-wrap gap-2">{liveLangs.map((s) => <span key={s} className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs">{s}</span>)}</div>
          </div>
        )}

        {section === 'education' && (
          <div className="er-card space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Education</h2>
              <button type="button" onClick={() => update({ education: [...(data.education || []), emptyEducation()] })} className="inline-flex items-center gap-1 text-xs text-indigo-600"><Plus className="h-3.5 w-3.5" /> Add</button>
            </div>
            {(data.education || []).map((edu, idx) => (
              <div key={edu.id || idx} className="space-y-2 rounded-lg border p-3">
                <div className="flex justify-between"><span className="text-xs text-[var(--text-muted)]">#{idx + 1}</span>
                  <button type="button" onClick={() => update({ education: (data.education || []).filter((_, i) => i !== idx) })}><Trash2 className="h-3.5 w-3.5 text-red-500" /></button>
                </div>
                {([['school', 'School'], ['degree', 'Degree'], ['field', 'Field'], ['year', 'Year'], ['location', 'Location']] as const).map(([k, lab]) => (
                  <input key={k} placeholder={lab} className="w-full rounded border px-2 py-1.5 text-sm" value={(edu as any)[k] || ''} onChange={(e) => {
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
          <div className="er-card space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Experience</h2>
              <button type="button" onClick={() => update({ experience: [...(data.experience || []), emptyExperience()] })} className="inline-flex items-center gap-1 text-xs text-indigo-600"><Plus className="h-3.5 w-3.5" /> Add</button>
            </div>
            {(data.experience || []).map((exp, idx) => (
              <div key={exp.id || idx} className="space-y-2 rounded-lg border p-3">
                <div className="flex justify-between"><span className="text-xs text-[var(--text-muted)]">#{idx + 1}</span>
                  <button type="button" onClick={() => update({ experience: (data.experience || []).filter((_, i) => i !== idx) })}><Trash2 className="h-3.5 w-3.5 text-red-500" /></button>
                </div>
                {([['role', 'Role'], ['company', 'Company'], ['duration', 'Duration'], ['location', 'Location']] as const).map(([k, lab]) => (
                  <input key={k} placeholder={lab} className="w-full rounded border px-2 py-1.5 text-sm" value={(exp as any)[k] || (exp as any)[k === 'role' ? 'title' : k] || ''} onChange={(e) => {
                    const next = [...(data.experience || [])];
                    next[idx] = { ...exp, [k]: e.target.value, ...(k === 'role' ? { title: e.target.value } : {}) };
                    update({ experience: next });
                  }} />
                ))}
                <textarea placeholder="Description / bullets" className="w-full rounded border px-2 py-1.5 text-sm" value={exp.description || exp.details || ''} onChange={(e) => {
                  const next = [...(data.experience || [])];
                  next[idx] = { ...exp, description: e.target.value, details: e.target.value };
                  update({ experience: next });
                }} />
              </div>
            ))}
          </div>
        )}

        {section === 'projects' && (
          <div className="er-card space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Projects</h2>
              <button type="button" onClick={() => update({ projects: [...(data.projects || []), emptyProject()] })} className="inline-flex items-center gap-1 text-xs text-indigo-600"><Plus className="h-3.5 w-3.5" /> Add</button>
            </div>
            {(data.projects || []).map((pr, idx) => (
              <div key={pr.id || idx} className="space-y-2 rounded-lg border p-3">
                <div className="flex justify-between"><span className="text-xs text-[var(--text-muted)]">#{idx + 1}</span>
                  <button type="button" onClick={() => update({ projects: (data.projects || []).filter((_, i) => i !== idx) })}><Trash2 className="h-3.5 w-3.5 text-red-500" /></button>
                </div>
                <input placeholder="Name" className="w-full rounded border px-2 py-1.5 text-sm" value={pr.name || ''} onChange={(e) => {
                  const next = [...(data.projects || [])]; next[idx] = { ...pr, name: e.target.value }; update({ projects: next });
                }} />
                <input placeholder="Tech / link" className="w-full rounded border px-2 py-1.5 text-sm" value={pr.tech || pr.link || ''} onChange={(e) => {
                  const next = [...(data.projects || [])]; next[idx] = { ...pr, tech: e.target.value, link: e.target.value }; update({ projects: next });
                }} />
                <textarea placeholder="Details" className="w-full rounded border px-2 py-1.5 text-sm" value={pr.description || pr.details || ''} onChange={(e) => {
                  const next = [...(data.projects || [])]; next[idx] = { ...pr, description: e.target.value, details: e.target.value }; update({ projects: next });
                }} />
              </div>
            ))}
          </div>
        )}

        {section === 'design' && (
          <div className="er-card space-y-3 p-4">
            <h2 className="font-bold">Design</h2>
            <p className="text-sm text-[var(--text-secondary)]">Accent color</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(ACCENT_COLORS) as CvAccentId[]).map((id) => (
                <button key={id} type="button" onClick={() => update({ accent: id })} className={`h-8 w-8 rounded-full border-2 ${data.accent === id ? 'border-white ring-2 ring-indigo-500' : 'border-transparent'}`} style={{ background: ACCENT_COLORS[id].hex }} title={ACCENT_COLORS[id].label} />
              ))}
            </div>
            <p className="text-sm text-[var(--text-secondary)]">Template: <strong>{data.templateId || data.template}</strong></p>
            <div className="flex flex-wrap gap-2">
              {CV_TEMPLATES.map((t) => (
                <button key={t.id} type="button" onClick={() => update({ templateId: t.id, template: t.id })} className={`rounded-full px-3 py-1 text-xs ${data.templateId === t.id ? 'bg-indigo-600 text-white' : 'border'}`}>{t.label}</button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CvBuilder;

import { pushUserData, pullUserData } from './userDataStore';

/**
 * Student CV builder — localStorage + Neon.
 * Always normalize so remote partial payloads never leave arrays undefined.
 */

export type CvTemplateId = 'classic' | 'modern' | 'minimal' | 'professional';

export type CvAccentId = 'indigo' | 'slate' | 'emerald' | 'rose' | 'amber';

export type CvEducation = {
  id: string;
  school: string;
  degree: string;
  field: string;
  start: string;
  end: string;
  details: string;
  /** UI aliases used by CvBuilder */
  year?: string;
  location?: string;
};

export type CvExperience = {
  id: string;
  company: string;
  title: string;
  start: string;
  end: string;
  details: string;
  /** UI aliases used by CvBuilder */
  role?: string;
  duration?: string;
  description?: string;
  location?: string;
};

export type CvProject = {
  id: string;
  name: string;
  link: string;
  details: string;
  /** UI aliases */
  tech?: string;
  description?: string;
};

export type CvData = {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  skills: string[];
  certificates?: string[];
  languages?: string[];
  education: CvEducation[];
  experience: CvExperience[];
  projects: CvProject[];
  accent: CvAccentId;
  templateId: CvTemplateId;
  /** UI aliases */
  title?: string;
  city?: string;
  linkedin?: string;
  template?: CvTemplateId;
  updatedAt?: string;
};

const KEY = 'eduroute:cv-builder-v3';

export const ACCENT_COLORS: Record<CvAccentId, { hex: string; label: string }> = {
  indigo: { hex: '#4f46e5', label: 'Indigo' },
  slate: { hex: '#475569', label: 'Slate' },
  emerald: { hex: '#059669', label: 'Emerald' },
  rose: { hex: '#e11d48', label: 'Rose' },
  amber: { hex: '#d97706', label: 'Amber' },
};

export const CV_TEMPLATES: {
  id: CvTemplateId;
  label: string;
  description: string;
}[] = [
  { id: 'classic', label: 'Classic', description: 'Clean single-column layout' },
  { id: 'modern', label: 'Modern', description: 'Bold header with accent bar' },
  { id: 'minimal', label: 'Minimal', description: 'Sparse typography-first' },
  { id: 'professional', label: 'Professional', description: 'Sidebar-style sections' },
];

function rid() {
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function emptyEducation(): CvEducation {
  return { id: rid(), school: '', degree: '', field: '', start: '', end: '', details: '' };
}

export function emptyExperience(): CvExperience {
  return { id: rid(), company: '', title: '', start: '', end: '', details: '' };
}

export function emptyProject(): CvProject {
  return { id: rid(), name: '', link: '', details: '' };
}

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x ?? '').trim()).filter(Boolean);
  if (typeof v === 'string') {
    return v.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function normalizeEducation(raw: any): CvEducation {
  return {
    id: String(raw?.id || rid()),
    school: String(raw?.school || ''),
    degree: String(raw?.degree || ''),
    field: String(raw?.field || ''),
    start: String(raw?.start || ''),
    end: String(raw?.end || raw?.year || ''),
    details: String(raw?.details || ''),
    year: String(raw?.year || raw?.end || ''),
    location: String(raw?.location || ''),
  };
}

function normalizeExperience(raw: any): CvExperience {
  const title = String(raw?.title || raw?.role || '');
  const details = String(raw?.details || raw?.description || '');
  const duration = String(raw?.duration || [raw?.start, raw?.end].filter(Boolean).join(' – ') || '');
  return {
    id: String(raw?.id || rid()),
    company: String(raw?.company || ''),
    title,
    start: String(raw?.start || ''),
    end: String(raw?.end || ''),
    details,
    role: String(raw?.role || title),
    duration,
    description: String(raw?.description || details),
    location: String(raw?.location || ''),
  };
}

function normalizeProject(raw: any): CvProject {
  const details = String(raw?.details || raw?.description || '');
  return {
    id: String(raw?.id || rid()),
    name: String(raw?.name || ''),
    link: String(raw?.link || ''),
    details,
    tech: String(raw?.tech || ''),
    description: String(raw?.description || details),
  };
}

/** Guarantee every array/field CvBuilder expects so .map never crashes */
export function normalizeCvData(partial?: Partial<CvData> | null): CvData {
  const p = (partial && typeof partial === 'object' ? partial : {}) as any;
  const education = Array.isArray(p.education) && p.education.length
    ? p.education.map(normalizeEducation)
    : [emptyEducation()];
  const experience = Array.isArray(p.experience) && p.experience.length
    ? p.experience.map(normalizeExperience)
    : [emptyExperience()];
  const projects = Array.isArray(p.projects) && p.projects.length
    ? p.projects.map(normalizeProject)
    : [emptyProject()];

  const templateId = (p.templateId || p.template || 'classic') as CvTemplateId;
  const validTemplate = CV_TEMPLATES.some((t) => t.id === templateId) ? templateId : 'classic';
  const accent = (p.accent || 'indigo') as CvAccentId;
  const validAccent = ACCENT_COLORS[accent] ? accent : 'indigo';

  return {
    fullName: String(p.fullName || ''),
    email: String(p.email || ''),
    phone: String(p.phone || ''),
    location: String(p.location || p.city || ''),
    summary: String(p.summary || ''),
    skills: asStringArray(p.skills),
    certificates: asStringArray(p.certificates),
    languages: asStringArray(p.languages),
    education,
    experience,
    projects,
    accent: validAccent,
    templateId: validTemplate,
    title: String(p.title || ''),
    city: String(p.city || p.location || ''),
    linkedin: String(p.linkedin || ''),
    template: validTemplate,
    updatedAt: p.updatedAt ? String(p.updatedAt) : undefined,
  };
}

export function defaultCvData(partial?: Partial<CvData>): CvData {
  return normalizeCvData(partial);
}

export function readCvData(): CvData {
  if (typeof window === 'undefined') return defaultCvData();
  try {
    const raw =
      window.localStorage.getItem(KEY) ||
      window.localStorage.getItem('eduroute:cv-builder-v2') ||
      window.localStorage.getItem('eduroute:cv-builder-v1');
    if (!raw) return defaultCvData();
    const parsed = JSON.parse(raw);
    return normalizeCvData(parsed);
  } catch {
    return defaultCvData();
  }
}

export function saveCvData(data: CvData): void {
  if (typeof window === 'undefined') return;
  try {
    const next = normalizeCvData({ ...data, updatedAt: new Date().toISOString() });
    window.localStorage.setItem(KEY, JSON.stringify(next));
    void pushUserData('cv', next);
  } catch {
    // ignore
  }
}

export const SAMPLE_SUMMARIES = [
  'Project Manager with six years of experience coordinating cross-functional initiatives in technology and business operations. Skilled in stakeholder communication, project planning, risk tracking, and delivery governance across complex environments. Known for building practical workflows, improving team alignment, and keeping priorities moving under tight deadlines.',
  'Detail-oriented engineering student seeking internship opportunities. Strong foundation in data structures, algorithms, and modern web technologies with hands-on project experience.',
  'Results-driven learner with project experience in React, Node.js, and cloud tools. Eager to contribute to real-world products and grow with a collaborative team.',
];

export const SUGGESTED_SKILLS = [
  'Project Planning',
  'Risk Management',
  'Budget Tracking',
  'Jira',
  'Stakeholder Management',
  'Agile Delivery',
  'Process Improvement',
  'Microsoft Project',
  'React',
  'TypeScript',
  'JavaScript',
  'Node.js',
  'Python',
  'SQL',
  'Git',
  'Communication',
  'Problem Solving',
  'Teamwork',
];

export const SUGGESTED_CERTIFICATES = [
  'Project Management Professional (PMP)',
  'Certified ScrumMaster (CSM)',
  'Google Project Management Certificate',
  'AWS Cloud Practitioner',
  'Google Data Analytics',
  'Meta Front-End Developer',
];

export const SUGGESTED_LANGUAGES = ['English', 'French', 'Hindi', 'Spanish', 'Mandarin'];

export async function syncCvFromServer(): Promise<void> {
  try {
    const remote = await pullUserData<CvData>('cv');
    if (!remote || typeof remote !== 'object') return;
    // Merge + normalize so partial Neon payloads cannot wipe arrays
    saveCvData(normalizeCvData({ ...readCvData(), ...remote }));
  } catch {
    /* offline ok */
  }
}

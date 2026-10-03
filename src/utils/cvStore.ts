import { pushUserData, pullUserData } from './userDataStore';

/**
 * Student CV builder — localStorage + Neon.
 */

export type CvAccentId = 'indigo' | 'emerald' | 'rose' | 'amber' | 'slate';

export type CvEducation = {
  id: string;
  school: string;
  degree: string;
  field: string;
  start: string;
  end: string;
  details: string;
};

export type CvExperience = {
  id: string;
  company: string;
  title: string;
  start: string;
  end: string;
  details: string;
};

export type CvProject = {
  id: string;
  name: string;
  link: string;
  details: string;
};

export type CvData = {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  skills: string[];
  education: CvEducation[];
  experience: CvExperience[];
  projects: CvProject[];
  accent: CvAccentId;
  templateId: string;
  updatedAt?: string;
};

const KEY = 'eduroute:cv-builder-v3';

export const ACCENT_COLORS: Record<CvAccentId, { hex: string; label: string }> = {
  indigo: { hex: '#4f46e5', label: 'Indigo' },
  emerald: { hex: '#059669', label: 'Emerald' },
  rose: { hex: '#e11d48', label: 'Rose' },
  amber: { hex: '#d97706', label: 'Amber' },
  slate: { hex: '#475569', label: 'Slate' },
};

export const CV_TEMPLATES = [
  { id: 'classic', label: 'Classic' },
  { id: 'modern', label: 'Modern' },
  { id: 'compact', label: 'Compact' },
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

export function defaultCvData(partial?: Partial<CvData>): CvData {
  return {
    fullName: '',
    email: '',
    phone: '',
    location: '',
    summary: '',
    skills: [],
    education: [emptyEducation()],
    experience: [emptyExperience()],
    projects: [emptyProject()],
    accent: 'indigo',
    templateId: 'classic',
    ...partial,
  };
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
    return defaultCvData(parsed);
  } catch {
    return defaultCvData();
  }
}

export function saveCvData(data: CvData): void {
  if (typeof window === 'undefined') return;
  try {
    const next = { ...data, updatedAt: new Date().toISOString() };
    window.localStorage.setItem(KEY, JSON.stringify(next));
    void pushUserData('cv', next);
  } catch {
    // ignore
  }
}

export async function syncCvFromServer(): Promise<void> {
  const remote = await pullUserData<CvData>('cv');
  if (!remote || typeof remote !== 'object') return;
  saveCvData({ ...readCvData(), ...remote });
}

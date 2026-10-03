import {
  FileText, User, GraduationCap, Briefcase, FolderKanban, Wrench, Palette, Award, Languages,
} from 'lucide-react';
import {
  ACCENT_COLORS,
  type CvAccentId, type CvData, type CvTemplateId,
} from '../../utils/cvStore';

export type Phase = 'templates' | 'editor';
export type SectionId = 'contact' | 'summary' | 'skills' | 'certificates' | 'languages' | 'education' | 'experience' | 'projects' | 'design';

export const SECTIONS: { id: SectionId; label: string; icon: typeof User }[] = [
  { id: 'contact', label: 'Contact', icon: User },
  { id: 'experience', label: 'Experience', icon: Briefcase },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'skills', label: 'Skills', icon: Wrench },
  { id: 'certificates', label: 'Certificates', icon: Award },
  { id: 'languages', label: 'Languages', icon: Languages },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'summary', label: 'Summary', icon: FileText },
  { id: 'design', label: 'Design', icon: Palette },
];

export function parseList(raw: string) {
  return raw.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 28);
}
export function esc(s: string) {
  return String(s || '')
    .replace(/&/g, '&' + 'amp;')
    .replace(/</g, '&' + 'lt;')
    .replace(/>/g, '&' + 'gt;')
    .replace(/"/g, '&' + 'quot;');
}
export function accentHex(id: CvAccentId) {
  return ACCENT_COLORS[id]?.hex || '#4f46e5';
}

export function buildSummaryPrompt(data: CvData, skills: string[]): string {
  const expLines = (data.experience || [])
    .filter((e) => e.role || e.company)
    .map((e) => {
      const bullets = String(e.description || '')
        .split(/\n/)
        .map((l) => l.replace(/^[\s•\-\*]+/, '').trim())
        .filter(Boolean)
        .slice(0, 3);
      return `- ${e.role || 'Role'} at ${e.company || 'Company'}${e.duration ? ` (${e.duration})` : ''}${bullets.length ? `: ${bullets.join('; ')}` : ''}`;
    })
    .join('\n');
  const eduLines = (data.education || [])
    .filter((e) => e.school || e.degree)
    .map((e) => `- ${e.degree || 'Degree'} — ${e.school || 'School'}${e.year ? ` (${e.year})` : ''}`)
    .join('\n');
  const projLines = (data.projects || [])
    .filter((p) => p.name)
    .map((p) => `- ${p.name}${p.tech ? ` (${p.tech})` : ''}`)
    .join('\n');

  return [
    'Write a professional CV summary paragraph for a student/early-career professional.',
    'Rules: 3–5 sentences, first person or third person professional tone, no bullet points, no markdown, no title line, plain text only.',
    'Use ONLY the facts below. Do not invent employers or degrees.',
    '',
    `Name: ${data.fullName || 'Candidate'}`,
    `Target role: ${data.title || 'Professional'}`,
    `Location: ${data.city || 'N/A'}`,
    skills.length ? `Skills: ${skills.join(', ')}` : '',
    expLines ? `Experience:\n${expLines}` : 'Experience: none listed yet',
    eduLines ? `Education:\n${eduLines}` : '',
    projLines ? `Projects:\n${projLines}` : '',
    (data.certificates || []).length ? `Certificates: ${(data.certificates || []).join(', ')}` : '',
    '',
    'Return only the summary paragraph.',
  ]
    .filter(Boolean)
    .join('\n');
}

export function localAiSummary(data: CvData, skills: string[]): string {
  const name = data.fullName || 'This candidate';
  const role = data.title || 'professional';
  const topSkills = skills.slice(0, 6);
  const exp = (data.experience || []).filter((e) => e.role || e.company);
  const edu = (data.education || []).filter((e) => e.school || e.degree);
  const projs = (data.projects || []).filter((p) => p.name);

  const parts: string[] = [];
  if (exp.length) {
    const first = exp[0];
    const bullets = String(first.description || '')
      .split(/\n/)
      .map((l) => l.replace(/^[\s•\-\*]+/, '').trim())
      .filter(Boolean)
      .slice(0, 2);
    parts.push(
      `${name} is a ${role} with hands-on experience as ${first.role || 'a team member'}${first.company ? ` at ${first.company}` : ''}${first.duration ? ` (${first.duration})` : ''}.`
    );
    if (bullets.length) {
      parts.push(`Key contributions include ${bullets.map((b) => b.charAt(0).toLowerCase() + b.slice(1)).join(' and ')}.`);
    }
  } else {
    parts.push(`${name} is an aspiring ${role} focused on building practical skills and delivering measurable outcomes.`);
  }

  if (topSkills.length) {
    parts.push(`Core strengths include ${topSkills.slice(0, 4).join(', ')}${topSkills.length > 4 ? `, and ${topSkills.slice(4).join(', ')}` : ''}.`);
  }

  if (edu.length) {
    const e = edu[0];
    parts.push(
      `Academic background: ${e.degree || 'studies'} at ${e.school || 'university'}${e.year ? ` (${e.year})` : ''}.`
    );
  }

  if (projs.length) {
    parts.push(
      `Project experience covers ${projs
        .slice(0, 2)
        .map((p) => p.name + (p.tech ? ` (${p.tech})` : ''))
        .join(' and ')}.`
    );
  }

  if ((data.certificates || []).length) {
    parts.push(`Certified in ${(data.certificates || []).slice(0, 3).join(', ')}.`);
  }

  parts.push('Eager to contribute in a collaborative team and grow through real-world product work.');
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export function bulletsHtml(text: string) {
  const lines = String(text || '')
    .split(/\n/)
    .map((l) => l.replace(/^[\s•\-\*]+/, '').trim())
    .filter(Boolean);
  if (!lines.length) return '';
  return `<ul>${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`;
}
export function twoColList(items: string[]) {
  if (!items.length) return '';
  const mid = Math.ceil(items.length / 2);
  const left = items.slice(0, mid);
  const right = items.slice(mid);
  return `<div class="two-col"><ul>${left.map((i) => `<li>${esc(i)}</li>`).join('')}</ul><ul>${right.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></div>`;
}

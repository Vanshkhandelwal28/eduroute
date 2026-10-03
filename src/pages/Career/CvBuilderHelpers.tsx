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

/** Print / PDF preview via hidden iframe */
export function openPrintPreview(data: CvData) {
  const a = accentHex(data.accent || 'indigo');
  const skills = (data.skills || []).join(' · ');
  const exp = (data.experience || [])
    .filter((e) => e.role || e.title || e.company)
    .map((e) => `<div style="margin-bottom:10px"><strong>${esc(e.role || e.title || '')}</strong> @ ${esc(e.company || '')} <span style="color:#64748b">${esc(e.duration || '')}</span>${bulletsHtml(e.description || e.details || '')}</div>`)
    .join('');
  const edu = (data.education || [])
    .filter((e) => e.school || e.degree)
    .map((e) => `<div style="margin-bottom:8px"><strong>${esc(e.degree || '')}</strong> — ${esc(e.school || '')} <span style="color:#64748b">${esc(e.year || e.end || '')}</span></div>`)
    .join('');
  const proj = (data.projects || [])
    .filter((p) => p.name)
    .map((p) => `<div style="margin-bottom:8px"><strong>${esc(p.name)}</strong> <span style="color:#64748b">${esc(p.tech || p.link || '')}</span>${bulletsHtml(p.description || p.details || '')}</div>`)
    .join('');
  const certs = (data.certificates || []).map(esc).join(' · ');
  const langs = (data.languages || []).map(esc).join(' · ');
  const contact = [data.email, data.phone, data.city || data.location, data.linkedin].filter(Boolean).map(esc).join(' · ');

  const body = `
    <h1 style="color:${a};margin:0 0 4px;font-size:26px">${esc(data.fullName || 'Your Name')}</h1>
    <div style="color:#475569;font-size:14px">${esc(data.title || '')}</div>
    <div style="color:#64748b;font-size:12px;margin-top:2px">${contact}</div>
    ${data.summary ? `<div style="margin:12px 0">${esc(data.summary)}</div>` : ''}
    ${skills ? `<h2 style="border-bottom:2px solid ${a};color:${a};font-size:11px;text-transform:uppercase">Skills</h2><div>${esc(skills)}</div>` : ''}
    ${exp ? `<h2 style="border-bottom:2px solid ${a};color:${a};font-size:11px;text-transform:uppercase">Experience</h2>${exp}` : ''}
    ${edu ? `<h2 style="border-bottom:2px solid ${a};color:${a};font-size:11px;text-transform:uppercase">Education</h2>${edu}` : ''}
    ${certs ? `<h2 style="border-bottom:2px solid ${a};color:${a};font-size:11px;text-transform:uppercase">Certificates</h2><div>${certs}</div>` : ''}
    ${langs ? `<h2 style="border-bottom:2px solid ${a};color:${a};font-size:11px;text-transform:uppercase">Languages</h2><div>${langs}</div>` : ''}
    ${proj ? `<h2 style="border-bottom:2px solid ${a};color:${a};font-size:11px;text-transform:uppercase">Projects</h2>${proj}` : ''}
  `;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${esc(data.fullName || 'CV')}</title>
    <style>@page{margin:12mm;size:A4}body{font-family:system-ui,sans-serif;color:#0f172a;padding:28px;max-width:800px;margin:0 auto;font-size:13px}
    h2{margin:14px 0 6px;padding-bottom:2px}ul{margin:4px 0 0 16px;padding:0}li{margin-bottom:2px}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>${body}</body></html>`;

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0';
  document.body.appendChild(iframe);
  const idoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!idoc) {
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.focus(); w.print(); }
    else alert('Allow pop-ups to print your CV.');
    return;
  }
  idoc.open();
  idoc.write(html);
  idoc.close();
  setTimeout(() => {
    try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); } catch { /* ignore */ }
    setTimeout(() => { try { document.body.removeChild(iframe); } catch { /* ignore */ } }, 1500);
  }, 400);
}

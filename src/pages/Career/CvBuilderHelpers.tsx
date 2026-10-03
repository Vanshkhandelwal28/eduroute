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

export function buildClassicHtml(data: CvData) {
  const contactParts: string[] = [];
  if (data.city) contactParts.push(`<span class="ci">📍 ${esc(data.city)}</span>`);
  if (data.email) contactParts.push(`<span class="ci">✉ ${esc(data.email)}</span>`);
  if (data.phone) contactParts.push(`<span class="ci">📞 ${esc(data.phone)}</span>`);
  if (data.linkedin) contactParts.push(`<span class="ci">🔗 ${esc(data.linkedin)}</span>`);
  const exp = (data.experience || []).filter((e) => e.role || e.company).map((e) => `<div class="exp-item"><div class="exp-head"><div><div class="role">${esc(e.role)}</div><div class="company">${esc(e.company)}</div></div><div class="exp-meta"><div>${esc(e.duration)}</div>${e.location ? `<div class="loc">${esc(e.location)}</div>` : ''}</div></div>${bulletsHtml(e.description)}</div>`).join('');
  const edu = (data.education || []).filter((e) => e.school || e.degree).map((e) => `<div class="exp-item"><div class="exp-head"><div><div class="role">${esc(e.degree || 'Degree')}</div><div class="company">${esc(e.school)}</div></div><div class="exp-meta"><div>${esc(e.year)}</div>${e.location ? `<div class="loc">${esc(e.location)}</div>` : ''}</div></div></div>`).join('');
  const proj = (data.projects || []).filter((p) => p.name).map((p) => `<div class="exp-item"><div class="role">${esc(p.name)}${p.tech ? ` <span class="muted">· ${esc(p.tech)}</span>` : ''}</div>${bulletsHtml(p.description)}</div>`).join('');
  const skills = data.skills || [];
  const certs = data.certificates || [];
  const langs = data.languages || [];
  return `<div class="classic"><header class="hdr"><h1>${esc(data.fullName || 'Your Name')}</h1>${data.title ? `<div class="subtitle">${esc(data.title)}</div>` : ''}${contactParts.length ? `<div class="contact-row">${contactParts.join('')}</div>` : ''}</header>${data.summary ? `<section><h2>SUMMARY</h2><p class="sum">${esc(data.summary)}</p></section>` : ''}${exp ? `<section><h2>PROFESSIONAL EXPERIENCE</h2>${exp}</section>` : ''}${edu ? `<section><h2>EDUCATION</h2>${edu}</section>` : ''}${skills.length ? `<section><h2>SKILLS</h2>${twoColList(skills)}</section>` : ''}${certs.length ? `<section><h2>CERTIFICATES</h2>${twoColList(certs)}</section>` : ''}${langs.length ? `<section><h2>LANGUAGES</h2>${twoColList(langs)}</section>` : ''}${proj ? `<section><h2>PROJECTS</h2>${proj}</section>` : ''}</div>`;
}

export function buildSidebarHtml(data: CvData) {
  const sideContact: string[] = [];
  if (data.phone) sideContact.push(`<div class="sc">📞 ${esc(data.phone)}</div>`);
  if (data.email) sideContact.push(`<div class="sc">✉ ${esc(data.email)}</div>`);
  if (data.city) sideContact.push(`<div class="sc">📍 ${esc(data.city)}</div>`);
  if (data.linkedin) sideContact.push(`<div class="sc">🔗 ${esc(data.linkedin)}</div>`);
  const langs = data.languages || [];
  const langDots = langs.map((l) => `<div class="lang-row"><span>${esc(l)}</span><span class="dots">●●●●●</span></div>`).join('');
  const exp = (data.experience || []).filter((e) => e.role || e.company).map((e) => `<div class="item"><div class="item-title">${esc(e.company || e.role)}</div><div class="item-sub">${esc(e.role)}${e.duration ? ` · ${esc(e.duration)}` : ''}${e.location ? ` | ${esc(e.location)}` : ''}</div>${bulletsHtml(e.description)}</div>`).join('');
  const edu = (data.education || []).filter((e) => e.school || e.degree).map((e) => `<div class="item"><div class="item-title">${esc(e.degree || 'Degree')}</div><div class="item-sub">${esc(e.school)}${e.year ? ` · ${esc(e.year)}` : ''}${e.location ? ` | ${esc(e.location)}` : ''}</div></div>`).join('');
  const skills = data.skills || [];
  const skillsList = skills.length ? `<ul class="skill-list">${skills.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : '';
  const certs = data.certificates || [];
  const certsHtml = certs.length ? certs.map((c) => `<div class="award">${esc(c)}</div>`).join('') : '';
  const projs = (data.projects || []).filter((p) => p.name).map((p) => `<div class="item"><div class="item-title">${esc(p.name)}</div><div class="item-sub">${esc(p.tech)}</div>${bulletsHtml(p.description)}</div>`).join('');
  return `<div class="sidebar-layout"><aside class="side"><div class="photo-placeholder">👤</div><h1>${esc(data.fullName || 'Your Name')}</h1><div class="side-title">${esc(data.title || 'Professional')}</div><div class="side-contact">${sideContact.join('')}</div>${data.summary ? `<div class="side-block"><div class="side-h">PROFILE</div><p>${esc(data.summary)}</p></div>` : ''}${langDots ? `<div class="side-block"><div class="side-h">LANGUAGES</div>${langDots}</div>` : ''}${certsHtml ? `<div class="side-block"><div class="side-h">AWARDS</div>${certsHtml}</div>` : ''}</aside><main class="main">${exp ? `<section><div class="mh">💼 WORK EXPERIENCE</div>${exp}</section>` : ''}${edu ? `<section><div class="mh">🎓 EDUCATION</div>${edu}</section>` : ''}${skillsList ? `<section><div class="mh">💡 SKILLS</div>${skillsList}</section>` : ''}${projs ? `<section><div class="mh">📁 PROJECTS</div>${projs}</section>` : ''}</main></div>`;
}

export function buildSimpleHtml(data: CvData, a: string) {
  const skills = (data.skills || []).join(' · ');
  const edu = (data.education || []).filter((e) => e.school || e.degree).map((e) => `<div class="item"><strong>${esc(e.degree || 'Degree')}</strong> — ${esc(e.school)} <span class="muted">${esc(e.year)}${e.location ? ` · ${esc(e.location)}` : ''}</span></div>`).join('');
  const exp = (data.experience || []).filter((e) => e.role || e.company).map((e) => `<div class="item"><strong>${esc(e.role)}</strong> @ ${esc(e.company)} <span class="muted">${esc(e.duration)}${e.location ? ` · ${esc(e.location)}` : ''}</span>${bulletsHtml(e.description)}</div>`).join('');
  const proj = (data.projects || []).filter((p) => p.name).map((p) => `<div class="item"><strong>${esc(p.name)}</strong> <span class="muted">${esc(p.tech)}</span>${bulletsHtml(p.description)}</div>`).join('');
  const bar = data.template === 'modern' ? `<div style="height:6px;background:${a};margin:-28px -28px 18px"></div>` : '';
  const certs = data.certificates || [];
  const langs = data.languages || [];
  return `${bar}<h1 style="color:${a}">${esc(data.fullName || 'Your Name')}</h1><div class="title">${esc(data.title)}</div><div class="meta">${[data.email, data.phone, data.city, data.linkedin].filter(Boolean).map(esc).join(' · ')}</div>${data.summary ? `<div class="summary">${esc(data.summary)}</div>` : ''}${(data.skills || []).length ? `<h2 style="border-color:${a};color:${a}">Skills</h2><div>${esc(skills)}</div>` : ''}${exp ? `<h2 style="border-color:${a};color:${a}">Experience</h2>${exp}` : ''}${edu ? `<h2 style="border-color:${a};color:${a}">Education</h2>${edu}` : ''}${certs.length ? `<h2 style="border-color:${a};color:${a}">Certificates</h2><div>${certs.map(esc).join(' · ')}</div>` : ''}${langs.length ? `<h2 style="border-color:${a};color:${a}">Languages</h2><div>${langs.map(esc).join(' · ')}</div>` : ''}${proj ? `<h2 style="border-color:${a};color:${a}">Projects</h2>${proj}` : ''}`;
}

export function openPrintPreview(data: CvData) {
  const a = accentHex(data.accent);
  let body = '';
  let extraCss = '';
  if (data.template === 'classic') {
    body = buildClassicHtml(data);
    extraCss = `.classic{max-width:720px;margin:0 auto;font-family:Georgia,'Times New Roman',serif;color:#111;font-size:12.5px;line-height:1.45}.hdr{text-align:center;margin-bottom:18px}.hdr h1{margin:0;font-size:28px;font-weight:700}.subtitle{font-style:italic;font-size:14px;color:#444;margin-top:4px}.contact-row{display:flex;flex-wrap:wrap;justify-content:center;gap:12px 18px;margin-top:10px;font-size:11.5px;color:#333;font-family:system-ui,sans-serif}.ci{white-space:nowrap}h2{font-family:system-ui,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;border-bottom:1.5px solid #111;margin:16px 0 8px;padding-bottom:3px}.sum{margin:0;text-align:justify}.exp-item{margin-bottom:10px}.exp-head{display:flex;justify-content:space-between;gap:12px}.role{font-weight:700;font-size:13px}.company{font-style:italic;color:#333}.exp-meta{text-align:right;font-size:11.5px;white-space:nowrap;color:#222}.loc{color:#555}ul{margin:4px 0 0 18px;padding:0}li{margin-bottom:2px}.two-col{display:grid;grid-template-columns:1fr 1fr;gap:4px 24px}.two-col ul{margin-left:16px}.muted{color:#666;font-weight:400}`;
  } else if (data.template === 'professional') {
    body = buildSidebarHtml(data);
    extraCss = `.sidebar-layout{display:grid;grid-template-columns:240px 1fr;min-height:100vh;font-family:system-ui,sans-serif;font-size:12px}.side{background:#1e3a4c;color:#e8eef2;padding:28px 20px}.photo-placeholder{width:88px;height:88px;border-radius:50%;background:#2d4f63;display:flex;align-items:center;justify-content:center;font-size:36px;margin:0 auto 14px}.side h1{margin:0;font-size:20px;text-align:center;font-weight:700;color:#fff}.side-title{text-align:center;font-size:12px;color:#a8c0ce;margin:4px 0 16px}.side-contact{font-size:11px;margin-bottom:18px;line-height:1.7}.side-block{margin-top:16px}.side-h{font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;background:#2d4f63;padding:5px 8px;margin-bottom:8px;border-radius:3px}.side-block p{margin:0;font-size:11px;line-height:1.5;color:#d0dde6}.lang-row{display:flex;justify-content:space-between;margin-bottom:4px;font-size:11px}.dots{letter-spacing:2px;color:#7eb8d4;font-size:9px}.award{font-size:11px;margin-bottom:6px;line-height:1.4}.main{padding:24px 28px;color:#1a1a1a}.mh{font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;background:#e8eef2;padding:6px 10px;margin:0 0 12px;border-radius:3px;color:#1e3a4c}.item{margin-bottom:12px}.item-title{font-weight:700;font-size:13px}.item-sub{font-size:11px;color:#555;margin-bottom:4px}.main ul{margin:4px 0 0 16px;padding:0}.main li{margin-bottom:2px}@page{margin:0}body{margin:0;padding:0}`;
  } else {
    body = buildSimpleHtml(data, a);
    extraCss = `body{font-family:system-ui,sans-serif;color:#0f172a;padding:28px;max-width:800px;margin:0 auto;font-size:13px}h1{margin:0;font-size:26px}h2{font-size:11px;text-transform:uppercase;border-bottom:2px solid;margin:14px 0 6px;padding-bottom:2px}.title{font-size:14px;color:#475569}.meta{font-size:12px;color:#64748b;margin-top:2px}.summary{margin:10px 0}.item{margin-bottom:8px}.muted{color:#64748b}ul{margin:4px 0 0 16px;padding:0}`;
  }
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${esc(data.fullName || 'CV')}</title><style>@page{margin:12mm;size:A4}*{box-sizing:border-box}body{margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}${extraCss}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>${body}</body></html>`;

  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'CV Print');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none';
  document.body.appendChild(iframe);
  const idoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!idoc) {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (!w) alert('Please allow pop-ups to download / print your CV.');
    else setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }
  idoc.open();
  idoc.write(html);
  idoc.close();
  const trigger = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch { /* ignore */ }
    setTimeout(() => {
      try { document.body.removeChild(iframe); } catch { /* ignore */ }
    }, 1500);
  };
  setTimeout(trigger, 400);
}

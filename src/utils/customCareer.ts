/**
 * Custom career onboarding helpers (role + skills + CV extract).
 */
import { writeOnboarding, type OnboardingProfile } from './onboardingStore';

export function saveCustomCareer(opts: {
  role: string;
  skills: string[];
  cvSkills?: string[];
  missingSkills?: string[];
}) {
  const role = opts.role.trim().slice(0, 80);
  const skills = (opts.skills || []).map((s) => s.trim()).filter(Boolean).slice(0, 50);
  const cvSkills = (opts.cvSkills || []).map((s) => s.trim()).filter(Boolean).slice(0, 50);
  const missing = (opts.missingSkills || []).map((s) => s.trim()).filter(Boolean).slice(0, 30);
  writeOnboarding({
    interests: ['custom' as any],
    gapAnswers: [],
    missingSkills: missing,
    completedAt: new Date().toISOString(),
    skipped: false,
    customRole: role,
    customSkills: skills,
    cvSkills,
  } as OnboardingProfile);
}

/** Patterns ordered specific → general. C++/C# avoid trailing \\b (breaks on +/#). */
const SKILL_BANK: { pattern: RegExp; label: string }[] = [
  { pattern: /c\+\+|cpp\b/i, label: 'C++' },
  { pattern: /c#|csharp|\.net\b/i, label: 'C# / .NET' },
  { pattern: /\bjavascript\b/i, label: 'JavaScript' },
  { pattern: /\btypescript\b/i, label: 'TypeScript' },
  { pattern: /\bpython\b/i, label: 'Python' },
  { pattern: /\bjava\b(?!\s*script)/i, label: 'Java' },
  { pattern: /\bgolang\b|\bgo\s*lang\b/i, label: 'Golang' },
  { pattern: /\brust\b/i, label: 'Rust' },
  { pattern: /\bkotlin\b/i, label: 'Kotlin' },
  { pattern: /\bswift\b/i, label: 'Swift' },
  { pattern: /\bruby\b/i, label: 'Ruby' },
  { pattern: /\bphp\b/i, label: 'PHP' },
  { pattern: /\bscala\b/i, label: 'Scala' },
  { pattern: /(?:^|[^a-z0-9])js(?:[^a-z0-9]|$)/i, label: 'JavaScript' },
  { pattern: /(?:^|[^a-z0-9])ts(?:[^a-z0-9]|$)/i, label: 'TypeScript' },
  { pattern: /(?:^|[^a-z0-9])go(?:[^a-z0-9]|$)/i, label: 'Golang' },
  { pattern: /\breact(?:\.?js)?\b/i, label: 'React' },
  { pattern: /\bnext\.?js\b/i, label: 'Next.js' },
  { pattern: /\bvue(?:\.?js)?\b/i, label: 'Vue' },
  { pattern: /\bangular\b/i, label: 'Angular' },
  { pattern: /\bhtml5?\b/i, label: 'HTML' },
  { pattern: /\bcss3?\b/i, label: 'CSS' },
  { pattern: /\btailwind\b/i, label: 'Tailwind CSS' },
  { pattern: /\bredux\b/i, label: 'Redux' },
  { pattern: /frontend|front[- ]?end|frontened/i, label: 'Frontend' },
  { pattern: /\bnode(?:\.?js)?\b/i, label: 'Node.js' },
  { pattern: /\bexpress(?:\.?js)?\b/i, label: 'Express' },
  { pattern: /\bnest(?:\.?js)?\b/i, label: 'NestJS' },
  { pattern: /\bdjango\b/i, label: 'Django' },
  { pattern: /\bflask\b/i, label: 'Flask' },
  { pattern: /\bfastapi\b/i, label: 'FastAPI' },
  { pattern: /\bspring\s*boot\b|\bspring\b/i, label: 'Spring Boot' },
  { pattern: /\brest(?:ful)?\s*apis?\b|\brestapi\b/i, label: 'REST API' },
  { pattern: /\bgraphql\b/i, label: 'GraphQL' },
  { pattern: /\bgrpc\b/i, label: 'gRPC' },
  { pattern: /\bjwt\b/i, label: 'JWT' },
  { pattern: /\boauth2?\b/i, label: 'OAuth' },
  { pattern: /\bmicroservices?\b/i, label: 'Microservices' },
  { pattern: /\bbackend\b/i, label: 'Backend' },
  { pattern: /\bfull[- ]?stack\b/i, label: 'Full-stack' },
  { pattern: /(?:^|[^a-z0-9])api(?:[^a-z0-9]|$)/i, label: 'API' },
  { pattern: /\bdsa\b|data\s*structures?/i, label: 'DSA' },
  { pattern: /\boops?\b|\boop\b|object[- ]oriented/i, label: 'OOP' },
  { pattern: /\balgorithms?\b/i, label: 'Algorithms' },
  { pattern: /\bsystem\s*design\b/i, label: 'System Design' },
  { pattern: /\bpostgresql\b|\bpostgres\b/i, label: 'PostgreSQL' },
  { pattern: /\bmysql\b/i, label: 'MySQL' },
  { pattern: /\bmongodb\b|\bmongo\b/i, label: 'MongoDB' },
  { pattern: /\bredis\b/i, label: 'Redis' },
  { pattern: /\bsql\b/i, label: 'SQL' },
  { pattern: /\bnosql\b/i, label: 'NoSQL' },
  { pattern: /\bdocker\b/i, label: 'Docker' },
  { pattern: /\bkubernetes\b|\bk8s\b/i, label: 'Kubernetes' },
  { pattern: /\baws\b|amazon web services/i, label: 'AWS' },
  { pattern: /\bazure\b/i, label: 'Azure' },
  { pattern: /\bgcp\b|google cloud/i, label: 'GCP' },
  { pattern: /\bterraform\b/i, label: 'Terraform' },
  { pattern: /\bci\s*\/\s*cd\b|\bcicd\b|jenkins|github actions/i, label: 'CI/CD' },
  { pattern: /\blinux\b/i, label: 'Linux' },
  { pattern: /\bkafka\b/i, label: 'Kafka' },
  { pattern: /\bgit\b/i, label: 'Git' },
  { pattern: /\bagile\b|\bscrum\b/i, label: 'Agile / Scrum' },
  { pattern: /\bmachine\s*learning\b/i, label: 'Machine Learning' },
  { pattern: /project\s*management/i, label: 'Project Management' },
];

/** Pull readable words from PDF/binary streams (keeps short skill tokens). */
export function extractReadableTextFromBinary(raw: string): string {
  const cleaned = raw
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u024F]/g, ' ')
    .replace(/[^\w+#./\-\s]+/g, ' ');
  const tokens = cleaned.match(/[A-Za-z][A-Za-z0-9+#./\-]{0,40}/g) || [];
  const short = cleaned.match(/\b(?:js|ts|go|c\+\+|cpp|jwt|dsa|oop|html|css|sql|aws|api)\b/gi) || [];
  return [...tokens, ...short].join(' ');
}

function extractFromSkillSections(text: string): string[] {
  const found: string[] = [];
  const add = (s: string) => {
    const t = s.replace(/^[\-\*•◦\d.)\s]+/, '').trim();
    if (t.length < 1 || t.length > 40) return;
    if (/^(and|or|with|using|etc|skills?)$/i.test(t)) return;
    if (!found.some((f) => f.toLowerCase() === t.toLowerCase())) found.push(t);
  };

  const sectionRe =
    /(?:skills?|tech(?:nical)?\s*stack|technologies|tools|languages?|frameworks?|competencies)\s*[:\-–]?\s*([\s\S]{0,1500}?)(?=\n\s*(?:certificates?|education|experience|projects?|languages?|summary|professional)\b|\n{2,}[A-Z]|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = sectionRe.exec(text)) !== null) {
    const block = m[1] || '';
    block.split(/[,|•·;\/\n\r]+|\s{2,}/).forEach(add);
  }

  const lines = text.split(/\r?\n/);
  let inSkills = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^skills?\s*$/i.test(trimmed) || /^skills?\s*[:\-]/i.test(trimmed)) {
      inSkills = true;
      const after = trimmed.replace(/^skills?\s*[:\-]?\s*/i, '');
      if (after) after.split(/[,|]/).forEach(add);
      continue;
    }
    if (inSkills) {
      if (/^(certificates?|education|experience|projects?|languages?|summary|professional)\b/i.test(trimmed)) {
        inSkills = false;
        continue;
      }
      if (trimmed.length > 0 && trimmed.length < 40) add(trimmed);
    }
  }
  return found;
}

export function extractSkillsFromText(text: string): string[] {
  if (!text || text.length < 2) return [];
  const found: string[] = [];
  const add = (label: string) => {
    const t = label.trim();
    if (!t || t.length > 45) return;
    if (!found.some((f) => f.toLowerCase() === t.toLowerCase())) found.push(t);
  };

  for (const { pattern, label } of SKILL_BANK) {
    if (pattern.test(text)) add(label);
  }

  for (const token of extractFromSkillSections(text)) {
    let matched = false;
    for (const { pattern, label } of SKILL_BANK) {
      if (pattern.test(token)) {
        add(label);
        matched = true;
        break;
      }
    }
    if (!matched && token.length >= 2 && token.length <= 24 && /[a-z]/i.test(token)) {
      const lower = token.toLowerCase();
      if (lower === 'oops' || lower === 'oop') add('OOP');
      else if (lower === 'frontened' || lower === 'frontend') add('Frontend');
      else if (lower === 'js') add('JavaScript');
      else if (lower === 'c++' || lower === 'cpp') add('C++');
      else if (
        !/^(the|and|for|with|from|this|that|have|has|was|are|his|her|student|intern)$/i.test(token)
      ) {
        add(token);
      }
    }
  }

  if (text.length < 500 && /[,|]/.test(text)) {
    text
      .split(/[,|;\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 1 && s.length < 40)
      .forEach((s) => {
        for (const { pattern, label } of SKILL_BANK) {
          if (pattern.test(s)) {
            add(label);
            return;
          }
        }
        add(s);
      });
  }

  return found.slice(0, 50);
}

export function hoursToCourseDays(hours: number): number {
  const h = Math.max(4, Number(hours) || 8);
  return Math.min(90, Math.max(5, Math.round(h / 2.5)));
}

export function normalizeSkillList(items: unknown[]): string[] {
  const out: string[] = [];
  for (const item of items) {
    let s = String(item || '').trim();
    if (!s) continue;
    s = s.replace(/^[\-\*•\d.)\s]+/, '').replace(/\s+/g, ' ').slice(0, 50);
    if (s.length < 1) continue;
    if (/^(skill|skills|technologies|tools|none|n\/a)$/i.test(s)) continue;
    const low = s.toLowerCase();
    if (low === 'js') s = 'JavaScript';
    else if (low === 'ts') s = 'TypeScript';
    else if (low === 'c++' || low === 'cpp') s = 'C++';
    else if (low === 'oops' || low === 'oop') s = 'OOP';
    else if (low === 'frontened' || low === 'front-end') s = 'Frontend';
    else if (low === 'jwt') s = 'JWT';
    else if (low === 'dsa') s = 'DSA';
    else if (low === 'html') s = 'HTML';
    else if (low === 'css') s = 'CSS';
    else if (low === 'aws') s = 'AWS';
    if (!out.some((x) => x.toLowerCase() === s.toLowerCase())) out.push(s);
  }
  return out.slice(0, 50);
}

export async function extractSkillsWithAI(text: string): Promise<string[]> {
  const local = extractSkillsFromText(text);
  const snippet = String(text || '').slice(0, 10000).trim();
  if (snippet.length < 15) return local;

  const prompt =
    'You extract technical skills from a CV for EduRoute.\n' +
    'RULES:\n' +
    '1. List EVERY skill mentioned — even short ones: jwt, html, css, js, dsa, oop, c++, api, aws.\n' +
    '2. Include languages, frameworks, tools, databases, cloud, CS topics (DSA, OOP), and certifications tech (AWS).\n' +
    '3. Do NOT invent skills not in the text. Do NOT skip skills because they are short.\n' +
    '4. Normalize: js→JavaScript, c++→C++, oops→OOP, frontened→Frontend, jwt→JWT.\n' +
    '5. Reply ONLY with this JSON (no markdown, no explanation):\n' +
    '{"skills":["JWT","C++","DSA","OOP","HTML","CSS","JavaScript"]}\n\n' +
    '--- CV TEXT ---\n' +
    snippet +
    '\n--- END ---';

  try {
    const res = await fetch('/api/buddy-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'cv-skill-extract',
        message: prompt,
        language: 'english',
      }),
    });
    const data = await res.json();
    if (!res.ok || !data?.ok || typeof data.reply !== 'string') return local;
    if (/limited mode|No AI key found/i.test(data.reply)) return local;

    const reply = data.reply;
    let aiList: string[] = [];
    try {
      const objMatch = reply.match(/\{[\s\S]*\}/);
      if (objMatch) {
        const parsed = JSON.parse(objMatch[0]);
        if (Array.isArray(parsed.skills)) aiList = normalizeSkillList(parsed.skills);
        else if (Array.isArray(parsed)) aiList = normalizeSkillList(parsed);
      }
      if (!aiList.length) {
        const arrMatch = reply.match(/\[[\s\S]*\]/);
        if (arrMatch) aiList = normalizeSkillList(JSON.parse(arrMatch[0]));
      }
    } catch {
      /* fall through */
    }

    if (!aiList.length) return local;
    return normalizeSkillList([...local, ...aiList]);
  } catch {
    return local;
  }
}

export function applySkillProgressToNodes<
  T extends { id: string; skills?: string[]; status?: string },
>(nodes: T[], knownSkills: string[]): T[] {
  const known = new Set(knownSkills.map((s) => s.toLowerCase().trim()).filter(Boolean));
  const hasSkill = (s: string) => {
    const k = s.toLowerCase().trim();
    if (!k) return false;
    if (known.has(k)) return true;
    for (const x of known) {
      if (x.includes(k) || k.includes(x)) return true;
    }
    return false;
  };

  let foundCurrent = false;
  return nodes.map((n) => {
    const skills = Array.isArray(n.skills) ? n.skills : [];
    const covered =
      skills.length > 0 &&
      skills.filter((s) => hasSkill(String(s))).length >= Math.ceil(skills.length * 0.6);
    const forceOpen = /system\s*design|interview|portfolio|capstone/i.test(
      String((n as any).title || n.id),
    );
    if (covered && !forceOpen) return { ...n, status: 'completed' as const };
    if (!foundCurrent) {
      foundCurrent = true;
      return { ...n, status: 'current' as const };
    }
    return { ...n, status: 'locked' as const };
  });
}

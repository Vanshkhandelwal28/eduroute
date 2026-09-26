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

const SKILL_BANK: { pattern: RegExp; label: string }[] = [
  { pattern: /\bjavascript\b|\bjs\b(?!\w)/i, label: 'JavaScript' },
  { pattern: /\btypescript\b|\bts\b(?!\w)/i, label: 'TypeScript' },
  { pattern: /\bpython\b/i, label: 'Python' },
  { pattern: /\bjava\b(?!\s*script)/i, label: 'Java' },
  { pattern: /\bgolang\b|\bgo\b(?:\s*lang)?\b/i, label: 'Golang' },
  { pattern: /\brust\b/i, label: 'Rust' },
  { pattern: /\bc\+\+\b|\bcpp\b/i, label: 'C++' },
  { pattern: /\bc#\b|\bcsharp\b|\.net\b/i, label: 'C# / .NET' },
  { pattern: /\bkotlin\b/i, label: 'Kotlin' },
  { pattern: /\bswift\b/i, label: 'Swift' },
  { pattern: /\bruby\b/i, label: 'Ruby' },
  { pattern: /\bphp\b/i, label: 'PHP' },
  { pattern: /\bscala\b/i, label: 'Scala' },
  { pattern: /\bshell\b|\bbash\b/i, label: 'Shell / Bash' },
  { pattern: /\breact(?:\.?js)?\b/i, label: 'React' },
  { pattern: /\bnext\.?js\b/i, label: 'Next.js' },
  { pattern: /\bvue(?:\.?js)?\b/i, label: 'Vue' },
  { pattern: /\bangular\b/i, label: 'Angular' },
  { pattern: /\bhtml5?\b/i, label: 'HTML' },
  { pattern: /\bcss3?\b/i, label: 'CSS' },
  { pattern: /\btailwind\b/i, label: 'Tailwind CSS' },
  { pattern: /\bredux\b/i, label: 'Redux' },
  { pattern: /\bnode(?:\.?js)?\b/i, label: 'Node.js' },
  { pattern: /\bexpress(?:\.?js)?\b/i, label: 'Express' },
  { pattern: /\bnest(?:\.?js)?\b/i, label: 'NestJS' },
  { pattern: /\bdjango\b/i, label: 'Django' },
  { pattern: /\bflask\b/i, label: 'Flask' },
  { pattern: /\bfastapi\b/i, label: 'FastAPI' },
  { pattern: /\bspring\s*boot\b|\bspring\b/i, label: 'Spring Boot' },
  { pattern: /\brest\s*apis?\b|\brestful\b|\brestapi\b/i, label: 'REST API' },
  { pattern: /\bgraphql\b/i, label: 'GraphQL' },
  { pattern: /\bgrpc\b/i, label: 'gRPC' },
  { pattern: /\bjwt\b/i, label: 'JWT' },
  { pattern: /\boauth2?\b/i, label: 'OAuth' },
  { pattern: /\bmicroservices?\b/i, label: 'Microservices' },
  { pattern: /\bbackend\b/i, label: 'Backend' },
  { pattern: /\bfrontend\b/i, label: 'Frontend' },
  { pattern: /\bfull[- ]?stack\b/i, label: 'Full-stack' },
  { pattern: /\bpostgresql\b|\bpostgres\b/i, label: 'PostgreSQL' },
  { pattern: /\bmysql\b/i, label: 'MySQL' },
  { pattern: /\bmongodb\b|\bmongo\b/i, label: 'MongoDB' },
  { pattern: /\bredis\b/i, label: 'Redis' },
  { pattern: /\belasticsearch\b/i, label: 'Elasticsearch' },
  { pattern: /\bcassandra\b/i, label: 'Cassandra' },
  { pattern: /\bdynamodb\b/i, label: 'DynamoDB' },
  { pattern: /\bsql\b/i, label: 'SQL' },
  { pattern: /\bnosql\b/i, label: 'NoSQL' },
  { pattern: /\bdocker\b/i, label: 'Docker' },
  { pattern: /\bkubernetes\b|\bk8s\b/i, label: 'Kubernetes' },
  { pattern: /\baws\b|amazon web services/i, label: 'AWS' },
  { pattern: /\bazure\b/i, label: 'Azure' },
  { pattern: /\bgcp\b|google cloud/i, label: 'GCP' },
  { pattern: /\bterraform\b/i, label: 'Terraform' },
  { pattern: /\bansible\b/i, label: 'Ansible' },
  { pattern: /\bci\s*\/\s*cd\b|\bcicd\b|jenkins|github actions|gitlab ci/i, label: 'CI/CD' },
  { pattern: /\blinux\b/i, label: 'Linux' },
  { pattern: /\bkafka\b/i, label: 'Kafka' },
  { pattern: /\brabbitmq\b/i, label: 'RabbitMQ' },
  { pattern: /\bsystem\s*design\b/i, label: 'System Design' },
  { pattern: /\bdata\s*structures?\b|\bdsa\b/i, label: 'DSA' },
  { pattern: /\balgorithms?\b/i, label: 'Algorithms' },
  { pattern: /\bagile\b|\bscrum\b/i, label: 'Agile / Scrum' },
  { pattern: /\bgit\b/i, label: 'Git' },
  { pattern: /\bunit\s*test/i, label: 'Unit Testing' },
  { pattern: /\bjest\b/i, label: 'Jest' },
  { pattern: /\bcypress\b/i, label: 'Cypress' },
  { pattern: /\bmachine\s*learning\b/i, label: 'Machine Learning' },
  { pattern: /\btensorflow\b/i, label: 'TensorFlow' },
  { pattern: /\bpytorch\b/i, label: 'PyTorch' },
  { pattern: /\bpandas\b/i, label: 'Pandas' },
  { pattern: /\bpower\s*bi\b/i, label: 'Power BI' },
  { pattern: /\btableau\b/i, label: 'Tableau' },
];

function extractFromSkillSections(text: string): string[] {
  const found: string[] = [];
  const sectionRe =
    /(?:^|\n)\s*(?:technical\s+)?(?:skills?|tech(?:nical)?\s*stack|technologies|tools|languages?|frameworks?|libraries|competencies|expertise)\s*[:\-–]?\s*([\s\S]{0,1200}?)(?=\n\s*[A-Z][A-Za-z &/]{2,40}\s*[:\-–]?\s*\n|\n\s*\n\s*[A-Z]|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = sectionRe.exec(text)) !== null) {
    const block = m[1] || '';
    block
      .split(/[,|•·;\/\n\r]+|\s{2,}/)
      .map((s) => s.replace(/^[\-\*●◦]\s*/, '').trim())
      .filter((s) => s.length > 1 && s.length < 45 && !/^(and|or|with|using|etc)$/i.test(s))
      .forEach((s) => {
        if (!found.some((f) => f.toLowerCase() === s.toLowerCase())) found.push(s);
      });
  }
  const lineRe = /(?:skills?|tech\s*stack|technologies|tools)\s*[:\-–]\s*([^\n]+)/gi;
  while ((m = lineRe.exec(text)) !== null) {
    m[1]
      .split(/[,|•·;\/]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 1 && s.length < 40)
      .forEach((s) => {
        if (!found.some((f) => f.toLowerCase() === s.toLowerCase())) found.push(s);
      });
  }
  return found;
}

export function extractSkillsFromText(text: string): string[] {
  if (!text || text.length < 3) return [];
  const found: string[] = [];
  const add = (label: string) => {
    const t = label.trim();
    if (!t || t.length > 45) return;
    if (!found.some((f) => f.toLowerCase() === t.toLowerCase())) found.push(t);
  };
  for (const { pattern, label } of SKILL_BANK) {
    if (pattern.test(text)) add(label);
  }
  extractFromSkillSections(text).forEach(add);
  if (text.length < 500 && /[,|]/.test(text)) {
    text
      .split(/[,|;\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 1 && s.length < 40)
      .forEach(add);
  }
  return found.slice(0, 50);
}

export function hoursToCourseDays(hours: number): number {
  const h = Math.max(4, Number(hours) || 8);
  const days = Math.round(h / 2.5);
  return Math.min(90, Math.max(5, days));
}

export function normalizeSkillList(items: unknown[]): string[] {
  const out: string[] = [];
  for (const item of items) {
    let s = String(item || '').trim();
    if (!s) continue;
    s = s.replace(/^[\-\*•\d.)\s]+/, '').replace(/\s+/g, ' ').slice(0, 50);
    if (s.length < 2) continue;
    if (/^(skill|skills|technologies|tools|none|n\/a)$/i.test(s)) continue;
    if (!out.some((x) => x.toLowerCase() === s.toLowerCase())) out.push(s);
  }
  return out.slice(0, 50);
}

/**
 * AI skill extract — full CV text in, skills-only JSON out.
 */
export async function extractSkillsWithAI(text: string): Promise<string[]> {
  const local = extractSkillsFromText(text);
  const snippet = String(text || '').slice(0, 8000).trim();
  if (snippet.length < 20) return local;

  const prompt =
    'You are a skills extractor for EduRoute.\n' +
    'Read the CV / resume text below carefully.\n' +
    'List EVERY technical skill the candidate ALREADY has (languages, frameworks, tools, databases, cloud, practices).\n' +
    'Ignore soft skills like "team player" unless they are engineering practices (e.g. Agile, CI/CD).\n' +
    'Reply with ONLY this JSON template — no markdown fences, no extra text:\n' +
    '{"skills":["skill1","skill2","skill3"]}\n' +
    'Use short names (max 40 chars each). Max 40 skills.\n\n' +
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
    const merged = normalizeSkillList([...local, ...aiList]);
    return merged.length ? merged : local;
  } catch {
    return local;
  }
}

/**
 * Mark path nodes completed when the student already has most of that node's skills.
 */
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
    if (covered && !forceOpen) {
      return { ...n, status: 'completed' as const };
    }
    if (!foundCurrent) {
      foundCurrent = true;
      return { ...n, status: 'current' as const };
    }
    return { ...n, status: 'locked' as const };
  });
}

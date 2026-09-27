/**
 * Multi-step course generation: outline → topic-matched resources → timeline.
 * Uses /api/buddy-chat when live; falls back to structured templates.
 * Resources are scored by topic title + skills + course interests (not a single key).
 */

import type { AiDesignedCourse, CourseTopic } from './aiCourseStore';

export type GeneratePhase =
  | 'idle'
  | 'analysing_profile'
  | 'mapping_demand'
  | 'building_outline'
  | 'attaching_resources'
  | 'finalising'
  | 'done'
  | 'error';

export type GenerateInput = {
  durationDays: number;
  interests: string[];
  customInterest?: string;
  field: string;
  skillGaps: string[];
  userId?: string;
  role?: string;
  knownSkills?: string[];
};

type Yt = { url: string; title: string };
type Doc = { url: string; title: string };
type ResourcePack = { keys: string[]; yt: Yt[]; docs: Doc[] };

const RESOURCE_PACKS: ResourcePack[] = [
  {
    keys: ['devops', 'sre', 'ci/cd', 'pipeline'],
    yt: [
      { url: 'https://www.youtube.com/watch?v=j5Zsa_e1XeE', title: 'TechWorld with Nana — DevOps Bootcamp Overview' },
      { url: 'https://www.youtube.com/watch?v=WvfzA1_JVqA', title: 'freeCodeCamp — DevOps Prerequisites Course' },
    ],
    docs: [
      { url: 'https://roadmap.sh/devops', title: 'DevOps Roadmap' },
      { url: 'https://www.atlassian.com/devops', title: 'Atlassian DevOps guide' },
    ],
  },
  {
    keys: ['docker', 'container'],
    yt: [
      { url: 'https://www.youtube.com/watch?v=3c-iBn73dDE', title: 'freeCodeCamp — Docker Tutorial for Beginners' },
      { url: 'https://www.youtube.com/watch?v=fqMOX6JJhGo', title: 'TechWorld with Nana — Docker Tutorial' },
    ],
    docs: [{ url: 'https://docs.docker.com/get-started/', title: 'Docker Get Started' }],
  },
  {
    keys: ['kubernetes', 'k8s'],
    yt: [
      { url: 'https://www.youtube.com/watch?v=X48VuDVv0do', title: 'freeCodeCamp — Kubernetes Course' },
      { url: 'https://www.youtube.com/watch?v=s_o8dwzRlu4', title: 'TechWorld with Nana — Kubernetes Tutorial' },
    ],
    docs: [{ url: 'https://kubernetes.io/docs/tutorials/', title: 'Kubernetes Tutorials' }],
  },
  {
    keys: ['aws', 'cloud', 'terraform'],
    yt: [
      { url: 'https://www.youtube.com/watch?v=ulprqHHWlng', title: 'freeCodeCamp — AWS Certified Cloud Practitioner' },
      { url: 'https://www.youtube.com/watch?v=3hLmDS179YE', title: 'TechWorld with Nana — Terraform Course' },
    ],
    docs: [{ url: 'https://docs.aws.amazon.com/', title: 'AWS Documentation' }],
  },
  {
    keys: ['linux', 'shell', 'bash'],
    yt: [
      { url: 'https://www.youtube.com/watch?v=sWBHKfXTAqM', title: 'freeCodeCamp — Linux Operating System' },
      { url: 'https://www.youtube.com/watch?v=GtovwKUrOZQ', title: 'NetworkChuck — Linux for Beginners' },
    ],
    docs: [{ url: 'https://linuxjourney.com/', title: 'Linux Journey' }],
  },
  {
    keys: ['cyber', 'security', 'owasp', 'ethical', 'pentest'],
    yt: [
      { url: 'https://www.youtube.com/watch?v=U_P23SqJeZQ', title: 'freeCodeCamp — Cybersecurity Full Course' },
      { url: 'https://www.youtube.com/watch?v=fNzpcB7OeRI', title: 'NetworkChuck — Ethical Hacking' },
    ],
    docs: [
      { url: 'https://owasp.org/www-project-top-ten/', title: 'OWASP Top 10' },
      { url: 'https://roadmap.sh/cyber-security', title: 'Cyber Security Roadmap' },
    ],
  },
  {
    keys: ['react', 'frontend'],
    yt: [
      { url: 'https://www.youtube.com/watch?v=bMknfKXIFA8', title: 'freeCodeCamp — React Course' },
      { url: 'https://www.youtube.com/watch?v=LDB4uaJ87e0', title: 'Traversy Media — React Crash Course' },
    ],
    docs: [{ url: 'https://react.dev/learn', title: 'React Docs — Learn' }],
  },
  {
    keys: ['node', 'express', 'nestjs'],
    yt: [
      { url: 'https://www.youtube.com/watch?v=Oe421EPjeBE', title: 'freeCodeCamp — Node.js & Express' },
      { url: 'https://www.youtube.com/watch?v=fBNz5xF-Kx4', title: 'Traversy — Node.js Crash Course' },
    ],
    docs: [{ url: 'https://nodejs.org/en/learn', title: 'Node.js Learn' }],
  },
  {
    keys: ['golang', 'go lang', ' go '],
    yt: [
      { url: 'https://www.youtube.com/watch?v=YS4e4q9oBaU', title: 'freeCodeCamp — Learn Go' },
      { url: 'https://www.youtube.com/watch?v=un6ZyFkq-e0', title: 'Traversy — Go Crash Course' },
    ],
    docs: [{ url: 'https://go.dev/doc/tutorial/getting-started', title: 'Go Getting Started' }],
  },
  {
    keys: ['backend', 'api', 'rest', 'jwt', 'oauth', 'microservice'],
    yt: [
      { url: 'https://www.youtube.com/watch?v=fgTGADljAeg', title: 'Backend Development Roadmap' },
      { url: 'https://www.youtube.com/watch?v=Oe421EPjeBE', title: 'Node / Express Full Course' },
    ],
    docs: [{ url: 'https://roadmap.sh/backend', title: 'Backend Roadmap' }],
  },
  {
    keys: ['javascript', 'js'],
    yt: [
      { url: 'https://www.youtube.com/watch?v=PkZNo7MFNFg', title: 'freeCodeCamp — JavaScript Full Course' },
      { url: 'https://www.youtube.com/watch?v=G3e-cpL7ydc', title: 'HTML & CSS Full Course' },
    ],
    docs: [{ url: 'https://javascript.info/', title: 'JavaScript.info' }],
  },
  {
    keys: ['python'],
    yt: [
      { url: 'https://www.youtube.com/watch?v=rfscVS0vtbw', title: 'freeCodeCamp — Python Full Course' },
      { url: 'https://www.youtube.com/watch?v=_uQrJ0TkZlc', title: 'Programming with Mosh — Python' },
    ],
    docs: [{ url: 'https://docs.python.org/3/tutorial/', title: 'Python Tutorial' }],
  },
  {
    keys: ['typescript'],
    yt: [
      { url: 'https://www.youtube.com/watch?v=30LWjhZzg50', title: 'TypeScript Crash Course' },
      { url: 'https://www.youtube.com/watch?v=BwuLxPH8IDs', title: 'TypeScript for Beginners' },
    ],
    docs: [{ url: 'https://www.typescriptlang.org/docs/', title: 'TypeScript Handbook' }],
  },
  {
    keys: ['data', 'analytics', 'pandas', 'eda'],
    yt: [
      { url: 'https://www.youtube.com/watch?v=r-uOLxNrNk8', title: 'freeCodeCamp — Data Analysis with Python' },
      { url: 'https://www.youtube.com/watch?v=ua-CiDNNj30', title: 'Alex The Analyst — Portfolio Project' },
    ],
    docs: [{ url: 'https://roadmap.sh/data-analyst', title: 'Data Analyst Roadmap' }],
  },
  {
    keys: ['sql', 'database', 'postgres', 'mysql', 'mongo', 'nosql', 'indexing'],
    yt: [
      { url: 'https://www.youtube.com/watch?v=HXV3zeQKqGY', title: 'freeCodeCamp — SQL Full Course' },
      { url: 'https://www.youtube.com/watch?v=7S_tz1z_5bA', title: 'MySQL Tutorial for Beginners' },
    ],
    docs: [{ url: 'https://www.postgresql.org/docs/', title: 'PostgreSQL Docs' }],
  },
  {
    keys: ['power bi', 'powerbi'],
    yt: [{ url: 'https://www.youtube.com/watch?v=AGrl-H87pRU', title: 'Power BI Full Course — freeCodeCamp' }],
    docs: [{ url: 'https://learn.microsoft.com/en-us/power-bi/', title: 'Power BI Learn' }],
  },
  {
    keys: ['tableau'],
    yt: [{ url: 'https://www.youtube.com/watch?v=TPMlZxRRaBQ', title: 'Tableau Full Course — freeCodeCamp' }],
    docs: [{ url: 'https://www.tableau.com/learn/training', title: 'Tableau Training' }],
  },
  {
    keys: ['machine learning', 'ml', 'ai'],
    yt: [{ url: 'https://www.youtube.com/watch?v=i_LwzRVPQbw', title: 'freeCodeCamp — Machine Learning for Everybody' }],
    docs: [{ url: 'https://roadmap.sh/ai-data-scientist', title: 'AI & Data Scientist Roadmap' }],
  },
  {
    keys: ['system design', 'scalability', 'distributed'],
    yt: [
      { url: 'https://www.youtube.com/watch?v=xpDnVSmXF_M', title: 'System Design for Beginners' },
      { url: 'https://www.youtube.com/watch?v=F2RmT0C6_lI', title: 'System Design Primer' },
    ],
    docs: [{ url: 'https://github.com/donnemartin/system-design-primer', title: 'System Design Primer' }],
  },
  {
    keys: ['dsa', 'algorithm', 'data structure', 'interview'],
    yt: [
      { url: 'https://www.youtube.com/watch?v=8hly31xKli0', title: 'freeCodeCamp — Algorithms & Data Structures' },
    ],
    docs: [{ url: 'https://leetcode.com/explore/', title: 'LeetCode Explore' }],
  },
];

const FALLBACK_YT: Yt[] = [
  { url: 'https://www.youtube.com/watch?v=PkZNo7MFNFg', title: 'freeCodeCamp — JavaScript Full Course' },
];
const FALLBACK_DOC: Doc[] = [
  { url: 'https://developer.mozilla.org/en-US/docs/Web', title: 'MDN Web Docs' },
];

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

function scorePack(pack: ResourcePack, hay: string): number {
  let score = 0;
  for (const key of pack.keys) {
    if (hay.includes(key)) score += key.length > 4 ? 3 : 2;
  }
  return score;
}

function packForTopic(
  topic: { title: string; skills?: string[] },
  interests: string[],
): { yt: Yt[]; docs: Doc[] } {
  const primary = `${topic.title} ${(topic.skills || []).join(' ')}`.toLowerCase();
  const secondary = interests.join(' ').toLowerCase();
  let best: ResourcePack | null = null;
  let bestScore = 0;
  for (const pack of RESOURCE_PACKS) {
    const s = scorePack(pack, primary) * 2 + scorePack(pack, secondary);
    if (s > bestScore) {
      bestScore = s;
      best = pack;
    }
  }
  if (!best || bestScore === 0) {
    for (const pack of RESOURCE_PACKS) {
      const s = scorePack(pack, secondary);
      if (s > bestScore) {
        bestScore = s;
        best = pack;
      }
    }
  }
  return {
    yt: best?.yt?.length ? best.yt : FALLBACK_YT,
    docs: best?.docs?.length ? best.docs : FALLBACK_DOC,
  };
}

function attachMatchedResources(topics: CourseTopic[], interests: string[]): CourseTopic[] {
  return topics.map((t, i) => {
    const pack = packForTopic(t, interests);
    return {
      ...t,
      youtubeUrl: t.youtubeUrl || pack.yt[i % pack.yt.length].url,
      youtubeTitle: t.youtubeTitle || pack.yt[i % pack.yt.length].title,
      docUrl: t.docUrl || pack.docs[i % pack.docs.length].url,
      docTitle: t.docTitle || pack.docs[i % pack.docs.length].title,
    };
  });
}

function topicCountForDays(days: number) {
  if (days <= 7) return 5;
  if (days <= 15) return 8;
  if (days <= 30) return 12;
  return 16;
}

function hoursPerTopic(days: number, count: number) {
  const total = Math.max(days * 2.5, count * 3);
  return Math.max(2, Math.round(total / count));
}

function expandInterestModules(interest: string): string[] {
  const k = interest.toLowerCase().trim();
  if (!k || k === 'custom' || /role\s*core|core\s*skills|general/.test(k)) return [];
  if (/devops|dev ops|sre/.test(k))
    return ['Linux & Shell', 'Docker', 'CI/CD Pipelines', 'Kubernetes', 'AWS / Cloud', 'Terraform & Infra'];
  if (/cyber|security|ethical|pentest|infosec/.test(k))
    return ['Security Fundamentals', 'Network Security', 'OWASP Top 10', 'Ethical Hacking Basics', 'Defensive Security'];
  if (/data.?analyst|analytics|business intelligence/.test(k))
    return ['SQL', 'Python for Data', 'EDA & Visualization', 'Dashboards (Power BI / Tableau)', 'Analytics Projects'];
  if (/frontend|react/.test(k))
    return ['HTML & CSS', 'JavaScript', 'React', 'TypeScript', 'Frontend Projects'];
  if (/backend|node|api|golang|go\b|java\b|spring/.test(k))
    return ['HTTP & REST APIs', 'Auth (JWT / OAuth)', interest, 'Databases', 'Service Design', 'Backend Project'];
  if (/system\s*design/.test(k))
    return ['Scalability Basics', 'Caching & CDN', 'Database Design', 'Message Queues', 'System Design Cases'];
  if (/dsa|algorithm|data\s*structure/.test(k))
    return ['Arrays & Hashing', 'Trees & Graphs', 'Dynamic Programming', 'Interview Patterns'];
  if (/python/.test(k)) return ['Python Basics', 'Python Intermediate', 'Python Projects'];
  if (/typescript|\bts\b/.test(k)) return ['TypeScript Basics', 'TS with React/Node', 'TS Projects'];
  if (/sql|database|postgres|mongo/.test(k))
    return ['SQL Fundamentals', 'Indexing & Performance', 'Schema Design', 'NoSQL Patterns'];
  if (/docker|kubernetes|k8s|aws|cloud/.test(k))
    return [interest, 'Containers', 'Deployments', 'Cloud Lab'];
  return [
    `${interest} fundamentals`,
    `${interest} intermediate`,
    `Hands-on: ${interest} mini-project`,
    `${interest} best practices`,
    `${interest} interview prep`,
  ];
}

function resolveModules(input: GenerateInput): string[] {
  const interests = [
    ...input.interests,
    ...(input.customInterest?.trim() ? [input.customInterest.trim()] : []),
  ].filter(Boolean);
  const known = (input.knownSkills || []).map((s) => s.trim()).filter(Boolean);
  const modules: string[] = [];
  for (const interest of interests.length ? interests : []) {
    const expanded = expandInterestModules(interest);
    if (expanded.length) modules.push(...expanded);
  }
  if (!modules.length || modules.every((m) => /custom|role core|general/i.test(m))) {
    modules.length = 0;
    const role = (input.role || input.field || '').trim();
    const skillPool = known.length
      ? known
      : interests.filter((i) => !/custom|role core|general/i.test(i));
    if (skillPool.length) {
      for (const s of skillPool.slice(0, 6)) {
        modules.push(`${s} depth`);
        modules.push(`Project: ${s}`);
      }
    }
    if (role) {
      modules.push(`System Design for ${role}`);
      modules.push(`${role} interview prep`);
      modules.push(`Portfolio project for ${role}`);
    }
  }
  if (!modules.length) {
    modules.push('Core programming', 'APIs & backend', 'Databases', 'System design', 'Hands-on project');
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of modules) {
    const key = m.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(m);
  }
  return out;
}

function buildOutlineTopics(input: GenerateInput): CourseTopic[] {
  const interests = [
    ...input.interests,
    ...(input.customInterest?.trim() ? [input.customInterest.trim()] : []),
    ...(input.knownSkills || []).slice(0, 8),
  ].filter(Boolean);
  const modules = resolveModules(input);
  const count = topicCountForDays(input.durationDays);
  const h = hoursPerTopic(input.durationDays, count);
  const daysPer = Math.max(1, Math.floor(input.durationDays / count));
  const stages = ['Foundations', 'Core concepts', 'Hands-on practice', 'Projects', 'Interview / placement prep'];
  const topics: CourseTopic[] = [];
  for (let i = 0; i < count; i++) {
    const moduleName = modules[i % modules.length];
    const stage = stages[Math.min(stages.length - 1, Math.floor((i / count) * stages.length))];
    const dayStart = i * daysPer + 1;
    const dayEnd = Math.min(input.durationDays, (i + 1) * daysPer);
    const matchSkills = [moduleName, ...interests, ...(input.knownSkills || []).slice(0, 4)];
    const pack = packForTopic({ title: moduleName, skills: matchSkills }, matchSkills);
    const yt = pack.yt[i % pack.yt.length];
    const doc = pack.docs[i % pack.docs.length];
    const title = /foundation|core concept|hands-on|project|interview/i.test(moduleName)
      ? moduleName
      : `${stage}: ${moduleName}`;
    topics.push({
      id: `t-${slug(moduleName)}-${i + 1}`,
      title,
      description: `Learn ${moduleName} for ${input.role || input.field || 'your role'}. Matches your skills and industry demand.`,
      estimatedHours: h + (i % 3),
      dayRange: dayStart === dayEnd ? `Day ${dayStart}` : `Days ${dayStart}–${dayEnd}`,
      youtubeUrl: yt.url,
      youtubeTitle: yt.title,
      docUrl: doc.url,
      docTitle: doc.title,
      skills: [moduleName, ...interests.slice(0, 2)],
    });
  }
  return topics;
}

async function callBuddy(message: string, userId: string): Promise<string | null> {
  try {
    const res = await fetch('/api/buddy-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userId || 'course-designer', message, language: 'english' }),
    });
    const data = await res.json();
    if (!res.ok || !data?.ok || typeof data.reply !== 'string') return null;
    if (/limited mode|No AI key found/i.test(data.reply)) return null;
    return data.reply;
  } catch {
    return null;
  }
}

function tryParseTopicsFromAi(text: string, fallback: CourseTopic[]): CourseTopic[] {
  try {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!match) return fallback;
    const parsed = JSON.parse(match[0]);
    const arr = Array.isArray(parsed) ? parsed : parsed.topics;
    if (!Array.isArray(arr) || !arr.length) return fallback;
    return arr.map((t: any, i: number) => ({
      id: String(t.id || `t-ai-${i + 1}`),
      title: String(t.title || `Topic ${i + 1}`),
      description: String(t.description || ''),
      estimatedHours: Math.max(1, Number(t.estimatedHours) || 3),
      dayRange: String(t.dayRange || `Day ${i + 1}`),
      skills: Array.isArray(t.skills) ? t.skills.map(String) : [],
      youtubeUrl: '',
      youtubeTitle: '',
      docUrl: '',
      docTitle: '',
    }));
  } catch {
    return fallback;
  }
}

function buildDemandHints(interests: string[], field: string): string[] {
  const hints: string[] = [];
  const blob = `${interests.join(' ')} ${field}`.toLowerCase();
  if (/devops|cloud|k8s|docker/.test(blob)) hints.push('Strong demand for cloud-native DevOps (Docker, K8s, CI/CD)');
  if (/cyber|security|owasp/.test(blob)) hints.push('Security hiring: OWASP, network security, ethical hacking basics');
  if (/data|sql|analytics/.test(blob)) hints.push('Analytics roles need SQL + Python + storytelling with dashboards');
  if (/backend|golang|node|api/.test(blob)) hints.push('Backend roles emphasize APIs, databases, and system design');
  if (!hints.length) hints.push('General full-stack & problem-solving skills remain in demand');
  return hints;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function generateAiCourse(
  input: GenerateInput,
  onPhase?: (phase: GeneratePhase) => void,
): Promise<AiDesignedCourse> {
  const interests = [
    ...input.interests,
    ...(input.customInterest?.trim() ? [input.customInterest.trim()] : []),
    ...(input.knownSkills || []).slice(0, 6),
  ]
    .map((s) => s.trim())
    .filter((s) => s && !/^custom$/i.test(s) && !/role\s*core/i.test(s));

  onPhase?.('analysing_profile');
  await delay(400);

  onPhase?.('mapping_demand');
  const demandHints = buildDemandHints(interests, input.field);
  await delay(350);

  onPhase?.('building_outline');
  let topics = buildOutlineTopics(input);

  const known = (input.knownSkills || []).join(', ');
  const outlinePrompt =
    `Design a ${input.durationDays}-day learning course for role: ${input.role || input.field || 'Engineer'}.\n` +
    `Field: ${input.field || 'General'}\n` +
    `Focus areas: ${interests.join(', ') || 'General'}\n` +
    `Student already knows: ${known || 'not specified'}\n` +
    `Skill gaps: ${input.skillGaps.join(', ') || 'none'}\n` +
    `Demand: ${demandHints.join('; ')}\n` +
    `Return ONLY JSON: {"topics":[{"id","title","description","estimatedHours","dayRange","skills":[]}]} ` +
    `with ${topics.length} topics. ` +
    `CRITICAL: titles must be CONCRETE skills/projects (e.g. "Golang concurrency mini-project", "PostgreSQL indexing lab") — ` +
    `NEVER generic labels like "Foundations: Custom" or "Role Core Skills". ` +
    `Omit youtube/doc URLs.`;

  const aiOutline = await callBuddy(outlinePrompt, input.userId || 'course-designer');
  if (aiOutline) {
    topics = tryParseTopicsFromAi(aiOutline, topics);
  }

  onPhase?.('attaching_resources');
  topics = attachMatchedResources(topics, interests.length ? interests : input.knownSkills || []);
  await delay(250);

  onPhase?.('finalising');
  const totalHours = topics.reduce((a, t) => a + (t.estimatedHours || 0), 0);
  const title =
    interests.length > 0
      ? `${interests.slice(0, 2).join(' + ')} · ${input.durationDays}-day path`
      : `${input.role || input.field || 'Custom'} · ${input.durationDays}-day path`;

  const course: AiDesignedCourse = {
    id: `aic-${Date.now()}`,
    title,
    summary: `Personalised path for ${input.role || input.field || 'your field'} covering ${interests.join(', ') || 'core skills'} over ${input.durationDays} days, with topic-matched lessons and docs.`,
    durationDays: input.durationDays,
    interests,
    field: input.field || 'General',
    skillGaps: input.skillGaps,
    demandHints,
    topics,
    totalHours,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  onPhase?.('done');
  return course;
}

export function phaseLabel(phase: GeneratePhase): string {
  switch (phase) {
    case 'analysing_profile':
      return 'Analysing your profile & goals…';
    case 'mapping_demand':
      return 'Mapping industry demand signals…';
    case 'building_outline':
      return 'Building course outline with AI…';
    case 'attaching_resources':
      return 'Matching videos & docs to each topic…';
    case 'finalising':
      return 'Finalising timeline…';
    case 'error':
      return 'Something went wrong';
    default:
      return 'Working…';
  }
}

/**
 * Multi-step course generation: outline → topic-matched resources → timeline.
 * Uses /api/buddy-chat when live; falls back to structured templates.
 * Resources are scored by topic title + skills + course interests (not a single key).
 */

import type { AiDesignedCourse, CourseTopic } from './aiCourseStore';

export type GenerateInput = {
  durationDays: number;
  interests: string[];
  customInterest?: string;
  field: string;
  skillGaps: string[];
  userId?: string;
};

export type GeneratePhase =
  | 'idle'
  | 'analysing_profile'
  | 'mapping_demand'
  | 'building_outline'
  | 'attaching_resources'
  | 'finalising'
  | 'done'
  | 'error';

const PHASE_LABELS: Record<GeneratePhase, string> = {
  idle: 'Ready',
  analysing_profile: 'Analysing your skill profile & field…',
  mapping_demand: 'Mapping industry demand to your interests…',
  building_outline: 'Designing course outline by day blocks…',
  attaching_resources: 'Attaching YouTube lessons & docs…',
  finalising: 'Finalising timeline & hours per topic…',
  done: 'Course ready',
  error: 'Something went wrong',
};

export function phaseLabel(p: GeneratePhase) {
  return PHASE_LABELS[p] || p;
}

function slug(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

type ResourcePack = {
  keywords: string[];
  yt: { url: string; title: string }[];
  docs: { url: string; title: string }[];
};

/**
 * Curated packs — only 1–2 strong videos + official docs per domain.
 * Matching scores keywords against topic title + skills + interests.
 */
const RESOURCE_PACKS: ResourcePack[] = [
  {
    keywords: [
      'devops', 'dev ops', 'ci/cd', 'cicd', 'pipeline', 'jenkins', 'github actions',
      'infrastructure', 'sre', 'site reliability',
    ],
    yt: [
      { url: 'https://www.youtube.com/watch?v=j5Zsa_e1XeE', title: 'TechWorld with Nana — DevOps Bootcamp Overview' },
      { url: 'https://www.youtube.com/watch?v=WvfzA1_JVqA', title: 'freeCodeCamp — DevOps Prerequisites Course' },
    ],
    docs: [
      { url: 'https://roadmap.sh/devops', title: 'DevOps Roadmap (roadmap.sh)' },
      { url: 'https://docs.github.com/en/actions', title: 'GitHub Actions Docs' },
    ],
  },
  {
    keywords: ['docker', 'container', 'dockerfile', 'compose'],
    yt: [
      { url: 'https://www.youtube.com/watch?v=3c-iBn73dDE', title: 'freeCodeCamp — Docker Tutorial for Beginners' },
      { url: 'https://www.youtube.com/watch?v=fqMOX6JJhGo', title: 'TechWorld with Nana — Docker Tutorial' },
    ],
    docs: [
      { url: 'https://docs.docker.com/get-started/', title: 'Docker Get Started' },
      { url: 'https://docs.docker.com/compose/', title: 'Docker Compose Docs' },
    ],
  },
  {
    keywords: ['kubernetes', 'k8s', 'kubectl', 'helm', 'pod', 'cluster'],
    yt: [
      { url: 'https://www.youtube.com/watch?v=X48VuDVv0do', title: 'freeCodeCamp — Kubernetes Course' },
      { url: 'https://www.youtube.com/watch?v=s_o8dwzRlu4', title: 'TechWorld with Nana — Kubernetes Tutorial' },
    ],
    docs: [
      { url: 'https://kubernetes.io/docs/tutorials/', title: 'Kubernetes Tutorials' },
      { url: 'https://kubernetes.io/docs/concepts/', title: 'Kubernetes Concepts' },
    ],
  },
  {
    keywords: ['aws', 'amazon web', 'ec2', 's3', 'lambda', 'cloudformation', 'terraform'],
    yt: [
      { url: 'https://www.youtube.com/watch?v=ulprqHHWlng', title: 'freeCodeCamp — AWS Certified Cloud Practitioner' },
      { url: 'https://www.youtube.com/watch?v=3hLmDS179YE', title: 'TechWorld with Nana — Terraform Course' },
    ],
    docs: [
      { url: 'https://docs.aws.amazon.com/', title: 'AWS Documentation' },
      { url: 'https://developer.hashicorp.com/terraform/tutorials', title: 'Terraform Tutorials' },
    ],
  },
  {
    keywords: ['linux', 'bash', 'shell', 'ubuntu', 'sysadmin', 'command line', 'cli'],
    yt: [
      { url: 'https://www.youtube.com/watch?v=sWBHKfXTAqM', title: 'freeCodeCamp — Linux Operating System' },
      { url: 'https://www.youtube.com/watch?v=GtovwKUrOZQ', title: 'NetworkChuck — Linux for Beginners' },
    ],
    docs: [
      { url: 'https://ubuntu.com/tutorials', title: 'Ubuntu Tutorials' },
      { url: 'https://www.gnu.org/software/bash/manual/bash.html', title: 'Bash Reference Manual' },
    ],
  },
  {
    keywords: [
      'cyber', 'security', 'cybersecurity', 'ethical hacking', 'penetration', 'pentest',
      'owasp', 'network security', 'infosec', 'kali',
    ],
    yt: [
      { url: 'https://www.youtube.com/watch?v=U_P23SqJeZQ', title: 'freeCodeCamp — Cybersecurity Full Course' },
      { url: 'https://www.youtube.com/watch?v=fNzpcB7OeRI', title: 'NetworkChuck — Ethical Hacking Course' },
    ],
    docs: [
      { url: 'https://owasp.org/www-project-top-ten/', title: 'OWASP Top 10' },
      { url: 'https://www.cisa.gov/cybersecurity', title: 'CISA Cybersecurity' },
    ],
  },
  {
    keywords: [
      'dsa', 'algorithm', 'data structure', 'array', 'linked list', 'tree', 'graph',
      'dp', 'dynamic programming', 'leetcode', 'sorting',
    ],
    yt: [
      { url: 'https://www.youtube.com/watch?v=8hly31xKli0', title: 'freeCodeCamp — Algorithms & Data Structures' },
      { url: 'https://www.youtube.com/watch?v=RBSGKlAvoiM', title: 'freeCodeCamp — Data Structures Easy to Advanced' },
    ],
    docs: [
      { url: 'https://cp-algorithms.com/', title: 'CP-Algorithms' },
      { url: 'https://leetcode.com/explore/', title: 'LeetCode Explore' },
    ],
  },
  {
    keywords: ['react', 'jsx', 'hooks', 'redux', 'next.js', 'nextjs'],
    yt: [
      { url: 'https://www.youtube.com/watch?v=bMknfKXIFA8', title: 'freeCodeCamp — React Course' },
      { url: 'https://www.youtube.com/watch?v=LDB4uaJ87e0', title: 'Traversy Media — React Crash Course' },
    ],
    docs: [
      { url: 'https://react.dev/learn', title: 'React Official Docs' },
      { url: 'https://react.dev/reference/react', title: 'React API Reference' },
    ],
  },
  {
    keywords: ['node', 'nodejs', 'node.js', 'express', 'nestjs'],
    yt: [
      { url: 'https://www.youtube.com/watch?v=Oe421EPjeBE', title: 'freeCodeCamp — Node.js & Express' },
      { url: 'https://www.youtube.com/watch?v=fBNz5xF-Kx4', title: 'Traversy — Node.js Crash Course' },
    ],
    docs: [
      { url: 'https://nodejs.org/en/learn/getting-started/introduction-to-nodejs', title: 'Node.js Learn' },
      { url: 'https://expressjs.com/en/starter/hello-world.html', title: 'Express.js Guide' },
    ],
  },
  {
    keywords: ['golang', 'go lang', 'go programming', 'goroutine'],
    yt: [
      { url: 'https://www.youtube.com/watch?v=YS4e4q9oBaU', title: 'freeCodeCamp — Learn Go' },
      { url: 'https://www.youtube.com/watch?v=un6ZyFkq-e0', title: 'Traversy — Go Crash Course' },
    ],
    docs: [
      { url: 'https://go.dev/tour/', title: 'A Tour of Go' },
      { url: 'https://go.dev/doc/effective_go', title: 'Effective Go' },
    ],
  },
  {
    keywords: ['backend', 'api', 'rest', 'graphql', 'microservice', 'server side'],
    yt: [
      { url: 'https://www.youtube.com/watch?v=fgTGADljAeg', title: 'Backend Development Roadmap' },
      { url: 'https://www.youtube.com/watch?v=Oe421EPjeBE', title: 'Node / Express Full Course' },
    ],
    docs: [
      { url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP', title: 'MDN HTTP' },
      { url: 'https://restfulapi.net/', title: 'REST API Tutorial' },
    ],
  },
  {
    keywords: ['frontend', 'html', 'css', 'javascript', 'dom', 'web design'],
    yt: [
      { url: 'https://www.youtube.com/watch?v=PkZNo7MFNFg', title: 'freeCodeCamp — JavaScript Full Course' },
      { url: 'https://www.youtube.com/watch?v=G3e-cpL7ydc', title: 'HTML & CSS Full Course' },
    ],
    docs: [
      { url: 'https://developer.mozilla.org/en-US/docs/Learn', title: 'MDN Learn Web Development' },
      { url: 'https://javascript.info/', title: 'The Modern JavaScript Tutorial' },
    ],
  },
  {
    keywords: ['python', 'pandas', 'numpy', 'django', 'flask'],
    yt: [
      { url: 'https://www.youtube.com/watch?v=rfscVS0vtbw', title: 'freeCodeCamp — Python Full Course' },
      { url: 'https://www.youtube.com/watch?v=_uQrJ0TkZlc', title: 'Programming with Mosh — Python' },
    ],
    docs: [
      { url: 'https://docs.python.org/3/tutorial/', title: 'Python Official Tutorial' },
      { url: 'https://realpython.com/', title: 'Real Python' },
    ],
  },
  {
    keywords: ['typescript', 'typed javascript'],
    yt: [
      { url: 'https://www.youtube.com/watch?v=30LWjhZzg50', title: 'TypeScript Crash Course' },
      { url: 'https://www.youtube.com/watch?v=BwuLxPH8IDs', title: 'TypeScript for Beginners' },
    ],
    docs: [
      { url: 'https://www.typescriptlang.org/docs/handbook/intro.html', title: 'TypeScript Handbook' },
    ],
  },
  {
    keywords: [
      'data analytics', 'data analysis', 'analytics', 'data analyst', 'business intelligence',
      'eda', 'dashboard', 'insight',
    ],
    yt: [
      { url: 'https://www.youtube.com/watch?v=r-uOLxNrNk8', title: 'freeCodeCamp — Data Analysis with Python' },
      { url: 'https://www.youtube.com/watch?v=ua-CiDNNj30', title: 'Alex The Analyst — Portfolio Project' },
    ],
    docs: [
      { url: 'https://www.kaggle.com/learn', title: 'Kaggle Learn' },
      { url: 'https://pandas.pydata.org/docs/getting_started/index.html', title: 'Pandas Getting Started' },
    ],
  },
  {
    keywords: ['sql', 'mysql', 'postgresql', 'postgres', 'query', 'joins', 'database'],
    yt: [
      { url: 'https://www.youtube.com/watch?v=HXV3zeQKqGY', title: 'freeCodeCamp — SQL Full Course' },
      { url: 'https://www.youtube.com/watch?v=7S_tz1z_5bA', title: 'MySQL Tutorial for Beginners' },
    ],
    docs: [
      { url: 'https://www.w3schools.com/sql/', title: 'W3Schools SQL' },
      { url: 'https://mode.com/sql-tutorial/', title: 'Mode SQL Tutorial' },
    ],
  },
  {
    keywords: ['power bi', 'powerbi', 'dax'],
    yt: [{ url: 'https://www.youtube.com/watch?v=AGrl-H87pRU', title: 'Power BI Full Course — freeCodeCamp' }],
    docs: [{ url: 'https://learn.microsoft.com/en-us/power-bi/', title: 'Microsoft Power BI Learn' }],
  },
  {
    keywords: ['tableau', 'data visualization', 'matplotlib', 'seaborn'],
    yt: [{ url: 'https://www.youtube.com/watch?v=TPMlZxRRaBQ', title: 'Tableau Full Course — freeCodeCamp' }],
    docs: [{ url: 'https://help.tableau.com/current/pro/desktop/en-us/gettingstarted_overview.htm', title: 'Tableau Getting Started' }],
  },
  {
    keywords: ['machine learning', 'ml ', 'scikit', 'sklearn', 'regression', 'classification'],
    yt: [
      { url: 'https://www.youtube.com/watch?v=i_LwzRVPQbw', title: 'freeCodeCamp — Machine Learning for Everybody' },
    ],
    docs: [{ url: 'https://scikit-learn.org/stable/user_guide.html', title: 'scikit-learn User Guide' }],
  },
  {
    keywords: ['ui/ux', 'figma', 'wireframe', 'user research', 'prototype'],
    yt: [
      { url: 'https://www.youtube.com/watch?v=c9Wg6CbTfgw', title: 'UI/UX Design Tutorial — freeCodeCamp' },
    ],
    docs: [
      { url: 'https://www.figma.com/resource-library/', title: 'Figma Resource Library' },
    ],
  },
];

const DEFAULT_PACK: ResourcePack = {
  keywords: [],
  yt: [
    { url: 'https://www.youtube.com/watch?v=PkZNo7MFNFg', title: 'freeCodeCamp — JavaScript Full Course' },
  ],
  docs: [
    { url: 'https://developer.mozilla.org/en-US/docs/Learn', title: 'MDN Learn' },
  ],
};

/** Score pack against text; longer keyword hits weigh more */
function scorePack(pack: ResourcePack, text: string): number {
  let score = 0;
  for (const kw of pack.keywords) {
    if (text.includes(kw)) {
      score += Math.max(2, Math.min(kw.length, 12));
    }
  }
  return score;
}

/**
 * Best pack for a topic using title + description + skills.
 * Prevents cyber topics from getting DSA/JS links.
 */
export function packForTopic(
  topic: { title?: string; description?: string; skills?: string[] },
  courseInterests: string[] = [],
): ResourcePack {
  // Score this topic's own title + skills first — never let another course keyword steal the match
  const primary = [topic.title || '', topic.description || '', ...(topic.skills || [])]
    .join(' ')
    .toLowerCase();
  const secondary = courseInterests.join(' ').toLowerCase();

  let best = DEFAULT_PACK;
  let bestPrimary = 0;
  for (const pack of RESOURCE_PACKS) {
    const s = scorePack(pack, primary);
    if (s > bestPrimary) {
      bestPrimary = s;
      best = pack;
    }
  }
  // Only if nothing matched the topic text, fall back to course interests
  if (bestPrimary === 0 && secondary) {
    let bestSec = 0;
    for (const pack of RESOURCE_PACKS) {
      const s = scorePack(pack, secondary);
      if (s > bestSec) {
        bestSec = s;
        best = pack;
      }
    }
  }
  return best;
}

function topicCountForDays(days: number) {
  if (days <= 3) return 4;
  if (days <= 15) return 8;
  if (days <= 30) return 12;
  if (days <= 90) return 18;
  return Math.min(24, Math.max(6, Math.round(days / 5)));
}

function hoursPerTopic(days: number, count: number) {
  const studyHoursPerDay = days <= 3 ? 4 : days <= 15 ? 2.5 : days <= 30 ? 2 : 1.5;
  return Math.max(1, Math.round((days * studyHoursPerDay) / count));
}

/** Expand role-style interests into concrete learning modules */
function expandInterestModules(interest: string): string[] {
  const k = interest.toLowerCase();
  if (/devops|dev ops|sre/.test(k)) {
    return ['Linux & Shell', 'Docker', 'CI/CD Pipelines', 'Kubernetes', 'AWS / Cloud', 'Terraform & Infra'];
  }
  if (/cyber|security|ethical|pentest|infosec/.test(k)) {
    return ['Security Fundamentals', 'Network Security', 'OWASP Top 10', 'Ethical Hacking Basics', 'Defensive Security'];
  }
  if (/data.?analyst|analytics|business intelligence/.test(k)) {
    return ['SQL', 'Python for Data', 'EDA & Visualization', 'Dashboards (Power BI / Tableau)', 'Analytics Projects'];
  }
  if (/frontend|react/.test(k)) {
    return ['HTML & CSS', 'JavaScript', 'React', 'TypeScript', 'Frontend Projects'];
  }
  if (/backend|node|api/.test(k)) {
    return ['HTTP & APIs', 'Node.js / Express', 'Databases', 'Auth & Security', 'Backend Projects'];
  }
  return [interest];
}

function buildOutlineTopics(input: GenerateInput): CourseTopic[] {
  const interests = [
    ...input.interests,
    ...(input.customInterest?.trim() ? [input.customInterest.trim()] : []),
  ].filter(Boolean);

  const modules: string[] = [];
  if (interests.length === 0) {
    modules.push(input.field || 'Core Skills');
  } else {
    for (const interest of interests) {
      modules.push(...expandInterestModules(interest));
    }
  }

  const count = topicCountForDays(input.durationDays);
  const h = hoursPerTopic(input.durationDays, count);
  const daysPer = Math.max(1, Math.floor(input.durationDays / count));

  const stages = [
    'Foundations',
    'Core concepts',
    'Hands-on practice',
    'Projects',
    'Interview / placement prep',
  ];

  const topics: CourseTopic[] = [];
  for (let i = 0; i < count; i++) {
    const moduleName = modules[i % modules.length];
    const stage = stages[Math.min(stages.length - 1, Math.floor((i / count) * stages.length))];
    const dayStart = i * daysPer + 1;
    const dayEnd = Math.min(input.durationDays, (i + 1) * daysPer);
    const pack = packForTopic(
      { title: `${stage}: ${moduleName}`, skills: [moduleName, ...interests] },
      interests,
    );
    const yt = pack.yt[i % pack.yt.length];
    const doc = pack.docs[i % pack.docs.length];

    topics.push({
      id: `t-${slug(moduleName)}-${i + 1}`,
      title: `${stage}: ${moduleName}`,
      description: `Focus on ${moduleName} (${stage.toLowerCase()}). Aligns with ${interests.join(', ') || input.field || 'your path'} and industry demand.`,
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
      id: String(t.id || fallback[i]?.id || `ai-${i + 1}`),
      title: String(t.title || fallback[i]?.title || `Topic ${i + 1}`),
      description: String(t.description || fallback[i]?.description || ''),
      estimatedHours: Number(t.estimatedHours) || fallback[i]?.estimatedHours || 2,
      dayRange: String(t.dayRange || fallback[i]?.dayRange || `Block ${i + 1}`),
      youtubeUrl: String(t.youtubeUrl || ''),
      youtubeTitle: String(t.youtubeTitle || ''),
      docUrl: String(t.docUrl || ''),
      docTitle: String(t.docTitle || ''),
      skills: Array.isArray(t.skills) ? t.skills.map(String) : fallback[i]?.skills || [],
    }));
  } catch {
    return fallback;
  }
}

/** Re-attach domain-correct resources after AI outline (AI URLs often wrong) */
function attachMatchedResources(topics: CourseTopic[], interests: string[]): CourseTopic[] {
  return topics.map((t, i) => {
    const pack = packForTopic(t, interests);
    const yt = pack.yt[i % pack.yt.length];
    const doc = pack.docs[i % pack.docs.length];
    return {
      ...t,
      youtubeUrl: yt.url,
      youtubeTitle: yt.title,
      docUrl: doc.url,
      docTitle: doc.title,
    };
  });
}

function buildDemandHints(interests: string[], field: string): string[] {
  const hints: string[] = [];
  const blob = `${interests.join(' ')} ${field}`.toLowerCase();
  if (/react|frontend|typescript/.test(blob)) hints.push('Frontend roles demand React + TypeScript');
  if (/node|backend|golang|go\b|api/.test(blob)) hints.push('Backend hiring: APIs, Node/Go, databases');
  if (/dsa|algorithm|structure/.test(blob)) hints.push('Product companies screen heavily on DSA');
  if (/data|sql|python|ml|analytics/.test(blob)) hints.push('Analytics roles: SQL, Python, dashboards');
  if (/devops|docker|kubernetes|aws|cloud|ci\/cd/.test(blob))
    hints.push('DevOps demand: Docker, K8s, CI/CD, cloud (AWS)');
  if (/cyber|security|owasp|pentest/.test(blob))
    hints.push('Security hiring: OWASP, network security, ethical hacking basics');
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
  ].filter(Boolean);

  onPhase?.('analysing_profile');
  await delay(400);

  onPhase?.('mapping_demand');
  const demandHints = buildDemandHints(interests, input.field);
  await delay(350);

  onPhase?.('building_outline');
  let topics = buildOutlineTopics(input);

  const outlinePrompt =
    `Design a ${input.durationDays}-day learning course.\n` +
    `Field: ${input.field || 'General'}\n` +
    `Interests: ${interests.join(', ') || 'General'}\n` +
    `Skill gaps: ${input.skillGaps.join(', ') || 'none'}\n` +
    `Demand: ${demandHints.join('; ')}\n` +
    `Return ONLY JSON: {"topics":[{"id","title","description","estimatedHours","dayRange","skills":[]}]} ` +
    `with ${topics.length} topics. Titles MUST stay on the subject (e.g. DevOps → Docker/K8s/CI-CD; Cyber → OWASP/network). ` +
    `Do not mix unrelated domains. Omit youtube/doc URLs.`;

  const aiOutline = await callBuddy(outlinePrompt, input.userId || 'course-designer');
  if (aiOutline) {
    topics = tryParseTopicsFromAi(aiOutline, topics);
  }

  onPhase?.('attaching_resources');
  topics = attachMatchedResources(topics, interests);
  await delay(250);

  onPhase?.('finalising');
  const totalHours = topics.reduce((a, t) => a + (t.estimatedHours || 0), 0);
  const title =
    interests.length > 0
      ? `${interests.slice(0, 2).join(' + ')} · ${input.durationDays}-day path`
      : `${input.field || 'Custom'} · ${input.durationDays}-day path`;

  const course: AiDesignedCourse = {
    id: `aic-${Date.now()}`,
    title,
    summary: `Personalised path for ${input.field || 'your field'} covering ${interests.join(', ') || 'core skills'} over ${input.durationDays} days, with topic-matched lessons and docs.`,
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

/**
 * Multi-step course generation: outline → enrich resources → timeline.
 * Uses /api/buddy-chat when live; falls back to structured templates.
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

/** Curated free resources keyed by interest keyword */
const RESOURCE_BANK: Record<
  string,
  { yt: { url: string; title: string }[]; docs: { url: string; title: string }[] }
> = {
  dsa: {
    yt: [
      { url: 'https://www.youtube.com/watch?v=8hly31xKli0', title: 'freeCodeCamp — Algorithms & Data Structures' },
      { url: 'https://www.youtube.com/watch?v=RBSGKlAvoiM', title: 'freeCodeCamp — Data Structures Easy to Advanced' },
    ],
    docs: [
      { url: 'https://cp-algorithms.com/', title: 'CP-Algorithms' },
      { url: 'https://leetcode.com/explore/', title: 'LeetCode Explore' },
    ],
  },
  react: {
    yt: [
      { url: 'https://www.youtube.com/watch?v=bMknfKXIFA8', title: 'freeCodeCamp — React Course' },
      { url: 'https://www.youtube.com/watch?v=LDB4uaJ87e0', title: 'Traversy Media — React Crash Course' },
    ],
    docs: [
      { url: 'https://react.dev/learn', title: 'React Official Docs — Learn' },
      { url: 'https://react.dev/reference/react', title: 'React API Reference' },
    ],
  },
  'node.js': {
    yt: [
      { url: 'https://www.youtube.com/watch?v=Oe421EPjeBE', title: 'freeCodeCamp — Node.js & Express' },
      { url: 'https://www.youtube.com/watch?v=fBNz5xF-Kx4', title: 'Traversy — Node.js Crash Course' },
    ],
    docs: [
      { url: 'https://nodejs.org/en/learn/getting-started/introduction-to-nodejs', title: 'Node.js Learn' },
      { url: 'https://expressjs.com/en/starter/hello-world.html', title: 'Express.js Guide' },
    ],
  },
  golang: {
    yt: [
      { url: 'https://www.youtube.com/watch?v=YS4e4q9oBaU', title: 'freeCodeCamp — Learn Go' },
      { url: 'https://www.youtube.com/watch?v=un6ZyFkq-e0', title: 'Traversy — Go Crash Course' },
    ],
    docs: [
      { url: 'https://go.dev/tour/', title: 'A Tour of Go' },
      { url: 'https://go.dev/doc/effective_go', title: 'Effective Go' },
    ],
  },
  backend: {
    yt: [
      { url: 'https://www.youtube.com/watch?v=fgTGADljAeg', title: 'Backend Development Roadmap Overview' },
      { url: 'https://www.youtube.com/watch?v=Oe421EPjeBE', title: 'Node / Express Full Course' },
    ],
    docs: [
      { url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP', title: 'MDN HTTP' },
      { url: 'https://restfulapi.net/', title: 'REST API Tutorial' },
    ],
  },
  frontend: {
    yt: [
      { url: 'https://www.youtube.com/watch?v=G3e-cpL7ydc', title: 'HTML CSS full course' },
      { url: 'https://www.youtube.com/watch?v=bMknfKXIFA8', title: 'React full course' },
    ],
    docs: [
      { url: 'https://developer.mozilla.org/en-US/docs/Learn', title: 'MDN Learn Web Development' },
      { url: 'https://web.dev/learn', title: 'web.dev Learn' },
    ],
  },
  python: {
    yt: [
      { url: 'https://www.youtube.com/watch?v=rfscVS0vtbw', title: 'freeCodeCamp — Python' },
      { url: 'https://www.youtube.com/watch?v=_uQrJ0TkZlc', title: 'Programming with Mosh — Python' },
    ],
    docs: [
      { url: 'https://docs.python.org/3/tutorial/', title: 'Python Official Tutorial' },
      { url: 'https://realpython.com/', title: 'Real Python' },
    ],
  },
  typescript: {
    yt: [
      { url: 'https://www.youtube.com/watch?v=30LWjhZzg50', title: 'TypeScript Crash Course' },
      { url: 'https://www.youtube.com/watch?v=BwuLxPH8IDs', title: 'TypeScript for Beginners' },
    ],
    docs: [
      { url: 'https://www.typescriptlang.org/docs/handbook/intro.html', title: 'TypeScript Handbook' },
      { url: 'https://www.typescriptlang.org/docs/', title: 'TS Docs' },
    ],
  },
  'data analytics': {
    yt: [
      { url: 'https://www.youtube.com/watch?v=r-uOLxNrNk8', title: 'freeCodeCamp — Data Analysis with Python' },
      { url: 'https://www.youtube.com/watch?v=ua-CiDNNj30', title: 'Alex The Analyst — Data Analyst Portfolio Project' },
      { url: 'https://www.youtube.com/watch?v=VMWQZqX6uK4', title: 'freeCodeCamp — Data Analytics Full Course' },
    ],
    docs: [
      { url: 'https://www.kaggle.com/learn', title: 'Kaggle Learn — Data Analytics' },
      { url: 'https://pandas.pydata.org/docs/getting_started/index.html', title: 'Pandas Getting Started' },
    ],
  },
  analytics: {
    yt: [
      { url: 'https://www.youtube.com/watch?v=r-uOLxNrNk8', title: 'freeCodeCamp — Data Analysis with Python' },
      { url: 'https://www.youtube.com/watch?v=VMWQZqX6uK4', title: 'freeCodeCamp — Data Analytics Full Course' },
    ],
    docs: [
      { url: 'https://www.kaggle.com/learn', title: 'Kaggle Learn' },
      { url: 'https://pandas.pydata.org/docs/getting_started/index.html', title: 'Pandas Getting Started' },
    ],
  },
  sql: {
    yt: [
      { url: 'https://www.youtube.com/watch?v=HXV3zeQKqGY', title: 'freeCodeCamp — SQL Full Course' },
      { url: 'https://www.youtube.com/watch?v=7S_tz1z_5bA', title: 'MySQL Tutorial for Beginners' },
    ],
    docs: [
      { url: 'https://www.w3schools.com/sql/', title: 'W3Schools SQL Tutorial' },
      { url: 'https://mode.com/sql-tutorial/', title: 'Mode SQL Tutorial' },
    ],
  },
  'power bi': {
    yt: [
      { url: 'https://www.youtube.com/watch?v=AGrl-H87pRU', title: 'Power BI Full Course — freeCodeCamp' },
    ],
    docs: [
      { url: 'https://learn.microsoft.com/en-us/power-bi/', title: 'Microsoft Power BI Learn' },
    ],
  },
  tableau: {
    yt: [
      { url: 'https://www.youtube.com/watch?v=TPMlZxRRaBQ', title: 'Tableau Full Course — freeCodeCamp' },
    ],
    docs: [
      { url: 'https://help.tableau.com/current/pro/desktop/en-us/gettingstarted_overview.htm', title: 'Tableau Getting Started' },
    ],
  },
  excel: {
    yt: [
      { url: 'https://www.youtube.com/watch?v=Vl0H-qTcl7g', title: 'Excel for Data Analysis — freeCodeCamp' },
    ],
    docs: [
      { url: 'https://exceljet.net/', title: 'Exceljet — Formulas & Tips' },
    ],
  },
  default: {
    yt: [
      { url: 'https://www.youtube.com/watch?v=8hly31xKli0', title: 'freeCodeCamp — Core CS & Algorithms' },
      { url: 'https://www.youtube.com/watch?v=PkZNo7MFNFg', title: 'freeCodeCamp — Learn to Code' },
    ],
    docs: [
      { url: 'https://developer.mozilla.org/en-US/docs/Web', title: 'MDN Web Docs' },
      { url: 'https://www.freecodecamp.org/news/', title: 'freeCodeCamp Articles' },
    ],
  },
};

function bankFor(interest: string) {
  const key = interest.toLowerCase().trim();
  if (RESOURCE_BANK[key]) return RESOURCE_BANK[key];
  // Prefer longer / more specific keyword matches (e.g. "data analytics" over "data")
  let best: (typeof RESOURCE_BANK)[string] | null = null;
  let bestLen = 0;
  for (const k of Object.keys(RESOURCE_BANK)) {
    if (k === 'default') continue;
    if (key.includes(k) || k.includes(key) || key.split(/[\s+/,&]+/).some((w) => k.includes(w) && w.length > 2)) {
      if (k.length > bestLen) {
        bestLen = k.length;
        best = RESOURCE_BANK[k];
      }
    }
  }
  return best || RESOURCE_BANK.default;
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

function buildOutlineTopics(input: GenerateInput): CourseTopic[] {
  const interests = [
    ...input.interests,
    ...(input.customInterest?.trim() ? [input.customInterest.trim()] : []),
  ].filter(Boolean);
  const primary = interests[0] || input.field || 'General';
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
    const interest = interests[i % Math.max(interests.length, 1)] || primary;
    const stage = stages[Math.min(stages.length - 1, Math.floor((i / count) * stages.length))];
    const dayStart = i * daysPer + 1;
    const dayEnd = Math.min(input.durationDays, (i + 1) * daysPer);
    const bank = bankFor(interest);
    const yt = bank.yt[i % bank.yt.length];
    const doc = bank.docs[i % bank.docs.length];
    topics.push({
      id: `t-${slug(interest)}-${i + 1}`,
      title: `${stage}: ${interest} — Module ${i + 1}`,
      description: `Focus on ${interest} (${stage.toLowerCase()}). Aligns with your field (${input.field || 'student'}) and closes gaps: ${(input.skillGaps.slice(0, 2).join(', ') || 'general fundamentals')}.`,
      estimatedHours: h + (i % 3),
      dayRange: dayStart === dayEnd ? `Day ${dayStart}` : `Days ${dayStart}–${dayEnd}`,
      youtubeUrl: yt.url,
      youtubeTitle: yt.title,
      docUrl: doc.url,
      docTitle: doc.title,
      skills: [interest, stage, ...(input.skillGaps.slice(0, 1) || [])],
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
      id: String(t.id || `ai-${i + 1}`),
      title: String(t.title || `Topic ${i + 1}`),
      description: String(t.description || ''),
      estimatedHours: Number(t.estimatedHours) || fallback[i]?.estimatedHours || 2,
      dayRange: String(t.dayRange || fallback[i]?.dayRange || `Block ${i + 1}`),
      youtubeUrl: String(t.youtubeUrl || fallback[i]?.youtubeUrl || ''),
      youtubeTitle: String(t.youtubeTitle || t.youtubeUrl || 'Watch lesson'),
      docUrl: String(t.docUrl || fallback[i]?.docUrl || ''),
      docTitle: String(t.docTitle || 'Read docs'),
      skills: Array.isArray(t.skills) ? t.skills.map(String) : fallback[i]?.skills || [],
    }));
  } catch {
    return fallback;
  }
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
  await delay(500);

  onPhase?.('mapping_demand');
  const demandHints = buildDemandHints(interests, input.field);
  await delay(400);

  onPhase?.('building_outline');
  let topics = buildOutlineTopics(input);

  const outlinePrompt =
    `Design a ${input.durationDays}-day learning course for a student.\n` +
    `Field: ${input.field || 'General'}\n` +
    `Interests: ${interests.join(', ') || 'General'}\n` +
    `Skill gaps: ${input.skillGaps.join(', ') || 'none listed'}\n` +
    `Industry demand hints: ${demandHints.join('; ')}\n` +
    `Return ONLY valid JSON: {"topics":[{"id","title","description","estimatedHours","dayRange","youtubeUrl","youtubeTitle","docUrl","docTitle","skills":[]}]} ` +
    `with ${topics.length} topics. Use real public YouTube and documentation URLs when possible.`;

  const aiOutline = await callBuddy(outlinePrompt, input.userId || 'course-designer');
  if (aiOutline) {
    topics = tryParseTopicsFromAi(aiOutline, topics);
  }

  onPhase?.('attaching_resources');
  topics = topics.map((t, i) => {
    const bank = bankFor(t.skills[0] || interests[i % Math.max(interests.length, 1)] || 'default');
    if (!t.youtubeUrl || !/^https?:\/\//i.test(t.youtubeUrl)) {
      const yt = bank.yt[i % bank.yt.length];
      t = { ...t, youtubeUrl: yt.url, youtubeTitle: t.youtubeTitle || yt.title };
    }
    if (!t.docUrl || !/^https?:\/\//i.test(t.docUrl)) {
      const doc = bank.docs[i % bank.docs.length];
      t = { ...t, docUrl: doc.url, docTitle: t.docTitle || doc.title };
    }
    return t;
  });
  await delay(350);

  onPhase?.('finalising');
  const totalHours = topics.reduce((a, t) => a + (t.estimatedHours || 0), 0);
  const title =
    interests.length > 0
      ? `${interests.slice(0, 2).join(' + ')} · ${input.durationDays}-day path`
      : `${input.field || 'Custom'} · ${input.durationDays}-day path`;

  const course: AiDesignedCourse = {
    id: `aic-${Date.now()}`,
    title,
    summary: `Personalised mix for ${input.field || 'your field'} covering ${interests.join(', ') || 'core skills'} over ${input.durationDays} days, tuned to skill gaps and industry demand.`,
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

function buildDemandHints(interests: string[], field: string): string[] {
  const hints: string[] = [];
  const blob = `${interests.join(' ')} ${field}`.toLowerCase();
  if (/react|frontend|typescript/.test(blob)) hints.push('Frontend roles demand React + TypeScript');
  if (/node|backend|golang|go\b|api/.test(blob)) hints.push('Backend hiring: APIs, Node/Go, databases');
  if (/dsa|algorithm|structure/.test(blob)) hints.push('Product companies screen heavily on DSA');
  if (/data|sql|python|ml|analytics/.test(blob)) hints.push('Analytics roles: SQL, Python, dashboards');
  if (/cyber|security|devops|cloud/.test(blob)) hints.push('Security & cloud skills rising in Maharashtra job signals');
  if (!hints.length) hints.push('General full-stack & problem-solving skills remain in demand');
  return hints;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

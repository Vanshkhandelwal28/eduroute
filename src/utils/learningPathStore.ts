/**
 * Career-aware living learning path.
 * Built from onboarding interests + skill gaps; optional Groq (buddy-chat) enrichment.
 * Persisted in localStorage so the path is stable across visits.
 */

import { getAuthUser } from './rbacAuth';
import {
  readOnboarding,
  type InterestTrack,
  type OnboardingProfile,
} from './onboardingStore';

export type PathNodeStatus = 'completed' | 'current' | 'locked';

export type PathNode = {
  id: string;
  title: string;
  short: string;
  status: PathNodeStatus;
  hours: number;
  skills: string[];
  resources: { label: string; kind: string; mins: number }[];
  /** Where "Continue learning" should go */
  href?: string;
};

/** Build designer URL so Continue learning pre-fills + can auto-generate */
export function designerHref(opts: {
  interest: string;
  title: string;
  nodeId: string;
  auto?: boolean;
}): string {
  const q = new URLSearchParams();
  q.set('interest', opts.interest);
  q.set('title', opts.title);
  q.set('nodeId', opts.nodeId);
  if (opts.auto !== false) q.set('auto', '1');
  return `/ai-course-designer?${q.toString()}`;
}

const STORE_PREFIX = 'eduroute:learning-path-v2:';

function storageKey(email?: string | null) {
  const id = (email || getAuthUser()?.email || 'guest').trim().toLowerCase();
  return `${STORE_PREFIX}${id}`;
}

const TRACK_LABEL: Record<InterestTrack, string> = {
  software: 'Software Engineering',
  cybersecurity: 'Cybersecurity',
  data_analyst: 'Data Analytics',
};

const TEMPLATES: Record<InterestTrack, Omit<PathNode, 'status'>[]> = {
  software: [
    {
      id: 'prog',
      title: 'Programming Fundamentals',
      short: 'Programming',
      hours: 8,
      skills: ['Python', 'JavaScript', 'Problem solving'],
      resources: [
        { label: 'Language basics', kind: 'Video', mins: 45 },
        { label: 'Small exercises', kind: 'Exercise', mins: 60 },
      ],
      href: '/ai-course-designer?interest=Python&title=Programming%20Fundamentals',
    },
    {
      id: 'dsa',
      title: 'Data Structures & Algorithms',
      short: 'DSA',
      hours: 20,
      skills: ['Arrays', 'Trees', 'Graphs', 'DP'],
      resources: [
        { label: 'DSA practice sheet', kind: 'Practice', mins: 120 },
        { label: 'Complexity basics', kind: 'Reading', mins: 30 },
      ],
      href: '/dsa-sheet',
    },
    {
      id: 'frontend',
      title: 'Frontend Foundations',
      short: 'Frontend',
      hours: 12,
      skills: ['HTML', 'CSS', 'React'],
      resources: [
        { label: 'React crash path', kind: 'Video', mins: 40 },
        { label: 'Build a mini UI', kind: 'Exercise', mins: 90 },
      ],
      href: '/ai-course-designer?interest=React&title=Frontend%20Foundations',
    },
    {
      id: 'backend',
      title: 'Backend & APIs',
      short: 'Backend',
      hours: 12,
      skills: ['Node.js', 'REST', 'Databases'],
      resources: [
        { label: 'API design intro', kind: 'Video', mins: 35 },
        { label: 'CRUD project', kind: 'Exercise', mins: 90 },
      ],
      href: '/ai-course-designer?interest=Node.js&title=Backend%20%26%20APIs',
    },
    {
      id: 'system',
      title: 'System Design Basics',
      short: 'System Design',
      hours: 8,
      skills: ['System Design', 'Caching', 'Load Balancing'],
      resources: [
        { label: 'System design intro', kind: 'Video', mins: 25 },
        { label: 'URL shortener case', kind: 'Exercise', mins: 60 },
      ],
      href: '/ai-course-designer?interest=System%20Design&title=System%20Design%20Basics',
    },
    {
      id: 'projects',
      title: 'Portfolio Projects',
      short: 'Projects',
      hours: 16,
      skills: ['Full-stack', 'Git', 'Deploy'],
      resources: [{ label: 'Ship one end-to-end app', kind: 'Project', mins: 180 }],
      href: '/ai-course-designer?interest=Full-stack&title=Portfolio%20Projects',
    },
  ],
  cybersecurity: [
    {
      id: 'linux',
      title: 'Linux & Networking Basics',
      short: 'Linux',
      hours: 8,
      skills: ['Linux', 'Networking', 'CLI'],
      resources: [
        { label: 'Linux essentials', kind: 'Video', mins: 40 },
        { label: 'Network fundamentals', kind: 'Reading', mins: 30 },
      ],
      href: '/ai-course-designer?interest=Linux&title=Linux%20%26%20Networking',
    },
    {
      id: 'sec-fund',
      title: 'Security Fundamentals',
      short: 'Sec Fund',
      hours: 10,
      skills: ['CIA triad', 'Threats', 'Risk'],
      resources: [
        { label: 'Security overview', kind: 'Video', mins: 35 },
        { label: 'Threat modelling intro', kind: 'Reading', mins: 25 },
      ],
      href: '/ai-course-designer?interest=Cybersecurity&title=Security%20Fundamentals',
    },
    {
      id: 'owasp',
      title: 'OWASP Top 10 & AppSec',
      short: 'OWASP',
      hours: 10,
      skills: ['OWASP', 'Web security', 'Auth'],
      resources: [
        { label: 'OWASP Top 10 walkthrough', kind: 'Video', mins: 45 },
        { label: 'Fix a vulnerable app', kind: 'Exercise', mins: 90 },
      ],
      href: '/ai-course-designer?interest=OWASP&title=OWASP%20Top%2010',
    },
    {
      id: 'ethical',
      title: 'Ethical Hacking Basics',
      short: 'Ethical',
      hours: 12,
      skills: ['Recon', 'Pentest basics', 'Tools'],
      resources: [
        { label: 'Ethical hacking intro', kind: 'Video', mins: 50 },
        { label: 'Lab practice', kind: 'Exercise', mins: 90 },
      ],
      href: '/ai-course-designer?interest=Ethical%20Hacking&title=Ethical%20Hacking%20Basics',
    },
    {
      id: 'defense',
      title: 'Defensive Security',
      short: 'Defense',
      hours: 10,
      skills: ['Monitoring', 'Hardening', 'IR'],
      resources: [
        { label: 'Defense in depth', kind: 'Video', mins: 30 },
        { label: 'Incident response basics', kind: 'Reading', mins: 25 },
      ],
      href: '/ai-course-designer?interest=Cybersecurity&title=Defensive%20Security',
    },
    {
      id: 'capstone',
      title: 'Security Capstone',
      short: 'Capstone',
      hours: 12,
      skills: ['Report writing', 'Labs'],
      resources: [{ label: 'End-to-end security lab', kind: 'Project', mins: 150 }],
      href: '/ai-course-designer?interest=Cybersecurity&title=Security%20Capstone',
    },
  ],
  data_analyst: [
    {
      id: 'sql',
      title: 'SQL & Databases',
      short: 'SQL',
      hours: 10,
      skills: ['SQL', 'Joins', 'Aggregations'],
      resources: [
        { label: 'SQL full path', kind: 'Video', mins: 60 },
        { label: 'Query practice', kind: 'Exercise', mins: 60 },
      ],
      href: '/ai-course-designer?interest=SQL&title=SQL%20%26%20Databases',
    },
    {
      id: 'python-data',
      title: 'Python for Data',
      short: 'Python',
      hours: 10,
      skills: ['Python', 'Pandas', 'NumPy'],
      resources: [
        { label: 'Pandas getting started', kind: 'Video', mins: 40 },
        { label: 'Clean a dataset', kind: 'Exercise', mins: 60 },
      ],
      href: '/ai-course-designer?interest=Python&title=Python%20for%20Data',
    },
    {
      id: 'eda',
      title: 'EDA & Statistics',
      short: 'EDA',
      hours: 8,
      skills: ['EDA', 'Stats', 'Hypothesis'],
      resources: [
        { label: 'Exploratory analysis', kind: 'Video', mins: 35 },
        { label: 'Stats refresher', kind: 'Reading', mins: 30 },
      ],
      href: '/ai-course-designer?interest=Data%20Analytics&title=EDA%20%26%20Statistics',
    },
    {
      id: 'viz',
      title: 'Visualization & BI',
      short: 'BI',
      hours: 10,
      skills: ['Power BI', 'Tableau', 'Charts'],
      resources: [
        { label: 'Dashboard design', kind: 'Video', mins: 40 },
        { label: 'Build one dashboard', kind: 'Exercise', mins: 90 },
      ],
      href: '/ai-course-designer?interest=Power%20BI&title=Visualization%20%26%20BI',
    },
    {
      id: 'story',
      title: 'Analytics Storytelling',
      short: 'Story',
      hours: 6,
      skills: ['Insights', 'Communication'],
      resources: [
        { label: 'Present insights', kind: 'Reading', mins: 25 },
        { label: 'Case study write-up', kind: 'Exercise', mins: 60 },
      ],
      href: '/ai-course-designer?interest=Data%20Analytics&title=Analytics%20Storytelling',
    },
    {
      id: 'portfolio',
      title: 'Data Portfolio Project',
      short: 'Portfolio',
      hours: 14,
      skills: ['End-to-end analysis', 'Git'],
      resources: [{ label: 'Publish a portfolio project', kind: 'Project', mins: 180 }],
      href: '/ai-course-designer?interest=Data%20Analytics&title=Data%20Portfolio%20Project',
    },
  ],
};

function primaryTrack(profile: OnboardingProfile): InterestTrack {
  return profile.interests?.[0] || 'software';
}

function applyProgress(
  base: Omit<PathNode, 'status'>[],
  completedIds: string[],
): PathNode[] {
  const done = new Set(completedIds);
  let currentSet = false;
  return base.map((n) => {
    if (done.has(n.id)) return { ...n, status: 'completed' as const };
    if (!currentSet) {
      currentSet = true;
      return { ...n, status: 'current' as const };
    }
    return { ...n, status: 'locked' as const };
  });
}

function templatePath(profile: OnboardingProfile): PathNode[] {
  const track = primaryTrack(profile);
  const base = TEMPLATES[track] || TEMPLATES.software;
  return applyProgress(base, readCompletedIds(profile));
}

function readCompletedIds(profile: OnboardingProfile): string[] {
  try {
    const raw = localStorage.getItem(`${storageKey(profile.userEmail)}:done`);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}

export function markPathNodeDone(nodeId: string) {
  try {
    const key = `${storageKey()}:done`;
    const prev = JSON.parse(localStorage.getItem(key) || '[]');
    const set = new Set(Array.isArray(prev) ? prev.map(String) : []);
    set.add(nodeId);
    localStorage.setItem(key, JSON.stringify([...set]));
    window.dispatchEvent(new CustomEvent('eduroute:learning-path-updated'));
  } catch {
    /* ignore */
  }
}

export function readStoredPath(): PathNode[] | null {
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.nodes || !Array.isArray(parsed.nodes) || !parsed.nodes.length) return null;
    return parsed.nodes as PathNode[];
  } catch {
    return null;
  }
}

function writeStoredPath(nodes: PathNode[], meta: { track: string; source: string }) {
  try {
    localStorage.setItem(
      storageKey(),
      JSON.stringify({
        nodes,
        track: meta.track,
        source: meta.source,
        updatedAt: new Date().toISOString(),
      }),
    );
    window.dispatchEvent(new CustomEvent('eduroute:learning-path-updated'));
  } catch {
    /* ignore */
  }
}

function tryParseNodes(text: string): Omit<PathNode, 'status'>[] | null {
  try {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    const arr = Array.isArray(parsed) ? parsed : parsed.nodes;
    if (!Array.isArray(arr) || arr.length < 3) return null;
    return arr.slice(0, 8).map((t: any, i: number) => {
      const title = String(t.title || `Step ${i + 1}`);
      const short = String(t.short || title.split(' ')[0] || `Step${i + 1}`).slice(0, 18);
      const skills = Array.isArray(t.skills) ? t.skills.map(String).slice(0, 6) : [short];
      const resources = Array.isArray(t.resources)
        ? t.resources.slice(0, 4).map((r: any) => ({
            label: String(r.label || r.title || 'Resource'),
            kind: String(r.kind || 'Video'),
            mins: Number(r.mins) || 30,
          }))
        : [{ label: `${title} intro`, kind: 'Video', mins: 30 }];
      const id = String(t.id || `step-${i + 1}`).replace(/[^a-z0-9-_]/gi, '-').toLowerCase();
      let href = String(t.href || '');
      if (!href.startsWith('/')) {
        if (/dsa|algorithm|structure/i.test(title)) href = '/dsa-sheet';
        else if (/assessment|quiz/i.test(title)) href = '/assessments';
        else href = designerHref({ interest: skills[0] || short, title, nodeId: id, auto: true });
      }
      return { id, title, short, hours: Math.max(2, Number(t.hours) || 8), skills, resources, href };
    });
  } catch {
    return null;
  }
}

async function callBuddy(message: string): Promise<string | null> {
  try {
    const userId = getAuthUser()?.email || getAuthUser()?.id || 'learning-path';
    const res = await fetch('/api/buddy-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, message, language: 'english' }),
    });
    const data = await res.json();
    if (!res.ok || !data?.ok || typeof data.reply !== 'string') return null;
    if (/limited mode|No AI key found/i.test(data.reply)) return null;
    return data.reply;
  } catch {
    return null;
  }
}

export async function resolveLearningPath(opts?: {
  forceRefresh?: boolean;
}): Promise<{ nodes: PathNode[]; source: 'cache' | 'ai' | 'template'; track: string }> {
  const profile = readOnboarding();
  const track = primaryTrack(profile);
  const trackLabel = TRACK_LABEL[track];

  if (!opts?.forceRefresh) {
    const cached = readStoredPath();
    if (cached?.length) {
      const done = readCompletedIds(profile);
      const nodes = applyProgress(
        cached.map(({ status: _s, ...rest }) => rest),
        done,
      );
      return { nodes, source: 'cache', track: trackLabel };
    }
  }

  const gaps = profile.missingSkills?.length
    ? profile.missingSkills.join(', ')
    : 'not specified';

  const prompt =
    `Design a practical 5-7 step learning path for a student targeting: ${trackLabel}.\n` +
    `Skill gaps to prioritise: ${gaps}.\n` +
    `Return ONLY JSON: {"nodes":[{"id":"slug","title":"Module name","short":"Short","hours":8,"skills":["a","b"],"resources":[{"label":"...","kind":"Video|Reading|Exercise|Quiz","mins":30}]]}\n` +
    `Rules: steps must match the career (no unrelated domains). Order beginner → job-ready. No markdown.`;

  const ai = await callBuddy(prompt);
  if (ai) {
    const parsed = tryParseNodes(ai);
    if (parsed?.length) {
      const nodes = applyProgress(parsed, readCompletedIds(profile));
      writeStoredPath(nodes, { track: trackLabel, source: 'ai' });
      return { nodes, source: 'ai', track: trackLabel };
    }
  }

  const nodes = templatePath(profile);
  writeStoredPath(nodes, { track: trackLabel, source: 'template' });
  return { nodes, source: 'template', track: trackLabel };
}

export function continueHrefForNode(node: PathNode): string {
  if (node.href?.startsWith('/dsa-sheet') || /dsa|algorithm|structure/i.test(node.title)) {
    return node.href?.startsWith('/dsa-sheet') ? node.href : '/dsa-sheet';
  }
  if (node.href?.includes('/ai-course-designer')) {
    try {
      const u = new URL(node.href, 'https://eduroute.local');
      if (!u.searchParams.get('nodeId')) u.searchParams.set('nodeId', node.id);
      if (!u.searchParams.get('auto')) u.searchParams.set('auto', '1');
      if (!u.searchParams.get('interest')) {
        u.searchParams.set('interest', node.skills[0] || node.short);
      }
      if (!u.searchParams.get('title')) u.searchParams.set('title', node.title);
      return `/ai-course-designer?${u.searchParams.toString()}`;
    } catch {
      /* fall through */
    }
  }
  return designerHref({
    interest: node.skills[0] || node.short,
    title: node.title,
    nodeId: node.id,
    auto: true,
  });
}

export function careerLabelForUser(): string {
  const profile = readOnboarding();
  return TRACK_LABEL[primaryTrack(profile)];
}

/**
 * Career-aware living learning path.
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
  /** Calendar days to complete module (~2.5h/day) */
  days?: number;
  skills: string[];
  resources: { label: string; kind: string; mins: number }[];
  href?: string;
};

export function designerHref(opts: {
  interest: string;
  title: string;
  nodeId: string;
  auto?: boolean;
  days?: number;
  hours?: number;
}): string {
  const q = new URLSearchParams();
  q.set('interest', opts.interest);
  q.set('title', opts.title);
  q.set('nodeId', opts.nodeId);
  if (opts.auto !== false) q.set('auto', '1');
  const days =
    opts.days && opts.days > 0
      ? opts.days
      : opts.hours && opts.hours > 0
        ? Math.min(90, Math.max(5, Math.round(opts.hours / 2.5)))
        : undefined;
  if (days) q.set('days', String(days));
  if (opts.hours) q.set('hours', String(opts.hours));
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
  custom: 'Custom Role',
};

const TEMPLATES: Record<InterestTrack, Omit<PathNode, 'status'>[]> = {
  software: [
    {
      id: 'prog',
      title: 'Programming Fundamentals',
      short: 'Programming',
      hours: 25,
      days: 10,
      skills: ['Python', 'JavaScript', 'Problem solving'],
      resources: [
        { label: 'Language basics', kind: 'Video', mins: 90 },
        { label: 'Exercises', kind: 'Exercise', mins: 120 },
      ],
      href: '/ai-course-designer?interest=Python&title=Programming%20Fundamentals&days=10&hours=25',
    },
    {
      id: 'dsa',
      title: 'Data Structures & Algorithms',
      short: 'DSA',
      hours: 50,
      days: 20,
      skills: ['Arrays', 'Trees', 'Graphs', 'DP'],
      resources: [
        { label: 'DSA practice sheet', kind: 'Practice', mins: 300 },
        { label: 'Complexity basics', kind: 'Reading', mins: 60 },
      ],
      href: '/dsa-sheet',
    },
    {
      id: 'frontend',
      title: 'Frontend Foundations',
      short: 'Frontend',
      hours: 35,
      days: 14,
      skills: ['HTML', 'CSS', 'React'],
      resources: [
        { label: 'React path', kind: 'Video', mins: 120 },
        { label: 'Build a mini UI', kind: 'Exercise', mins: 180 },
      ],
      href: '/ai-course-designer?interest=React&title=Frontend%20Foundations&days=14&hours=35',
    },
    {
      id: 'backend',
      title: 'Backend & APIs',
      short: 'Backend',
      hours: 40,
      days: 16,
      skills: ['Node.js', 'REST', 'Databases'],
      resources: [
        { label: 'API design', kind: 'Video', mins: 90 },
        { label: 'CRUD project', kind: 'Exercise', mins: 240 },
      ],
      href: '/ai-course-designer?interest=Node.js&title=Backend%20%26%20APIs&days=16&hours=40',
    },
    {
      id: 'system',
      title: 'System Design Basics',
      short: 'System Design',
      hours: 45,
      days: 18,
      skills: ['System Design', 'Caching', 'Load Balancing'],
      resources: [
        { label: 'System design intro', kind: 'Video', mins: 120 },
        { label: 'URL shortener case', kind: 'Exercise', mins: 180 },
      ],
      href: '/ai-course-designer?interest=System%20Design&title=System%20Design%20Basics&days=18&hours=45',
    },
    {
      id: 'projects',
      title: 'Portfolio Projects',
      short: 'Projects',
      hours: 40,
      days: 16,
      skills: ['Full-stack', 'Git', 'Deploy'],
      resources: [{ label: 'Ship one end-to-end app', kind: 'Project', mins: 360 }],
      href: '/ai-course-designer?interest=Full-stack&title=Portfolio%20Projects&days=16&hours=40',
    },
  ],
  cybersecurity: [
    {
      id: 'linux',
      title: 'Linux & Networking Basics',
      short: 'Linux',
      hours: 30,
      days: 12,
      skills: ['Linux', 'Networking', 'CLI'],
      resources: [
        { label: 'Linux essentials', kind: 'Video', mins: 90 },
        { label: 'Network fundamentals', kind: 'Reading', mins: 60 },
      ],
      href: '/ai-course-designer?interest=Linux&title=Linux%20%26%20Networking&days=12&hours=30',
    },
    {
      id: 'sec-fund',
      title: 'Security Fundamentals',
      short: 'Sec Fund',
      hours: 35,
      days: 14,
      skills: ['CIA triad', 'Threats', 'Risk'],
      resources: [
        { label: 'Security overview', kind: 'Video', mins: 90 },
        { label: 'Threat modelling', kind: 'Reading', mins: 60 },
      ],
      href: '/ai-course-designer?interest=Cybersecurity&title=Security%20Fundamentals&days=14&hours=35',
    },
    {
      id: 'owasp',
      title: 'OWASP Top 10 & AppSec',
      short: 'OWASP',
      hours: 40,
      days: 16,
      skills: ['OWASP', 'Web security', 'Auth'],
      resources: [
        { label: 'OWASP Top 10', kind: 'Video', mins: 120 },
        { label: 'Fix a vulnerable app', kind: 'Exercise', mins: 240 },
      ],
      href: '/ai-course-designer?interest=OWASP&title=OWASP%20Top%2010&days=16&hours=40',
    },
    {
      id: 'ethical',
      title: 'Ethical Hacking Basics',
      short: 'Ethical',
      hours: 45,
      days: 18,
      skills: ['Recon', 'Pentest basics', 'Tools'],
      resources: [
        { label: 'Ethical hacking intro', kind: 'Video', mins: 120 },
        { label: 'Lab practice', kind: 'Exercise', mins: 240 },
      ],
      href: '/ai-course-designer?interest=Ethical%20Hacking&title=Ethical%20Hacking%20Basics&days=18&hours=45',
    },
    {
      id: 'defense',
      title: 'Defensive Security',
      short: 'Defense',
      hours: 35,
      days: 14,
      skills: ['Monitoring', 'Hardening', 'IR'],
      resources: [
        { label: 'Defense in depth', kind: 'Video', mins: 90 },
        { label: 'Incident response', kind: 'Reading', mins: 60 },
      ],
      href: '/ai-course-designer?interest=Cybersecurity&title=Defensive%20Security&days=14&hours=35',
    },
    {
      id: 'capstone',
      title: 'Security Capstone',
      short: 'Capstone',
      hours: 40,
      days: 16,
      skills: ['Report writing', 'Labs'],
      resources: [{ label: 'End-to-end security lab', kind: 'Project', mins: 360 }],
      href: '/ai-course-designer?interest=Cybersecurity&title=Security%20Capstone&days=16&hours=40',
    },
  ],
  data_analyst: [
    {
      id: 'sql',
      title: 'SQL & Databases',
      short: 'SQL',
      hours: 40,
      days: 16,
      skills: ['SQL', 'Joins', 'Aggregations'],
      resources: [
        { label: 'SQL full path', kind: 'Video', mins: 150 },
        { label: 'Query practice', kind: 'Exercise', mins: 180 },
      ],
      href: '/ai-course-designer?interest=SQL&title=SQL%20%26%20Databases&days=16&hours=40',
    },
    {
      id: 'python-data',
      title: 'Python for Data',
      short: 'Python',
      hours: 35,
      days: 14,
      skills: ['Python', 'Pandas', 'NumPy'],
      resources: [
        { label: 'Pandas getting started', kind: 'Video', mins: 90 },
        { label: 'Clean a dataset', kind: 'Exercise', mins: 150 },
      ],
      href: '/ai-course-designer?interest=Python&title=Python%20for%20Data&days=14&hours=35',
    },
    {
      id: 'eda',
      title: 'EDA & Statistics',
      short: 'EDA',
      hours: 30,
      days: 12,
      skills: ['EDA', 'Stats', 'Hypothesis'],
      resources: [
        { label: 'Exploratory analysis', kind: 'Video', mins: 90 },
        { label: 'Stats refresher', kind: 'Reading', mins: 60 },
      ],
      href: '/ai-course-designer?interest=Data%20Analytics&title=EDA%20%26%20Statistics&days=12&hours=30',
    },
    {
      id: 'viz',
      title: 'Visualization & BI',
      short: 'BI',
      hours: 35,
      days: 14,
      skills: ['Power BI', 'Tableau', 'Charts'],
      resources: [
        { label: 'Dashboard design', kind: 'Video', mins: 90 },
        { label: 'Build one dashboard', kind: 'Exercise', mins: 180 },
      ],
      href: '/ai-course-designer?interest=Power%20BI&title=Visualization%20%26%20BI&days=14&hours=35',
    },
    {
      id: 'story',
      title: 'Analytics Storytelling',
      short: 'Story',
      hours: 20,
      days: 8,
      skills: ['Insights', 'Communication'],
      resources: [
        { label: 'Present insights', kind: 'Reading', mins: 45 },
        { label: 'Case study write-up', kind: 'Exercise', mins: 120 },
      ],
      href: '/ai-course-designer?interest=Data%20Analytics&title=Analytics%20Storytelling&days=8&hours=20',
    },
    {
      id: 'portfolio',
      title: 'Data Portfolio Project',
      short: 'Portfolio',
      hours: 40,
      days: 16,
      skills: ['End-to-end analysis', 'Git'],
      resources: [{ label: 'Publish a portfolio project', kind: 'Project', mins: 360 }],
      href: '/ai-course-designer?interest=Data%20Analytics&title=Data%20Portfolio%20Project&days=16&hours=40',
    },
  ],
  custom: [
    {
      id: 'role-core',
      title: 'Role Core Skills',
      short: 'Core',
      hours: 35,
      days: 14,
      skills: ['Fundamentals'],
      resources: [
        { label: 'Core skills for your role', kind: 'Video', mins: 90 },
        { label: 'Hands-on practice set', kind: 'Exercise', mins: 180 },
        { label: 'Mini project', kind: 'Project', mins: 240 },
      ],
      href: '/ai-course-designer?interest=Custom&title=Role%20Core%20Skills&days=14&hours=35',
    },
    {
      id: 'system',
      title: 'System Design',
      short: 'SysDesign',
      hours: 50,
      days: 20,
      skills: ['System Design'],
      resources: [
        { label: 'System design foundations', kind: 'Video', mins: 120 },
        { label: 'Case study drills', kind: 'Exercise', mins: 180 },
        { label: 'Full design write-up', kind: 'Project', mins: 240 },
      ],
      href: '/ai-course-designer?interest=System%20Design&title=System%20Design&days=20&hours=50',
    },
    {
      id: 'interviews',
      title: 'Interview Prep',
      short: 'Interviews',
      hours: 45,
      days: 18,
      skills: ['Interviews', 'DSA'],
      resources: [{ label: 'Interview patterns + mocks', kind: 'Practice', mins: 300 }],
      href: '/dsa-sheet',
    },
    {
      id: 'portfolio',
      title: 'Portfolio Project',
      short: 'Portfolio',
      hours: 40,
      days: 16,
      skills: ['Projects'],
      resources: [{ label: 'Ship a production-grade project', kind: 'Project', mins: 360 }],
      href: '/ai-course-designer?interest=Portfolio&title=Portfolio%20Project&days=16&hours=40',
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
        ? t.resources.slice(0, 8).map((r: any) => ({
            label: String(r.label || r.title || 'Resource'),
            kind: String(r.kind || 'Video'),
            mins: Number(r.mins) || 45,
          }))
        : [{ label: `${title} intro`, kind: 'Video', mins: 60 }];
      const id = String(t.id || `step-${i + 1}`).replace(/[^a-z0-9-_]/gi, '-').toLowerCase();
      let hours = Math.max(8, Number(t.hours) || 20);
      let days = Number(t.days) || Math.round(hours / 2.5);
      days = Math.min(90, Math.max(5, days));
      if (/database|system design|interview/i.test(title) && hours < 30) {
        hours = Math.max(hours, 40);
        days = Math.max(days, 15);
      }
      const href = designerHref({
        interest: skills[0] || short,
        title,
        nodeId: id,
        auto: true,
        days,
        hours,
      });
      return { id, title, short, hours, days, skills, resources, href };
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
  const haveSkills = [...(profile.customSkills || []), ...(profile.cvSkills || [])]
    .filter(Boolean)
    .slice(0, 30)
    .join(', ');
  const targetLabel = profile.customRole?.trim() || trackLabel;

  const prompt =
    `Design a practical 5-7 step learning path for a student targeting: ${targetLabel}.\n` +
    `Skills the student already has (skip beginner modules for these): ${haveSkills || 'not specified'}.\n` +
    `Skill gaps to prioritise: ${gaps}.\n` +
    `Return ONLY JSON: {"nodes":[{"id":"slug","title":"Module name","short":"Short","hours":40,"days":16,"skills":["a","b"],"resources":[{"label":"...","kind":"Video|Reading|Exercise|Quiz|Project","mins":60}]]}\n` +
    `Rules: hours = total study hours (heavy topics like Databases/System Design for senior roles: 40–80h / 15–25 days). days ≈ hours/2.5. Prefer company requirements. Order beginner → job-ready. No markdown.`;

  const ai = await callBuddy(prompt);
  if (ai) {
    const parsed = tryParseNodes(ai);
    if (parsed?.length) {
      const nodes = applyProgress(parsed, readCompletedIds(profile));
      writeStoredPath(nodes, { track: targetLabel, source: 'ai' });
      return { nodes, source: 'ai', track: targetLabel };
    }
  }

  const nodes = templatePath(profile);
  writeStoredPath(nodes, { track: targetLabel, source: 'template' });
  return { nodes, source: 'template', track: targetLabel };
}

export function continueHrefForNode(node: PathNode): string {
  if (node.href?.startsWith('/dsa-sheet') || /dsa|algorithm|structure/i.test(node.title)) {
    return node.href?.startsWith('/dsa-sheet') ? node.href : '/dsa-sheet';
  }
  const topicDays =
    node.days && node.days > 0
      ? node.days
      : Math.min(90, Math.max(5, Math.round((node.hours || 20) / 2.5)));
  if (node.href?.includes('/ai-course-designer')) {
    try {
      const u = new URL(node.href, 'https://eduroute.local');
      if (!u.searchParams.get('nodeId')) u.searchParams.set('nodeId', node.id);
      if (!u.searchParams.get('auto')) u.searchParams.set('auto', '1');
      if (!u.searchParams.get('interest')) {
        u.searchParams.set('interest', node.skills[0] || node.short);
      }
      if (!u.searchParams.get('title')) u.searchParams.set('title', node.title);
      if (!u.searchParams.get('days')) u.searchParams.set('days', String(topicDays));
      if (!u.searchParams.get('hours') && node.hours) {
        u.searchParams.set('hours', String(node.hours));
      }
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
    days: topicDays,
    hours: node.hours,
  });
}

export function careerLabelForUser(): string {
  const profile = readOnboarding();
  if (profile.customRole?.trim()) return profile.customRole.trim();
  return TRACK_LABEL[primaryTrack(profile)];
}

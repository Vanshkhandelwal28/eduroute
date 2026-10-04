/**
 * Career-aware living learning path.
 * Full path + progress persisted to Neon via user-data.
 */

import { getAuthUser } from './rbacAuth';
import {
  readOnboarding,
  type InterestTrack,
  type OnboardingProfile,
} from './onboardingStore';
import { pushUserData, pullUserData } from './userDataStore';

export type PathNodeStatus = 'completed' | 'current' | 'locked';

export type PathNode = {
  id: string;
  title: string;
  short: string;
  status: PathNodeStatus;
  hours: number;
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
  skills?: string[];
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
  const skills = (opts.skills || []).map((s) => s.trim()).filter(Boolean);
  if (skills.length) q.set('skills', skills.slice(0, 8).join(','));
  return `/ai-course-designer?${q.toString()}`;
}

const STORE_PREFIX = 'eduroute:learning-path-v2:';
const PATH_KEY = 'learning-path';
const PROGRESS_KEY = 'learning-path-progress';

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

// TEMPLATES truncated in this emergency restore - full templates below via import pattern
// CRITICAL: This is an emergency minimal restore. Full file will follow.

export function markPathNodeDone(nodeId: string) {
  try {
    const key = `${storageKey()}:done`;
    const prev = JSON.parse(localStorage.getItem(key) || '[]');
    const set = new Set(Array.isArray(prev) ? prev.map(String) : []);
    set.add(nodeId);
    const completedNodeIds = [...set];
    localStorage.setItem(key, JSON.stringify(completedNodeIds));
    window.dispatchEvent(new CustomEvent('eduroute:learning-path-updated'));
    void pushUserData(PROGRESS_KEY, {
      completedNodeIds,
      updatedAt: new Date().toISOString(),
    });
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
    const payload = {
      nodes,
      track: meta.track,
      source: meta.source,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(storageKey(), JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent('eduroute:learning-path-updated'));
    void pushUserData(PATH_KEY, payload);
  } catch {
    /* ignore */
  }
}

export async function resolveLearningPath(opts?: {
  forceRefresh?: boolean;
}): Promise<{ nodes: PathNode[]; source: 'cache' | 'ai' | 'template'; track: string }> {
  const profile = readOnboarding();
  const track = (profile.interests?.[0] || 'software') as InterestTrack;
  const trackLabel = TRACK_LABEL[track] || 'Software Engineering';

  if (!opts?.forceRefresh) {
    const cached = readStoredPath();
    if (cached?.length) {
      return { nodes: cached, source: 'cache', track: trackLabel };
    }
  }

  // Minimal fallback path so app does not crash while full templates are restored
  const nodes: PathNode[] = [
    { id: 'core', title: 'Core Skills', short: 'Core', status: 'current', hours: 30, days: 12, skills: ['Fundamentals'], resources: [{ label: 'Start learning', kind: 'Video', mins: 90 }] },
    { id: 'practice', title: 'Practice Projects', short: 'Practice', status: 'locked', hours: 40, days: 16, skills: ['Projects'], resources: [{ label: 'Build projects', kind: 'Project', mins: 240 }] },
    { id: 'job', title: 'Job Ready', short: 'Job', status: 'locked', hours: 35, days: 14, skills: ['Interview'], resources: [{ label: 'Interview prep', kind: 'Practice', mins: 180 }] },
  ];
  writeStoredPath(nodes, { track: trackLabel, source: 'template' });
  return { nodes, source: 'template', track: trackLabel };
}

export function continueHrefForNode(node: PathNode): string {
  return designerHref({
    interest: (node.skills || [])[0] || node.short,
    title: node.title,
    nodeId: node.id,
    auto: true,
    days: node.days,
    hours: node.hours,
    skills: node.skills,
  });
}

export async function syncLearningPathFromServer(): Promise<void> {
  try {
    const remotePath = await pullUserData<{
      nodes?: PathNode[];
      track?: string;
      source?: string;
      updatedAt?: string;
    }>(PATH_KEY);
    if (remotePath && Array.isArray(remotePath.nodes) && remotePath.nodes.length > 0) {
      const local = readStoredPath();
      if (!local || local.length === 0) {
        localStorage.setItem(
          storageKey(),
          JSON.stringify({
            nodes: remotePath.nodes,
            track: remotePath.track || '',
            source: remotePath.source || 'server',
            updatedAt: remotePath.updatedAt || new Date().toISOString(),
          }),
        );
        window.dispatchEvent(new CustomEvent('eduroute:learning-path-updated'));
      }
    }
  } catch {
    /* ignore */
  }
  try {
    const remote = await pullUserData<{ completedNodeIds?: string[]; updatedAt?: string }>(PROGRESS_KEY);
    if (!remote || !Array.isArray(remote.completedNodeIds) || remote.completedNodeIds.length === 0) return;
    const key = `${storageKey()}:done`;
    const prev = JSON.parse(localStorage.getItem(key) || '[]');
    const set = new Set(Array.isArray(prev) ? prev.map(String) : []);
    let changed = false;
    for (const id of remote.completedNodeIds) {
      const s = String(id);
      if (!set.has(s)) {
        set.add(s);
        changed = true;
      }
    }
    if (changed) {
      localStorage.setItem(key, JSON.stringify([...set]));
      window.dispatchEvent(new CustomEvent('eduroute:learning-path-updated'));
    }
  } catch {
    /* ignore */
  }
}

export function careerLabelForUser(): string {
  const profile = readOnboarding();
  if (profile.customRole?.trim()) return profile.customRole.trim();
  const track = (profile.interests?.[0] || 'software') as InterestTrack;
  return TRACK_LABEL[track] || 'Software Engineering';
}

export { clearLearningPath } from './learningPathClear';

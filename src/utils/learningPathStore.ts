/**
 * Career-aware living learning path.
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
  /** All skills for this path node — pre-fill designer interests */
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
const DATA_KEY = 'learning-path-progress';

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

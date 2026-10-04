/**
 * Gamification state — points, XP, streak, badges, claimed rewards.
 * localStorage + Neon (Render /api/user-data key: gamification).
 * Does not change UI; pages read from these helpers.
 */

import { pushUserData, pullUserData } from './userDataStore';

export type GamificationBadge = {
  id: string;
  icon: string;
  title: string;
  earnedAt: string;
  xp?: number;
};

export type GamificationState = {
  points: number;
  xpTotal: number;
  level: number;
  levelName: string;
  currentLevelXp: number;
  nextLevelXp: number;
  streakCurrent: number;
  streakMax: number;
  lastActiveDate?: string;
  claimedRewardIds: string[];
  badges: GamificationBadge[];
  updatedAt: string;
};

const LOCAL_KEY = 'eduroute:gamification-v1';
const DATA_KEY = 'gamification';

const LEVEL_THRESHOLDS: { level: number; name: string; xp: number }[] = [
  { level: 1, name: 'Beginner', xp: 0 },
  { level: 2, name: 'Explorer', xp: 200 },
  { level: 3, name: 'Advanced', xp: 600 },
  { level: 4, name: 'Expert', xp: 1400 },
  { level: 5, name: 'Pro', xp: 2800 },
  { level: 6, name: 'Master', xp: 5000 },
  { level: 7, name: 'Legend', xp: 8500 },
];

function levelFromXp(total: number): {
  level: number;
  levelName: string;
  currentLevelXp: number;
  nextLevelXp: number;
} {
  let current = LEVEL_THRESHOLDS[0];
  let next = LEVEL_THRESHOLDS[1] || LEVEL_THRESHOLDS[0];
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (total >= LEVEL_THRESHOLDS[i].xp) {
      current = LEVEL_THRESHOLDS[i];
      next = LEVEL_THRESHOLDS[i + 1] || {
        level: current.level + 1,
        name: current.name,
        xp: current.xp + 2000,
      };
    }
  }
  return {
    level: current.level,
    levelName: current.name,
    currentLevelXp: current.xp,
    nextLevelXp: next.xp,
  };
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultState(): GamificationState {
  const lvl = levelFromXp(0);
  return {
    points: 0,
    xpTotal: 0,
    level: lvl.level,
    levelName: lvl.levelName,
    currentLevelXp: lvl.currentLevelXp,
    nextLevelXp: lvl.nextLevelXp,
    streakCurrent: 0,
    streakMax: 0,
    claimedRewardIds: [],
    badges: [],
    updatedAt: new Date().toISOString(),
  };
}

function readLocal(): GamificationState {
  if (typeof window === 'undefined') return defaultState();
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return defaultState();
    const base = defaultState();
    return {
      ...base,
      ...parsed,
      claimedRewardIds: Array.isArray(parsed.claimedRewardIds) ? parsed.claimedRewardIds : [],
      badges: Array.isArray(parsed.badges) ? parsed.badges : [],
      points: Number(parsed.points) || 0,
      xpTotal: Number(parsed.xpTotal) || 0,
      streakCurrent: Number(parsed.streakCurrent) || 0,
      streakMax: Number(parsed.streakMax) || 0,
    };
  } catch {
    return defaultState();
  }
}

function writeLocal(state: GamificationState, push = true) {
  if (typeof window === 'undefined') return;
  try {
    const next = { ...state, updatedAt: new Date().toISOString() };
    localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('eduroute:gamification-updated'));
    if (push) {
      void pushUserData(DATA_KEY, next);
    }
  } catch {
    /* ignore */
  }
}

function applyLevel(state: GamificationState): GamificationState {
  const lvl = levelFromXp(state.xpTotal);
  return {
    ...state,
    points: state.xpTotal,
    level: lvl.level,
    levelName: lvl.levelName,
    currentLevelXp: lvl.currentLevelXp,
    nextLevelXp: lvl.nextLevelXp,
  };
}

function bumpStreak(state: GamificationState): GamificationState {
  const today = todayKey();
  if (state.lastActiveDate === today) return state;

  let current = 1;
  if (state.lastActiveDate) {
    const prev = new Date(state.lastActiveDate + 'T12:00:00');
    const now = new Date(today + 'T12:00:00');
    const diffDays = Math.round((now.getTime() - prev.getTime()) / 86400000);
    if (diffDays === 1) current = (state.streakCurrent || 0) + 1;
  }

  return {
    ...state,
    lastActiveDate: today,
    streakCurrent: current,
    streakMax: Math.max(state.streakMax || 0, current),
  };
}

export function getGamification(): GamificationState {
  return applyLevel(readLocal());
}

export function getPoints(): number {
  return getGamification().xpTotal;
}

export function getClaimedRewardIds(): string[] {
  return getGamification().claimedRewardIds || [];
}

export function isRewardClaimed(rewardId: string): boolean {
  return getClaimedRewardIds().includes(rewardId);
}

export function claimReward(rewardId: string): boolean {
  const state = readLocal();
  if ((state.claimedRewardIds || []).includes(rewardId)) return false;
  const next = applyLevel({
    ...state,
    claimedRewardIds: [...(state.claimedRewardIds || []), rewardId],
  });
  writeLocal(next);
  return true;
}

export function addXp(
  amount: number,
  opts?: { badge?: Omit<GamificationBadge, 'earnedAt'> },
): GamificationState {
  if (!amount || amount <= 0) return getGamification();
  let state = bumpStreak(readLocal());
  state = {
    ...state,
    xpTotal: Math.max(0, (state.xpTotal || 0) + amount),
  };

  if (opts?.badge) {
    const exists = (state.badges || []).some((b) => b.id === opts.badge!.id);
    if (!exists) {
      state = {
        ...state,
        badges: [
          {
            id: opts.badge.id,
            icon: opts.badge.icon,
            title: opts.badge.title,
            xp: opts.badge.xp ?? amount,
            earnedAt: new Date().toISOString().slice(0, 10),
          },
          ...(state.badges || []),
        ].slice(0, 24),
      };
    }
  }

  // Streak milestone badges
  if (state.streakCurrent === 7) {
    const has = (state.badges || []).some((b) => b.id === 'badge-streak-7');
    if (!has) {
      state = {
        ...state,
        badges: [
          {
            id: 'badge-streak-7',
            icon: '🔥',
            title: '7-Day Streak',
            xp: 50,
            earnedAt: todayKey(),
          },
          ...(state.badges || []),
        ].slice(0, 24),
      };
    }
  }

  state = applyLevel(state);
  writeLocal(state);
  return state;
}

export function touchActivity(): GamificationState {
  const state = applyLevel(bumpStreak(readLocal()));
  writeLocal(state);
  return state;
}

/** Merge remote preferring higher xpTotal / newer updatedAt. */
export async function syncGamificationFromServer(): Promise<void> {
  const remote = await pullUserData<GamificationState>(DATA_KEY);
  if (!remote || typeof remote !== 'object') return;

  const local = readLocal();
  const remoteXp = Number(remote.xpTotal) || 0;
  const localXp = Number(local.xpTotal) || 0;
  const remoteAt = remote.updatedAt ? Date.parse(remote.updatedAt) : 0;
  const localAt = local.updatedAt ? Date.parse(local.updatedAt) : 0;

  const preferRemote = remoteXp > localXp || (remoteXp === localXp && remoteAt > localAt);
  if (!preferRemote) return;

  const merged: GamificationState = applyLevel({
    ...defaultState(),
    ...local,
    ...remote,
    xpTotal: Math.max(localXp, remoteXp),
    points: Math.max(localXp, remoteXp),
    streakCurrent: Math.max(local.streakCurrent || 0, Number(remote.streakCurrent) || 0),
    streakMax: Math.max(local.streakMax || 0, Number(remote.streakMax) || 0),
    claimedRewardIds: Array.from(
      new Set([...(local.claimedRewardIds || []), ...(remote.claimedRewardIds || [])]),
    ),
    badges: mergeBadges(local.badges || [], remote.badges || []),
    lastActiveDate:
      (local.lastActiveDate || '') > (remote.lastActiveDate || '')
        ? local.lastActiveDate
        : remote.lastActiveDate || local.lastActiveDate,
    updatedAt: remoteAt >= localAt ? remote.updatedAt : local.updatedAt,
  });

  writeLocal(merged, false);
}

function mergeBadges(a: GamificationBadge[], b: GamificationBadge[]): GamificationBadge[] {
  const map = new Map<string, GamificationBadge>();
  for (const x of [...a, ...b]) {
    if (!x || !x.id) continue;
    if (!map.has(x.id)) map.set(x.id, x);
  }
  return Array.from(map.values()).slice(0, 24);
}

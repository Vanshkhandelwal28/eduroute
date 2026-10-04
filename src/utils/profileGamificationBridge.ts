/**
 * Bridge: apply Neon-backed gamification onto ProfileDashboardData.
 */
import type { ProfileDashboardData } from '../data/profileMockData';
import { getGamification } from './gamificationStore';

export function applyGamificationToProfile(data: ProfileDashboardData): ProfileDashboardData {
  const g = getGamification();
  return {
    ...data,
    points: g.xpTotal,
    xp: {
      total: g.xpTotal,
      level: g.level,
      levelName: g.levelName as any,
      currentLevelXp: g.currentLevelXp,
      nextLevelXp: g.nextLevelXp,
    },
    streak: {
      current: g.streakCurrent,
      max: Math.max(g.streakMax, data.streak?.max ?? 0),
    },
    badges:
      g.badges && g.badges.length > 0
        ? g.badges.map((b) => ({
            id: b.id,
            icon: b.icon,
            title: b.title,
            earnedAt: b.earnedAt,
            ...(b.xp ? { xp: b.xp } : {}),
          }))
        : data.badges,
  };
}

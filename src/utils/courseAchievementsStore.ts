/** Score-based course certificates (Gold / Silver / Bronze). */

export type CertBadge = 'gold' | 'silver' | 'bronze';

export type CourseAchievement = {
  id: string;
  courseId: string;
  courseTitle: string;
  skills: string[];
  level: string;
  durationLabel: string;
  percent: number;
  badge: CertBadge;
  earnedAt: string;
  certId: string;
};

const KEY = 'eduroute:course-achievements';

export function badgeFromPercent(percent: number): CertBadge {
  if (percent >= 85) return 'gold';
  if (percent >= 75) return 'silver';
  return 'bronze';
}

export function badgeLabel(badge: CertBadge): string {
  if (badge === 'gold') return 'Gold';
  if (badge === 'silver') return 'Silver';
  return 'Bronze';
}

export function badgeRangeLabel(badge: CertBadge): string {
  if (badge === 'gold') return '85–100%';
  if (badge === 'silver') return '75–85%';
  return '60–74%';
}

export function listCourseAchievements(): CourseAchievement[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCourseAchievement(
  entry: Omit<CourseAchievement, 'id' | 'earnedAt' | 'badge'> & { badge?: CertBadge },
): CourseAchievement {
  const badge = entry.badge || badgeFromPercent(entry.percent);
  const full: CourseAchievement = {
    ...entry,
    badge,
    id: `${entry.courseId}-${Date.now()}`,
    earnedAt: new Date().toISOString(),
  };
  const list = listCourseAchievements().filter((a) => a.courseId !== entry.courseId);
  list.unshift(full);
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 40)));
  try {
    window.dispatchEvent(new Event('eduroute:course-achievements-updated'));
  } catch {
    /* ignore */
  }
  return full;
}

export function getAllEarnedCourseSkills(): string[] {
  const set = new Set<string>();
  for (const a of listCourseAchievements()) {
    for (const s of a.skills || []) {
      if (s && s.trim()) set.add(s.trim());
    }
  }
  return Array.from(set);
}

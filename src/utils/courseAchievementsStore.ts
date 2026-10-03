import { pushUserData, pullUserData } from './userDataStore';
/**
 * Course achievements after final assessment pass.
 */

import type { AiDesignedCourse } from './aiCourseStore';
import { levelFromDurationDays, makeCertId, formatCertDate } from './courseProgressStore';

export type CertBadge = 'gold' | 'silver' | 'bronze';

export type CourseAchievement = {
  courseId: string;
  courseTitle: string;
  skills: string[];
  level: string;
  durationDays: number;
  durationLabel: string;
  certId: string;
  completedAt: string;
  percent: number;
  badge: CertBadge;
};

const KEY = 'eduroute:course-achievements-v1';

export function badgeFromPercent(percent: number): CertBadge {
  if (percent >= 85) return 'gold';
  if (percent >= 75) return 'silver';
  return 'bronze';
}

export function badgeLabel(badge: CertBadge): string {
  return badge === 'gold' ? 'Gold' : badge === 'silver' ? 'Silver' : 'Bronze';
}

export function badgeRangeLabel(badge: CertBadge): string {
  if (badge === 'gold') return '85%+';
  if (badge === 'silver') return '75–84%';
  return '60–74%';
}

function readAll(): Record<string, CourseAchievement> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, CourseAchievement>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
    void pushUserData('course-achievements', map);
    window.dispatchEvent(new CustomEvent('eduroute:course-achievements-updated'));
  } catch {
    /* ignore */
  }
}

export function skillsFromCourse(course: AiDesignedCourse): string[] {
  const fromInterests = course.interests || [];
  const fromTopics = (course.topics || []).flatMap((t) => t.skills || []);
  return Array.from(new Set([...fromInterests, ...fromTopics])).slice(0, 12);
}

export function recordCourseAchievement(
  course: AiDesignedCourse,
  percent: number,
): CourseAchievement {
  const map = readAll();
  const badge = badgeFromPercent(percent);
  const level = levelFromDurationDays(course.durationDays);
  const next: CourseAchievement = {
    courseId: course.id,
    courseTitle: course.title,
    skills: skillsFromCourse(course),
    level,
    durationDays: course.durationDays,
    durationLabel: `${course.durationDays} days`,
    certId: map[course.id]?.certId || makeCertId(),
    completedAt: new Date().toISOString(),
    percent,
    badge,
  };
  map[course.id] = next;
  writeAll(map);
  return next;
}

export function listCourseAchievements(): CourseAchievement[] {
  return Object.values(readAll()).sort((a, b) => b.completedAt.localeCompare(a.completedAt));
}

export function getCourseAchievement(courseId: string): CourseAchievement | null {
  return readAll()[courseId] || null;
}

export function getAllEarnedCourseSkills(): string[] {
  const set = new Set<string>();
  for (const a of listCourseAchievements()) {
    (a.skills || []).forEach((s) => {
      if (s) set.add(String(s));
    });
  }
  return Array.from(set);
}

export async function syncAchievementsFromServer(): Promise<void> {
  const remote = await pullUserData<Record<string, CourseAchievement>>('course-achievements');
  if (!remote || typeof remote !== 'object') return;
  try {
    const local = readAll();
    const merged = { ...local, ...remote };
    localStorage.setItem(KEY, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent('eduroute:course-achievements-updated'));
  } catch {
    /* ignore */
  }
}

/**
 * Course achievements after final assessment pass.
 * Skills + certificate metadata + score badge for Profile & Portfolio.
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

/** Badge from assessment percent (pass is ≥60%). */
export function badgeFromPercent(percent: number): CertBadge {
  if (percent >= 85) return 'gold';
  if (percent >= 75) return 'silver';
  return 'bronze'; // 60–74
}

export function badgeLabel(badge: CertBadge): string {
  if (badge === 'gold') return 'GOLD';
  if (badge === 'silver') return 'SILVER';
  return 'BRONZE';
}

export function badgeRangeLabel(badge: CertBadge): string {
  if (badge === 'gold') return '85–100%';
  if (badge === 'silver') return '75–85%';
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
    window.dispatchEvent(
      new CustomEvent('eduroute:course-achievements-updated', { detail: map }),
    );
  } catch {
    /* ignore */
  }
}

/** Unique skills from interests + topic.skills */
export function skillsFromCourse(course: AiDesignedCourse): string[] {
  const set = new Set<string>();
  for (const s of course.interests || []) {
    if (s?.trim()) set.add(s.trim());
  }
  for (const t of course.topics || []) {
    for (const s of t.skills || []) {
      if (s?.trim()) set.add(s.trim());
    }
  }
  return Array.from(set);
}

export function recordCourseAchievement(
  course: AiDesignedCourse,
  percent: number,
  minWatchLabel?: string,
): CourseAchievement {
  const map = readAll();
  const prev = map[course.id];
  const skills = skillsFromCourse(course);
  const level = levelFromDurationDays(course.durationDays);
  const durationLabel = minWatchLabel
    ? `${course.durationDays} days`
    : `${course.durationDays} days`;
  const bestPercent = Math.max(percent, prev?.percent || 0);
  const next: CourseAchievement = {
    courseId: course.id,
    courseTitle: course.title,
    skills: skills.length ? skills : prev?.skills || [],
    level,
    durationDays: course.durationDays,
    durationLabel,
    certId: prev?.certId || makeCertId(),
    completedAt: prev?.completedAt || formatCertDate(),
    percent: bestPercent,
    badge: badgeFromPercent(bestPercent),
  };
  map[course.id] = next;
  writeAll(map);
  return next;
}

export function listCourseAchievements(): CourseAchievement[] {
  return Object.values(readAll()).sort((a, b) =>
    (b.completedAt || '').localeCompare(a.completedAt || ''),
  );
}

export function getCourseAchievement(courseId: string): CourseAchievement | null {
  return readAll()[courseId] || null;
}

/** All unique skills earned across passed courses */
export function getAllEarnedCourseSkills(): string[] {
  const set = new Set<string>();
  for (const a of listCourseAchievements()) {
    for (const s of a.skills) set.add(s);
  }
  return Array.from(set);
}

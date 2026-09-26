/**
 * Course achievements after final assessment pass.
 * Skills + certificate metadata for Profile & Portfolio.
 */

import type { AiDesignedCourse } from './aiCourseStore';
import { levelFromDurationDays, makeCertId, formatCertDate } from './courseProgressStore';

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
};

const KEY = 'eduroute:course-achievements-v1';

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
    ? `${course.durationDays} days · min watch ${minWatchLabel}`
    : `${course.durationDays} days`;
  const next: CourseAchievement = {
    courseId: course.id,
    courseTitle: course.title,
    skills: skills.length ? skills : prev?.skills || [],
    level,
    durationDays: course.durationDays,
    durationLabel,
    certId: prev?.certId || makeCertId(),
    completedAt: prev?.completedAt || formatCertDate(),
    percent: Math.max(percent, prev?.percent || 0),
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

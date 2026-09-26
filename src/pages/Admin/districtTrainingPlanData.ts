/** SIH26134 — District-level training plan generator (reuses Demand Intel + Curriculum Gaps) */

import {
  COURSES,
  type CourseCurriculum,
  type CourseFlag,
} from './curriculumGapData';
import {
  DISTRICTS,
  JOB_SIGNALS,
  type DistrictKey,
  type JobSignal,
} from '../Intelligence/demandIntelligenceData';

export type PlanActionType = 'expand' | 'reduce' | 'add_module' | 'new_course';

export type PlanAction = {
  id: string;
  action: PlanActionType;
  courseOrRole: string;
  why: string;
  seatDelta: string;
  priority: 'high' | 'medium' | 'low';
  courseId?: string;
  sector?: string;
  trainersHint?: string;
};

export type DistrictSkillDemand = {
  skill: string;
  openings: number;
  demand: number;
  trend: 'rising' | 'stable' | 'declining';
};

export type DistrictPlanSummary = {
  district: DistrictKey;
  totalOpenings: number;
  uniqueRoles: number;
  courseCount: number;
  expandCount: number;
  reduceCount: number;
  newCourseCount: number;
  trainerShortfall: number;
  readinessNote: string;
};

export { DISTRICTS };

export function signalsForDistrict(district: DistrictKey): JobSignal[] {
  return JOB_SIGNALS.filter((s) => s.district === district);
}

export function coursesForDistrict(district: DistrictKey): CourseCurriculum[] {
  return COURSES.filter((c) => c.district === district);
}

/** Nearby districts for "no local course" recommendations */
const NEARBY: Partial<Record<DistrictKey, DistrictKey[]>> = {
  Pune: ['Mumbai', 'Nashik', 'Solapur'],
  Mumbai: ['Thane', 'Pune'],
  Thane: ['Mumbai', 'Pune'],
  Nagpur: ['Aurangabad'],
  Nashik: ['Pune', 'Aurangabad'],
  Aurangabad: ['Nashik', 'Nagpur'],
  Kolhapur: ['Solapur', 'Pune'],
  Solapur: ['Pune', 'Kolhapur'],
};

export function topSkillsForDistrict(district: DistrictKey): DistrictSkillDemand[] {
  const signals = signalsForDistrict(district);
  const map = new Map<string, { openings: number; rising: number; declining: number }>();
  for (const s of signals) {
    for (const skill of s.skills) {
      const cur = map.get(skill) || { openings: 0, rising: 0, declining: 0 };
      cur.openings += s.openings;
      if (s.trend === 'rising') cur.rising += 1;
      if (s.trend === 'declining') cur.declining += 1;
      map.set(skill, cur);
    }
  }
  return [...map.entries()]
    .map(([skill, v]) => {
      let trend: DistrictSkillDemand['trend'] = 'stable';
      if (v.rising > v.declining) trend = 'rising';
      else if (v.declining > v.rising) trend = 'declining';
      return {
        skill,
        openings: v.openings,
        demand: Math.min(99, 35 + Math.round(v.openings / 2)),
        trend,
      };
    })
    .sort((a, b) => b.openings - a.openings)
    .slice(0, 10);
}

function seatDeltaForExpand(course: CourseCurriculum, openings: number): string {
  const pressure = Math.max(0, openings - Math.floor(course.seats * 0.4));
  const add = Math.min(80, Math.max(15, Math.round(pressure / 2) || 25));
  return `+${add} seats`;
}

function seatDeltaForReduce(course: CourseCurriculum): string {
  const cut = Math.min(Math.floor(course.seats * 0.35), Math.max(20, Math.round(course.seats * 0.25)));
  return `−${cut} seats`;
}

function trainersForSeats(seats: number): number {
  return Math.max(1, Math.ceil(seats / 30));
}

export function generateDistrictPlan(district: DistrictKey): PlanAction[] {
  const signals = signalsForDistrict(district);
  const courses = coursesForDistrict(district);
  const actions: PlanAction[] = [];
  let n = 0;
  const id = () => `plan-${district}-${++n}`;

  const openingsBySector = new Map<string, number>();
  for (const s of signals) {
    openingsBySector.set(s.sector, (openingsBySector.get(s.sector) || 0) + s.openings);
  }

  for (const course of courses) {
    const sectorOpenings = openingsBySector.get(course.sector) || 0;
    const localSignals = signals.filter((s) => s.sector === course.sector);
    const risingOpenings = localSignals
      .filter((s) => s.trend === 'rising')
      .reduce((a, s) => a + s.openings, 0);

    if (course.flag === 'critical_gap' || (course.demandIndex >= 85 && course.seats < 80)) {
      actions.push({
        id: id(),
        action: 'expand',
        courseOrRole: course.name,
        why: `High demand (index ${course.demandIndex}) · ${sectorOpenings} openings in ${district} · only ${course.seats} seats`,
        seatDelta: seatDeltaForExpand(course, sectorOpenings + risingOpenings),
        priority: 'high',
        courseId: course.id,
        sector: course.sector,
        trainersHint: `~${trainersForSeats(course.seats + 30)} trainers needed after expand`,
      });
    }

    if (course.flag === 'obsolete' || course.flag === 'oversupplied' || course.placementRate12m < 35) {
      actions.push({
        id: id(),
        action: 'reduce',
        courseOrRole: course.name,
        why:
          course.flag === 'obsolete'
            ? `Obsolete / declining local demand · placement ${course.placementRate12m}%`
            : `Oversupplied or weak placement (${course.placementRate12m}%) · ${course.seats} seats`,
        seatDelta: seatDeltaForReduce(course),
        priority: course.flag === 'obsolete' ? 'high' : 'medium',
        courseId: course.id,
        sector: course.sector,
        trainersHint: 'Redeploy trainers to high-demand programmes',
      });
    }

    const gapSkills = course.skills
      .filter((sk) => sk.demandPct - sk.taughtPct >= 25)
      .sort((a, b) => b.demandPct - a.demandPct - (a.taughtPct - b.taughtPct))
      .slice(0, 2);
    for (const sk of gapSkills) {
      actions.push({
        id: id(),
        action: 'add_module',
        courseOrRole: `${sk.skill} → ${course.name}`,
        why: `Taught ${sk.taughtPct}% · district/industry demand ${sk.demandPct}% (${sk.level})`,
        seatDelta: 'Update syllabus',
        priority: sk.demandPct - sk.taughtPct >= 40 ? 'high' : 'medium',
        courseId: course.id,
        sector: course.sector,
      });
    }
  }

  // Emerging demand with no local course
  const coveredSectors = new Set(courses.map((c) => c.sector));
  const emergingByTitle = new Map<string, { openings: number; sector: string; skills: string[] }>();
  for (const s of signals) {
    if (s.trend !== 'rising' && !(s.emerging && s.emerging.length)) continue;
    if (coveredSectors.has(s.sector) && courses.some((c) => c.sector === s.sector && c.demandIndex > 50)) {
      // sector has a course — skip new course unless very high openings and no critical course
      const hasCritical = courses.some((c) => c.sector === s.sector && c.flag === 'critical_gap');
      if (hasCritical || s.openings < 20) continue;
    }
    const cur = emergingByTitle.get(s.title) || { openings: 0, sector: s.sector, skills: [] };
    cur.openings += s.openings;
    cur.skills = [...new Set([...cur.skills, ...s.skills])];
    emergingByTitle.set(s.title, cur);
  }

  for (const [title, v] of emergingByTitle) {
    const hasSimilar = courses.some(
      (c) =>
        c.name.toLowerCase().includes(title.split(' ')[0].toLowerCase()) ||
        c.skills.some((sk) => v.skills.includes(sk.skill)),
    );
    if (hasSimilar && v.openings < 25) continue;
    if (v.openings < 12) continue;
    actions.push({
      id: id(),
      action: 'new_course',
      courseOrRole: title,
      why: `Rising demand in ${district} · ${v.openings} openings · skills: ${v.skills.slice(0, 3).join(', ')} · no matching local programme`,
      seatDelta: 'Pilot 25 seats',
      priority: v.openings >= 30 ? 'high' : 'medium',
      sector: v.sector,
      trainersHint: '~2 trainers for pilot cohort',
    });
  }

  // If district has zero courses but has demand
  if (courses.length === 0 && signals.length > 0) {
    const top = [...openingsBySector.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top) {
      const nearby = NEARBY[district] || [];
      actions.push({
        id: id(),
        action: 'new_course',
        courseOrRole: `${top[0]} foundation programme`,
        why: `No skill courses listed in ${district}; ${top[1]} openings in ${top[0]}${
          nearby.length ? ` · consider partnering with ${nearby[0]}` : ''
        }`,
        seatDelta: 'Pilot 30 seats',
        priority: 'high',
        sector: top[0],
        trainersHint: '~2–3 trainers + shared lab',
      });
    }
  }

  const priorityRank = { high: 0, medium: 1, low: 2 };
  const actionRank = { expand: 0, new_course: 1, add_module: 2, reduce: 3 };
  return actions.sort(
    (a, b) =>
      priorityRank[a.priority] - priorityRank[b.priority] ||
      actionRank[a.action] - actionRank[b.action],
  );
}

export function summarizePlan(district: DistrictKey, actions: PlanAction[]): DistrictPlanSummary {
  const signals = signalsForDistrict(district);
  const courses = coursesForDistrict(district);
  const totalOpenings = signals.reduce((a, s) => a + s.openings, 0);
  const uniqueRoles = new Set(signals.map((s) => s.title)).size;
  const expandCount = actions.filter((a) => a.action === 'expand').length;
  const reduceCount = actions.filter((a) => a.action === 'reduce').length;
  const newCourseCount = actions.filter((a) => a.action === 'new_course').length;

  let trainerShortfall = 0;
  for (const a of actions) {
    if (a.action === 'expand' || a.action === 'new_course') trainerShortfall += 1;
  }

  let readinessNote = 'Balanced — monitor quarterly';
  if (expandCount + newCourseCount >= 3) readinessNote = 'Capacity build needed — prioritise expands & pilots';
  else if (reduceCount >= 2) readinessNote = 'Rationalise low-placement programmes first';
  else if (totalOpenings === 0) readinessNote = 'Sparse signals — validate with employer survey';

  return {
    district,
    totalOpenings,
    uniqueRoles,
    courseCount: courses.length,
    expandCount,
    reduceCount,
    newCourseCount,
    trainerShortfall,
    readinessNote,
  };
}

export function actionTone(action: PlanActionType) {
  switch (action) {
    case 'expand':
      return 'bg-emerald-500/15 text-emerald-700 ring-emerald-300/50 dark:text-emerald-300';
    case 'reduce':
      return 'bg-rose-500/15 text-rose-700 ring-rose-300/50 dark:text-rose-300';
    case 'add_module':
      return 'bg-violet-500/15 text-violet-700 ring-violet-300/50 dark:text-violet-300';
    case 'new_course':
      return 'bg-sky-500/15 text-sky-700 ring-sky-300/50 dark:text-sky-300';
    default:
      return 'bg-slate-500/10 text-[var(--text-muted)]';
  }
}

export function actionLabel(action: PlanActionType) {
  switch (action) {
    case 'expand':
      return 'Expand';
    case 'reduce':
      return 'Reduce';
    case 'add_module':
      return 'Add module';
    case 'new_course':
      return 'New course';
    default:
      return action;
  }
}

export function flagToneLocal(flag: CourseFlag) {
  switch (flag) {
    case 'obsolete':
      return 'bg-rose-500/15 text-rose-700 dark:text-rose-300';
    case 'oversupplied':
      return 'bg-amber-500/15 text-amber-800 dark:text-amber-200';
    case 'critical_gap':
      return 'bg-violet-500/15 text-violet-700 dark:text-violet-300';
    default:
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
  }
}

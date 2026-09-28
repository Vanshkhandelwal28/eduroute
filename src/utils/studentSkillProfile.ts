/**
 * Unified student skill profile for Skill Trend Analysis.
 * Sources: onboarding quiz + custom/CV skills + course certificates.
 * Recomputed on every page load / refresh so the trend page stays real.
 */

import { getAllEarnedCourseSkills, listCourseAchievements } from './courseAchievementsStore';
import { readCvData } from './cvStore';
import {
  interestLabel,
  readOnboarding,
  type InterestTrack,
  type OnboardingProfile,
} from './onboardingStore';
import { normalizeSkillList } from './skillNormalize';

export type SkillSource =
  | 'onboarding_strength'
  | 'onboarding_gap'
  | 'cv'
  | 'certificate'
  | 'custom';

export type SourcedSkill = {
  skill: string;
  sources: SkillSource[];
};

export type StudentSkillProfile = {
  field: string;
  regionHint: string | null;
  /** Skills the student has (strengths + CV + certs + custom known) */
  ownedSkills: string[];
  /** Explicit gaps from skill-gap quiz */
  quizGaps: string[];
  /** All skills used for market match (owned + gaps) */
  allSkills: string[];
  bySource: SourcedSkill[];
  certCount: number;
  cvSkillCount: number;
  quizCompleted: boolean;
};

function strengthsFromProfile(o: OnboardingProfile): string[] {
  return (o.gapAnswers || []).filter((a) => a.answer === 'yes').map((a) => a.skill).filter(Boolean);
}

function gapsFromProfile(o: OnboardingProfile): string[] {
  const missing = [...(o.missingSkills || [])];
  if (missing.length === 0 && o.gapAnswers?.length) {
    o.gapAnswers.forEach((a) => {
      if (a.answer === 'no' && a.skill && !missing.includes(a.skill)) missing.push(a.skill);
    });
  }
  return missing;
}

function mergeSourceMap(
  map: Map<string, Set<SkillSource>>,
  skills: string[],
  source: SkillSource,
) {
  skills.forEach((raw) => {
    const s = String(raw || '').trim();
    if (!s) return;
    const key = s.toLowerCase();
    if (!map.has(key)) map.set(key, new Set());
    map.get(key)!.add(source);
    // preserve original casing on first insert via parallel map
  });
}

/** Build full profile from local stores (quiz + CV + certificates). */
export function buildStudentSkillProfile(): StudentSkillProfile {
  const o = readOnboarding();
  const strengths = strengthsFromProfile(o);
  const quizGaps = gapsFromProfile(o);
  const cv = readCvData();
  const cvSkills = normalizeSkillList(cv?.skills || []);
  const certSkills = getAllEarnedCourseSkills();
  const certCount = listCourseAchievements().length;

  const labelMap = new Map<string, string>();
  const sourceMap = new Map<string, Set<SkillSource>>();

  const track = (skills: string[], source: SkillSource) => {
    skills.forEach((raw) => {
      const s = String(raw || '').trim();
      if (!s) return;
      const key = s.toLowerCase();
      if (!labelMap.has(key)) labelMap.set(key, s);
      if (!sourceMap.has(key)) sourceMap.set(key, new Set());
      sourceMap.get(key)!.add(source);
    });
  };

  track(strengths, 'onboarding_strength');
  track(quizGaps, 'onboarding_gap');
  track(cvSkills, 'cv');
  track(certSkills, 'certificate');

  const ownedKeys = new Set<string>();
  strengths.forEach((s) => ownedKeys.add(s.toLowerCase()));
  cvSkills.forEach((s) => ownedKeys.add(s.toLowerCase()));
  certSkills.forEach((s) => ownedKeys.add(s.toLowerCase()));

  const ownedSkills = normalizeSkillList([...ownedKeys].map((k) => labelMap.get(k) || k));
  const allSkills = normalizeSkillList([
    ...ownedSkills,
    ...quizGaps.filter((g) => !ownedKeys.has(g.toLowerCase())),
  ]);

  const bySource: SourcedSkill[] = [...sourceMap.entries()].map(([key, sources]) => ({
    skill: labelMap.get(key) || key,
    sources: [...sources],
  }));

  const field =
    o.interests?.[0] != null
      ? interestLabel(o.interests[0] as InterestTrack)
      : 'Software Engineering';

  return {
    field,
    regionHint: o.region || null,
    ownedSkills,
    quizGaps: normalizeSkillList(quizGaps),
    allSkills,
    bySource,
    certCount,
    cvSkillCount: cvSkills.length,
    quizCompleted: Boolean(o.completedAt),
  };
}

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
  onboardingDone: boolean;
  summary: string;
};

function strengthsFromProfile(o: OnboardingProfile): string[] {
  return (o.gapAnswers || []).filter((a) => a.answer === 'yes').map((a) => a.skill);
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

function addSource(map: Map<string, Set<SkillSource>>, skill: string, source: SkillSource) {
  const n = String(skill || '').trim();
  if (!n) return;
  const key = n;
  if (!map.has(key)) map.set(key, new Set());
  map.get(key)!.add(source);
}

/** Build full profile from local stores — call on every Trend page mount/refresh. */
export function buildStudentSkillProfile(): StudentSkillProfile {
  const o = readOnboarding();
  const cv = readCvData();
  const certSkills = getAllEarnedCourseSkills();
  const certs = listCourseAchievements();

  const quizStrengths = strengthsFromProfile(o);
  const quizGaps = gapsFromProfile(o);
  const customSkills = o.customSkills || [];
  const cvSkills = [...(cv.skills || []), ...(o.cvSkills || [])];

  const sourceMap = new Map<string, Set<SkillSource>>();

  quizStrengths.forEach((s) => addSource(sourceMap, s, 'onboarding_strength'));
  quizGaps.forEach((s) => addSource(sourceMap, s, 'onboarding_gap'));
  customSkills.forEach((s) => addSource(sourceMap, s, 'custom'));
  cvSkills.forEach((s) => addSource(sourceMap, s, 'cv'));
  certSkills.forEach((s) => addSource(sourceMap, s, 'certificate'));

  // CV certificate titles often name a skill area (lightweight parse)
  for (const title of cv.certificates || []) {
    const t = String(title || '').trim();
    if (!t) continue;
    // Keep full title as a soft skill tag for display/AI context
    addSource(sourceMap, t, 'certificate');
  }

  const bySource: SourcedSkill[] = Array.from(sourceMap.entries()).map(([skill, sources]) => ({
    skill,
    sources: Array.from(sources),
  }));

  const ownedSkills = normalizeSkillList(
    bySource
      .filter((s) => s.sources.some((x) => x !== 'onboarding_gap'))
      .map((s) => s.skill),
  );

  const allSkills = normalizeSkillList([
    ...ownedSkills,
    ...quizGaps,
  ]);

  const field =
    o.customRole?.trim() ||
    (o.interests?.[0] != null ? interestLabel(o.interests[0] as InterestTrack) : null) ||
    cv.title ||
    'Software Engineering';

  const regionHint = cv.city?.trim() || null;

  const summary = [
    `Track: ${field}.`,
    ownedSkills.length ? `Owned skills (${ownedSkills.length}): ${ownedSkills.slice(0, 12).join(', ')}.` : 'No owned skills recorded yet.',
    quizGaps.length ? `Quiz gaps: ${quizGaps.join(', ')}.` : '',
    certs.length ? `Course certificates: ${certs.length} (${certSkills.slice(0, 8).join(', ') || 'skills recorded'}).` : '',
    cvSkills.length ? `CV skills: ${cvSkills.slice(0, 8).join(', ')}.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    field,
    regionHint,
    ownedSkills,
    quizGaps,
    allSkills,
    bySource,
    certCount: certs.length,
    cvSkillCount: normalizeSkillList(cvSkills).length,
    onboardingDone: Boolean(o.completedAt),
    summary,
  };
}

export function sourceLabel(s: SkillSource): string {
  switch (s) {
    case 'onboarding_strength':
      return 'Quiz strength';
    case 'onboarding_gap':
      return 'Quiz gap';
    case 'cv':
      return 'CV';
    case 'certificate':
      return 'Certificate';
    case 'custom':
      return 'Custom role';
    default:
      return s;
  }
}

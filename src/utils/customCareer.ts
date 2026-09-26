/**
 * Custom career onboarding helpers (role + skills + CV extract).
 */
import { writeOnboarding, type OnboardingProfile } from './onboardingStore';

export function saveCustomCareer(opts: {
  role: string;
  skills: string[];
  cvSkills?: string[];
  missingSkills?: string[];
}) {
  const role = opts.role.trim().slice(0, 80);
  const skills = (opts.skills || []).map((s) => s.trim()).filter(Boolean).slice(0, 40);
  const cvSkills = (opts.cvSkills || []).map((s) => s.trim()).filter(Boolean).slice(0, 40);
  const missing = (opts.missingSkills || []).map((s) => s.trim()).filter(Boolean).slice(0, 30);
  writeOnboarding({
    interests: ['custom' as any],
    gapAnswers: [],
    missingSkills: missing,
    completedAt: new Date().toISOString(),
    skipped: false,
    customRole: role,
    customSkills: skills,
    cvSkills,
  } as OnboardingProfile);
}

/** Heuristic skill extraction from plain text (CV paste / .txt upload) */
export function extractSkillsFromText(text: string): string[] {
  if (!text || text.length < 8) return [];
  const lower = text.toLowerCase();
  const BANK = [
    'javascript', 'typescript', 'python', 'java', 'golang', 'go', 'rust', 'c++', 'c#',
    'react', 'next.js', 'node.js', 'express', 'nestjs', 'django', 'flask',
    'rest api', 'restapi', 'graphql', 'jwt', 'oauth', 'microservices',
    'docker', 'kubernetes', 'aws', 'linux', 'git', 'ci/cd', 'redis', 'mongodb',
    'postgresql', 'mysql', 'sql', 'system design', 'backend', 'frontend',
  ];
  const found: string[] = [];
  for (const skill of BANK) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\s+/g, '\\s+');
    const re = new RegExp('\\b' + escaped + '\\b', 'i');
    if (re.test(lower)) {
      const label =
        skill === 'go' ? 'Golang' : skill === 'restapi' ? 'REST API' : skill;
      if (!found.some((f) => f.toLowerCase() === label.toLowerCase())) found.push(label);
    }
  }
  const skillsLine = text.match(/skills?\s*[:|-]\s*([^\n]+)/i);
  if (skillsLine) {
    skillsLine[1]
      .split(/[,|/•·;]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 1 && s.length < 40)
      .forEach((s) => {
        if (!found.some((f) => f.toLowerCase() === s.toLowerCase())) found.push(s);
      });
  }
  return found.slice(0, 30);
}

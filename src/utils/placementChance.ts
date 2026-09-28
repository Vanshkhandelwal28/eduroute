/**
 * Real skill-match placement chance — no random / fake people.
 * Compares the student's onboarding + earned skills to course text.
 */

import { readOnboarding, interestLabel } from './onboardingStore';
import { getAllEarnedCourseSkills } from './courseAchievementsStore';

const SKILL_ALIASES: Record<string, string[]> = {
  react: ['react', 'reactjs', 'react.js', 'jsx', 'frontend', 'front-end', 'ui'],
  typescript: ['typescript', 'ts', 'typed'],
  javascript: ['javascript', 'js', 'ecmascript', 'node', 'nodejs', 'node.js'],
  node: ['node', 'nodejs', 'node.js', 'express', 'backend', 'back-end'],
  python: ['python', 'django', 'flask', 'fastapi', 'pandas', 'numpy'],
  java: ['java', 'spring', 'jvm'],
  sql: ['sql', 'mysql', 'postgres', 'postgresql', 'database', 'mongodb', 'mongo'],
  dsa: ['dsa', 'algorithms', 'data structures', 'leetcode', 'coding'],
  ml: ['machine learning', 'ml', 'ai', 'deep learning', 'tensorflow', 'pytorch'],
  data: ['data science', 'data analysis', 'analytics', 'tableau', 'power bi'],
  cyber: ['cyber', 'security', 'network security', 'ethical hacking'],
  design: ['ui', 'ux', 'figma', 'design'],
  system: ['system design', 'architecture', 'microservices'],
};

/** Roles commonly tied to skill clusters — used only when skills actually match */
const ROLE_FOR_SKILLS: { skills: string[]; role: string; track: string }[] = [
  { skills: ['react', 'typescript', 'javascript'], role: 'Frontend / SDE', track: 'Web' },
  { skills: ['node', 'javascript', 'sql'], role: 'Backend Engineer', track: 'Web' },
  { skills: ['react', 'node', 'javascript'], role: 'Full Stack', track: 'Web' },
  { skills: ['python', 'sql', 'data'], role: 'Data Analyst', track: 'Data' },
  { skills: ['python', 'ml'], role: 'ML / Data Science', track: 'Data' },
  { skills: ['java', 'sql', 'dsa'], role: 'SDE / Backend', track: 'Software' },
  { skills: ['dsa', 'javascript'], role: 'SDE Intern', track: 'Software' },
  { skills: ['cyber'], role: 'Security Analyst', track: 'Cyber' },
  { skills: ['design'], role: 'UI/UX Designer', track: 'Design' },
];

const CATEGORY_IMAGES: Record<string, string> = {
  development:
    'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1200&q=80',
  design:
    'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=1200&q=80',
  'data science':
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
  business:
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
  default:
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
};

const TITLE_IMAGE_HINTS: { test: RegExp; url: string }[] = [
  {
    test: /react|frontend|typescript|javascript|web/i,
    url: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=1200&q=80',
  },
  {
    test: /node|backend|full.?stack|express|api/i,
    url: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?auto=format&fit=crop&w=1200&q=80',
  },
  {
    test: /python|data science|machine learning|ml|analytics/i,
    url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
  },
  {
    test: /cyber|security|hack/i,
    url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80',
  },
  {
    test: /design|ui|ux|figma/i,
    url: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=1200&q=80',
  },
  {
    test: /java|dsa|algorithm/i,
    url: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?auto=format&fit=crop&w=1200&q=80',
  },
];

export type PlacementChanceResult = {
  chancePercent: number;
  boostPercent: number;
  matchedSkills: string[];
  courseSkills: string[];
  roleHints: { role: string; track: string; viaSkills: string[] }[];
  hasProfile: boolean;
  analyzedAt: number;
};

export function getUserSkills(): { skills: string[]; hasProfile: boolean } {
  const onboarding = readOnboarding();
  const strengths = (onboarding.gapAnswers || [])
    .filter((a) => a.answer === 'yes')
    .map((a) => a.skill);
  const interests = (onboarding.interests || []).map(interestLabel);
  const custom = onboarding.customSkills || [];
  const earned = getAllEarnedCourseSkills();
  const missing = onboarding.missingSkills || [];
  const skills = Array.from(
    new Set(
      [...strengths, ...interests, ...custom, ...earned, ...missing]
        .map((s) => String(s).trim())
        .filter((s) => s.length > 1),
    ),
  );
  return {
    skills,
    hasProfile: Boolean(onboarding.completedAt) || skills.length > 0,
  };
}

function normalizeTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+.#\s-]/g, ' ')
    .split(/[\s,/|]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1);
}

export function extractCourseSkillKeys(course: {
  title?: string;
  description?: string;
  category?: string;
  level?: string;
}): string[] {
  const hay = `${course.title || ''} ${course.description || ''} ${course.category || ''} ${course.level || ''}`.toLowerCase();
  const found = new Set<string>();
  for (const [key, aliases] of Object.entries(SKILL_ALIASES)) {
    if (aliases.some((a) => hay.includes(a))) found.add(key);
  }
  for (const t of normalizeTokens(course.title || '')) {
    if (t.length > 3) found.add(t);
  }
  return Array.from(found);
}

function skillMatchesUser(userSkills: string[], key: string): boolean {
  const aliases = SKILL_ALIASES[key] || [key];
  const userLow = userSkills.map((s) => s.toLowerCase());
  return userLow.some((u) => {
    if (aliases.some((a) => u.includes(a) || a.includes(u))) return true;
    if (u.includes(key) || key.includes(u)) return true;
    return false;
  });
}

/** Real comparison only — no random seed. */
export function computePlacementChance(
  course: { title?: string; description?: string; category?: string; level?: string },
  userSkills?: string[],
): PlacementChanceResult {
  const { skills: profileSkills, hasProfile } = getUserSkills();
  const skills = userSkills && userSkills.length ? userSkills : profileSkills;
  const courseSkills = extractCourseSkillKeys(course);

  const matchedSkills = courseSkills.filter((k) => skillMatchesUser(skills, k));

  const baseline = 40;
  let chancePercent = baseline;
  if (courseSkills.length === 0) {
    chancePercent = hasProfile ? 48 : baseline;
  } else if (skills.length === 0) {
    chancePercent = baseline;
  } else {
    const ratio = matchedSkills.length / Math.max(1, courseSkills.length);
    const softHits = skills.filter((s) => {
      const low = s.toLowerCase();
      const hay = `${course.title || ''} ${course.description || ''} ${course.category || ''}`.toLowerCase();
      return low.length > 2 && hay.includes(low);
    }).length;
    const soft = Math.min(0.25, softHits * 0.05);
    chancePercent = Math.round(baseline + ratio * 50 + soft * 100);
    chancePercent = Math.min(95, Math.max(baseline, chancePercent));
  }

  const boostPercent = Math.max(0, chancePercent - baseline);

  const roleHints: PlacementChanceResult['roleHints'] = [];
  for (const row of ROLE_FOR_SKILLS) {
    const via = row.skills.filter((s) => matchedSkills.includes(s) || skillMatchesUser(skills, s));
    if (via.length >= 1 && matchedSkills.some((m) => row.skills.includes(m))) {
      roleHints.push({ role: row.role, track: row.track, viaSkills: via });
    }
  }

  return {
    chancePercent,
    boostPercent,
    matchedSkills: matchedSkills.map((k) => k.charAt(0).toUpperCase() + k.slice(1)),
    courseSkills,
    roleHints: roleHints.slice(0, 3),
    hasProfile,
    analyzedAt: Date.now(),
  };
}

export function courseTypeImage(course: {
  title?: string;
  category?: string;
  thumbnail?: string;
}): string {
  if (course.thumbnail && /^https?:\/\//.test(course.thumbnail)) return course.thumbnail;
  const title = course.title || '';
  for (const h of TITLE_IMAGE_HINTS) {
    if (h.test.test(title)) return h.url;
  }
  const cat = (course.category || '').toLowerCase();
  return CATEGORY_IMAGES[cat] || CATEGORY_IMAGES.default;
}

const ANALYZE_KEY = 'eduroute-skill-analyze-v1';

export function runDashboardSkillAnalyze(): {
  top: { title: string; boostPercent: number; chancePercent: number }[];
  skillCount: number;
  hasProfile: boolean;
} {
  const { skills, hasProfile } = getUserSkills();
  const samples = [
    { title: 'Master React & TypeScript', category: 'Development', description: 'React TypeScript frontend' },
    { title: 'Full-Stack Development with Node.js', category: 'Development', description: 'Node Express MongoDB backend' },
    { title: 'Data Science with Python', category: 'Data Science', description: 'Python pandas machine learning' },
    { title: 'DSA and Algorithms', category: 'Development', description: 'DSA algorithms data structures java' },
  ];
  const ranked = samples
    .map((c) => {
      const r = computePlacementChance(c, skills);
      return { title: c.title, boostPercent: r.boostPercent, chancePercent: r.chancePercent };
    })
    .sort((a, b) => b.boostPercent - a.boostPercent)
    .slice(0, 3);

  const payload = { top: ranked, skillCount: skills.length, hasProfile, at: Date.now() };
  try {
    sessionStorage.setItem(ANALYZE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
  return payload;
}

export function readDashboardSkillAnalyze(): ReturnType<typeof runDashboardSkillAnalyze> | null {
  try {
    const raw = sessionStorage.getItem(ANALYZE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

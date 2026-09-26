/**
 * Client-side onboarding profile for AI Buddy + Skill Profile.
 * Stored in localStorage, keyed by student email when available (no backend).
 */

import { getAuthUser } from './rbacAuth';

export type InterestTrack = 'software' | 'cybersecurity' | 'data_analyst';

export type GapAnswer = {
  questionId: string;
  question: string;
  answer: 'yes' | 'no';
  skill: string;
};

export type OnboardingProfile = {
  interests: InterestTrack[];
  gapAnswers: GapAnswer[];
  missingSkills: string[];
  completedAt: string | null;
  skipped: boolean;
  /** Email this profile belongs to (when known). */
  userEmail?: string | null;
};

const GLOBAL_KEY = 'eduroute:onboarding-v1';
const BY_EMAIL_PREFIX = 'eduroute:onboarding-v1:';

const EMPTY: OnboardingProfile = {
  interests: [],
  gapAnswers: [],
  missingSkills: [],
  completedAt: null,
  skipped: false,
  userEmail: null,
};

function emailKey(email: string) {
  return `${BY_EMAIL_PREFIX}${email.trim().toLowerCase()}`;
}

function currentEmail(): string | null {
  try {
    const u = getAuthUser();
    return u?.email?.trim().toLowerCase() || null;
  } catch {
    return null;
  }
}

export const INTEREST_OPTIONS: {
  id: InterestTrack;
  title: string;
  description: string;
  accent: string;
  icon: 'software' | 'cyber' | 'data';
}[] = [
  {
    id: 'software',
    title: 'Software Developer / Software Engineer',
    description: 'Build applications, solve problems and create solutions for real-world challenges.',
    accent: 'from-indigo-50 to-blue-50 border-indigo-100',
    icon: 'software',
  },
  {
    id: 'cybersecurity',
    title: 'Cyber Security',
    description: 'Protect systems, prevent threats and keep data safe in the digital world.',
    accent: 'from-violet-50 to-indigo-50 border-violet-100',
    icon: 'cyber',
  },
  {
    id: 'data_analyst',
    title: 'Data Analyst',
    description: 'Find insights in data, help businesses make better decisions and drive growth.',
    accent: 'from-emerald-50 to-teal-50 border-emerald-100',
    icon: 'data',
  },
];

export const GAP_QUESTIONS: Record<
  InterestTrack,
  { id: string; question: string; skill: string }[]
> = {
  software: [
    { id: 'sw1', question: 'Have you built a web or mobile app before?', skill: 'Project building' },
    {
      id: 'sw2',
      question: 'Are you comfortable with at least one programming language (JS, Python, or Java)?',
      skill: 'Programming fundamentals',
    },
    {
      id: 'sw3',
      question: 'Do you know basic data structures (arrays, linked lists, hash maps)?',
      skill: 'Data structures',
    },
    { id: 'sw4', question: 'Have you used Git and GitHub for version control?', skill: 'Git & GitHub' },
    { id: 'sw5', question: 'Can you explain how REST APIs work at a basic level?', skill: 'APIs' },
    {
      id: 'sw6',
      question: 'Have you completed any coding internship, freelance, or open-source work?',
      skill: 'Practical experience',
    },
  ],
  cybersecurity: [
    {
      id: 'cy1',
      question: 'Do you understand networking basics (IP, DNS, HTTP/HTTPS)?',
      skill: 'Networking basics',
    },
    { id: 'cy2', question: 'Have you used the Linux command line for day-to-day tasks?', skill: 'Linux' },
    { id: 'cy3', question: 'Do you know what encryption and hashing mean?', skill: 'Cryptography basics' },
    {
      id: 'cy4',
      question: 'Have you practiced any CTF challenges or security labs?',
      skill: 'Hands-on security practice',
    },
    {
      id: 'cy5',
      question: 'Are you familiar with common vulnerabilities (XSS, SQL injection, CSRF)?',
      skill: 'Web vulnerabilities',
    },
    {
      id: 'cy6',
      question: 'Have you studied OS security or configured a firewall?',
      skill: 'OS & network security',
    },
  ],
  data_analyst: [
    {
      id: 'da1',
      question: 'Are you comfortable analyzing data in Excel or Google Sheets?',
      skill: 'Spreadsheets',
    },
    { id: 'da2', question: 'Have you used SQL to query a database?', skill: 'SQL' },
    { id: 'da3', question: 'Do you know Python or R for data analysis?', skill: 'Python/R for analysis' },
    { id: 'da4', question: 'Have you created charts, reports, or dashboards?', skill: 'Visualization' },
    {
      id: 'da5',
      question: 'Do you understand basic statistics (mean, median, correlation)?',
      skill: 'Statistics',
    },
    {
      id: 'da6',
      question: 'Have you cleaned or prepared a messy real-world dataset?',
      skill: 'Data cleaning',
    },
  ],
};

/** Roadmap / path suggestions by career track (matches existing /roadmaps/:id). */
export type TrackRecommendation = {
  title: string;
  blurb: string;
  to: string;
  tag: string;
};

export const TRACK_RECOMMENDATIONS: Record<InterestTrack, TrackRecommendation[]> = {
  software: [
    {
      title: 'DSA Beginner Sheet',
      blurb: 'Arrays, linked lists, and problem-solving for SDE interviews.',
      to: '/dsa-sheet',
      tag: 'DSA',
    },
    {
      title: 'Frontend Developer',
      blurb: 'HTML, CSS, React, and modern UI architecture.',
      to: '/roadmaps/frontend',
      tag: 'Frontend',
    },
    {
      title: 'Backend Developer',
      blurb: 'Node.js, SQL/NoSQL, APIs, and system design basics.',
      to: '/roadmaps/backend',
      tag: 'Backend',
    },
    {
      title: 'Fullstack Engineer',
      blurb: 'End-to-end path from UI to infrastructure.',
      to: '/roadmaps/fullstack',
      tag: 'Fullstack',
    },
    {
      title: 'Internships',
      blurb: 'Apply with projects and real interview practice.',
      to: '/internships',
      tag: 'Career',
    },
  ],
  cybersecurity: [
    {
      title: 'Cybersecurity Roadmap',
      blurb: 'Networking, Linux, ethical hacking, and defense.',
      to: '/roadmaps/cybersecurity',
      tag: 'Security',
    },
    {
      title: 'Assessments',
      blurb: 'Check networking and web vuln fundamentals.',
      to: '/assessments',
      tag: 'Practice',
    },
    {
      title: 'Internships',
      blurb: 'Security and SOC-style opportunities.',
      to: '/internships',
      tag: 'Career',
    },
  ],
  data_analyst: [
    {
      title: 'Data Analyst Roadmap',
      blurb: 'SQL, Python, stats, and visualization.',
      to: '/roadmaps/data-analyst',
      tag: 'Data',
    },
    {
      title: 'Assessments',
      blurb: 'Practice SQL and analysis quizzes.',
      to: '/assessments',
      tag: 'Practice',
    },
    {
      title: 'Internships',
      blurb: 'Analyst and BI intern roles.',
      to: '/internships',
      tag: 'Career',
    },
  ],
};

export type SkillPath = {
  courseTitle: string;
  to: string;
  priority: number;
};

export const SKILL_TO_PATH: Record<string, SkillPath> = {
  'Programming fundamentals': { courseTitle: 'Fullstack fundamentals', to: '/roadmaps/fullstack', priority: 1 },
  'Data structures': { courseTitle: 'DSA Beginner Sheet', to: '/dsa-sheet', priority: 2 },
  'Git & GitHub': { courseTitle: 'Backend Developer roadmap', to: '/roadmaps/backend', priority: 3 },
  APIs: { courseTitle: 'Backend & API path', to: '/roadmaps/backend', priority: 4 },
  'Project building': { courseTitle: 'Frontend & project path', to: '/roadmaps/frontend', priority: 5 },
  'Practical experience': { courseTitle: 'Internships board', to: '/internships', priority: 6 },
  'Networking basics': { courseTitle: 'Cybersecurity roadmap', to: '/roadmaps/cybersecurity', priority: 1 },
  Linux: { courseTitle: 'Cybersecurity roadmap', to: '/roadmaps/cybersecurity', priority: 2 },
  'Cryptography basics': { courseTitle: 'Cybersecurity roadmap', to: '/roadmaps/cybersecurity', priority: 3 },
  'Web vulnerabilities': { courseTitle: 'Cybersecurity roadmap', to: '/roadmaps/cybersecurity', priority: 4 },
  'OS & network security': { courseTitle: 'Cybersecurity roadmap', to: '/roadmaps/cybersecurity', priority: 5 },
  'Hands-on security practice': { courseTitle: 'Assessments & labs', to: '/assessments', priority: 6 },
  Spreadsheets: { courseTitle: 'Data Analyst roadmap', to: '/roadmaps/data-analyst', priority: 1 },
  SQL: { courseTitle: 'Data Analyst roadmap', to: '/roadmaps/data-analyst', priority: 2 },
  'Python/R for analysis': { courseTitle: 'Data Analyst roadmap', to: '/roadmaps/data-analyst', priority: 3 },
  Statistics: { courseTitle: 'Data Analyst roadmap', to: '/roadmaps/data-analyst', priority: 4 },
  Visualization: { courseTitle: 'Data Analyst roadmap', to: '/roadmaps/data-analyst', priority: 5 },
  'Data cleaning': { courseTitle: 'Data Analyst roadmap', to: '/roadmaps/data-analyst', priority: 6 },
};

export type GapAction = {
  skill: string;
  courseTitle: string;
  to: string;
  priority: number;
};

export type NextStepPlan =
  | { kind: 'quiz' }
  | {
      kind: 'gaps';
      gapCount: number;
      skills: string[];
      primary: GapAction;
      alternatives: GapAction[];
      trackLabel: string;
    }
  | { kind: 'internships'; trackLabel: string };

export function getNextStepPlan(profile?: OnboardingProfile): NextStepPlan {
  const p = profile ?? readOnboarding();
  const track = p.interests?.[0];
  const trackLabel = track ? interestLabel(track) : 'your track';

  if (!p.completedAt) {
    return { kind: 'quiz' };
  }

  const missing = [...(p.missingSkills || [])];
  if (missing.length === 0 && p.gapAnswers?.length) {
    p.gapAnswers.forEach((a) => {
      if (a.answer === 'no' && a.skill && !missing.includes(a.skill)) {
        missing.push(a.skill);
      }
    });
  }

  if (missing.length === 0) {
    return { kind: 'internships', trackLabel };
  }

  const actions: GapAction[] = missing.map((skill) => {
    const mapped = SKILL_TO_PATH[skill];
    if (mapped) {
      return {
        skill,
        courseTitle: mapped.courseTitle,
        to: mapped.to,
        priority: mapped.priority,
      };
    }
    const fallback =
      track && TRACK_RECOMMENDATIONS[track]?.[0]
        ? TRACK_RECOMMENDATIONS[track][0]
        : { title: 'Browse roadmaps', to: '/roadmaps' };
    return {
      skill,
      courseTitle: fallback.title,
      to: fallback.to,
      priority: 99,
    };
  });

  actions.sort((a, b) => a.priority - b.priority || a.skill.localeCompare(b.skill));

  const primary = actions[0];
  const seenPaths = new Set<string>([primary.to]);
  const alternatives: GapAction[] = [];
  for (const a of actions.slice(1)) {
    if (seenPaths.has(a.to)) continue;
    seenPaths.add(a.to);
    alternatives.push(a);
    if (alternatives.length >= 3) break;
  }

  return {
    kind: 'gaps',
    gapCount: missing.length,
    skills: missing,
    primary,
    alternatives,
    trackLabel,
  };
}

export function interestLabel(id: InterestTrack): string {
  return INTEREST_OPTIONS.find((o) => o.id === id)?.title || id;
}

export function readOnboarding(): OnboardingProfile {
  try {
    if (typeof window === 'undefined') return { ...EMPTY };
    const email = currentEmail();
    if (email) {
      const byEmail = localStorage.getItem(emailKey(email));
      if (byEmail) {
        return { ...EMPTY, ...JSON.parse(byEmail), userEmail: email } as OnboardingProfile;
      }
    }
    const raw = localStorage.getItem(GLOBAL_KEY);
    if (!raw) return { ...EMPTY };
    const parsed = { ...EMPTY, ...JSON.parse(raw) } as OnboardingProfile;
    if (email && parsed.completedAt) {
      writeOnboarding({ ...parsed, userEmail: email });
      return { ...parsed, userEmail: email };
    }
    return parsed;
  } catch {
    return { ...EMPTY };
  }
}

export function writeOnboarding(profile: OnboardingProfile) {
  try {
    if (typeof window === 'undefined') return;
    const email = currentEmail() || profile.userEmail || null;
    const payload: OnboardingProfile = {
      ...profile,
      userEmail: email,
    };
    const json = JSON.stringify(payload);
    localStorage.setItem(GLOBAL_KEY, json);
    try {
      window.dispatchEvent(new CustomEvent('eduroute:onboarding-updated'));
    } catch {
      /* ignore */
    }
    if (email) {
      localStorage.setItem(emailKey(email), json);
    }
  } catch {
    // ignore private mode
  }
}

export function saveInterests(interests: InterestTrack[]) {
  const current = readOnboarding();
  writeOnboarding({ ...current, interests, skipped: false });
}

export function saveGapResults(gapAnswers: GapAnswer[], missingSkills: string[]) {
  const current = readOnboarding();
  writeOnboarding({
    ...current,
    gapAnswers,
    missingSkills,
    completedAt: new Date().toISOString(),
    skipped: false,
  });
}

export function markOnboardingSkipped() {
  const current = readOnboarding();
  writeOnboarding({
    ...current,
    completedAt: new Date().toISOString(),
    skipped: true,
  });
}

export function isOnboardingDone(): boolean {
  return Boolean(readOnboarding().completedAt);
}

/** Text injected into Buddy AI context for personalized guidance. */
export function buildBuddyOnboardingContext(): {
  interests: string[];
  missingSkills: string[];
  summary: string;
} {
  const profile = readOnboarding();
  const interests = profile.interests.map(interestLabel);
  const missingSkills = profile.missingSkills || [];

  if (!profile.completedAt) {
    return { interests: [], missingSkills: [], summary: '' };
  }

  if (profile.skipped && interests.length === 0) {
    return {
      interests: [],
      missingSkills: [],
      summary: 'Student skipped interest and skill-gap onboarding.',
    };
  }

  const yesSkills = profile.gapAnswers.filter((a) => a.answer === 'yes').map((a) => a.skill);
  const summary = [
    interests.length ? `Career interests: ${interests.join(', ')}.` : '',
    yesSkills.length ? `Strengths: ${yesSkills.join(', ')}.` : '',
    missingSkills.length
      ? `Skill gaps to close: ${missingSkills.join(', ')}.`
      : 'No major skill gaps marked from the quiz.',
  ]
    .filter(Boolean)
    .join(' ');

  return { interests, missingSkills, summary };
}

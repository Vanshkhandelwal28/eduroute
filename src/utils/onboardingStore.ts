/**
 * Client-side onboarding profile for AI Buddy + Skill Profile.
 * localStorage + Neon (Render /api/user-data key=onboarding).
 */

import { getAuthUser } from './rbacAuth';
import { pushUserData, pullUserData } from './userDataStore';

export type InterestTrack = 'software' | 'cybersecurity' | 'data_analyst' | 'custom';

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
  userEmail?: string | null;
  customRole?: string | null;
  customSkills?: string[];
  cvSkills?: string[];
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
  customRole: null,
  customSkills: [],
  cvSkills: [],
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
  {
    id: 'custom',
    title: 'Custom role',
    description: 'Enter any target role (e.g. SDE 2, DevOps) and your skills or CV.',
    accent: 'from-amber-50 to-orange-50 border-amber-100',
    icon: 'software',
  },
];

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
    return { ...EMPTY, ...JSON.parse(raw) } as OnboardingProfile;
  } catch {
    return { ...EMPTY };
  }
}

export function writeOnboarding(profile: OnboardingProfile) {
  try {
    if (typeof window === 'undefined') return;
    const email = currentEmail() || profile.userEmail || null;
    const payload: OnboardingProfile = { ...profile, userEmail: email };
    const json = JSON.stringify(payload);
    localStorage.setItem(GLOBAL_KEY, json);
    if (email) localStorage.setItem(emailKey(email), json);
    void pushUserData('onboarding', payload);
    try {
      window.dispatchEvent(new Event('eduroute:onboarding-updated'));
    } catch {
      /* ignore */
    }
  } catch {
    /* ignore */
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
  const summary = [
    interests.length ? `Career interests: ${interests.join(', ')}.` : '',
    profile.customRole ? `Custom target role: ${profile.customRole}.` : '',
    missingSkills.length
      ? `Skill gaps to close: ${missingSkills.join(', ')}.`
      : 'No major skill gaps marked from the quiz.',
  ]
    .filter(Boolean)
    .join(' ');
  return { interests, missingSkills, summary };
}

export async function syncOnboardingFromServer(): Promise<void> {
  const remote = await pullUserData<OnboardingProfile>('onboarding');
  if (!remote || typeof remote !== 'object') return;
  writeOnboarding({ ...readOnboarding(), ...remote });
}

/* Re-export static data used by UI (keep compatibility) */
export const GAP_QUESTIONS: Record<
  InterestTrack,
  { id: string; question: string; skill: string }[]
> = {
  software: [
    { id: 'sw1', question: 'Have you built a web or mobile app before?', skill: 'Project building' },
    { id: 'sw2', question: 'Are you comfortable with at least one programming language?', skill: 'Programming fundamentals' },
    { id: 'sw3', question: 'Do you know basic data structures?', skill: 'Data structures' },
    { id: 'sw4', question: 'Have you used Git and GitHub?', skill: 'Git & GitHub' },
    { id: 'sw5', question: 'Can you explain REST APIs at a basic level?', skill: 'APIs' },
    { id: 'sw6', question: 'Any internship/freelance/open-source?', skill: 'Practical experience' },
  ],
  cybersecurity: [
    { id: 'cy1', question: 'Networking basics (IP, DNS, HTTP)?', skill: 'Networking basics' },
    { id: 'cy2', question: 'Linux command line day-to-day?', skill: 'Linux' },
    { id: 'cy3', question: 'Encryption and hashing?', skill: 'Cryptography basics' },
    { id: 'cy4', question: 'CTF or security labs?', skill: 'Hands-on security practice' },
    { id: 'cy5', question: 'XSS, SQLi, CSRF?', skill: 'Web vulnerabilities' },
    { id: 'cy6', question: 'OS security or firewall?', skill: 'OS & network security' },
  ],
  data_analyst: [
    { id: 'da1', question: 'Excel or Sheets analysis?', skill: 'Spreadsheets' },
    { id: 'da2', question: 'SQL queries?', skill: 'SQL' },
    { id: 'da3', question: 'Python or R for analysis?', skill: 'Python/R for analysis' },
    { id: 'da4', question: 'Charts/reports/dashboards?', skill: 'Visualization' },
    { id: 'da5', question: 'Basic statistics?', skill: 'Statistics' },
    { id: 'da6', question: 'Cleaned a messy dataset?', skill: 'Data cleaning' },
  ],
  custom: [],
};

export type TrackRecommendation = { title: string; blurb: string; to: string; tag: string };
export const TRACK_RECOMMENDATIONS: Record<InterestTrack, TrackRecommendation[]> = {
  software: [
    { title: 'DSA Beginner Sheet', blurb: 'Arrays, lists, interviews.', to: '/dsa-sheet', tag: 'DSA' },
    { title: 'Frontend Developer', blurb: 'HTML, CSS, React.', to: '/roadmaps/frontend', tag: 'Frontend' },
    { title: 'Backend Developer', blurb: 'APIs and databases.', to: '/roadmaps/backend', tag: 'Backend' },
    { title: 'Internships', blurb: 'Apply with projects.', to: '/internships', tag: 'Career' },
  ],
  cybersecurity: [
    { title: 'Cybersecurity Roadmap', blurb: 'Network to defense.', to: '/roadmaps/cybersecurity', tag: 'Security' },
    { title: 'Assessments', blurb: 'Check fundamentals.', to: '/assessments', tag: 'Practice' },
  ],
  data_analyst: [
    { title: 'Data Analyst Roadmap', blurb: 'SQL, Python, viz.', to: '/roadmaps/data-analyst', tag: 'Data' },
    { title: 'Assessments', blurb: 'SQL quizzes.', to: '/assessments', tag: 'Practice' },
  ],
  custom: [
    { title: 'AI Course Designer', blurb: 'Course for your role.', to: '/ai-course-designer', tag: 'Custom' },
  ],
};

export type SkillPath = { courseTitle: string; to: string; priority: number };
export const SKILL_TO_PATH: Record<string, SkillPath> = {
  'Programming fundamentals': { courseTitle: 'Fullstack fundamentals', to: '/roadmaps/fullstack', priority: 1 },
  'Data structures': { courseTitle: 'DSA Beginner Sheet', to: '/dsa-sheet', priority: 2 },
  'Git & GitHub': { courseTitle: 'Backend Developer roadmap', to: '/roadmaps/backend', priority: 3 },
  APIs: { courseTitle: 'Backend & API path', to: '/roadmaps/backend', priority: 4 },
  SQL: { courseTitle: 'Data Analyst roadmap', to: '/roadmaps/data-analyst', priority: 2 },
};

export type GapAction = { skill: string; courseTitle: string; to: string; priority: number };
export type NextStepPlan =
  | { kind: 'quiz' }
  | { kind: 'gaps'; gapCount: number; skills: string[]; primary: GapAction; alternatives: GapAction[]; trackLabel: string }
  | { kind: 'internships'; trackLabel: string };

export function getNextStepPlan(profile?: OnboardingProfile): NextStepPlan {
  const p = profile ?? readOnboarding();
  const track = p.interests?.[0];
  const trackLabel = track ? interestLabel(track) : 'your track';
  if (!p.completedAt) return { kind: 'quiz' };
  const missing = [...(p.missingSkills || [])];
  if (missing.length === 0 && p.gapAnswers?.length) {
    p.gapAnswers.forEach((a) => {
      if (a.answer === 'no' && a.skill && !missing.includes(a.skill)) missing.push(a.skill);
    });
  }
  if (missing.length === 0) return { kind: 'internships', trackLabel };
  const actions: GapAction[] = missing.map((skill) => {
    const mapped = SKILL_TO_PATH[skill];
    if (mapped) return { skill, courseTitle: mapped.courseTitle, to: mapped.to, priority: mapped.priority };
    return { skill, courseTitle: 'Browse roadmaps', to: '/roadmaps', priority: 99 };
  });
  actions.sort((a, b) => a.priority - b.priority);
  const primary = actions[0];
  const alternatives = actions.slice(1, 4);
  return { kind: 'gaps', gapCount: missing.length, skills: missing, primary, alternatives, trackLabel };
}

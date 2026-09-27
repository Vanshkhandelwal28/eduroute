/**
 * Lean payload stored in profiles.public_data for LeetCode-style public pages.
 * Keep small — only what recruiters need (500–600 students free tier).
 */
export type PublicCert = { title: string; issuer?: string; date?: string };
export type PublicInternship = {
  role: string;
  company: string;
  status?: string;
  duration?: string;
};
export type PublicAchievement = { title: string; detail?: string; icon?: string };

export type PublicProfilePayload = {
  skills: string[];
  skillGaps?: string[];
  certs: PublicCert[];
  internships: PublicInternship[];
  achievements: PublicAchievement[];
  xp?: number;
  solved?: number;
  pathSummary?: { title: string; status?: string }[];
};

export function emptyPublicPayload(): PublicProfilePayload {
  return {
    skills: [],
    skillGaps: [],
    certs: [],
    internships: [],
    achievements: [],
    xp: 0,
    solved: 0,
    pathSummary: [],
  };
}

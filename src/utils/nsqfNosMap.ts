/**
 * Lightweight NSQF / NOS-style mapping for SIH26134.
 * Local catalog only — no external API. Used as small badges on existing UIs.
 */

export type NsqfNosEntry = {
  /** NSQF level 1–10 */
  nsqf: number;
  /** Short NOS / occupation-style code (demo catalog, not official bulk NOS) */
  nos: string;
  label?: string;
};

/** Normalized skill/role keyword → NSQF + NOS code */
const MAP: Record<string, NsqfNosEntry> = {
  // Software / web
  react: { nsqf: 5, nos: 'SSC/Q0503', label: 'Frontend' },
  typescript: { nsqf: 5, nos: 'SSC/Q0501', label: 'Web dev' },
  javascript: { nsqf: 4, nos: 'SSC/Q0501', label: 'Web dev' },
  html: { nsqf: 3, nos: 'SSC/Q0501' },
  css: { nsqf: 3, nos: 'SSC/Q0501' },
  node: { nsqf: 5, nos: 'SSC/Q0509', label: 'Backend' },
  'node.js': { nsqf: 5, nos: 'SSC/Q0509' },
  express: { nsqf: 5, nos: 'SSC/Q0509' },
  java: { nsqf: 5, nos: 'SSC/Q0508' },
  python: { nsqf: 5, nos: 'SSC/Q0901' },
  sql: { nsqf: 4, nos: 'SSC/Q0901', label: 'Data' },
  mongodb: { nsqf: 5, nos: 'SSC/Q0509' },
  docker: { nsqf: 6, nos: 'SSC/Q0903', label: 'Cloud' },
  azure: { nsqf: 6, nos: 'SSC/Q0903' },
  gcp: { nsqf: 6, nos: 'SSC/Q0903' },
  aws: { nsqf: 6, nos: 'SSC/Q0903' },
  devops: { nsqf: 6, nos: 'SSC/Q0903' },
  // Data
  excel: { nsqf: 3, nos: 'SSC/Q2101' },
  pandas: { nsqf: 5, nos: 'SSC/Q0901' },
  'power bi': { nsqf: 5, nos: 'SSC/Q2101' },
  tableau: { nsqf: 5, nos: 'SSC/Q2101' },
  'machine learning': { nsqf: 6, nos: 'SSC/Q0902', label: 'AI/ML' },
  ml: { nsqf: 6, nos: 'SSC/Q0902' },
  ai: { nsqf: 6, nos: 'SSC/Q0902' },
  // Cyber
  'network security': { nsqf: 5, nos: 'SSC/Q0904', label: 'Cyber' },
  cybersecurity: { nsqf: 5, nos: 'SSC/Q0904' },
  siem: { nsqf: 6, nos: 'SSC/Q0904' },
  'ethical hacking': { nsqf: 6, nos: 'SSC/Q0904' },
  // Manufacturing / EV
  cnc: { nsqf: 4, nos: 'CSC/Q0110', label: 'Manufacturing' },
  'quality inspection': { nsqf: 4, nos: 'CSC/Q0101' },
  battery: { nsqf: 4, nos: 'ELE/Q5801', label: 'EV' },
  'battery systems': { nsqf: 4, nos: 'ELE/Q5801' },
  diagnostics: { nsqf: 4, nos: 'ELE/Q5801' },
  safety: { nsqf: 3, nos: 'ELE/Q5801' },
  // BFSI / office
  banking: { nsqf: 4, nos: 'BSC/Q0101', label: 'BFSI' },
  'ms office': { nsqf: 3, nos: 'MEP/Q0201' },
  communication: { nsqf: 3, nos: 'MEP/Q0204' },
  // Generic roles (title keywords)
  'frontend developer': { nsqf: 5, nos: 'SSC/Q0503' },
  'backend developer': { nsqf: 5, nos: 'SSC/Q0509' },
  'full stack': { nsqf: 5, nos: 'SSC/Q0503' },
  'data analyst': { nsqf: 5, nos: 'SSC/Q0901' },
  'software engineer': { nsqf: 5, nos: 'SSC/Q0501' },
};

function norm(s: string) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/** Lookup NSQF/NOS for a skill or role title. */
export function lookupNsqfNos(skillOrRole: string): NsqfNosEntry | null {
  const key = norm(skillOrRole);
  if (!key) return null;
  if (MAP[key]) return MAP[key];
  // substring / contains match on map keys
  for (const [k, v] of Object.entries(MAP)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return null;
}

/** Short badge text e.g. "NSQF L5 · SSC/Q0503" */
export function nsqfNosBadgeText(skillOrRole: string): string | null {
  const e = lookupNsqfNos(skillOrRole);
  if (!e) return null;
  return `NSQF L${e.nsqf} · ${e.nos}`;
}

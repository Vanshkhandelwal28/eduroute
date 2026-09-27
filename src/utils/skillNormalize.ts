/**
 * Canonical skill names for market matching (Python 3 / python → Python, React.js → React).
 */

const ALIASES: Record<string, string> = {
  python: 'Python',
  'python3': 'Python',
  'python 3': 'Python',
  py: 'Python',
  react: 'React',
  'react.js': 'React',
  reactjs: 'React',
  'react js': 'React',
  'next.js': 'Next.js',
  nextjs: 'Next.js',
  'node.js': 'Node.js',
  nodejs: 'Node.js',
  node: 'Node.js',
  typescript: 'TypeScript',
  ts: 'TypeScript',
  javascript: 'JavaScript',
  js: 'JavaScript',
  'java script': 'JavaScript',
  java: 'Java',
  'spring boot': 'Spring Boot',
  springboot: 'Spring Boot',
  spring: 'Spring Boot',
  sql: 'SQL',
  mysql: 'MySQL',
  postgresql: 'PostgreSQL',
  postgres: 'PostgreSQL',
  mongodb: 'MongoDB',
  mongo: 'MongoDB',
  aws: 'AWS',
  azure: 'Azure',
  gcp: 'GCP',
  'google cloud': 'GCP',
  docker: 'Docker',
  kubernetes: 'Kubernetes',
  k8s: 'Kubernetes',
  git: 'Git',
  github: 'Git',
  'ci/cd': 'CI/CD',
  cicd: 'CI/CD',
  devops: 'DevOps',
  'system design': 'System Design',
  'machine learning': 'Machine Learning',
  ml: 'Machine Learning',
  'deep learning': 'Deep Learning',
  'data analysis': 'Data Analysis',
  'data analytics': 'Data Analysis',
  pandas: 'Pandas',
  numpy: 'NumPy',
  tensorflow: 'TensorFlow',
  pytorch: 'PyTorch',
  flutter: 'Flutter',
  'react native': 'React Native',
  cybersecurity: 'Cybersecurity',
  'cyber security': 'Cybersecurity',
  linux: 'Linux',
  html: 'HTML',
  css: 'CSS',
  tailwind: 'Tailwind CSS',
  'tailwind css': 'Tailwind CSS',
  redux: 'Redux',
  graphql: 'GraphQL',
  rest: 'REST APIs',
  'rest api': 'REST APIs',
  'rest apis': 'REST APIs',
  api: 'REST APIs',
  apis: 'REST APIs',
};

export function normalizeSkillName(raw: string): string {
  const key = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[_/]+/g, ' ')
    .replace(/\s+/g, ' ');
  if (!key) return '';
  if (ALIASES[key]) return ALIASES[key];
  // Title-case unknown tokens
  return key
    .split(' ')
    .map((w) => (w.length <= 2 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

export function normalizeSkillList(list: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of list || []) {
    const n = normalizeSkillName(item);
    if (!n) continue;
    const k = n.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(n);
  }
  return out;
}

export function skillsMatch(a: string, b: string): boolean {
  return normalizeSkillName(a).toLowerCase() === normalizeSkillName(b).toLowerCase();
}

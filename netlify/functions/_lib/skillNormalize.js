const ALIASES = {
  python: 'Python',
  python3: 'Python',
  'python 3': 'Python',
  react: 'React',
  'react.js': 'React',
  reactjs: 'React',
  'next.js': 'Next.js',
  nextjs: 'Next.js',
  'node.js': 'Node.js',
  nodejs: 'Node.js',
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  java: 'Java',
  'spring boot': 'Spring Boot',
  sql: 'SQL',
  aws: 'AWS',
  docker: 'Docker',
  kubernetes: 'Kubernetes',
  k8s: 'Kubernetes',
  devops: 'DevOps',
  'machine learning': 'Machine Learning',
  ml: 'Machine Learning',
  cybersecurity: 'Cybersecurity',
  'rest api': 'REST APIs',
  apis: 'REST APIs',
  git: 'Git',
  linux: 'Linux',
  azure: 'Azure',
  gcp: 'GCP',
  mongodb: 'MongoDB',
  mysql: 'MySQL',
  postgresql: 'PostgreSQL',
  postgres: 'PostgreSQL',
  django: 'Django',
  flask: 'Flask',
  angular: 'Angular',
  vue: 'Vue',
  'vue.js': 'Vue',
  flutter: 'Flutter',
  'react native': 'React Native',
  microservices: 'Microservices',
  'ci/cd': 'CI/CD',
  cicd: 'CI/CD',
  pytorch: 'PyTorch',
  tensorflow: 'TensorFlow',
  excel: 'Excel',
  pandas: 'Pandas',
  networking: 'Networking',
  typescript: 'TypeScript',
};

/** Ordered longest-first so multi-word skills match before short ones */
const DETECT_PHRASES = [
  'spring boot',
  'machine learning',
  'react native',
  'next.js',
  'node.js',
  'rest api',
  'rest apis',
  'system design',
  'data analysis',
  'ci/cd',
  'type script',
  'typescript',
  'javascript',
  'kubernetes',
  'microservices',
  'cybersecurity',
  'postgresql',
  'mongodb',
  'tensorflow',
  'pytorch',
  'react.js',
  'vue.js',
  'python',
  'react',
  'java',
  'sql',
  'aws',
  'azure',
  'gcp',
  'docker',
  'devops',
  'linux',
  'git',
  'django',
  'flask',
  'angular',
  'vue',
  'flutter',
  'pandas',
  'excel',
  'mysql',
  'nodejs',
  'reactjs',
  'k8s',
  'ml',
];

function normalizeSkillName(raw) {
  const key = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[_/]+/g, ' ')
    .replace(/\s+/g, ' ');
  if (!key) return '';
  if (ALIASES[key]) return ALIASES[key];
  return key
    .split(' ')
    .map(function (w) {
      return w.length <= 2 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');
}

function normalizeSkillList(list) {
  const out = [];
  const seen = {};
  (list || []).forEach(function (item) {
    const n = normalizeSkillName(item);
    if (!n) return;
    const k = n.toLowerCase();
    if (seen[k]) return;
    seen[k] = true;
    out.push(n);
  });
  return out;
}

/** Extract known skills from free text (title + description). */
function extractSkillsFromText(text) {
  const lower = String(text || '').toLowerCase();
  const found = [];
  const seen = {};
  for (let i = 0; i < DETECT_PHRASES.length; i++) {
    const phrase = DETECT_PHRASES[i];
    if (lower.indexOf(phrase) === -1) continue;
    const n = normalizeSkillName(phrase);
    if (!n) continue;
    const k = n.toLowerCase();
    if (seen[k]) continue;
    seen[k] = true;
    found.push(n);
  }
  return found;
}

module.exports = {
  normalizeSkillName: normalizeSkillName,
  normalizeSkillList: normalizeSkillList,
  extractSkillsFromText: extractSkillsFromText,
};

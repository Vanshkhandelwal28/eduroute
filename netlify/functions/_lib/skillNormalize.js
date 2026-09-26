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
};

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

module.exports = { normalizeSkillName: normalizeSkillName, normalizeSkillList: normalizeSkillList };

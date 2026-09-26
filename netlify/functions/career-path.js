/**
 * Custom career path: Gemini first, then Groq fallback.
 * 10–15 modules, realistic hours/days for role seniority.
 */
function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

function env(name) {
  try {
    return (typeof process !== 'undefined' && process.env && process.env[name]) || '';
  } catch {
    return '';
  }
}

function roleSeniority(role) {
  const r = String(role || '').toLowerCase();
  if (/\b(staff|principal|architect|lead|manager)\b/.test(r)) return 'lead';
  if (/\b(senior|sr\.?|sde\s*[23]|l[45]|mid-?senior)\b/.test(r)) return 'senior';
  if (/\b(junior|intern|fresher|entry|sde\s*1|l[123])\b/.test(r)) return 'junior';
  return 'mid';
}

async function callGemini({ apiKey, model, messages, temperature }) {
  const m = model || 'gemini-1.5-flash';
  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/' +
    m +
    ':generateContent?key=' +
    encodeURIComponent(apiKey);
  const contents = (messages || []).map(function (msg) {
    return {
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(msg.content || '') }],
    };
  });
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: contents,
      generationConfig: { temperature: temperature == null ? 0.35 : temperature },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data && data.error && data.error.message) || 'Gemini failed');
  const text =
    data &&
    data.candidates &&
    data.candidates[0] &&
    data.candidates[0].content &&
    data.candidates[0].content.parts &&
    data.candidates[0].content.parts
      .map(function (p) {
        return p.text || '';
      })
      .join('');
  if (!text) throw new Error('Empty Gemini response');
  return text;
}

async function callGroq({ apiKey, model, messages, temperature }) {
  const models = [model, 'llama-3.1-8b-instant', 'llama-3.3-70b-versatile'].filter(Boolean);
  var lastErr = 'Groq failed';
  for (var i = 0; i < models.length; i++) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + apiKey,
        },
        body: JSON.stringify({
          model: models[i],
          messages: messages,
          temperature: temperature == null ? 0.35 : temperature,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        lastErr = (data && data.error && data.error.message) || 'Groq HTTP ' + res.status;
        continue;
      }
      const text =
        data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      if (text) return text;
    } catch (e) {
      lastErr = e.message || String(e);
    }
  }
  throw new Error(lastErr);
}

function buildPrompt({ role, skills, cvSkills, cvText }) {
  const skillList = (skills || []).join(', ') || 'not specified';
  const cvList = (cvSkills || []).join(', ') || 'none extracted';
  const cvSnippet = (cvText || '').slice(0, 3500);
  const level = roleSeniority(role);
  return (
    'You are a career coach for EDUROUTE designing a REALISTIC multi-week learning path.\n' +
    'Target role: "' +
    role +
    '" (seniority band: ' +
    level +
    ').\n' +
    'Skills the student ALREADY has (client will auto-tick these modules): ' +
    skillList +
    '.\n' +
    'Skills from CV: ' +
    cvList +
    '.\n' +
    (cvSnippet ? 'CV excerpt:\n' + cvSnippet + '\n' : '') +
    'Focus on what companies hire for this role.\n' +
    'Module titles MUST name concrete skills (e.g. Golang APIs, PostgreSQL, System design) — never Role Core Skills.\n' +
    'CRITICAL timeline rules:\n' +
    '- hours = focused study hours; days ~= hours / 2.5.\n' +
    '- Light (Git): 8–12h / 4–6d. Medium (REST): 25–40h / 10–16d. Heavy (SysDesign/DB): 40–80h / 15–30d.\n' +
    'PATH STRUCTURE:\n' +
    '- Junior/SDE1: 10–12 modules, ~35–50 days total.\n' +
    '- Mid/SDE2: 12–15 modules, ~45–65 days total.\n' +
    '- Senior: 12–15 modules, ~50–75 days total.\n' +
    '- NEVER only 3–4 nodes. Include: language, DSA, OOP, frontend, backend/JWT/REST, DB, testing, Git, DevOps, system design, projects, interviews.\n' +
    'Return ONLY valid JSON:\n' +
    '{"nodes":[{"id":"slug","title":"Module","short":"Short","hours":40,"days":16,"skills":["a","b"],"resources":[{"label":"...","kind":"Video","mins":45}]]}\n' +
    '10–15 nodes ordered beginner→job-ready, no markdown.'
  );
}

function normalizeNode(t, i) {
  var hours = Math.max(8, Number(t.hours) || 20);
  var days = Number(t.days);
  if (!days || days < 3) days = Math.min(90, Math.max(5, Math.round(hours / 2.5)));
  var title = String(t.title || 'Step ' + (i + 1));
  if (/database|system design|interview|distributed|kubernetes|platform/i.test(title) && hours < 30) {
    hours = Math.max(hours, 40);
    days = Math.max(days, 15);
  }
  return {
    id: String(t.id || 'step-' + (i + 1)).replace(/[^a-z0-9-_]/gi, '-').toLowerCase(),
    title: title,
    short: String(t.short || title.split(' ')[0] || 'S' + (i + 1)).slice(0, 18),
    hours: hours,
    days: days,
    skills: Array.isArray(t.skills) ? t.skills.map(String).slice(0, 8) : [],
    resources: Array.isArray(t.resources)
      ? t.resources.slice(0, 10).map(function (r) {
          return {
            label: String(r.label || r.title || 'Resource'),
            kind: String(r.kind || 'Video'),
            mins: Math.max(20, Number(r.mins) || 45),
          };
        })
      : [{ label: 'Core lessons', kind: 'Video', mins: 60 }],
  };
}

function tryParseNodes(text) {
  if (!text || typeof text !== 'string') return null;
  try {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    const arr = Array.isArray(parsed) ? parsed : parsed.nodes;
    if (!Array.isArray(arr) || arr.length < 5) return null;
    return arr.slice(0, 15).map(normalizeNode);
  } catch (e) {
    return null;
  }
}

function fallbackNodes(role, skills) {
  var level = roleSeniority(role);
  var heavy = level === 'senior' || level === 'lead';
  var junior = level === 'junior';
  var s = (skills || []).map(function (x) { return String(x).toLowerCase(); });
  var has = function (k) {
    return s.some(function (x) { return x.indexOf(k) !== -1; });
  };
  var langTitle = has('golang') || has('go') ? 'Golang language depth' : has('python') ? 'Python language depth' : has('java') ? 'Java language depth' : 'JavaScript / TypeScript language depth';
  var langSkills = has('golang') || has('go') ? ['Golang', 'Concurrency'] : has('python') ? ['Python', 'OOP'] : ['JavaScript', 'TypeScript'];
  var nodes = [
    { id: 'language-fundamentals', title: langTitle, short: 'Language', hours: junior ? 25 : 20, days: junior ? 10 : 8, skills: langSkills, resources: [{ label: 'Language core + patterns', kind: 'Video', mins: 120 }, { label: 'Hands-on exercises', kind: 'Exercise', mins: 180 }] },
    { id: 'dsa-core', title: 'DSA: arrays, trees, graphs & DP', short: 'DSA', hours: heavy ? 45 : 35, days: heavy ? 18 : 14, skills: ['DSA', 'Algorithms', 'Problem solving'], resources: [{ label: 'DSA patterns course', kind: 'Video', mins: 180 }, { label: '50 practice problems', kind: 'Exercise', mins: 400 }] },
    { id: 'oop-design', title: 'OOP & clean code design', short: 'OOP', hours: 18, days: 7, skills: ['OOP', 'Design patterns'], resources: [{ label: 'SOLID & patterns', kind: 'Video', mins: 90 }] },
    { id: 'frontend-basics', title: 'Frontend essentials (HTML, CSS, JS)', short: 'Frontend', hours: 22, days: 9, skills: ['HTML', 'CSS', 'JavaScript', 'Frontend'], resources: [{ label: 'Modern frontend crash', kind: 'Video', mins: 100 }, { label: 'Build a responsive UI', kind: 'Project', mins: 180 }] },
    { id: 'backend-apis', title: has('golang') || has('go') ? 'Golang REST APIs, JWT & services' : 'Backend APIs, JWT & auth', short: 'Backend', hours: heavy ? 40 : 30, days: heavy ? 16 : 12, skills: has('golang') || has('go') ? ['Golang', 'REST API', 'JWT', 'Backend'] : ['REST API', 'JWT', 'Backend', 'API'], resources: [{ label: 'API design & JWT auth', kind: 'Video', mins: 100 }, { label: 'Build authenticated API', kind: 'Project', mins: 240 }] },
    { id: 'databases', title: 'SQL databases & query performance', short: 'Databases', hours: heavy ? 50 : 38, days: heavy ? 20 : 15, skills: ['SQL', 'PostgreSQL', 'Indexing'], resources: [{ label: 'Schema design & indexing', kind: 'Video', mins: 100 }, { label: 'Tune real queries', kind: 'Project', mins: 240 }] },
    { id: 'testing', title: 'Unit, integration & API testing', short: 'Testing', hours: 18, days: 7, skills: ['Testing', 'Jest', 'QA'], resources: [{ label: 'Testing pyramid in practice', kind: 'Video', mins: 80 }] },
    { id: 'git-collab', title: 'Git, code review & collaboration', short: 'Git', hours: 12, days: 5, skills: ['Git', 'Code review'], resources: [{ label: 'Branching & PR workflows', kind: 'Video', mins: 60 }] },
    { id: 'devops-basics', title: 'Docker, CI/CD & basic cloud', short: 'DevOps', hours: heavy ? 35 : 25, days: heavy ? 14 : 10, skills: ['Docker', 'CI/CD', 'AWS'], resources: [{ label: 'Dockerize a service', kind: 'Video', mins: 75 }, { label: 'Pipeline + deploy project', kind: 'Project', mins: 200 }] },
    { id: 'system-design', title: 'System design fundamentals', short: 'SysDesign', hours: heavy ? 55 : 35, days: heavy ? 22 : 14, skills: ['System Design', 'Scalability', 'Caching'], resources: [{ label: 'System design course', kind: 'Video', mins: 150 }, { label: 'Design a scalable API', kind: 'Project', mins: 240 }] },
    { id: 'mini-projects', title: '2 mini production projects', short: 'Projects', hours: heavy ? 40 : 30, days: heavy ? 16 : 12, skills: ['Projects', 'Full-stack', 'Backend'], resources: [{ label: 'Ship 2 portfolio apps', kind: 'Project', mins: 360 }] },
    { id: 'interviews', title: (role || 'Role') + ' interview prep', short: 'Interviews', hours: heavy ? 45 : 30, days: heavy ? 18 : 12, skills: ['DSA', 'Behavioral', 'System Design'], resources: [{ label: 'Coding interview drills', kind: 'Practice', mins: 300 }, { label: 'Behavioral stories', kind: 'Reading', mins: 60 }] },
  ];
  return nodes.map(function (n, i) { return normalizeNode(n, i); });
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });
  try {
    var body = {};
    try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { ok: false, error: 'Invalid JSON body' }); }
    var role = String(body.role || '').trim().slice(0, 80);
    if (!role) return json(400, { ok: false, error: 'role is required' });
    var skills = Array.isArray(body.skills)
      ? body.skills.map(String).slice(0, 50)
      : String(body.skills || '').split(/[,|/]/).map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 50);
    var cvSkills = Array.isArray(body.cvSkills) ? body.cvSkills.map(String).slice(0, 50) : [];
    var cvText = String(body.cvText || '').slice(0, 10000);
    var prompt = buildPrompt({ role: role, skills: skills, cvSkills: cvSkills, cvText: cvText });
    var messages = [{ role: 'user', content: prompt }];
    var geminiKey = env('GEMINI_API_KEY');
    var groqKey = env('GROQ_API_KEY');
    var reply = null;
    var provider = 'none';
    var lastErr = '';
    if (geminiKey) {
      try {
        reply = await callGemini({ apiKey: geminiKey, model: env('GEMINI_MODEL') || 'gemini-1.5-flash', messages: messages, temperature: 0.3 });
        provider = 'gemini';
      } catch (e) { lastErr = e.message || String(e); }
    }
    if ((!reply || !tryParseNodes(reply)) && groqKey) {
      try {
        reply = await callGroq({ apiKey: groqKey, model: env('GROQ_MODEL'), messages: messages, temperature: 0.3 });
        provider = 'groq';
      } catch (e) { lastErr = e.message || String(e); }
    }
    var nodes = tryParseNodes(reply);
    var source = provider;
    if (!nodes) {
      nodes = fallbackNodes(role, skills.concat(cvSkills));
      source = 'template';
    }
    return json(200, {
      ok: true,
      role: role,
      nodes: nodes,
      source: source,
      provider: provider,
      skills: skills,
      cvSkills: cvSkills,
      seniority: roleSeniority(role),
      note: source === 'template' && lastErr ? lastErr : undefined,
    });
  } catch (error) {
    console.error('career-path error', error);
    return json(500, { ok: false, error: error.message || 'Failed to design career path' });
  }
};

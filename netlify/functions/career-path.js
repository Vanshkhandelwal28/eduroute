/**
 * Custom career path: Gemini first, then Groq fallback.
 * Realistic hours/days per module for the target role seniority.
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
    'Skills the student ALREADY has (skip beginner modules for these): ' +
    skillList +
    '.\n' +
    'Skills from CV: ' +
    cvList +
    '.\n' +
    (cvSnippet ? 'CV excerpt:\n' + cvSnippet + '\n' : '') +
    'Focus on what companies hire for this role that the student still needs.\n' +
    'Module titles MUST name concrete skills/projects (e.g. \'Golang concurrency\', \'PostgreSQL performance\', \'System design: rate limiter\') — never \'Role Core Skills\' or \'Custom\'.\n' +
    'CRITICAL timeline rules:\n' +
    '- hours = total focused study hours for that module (not a single video length).\n' +
    '- days = calendar days to finish the module at ~2–3 study hours/day.\n' +
    '- Lightweight topic (Git polish): hours 8–12, days 4–6.\n' +
    '- Medium (REST depth, one DB): hours 25–40, days 10–16.\n' +
    '- Heavy (System Design, full Databases, Interview prep for senior): hours 40–80, days 15–30.\n' +
    '- For senior/SDE-2+ roles, Databases alone must NOT be under 40 hours / 15 days.\n' +
    '- resources[].mins = one resource session; include 4–8 resources per heavy module.\n' +
    'Return ONLY valid JSON (no markdown):\n' +
    '{"nodes":[{"id":"slug","title":"Module","short":"Short","hours":40,"days":16,"skills":["a","b"],"resources":[{"label":"...","kind":"Video|Reading|Exercise|Quiz|Project","mins":45}]]}\n' +
    '5–7 nodes, beginner→job-ready for this role, no markdown fences.'
  );
}

function normalizeNode(t, i) {
  var hours = Math.max(8, Number(t.hours) || 20);
  var days = Number(t.days);
  if (!days || days < 3) {
    days = Math.min(90, Math.max(5, Math.round(hours / 2.5)));
  }
  var title = String(t.title || 'Step ' + (i + 1));
  if (/database|system design|interview|distributed|kubernetes|platform/i.test(title) && hours < 30) {
    hours = Math.max(hours, 40);
    days = Math.max(days, 15);
  }
  return {
    id: String(t.id || 'step-' + (i + 1))
      .replace(/[^a-z0-9-_]/gi, '-')
      .toLowerCase(),
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
    if (!Array.isArray(arr) || arr.length < 3) return null;
    return arr.slice(0, 8).map(normalizeNode);
  } catch (e) {
    return null;
  }
}

function fallbackNodes(role, skills) {
  var level = roleSeniority(role);
  var heavy = level === 'senior' || level === 'lead';
  var s = (skills || []).map(function (x) {
    return String(x).toLowerCase();
  });
  var has = function (k) {
    return s.some(function (x) {
      return x.indexOf(k) !== -1;
    });
  };
  var nodes = [];
  if (has('golang') || has('go') || has('backend') || /sde|software|backend/i.test(role)) {
    nodes.push({
      id: 'backend-depth',
      title: has('golang') || has('go') ? 'Golang service design & APIs' : 'Backend Depth (APIs, Auth & Services)',
      short: 'Backend',
      hours: heavy ? 45 : 30,
      days: heavy ? 18 : 12,
      skills: has('golang') || has('go') ? ['Golang', 'REST', 'JWT'] : ['REST', 'JWT', 'Service design'],
      resources: [
        { label: 'API design & versioning', kind: 'Video', mins: 90 },
        { label: 'Auth: JWT / OAuth deep dive', kind: 'Video', mins: 75 },
        { label: 'Build a production-style API', kind: 'Project', mins: 240 },
      ],
    });
  }
  nodes.push(
    {
      id: 'databases',
      title: 'PostgreSQL & persistence for production',
      short: 'Databases',
      hours: heavy ? 55 : 40,
      days: heavy ? 20 : 15,
      skills: ['SQL', 'Indexing', 'Transactions', 'NoSQL'],
      resources: [
        { label: 'Relational modeling & normalization', kind: 'Video', mins: 90 },
        { label: 'Indexing & query plans', kind: 'Video', mins: 80 },
        { label: 'Build & tune a real schema', kind: 'Project', mins: 300 },
      ],
    },
    {
      id: 'system-design',
      title: 'System Design for ' + (role || 'Engineers'),
      short: 'SysDesign',
      hours: heavy ? 60 : 40,
      days: heavy ? 22 : 16,
      skills: ['System Design', 'Scalability', 'Caching'],
      resources: [
        { label: 'System design foundations', kind: 'Video', mins: 120 },
        { label: 'Design a chat / feed system', kind: 'Project', mins: 300 },
      ],
    },
    {
      id: 'devops-basics',
      title: 'Docker, CI/CD & observability',
      short: 'Deploy',
      hours: heavy ? 40 : 28,
      days: heavy ? 16 : 12,
      skills: ['Docker', 'CI/CD', 'Monitoring'],
      resources: [
        { label: 'Docker for services', kind: 'Video', mins: 75 },
        { label: 'Ship a service end-to-end', kind: 'Project', mins: 240 },
      ],
    },
    {
      id: 'interviews',
      title: (role || 'Role') + ' interview prep',
      short: 'Interviews',
      hours: heavy ? 50 : 35,
      days: heavy ? 20 : 14,
      skills: ['DSA', 'Behavioral', 'Design interviews'],
      resources: [
        { label: 'Coding patterns', kind: 'Practice', mins: 300 },
        { label: 'Mock system design', kind: 'Exercise', mins: 180 },
      ],
    },
    {
      id: 'portfolio',
      title: 'Portfolio & production project',
      short: 'Portfolio',
      hours: heavy ? 45 : 30,
      days: heavy ? 18 : 12,
      skills: ['Production', 'Git', 'Docs'],
      resources: [{ label: 'Implement, test, deploy', kind: 'Project', mins: 360 }],
    }
  );
  return nodes.map(function (n, i) {
    return normalizeNode(n, i);
  });
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });
  try {
    var body = {};
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return json(400, { ok: false, error: 'Invalid JSON body' });
    }
    var role = String(body.role || '')
      .trim()
      .slice(0, 80);
    if (!role) return json(400, { ok: false, error: 'role is required' });
    var skills = Array.isArray(body.skills)
      ? body.skills.map(String).slice(0, 50)
      : String(body.skills || '')
          .split(/[,|/]/)
          .map(function (s) {
            return s.trim();
          })
          .filter(Boolean)
          .slice(0, 50);
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
        reply = await callGemini({
          apiKey: geminiKey,
          model: env('GEMINI_MODEL') || 'gemini-1.5-flash',
          messages: messages,
          temperature: 0.3,
        });
        provider = 'gemini';
      } catch (e) {
        lastErr = e.message || String(e);
      }
    }
    if ((!reply || !tryParseNodes(reply)) && groqKey) {
      try {
        reply = await callGroq({
          apiKey: groqKey,
          model: env('GROQ_MODEL'),
          messages: messages,
          temperature: 0.3,
        });
        provider = 'groq';
      } catch (e) {
        lastErr = e.message || String(e);
      }
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

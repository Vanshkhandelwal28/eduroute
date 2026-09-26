/**
 * Custom career path: Gemini first, Groq fallback.
 * POST { role, skills?, cvSkills?, cvText?, userId? }
 */
const { callGemini, callGroq } = require('./_lib/aiClient');

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

function buildPrompt({ role, skills, cvSkills, cvText }) {
  const skillList = (skills || []).join(', ') || 'not specified';
  const cvList = (cvSkills || []).join(', ') || 'none extracted';
  const cvSnippet = (cvText || '').slice(0, 2500);
  return (
    'You are a career coach for EDUROUTE. Design a practical 5-7 step learning path for a student targeting this role: "' +
    role +
    '".\n' +
    'Skills the student ALREADY has (do not re-teach these as beginner modules): ' +
    skillList +
    '.\n' +
    'Skills extracted from their CV: ' +
    cvList +
    '.\n' +
    (cvSnippet ? 'CV excerpt (optional context):\n' + cvSnippet + '\n' : '') +
    'Focus on what companies typically require for "' +
    role +
    '" that the student still needs.\n' +
    'Return ONLY valid JSON (no markdown): {"nodes":[{"id":"slug","title":"Module name","short":"Short","hours":8,"skills":["a","b"],"resources":[{"label":"...","kind":"Video|Reading|Exercise|Quiz","mins":30}]]}\n' +
    'Rules: order beginner→job-ready for this role; skip pure intro for skills they already have; include system design / interviews if relevant to the role; no markdown fences.'
  );
}

function tryParseNodes(text) {
  if (!text || typeof text !== 'string') return null;
  try {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    const arr = Array.isArray(parsed) ? parsed : parsed.nodes;
    if (!Array.isArray(arr) || arr.length < 3) return null;
    return arr.slice(0, 8).map(function (t, i) {
      return {
        id: String(t.id || 'step-' + (i + 1))
          .replace(/[^a-z0-9-_]/gi, '-')
          .toLowerCase(),
        title: String(t.title || 'Step ' + (i + 1)),
        short: String(t.short || (t.title || 'Step').split(' ')[0] || 'S' + (i + 1)).slice(0, 18),
        hours: Math.max(2, Number(t.hours) || 8),
        skills: Array.isArray(t.skills) ? t.skills.map(String).slice(0, 6) : [],
        resources: Array.isArray(t.resources)
          ? t.resources.slice(0, 4).map(function (r) {
              return {
                label: String(r.label || r.title || 'Resource'),
                kind: String(r.kind || 'Video'),
                mins: Number(r.mins) || 30,
              };
            })
          : [{ label: 'Intro', kind: 'Video', mins: 30 }],
      };
    });
  } catch (e) {
    return null;
  }
}

function fallbackNodes(role, skills) {
  var s = (skills || []).map(function (x) {
    return String(x).toLowerCase();
  });
  var has = function (k) {
    return s.some(function (x) {
      return x.indexOf(k) !== -1;
    });
  };
  var nodes = [];
  if (has('golang') || has('go') || /sde|backend|software/i.test(role)) {
    nodes.push({
      id: 'backend-depth',
      title: 'Backend Depth (APIs & Auth)',
      short: 'Backend',
      hours: 12,
      skills: ['REST', 'JWT', 'Golang'],
      resources: [
        { label: 'API design patterns', kind: 'Video', mins: 40 },
        { label: 'JWT auth lab', kind: 'Exercise', mins: 60 },
      ],
    });
  }
  nodes.push(
    {
      id: 'system-design',
      title: 'System Design for ' + (role || 'Engineers'),
      short: 'SysDesign',
      hours: 14,
      skills: ['System Design', 'Scalability', 'Caching'],
      resources: [
        { label: 'System design intro', kind: 'Video', mins: 45 },
        { label: 'Design a URL shortener', kind: 'Exercise', mins: 90 },
      ],
    },
    {
      id: 'databases',
      title: 'Databases & Persistence',
      short: 'Databases',
      hours: 10,
      skills: ['SQL', 'NoSQL', 'Indexing'],
      resources: [
        { label: 'SQL performance', kind: 'Video', mins: 35 },
        { label: 'Schema design drill', kind: 'Exercise', mins: 50 },
      ],
    },
    {
      id: 'devops-basics',
      title: 'Deploy & Observability',
      short: 'Deploy',
      hours: 10,
      skills: ['Docker', 'CI/CD', 'Monitoring'],
      resources: [
        { label: 'Docker for developers', kind: 'Video', mins: 40 },
        { label: 'Ship a service', kind: 'Project', mins: 90 },
      ],
    },
    {
      id: 'interviews',
      title: (role || 'Role') + ' Interview Prep',
      short: 'Interviews',
      hours: 12,
      skills: ['DSA', 'Behavioral', 'Design interviews'],
      resources: [
        { label: 'Coding interview patterns', kind: 'Practice', mins: 120 },
        { label: 'Mock system design', kind: 'Exercise', mins: 60 },
      ],
    },
    {
      id: 'portfolio',
      title: 'Portfolio & Production Project',
      short: 'Portfolio',
      hours: 16,
      skills: ['Production', 'Git', 'Docs'],
      resources: [{ label: 'Ship one production-grade service', kind: 'Project', mins: 180 }],
    }
  );
  return nodes;
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
      ? body.skills.map(String).slice(0, 40)
      : String(body.skills || '')
          .split(/[,|/]/)
          .map(function (s) {
            return s.trim();
          })
          .filter(Boolean)
          .slice(0, 40);
    var cvSkills = Array.isArray(body.cvSkills) ? body.cvSkills.map(String).slice(0, 40) : [];
    var cvText = String(body.cvText || '').slice(0, 8000);

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
          temperature: 0.35,
        });
        provider = 'gemini';
      } catch (e) {
        lastErr = e.message || String(e);
        console.warn('career-path Gemini failed', lastErr);
      }
    }

    if ((!reply || !tryParseNodes(reply)) && groqKey) {
      try {
        reply = await callGroq({
          apiKey: groqKey,
          model: env('GROQ_MODEL'),
          messages: messages,
          temperature: 0.35,
        });
        provider = 'groq';
      } catch (e) {
        lastErr = e.message || String(e);
        console.warn('career-path Groq failed', lastErr);
      }
    }

    var nodes = tryParseNodes(reply);
    var source = provider;
    if (!nodes) {
      nodes = fallbackNodes(role, skills);
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
      note: source === 'template' && lastErr ? lastErr : undefined,
    });
  } catch (error) {
    console.error('career-path error', error);
    return json(500, { ok: false, error: error.message || 'Failed to design career path' });
  }
};

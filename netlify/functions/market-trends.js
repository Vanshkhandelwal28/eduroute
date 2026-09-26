/**
 * Market trends — Groq x2 → Gemini → region-unique baseline.
 * Every refresh sends selected state so AI (or baseline) differs by region.
 */
const { generateMarketAi, extractJsonObject } = require('./_lib/marketAi');

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

const JSON_SYSTEM = 'You output only one JSON object. No markdown.';

function normalizeRegion(raw) {
  const r = String(raw || '').trim();
  if (!r || /india\s*\(all\)|pan[- ]?india|^india$/i.test(r)) return 'India (All)';
  return r;
}

function regionField(region) {
  return region === 'India (All)' ? 'India' : 'India / ' + region;
}

function marketTemplate(region) {
  const r = regionField(region);
  return (
    'India tech hiring for region: ' +
    region +
    '. Skills and scores MUST differ from other states. ' +
    'Return JSON: {"updatedAt":"ISO","region":"' +
    r +
    '","summary":"2 sentences about ' +
    region +
    '","risingSkills":[{"skill":"","demandScore":0,"trend":"rising","note":""}],' +
    '"decliningSkills":[{"skill":"","demandScore":0,"trend":"declining","note":""}],' +
    '"topRoles":[{"role":"","openingsIndex":0,"avgSalaryLpa":0}],' +
    '"sectors":[{"name":"","demandScore":0}],"emergingTech":[""],"sourcesNote":"ai"}. ' +
    '6 rising, 2 declining, 4 roles, 3 sectors. Scores 40-95 unique to ' +
    region +
    '.'
  );
}

function studentTemplate(p) {
  const region = normalizeRegion(p.region);
  return (
    'Student vs ' +
    region +
    ' tech market. JSON: {"generatedAt":"ISO","summary":"2 sentences","matchScore":0,' +
    '"marketSkills":[{"skill":"","marketDemand":0,"studentLevel":0,"status":"strong|gap|missing"}],' +
    '"skillGaps":[{"skill":"","priority":"high|medium|low","why":"","action":""}],' +
    '"strengths":[""],"recommendations":[""],' +
    '"comparisonBars":[{"skill":"","market":0,"student":0}]}. ' +
    'Field:' +
    (p.field || 'SE') +
    ' Strengths:' +
    (p.strengths || p.skills || []).slice(0, 8).join(',') +
    ' Gaps:' +
    (p.gaps || []).slice(0, 6).join(',') +
    '.'
  );
}

/** Deterministic hash so baseline scores always differ by region name */
function regionSeed(name) {
  let h = 0;
  const s = String(name || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function localMarketFallback(region) {
  const scope = normalizeRegion(region);
  const seed = regionSeed(scope);
  const boost = seed % 17;

  const profiles = {
    'India (All)': {
      summary: 'Pan-India hubs: Bengaluru, Hyderabad, Pune, NCR, Chennai. Product + services demand for full-stack, cloud, GenAI.',
      rising: [
        ['React / Next.js', 90],
        ['Python / GenAI', 89],
        ['Cloud (AWS/GCP)', 86],
        ['System Design', 84],
        ['TypeScript', 82],
        ['DevOps', 78],
      ],
      declining: [['jQuery-only', 26], ['Flash', 10]],
      roles: [['SDE Fullstack', 92, 9], ['Backend', 88, 11], ['Data Analyst', 80, 7], ['DevOps', 78, 10]],
      sectors: [['Product SaaS', 90], ['IT Services', 82], ['FinTech', 78]],
      emerging: ['GenAI apps', 'Platform eng'],
    },
    Maharashtra: {
      summary: 'Pune + Mumbai: BFSI, product, services. Java/Spring, full-stack, cloud, data above average.',
      rising: [
        ['Java / Spring Boot', 90],
        ['React / Next.js', 87],
        ['Cloud (AWS/Azure)', 85],
        ['SQL / Data eng', 83],
        ['Python', 81],
        ['Microservices', 80],
      ],
      declining: [['Classic ASP', 30], ['VB desktop', 18]],
      roles: [['Java Backend', 90, 10], ['MERN Fullstack', 86, 9], ['Data Analyst', 82, 7], ['Cloud Eng', 78, 11]],
      sectors: [['BFSI FinTech', 90], ['IT Services', 84], ['Product', 80]],
      emerging: ['Open banking', 'BFSI GenAI'],
    },
    Karnataka: {
      summary: 'Bengaluru product hub: system design, Go/Java, K8s, React, ML engineering pay premium.',
      rising: [
        ['System Design', 92],
        ['Go / Java backend', 90],
        ['React / TypeScript', 88],
        ['Kubernetes', 86],
        ['ML engineering', 84],
        ['Data engineering', 80],
      ],
      declining: [['Monolith PHP', 28], ['jQuery SPA', 24]],
      roles: [['SDE product', 94, 14], ['Platform backend', 90, 16], ['ML junior', 78, 12], ['SRE', 80, 13]],
      sectors: [['Product SaaS', 94], ['GCC', 86], ['Deep tech AI', 82]],
      emerging: ['LLM products', 'Developer tools'],
    },
    Goa: {
      summary: 'Smaller tourism-digital + remote market. Web, mobile, analytics over large enterprise Java campuses.',
      rising: [
        ['React frontend', 82],
        ['Node APIs', 78],
        ['Flutter / RN', 76],
        ['Digital analytics', 74],
        ['Headless CMS', 72],
        ['UI implementation', 80],
      ],
      declining: [['Flash banners', 12], ['Static brochure only', 30]],
      roles: [['Frontend', 84, 7], ['Full stack small team', 80, 8], ['Mobile', 74, 7], ['Digital analyst', 70, 5]],
      sectors: [['Tourism tech', 86], ['Agencies', 82], ['Remote product', 78]],
      emerging: ['Tourism apps', 'Remote stacks'],
    },
    'Delhi NCR': {
      summary: 'Noida/Gurgaon startups + GCC: full-stack, growth data, cybersecurity, cloud active.',
      rising: [
        ['React / Node', 88],
        ['Python / data', 86],
        ['Cybersecurity', 84],
        ['Cloud', 82],
        ['TypeScript', 80],
        ['System design', 78],
      ],
      declining: [['Flash CMS', 16], ['jQuery monolith', 28]],
      roles: [['Full Stack', 90, 10], ['Data Analyst', 84, 8], ['Security', 80, 9], ['Backend', 86, 11]],
      sectors: [['Startups', 88], ['GCC', 84], ['E-commerce', 76]],
      emerging: ['Growth analytics', 'AppSec'],
    },
  };

  const p =
    profiles[scope] ||
    {
      summary:
        'Localised demand for ' +
        scope +
        ': web, support, remote roles. Fundamentals + portfolio matter most.',
      rising: [
        ['Web fundamentals', 78 + (boost % 5)],
        ['React basics', 74 + (boost % 4)],
        ['Python', 72 + (boost % 6)],
        ['SQL', 70 + (boost % 5)],
        ['Git', 76],
        ['APIs', 68 + (boost % 7)],
      ],
      declining: [['Theory-only certs', 38], ['Obsolete desktop', 22]],
      roles: [
        ['Junior Web', 76, 5],
        ['Support', 70, 4],
        ['Data ops', 68, 5],
        ['Freelance FS', 72, 6],
      ],
      sectors: [['SME IT', 78], ['Remote services', 80], ['Training', 74]],
      emerging: ['Remote delivery', 'Portfolio hiring'],
    };

  return {
    updatedAt: new Date().toISOString(),
    region: regionField(scope),
    summary: p.summary,
    risingSkills: p.rising.map(function (row) {
      return {
        skill: row[0],
        demandScore: Math.min(95, row[1]),
        trend: 'rising',
        note: scope,
      };
    }),
    decliningSkills: p.declining.map(function (row) {
      return { skill: row[0], demandScore: row[1], trend: 'declining', note: 'Legacy' };
    }),
    topRoles: p.roles.map(function (row) {
      return { role: row[0], openingsIndex: row[1], avgSalaryLpa: row[2] };
    }),
    sectors: p.sectors.map(function (row) {
      return { name: row[0], demandScore: row[1] };
    }),
    emergingTech: p.emerging,
    sourcesNote: 'Region profile for ' + scope + ' (AI offline this request).',
    provider: 'local-fallback',
  };
}

function localStudentFallback(p) {
  const strengths = [].concat(p.strengths || p.skills || []).filter(Boolean);
  const gaps = [].concat(p.gaps || []).filter(Boolean);
  const region = normalizeRegion(p.region);
  return {
    generatedAt: new Date().toISOString(),
    summary: 'Profile vs ' + region + ' market. Ship projects to close gaps.',
    matchScore: 52 + (regionSeed(region) % 20),
    marketSkills: [
      { skill: 'React', marketDemand: 85, studentLevel: 40, status: 'gap' },
      { skill: 'APIs', marketDemand: 80, studentLevel: 35, status: 'gap' },
      { skill: 'Python', marketDemand: 82, studentLevel: 45, status: 'gap' },
    ],
    skillGaps: (gaps.length ? gaps : ['Projects', 'APIs']).slice(0, 4).map(function (g, i) {
      return {
        skill: g,
        priority: i === 0 ? 'high' : 'medium',
        why: 'Demand in ' + region,
        action: 'Ship a mini-project',
      };
    }),
    strengths: strengths.length ? strengths : ['Learning mindset'],
    recommendations: ['Ship one GitHub project', 'Practice APIs', 'Add cloud deploy'],
    comparisonBars: [
      { skill: 'React', market: 85, student: 40 },
      { skill: 'APIs', market: 80, student: 35 },
      { skill: 'Python', market: 82, student: 45 },
      { skill: 'Cloud', market: 78, student: 25 },
      { skill: 'Projects', market: 90, student: 30 },
    ],
    provider: 'local-fallback',
  };
}

async function aiJson(messages, temperature) {
  const res = await generateMarketAi(messages, temperature);
  const reply = typeof res === 'string' ? res : res.text;
  const provider = (res && res.provider) || 'ai';
  const parsed = extractJsonObject(reply);
  return { parsed: parsed, provider: provider, reply: reply };
}

let memoryMarket = null;

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });
  if (event.httpMethod === 'GET') {
    return json(200, {
      ok: true,
      market: memoryMarket,
      hasGemini: Boolean(process.env.GEMINI_API_KEY),
      hasGroq: Boolean(process.env.GROQ_API_KEY),
    });
  }
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });

  try {
    const body = JSON.parse(event.body || '{}');
    const action = body.action || 'refresh_market';
    const region = normalizeRegion(body.region || 'Maharashtra');

    if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) {
      if (action === 'refresh_market') {
        const market = localMarketFallback(region);
        memoryMarket = market;
        return json(200, { ok: true, market: market, provider: 'local-fallback' });
      }
      if (action === 'analyze_student') {
        return json(200, {
          ok: true,
          analysis: localStudentFallback({ ...body, region: region }),
          market: memoryMarket || localMarketFallback(region),
          provider: 'local-fallback',
        });
      }
    }

    if (action === 'refresh_market') {
      try {
        const { parsed, provider, reply } = await aiJson(
          [
            { role: 'system', content: JSON_SYSTEM },
            { role: 'user', content: marketTemplate(region) },
          ],
          0.4,
        );
        if (!parsed) {
          const market = localMarketFallback(region);
          memoryMarket = market;
          return json(200, {
            ok: true,
            market: market,
            provider: 'local-fallback',
            warning: 'AI non-JSON: ' + String(reply).slice(0, 80),
          });
        }
        parsed.updatedAt = parsed.updatedAt || new Date().toISOString();
        if (!parsed.region) parsed.region = regionField(region);
        parsed.provider = provider;
        memoryMarket = parsed;
        return json(200, { ok: true, market: parsed, provider: provider });
      } catch (e) {
        const market = localMarketFallback(region);
        memoryMarket = market;
        return json(200, {
          ok: true,
          market: market,
          provider: 'local-fallback',
          warning: String(e.message || e).slice(0, 200),
        });
      }
    }

    if (action === 'analyze_student') {
      const payload = {
        skills: Array.isArray(body.skills) ? body.skills : [],
        strengths: Array.isArray(body.strengths) ? body.strengths : [],
        gaps: Array.isArray(body.gaps) ? body.gaps : [],
        field: body.field || 'Software Engineering',
        interests: Array.isArray(body.interests) ? body.interests : [],
        region: region,
      };
      try {
        const { parsed, provider } = await aiJson(
          [
            { role: 'system', content: JSON_SYSTEM },
            { role: 'user', content: studentTemplate(payload) },
          ],
          0.4,
        );
        if (!parsed) {
          return json(200, {
            ok: true,
            analysis: localStudentFallback(payload),
            market: memoryMarket,
            provider: 'local-fallback',
          });
        }
        parsed.generatedAt = parsed.generatedAt || new Date().toISOString();
        parsed.provider = provider;
        return json(200, { ok: true, analysis: parsed, market: memoryMarket, provider: provider });
      } catch (e) {
        return json(200, {
          ok: true,
          analysis: localStudentFallback(payload),
          market: memoryMarket,
          provider: 'local-fallback',
          warning: String(e.message || e).slice(0, 200),
        });
      }
    }

    return json(400, { ok: false, error: 'Unknown action' });
  } catch (err) {
    return json(500, { ok: false, error: err.message || 'Market trends failed' });
  }
};

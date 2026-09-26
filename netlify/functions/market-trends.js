/**
 * Market trends + student trend analysis
 * Prefer Gemini (1 try, 4.5s) → Groq (1 try, 4.5s) → local structured fallback.
 * Accepts body.region (state or "India (All)") for scoped labour-market data.
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

const JSON_SYSTEM =
  'You are a JSON API. Reply with ONLY one valid JSON object. ' +
  'No markdown, no code fences, no explanation, no trailing text.';

function normalizeRegion(raw) {
  const r = String(raw || '').trim();
  if (!r || /india\s*\(all\)|pan[- ]?india|^india$/i.test(r)) return 'India (All)';
  return r;
}

function regionLabel(region) {
  return region === 'India (All)' ? 'India (pan-India tech jobs)' : region + ' (India)';
}

function marketTemplate(region) {
  const label = regionLabel(region);
  const regionField = region === 'India (All)' ? 'India' : 'India / ' + region;
  return (
    'You are a labour-market analyst for tech / digital jobs in ' +
    label +
    '. Be realistic for this geography. ' +
    'Return ONLY this JSON shape: ' +
    '{"updatedAt":"ISO","region":"' +
    regionField +
    '","summary":"2-3 sentences about this region",' +
    '"risingSkills":[{"skill":"","demandScore":0,"trend":"rising","note":""}],' +
    '"stableSkills":[{"skill":"","demandScore":0,"trend":"stable","note":""}],' +
    '"decliningSkills":[{"skill":"","demandScore":0,"trend":"declining","note":""}],' +
    '"topRoles":[{"role":"","openingsIndex":0,"avgSalaryLpa":0}],' +
    '"sectors":[{"name":"","demandScore":0}],' +
    '"emergingTech":[""],"sourcesNote":""}. ' +
    '8 risingSkills, 3 decliningSkills, 5 topRoles, 4 sectors. demandScore 0-100. ' +
    'Tailor skills, salaries (LPA), and sectors to ' +
    label +
    '.'
  );
}

function studentTemplate(p) {
  const region = normalizeRegion(p.region);
  return (
    'Compare this student to the tech job market in ' +
    regionLabel(region) +
    '. Return ONLY this JSON: ' +
    '{"generatedAt":"ISO","summary":"2-3 sentences","matchScore":0,' +
    '"marketSkills":[{"skill":"","marketDemand":0,"studentLevel":0,"status":"strong|gap|missing"}],' +
    '"skillGaps":[{"skill":"","priority":"high|medium|low","why":"","action":""}],' +
    '"strengths":[""],"recommendations":[""],' +
    '"comparisonBars":[{"skill":"","market":0,"student":0}]}. ' +
    'Field: ' +
    (p.field || 'General') +
    '. Interests: ' +
    (p.interests || []).join(', ') +
    '. Strengths: ' +
    (p.strengths || p.skills || []).join(', ') +
    '. Gaps: ' +
    (p.gaps || []).join(', ') +
    '. matchScore 0-100. comparisonBars: 6 skills scores 0-100.'
  );
}

function localMarketFallback(region) {
  const scope = normalizeRegion(region);
  const regionField = scope === 'India (All)' ? 'India' : 'India / ' + scope;
  const hubNote =
    scope === 'India (All)'
      ? 'Pan-India tech hubs (Bengaluru, Hyderabad, Pune, NCR, Chennai) drive demand.'
      : 'Localised view for ' + scope + ' tech hiring (cities + IT parks in this state).';
  return {
    updatedAt: new Date().toISOString(),
    region: regionField,
    summary:
      hubNote +
      ' Full-stack, cloud, data, and AI-adjacent roles stay strong. Practical projects and APIs matter more than pure theory.',
    risingSkills: [
      { skill: 'React / Next.js', demandScore: 88, trend: 'rising', note: 'Frontend + full-stack' },
      { skill: 'Python / AI basics', demandScore: 86, trend: 'rising', note: 'Automation + ML entry' },
      { skill: 'Cloud (AWS/GCP)', demandScore: 82, trend: 'rising', note: 'Deploy & DevOps' },
      { skill: 'TypeScript', demandScore: 80, trend: 'rising', note: 'Safer JS stacks' },
      { skill: 'System Design', demandScore: 78, trend: 'rising', note: 'Mid-level interviews' },
      { skill: 'SQL + Data', demandScore: 76, trend: 'rising', note: 'Backend & analytics' },
      { skill: 'APIs / REST', demandScore: 74, trend: 'rising', note: 'Integration work' },
      { skill: 'Docker basics', demandScore: 70, trend: 'rising', note: 'Ship reliably' },
    ],
    stableSkills: [
      { skill: 'Java / Spring', demandScore: 72, trend: 'stable', note: 'Enterprise' },
      { skill: 'Git / CI', demandScore: 75, trend: 'stable', note: 'Team workflows' },
    ],
    decliningSkills: [
      { skill: 'jQuery-only frontends', demandScore: 28, trend: 'declining', note: 'Legacy' },
      { skill: 'Flash / outdated stacks', demandScore: 12, trend: 'declining', note: 'Obsolete' },
    ],
    topRoles: [
      { role: 'Software Developer', openingsIndex: 90, avgSalaryLpa: 8 },
      { role: 'Full Stack Engineer', openingsIndex: 85, avgSalaryLpa: 10 },
      { role: 'Backend Engineer', openingsIndex: 80, avgSalaryLpa: 11 },
      { role: 'Data Analyst', openingsIndex: 72, avgSalaryLpa: 7 },
    ],
    sectors: [
      { name: 'Product / SaaS', demandScore: 86 },
      { name: 'IT Services', demandScore: 78 },
      { name: 'FinTech', demandScore: 74 },
    ],
    emergingTech: ['GenAI apps', 'Edge / IoT lite', 'Observability'],
    sourcesNote:
      'Heuristic baseline for ' + scope + ' (AI unavailable). Admin can Refresh for live model data.',
    provider: 'local-fallback',
  };
}

function localStudentFallback(p) {
  const strengths = [].concat(p.strengths || p.skills || []).filter(Boolean);
  const gaps = [].concat(p.gaps || []).filter(Boolean);
  const field = p.field || 'Software Engineering';
  const region = normalizeRegion(p.region);
  const known = strengths.map(function (s) {
    return String(s).toLowerCase();
  });
  function has(kw) {
    return known.some(function (s) {
      return s.indexOf(kw) !== -1;
    });
  }
  const bars = [
    { skill: 'React / Frontend', market: 88, student: has('react') || has('front') ? 70 : 35 },
    { skill: 'APIs / Backend', market: 84, student: has('api') || has('node') || has('backend') ? 65 : 30 },
    { skill: 'Python / Data', market: 82, student: has('python') || has('data') ? 68 : 28 },
    { skill: 'Cloud / DevOps', market: 78, student: has('aws') || has('cloud') || has('docker') ? 55 : 20 },
    { skill: 'System Design', market: 76, student: has('system') || has('design') ? 50 : 22 },
    { skill: 'Projects / Portfolio', market: 90, student: has('project') ? 60 : 25 },
  ];
  const avgStudent =
    bars.reduce(function (a, b) {
      return a + b.student;
    }, 0) / bars.length;
  const matchScore = Math.max(
    15,
    Math.min(92, Math.round(avgStudent + (strengths.length > 2 ? 8 : 0))),
  );
  const skillGaps = (gaps.length ? gaps : ['Project building', 'APIs', 'Practical experience'])
    .slice(0, 6)
    .map(function (g, i) {
      return {
        skill: g,
        priority: i === 0 ? 'high' : i < 3 ? 'medium' : 'low',
        why: 'Market demand in ' + region + ' is high relative to current profile depth.',
        action: 'Build 1 focused mini-project and document it on GitHub.',
      };
    });
  return {
    generatedAt: new Date().toISOString(),
    summary:
      'Based on your onboarding profile for ' +
      field +
      ' vs market in ' +
      region +
      ', you have useful starting strengths, but market-facing depth in projects and APIs still needs work.',
    matchScore: matchScore,
    marketSkills: bars.map(function (b) {
      return {
        skill: b.skill,
        marketDemand: b.market,
        studentLevel: b.student,
        status: b.student >= 55 ? 'strong' : b.student >= 35 ? 'gap' : 'missing',
      };
    }),
    skillGaps: skillGaps,
    strengths: strengths.length ? strengths : ['Willingness to learn', 'Onboarding completed'],
    recommendations: [
      'Ship one full-stack mini project with public README.',
      'Practice REST APIs + auth on a small backend.',
      'Add TypeScript or stronger typing if on JS stack.',
      'Prepare 2–3 interview stories from real work.',
    ],
    comparisonBars: bars,
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
        const analysis = localStudentFallback({ ...body, region: region });
        return json(200, {
          ok: true,
          analysis: analysis,
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
          0.3,
        );
        if (!parsed) {
          console.warn('Market AI non-JSON, local fallback. Preview:', String(reply).slice(0, 160));
          const market = localMarketFallback(region);
          memoryMarket = market;
          return json(200, {
            ok: true,
            market: market,
            provider: 'local-fallback',
            warning: 'AI non-JSON',
          });
        }
        parsed.updatedAt = parsed.updatedAt || new Date().toISOString();
        if (!parsed.region) {
          parsed.region = region === 'India (All)' ? 'India' : 'India / ' + region;
        }
        parsed.provider = provider;
        memoryMarket = parsed;
        return json(200, { ok: true, market: parsed, provider: provider });
      } catch (e) {
        console.error('refresh_market failed', e);
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
        const { parsed, provider, reply } = await aiJson(
          [
            { role: 'system', content: JSON_SYSTEM },
            { role: 'user', content: studentTemplate(payload) },
          ],
          0.35,
        );
        if (!parsed) {
          console.warn('Student AI non-JSON, local fallback. Preview:', String(reply).slice(0, 160));
          const analysis = localStudentFallback(payload);
          return json(200, {
            ok: true,
            analysis: analysis,
            market: memoryMarket,
            provider: 'local-fallback',
            warning: 'AI non-JSON',
          });
        }
        parsed.generatedAt = parsed.generatedAt || new Date().toISOString();
        parsed.provider = provider;
        return json(200, {
          ok: true,
          analysis: parsed,
          market: memoryMarket,
          provider: provider,
        });
      } catch (e) {
        console.error('analyze_student failed', e);
        const analysis = localStudentFallback(payload);
        return json(200, {
          ok: true,
          analysis: analysis,
          market: memoryMarket,
          provider: 'local-fallback',
          warning: String(e.message || e).slice(0, 200),
        });
      }
    }

    return json(400, { ok: false, error: 'Unknown action. Use refresh_market or analyze_student.' });
  } catch (err) {
    console.error('market-trends error', err);
    return json(500, { ok: false, error: err.message || 'Market trends failed' });
  }
};

/**
 * Market trends + student trend analysis
 * Gemini 1x → Groq 2x → region-specific local fallback. Short prompts for live AI.
 * body.region (state or "India (All)") scopes both AI and baseline.
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

const JSON_SYSTEM = 'Reply with only valid JSON. No markdown.';

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
    'Tech job market for ' + label + ' only. Make skills/scores unique to this region. ' +
    'JSON only: {"updatedAt":"ISO","region":"' + regionField + '","summary":"2 sentences",' +
    '"risingSkills":[{"skill":"","demandScore":0,"trend":"rising","note":""}],' +
    '"stableSkills":[{"skill":"","demandScore":0,"trend":"stable","note":""}],' +
    '"decliningSkills":[{"skill":"","demandScore":0,"trend":"declining","note":""}],' +
    '"topRoles":[{"role":"","openingsIndex":0,"avgSalaryLpa":0}],' +
    '"sectors":[{"name":"","demandScore":0}],"emergingTech":[""],"sourcesNote":""}. ' +
    '6 risingSkills, 2 declining, 4 topRoles, 3 sectors. Scores 0-100.'
  );
}

function studentTemplate(p) {
  const region = normalizeRegion(p.region);
  return (
    'Student vs tech market in ' + regionLabel(region) + '. JSON only: ' +
    '{"generatedAt":"ISO","summary":"2 sentences","matchScore":0,' +
    '"marketSkills":[{"skill":"","marketDemand":0,"studentLevel":0,"status":"strong|gap|missing"}],' +
    '"skillGaps":[{"skill":"","priority":"high|medium|low","why":"","action":""}],' +
    '"strengths":[""],"recommendations":[""],' +
    '"comparisonBars":[{"skill":"","market":0,"student":0}]}. ' +
    'Field:' + (p.field || 'General') +
    ' Strengths:' + (p.strengths || p.skills || []).join(',') +
    ' Gaps:' + (p.gaps || []).join(',') +
    ' 5 comparisonBars scores 0-100.'
  );
}

function localMarketFallback(region) {
  const scope = normalizeRegion(region);
  const regionField = scope === 'India (All)' ? 'India' : 'India / ' + scope;
  return {
    updatedAt: new Date().toISOString(),
    region: regionField,
    summary: 'Baseline for ' + scope + ' (AI offline). Refresh again for live model data.',
    risingSkills: [
      { skill: 'React / Next.js', demandScore: 85, trend: 'rising', note: scope },
      { skill: 'Python', demandScore: 82, trend: 'rising', note: scope },
      { skill: 'Cloud basics', demandScore: 78, trend: 'rising', note: scope },
      { skill: 'SQL', demandScore: 76, trend: 'rising', note: scope },
      { skill: 'APIs', demandScore: 74, trend: 'rising', note: scope },
      { skill: 'Git', demandScore: 80, trend: 'rising', note: scope },
    ],
    decliningSkills: [
      { skill: 'jQuery-only', demandScore: 28, trend: 'declining', note: 'Legacy' },
      { skill: 'Flash stacks', demandScore: 12, trend: 'declining', note: 'Obsolete' },
    ],
    topRoles: [
      { role: 'Software Developer', openingsIndex: 85, avgSalaryLpa: 8 },
      { role: 'Full Stack', openingsIndex: 80, avgSalaryLpa: 9 },
      { role: 'Data Analyst', openingsIndex: 72, avgSalaryLpa: 6 },
      { role: 'Support / L1', openingsIndex: 70, avgSalaryLpa: 4 },
    ],
    sectors: [
      { name: 'IT Services', demandScore: 80 },
      { name: 'Product / SaaS', demandScore: 75 },
      { name: 'SME IT', demandScore: 70 },
    ],
    emergingTech: ['GenAI apps', 'Cloud deploy'],
    sourcesNote: 'Fallback for ' + scope + ' — AI keys may be rate-limited.',
    provider: 'local-fallback',
  };
}

function localStudentFallback(p) {
  const strengths = [].concat(p.strengths || p.skills || []).filter(Boolean);
  const gaps = [].concat(p.gaps || []).filter(Boolean);
  const region = normalizeRegion(p.region);
  return {
    generatedAt: new Date().toISOString(),
    summary: 'Profile vs market in ' + region + '. Build projects to close gaps.',
    matchScore: 55,
    marketSkills: [
      { skill: 'React', marketDemand: 85, studentLevel: 40, status: 'gap' },
      { skill: 'APIs', marketDemand: 80, studentLevel: 35, status: 'gap' },
      { skill: 'Python', marketDemand: 82, studentLevel: 45, status: 'gap' },
    ],
    skillGaps: (gaps.length ? gaps : ['Projects', 'APIs']).slice(0, 4).map(function (g, i) {
      return { skill: g, priority: i === 0 ? 'high' : 'medium', why: 'Demand in ' + region, action: 'Ship a mini-project' };
    }),
    strengths: strengths.length ? strengths : ['Learning mindset'],
    recommendations: ['Ship one project on GitHub', 'Practice APIs', 'Add cloud deploy demo'],
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
          0.35,
        );
        if (!parsed) {
          console.warn('Market AI non-JSON', String(reply).slice(0, 160));
          const market = localMarketFallback(region);
          memoryMarket = market;
          return json(200, { ok: true, market: market, provider: 'local-fallback', warning: 'AI non-JSON' });
        }
        parsed.updatedAt = parsed.updatedAt || new Date().toISOString();
        if (!parsed.region) parsed.region = region === 'India (All)' ? 'India' : 'India / ' + region;
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
        return json(200, { ok: true, analysis: parsed, market: memoryMarket, provider: provider });
      } catch (e) {
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

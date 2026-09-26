/**
 * Market trends + student trend analysis — always Gemini via marketAi.js
 * POST { action: 'refresh_market' | 'analyze_student', skills?, strengths?, gaps?, field?, interests? }
 * GET  → last in-memory market snapshot
 */
const { generateWithGemini, extractJsonObject } = require('./_lib/marketAi');

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

const MARKET_TEMPLATE =
  'You are a labour-market analyst for India (tech / digital jobs, Maharashtra + pan-India). ' +
  'Be realistic. Return ONLY valid JSON (no markdown) with shape: ' +
  '{"updatedAt":"ISO","region":"India / Maharashtra","summary":"...",' +
  '"risingSkills":[{"skill":"","demandScore":0,"trend":"rising","note":""}],' +
  '"stableSkills":[{"skill":"","demandScore":0,"trend":"stable","note":""}],' +
  '"decliningSkills":[{"skill":"","demandScore":0,"trend":"declining","note":""}],' +
  '"topRoles":[{"role":"","openingsIndex":0,"avgSalaryLpa":0}],' +
  '"sectors":[{"name":"","demandScore":0}],' +
  '"emergingTech":[""],"sourcesNote":""}. ' +
  'Include 8-12 risingSkills, 3-6 decliningSkills, 5-8 topRoles, 4-6 sectors.';

function studentTemplate(p) {
  return (
    'Compare this student to India tech job market. Return ONLY valid JSON (no markdown): ' +
    '{"generatedAt":"ISO","summary":"...","matchScore":0,' +
    '"marketSkills":[{"skill":"","marketDemand":0,"studentLevel":0,"status":"strong|gap|missing"}],' +
    '"skillGaps":[{"skill":"","priority":"high|medium|low","why":"","action":""}],' +
    '"strengths":[""],"recommendations":[""],' +
    '"comparisonBars":[{"skill":"","market":0,"student":0}]}. ' +
    'Field: ' + (p.field || 'General') +
    '. Interests: ' + (p.interests || []).join(', ') +
    '. Strengths: ' + (p.strengths || p.skills || []).join(', ') +
    '. Gaps: ' + (p.gaps || []).join(', ') +
    '. comparisonBars: 6-10 skills, realistic scores 0-100.'
  );
}

let memoryMarket = null;

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });
  if (event.httpMethod === 'GET') {
    return json(200, {
      ok: true,
      market: memoryMarket,
      provider: 'gemini',
      hasGemini: Boolean(process.env.GEMINI_API_KEY),
    });
  }
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });

  try {
    const body = JSON.parse(event.body || '{}');
    const action = body.action || 'refresh_market';

    if (!process.env.GEMINI_API_KEY) {
      return json(503, {
        ok: false,
        error: 'GEMINI_API_KEY not configured in Netlify. Add env and redeploy.',
        provider: 'gemini',
      });
    }

    if (action === 'refresh_market') {
      const reply = await generateWithGemini(
        [
          { role: 'system', content: 'You output only valid JSON. No prose outside JSON.' },
          { role: 'user', content: MARKET_TEMPLATE },
        ],
        0.35,
      );
      const parsed = extractJsonObject(reply);
      if (!parsed) {
        return json(502, {
          ok: false,
          error: 'Gemini returned non-JSON. Try again.',
          rawPreview: String(reply).slice(0, 400),
        });
      }
      parsed.updatedAt = parsed.updatedAt || new Date().toISOString();
      parsed.provider = 'gemini';
      memoryMarket = parsed;
      return json(200, { ok: true, market: parsed, provider: 'gemini' });
    }

    if (action === 'analyze_student') {
      const payload = {
        skills: Array.isArray(body.skills) ? body.skills : [],
        strengths: Array.isArray(body.strengths) ? body.strengths : [],
        gaps: Array.isArray(body.gaps) ? body.gaps : [],
        field: body.field || 'Software Engineering',
        interests: Array.isArray(body.interests) ? body.interests : [],
      };
      const reply = await generateWithGemini(
        [
          { role: 'system', content: 'You output only valid JSON. No prose outside JSON.' },
          { role: 'user', content: studentTemplate(payload) },
        ],
        0.4,
      );
      const parsed = extractJsonObject(reply);
      if (!parsed) {
        return json(502, {
          ok: false,
          error: 'Gemini returned non-JSON. Try again.',
          rawPreview: String(reply).slice(0, 400),
        });
      }
      parsed.generatedAt = parsed.generatedAt || new Date().toISOString();
      parsed.provider = 'gemini';
      return json(200, { ok: true, analysis: parsed, market: memoryMarket, provider: 'gemini' });
    }

    return json(400, { ok: false, error: 'Unknown action. Use refresh_market or analyze_student.' });
  } catch (err) {
    console.error('market-trends error', err);
    return json(500, { ok: false, error: err.message || 'Market trends failed', provider: 'gemini' });
  }
};

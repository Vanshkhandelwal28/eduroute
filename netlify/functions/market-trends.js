/**
 * Market trends + student trend analysis — always Gemini.
 * POST { action: 'refresh_market' | 'analyze_student', studentSkills?, field?, interests? }
 * GET  → last cached market snapshot (in-memory per instance; client also caches)
 */
const { generateWithProvider, extractJsonObject } = require('./_lib/aiClient');

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

const MARKET_TEMPLATE = `You are a labour-market analyst for India (focus: tech / digital jobs, Maharashtra + pan-India).
Use your best current knowledge of hiring demand. Be realistic; do not invent exact company counts.

Return ONLY valid JSON (no markdown fences) with this exact shape:
{
  "updatedAt": "ISO-8601 datetime",
  "region": "India / Maharashtra",
  "summary": "2-4 sentences on overall market",
  "risingSkills": [
    { "skill": "string", "demandScore": 0-100, "trend": "rising", "note": "short reason" }
  ],
  "stableSkills": [
    { "skill": "string", "demandScore": 0-100, "trend": "stable", "note": "short" }
  ],
  "decliningSkills": [
    { "skill": "string", "demandScore": 0-100, "trend": "declining", "note": "short" }
  ],
  "topRoles": [
    { "role": "string", "openingsIndex": 0-100, "avgSalaryLpa": number }
  ],
  "sectors": [
    { "name": "string", "demandScore": 0-100 }
  ],
  "emergingTech": ["string"],
  "sourcesNote": "Knowledge cut-off / methodology note"
}
Include 8-12 risingSkills, 3-6 decliningSkills, 5-8 topRoles, 4-6 sectors.`;

function studentTemplate({ skills, strengths, gaps, field, interests }) {
  return `You are a career coach comparing ONE student to the India tech job market.

Student field: ${field || 'General'}
Interests: ${(interests || []).join(', ') || 'not specified'}
Student current skills / strengths: ${(strengths || skills || []).join(', ') || 'none listed'}
Known skill gaps: ${(gaps || []).join(', ') || 'none listed'}

Return ONLY valid JSON (no markdown fences):
{
  "generatedAt": "ISO-8601",
  "summary": "2-3 sentences: market vs this student",
  "matchScore": 0-100,
  "marketSkills": [
    { "skill": "string", "marketDemand": 0-100, "studentLevel": 0-100, "status": "strong|gap|missing" }
  ],
  "skillGaps": [
    { "skill": "string", "priority": "high|medium|low", "why": "string", "action": "string" }
  ],
  "strengths": ["string"],
  "recommendations": ["string"],
  "comparisonBars": [
    { "skill": "string", "market": 0-100, "student": 0-100 }
  ]
}
comparisonBars: 6-10 skills for charts. studentLevel 0 if missing, 40-70 if partial, 75-95 if strength.
Use realistic India market demand scores.`;
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

  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const action = body.action || 'refresh_market';

    if (!process.env.GEMINI_API_KEY) {
      return json(503, {
        ok: false,
        error: 'GEMINI_API_KEY not configured in Netlify. Add it under Site environment variables and redeploy.',
        provider: 'gemini',
      });
    }

    if (action === 'refresh_market') {
      const reply = await generateWithProvider({
        provider: 'gemini',
        temperature: 0.35,
        messages: [
          { role: 'system', content: 'You output only valid JSON. No prose outside JSON.' },
          { role: 'user', content: MARKET_TEMPLATE },
        ],
      });
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
      const skills = Array.isArray(body.skills) ? body.skills : [];
      const strengths = Array.isArray(body.strengths) ? body.strengths : skills;
      const gaps = Array.isArray(body.gaps) ? body.gaps : [];
      const field = body.field || 'Software Engineering';
      const interests = Array.isArray(body.interests) ? body.interests : [];

      const reply = await generateWithProvider({
        provider: 'gemini',
        temperature: 0.4,
        messages: [
          { role: 'system', content: 'You output only valid JSON. No prose outside JSON.' },
          {
            role: 'user',
            content: studentTemplate({ skills, strengths, gaps, field, interests }),
          },
        ],
      });
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
      return json(200, {
        ok: true,
        analysis: parsed,
        market: memoryMarket,
        provider: 'gemini',
      });
    }

    return json(400, { ok: false, error: 'Unknown action. Use refresh_market or analyze_student.' });
  } catch (err) {
    console.error('market-trends error', err);
    return json(500, {
      ok: false,
      error: err.message || 'Market trends failed',
      provider: 'gemini',
    });
  }
};

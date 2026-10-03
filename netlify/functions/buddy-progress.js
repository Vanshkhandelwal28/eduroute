/**
 * Buddy progress — NO MongoDB.
 * Proxies to Go + Neon on Render when GO_API_URL is set.
 * Otherwise returns safe local defaults (no 500).
 */
const { proxyToGo } = require('./_lib/goProxy');

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

const defaultProgress = {
  points: 0,
  level: 1,
  achievements: ['Welcome to Buddy 🚀'],
  weeklyChallenges: [
    'Complete 3 DSA problems',
    'Ship 1 portfolio section update',
    'Apply to 2 internships',
  ],
  missingSkills: [],
  preferredLanguage: 'english',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });

  // Prefer Go + Neon (Render)
  if (proxyToGo.resolveGoBase()) {
    const qs = event.rawQuery
      ? `?${event.rawQuery}`
      : event.queryStringParameters
        ? `?${new URLSearchParams(event.queryStringParameters).toString()}`
        : '';
    return proxyToGo.forward(event, `/api/buddy-progress${qs}`);
  }

  // No MongoDB, no GO_API_URL — never 500; frontend uses localStorage
  try {
    const userId =
      event.queryStringParameters?.userId ||
      JSON.parse(event.body || '{}')?.userId;
    if (!userId) return json(400, { ok: false, error: 'userId is required.' });

    return json(200, {
      ok: true,
      progress: defaultProgress,
      history: [],
      source: 'local-defaults',
    });
  } catch (error) {
    return json(200, {
      ok: true,
      progress: defaultProgress,
      history: [],
      source: 'local-defaults',
    });
  }
};

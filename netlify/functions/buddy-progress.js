/**
 * Buddy progress — NO MongoDB.
 * - With valid Bearer JWT + GO_API_URL → Go/Neon
 * - Demo / Supabase-only / no token → 200 + local defaults (no 401 in console)
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

function getAuthHeader(event) {
  const h = event.headers || {};
  return h.authorization || h.Authorization || '';
}

/** Real Go JWT is 3 base64 segments; demo tokens like open-student-* are not. */
function hasLikelyJwt(authHeader) {
  const raw = String(authHeader || '').replace(/^Bearer\s+/i, '').trim();
  if (!raw || raw.length < 20) return false;
  if (raw.startsWith('open-') || raw.startsWith('pending-') || raw.startsWith('local-')) return false;
  const parts = raw.split('.');
  return parts.length === 3 && parts.every((p) => p.length > 0);
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });

  const userId =
    event.queryStringParameters?.userId ||
    (() => {
      try {
        return JSON.parse(event.body || '{}')?.userId;
      } catch {
        return null;
      }
    })();

  if (!userId) return json(400, { ok: false, error: 'userId is required.' });

  const auth = getAuthHeader(event);
  const canUseGo = Boolean(proxyToGo.resolveGoBase()) && hasLikelyJwt(auth);

  if (canUseGo) {
    const qs = event.rawQuery
      ? `?${event.rawQuery}`
      : event.queryStringParameters
        ? `?${new URLSearchParams(event.queryStringParameters).toString()}`
        : '';
    try {
      const upstream = await proxyToGo.forward(event, `/api/buddy-progress${qs}`);
      // Never leak 401 to browser for Buddy progress — fall back to defaults
      if (upstream.statusCode === 401 || upstream.statusCode === 403) {
        return json(200, {
          ok: true,
          progress: defaultProgress,
          history: [],
          source: 'local-defaults-unauthorized',
        });
      }
      // Normalize Go envelope { success, data } → { ok, progress }
      try {
        const body = JSON.parse(upstream.body || '{}');
        if (body.success && body.data) {
          return json(200, {
            ok: true,
            progress: {
              points: body.data.points ?? 0,
              level: body.data.level ?? 1,
              achievements: body.data.achievements || defaultProgress.achievements,
              weeklyChallenges: body.data.weeklyChallenges || defaultProgress.weeklyChallenges,
              missingSkills: body.data.missingSkills || [],
              preferredLanguage: body.data.preferredLanguage || 'english',
            },
            history: body.data.history || [],
            source: 'go-neon',
          });
        }
        if (body.ok) return upstream;
      } catch {
        /* pass through */
      }
      if (upstream.statusCode >= 200 && upstream.statusCode < 300) return upstream;
    } catch (e) {
      console.warn('buddy-progress Go proxy failed', e.message);
    }
  }

  // Demo login / no JWT / Go down — always 200 so console stays clean
  return json(200, {
    ok: true,
    progress: defaultProgress,
    history: [],
    source: 'local-defaults',
  });
};

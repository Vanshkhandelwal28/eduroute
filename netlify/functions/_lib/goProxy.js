/**
 * Shared proxy to the Go + Neon API on Render.
 * Netlify env: GO_API_URL=https://eduroute-api-nho4.onrender.com
 */
function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

function options() {
  return json(200, { ok: true });
}

function resolveGoBase() {
  return (process.env.GO_API_URL || process.env.BACKEND_URL || '').trim().replace(/\/$/, '');
}

async function forward(event, path) {
  const base = resolveGoBase();
  if (!base) {
    return json(503, {
      success: false,
      error: 'Set GO_API_URL on Netlify to your Render Go API (e.g. https://eduroute-api-nho4.onrender.com).',
    });
  }

  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;

  try {
    const headers = { 'Content-Type': 'application/json' };
    const auth = event.headers?.authorization || event.headers?.Authorization;
    if (auth) headers.Authorization = auth;
    const uid = event.headers?.['x-user-id'] || event.headers?.['X-User-Id'];
    if (uid) headers['X-User-Id'] = uid;

    const response = await fetch(url, {
      method: event.httpMethod || 'GET',
      headers,
      body: ['GET', 'HEAD'].includes((event.httpMethod || 'GET').toUpperCase())
        ? undefined
        : event.body || undefined,
    });

    const contentType = response.headers.get('content-type') || '';
    let payload;
    if (contentType.includes('application/json')) {
      payload = await response.json();
    } else {
      const text = await response.text();
      payload = {
        success: false,
        error: text?.slice(0, 200) || `Upstream error (${response.status})`,
      };
    }
    return json(response.status, payload);
  } catch (err) {
    console.error('goProxy error', path, err);
    return json(502, {
      success: false,
      error: 'Unable to reach Go backend. Check GO_API_URL.',
    });
  }
}

const proxyToGo = { json, options, forward, resolveGoBase };
module.exports = { proxyToGo };

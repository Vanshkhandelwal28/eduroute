/**
 * Generic proxy to Go + Neon (Render).
 * Netlify redirects pass ?path=/api/... so we know the real backend route.
 * Env: GO_API_URL or BACKEND_URL (no trailing slash)
 */
const { proxyToGo } = require('./_lib/goProxy');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return proxyToGo.options();

  const qp = event.queryStringParameters || {};
  let path = qp.path || event.path || '/api';
  if (!path.startsWith('/')) path = '/' + path;
  if (!path.startsWith('/api')) path = '/api' + path;

  // Rebuild query without the internal `path` param
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(qp)) {
    if (k === 'path' || v == null) continue;
    params.append(k, String(v));
  }
  const qs = params.toString();
  const goPath = path + (qs ? `?${qs}` : '');

  return proxyToGo.forward(event, goPath);
};

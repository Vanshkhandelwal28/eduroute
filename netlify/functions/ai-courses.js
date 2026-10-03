/**
 * Proxy /api/ai-courses → Go + Neon backend (cross-browser persistence).
 */
const { proxyToGo } = require('./_lib/goProxy');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return proxyToGo.options();

  // Preserve path + query string for Go router
  const qs = event.rawQuery || event.queryStringParameters
    ? '?' + (event.rawQuery || new URLSearchParams(event.queryStringParameters || {}).toString())
    : '';
  // Netlify function path may be /api/ai-courses or /ai-courses
  let path = event.path || '/api/ai-courses';
  if (!path.startsWith('/api/')) path = '/api' + (path.startsWith('/') ? path : `/${path}`);
  // Support /api/ai-courses/:id
  const m = path.match(/\/api\/ai-courses(\/.*)?$/);
  const goPath = m ? `/api/ai-courses${m[1] || ''}${qs}` : `/api/ai-courses${qs}`;

  return proxyToGo.forward(event, goPath);
};

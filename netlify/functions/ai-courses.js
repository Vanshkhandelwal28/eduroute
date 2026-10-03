/** /api/ai-courses → Go + Neon. Env: GO_API_URL */
const { proxyToGo } = require('./_lib/goProxy');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return proxyToGo.options();

  const qs = event.rawQuery
    ? `?${event.rawQuery}`
    : event.queryStringParameters
      ? `?${new URLSearchParams(
          Object.fromEntries(
            Object.entries(event.queryStringParameters || {}).filter(([k]) => k !== 'path'),
          ),
        ).toString()}`
      : '';

  // Support /api/ai-courses/:id via redirect splat if present
  const id = event.queryStringParameters?.id || event.pathParameters?.id;
  const goPath = id
    ? `/api/ai-courses/${encodeURIComponent(id)}${qs}`
    : `/api/ai-courses${qs}`;

  return proxyToGo.forward(event, goPath);
};

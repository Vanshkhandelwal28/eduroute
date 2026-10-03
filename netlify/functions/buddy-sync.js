/**
 * /api/buddy/sync → Go + Neon on Render
 * Env: GO_API_URL=https://eduroute-api-nho4.onrender.com
 */
const { proxyToGo } = require('./_lib/goProxy');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return proxyToGo.options();

  const qs = event.rawQuery
    ? `?${event.rawQuery}`
    : event.queryStringParameters
      ? `?${new URLSearchParams(event.queryStringParameters).toString()}`
      : '';

  return proxyToGo.forward(event, `/api/buddy/sync${qs}`);
};

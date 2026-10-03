/** /api/user-data → Go + Neon generic JSON store */
const { proxyToGo } = require('./_lib/goProxy');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return proxyToGo.options();

  const qs = event.rawQuery
    ? `?${event.rawQuery}`
    : event.queryStringParameters
      ? `?${new URLSearchParams(event.queryStringParameters).toString()}`
      : '';

  return proxyToGo.forward(event, `/api/user-data${qs}`);
};

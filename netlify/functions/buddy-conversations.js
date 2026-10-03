/**
 * Proxy /api/buddy-conversations → Go Neon buddy_conversations + messages.
 */
const { proxyToGo } = require('./_lib/goProxy');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return proxyToGo.options();

  const qs = event.rawQuery
    ? `?${event.rawQuery}`
    : event.queryStringParameters
      ? `?${new URLSearchParams(event.queryStringParameters).toString()}`
      : '';

  // Map flat Netlify function to Go nested routes
  let goPath = `/api/buddy/conversations${qs}`;
  const id = event.queryStringParameters?.id;
  if (event.queryStringParameters?.messages === '1' && id) {
    goPath = `/api/buddy/conversations/${encodeURIComponent(id)}/messages`;
  }

  return proxyToGo.forward(
    {
      ...event,
      // Ensure path is what Go expects
      path: goPath,
    },
    goPath,
  );
};

/**
 * Buddy chat — NO MongoDB persistence.
 * AI reply via Netlify AI client; optional persist via Go + Neon when GO_API_URL is set.
 */
const { generateBuddyReply } = require('./_lib/aiClient');
const { buddyEnvSummary } = require('./_lib/envCheck');
const { proxyToGo } = require('./_lib/goProxy');

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });

  try {
    const payload = JSON.parse(event.body || '{}');
    const { userId, message, language = 'english' } = payload;

    if (!userId || typeof message !== 'string' || !message.trim()) {
      return json(400, { ok: false, error: 'userId and message are required.' });
    }
    if (message.length > 2000) {
      return json(413, { ok: false, error: 'Please keep your message under 2000 characters.' });
    }

    // If Go backend is configured, also forward for Neon persistence (best-effort)
    if (proxyToGo.resolveGoBase()) {
      try {
        const upstream = await proxyToGo.forward(event, '/api/buddy-chat');
        // If Go returned a useful reply, pass it through
        if (upstream.statusCode >= 200 && upstream.statusCode < 300) {
          const body = JSON.parse(upstream.body || '{}');
          if (body.reply || body.data?.reply || body.ok) {
            // Normalize to frontend shape
            const reply =
              body.reply ||
              body.data?.reply ||
              (typeof body.data === 'string' ? body.data : null);
            if (reply) {
              return json(200, {
                ok: true,
                reply,
                usedWebSearch: Boolean(body.usedWebSearch),
                sources: body.sources || [],
                gamification: body.gamification || body.data?.gamification || {
                  points: 5,
                  level: 1,
                  pointsEarned: 5,
                },
                source: 'go-neon',
              });
            }
          }
        }
      } catch (e) {
        console.warn('Go buddy-chat proxy failed, using Netlify AI only', e.message);
      }
    }

    // Netlify AI only — no MongoDB
    const recentMessages = [{ role: 'user', content: message.trim() }];
    const envSnap = buddyEnvSummary();
    console.log('[buddy-chat] env', JSON.stringify(envSnap));

    const { reply: aiReply, usedWebSearch = false, sources = [] } = await generateBuddyReply({
      messages: recentMessages,
      language,
    });

    const pointsEarned = usedWebSearch ? 8 : 5;
    const limited =
      typeof aiReply === 'string' && /limited mode|No AI key found/i.test(aiReply);

    return json(200, {
      ok: true,
      reply: aiReply,
      usedWebSearch,
      sources,
      gamification: {
        points: pointsEarned,
        level: 1,
        pointsEarned,
      },
      source: 'netlify-ai-no-mongo',
      ...(limited ? { env: envSnap } : {}),
    });
  } catch (error) {
    console.error('buddy-chat error', error);
    return json(500, {
      ok: false,
      error: error.message || 'Failed to process Buddy chat.',
      env: buddyEnvSummary(),
    });
  }
};

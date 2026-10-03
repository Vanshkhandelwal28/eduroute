/**
 * Buddy chat — AI reply via Netlify AI (Groq/Gemini).
 * Go/Neon is optional for persistence only; never use Go body as AI reply unless it has real reply text.
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

function normalizeReply(body) {
  if (!body || typeof body !== 'object') return null;
  const candidates = [body.reply, body.data && body.data.reply, typeof body.data === 'string' ? body.data : null];
  for (let i = 0; i < candidates.length; i++) {
    const r = candidates[i];
    if (typeof r === 'string' && r.trim()) return r.trim();
  }
  return null;
}

/** Reject echo / empty / same-as-user replies from upstream */
function isUsableAiReply(reply, userMessage) {
  if (!reply || typeof reply !== 'string') return false;
  const r = reply.trim();
  const u = String(userMessage || '').trim();
  if (!r) return false;
  if (u && r === u) return false;
  if (u && r.length < 40 && r.toLowerCase().includes(u.toLowerCase()) && r.length <= u.length + 5) return false;
  return true;
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

    const userText = message.trim();

    // 1) Always generate AI reply on Netlify (Groq / Gemini)
    const recentMessages = [{ role: 'user', content: userText }];
    const envSnap = buddyEnvSummary();
    console.log('[buddy-chat] env', JSON.stringify(envSnap));

    const { reply: aiReply, usedWebSearch = false, sources = [] } = await generateBuddyReply({
      messages: recentMessages,
      language,
    });

    let finalReply = aiReply;
    let source = 'netlify-ai';

    // 2) Optional: try Go only if Netlify AI failed or limited mode — never prefer Go echo
    if (!isUsableAiReply(finalReply, userText) && proxyToGo.resolveGoBase()) {
      try {
        const upstream = await proxyToGo.forward(event, '/api/buddy-chat');
        if (upstream.statusCode >= 200 && upstream.statusCode < 300) {
          const body = JSON.parse(upstream.body || '{}');
          const goReply = normalizeReply(body);
          if (isUsableAiReply(goReply, userText)) {
            finalReply = goReply;
            source = 'go-neon';
          }
        }
      } catch (e) {
        console.warn('Go buddy-chat proxy failed', e.message);
      }
    } else if (proxyToGo.resolveGoBase()) {
      // Fire-and-forget persistence — do not use response as AI text
      try {
        void proxyToGo.forward(event, '/api/buddy-chat').catch(function () {});
      } catch {
        /* ignore */
      }
    }

    if (!isUsableAiReply(finalReply, userText)) {
      finalReply =
        "I'm Buddy — I couldn't reach the AI service just now. Please try again in a moment, or check that GROQ_API_KEY is set on Netlify.";
      source = 'fallback';
    }

    const pointsEarned = usedWebSearch ? 8 : 5;
    const limited =
      typeof finalReply === 'string' && /limited mode|No AI key found|GROQ_API_KEY/i.test(finalReply);

    return json(200, {
      ok: true,
      reply: finalReply,
      usedWebSearch,
      sources,
      gamification: {
        points: pointsEarned,
        level: 1,
        pointsEarned,
      },
      source,
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

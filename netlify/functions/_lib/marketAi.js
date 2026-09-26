/**
 * Market trends AI: prefer Gemini, on 404/503 fall through models, then Groq.
 * Does not change Buddy/Groq defaults elsewhere.
 */
function env(name) {
  try {
    return (typeof process !== 'undefined' && process.env && process.env[name]) || '';
  } catch {
    return '';
  }
}

/** Preferred Gemini models — first available wins. */
const GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-flash-latest',
];

const GROQ_MODELS = [
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
  'openai/gpt-oss-20b',
];

const RETIRED_OR_BLOCKED = /gemini-1\.5|gemini-pro$/i;

async function callGeminiOnce({ apiKey, model, messages, temperature }) {
  const prompt = messages
    .map(function (m) {
      return m.role.toUpperCase() + ': ' + m.content;
    })
    .join('\n');
  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/' +
      model +
      ':generateContent?key=' +
      apiKey,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: temperature == null ? 0.4 : temperature,
          responseMimeType: 'application/json',
        },
      }),
    },
  );
  const text = await response.text();
  if (!response.ok) {
    const err = new Error('Gemini error: ' + text.slice(0, 500));
    err.status = response.status;
    err.body = text;
    throw err;
  }
  const data = JSON.parse(text);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function isRetryableGemini(err) {
  const s = String((err && (err.body || err.message)) || '');
  const status = err && err.status;
  return (
    status === 404 ||
    status === 429 ||
    status === 503 ||
    s.includes('NOT_FOUND') ||
    s.includes('is not found') ||
    s.includes('no longer available') ||
    s.includes('UNAVAILABLE') ||
    s.includes('high demand') ||
    s.includes('RESOURCE_EXHAUSTED') ||
    s.includes('not supported for generateContent')
  );
}

async function callGeminiWithFallback({ apiKey, model, messages, temperature }) {
  const preferred = (model || '').trim();
  const list = [];
  if (preferred) list.push(preferred);
  GEMINI_MODELS.forEach(function (m) {
    if (list.indexOf(m) === -1) list.push(m);
  });

  let lastErr;
  for (let i = 0; i < list.length; i++) {
    try {
      return {
        text: await callGeminiOnce({
          apiKey: apiKey,
          model: list[i],
          messages: messages,
          temperature: temperature,
        }),
        provider: 'gemini',
        model: list[i],
      };
    } catch (e) {
      lastErr = e;
      if (isRetryableGemini(e)) continue;
      throw e;
    }
  }
  throw lastErr || new Error('Gemini: no working model');
}

async function callGroqOnce({ apiKey, model, messages, temperature }) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + apiKey,
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      temperature: temperature == null ? 0.4 : temperature,
      response_format: { type: 'json_object' },
    }),
  });
  const text = await response.text();
  if (!response.ok) {
    const err = new Error('Groq error: ' + text.slice(0, 400));
    err.status = response.status;
    err.body = text;
    throw err;
  }
  const data = JSON.parse(text);
  return data.choices?.[0]?.message?.content || '';
}

async function callGroqWithFallback({ apiKey, messages, temperature }) {
  const preferred = (env('GROQ_MODEL') || 'llama-3.1-8b-instant').trim();
  const list = [];
  if (preferred) list.push(preferred);
  GROQ_MODELS.forEach(function (m) {
    if (list.indexOf(m) === -1) list.push(m);
  });

  let lastErr;
  for (let i = 0; i < list.length; i++) {
    try {
      return {
        text: await callGroqOnce({
          apiKey: apiKey,
          model: list[i],
          messages: messages,
          temperature: temperature,
        }),
        provider: 'groq',
        model: list[i],
      };
    } catch (e) {
      lastErr = e;
      const msg = String((e && (e.body || e.message)) || '');
      const skip =
        (e && e.status === 404) ||
        /model_not_found|does not exist|do not have access/i.test(msg);
      if (skip) continue;
      throw e;
    }
  }
  throw lastErr || new Error('Groq: no working model');
}

/**
 * Prefer Gemini; on overload/404 try other Gemini models; then Groq.
 * Returns plain text (JSON string). Attaches .provider on the result via wrapper.
 */
async function generateMarketAi(messages, temperature) {
  const geminiKey = env('GEMINI_API_KEY');
  const groqKey = env('GROQ_API_KEY');

  if (geminiKey) {
    let model = (env('GEMINI_MODEL') || 'gemini-3.8-flash').trim();
    if (RETIRED_OR_BLOCKED.test(model)) model = 'gemini-3.8-flash';
    try {
      const res = await callGeminiWithFallback({
        apiKey: geminiKey,
        model: model,
        messages: messages,
        temperature: temperature,
      });
      return res;
    } catch (geminiErr) {
      console.warn('Gemini failed for market AI, trying Groq:', String(geminiErr && geminiErr.message).slice(0, 200));
      if (!groqKey) throw geminiErr;
    }
  }

  if (groqKey) {
    return callGroqWithFallback({
      apiKey: groqKey,
      messages: messages,
      temperature: temperature,
    });
  }

  throw new Error('No GEMINI_API_KEY or GROQ_API_KEY configured in Netlify');
}

/** Back-compat: returns text only */
async function generateWithGemini(messages, temperature) {
  const res = await generateMarketAi(messages, temperature);
  return typeof res === 'string' ? res : res.text;
}

function extractJsonObject(text) {
  if (!text) return null;
  const cleaned = String(text)
    .replace(/```json\s*/gi, '')
    .replace(/```/g, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch (_) {}
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (m) {
    try {
      return JSON.parse(m[0]);
    } catch (_) {}
  }
  return null;
}

module.exports = {
  generateWithGemini: generateWithGemini,
  generateMarketAi: generateMarketAi,
  extractJsonObject: extractJsonObject,
};

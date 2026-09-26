/**
 * Gemini-only helpers for market trends (does not change Buddy/Groq defaults).
 * Default model: gemini-2.5-flash (gemini-1.5-flash is retired / NOT_FOUND).
 */
function env(name) {
  try {
    return (typeof process !== 'undefined' && process.env && process.env[name]) || '';
  } catch {
    return '';
  }
}

/** Preferred models — first available wins. Override with GEMINI_MODEL on Netlify. */
const MODEL_CANDIDATES = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-flash-latest',
];

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

function isModelNotFound(err) {
  const s = String(err && (err.body || err.message) || '');
  return (
    (err && err.status === 404) ||
    s.includes('NOT_FOUND') ||
    s.includes('is not found') ||
    s.includes('not supported for generateContent')
  );
}

async function callGemini({ apiKey, model, messages, temperature }) {
  const preferred = (model || '').trim();
  const list = [];
  if (preferred) list.push(preferred);
  MODEL_CANDIDATES.forEach(function (m) {
    if (list.indexOf(m) === -1) list.push(m);
  });

  let lastErr;
  for (let i = 0; i < list.length; i++) {
    try {
      return await callGeminiOnce({
        apiKey: apiKey,
        model: list[i],
        messages: messages,
        temperature: temperature,
      });
    } catch (e) {
      lastErr = e;
      if (isModelNotFound(e)) continue;
      throw e;
    }
  }
  throw lastErr || new Error('Gemini: no working model');
}

async function generateWithGemini(messages, temperature) {
  const apiKey = env('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set in Netlify env');
  // Ignore retired names if still set in Netlify env
  let model = env('GEMINI_MODEL') || 'gemini-2.5-flash';
  if (/gemini-1\.5/i.test(model) || /gemini-pro/i.test(model)) {
    model = 'gemini-2.5-flash';
  }
  return callGemini({
    apiKey: apiKey,
    model: model,
    messages: messages,
    temperature: temperature,
  });
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
  extractJsonObject: extractJsonObject,
};

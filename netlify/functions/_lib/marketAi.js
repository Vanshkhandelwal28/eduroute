/**
 * Gemini-only helpers for market trends (does not change Buddy/Groq defaults).
 */
function env(name) {
  try {
    return (typeof process !== 'undefined' && process.env && process.env[name]) || '';
  } catch {
    return '';
  }
}

async function callGemini({ apiKey, model, messages, temperature }) {
  const prompt = messages
    .map(function (m) {
      return m.role.toUpperCase() + ': ' + m.content;
    })
    .join('\n');
  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/' +
      (model || 'gemini-1.5-flash') +
      ':generateContent?key=' +
      apiKey,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: temperature == null ? 0.4 : temperature },
      }),
    },
  );
  if (!response.ok) throw new Error('Gemini error: ' + (await response.text()).slice(0, 400));
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function generateWithGemini(messages, temperature) {
  const apiKey = env('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set in Netlify env');
  return callGemini({
    apiKey: apiKey,
    model: env('GEMINI_MODEL') || 'gemini-1.5-flash',
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

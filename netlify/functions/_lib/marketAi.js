/**
 * Market trends AI — fast path for Netlify 10s limit.
 * Order: Gemini (1 model, ~4s timeout) → Groq (1 fast model) → throw.
 * No long model loops (those caused HTTP 504).
 */
function env(name) {
  try {
    return (typeof process !== 'undefined' && process.env && process.env[name]) || '';
  } catch {
    return '';
  }
}

const RETIRED_OR_BLOCKED = /gemini-1\.5|gemini-pro$/i;

function withTimeout(promise, ms, label) {
  return new Promise(function (resolve, reject) {
    const t = setTimeout(function () {
      reject(new Error((label || 'AI') + ' timeout after ' + ms + 'ms'));
    }, ms);
    promise.then(
      function (v) {
        clearTimeout(t);
        resolve(v);
      },
      function (e) {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

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
          temperature: temperature == null ? 0.3 : temperature,
          responseMimeType: 'application/json',
        },
      }),
    },
  );
  const text = await response.text();
  if (!response.ok) {
    const err = new Error('Gemini error: ' + text.slice(0, 400));
    err.status = response.status;
    err.body = text;
    throw err;
  }
  const data = JSON.parse(text);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
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
      temperature: temperature == null ? 0.3 : temperature,
      response_format: { type: 'json_object' },
    }),
  });
  const text = await response.text();
  if (!response.ok) {
    // Retry once without response_format if rejected
    if (/response_format|json_object|not supported/i.test(text)) {
      const response2 = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + apiKey,
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: temperature == null ? 0.3 : temperature,
        }),
      });
      const text2 = await response2.text();
      if (!response2.ok) {
        const err = new Error('Groq error: ' + text2.slice(0, 300));
        err.status = response2.status;
        throw err;
      }
      const data2 = JSON.parse(text2);
      return data2.choices?.[0]?.message?.content || '';
    }
    const err = new Error('Groq error: ' + text.slice(0, 300));
    err.status = response.status;
    err.body = text;
    throw err;
  }
  const data = JSON.parse(text);
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Fast market AI: at most one Gemini attempt (~4s) then one Groq attempt (~4s).
 */
async function generateMarketAi(messages, temperature) {
  const geminiKey = env('GEMINI_API_KEY');
  const groqKey = env('GROQ_API_KEY');
  let geminiErr = null;

  if (geminiKey) {
    let model = (env('GEMINI_MODEL') || 'gemini-3.8-flash').trim();
    if (RETIRED_OR_BLOCKED.test(model) || /gemini-2\.5-flash|gemini-2\.0-flash/i.test(model)) {
      model = 'gemini-3.8-flash';
    }
    try {
      const text = await withTimeout(
        callGeminiOnce({
          apiKey: geminiKey,
          model: model,
          messages: messages,
          temperature: temperature,
        }),
        4500,
        'Gemini',
      );
      return { text: text, provider: 'gemini', model: model };
    } catch (e) {
      geminiErr = e;
      console.warn('Gemini market AI skip:', String(e && e.message).slice(0, 180));
    }
  }

  if (groqKey) {
    const model = (env('GROQ_MODEL') || 'llama-3.1-8b-instant').trim();
    try {
      const text = await withTimeout(
        callGroqOnce({
          apiKey: groqKey,
          model: model,
          messages: messages,
          temperature: temperature,
        }),
        4500,
        'Groq',
      );
      return { text: text, provider: 'groq', model: model };
    } catch (e) {
      console.warn('Groq market AI fail:', String(e && e.message).slice(0, 180));
      throw e;
    }
  }

  if (geminiErr) throw geminiErr;
  throw new Error('No GEMINI_API_KEY or GROQ_API_KEY configured in Netlify');
}

async function generateWithGemini(messages, temperature) {
  const res = await generateMarketAi(messages, temperature);
  return typeof res === 'string' ? res : res.text;
}

function extractJsonObject(text) {
  if (!text) return null;
  let cleaned = String(text)
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (_) {}

  const start = cleaned.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(cleaned.slice(start, i + 1));
        } catch (_) {
          break;
        }
      }
    }
  }

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

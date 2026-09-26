/**
 * Market AI — prioritize reliability under Netlify 10s limit.
 * Order: Groq model A → Groq model B → Gemini once.
 * (Groq is already proven live for Buddy; Gemini often 503/timeout.)
 */
function env(name) {
  try {
    return (typeof process !== 'undefined' && process.env && process.env[name]) || '';
  } catch {
    return '';
  }
}

const RETIRED = /gemini-1\.5|gemini-pro$|gemini-2\.5-flash|gemini-2\.0-flash/i;

function withTimeout(promise, ms, label) {
  return new Promise(function (resolve, reject) {
    const t = setTimeout(function () {
      reject(new Error((label || 'AI') + ' timeout ' + ms + 'ms'));
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

async function callGemini({ apiKey, model, messages, temperature }) {
  const prompt = messages
    .map(function (m) {
      return (m.role === 'system' ? 'System: ' : 'User: ') + m.content;
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
          temperature: temperature == null ? 0.45 : temperature,
          maxOutputTokens: 1800,
          responseMimeType: 'application/json',
        },
      }),
    },
  );
  const text = await response.text();
  if (!response.ok) {
    const err = new Error('Gemini ' + response.status + ': ' + text.slice(0, 180));
    err.status = response.status;
    throw err;
  }
  const data = JSON.parse(text);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function callGroq({ apiKey, model, messages, temperature, useJsonMode }) {
  const body = {
    model: model,
    messages: messages,
    temperature: temperature == null ? 0.45 : temperature,
    max_tokens: 1800,
  };
  if (useJsonMode !== false) body.response_format = { type: 'json_object' };
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + apiKey,
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    const err = new Error('Groq ' + response.status + ': ' + text.slice(0, 180));
    err.status = response.status;
    err.body = text;
    throw err;
  }
  const data = JSON.parse(text);
  return data.choices?.[0]?.message?.content || '';
}

async function tryGroq(apiKey, messages, temperature, errors) {
  const preferred = (env('GROQ_MODEL') || 'llama-3.1-8b-instant').trim();
  const models = [preferred, 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant'].filter(
    function (m, i, arr) {
      return m && arr.indexOf(m) === i;
    },
  ).slice(0, 2);

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      const text = await withTimeout(
        callGroq({
          apiKey: apiKey,
          model: model,
          messages: messages,
          temperature: temperature,
          useJsonMode: true,
        }),
        6000,
        'Groq',
      );
      if (text && text.trim()) return { text: text, provider: 'groq', model: model };
    } catch (e) {
      const msg = String((e && (e.body || e.message)) || e);
      if (/response_format|json_object|not supported/i.test(msg)) {
        try {
          const text2 = await withTimeout(
            callGroq({
              apiKey: apiKey,
              model: model,
              messages: messages,
              temperature: temperature,
              useJsonMode: false,
            }),
            5000,
            'Groq',
          );
          if (text2 && text2.trim()) return { text: text2, provider: 'groq', model: model };
        } catch (e2) {
          errors.push('groq-' + model + ': ' + String(e2.message || e2).slice(0, 90));
        }
      } else {
        errors.push('groq-' + model + ': ' + String(e.message || e).slice(0, 90));
      }
      console.warn('Groq skip', model, e.message);
    }
  }
  return null;
}

async function tryGemini(apiKey, messages, temperature, errors) {
  let model = (env('GEMINI_MODEL') || 'gemini-3.8-flash').trim();
  if (RETIRED.test(model)) model = 'gemini-3.8-flash';
  try {
    const text = await withTimeout(
      callGemini({
        apiKey: apiKey,
        model: model,
        messages: messages,
        temperature: temperature,
      }),
      5500,
      'Gemini',
    );
    if (text && text.trim()) return { text: text, provider: 'gemini', model: model };
  } catch (e) {
    errors.push('gemini: ' + String(e.message || e).slice(0, 90));
    console.warn('Gemini skip', e.message);
  }
  return null;
}

/**
 * Live path: Groq x2 → Gemini x1 (best chance of non-baseline data on Netlify).
 */
async function generateMarketAi(messages, temperature) {
  const geminiKey = env('GEMINI_API_KEY');
  const groqKey = env('GROQ_API_KEY');
  const errors = [];

  if (groqKey) {
    const res = await tryGroq(groqKey, messages, temperature, errors);
    if (res) return res;
  }

  if (geminiKey) {
    const res = await tryGemini(geminiKey, messages, temperature, errors);
    if (res) return res;
  }

  throw new Error(
    'All AI failed. ' + (errors.length ? errors.join(' | ') : 'No GROQ_API_KEY / GEMINI_API_KEY'),
  );
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

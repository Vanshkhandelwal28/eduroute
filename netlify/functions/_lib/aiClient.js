/** AI client — Buddy: Groq first (2 models), then Gemini. Never block on bad model ids. */
function env(name) {
  try {
    return (typeof process !== 'undefined' && process.env && process.env[name]) || '';
  } catch {
    return '';
  }
}

function needsWebSearch() {
  return false;
}

async function performWebSearch() {
  return { results: [], answer: '' };
}

function withTimeout(promise, ms, label) {
  return new Promise(function (resolve, reject) {
    const t = setTimeout(function () {
      reject(new Error((label || 'AI') + ' timeout'));
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

const GROQ_MODELS = [
  env('GROQ_MODEL') || 'llama-3.1-8b-instant',
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
].filter(function (m, i, arr) {
  return m && arr.indexOf(m) === i;
});

const GEMINI_MODELS = [
  env('GEMINI_MODEL') || '',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
].filter(function (m) {
  return m && !/3\.8|gemini-pro$/i.test(m);
});

async function generateBuddyReply({ messages, language }) {
  const last =
    (messages && messages[messages.length - 1] && messages[messages.length - 1].content) || '';
  const geminiKey = env('GEMINI_API_KEY');
  const groqKey = env('GROQ_API_KEY');
  const sys =
    "You are Buddy, EDUROUTE's friendly AI learning assistant. Give clear, practical answers for students. Keep replies concise (under 400 words). Language: " +
    (language || 'english');

  async function groqOnce(model, prompt) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + groqKey,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 1200,
      }),
    });
    const data = await res.json().catch(function () {
      return {};
    });
    if (!res.ok) {
      throw new Error((data.error && data.error.message) || 'Groq ' + res.status + ' ' + model);
    }
    const content =
      data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!content || !String(content).trim()) throw new Error('Empty Groq: ' + model);
    return String(content);
  }

  async function geminiOnce(model, prompt) {
    const url =
      'https://generativelanguage.googleapis.com/v1beta/models/' +
      model +
      ':generateContent?key=' +
      encodeURIComponent(geminiKey);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: sys + '\n\nUser: ' + prompt }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 1200 },
      }),
    });
    const data = await res.json().catch(function () {
      return {};
    });
    if (!res.ok) {
      throw new Error((data.error && data.error.message) || 'Gemini ' + res.status + ' ' + model);
    }
    const text =
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts
        ? data.candidates[0].content.parts.map(function (p) {
            return p.text || '';
          }).join('')
        : '';
    if (!text || !String(text).trim()) throw new Error('Empty Gemini: ' + model);
    return String(text);
  }

  const errors = [];

  if (groqKey) {
    for (let i = 0; i < GROQ_MODELS.length; i++) {
      const model = GROQ_MODELS[i];
      try {
        const reply = await withTimeout(groqOnce(model, last), 7000, 'Groq');
        return { reply: reply, usedWebSearch: false, sources: [], provider: 'groq', model: model };
      } catch (e) {
        errors.push('groq:' + model + '=' + String(e.message || e).slice(0, 80));
        console.warn('Buddy groq skip', model, e.message);
      }
    }
  } else {
    errors.push('GROQ_API_KEY missing');
  }

  if (geminiKey) {
    for (let i = 0; i < GEMINI_MODELS.length; i++) {
      const model = GEMINI_MODELS[i];
      try {
        const reply = await withTimeout(geminiOnce(model, last), 7000, 'Gemini');
        return { reply: reply, usedWebSearch: false, sources: [], provider: 'gemini', model: model };
      } catch (e) {
        errors.push('gemini:' + model + '=' + String(e.message || e).slice(0, 80));
        console.warn('Buddy gemini skip', model, e.message);
      }
    }
  } else {
    errors.push('GEMINI_API_KEY missing');
  }

  console.error('Buddy all AI failed', errors.join(' | '));
  return {
    reply:
      'I am Buddy in limited mode (AI keys unavailable on this deploy). You asked: "' +
      String(last).slice(0, 180) +
      '". Set GROQ_API_KEY on Netlify (Deploy previews + Production) and redeploy.',
    usedWebSearch: false,
    sources: [],
    provider: 'limited',
  };
}

module.exports = {
  generateBuddyReply: generateBuddyReply,
  needsWebSearch: needsWebSearch,
  performWebSearch: performWebSearch,
};

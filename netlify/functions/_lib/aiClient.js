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

/** Helpful offline reply when no API keys or all providers fail. */
function limitedModeReply(last, language) {
  const q = String(last || '').trim().slice(0, 200);
  const lang = (language || 'english').toLowerCase();

  const intro =
    lang === 'hindi'
      ? 'मैं Buddy हूँ। अभी AI keys उपलब्ध नहीं हैं, फिर भी आपकी guide कर सकता हूँ।'
      : lang === 'hinglish'
        ? 'Main Buddy hoon. Abhi AI keys offline hain, lekin main aapko solid guidance de sakta hoon.'
        : 'I am Buddy. AI keys are offline on this deploy, but I can still guide you.';

  const plan =
    lang === 'hindi'
      ?
          'Beginner → Intermediate → Pro:\n' +
          '1) Beginner: fundamentals + 1 mini project\n' +
          '2) Intermediate: frameworks + APIs + portfolio update\n' +
          '3) Pro: system design, testing, interview prep + internship applications\n\n' +
          'Weekly challenge: एक project milestone पूरा करें और एक mock interview करें।'
      : lang === 'hinglish'
        ?
          'Beginner → Intermediate → Pro:\n' +
          '1) Beginner: fundamentals + 1 mini project\n' +
          '2) Intermediate: frameworks + APIs + portfolio update\n' +
          '3) Pro: system design, testing, interview prep + internship applications\n\n' +
          'Weekly challenge: complete one project milestone aur ek mock interview.'
        :
          'Beginner → Intermediate → Pro plan:\n' +
          '1) Beginner: strengthen fundamentals + 1 mini project.\n' +
          '2) Intermediate: framework mastery + API integration + portfolio update.\n' +
          '3) Pro: system design, testing, interview prep, and internship applications.\n\n' +
          'Weekly challenge: complete one project milestone and one mock interview.';

  const based =
    q
      ? lang === 'hindi'
        ? `आपने पूछा: "${q}"\n\n`
        : lang === 'hinglish'
          ? `Aapne pucha: "${q}"\n\n`
          : `Based on: "${q}"\n\n`
      : '';

  const opsNote =
    '\n\n_(Ops: set GROQ_API_KEY or GEMINI_API_KEY on Netlify for Production + Deploy previews, then redeploy for full AI.)_';

  return intro + '\n\n' + based + plan + opsNote;
}

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
    reply: limitedModeReply(last, language),
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

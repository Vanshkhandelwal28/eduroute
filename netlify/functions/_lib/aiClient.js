/** AI client — Gemini first (multi-model), Groq fallback. */
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

function isValidGeminiModel(m) {
  if (!m || typeof m !== 'string') return false;
  if (/3\.8|gemini-pro$/i.test(m)) return false;
  return true;
}
const GEMINI_MODELS = [
  env('GEMINI_MODEL') || '',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
].filter(isValidGeminiModel);

const GROQ_MODELS = [
  env('GROQ_MODEL') || '',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'llama-3.1-70b-versatile',
].filter(Boolean);

async function generateBuddyReply({ messages, language }) {
  const last =
    (messages && messages[messages.length - 1] && messages[messages.length - 1].content) || '';
  const geminiKey = env('GEMINI_API_KEY');
  const groqKey = env('GROQ_API_KEY');
  const sys =
    "You are Buddy, EDUROUTE's AI assistant. Answer helpfully. Language: " + (language || 'english');

  async function gemini(prompt) {
    let lastErr = null;
    for (const model of GEMINI_MODELS) {
      try {
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
            generationConfig: { temperature: 0.5, maxOutputTokens: 4096 },
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          lastErr = new Error((data.error && data.error.message) || 'Gemini failed: ' + model);
          continue;
        }
        const text =
          data.candidates &&
          data.candidates[0] &&
          data.candidates[0].content &&
          data.candidates[0].content.parts
            ? data.candidates[0].content.parts.map(function (p) { return p.text || ''; }).join('')
            : '';
        if (!text) {
          lastErr = new Error('Empty Gemini: ' + model);
          continue;
        }
        return text;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error('Gemini failed');
  }

  async function groq(prompt) {
    let lastErr = null;
    for (const model of GROQ_MODELS) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + groqKey,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: sys },
              { role: 'user', content: prompt },
            ],
            temperature: 0.5,
            max_tokens: 4096,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          lastErr = new Error((data.error && data.error.message) || 'Groq failed: ' + model);
          continue;
        }
        const content =
          data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        if (!content) {
          lastErr = new Error('Empty Groq: ' + model);
          continue;
        }
        return content;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error('Groq failed');
  }

  try {
    if (geminiKey) {
      try {
        const reply = await gemini(last);
        return { reply: reply, usedWebSearch: false, sources: [] };
      } catch (e) {
        console.warn('gemini fail', e.message);
      }
    }
    if (groqKey) {
      const reply = await groq(last);
      return { reply: reply, usedWebSearch: false, sources: [] };
    }
  } catch (e) {
    console.warn('AI fail', e.message);
  }
  return {
    reply:
      'I am Buddy in limited mode (AI keys or network unavailable). You asked: "' +
      String(last).slice(0, 200) +
      '". Please try again shortly.',
    usedWebSearch: false,
    sources: [],
  };
}

module.exports = {
  generateBuddyReply: generateBuddyReply,
  needsWebSearch: needsWebSearch,
  performWebSearch: performWebSearch,
};

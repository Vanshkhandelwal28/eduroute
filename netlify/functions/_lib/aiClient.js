/** Temporary compact AI client — Gemini first, Groq fallback. */
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

async function generateBuddyReply({ messages, language }) {
  const last =
    (messages && messages[messages.length - 1] && messages[messages.length - 1].content) || '';
  const geminiKey = env('GEMINI_API_KEY');
  const groqKey = env('GROQ_API_KEY');
  const sys =
    "You are Buddy, EDUROUTE's AI assistant. Answer helpfully. Language: " + (language || 'english');

  async function gemini(prompt) {
    const model = env('GEMINI_MODEL') || 'gemini-1.5-flash';
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
        generationConfig: { temperature: 0.5 },
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error((data.error && data.error.message) || 'Gemini failed');
    const text =
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts
        .map(function (p) {
          return p.text || '';
        })
        .join('');
    if (!text) throw new Error('Empty Gemini');
    return text;
  }

  async function groq(prompt) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + groqKey,
      },
      body: JSON.stringify({
        model: env('GROQ_MODEL') || 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: prompt },
        ],
        temperature: 0.5,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error((data.error && data.error.message) || 'Groq failed');
    return data.choices[0].message.content;
  }

  try {
    if (geminiKey) {
      try {
        const reply = await gemini(last);
        return { reply: reply, usedWebSearch: false, sources: [] };
      } catch (e) {
        console.warn('stub gemini fail', e.message);
      }
    }
    if (groqKey) {
      const reply = await groq(last);
      return { reply: reply, usedWebSearch: false, sources: [] };
    }
  } catch (e) {
    console.warn('stub AI fail', e.message);
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

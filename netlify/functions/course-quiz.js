/**
 * Dedicated final-assessment quiz generation.
 * Gemini first (JSON mode, multi-model) → Groq fallback. Returns strict JSON questions.
 */
const { buddyEnvSummary } = require('./_lib/envCheck');

function env(name) {
  try {
    return (process.env && process.env[name]) || '';
  } catch {
    return '';
  }
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

function extractJson(text) {
  if (!text) return null;
  const cleaned = String(text)
    .replace(/```json\s*/gi, '')
    .replace(/```/g, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch (_) {}
  const m = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (m) {
    try {
      return JSON.parse(m[0]);
    } catch (_) {}
  }
  return null;
}

const GEMINI_MODELS = [
  env('GEMINI_MODEL') || '',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-2.0-flash-lite',
].filter(Boolean);

async function callGemini(prompt) {
  const apiKey = env('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY missing');
  let lastErr = null;
  for (const model of GEMINI_MODELS) {
    try {
      const url =
        'https://generativelanguage.googleapis.com/v1beta/models/' +
        model +
        ':generateContent?key=' +
        encodeURIComponent(apiKey);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
          },
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
          ? data.candidates[0].content.parts.map((p) => p.text || '').join('')
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

async function callGroq(prompt) {
  const apiKey = env('GROQ_API_KEY');
  if (!apiKey) throw new Error('GROQ_API_KEY missing');
  const models = [
    env('GROQ_MODEL') || '',
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'llama-3.1-70b-versatile',
  ].filter(Boolean);
  let lastErr = null;
  for (const model of models) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + apiKey,
        },
        body: JSON.stringify({
          model,
          temperature: 0.3,
          max_tokens: 8192,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                'You are an expert exam writer. Reply with ONLY valid JSON. No markdown fences. No commentary.',
            },
            { role: 'user', content: prompt },
          ],
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

function buildPrompt(payload) {
  const course = payload.course || {};
  const count = Math.min(40, Math.max(6, Number(payload.questionCount) || 12));
  const topics = Array.isArray(payload.topics) ? payload.topics.slice(0, 14) : [];
  const topicLines = topics
    .map(function (t, i) {
      return i + 1 + '. ' + t;
    })
    .join('\n');
  const mcqN = Math.max(1, Math.round(count * 0.6));
  const tfN = Math.max(2, Math.round(count * 0.28));
  const shortN = Math.max(1, count - mcqN - tfN);

  return (
    'Create a FINAL ASSESSMENT for this tech course.\n' +
    'Course: ' +
    (course.title || 'Course') +
    '\nField: ' +
    (course.field || 'Software') +
    '\nDuration days: ' +
    (course.durationDays || 15) +
    '\nModules:\n' +
    (topicLines || 'General programming') +
    '\n\n' +
    'Return ONLY this JSON shape (no markdown):\n' +
    '{"questions":[{"id":"q1","type":"mcq","prompt":"...","options":["A","B","C","D"],"answer":"0","topic":"...","explanation":"..."}]}\n\n' +
    'Rules:\n' +
    '- Exactly ' +
    count +
    ' questions\n' +
    '- About ' +
    mcqN +
    ' mcq (4 options; answer is "0"|"1"|"2"|"3")\n' +
    '- About ' +
    tfN +
    ' true_false (answer "true" or "false")\n' +
    '- About ' +
    shortN +
    ' short (short phrase answer)\n' +
    '- Questions must test REAL knowledge of the modules (e.g. Dynamic Programming → memoization, optimal substructure)\n' +
    '- NEVER write "In the context of X, which statement is most accurate?"\n' +
    '- Wrong options must be plausible misconceptions\n' +
    '- Clear English for engineering students\n'
  );
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });

  try {
    const payload = JSON.parse(event.body || '{}');
    const prompt = buildPrompt(payload);
    let raw = null;
    let provider = null;
    const errors = [];

    if (env('GEMINI_API_KEY')) {
      try {
        raw = await callGemini(prompt);
        provider = 'gemini';
      } catch (e) {
        errors.push('gemini: ' + (e.message || e));
      }
    }
    if (!raw && env('GROQ_API_KEY')) {
      try {
        raw = await callGroq(prompt);
        provider = 'groq';
      } catch (e) {
        errors.push('groq: ' + (e.message || e));
      }
    }

    if (!raw) {
      return json(200, {
        ok: false,
        source: 'none',
        error: 'No AI provider available',
        errors: errors,
        env: buddyEnvSummary(),
      });
    }

    const parsed = extractJson(raw);
    if (!parsed) {
      return json(200, {
        ok: false,
        source: provider,
        error: 'AI returned non-JSON',
        preview: String(raw).slice(0, 400),
        env: buddyEnvSummary(),
      });
    }

    const questions = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.questions)
        ? parsed.questions
        : null;
    if (!questions || !questions.length) {
      return json(200, {
        ok: false,
        source: provider,
        error: 'AI JSON missing questions array',
        preview: String(raw).slice(0, 400),
      });
    }

    return json(200, {
      ok: true,
      source: provider,
      data: { questions },
    });
  } catch (error) {
    console.error('course-quiz error', error);
    return json(500, {
      ok: false,
      error: error.message || 'Failed',
      env: buddyEnvSummary(),
    });
  }
};

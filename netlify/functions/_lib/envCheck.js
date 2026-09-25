/**
 * Safe env diagnostics for Buddy AI (no secret values logged).
 */
function envFlag(name) {
  try {
    const v = process.env[name];
    if (v == null || String(v).trim() === '') return 'missing';
    return 'set(len=' + String(v).trim().length + ')';
  } catch {
    return 'error';
  }
}

function buddyEnvSummary() {
  return {
    AI_PROVIDER: process.env.AI_PROVIDER || '(default groq)',
    GROQ_API_KEY: envFlag('GROQ_API_KEY'),
    GROQ_MODEL: process.env.GROQ_MODEL || '(default llama-3.1-8b-instant)',
    OPENAI_API_KEY: envFlag('OPENAI_API_KEY'),
    GEMINI_API_KEY: envFlag('GEMINI_API_KEY'),
  };
}

module.exports = { envFlag: envFlag, buddyEnvSummary: buddyEnvSummary };

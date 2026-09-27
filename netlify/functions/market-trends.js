/**
 * Market trends + Skill Market Trend Engine
 * Actions: refresh_market | analyze_student | collect_jobs | list_jobs
 *
 * Job pipeline: Adzuna + data.gov.in (Skill India/PLFS) + curated-public → normalize → dedupe
 * AI: Groq → Gemini → region baseline
 */
const { generateMarketAi, extractJsonObject } = require('./_lib/marketAi');
const {
  normalizeSkillList,
  extractSkillsFromText,
} = require('./_lib/skillNormalize');

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

const JSON_SYSTEM = 'You output only one JSON object. No markdown.';

function env(name) {
  try {
    return process.env[name] || '';
  } catch (_) {
    return '';
  }
}

function normalizeRegion(raw) {
  const r = String(raw || '').trim();
  if (!r || /india\s*\(all\)|pan[- ]?india|^india$/i.test(r)) return 'India (All)';
  return r;
}

function regionField(region) {
  return region === 'India (All)' ? 'India' : 'India / ' + region;
}

function adzunaQueriesForRegion(region) {
  const scope = normalizeRegion(region);
  const baseWhat = 'software developer OR data OR cloud OR react OR java';
  const map = {
    Maharashtra: [{ what: baseWhat, where: 'Pune' }, { what: baseWhat, where: 'Mumbai' }],
    Karnataka: [{ what: baseWhat, where: 'Bengaluru' }],
    'Delhi NCR': [{ what: baseWhat, where: 'Noida' }, { what: baseWhat, where: 'Gurgaon' }],
    Goa: [{ what: 'developer OR frontend OR mobile', where: 'Goa' }],
    Telangana: [{ what: baseWhat, where: 'Hyderabad' }],
    'Tamil Nadu': [{ what: baseWhat, where: 'Chennai' }],
    'India (All)': [
      { what: baseWhat, where: 'Bengaluru' },
      { what: baseWhat, where: 'Pune' },
      { what: baseWhat, where: 'Hyderabad' },
    ],
  };
  return map[scope] || [{ what: baseWhat, where: scope }];
}

/**
 * Shared helpers for market trend engine
 */
const { generateMarketAi, extractJsonObject } = require('./marketAi');
const { normalizeSkillList, extractSkillsFromText } = require('./skillNormalize');

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

function hasAdzuna() {
  return Boolean(env('ADZUNA_APP_ID') && env('ADZUNA_APP_KEY'));
}

function hasDataGov() {
  return Boolean(env('DATA_GOV_API_KEY'));
}

function regionSeed(name) {
  let h = 0;
  const s = String(name || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

module.exports = {
  json,
  env,
  normalizeRegion,
  regionField,
  hasAdzuna,
  hasDataGov,
  regionSeed,
  normalizeSkillList,
  extractSkillsFromText,
  generateMarketAi,
  extractJsonObject,
};

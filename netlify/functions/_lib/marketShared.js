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

/** Location hints so Maharashtra matches Mumbai/Pune etc. */
const REGION_LOC_HINTS = {
  Maharashtra: ['maharashtra', 'mumbai', 'pune', 'nagpur', 'nashik', 'thane'],
  Karnataka: ['karnataka', 'bengaluru', 'bangalore', 'mysore', 'hubli'],
  'Tamil Nadu': ['tamil nadu', 'chennai', 'coimbatore', 'madurai'],
  Telangana: ['telangana', 'hyderabad', 'secunderabad'],
  'Andhra Pradesh': ['andhra', 'vijayawada', 'visakhapatnam'],
  'Delhi NCR': ['delhi', 'noida', 'gurgaon', 'gurugram', 'ncr', 'ghaziabad', 'faridabad'],
  'Uttar Pradesh': ['uttar pradesh', 'lucknow', 'noida', 'kanpur'],
  Gujarat: ['gujarat', 'ahmedabad', 'surat', 'vadodara'],
  Rajasthan: ['rajasthan', 'jaipur', 'udaipur'],
  'West Bengal': ['west bengal', 'kolkata', 'calcutta'],
  Kerala: ['kerala', 'kochi', 'trivandrum', 'thiruvananthapuram'],
  'Madhya Pradesh': ['madhya pradesh', 'indore', 'bhopal'],
  Haryana: ['haryana', 'gurgaon', 'gurugram', 'faridabad'],
  Punjab: ['punjab', 'chandigarh', 'ludhiana', 'amritsar'],
  Bihar: ['bihar', 'patna'],
  Odisha: ['odisha', 'bhubaneswar'],
  Assam: ['assam', 'guwahati'],
  Jharkhand: ['jharkhand', 'ranchi'],
  Chhattisgarh: ['chhattisgarh', 'raipur'],
  Uttarakhand: ['uttarakhand', 'dehradun'],
  'Himachal Pradesh': ['himachal'],
  Goa: ['goa', 'panaji', 'panjim'],
  'Jammu & Kashmir': ['jammu', 'kashmir', 'srinagar'],
  Puducherry: ['puducherry', 'pondicherry'],
  Chandigarh: ['chandigarh'],
};

/**
 * Filter jobs to the selected region for demand / AI.
 * India (All) → all jobs. State → location match; if too few, keep all so AI still works.
 */
function jobsForRegion(jobs, region) {
  const list = Array.isArray(jobs) ? jobs : [];
  const scope = normalizeRegion(region);
  if (scope === 'India (All)') return list;
  const hints = REGION_LOC_HINTS[scope] || [String(scope).toLowerCase()];
  const filtered = list.filter(function (j) {
    const loc = String(j.location || '').toLowerCase();
    if (!loc) return true;
    return hints.some(function (h) {
      return loc.indexOf(h) >= 0;
    });
  });
  if (filtered.length < 3 && list.length > 10) return list;
  return filtered.length ? filtered : list;
}

/** Filter PLFS/gov indicators to state when possible. */
function govForRegion(indicators, region) {
  const list = Array.isArray(indicators) ? indicators : [];
  const scope = normalizeRegion(region);
  if (scope === 'India (All)' || !list.length) return list;
  const key = scope.toLowerCase();
  const matched = list.filter(function (g) {
    const st = String(g.state || '').toLowerCase();
    return !st || st.indexOf(key) >= 0 || key.indexOf(st) >= 0;
  });
  return matched.length ? matched : list;
}

module.exports = {
  json: json,
  env: env,
  normalizeRegion: normalizeRegion,
  regionField: regionField,
  hasAdzuna: hasAdzuna,
  hasDataGov: hasDataGov,
  regionSeed: regionSeed,
  jobsForRegion: jobsForRegion,
  govForRegion: govForRegion,
  normalizeSkillList: normalizeSkillList,
  extractSkillsFromText: extractSkillsFromText,
  generateMarketAi: generateMarketAi,
  extractJsonObject: extractJsonObject,
};

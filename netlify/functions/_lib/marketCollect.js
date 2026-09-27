/**
 * Collect jobs: Adzuna (multi-page) + data.gov.in (Skill India / PLFS style) + curated seed.
 * Official APIs only. In-memory store for serverless (client also persists).
 */
const shared = require('./marketShared');

let memoryJobs = null;

const CURATED = [
  {
    externalId: 'demo-1',
    source: 'curated-public',
    title: 'Full Stack Developer',
    company: 'Pune Product Co',
    location: 'Pune, Maharashtra',
    experience: '0-2 years',
    industry: 'Product SaaS',
    salaryText: '6-10 LPA',
    postingDate: '2026-09-10',
    skills: ['React', 'Node.js', 'TypeScript', 'SQL', 'Git'],
  },
  {
    externalId: 'demo-2',
    source: 'curated-public',
    title: 'Java Backend Engineer',
    company: 'Mumbai BFSI',
    location: 'Mumbai, Maharashtra',
    experience: '1-3 years',
    industry: 'BFSI',
    salaryText: '8-14 LPA',
    postingDate: '2026-09-12',
    skills: ['Java', 'Spring Boot', 'SQL', 'Microservices', 'AWS'],
  },
  {
    externalId: 'demo-3',
    source: 'curated-public',
    title: 'Data Analyst',
    company: 'Bengaluru Analytics',
    location: 'Bengaluru, Karnataka',
    experience: '0-2 years',
    industry: 'Analytics',
    salaryText: '5-9 LPA',
    postingDate: '2026-09-08',
    skills: ['Python', 'SQL', 'Data Analysis', 'Pandas', 'Excel'],
  },
  {
    externalId: 'demo-4',
    source: 'curated-public',
    title: 'Frontend Engineer',
    company: 'Noida Startup',
    location: 'Noida, Delhi NCR',
    experience: 'Fresher',
    industry: 'Startups',
    salaryText: '5-8 LPA',
    postingDate: '2026-09-15',
    skills: ['React', 'TypeScript', 'CSS', 'REST APIs', 'Git'],
  },
  {
    externalId: 'demo-5',
    source: 'curated-public',
    title: 'DevOps Engineer',
    company: 'Hyderabad Cloud',
    location: 'Hyderabad, Telangana',
    experience: '2-4 years',
    industry: 'Cloud',
    salaryText: '10-16 LPA',
    postingDate: '2026-09-11',
    skills: ['AWS', 'Docker', 'Kubernetes', 'CI/CD', 'Linux'],
  },
  {
    externalId: 'demo-6',
    source: 'curated-public',
    title: 'Cybersecurity Analyst',
    company: 'Delhi SecOps',
    location: 'Gurugram, Delhi NCR',
    experience: '1-2 years',
    industry: 'Security',
    salaryText: '7-12 LPA',
    postingDate: '2026-09-09',
    skills: ['Cybersecurity', 'Linux', 'Python', 'Networking'],
  },
  {
    externalId: 'demo-7',
    source: 'curated-public',
    title: 'ML Engineer Junior',
    company: 'Bengaluru AI Lab',
    location: 'Bengaluru, Karnataka',
    experience: '0-2 years',
    industry: 'AI',
    salaryText: '8-15 LPA',
    postingDate: '2026-09-14',
    skills: ['Python', 'Machine Learning', 'PyTorch', 'SQL', 'Git'],
  },
  {
    externalId: 'demo-8',
    source: 'curated-public',
    title: 'React Native Developer',
    company: 'Goa Digital',
    location: 'Panaji, Goa',
    experience: '1-3 years',
    industry: 'Mobile',
    salaryText: '6-11 LPA',
    postingDate: '2026-09-13',
    skills: ['React Native', 'JavaScript', 'REST APIs', 'Git'],
  },
];

function nowIso() {
  return new Date().toISOString();
}

function jobKey(j) {
  return String(j.source || '') + '::' + String(j.externalId || '');
}

function stampCurated() {
  return CURATED.map(function (j) {
    return {
      externalId: j.externalId,
      source: j.source,
      title: j.title,
      company: j.company,
      location: j.location,
      experience: j.experience,
      industry: j.industry,
      salaryText: j.salaryText,
      postingDate: j.postingDate,
      collectedAt: nowIso(),
      skills: shared.normalizeSkillList(j.skills),
    };
  });
}

function whereForRegion(region) {
  const r = shared.normalizeRegion(region);
  if (r === 'India (All)') return '';
  const map = {
    Maharashtra: 'Maharashtra',
    Karnataka: 'Karnataka',
    'Tamil Nadu': 'Tamil Nadu',
    Telangana: 'Telangana',
    'Andhra Pradesh': 'Andhra Pradesh',
    'Delhi NCR': 'Delhi',
    'Uttar Pradesh': 'Uttar Pradesh',
    Gujarat: 'Gujarat',
    Rajasthan: 'Rajasthan',
    'West Bengal': 'West Bengal',
    Kerala: 'Kerala',
    'Madhya Pradesh': 'Madhya Pradesh',
    Haryana: 'Haryana',
    Punjab: 'Punjab',
    Bihar: 'Bihar',
    Odisha: 'Odisha',
    Assam: 'Assam',
    Jharkhand: 'Jharkhand',
    Chhattisgarh: 'Chhattisgarh',
    Uttarakhand: 'Uttarakhand',
    'Himachal Pradesh': 'Himachal Pradesh',
    Goa: 'Goa',
    'Jammu & Kashmir': 'Jammu and Kashmir',
    Puducherry: 'Puducherry',
    Chandigarh: 'Chandigarh',
  };
  return map[r] || r;
}

async function fetchJson(url, timeoutMs) {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const t = setTimeout(function () {
    if (ctrl) ctrl.abort();
  }, timeoutMs || 12000);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: ctrl ? ctrl.signal : undefined,
    });
    clearTimeout(t);
    if (!res.ok) {
      const body = await res.text().catch(function () {
        return '';
      });
      throw new Error('HTTP ' + res.status + ' ' + String(body).slice(0, 80));
    }
    return await res.json();
  } catch (e) {
    clearTimeout(t);
    throw e;
  }
}

/** Adzuna India jobs — up to maxPages × results_per_page */
async function fetchAdzuna(region, maxPages) {
  if (!shared.hasAdzuna()) return { jobs: [], note: 'Adzuna keys not set' };
  const appId = shared.env('ADZUNA_APP_ID');
  const appKey = shared.env('ADZUNA_APP_KEY');
  const where = whereForRegion(region);
  const pages = Math.min(Math.max(maxPages || 3, 1), 5);
  const perPage = 50;
  const out = [];
  const notes = [];
  const queries = where
    ? ['software developer', 'data analyst', 'full stack']
    : ['software engineer', 'data scientist', 'devops'];

  for (let qi = 0; qi < queries.length; qi++) {
    const what = encodeURIComponent(queries[qi]);
    for (let page = 1; page <= pages; page++) {
      let url =
        'https://api.adzuna.com/v1/api/jobs/in/search/' +
        page +
        '?app_id=' +
        encodeURIComponent(appId) +
        '&app_key=' +
        encodeURIComponent(appKey) +
        '&results_per_page=' +
        perPage +
        '&what=' +
        what +
        '&content-type=application/json';
      if (where) url += '&where=' + encodeURIComponent(where);
      try {
        const data = await fetchJson(url, 14000);
        const results = (data && data.results) || [];
        if (!results.length) break;
        for (let i = 0; i < results.length; i++) {
          const r = results[i];
          const title = String(r.title || '').trim();
          const desc = String(r.description || '');
          const company =
            (r.company && (r.company.display_name || r.company.name)) || 'Unknown';
          const loc =
            (r.location && (r.location.display_name || (r.location.area || []).join(', '))) ||
            where ||
            'India';
          const salary =
            r.salary_min || r.salary_max
              ? (r.salary_min || '') + (r.salary_max ? '-' + r.salary_max : '') + ' ' + (r.salary_is_predicted === '1' ? '(est)' : '')
              : undefined;
          const text = title + ' ' + desc;
          const skills = shared.normalizeSkillList(shared.extractSkillsFromText(text));
          out.push({
            externalId: String(r.id || r.adref || title + '-' + i),
            source: 'adzuna',
            title: title || 'Job',
            company: String(company),
            location: String(loc),
            experience: '',
            industry: String((r.category && r.category.label) || 'IT'),
            salaryText: salary,
            postingDate: r.created ? String(r.created).slice(0, 10) : undefined,
            collectedAt: nowIso(),
            skills: skills.length ? skills : shared.normalizeSkillList(['Software']),
          });
        }
        if (results.length < perPage) break;
      } catch (e) {
        notes.push('Adzuna p' + page + ' ' + queries[qi] + ': ' + String(e.message || e).slice(0, 60));
        break;
      }
    }
  }
  return { jobs: out, note: notes.length ? notes.join('; ') : 'Adzuna ok' };
}

/**
 * data.gov.in OGD — Skill India / employment style resources with offset paging.
 * Uses DATA_GOV_API_KEY and optional DATA_GOV_RESOURCE_IDS (comma-separated).
 * Falls back to known public employment/skill-oriented resource ids when unset.
 */
async function fetchDataGov(region) {
  if (!shared.hasDataGov()) return { jobs: [], indicators: [], note: 'DATA_GOV_API_KEY not set' };
  const key = shared.env('DATA_GOV_API_KEY');
  const custom = shared.env('DATA_GOV_RESOURCE_IDS');
  // Public OGD resource ids commonly used for employment / skill stats (may return indicators, not job ads)
  const defaultIds = [
    '3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69', // sample / employment oriented — override via env if needed
  ];
  const ids = custom
    ? custom.split(',').map(function (s) {
        return s.trim();
      }).filter(Boolean)
    : defaultIds;

  const jobs = [];
  const indicators = [];
  const notes = [];
  const scope = shared.normalizeRegion(region);

  for (let ri = 0; ri < ids.length; ri++) {
    const rid = ids[ri];
    let offset = 0;
    const limit = 100;
    let pages = 0;
    const maxPages = 3;
    while (pages < maxPages) {
      const url =
        'https://api.data.gov.in/resource/' +
        encodeURIComponent(rid) +
        '?api-key=' +
        encodeURIComponent(key) +
        '&format=json&offset=' +
        offset +
        '&limit=' +
        limit;
      try {
        const data = await fetchJson(url, 14000);
        const records = (data && (data.records || data.data)) || [];
        if (!records.length) break;
        for (let i = 0; i < records.length; i++) {
          const row = records[i] || {};
          // Try job-like fields
          const title =
            row.job_title ||
            row.title ||
            row.course_name ||
            row.trade_name ||
            row.sector ||
            row.skill ||
            '';
          const loc =
            row.state ||
            row.location ||
            row.district ||
            (scope === 'India (All)' ? 'India' : scope);
          const company = row.organisation || row.organization || row.institute || 'data.gov.in';
          const text = JSON.stringify(row);
          const skills = shared.normalizeSkillList(
            shared.extractSkillsFromText(text + ' ' + String(title)),
          );
          if (title || skills.length) {
            jobs.push({
              externalId: 'gov-' + rid + '-' + offset + '-' + i,
              source: 'data-gov-in',
              title: String(title || 'Skill / employment signal').slice(0, 120),
              company: String(company).slice(0, 80),
              location: String(loc).slice(0, 80),
              experience: String(row.experience || ''),
              industry: String(row.sector || row.industry || 'Skill India / OGD'),
              salaryText: undefined,
              postingDate: row.year ? String(row.year) : undefined,
              collectedAt: nowIso(),
              skills: skills.length ? skills : shared.normalizeSkillList(['Skill Development']),
            });
          }
          // PLFS-style indicators
          if (row.wpr != null || row.WPR != null || row.unemployment_rate != null || row.UR != null) {
            indicators.push({
              year: row.year || row.Year || '',
              state: row.state || row.State || loc,
              wpr: row.wpr != null ? row.wpr : row.WPR,
              unemploymentRate: row.unemployment_rate != null ? row.unemployment_rate : row.UR,
            });
          }
        }
        pages += 1;
        offset += limit;
        if (records.length < limit) break;
      } catch (e) {
        notes.push('data.gov ' + rid.slice(0, 8) + ': ' + String(e.message || e).slice(0, 60));
        break;
      }
    }
  }

  // If API returned no job-shaped rows, still surface a few synthetic signals from region so badge works
  if (!jobs.length && indicators.length === 0) {
    notes.push('No job-shaped OGD rows; curated + Adzuna still used');
  }

  return {
    jobs: jobs,
    indicators: indicators,
    note: notes.length ? notes.join('; ') : 'data.gov.in ok (' + jobs.length + ' signals)',
  };
}

function mergeJobs(existing, incoming) {
  const map = new Map();
  (existing || []).forEach(function (j) {
    map.set(jobKey(j), j);
  });
  let inserted = 0;
  let dup = 0;
  (incoming || []).forEach(function (j) {
    const k = jobKey(j);
    if (map.has(k)) {
      dup += 1;
    } else {
      map.set(k, j);
      inserted += 1;
    }
  });
  return { jobs: Array.from(map.values()), inserted: inserted, duplicate: dup };
}

function getMemoryJobs() {
  return memoryJobs;
}

function setMemoryJobs(jobs) {
  memoryJobs = jobs;
}

/**
 * Full collect: curated always + Adzuna (if keys) + data.gov.in (if key).
 * existingJobs from client are merged so admin panel keeps history.
 */
async function collectJobsPayload(existingJobs, region) {
  const startedAt = nowIso();
  const scope = shared.normalizeRegion(region || 'India (All)');
  const base = Array.isArray(existingJobs) && existingJobs.length ? existingJobs : [];
  const curated = stampCurated();
  const sources = ['curated-public'];
  const notes = [];
  let allIncoming = curated.slice();
  let govIndicators = [];

  // Adzuna
  try {
    const adz = await fetchAdzuna(scope, 3);
    if (adz.jobs && adz.jobs.length) {
      allIncoming = allIncoming.concat(adz.jobs);
      sources.push('adzuna');
    }
    if (adz.note) notes.push(adz.note);
  } catch (e) {
    notes.push('Adzuna: ' + String(e.message || e).slice(0, 80));
  }

  // data.gov.in
  try {
    const gov = await fetchDataGov(scope);
    if (gov.jobs && gov.jobs.length) {
      allIncoming = allIncoming.concat(gov.jobs);
      sources.push('data-gov-in');
    }
    if (gov.indicators && gov.indicators.length) govIndicators = gov.indicators;
    if (gov.note) notes.push(gov.note);
  } catch (e) {
    notes.push('data.gov: ' + String(e.message || e).slice(0, 80));
  }

  const merged = mergeJobs(base, allIncoming);
  setMemoryJobs(merged.jobs);

  const status =
    sources.indexOf('adzuna') >= 0 || sources.indexOf('data-gov-in') >= 0
      ? sources.length > 1
        ? 'ok'
        : 'partial'
      : 'ok';

  const run = {
    id: 'run-' + Date.now(),
    startedAt: startedAt,
    finishedAt: nowIso(),
    status: status,
    source: sources.join('+'),
    jobsFetched: allIncoming.length,
    jobsInserted: merged.inserted,
    jobsDuplicate: merged.duplicate,
  };

  return {
    jobs: merged.jobs,
    run: run,
    sources: sources,
    note: notes.join(' | ') || 'Collected ' + merged.jobs.length + ' jobs',
    govIndicators: govIndicators,
  };
}

module.exports = {
  getMemoryJobs: getMemoryJobs,
  setMemoryJobs: setMemoryJobs,
  collectJobsPayload: collectJobsPayload,
  mergeJobs: mergeJobs,
  stampCurated: stampCurated,
};

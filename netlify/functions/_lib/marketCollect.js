/**
 * Collect jobs: Adzuna (fast bounded) + data.gov.in + Skill India catalog + curated.
 * Tuned for Netlify ~10–26s timeout — parallel Adzuna, always include gov signals.
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

const SKILL_INDIA_SIGNALS = [
  { title: 'IT-ITeS Software Developer', skills: ['Java', 'SQL', 'Git', 'REST APIs', 'JavaScript'] },
  { title: 'IT-ITeS Web Developer', skills: ['JavaScript', 'React', 'CSS', 'Git', 'REST APIs'] },
  { title: 'IT-ITeS Cloud Application Developer', skills: ['AWS', 'Docker', 'Python', 'Linux', 'Kubernetes'] },
  { title: 'IT-ITeS Data Analyst', skills: ['Python', 'SQL', 'Data Analysis', 'Excel', 'Pandas'] },
  { title: 'IT-ITeS Cyber Security Analyst', skills: ['Cybersecurity', 'Linux', 'Networking', 'Python'] },
  { title: 'IT-ITeS Machine Learning Engineer', skills: ['Python', 'Machine Learning', 'SQL', 'Git', 'PyTorch'] },
  { title: 'IT-ITeS DevOps Engineer', skills: ['DevOps', 'CI/CD', 'Docker', 'Linux', 'AWS'] },
  { title: 'BFSI Digital Banking', skills: ['SQL', 'Java', 'REST APIs', 'Spring Boot'] },
  { title: 'Electronics IoT Technician', skills: ['Linux', 'Python', 'Networking'] },
  { title: 'IT-ITeS Full Stack Developer', skills: ['React', 'Node.js', 'TypeScript', 'SQL', 'Git'] },
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

function stampSkillIndia(region) {
  const loc = region === 'India (All)' ? 'India' : region;
  return SKILL_INDIA_SIGNALS.map(function (s, i) {
    return {
      externalId: 'skill-india-' + i + '-' + String(loc).replace(/\s+/g, '-').toLowerCase(),
      source: 'data-gov-in',
      title: s.title,
      company: 'Skill India / NCVT (public catalog)',
      location: loc,
      experience: '',
      industry: 'Skill India',
      salaryText: undefined,
      postingDate: '2026',
      collectedAt: nowIso(),
      skills: shared.normalizeSkillList(s.skills),
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
  }, timeoutMs || 8000);
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
      throw new Error('HTTP ' + res.status + ' ' + String(body).slice(0, 60));
    }
    return await res.json();
  } catch (e) {
    clearTimeout(t);
    throw e;
  }
}

function mapAdzunaResult(r, where, i) {
  const title = String(r.title || '').trim();
  const desc = String(r.description || '');
  const company = (r.company && (r.company.display_name || r.company.name)) || 'Unknown';
  const loc =
    (r.location && (r.location.display_name || (r.location.area || []).join(', '))) || where || 'India';
  const salary =
    r.salary_min || r.salary_max
      ? String(r.salary_min || '') +
        (r.salary_max ? '-' + r.salary_max : '') +
        (r.salary_is_predicted === '1' ? ' (est)' : '')
      : undefined;
  const skills = shared.normalizeSkillList(shared.extractSkillsFromText(title + ' ' + desc));
  return {
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
  };
}

/**
 * Adzuna — parallel fetches, max 3 queries × 2 pages to stay under Netlify timeout.
 * Region where-filter when not India (All).
 */
async function fetchAdzuna(region) {
  if (!shared.hasAdzuna()) return { jobs: [], note: 'Adzuna keys not set' };
  const appId = shared.env('ADZUNA_APP_ID');
  const appKey = shared.env('ADZUNA_APP_KEY');
  const where = whereForRegion(region);
  const perPage = 50;
  const queries = where
    ? ['software developer', 'data analyst', 'full stack']
    : ['software engineer', 'data analyst', 'devops'];
  const pages = 2;

  const urls = [];
  for (let qi = 0; qi < queries.length; qi++) {
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
        encodeURIComponent(queries[qi]) +
        '&content-type=application/json';
      if (where) url += '&where=' + encodeURIComponent(where);
      urls.push(url);
    }
  }

  const out = [];
  const notes = [];
  const results = await Promise.all(
    urls.map(function (url) {
      return fetchJson(url, 9000).catch(function (e) {
        notes.push(String(e.message || e).slice(0, 50));
        return null;
      });
    }),
  );

  results.forEach(function (data) {
    if (!data || !data.results) return;
    (data.results || []).forEach(function (r, i) {
      out.push(mapAdzunaResult(r, where, i));
    });
  });

  // Dedupe within adzuna batch
  const seen = {};
  const deduped = [];
  out.forEach(function (j) {
    const k = jobKey(j);
    if (seen[k]) return;
    seen[k] = true;
    deduped.push(j);
  });

  return {
    jobs: deduped,
    note: notes.length
      ? 'Adzuna partial (' + deduped.length + ') ' + notes.slice(0, 2).join('; ')
      : 'Adzuna ok (' + deduped.length + ' jobs, region=' + (where || 'India') + ')',
  };
}

/** data.gov.in — one resource try + always Skill India catalog (region-tagged). */
async function fetchDataGov(region) {
  const scope = shared.normalizeRegion(region);
  const jobs = stampSkillIndia(scope);
  const indicators = [];
  const notes = ['Skill India catalog ' + jobs.length + ' signals for ' + scope];

  if (!shared.hasDataGov()) {
    notes.push('DATA_GOV_API_KEY not set');
    return { jobs: jobs, indicators: indicators, note: notes.join('; ') };
  }

  const key = shared.env('DATA_GOV_API_KEY');
  const custom = shared.env('DATA_GOV_RESOURCE_IDS');
  const ids = custom
    ? custom
        .split(',')
        .map(function (s) {
          return s.trim();
        })
        .filter(Boolean)
        .slice(0, 2)
    : [];

  // Only hit OGD if resource IDs configured (avoids timeout on bad default UUIDs)
  for (let ri = 0; ri < ids.length; ri++) {
    const rid = ids[ri];
    const url =
      'https://api.data.gov.in/resource/' +
      encodeURIComponent(rid) +
      '?api-key=' +
      encodeURIComponent(key) +
      '&format=json&offset=0&limit=50';
    try {
      const data = await fetchJson(url, 8000);
      const records = (data && (data.records || data.data)) || [];
      records.forEach(function (row, i) {
        row = row || {};
        const title =
          row.job_title ||
          row.title ||
          row.course_name ||
          row.trade_name ||
          row.sector ||
          row.skill ||
          '';
        const loc = row.state || row.State || row.location || scope;
        const text = JSON.stringify(row);
        const skills = shared.normalizeSkillList(shared.extractSkillsFromText(text + ' ' + String(title)));
        if (title || skills.length) {
          jobs.push({
            externalId: 'gov-' + rid.slice(0, 8) + '-' + i,
            source: 'data-gov-in',
            title: String(title || 'OGD signal').slice(0, 120),
            company: String(row.organisation || row.institute || 'data.gov.in').slice(0, 80),
            location: String(loc).slice(0, 80),
            experience: '',
            industry: String(row.sector || row.industry || 'Skill India / OGD'),
            postingDate: row.year ? String(row.year) : undefined,
            collectedAt: nowIso(),
            skills: skills.length ? skills : shared.normalizeSkillList(['Skill Development']),
          });
        }
        if (row.wpr != null || row.WPR != null || row.unemployment_rate != null || row.UR != null) {
          indicators.push({
            year: row.year || row.Year || '',
            state: row.state || row.State || loc,
            wpr: row.wpr != null ? row.wpr : row.WPR,
            unemploymentRate: row.unemployment_rate != null ? row.unemployment_rate : row.UR,
            lfpr: row.lfpr != null ? row.lfpr : row.LFPR,
          });
        }
      });
      notes.push('OGD ' + rid.slice(0, 8) + ' +' + records.length);
    } catch (e) {
      notes.push('OGD ' + rid.slice(0, 8) + ' fail');
    }
  }

  return { jobs: jobs, indicators: indicators, note: notes.join('; ') };
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

async function collectJobsPayload(existingJobs, region) {
  const startedAt = nowIso();
  const scope = shared.normalizeRegion(region || 'India (All)');
  const base = Array.isArray(existingJobs) && existingJobs.length ? existingJobs : [];

  // Sync first: curated + Skill India (data-gov-in) — always present even if APIs fail
  const curated = stampCurated();
  const skillIndia = stampSkillIndia(scope);
  let allIncoming = curated.concat(skillIndia);
  const sources = ['curated-public', 'data-gov-in'];
  const notes = [];
  let govIndicators = [];

  // Adzuna (parallel, bounded)
  try {
    const adz = await fetchAdzuna(scope);
    if (adz.jobs && adz.jobs.length) {
      allIncoming = allIncoming.concat(adz.jobs);
      sources.push('adzuna');
    }
    if (adz.note) notes.push(adz.note);
  } catch (e) {
    notes.push('Adzuna: ' + String(e.message || e).slice(0, 80));
  }

  // Optional OGD resource IDs + extra indicators (Skill India already in allIncoming)
  try {
    const gov = await fetchDataGov(scope);
    // Avoid double Skill India — only add OGD-only rows not already in catalog
    if (gov.jobs && gov.jobs.length) {
      const catalogIds = {};
      skillIndia.forEach(function (j) {
        catalogIds[j.externalId] = true;
      });
      gov.jobs.forEach(function (j) {
        if (!catalogIds[j.externalId]) allIncoming.push(j);
      });
    }
    if (gov.indicators && gov.indicators.length) govIndicators = gov.indicators;
    if (gov.note) notes.push(gov.note);
  } catch (e) {
    notes.push('data.gov: ' + String(e.message || e).slice(0, 80));
  }

  const merged = mergeJobs(base, allIncoming);
  setMemoryJobs(merged.jobs);

  const run = {
    id: 'run-' + Date.now(),
    startedAt: startedAt,
    finishedAt: nowIso(),
    status: sources.indexOf('adzuna') >= 0 ? 'ok' : 'partial',
    source: sources.join('+'),
    jobsFetched: allIncoming.length,
    jobsInserted: merged.inserted,
    jobsDuplicate: merged.duplicate,
  };

  return {
    jobs: merged.jobs,
    run: run,
    sources: sources,
    note: notes.join(' | ') || 'Collected ' + merged.jobs.length + ' jobs for ' + scope,
    govIndicators: govIndicators,
  };
}

module.exports = {
  getMemoryJobs: getMemoryJobs,
  setMemoryJobs: setMemoryJobs,
  collectJobsPayload: collectJobsPayload,
  mergeJobs: mergeJobs,
  stampCurated: stampCurated,
  stampSkillIndia: stampSkillIndia,
};

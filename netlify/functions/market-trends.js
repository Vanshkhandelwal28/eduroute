/**
 * Market trends + Skill Market Trend Engine
 * Actions: refresh_market | analyze_student | collect_jobs | list_jobs
 *
 * Job pipeline: Adzuna API (if keys) + curated-public seed → normalize → dedupe
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

/** Map EduRoute region → Adzuna where + search what (efficient, few calls). */
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

function marketTemplate(region) {
  const r = regionField(region);
  return (
    'India tech hiring for region: ' +
    region +
    '. Skills and scores MUST differ from other states. ' +
    'Return JSON: {"updatedAt":"ISO","region":"' +
    r +
    '","summary":"2 sentences about ' +
    region +
    '","risingSkills":[{"skill":"","demandScore":0,"trend":"rising","note":""}],' +
    '"decliningSkills":[{"skill":"","demandScore":0,"trend":"declining","note":""}],' +
    '"topRoles":[{"role":"","openingsIndex":0,"avgSalaryLpa":0}],' +
    '"sectors":[{"name":"","demandScore":0}],"emergingTech":[""],"sourcesNote":"ai"}. ' +
    '6 rising, 2 declining, 4 roles, 3 sectors. Scores 40-95 unique to ' +
    region +
    '.'
  );
}

function studentTemplate(p) {
  const region = normalizeRegion(p.region);
  return (
    'Student vs ' +
    region +
    ' tech market. JSON: {"generatedAt":"ISO","summary":"2 sentences","matchScore":0,' +
    '"marketSkills":[{"skill":"","marketDemand":0,"studentLevel":0,"status":"strong|gap|missing"}],' +
    '"skillGaps":[{"skill":"","priority":"high|medium|low","why":"","action":""}],' +
    '"strengths":[""],"recommendations":[""],' +
    '"comparisonBars":[{"skill":"","market":0,"student":0}]}. Field:' +
    (p.field || 'SE') +
    ' Strengths:' +
    (p.strengths || p.skills || []).slice(0, 8).join(',') +
    ' Gaps:' +
    (p.gaps || []).slice(0, 6).join(',') +
    '.'
  );
}

function regionSeed(name) {
  let h = 0;
  const s = String(name || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function localMarketFallback(region) {
  const scope = normalizeRegion(region);
  const seed = regionSeed(scope);
  const boost = seed % 17;
  const profiles = {
    'India (All)': {
      summary: 'Pan-India hubs: Bengaluru, Hyderabad, Pune, NCR. Full-stack, cloud, GenAI demand.',
      rising: [['React / Next.js', 90], ['Python / GenAI', 89], ['Cloud (AWS/GCP)', 86], ['System Design', 84], ['TypeScript', 82], ['DevOps', 78]],
      declining: [['jQuery-only', 26], ['Flash', 10]],
      roles: [['SDE Fullstack', 92, 9], ['Backend', 88, 11], ['Data Analyst', 80, 7], ['DevOps', 78, 10]],
      sectors: [['Product SaaS', 90], ['IT Services', 82], ['FinTech', 78]],
      emerging: ['GenAI apps', 'Platform eng'],
    },
    Maharashtra: {
      summary: 'Pune + Mumbai BFSI/product. Java/Spring, full-stack, cloud, data.',
      rising: [['Java / Spring Boot', 90], ['React / Next.js', 87], ['Cloud (AWS/Azure)', 85], ['SQL / Data eng', 83], ['Python', 81], ['Microservices', 80]],
      declining: [['Classic ASP', 30], ['VB desktop', 18]],
      roles: [['Java Backend', 90, 10], ['MERN Fullstack', 86, 9], ['Data Analyst', 82, 7], ['Cloud Eng', 78, 11]],
      sectors: [['BFSI FinTech', 90], ['IT Services', 84], ['Product', 80]],
      emerging: ['Open banking', 'BFSI GenAI'],
    },
    Karnataka: {
      summary: 'Bengaluru product hub: system design, K8s, React, ML.',
      rising: [['System Design', 92], ['Go / Java backend', 90], ['React / TypeScript', 88], ['Kubernetes', 86], ['ML engineering', 84], ['Data engineering', 80]],
      declining: [['Monolith PHP', 28], ['jQuery SPA', 24]],
      roles: [['SDE product', 94, 14], ['Platform backend', 90, 16], ['ML junior', 78, 12], ['SRE', 80, 13]],
      sectors: [['Product SaaS', 94], ['GCC', 86], ['Deep tech AI', 82]],
      emerging: ['LLM products', 'Developer tools'],
    },
    Goa: {
      summary: 'Tourism-digital + remote. Web, mobile, analytics.',
      rising: [['React frontend', 82], ['Node APIs', 78], ['Flutter / RN', 76], ['Digital analytics', 74], ['Headless CMS', 72], ['UI implementation', 80]],
      declining: [['Flash banners', 12], ['Static brochure only', 30]],
      roles: [['Frontend', 84, 7], ['Full stack small team', 80, 8], ['Mobile', 74, 7], ['Digital analyst', 70, 5]],
      sectors: [['Tourism tech', 86], ['Agencies', 82], ['Remote product', 78]],
      emerging: ['Tourism apps', 'Remote stacks'],
    },
    'Delhi NCR': {
      summary: 'Noida/Gurgaon startups + GCC: full-stack, data, security, cloud.',
      rising: [['React / Node', 88], ['Python / data', 86], ['Cybersecurity', 84], ['Cloud', 82], ['TypeScript', 80], ['System design', 78]],
      declining: [['Flash CMS', 16], ['jQuery monolith', 28]],
      roles: [['Full Stack', 90, 10], ['Data Analyst', 84, 8], ['Security', 80, 9], ['Backend', 86, 11]],
      sectors: [['Startups', 88], ['GCC', 84], ['E-commerce', 76]],
      emerging: ['Growth analytics', 'AppSec'],
    },
  };
  const p =
    profiles[scope] ||
    {
      summary: 'Localised demand for ' + scope + '.',
      rising: [['Web fundamentals', 78 + (boost % 5)], ['React basics', 74 + (boost % 4)], ['Python', 72 + (boost % 6)], ['SQL', 70 + (boost % 5)], ['Git', 76], ['APIs', 68 + (boost % 7)]],
      declining: [['Theory-only certs', 38], ['Obsolete desktop', 22]],
      roles: [['Junior Web', 76, 5], ['Support', 70, 4], ['Data ops', 68, 5], ['Freelance FS', 72, 6]],
      sectors: [['SME IT', 78], ['Remote services', 80], ['Training', 74]],
      emerging: ['Remote delivery', 'Portfolio hiring'],
    };
  return {
    updatedAt: new Date().toISOString(),
    region: regionField(scope),
    summary: p.summary,
    risingSkills: p.rising.map(function (row) {
      return { skill: row[0], demandScore: Math.min(95, row[1]), trend: 'rising', note: scope };
    }),
    decliningSkills: p.declining.map(function (row) {
      return { skill: row[0], demandScore: row[1], trend: 'declining', note: 'Legacy' };
    }),
    topRoles: p.roles.map(function (row) {
      return { role: row[0], openingsIndex: row[1], avgSalaryLpa: row[2] };
    }),
    sectors: p.sectors.map(function (row) {
      return { name: row[0], demandScore: row[1] };
    }),
    emergingTech: p.emerging,
    sourcesNote: 'Region profile for ' + scope + ' (AI offline this request).',
    provider: 'local-fallback',
  };
}

function localStudentFallback(p) {
  const strengths = [].concat(p.strengths || p.skills || []).filter(Boolean);
  const gaps = [].concat(p.gaps || []).filter(Boolean);
  const region = normalizeRegion(p.region);
  return {
    generatedAt: new Date().toISOString(),
    summary: 'Profile vs ' + region + ' market. Ship projects to close gaps.',
    matchScore: 52 + (regionSeed(region) % 20),
    marketSkills: [
      { skill: 'React', marketDemand: 85, studentLevel: 40, status: 'gap' },
      { skill: 'APIs', marketDemand: 80, studentLevel: 35, status: 'gap' },
      { skill: 'Python', marketDemand: 82, studentLevel: 45, status: 'gap' },
    ],
    skillGaps: (gaps.length ? gaps : ['Projects', 'APIs']).slice(0, 4).map(function (g, i) {
      return { skill: g, priority: i === 0 ? 'high' : 'medium', why: 'Demand in ' + region, action: 'Ship a mini-project' };
    }),
    strengths: strengths.length ? strengths : ['Learning mindset'],
    recommendations: ['Ship one GitHub project', 'Practice APIs', 'Add cloud deploy'],
    comparisonBars: [
      { skill: 'React', market: 85, student: 40 },
      { skill: 'APIs', market: 80, student: 35 },
      { skill: 'Python', market: 82, student: 45 },
      { skill: 'Cloud', market: 78, student: 25 },
      { skill: 'Projects', market: 90, student: 30 },
    ],
    provider: 'local-fallback',
  };
}

const CURATED_JOBS = [
  { externalId: 'demo-1', source: 'curated-public', title: 'Full Stack Developer', company: 'Pune Product Co', location: 'Pune, Maharashtra', experience: '0-2 years', industry: 'Product SaaS', salaryText: '6-10 LPA', postingDate: '2026-09-10', skills: ['React', 'Node.js', 'TypeScript', 'SQL', 'Git'] },
  { externalId: 'demo-2', source: 'curated-public', title: 'Java Backend Engineer', company: 'Mumbai BFSI', location: 'Mumbai, Maharashtra', experience: '1-3 years', industry: 'BFSI', salaryText: '8-14 LPA', postingDate: '2026-09-12', skills: ['Java', 'Spring Boot', 'SQL', 'Microservices', 'AWS'] },
  { externalId: 'demo-3', source: 'curated-public', title: 'Data Analyst', company: 'Bengaluru Analytics', location: 'Bengaluru, Karnataka', experience: '0-2 years', industry: 'Analytics', salaryText: '5-9 LPA', postingDate: '2026-09-08', skills: ['Python', 'SQL', 'Data Analysis', 'Pandas'] },
  { externalId: 'demo-4', source: 'curated-public', title: 'Frontend Engineer', company: 'Noida Startup', location: 'Noida, Delhi NCR', experience: 'Fresher', industry: 'Startups', salaryText: '5-8 LPA', postingDate: '2026-09-15', skills: ['React', 'TypeScript', 'CSS', 'REST APIs', 'Git'] },
  { externalId: 'demo-5', source: 'curated-public', title: 'DevOps Engineer', company: 'Hyderabad Cloud', location: 'Hyderabad, Telangana', experience: '2-4 years', industry: 'Cloud', salaryText: '10-16 LPA', postingDate: '2026-09-11', skills: ['AWS', 'Docker', 'Kubernetes', 'CI/CD', 'Linux'] },
  { externalId: 'demo-6', source: 'curated-public', title: 'Cybersecurity Analyst', company: 'Delhi SecOps', location: 'Gurugram, Delhi NCR', experience: '1-2 years', industry: 'Security', salaryText: '7-12 LPA', postingDate: '2026-09-09', skills: ['Cybersecurity', 'Linux', 'Python'] },
  { externalId: 'demo-7', source: 'curated-public', title: 'ML Engineer Junior', company: 'Bengaluru AI Lab', location: 'Bengaluru, Karnataka', experience: '0-2 years', industry: 'AI', salaryText: '8-15 LPA', postingDate: '2026-09-14', skills: ['Python', 'Machine Learning', 'PyTorch', 'SQL'] },
  { externalId: 'demo-8', source: 'curated-public', title: 'React Native Developer', company: 'Goa Digital', location: 'Panaji, Goa', experience: '1-3 years', industry: 'Mobile', salaryText: '6-11 LPA', postingDate: '2026-09-13', skills: ['React Native', 'JavaScript', 'REST APIs', 'Git'] },
];

let memoryMarket = null;
let memoryJobs = null;

function hasAdzuna() {
  return Boolean(env('ADZUNA_APP_ID') && env('ADZUNA_APP_KEY'));
}

function mapAdzunaResult(r) {
  const title = r.title || '';
  const desc = r.description || '';
  const text = title + ' ' + desc;
  const skills = extractSkillsFromText(text);
  const company = (r.company && r.company.display_name) || '';
  const location = (r.location && r.location.display_name) || '';
  const category = (r.category && r.category.label) || '';
  let salaryText;
  if (r.salary_min || r.salary_max) {
    salaryText = String(r.salary_min || '?') + '–' + String(r.salary_max || '?');
  }
  return {
    externalId: String(r.id != null ? r.id : title + company),
    source: 'adzuna',
    title: title,
    company: company,
    location: location,
    experience: '',
    industry: category,
    salaryText: salaryText,
    postingDate: (r.created || '').slice(0, 10) || undefined,
    collectedAt: new Date().toISOString(),
    skills: normalizeSkillList(skills),
  };
}

async function fetchAdzunaPage(what, where, page) {
  const app_id = env('ADZUNA_APP_ID');
  const app_key = env('ADZUNA_APP_KEY');
  const url = new URL('https://api.adzuna.com/v1/api/jobs/in/search/' + page);
  url.searchParams.set('app_id', app_id);
  url.searchParams.set('app_key', app_key);
  url.searchParams.set('results_per_page', '20');
  url.searchParams.set('what', what);
  if (where) url.searchParams.set('where', where);
  url.searchParams.set('max_days_old', '30');
  url.searchParams.set('sort_by', 'date');
  url.searchParams.set('content-type', 'application/json');

  const controller = new AbortController();
  const timer = setTimeout(function () {
    controller.abort();
  }, 8000);
  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timer);
    const text = await res.text();
    if (!res.ok) {
      const err = new Error('Adzuna ' + res.status + ': ' + text.slice(0, 120));
      err.status = res.status;
      throw err;
    }
    const data = JSON.parse(text);
    return Array.isArray(data.results) ? data.results : [];
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

/** Limited parallel-friendly sequential fetches (respect free-tier). */
async function fetchAdzunaJobs(region) {
  if (!hasAdzuna()) return { jobs: [], errors: [], calls: 0 };
  const queries = adzunaQueriesForRegion(region).slice(0, 3);
  const jobs = [];
  const errors = [];
  let calls = 0;
  for (let i = 0; i < queries.length; i++) {
    const q = queries[i];
    try {
      calls += 1;
      const results = await fetchAdzunaPage(q.what, q.where, 1);
      for (let j = 0; j < results.length; j++) {
        jobs.push(mapAdzunaResult(results[j]));
      }
    } catch (e) {
      errors.push(String(e.message || e).slice(0, 160));
    }
  }
  return { jobs: jobs, errors: errors, calls: calls };
}

function mergeJobs(existing, incoming) {
  const map = {};
  (existing || []).forEach(function (j) {
    map[String(j.source) + '::' + String(j.externalId)] = j;
  });
  let inserted = 0;
  let dup = 0;
  (incoming || []).forEach(function (raw) {
    const key = String(raw.source) + '::' + String(raw.externalId);
    if (map[key]) {
      dup += 1;
      return;
    }
    map[key] = {
      externalId: String(raw.externalId),
      source: raw.source,
      title: raw.title || '',
      company: raw.company || '',
      location: raw.location || '',
      experience: raw.experience || '',
      industry: raw.industry || '',
      salaryText: raw.salaryText,
      postingDate: raw.postingDate,
      collectedAt: raw.collectedAt || new Date().toISOString(),
      skills: normalizeSkillList(raw.skills || []),
    };
    inserted += 1;
  });
  return {
    jobs: Object.keys(map).map(function (k) {
      return map[k];
    }),
    inserted: inserted,
    dup: dup,
  };
}

async function collectJobsPayload(existing, region) {
  const started = new Date().toISOString();
  const prev = Array.isArray(existing) ? existing : memoryJobs || [];
  const errors = [];
  const sourcesUsed = [];

  // 1) Always merge curated seed (stable demo + offline)
  const curatedMapped = CURATED_JOBS.map(function (raw) {
    return {
      externalId: raw.externalId,
      source: raw.source,
      title: raw.title,
      company: raw.company,
      location: raw.location,
      experience: raw.experience,
      industry: raw.industry,
      salaryText: raw.salaryText,
      postingDate: raw.postingDate,
      collectedAt: new Date().toISOString(),
      skills: normalizeSkillList(raw.skills),
    };
  });
  let merged = mergeJobs(prev, curatedMapped);
  sourcesUsed.push('curated-public');
  let fetched = CURATED_JOBS.length;
  let inserted = merged.inserted;
  let dup = merged.dup;

  // 2) Adzuna live (if keys present)
  let adzunaJobs = [];
  if (hasAdzuna()) {
    try {
      const az = await fetchAdzunaJobs(region);
      adzunaJobs = az.jobs || [];
      fetched += adzunaJobs.length;
      if (az.errors && az.errors.length) errors.push.apply(errors, az.errors);
      if (adzunaJobs.length) {
        sourcesUsed.push('adzuna');
        const m2 = mergeJobs(merged.jobs, adzunaJobs);
        inserted += m2.inserted;
        dup += m2.dup;
        merged = m2;
      } else if (az.errors && az.errors.length) {
        // keys set but API failed
        errors.push('Adzuna returned 0 jobs');
      }
    } catch (e) {
      errors.push(String(e.message || e).slice(0, 160));
    }
  }

  memoryJobs = merged.jobs;
  const status =
    errors.length && adzunaJobs.length === 0 && hasAdzuna()
      ? 'partial'
      : errors.length
        ? 'partial'
        : 'ok';

  return {
    jobs: merged.jobs,
    run: {
      id: 'run-' + Date.now(),
      startedAt: started,
      finishedAt: new Date().toISOString(),
      status: status,
      source: sourcesUsed.join('+'),
      jobsFetched: fetched,
      jobsInserted: inserted,
      jobsDuplicate: dup,
      errorMessage: errors.length ? errors.slice(0, 3).join(' | ') : undefined,
    },
    sources: [
      { code: 'curated-public', name: 'Curated public demo postings', permitted: true },
      {
        code: 'adzuna',
        name: 'Adzuna Jobs API (India)',
        permitted: true,
        configured: hasAdzuna(),
      },
    ],
    note:
      'Adzuna (official API) + curated-public seed. No restricted scraping. Jobs by Adzuna when live data used.',
  };
}

async function aiJson(messages, temperature) {
  const res = await generateMarketAi(messages, temperature);
  const reply = typeof res === 'string' ? res : res.text;
  const provider = (res && res.provider) || 'ai';
  const parsed = extractJsonObject(reply);
  return { parsed: parsed, provider: provider, reply: reply };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });
  if (event.httpMethod === 'GET') {
    return json(200, {
      ok: true,
      market: memoryMarket,
      jobsCount: (memoryJobs || []).length,
      hasGemini: Boolean(env('GEMINI_API_KEY')),
      hasGroq: Boolean(env('GROQ_API_KEY')),
      hasAdzuna: hasAdzuna(),
      sources: [
        { code: 'curated-public', name: 'Curated public demo postings', permitted: true },
        { code: 'adzuna', name: 'Adzuna Jobs API (India)', permitted: true, configured: hasAdzuna() },
      ],
    });
  }
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });

  try {
    const body = JSON.parse(event.body || '{}');
    const action = body.action || 'refresh_market';
    const region = normalizeRegion(body.region || 'Maharashtra');

    if (action === 'collect_jobs') {
      const result = await collectJobsPayload(body.existingJobs, region);
      return json(200, {
        ok: true,
        jobs: result.jobs,
        run: result.run,
        sources: result.sources,
        note: result.note,
      });
    }

    if (action === 'list_jobs') {
      return json(200, { ok: true, jobs: memoryJobs || [] });
    }

    if (!env('GEMINI_API_KEY') && !env('GROQ_API_KEY')) {
      if (action === 'refresh_market') {
        const market = localMarketFallback(region);
        memoryMarket = market;
        return json(200, { ok: true, market: market, provider: 'local-fallback' });
      }
      if (action === 'analyze_student') {
        return json(200, {
          ok: true,
          analysis: localStudentFallback({ ...body, region: region }),
          market: memoryMarket || localMarketFallback(region),
          provider: 'local-fallback',
        });
      }
    }

    if (action === 'refresh_market') {
      try {
        const out = await aiJson(
          [
            { role: 'system', content: JSON_SYSTEM },
            { role: 'user', content: marketTemplate(region) },
          ],
          0.4,
        );
        if (!out.parsed) {
          const market = localMarketFallback(region);
          memoryMarket = market;
          return json(200, { ok: true, market: market, provider: 'local-fallback', warning: 'AI non-JSON' });
        }
        out.parsed.updatedAt = out.parsed.updatedAt || new Date().toISOString();
        if (!out.parsed.region) out.parsed.region = regionField(region);
        out.parsed.provider = out.provider;
        memoryMarket = out.parsed;
        return json(200, { ok: true, market: out.parsed, provider: out.provider });
      } catch (e) {
        const market = localMarketFallback(region);
        memoryMarket = market;
        return json(200, {
          ok: true,
          market: market,
          provider: 'local-fallback',
          warning: String(e.message || e).slice(0, 200),
        });
      }
    }

    if (action === 'analyze_student') {
      const payload = {
        skills: Array.isArray(body.skills) ? body.skills : [],
        strengths: Array.isArray(body.strengths) ? body.strengths : [],
        gaps: Array.isArray(body.gaps) ? body.gaps : [],
        field: body.field || 'Software Engineering',
        interests: Array.isArray(body.interests) ? body.interests : [],
        region: region,
      };
      try {
        const out = await aiJson(
          [
            { role: 'system', content: JSON_SYSTEM },
            { role: 'user', content: studentTemplate(payload) },
          ],
          0.4,
        );
        if (!out.parsed) {
          return json(200, {
            ok: true,
            analysis: localStudentFallback(payload),
            market: memoryMarket,
            provider: 'local-fallback',
          });
        }
        out.parsed.generatedAt = out.parsed.generatedAt || new Date().toISOString();
        out.parsed.provider = out.provider;
        return json(200, { ok: true, analysis: out.parsed, market: memoryMarket, provider: out.provider });
      } catch (e) {
        return json(200, {
          ok: true,
          analysis: localStudentFallback(payload),
          market: memoryMarket,
          provider: 'local-fallback',
          warning: String(e.message || e).slice(0, 200),
        });
      }
    }

    return json(400, {
      ok: false,
      error: 'Unknown action. Use refresh_market, analyze_student, collect_jobs, list_jobs.',
    });
  } catch (err) {
    return json(500, { ok: false, error: err.message || 'Market trends failed' });
  }
};

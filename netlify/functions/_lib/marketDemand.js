/**
 * AI prompts + demand aggregation grounded on ALL collected jobs + gov indicators
 * (PR12: fixed PLACEHOLDER crash that caused HTTP 502 on /api/market-trends)
 */
const shared = require('./marketShared');
const normalizeRegion = shared.normalizeRegion;
const regionField = shared.regionField;
const regionSeed = shared.regionSeed;
const generateMarketAi = shared.generateMarketAi;
const extractJsonObject = shared.extractJsonObject;

let memoryMarket = null;

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
  const demandHint = p.demandHint || '';
  const jobCount = p.jobCount != null ? p.jobCount : 0;
  const src = p.sources
    ? Object.keys(p.sources)
        .map(function (k) {
          return k + '=' + p.sources[k];
        })
        .join(',')
    : '';
  return (
    'Student skill-gap analysis for region: ' +
    region +
    '. Ground matchScore, skillGaps, recommendations, and comparisonBars in LIVE job demand below (Adzuna + data.gov.in + curated). ' +
    'Jobs in scope: ' +
    jobCount +
    (src ? ' sources[' + src + ']' : '') +
    '. ' +
    'Return JSON only: {"generatedAt":"ISO","summary":"3-4 sentences citing region, live job demand, and what the student should do next",' +
    '"matchScore":0,' +
    '"marketSkills":[{"skill":"","marketDemand":0,"studentLevel":0,"status":"strong|gap|missing"}],' +
    '"skillGaps":[{"skill":"","priority":"high|medium|low","why":"cite demand % or job count","action":"concrete 1-week action"}],' +
    '"strengths":[""],"recommendations":["3-5 specific next steps"],' +
    '"comparisonBars":[{"skill":"","market":0,"student":0}]}. ' +
    'Field:' +
    (p.field || 'SE') +
    ' OwnedSkills:' +
    (p.strengths || p.skills || []).slice(0, 12).join(',') +
    ' QuizGaps:' +
    (p.gaps || []).slice(0, 8).join(',') +
    (demandHint ? ' LiveDemand:' + demandHint : '') +
    '. matchScore 0-100 from how well owned skills cover top live demand. Include 5-8 marketSkills and 4-6 skillGaps from LiveDemand.'
  );
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

function demandFromJobs(jobs) {
  const list = Array.isArray(jobs) ? jobs : [];
  const total = list.length || 1;
  const counts = {};
  list.forEach(function (j) {
    (j.skills || []).forEach(function (s) {
      const n = String(s || '').trim();
      if (!n) return;
      counts[n] = (counts[n] || 0) + 1;
    });
  });
  return Object.keys(counts)
    .map(function (skill) {
      return {
        skill: skill,
        jobCount: counts[skill],
        demandPct: Math.round((counts[skill] / total) * 1000) / 10,
      };
    })
    .sort(function (a, b) {
      return b.jobCount - a.jobCount;
    });
}

function sourceCounts(jobs) {
  const c = {};
  (jobs || []).forEach(function (j) {
    const s = j.source || 'unknown';
    c[s] = (c[s] || 0) + 1;
  });
  return c;
}

function rolesFromJobs(jobs) {
  const counts = {};
  (jobs || []).forEach(function (j) {
    const t = String(j.title || '')
      .trim()
      .slice(0, 80);
    if (!t) return;
    let role = t;
    if (/full\s*stack/i.test(t)) role = 'Full Stack Developer';
    else if (/front\s*end|frontend/i.test(t)) role = 'Frontend Engineer';
    else if (/back\s*end|backend/i.test(t)) role = 'Backend Engineer';
    else if (/data\s*analyst/i.test(t)) role = 'Data Analyst';
    else if (/data\s*scientist/i.test(t)) role = 'Data Scientist';
    else if (/devops|sre|site reliability/i.test(t)) role = 'DevOps / SRE';
    else if (/machine\s*learning|ml\s*engineer/i.test(t)) role = 'ML Engineer';
    else if (/cyber|security/i.test(t)) role = 'Cybersecurity';
    else if (/software\s*(engineer|developer)/i.test(t)) role = 'Software Engineer';
    else if (/java/i.test(t)) role = 'Java Developer';
    else if (/python/i.test(t)) role = 'Python Developer';
    else if (/react/i.test(t)) role = 'React Developer';
    counts[role] = (counts[role] || 0) + 1;
  });
  const total = (jobs || []).length || 1;
  return Object.keys(counts)
    .map(function (role) {
      return {
        role: role,
        openingsIndex: Math.min(99, Math.round((counts[role] / total) * 100 + counts[role])),
        avgSalaryLpa: undefined,
        jobCount: counts[role],
      };
    })
    .sort(function (a, b) {
      return b.jobCount - a.jobCount;
    })
    .slice(0, 6);
}

function sectorsFromJobs(jobs) {
  const counts = {};
  (jobs || []).forEach(function (j) {
    const ind = String(j.industry || 'IT').trim() || 'IT';
    counts[ind] = (counts[ind] || 0) + 1;
  });
  const total = (jobs || []).length || 1;
  return Object.keys(counts)
    .map(function (name) {
      return {
        name: name,
        demandScore: Math.min(95, Math.round((counts[name] / total) * 100)),
        jobCount: counts[name],
      };
    })
    .sort(function (a, b) {
      return b.jobCount - a.jobCount;
    })
    .slice(0, 6);
}

function marketTemplateFromJobs(region, jobs, govIndicators) {
  const scope = normalizeRegion(region);
  const r = regionField(scope);
  const demand = demandFromJobs(jobs).slice(0, 20);
  const sources = sourceCounts(jobs);
  const roles = rolesFromJobs(jobs).slice(0, 6);
  const sectors = sectorsFromJobs(jobs).slice(0, 5);
  const sampleTitles = (jobs || [])
    .slice(0, 12)
    .map(function (j) {
      return (j.source || '') + ':' + String(j.title || '').slice(0, 50);
    })
    .filter(Boolean);
  const demandLines = demand
    .map(function (d) {
      return d.skill + ':' + d.demandPct + '%(' + d.jobCount + ')';
    })
    .join(', ');
  const srcLine = Object.keys(sources)
    .map(function (k) {
      return k + '=' + sources[k];
    })
    .join(', ');
  const roleLine = roles
    .map(function (x) {
      return x.role + '(' + x.jobCount + ')';
    })
    .join(', ');
  const sectorLine = sectors
    .map(function (x) {
      return x.name + '(' + x.jobCount + ')';
    })
    .join(', ');
  let govLine = '';
  if (govIndicators && govIndicators.length) {
    govLine =
      ' PLFS/gov signals: ' +
      govIndicators
        .slice(0, 6)
        .map(function (g) {
          return (
            String(g.year || '') +
            ' ' +
            String(g.state || '') +
            ' WPR=' +
            String(g.wpr != null ? g.wpr : '?') +
            ' UR=' +
            String(g.unemploymentRate != null ? g.unemploymentRate : '?') +
            ' LFPR=' +
            String(g.lfpr != null ? g.lfpr : '?')
          );
        })
        .join('; ') +
      '.';
  }
  return (
    'India tech hiring for region: ' +
    scope +
    '. You MUST ground rising/declining skills, roles, sectors in the LIVE collected data below. ' +
    'Do not invent skills absent from the demand list unless clearly legacy/declining. ' +
    'Collected jobs: ' +
    (jobs ? jobs.length : 0) +
    ' sources[' +
    srcLine +
    ']. Skill demand share: ' +
    (demandLines || 'none') +
    '. Roles from titles: ' +
    (roleLine || 'n/a') +
    '. Sectors: ' +
    (sectorLine || 'n/a') +
    '. Sample titles: ' +
    (sampleTitles.join(' | ') || 'n/a') +
    '.' +
    govLine +
    ' Return JSON: {"updatedAt":"ISO","region":"' +
    r +
    '","summary":"2 sentences citing live sources and job counts","risingSkills":[{"skill":"","demandScore":0,"trend":"rising","note":""}],' +
    '"decliningSkills":[{"skill":"","demandScore":0,"trend":"declining","note":""}],' +
    '"topRoles":[{"role":"","openingsIndex":0,"avgSalaryLpa":0}],' +
    '"sectors":[{"name":"","demandScore":0}],"emergingTech":[""],' +
    '"sourcesNote":"Adzuna+data.gov.in+curated","jobCount":0,"demandTop":[{"skill":"","demandPct":0,"jobCount":0}]}. ' +
    '6 rising from demand list, 2 declining, 4 roles from role list, 3 sectors from sector list. demandScore 40-95. Include jobCount and top 8 demandTop from data.'
  );
}

async function aiJson(messages, temperature) {
  const res = await generateMarketAi(messages, temperature);
  const reply = typeof res === 'string' ? res : res.text;
  const provider = (res && res.provider) || 'ai';
  const parsed = extractJsonObject(reply);
  return { parsed: parsed, provider: provider, reply: reply };
}

module.exports = {
  getMemoryMarket: function () {
    return memoryMarket;
  },
  setMemoryMarket: function (m) {
    memoryMarket = m;
  },
  marketTemplate: marketTemplate,
  studentTemplate: studentTemplate,
  localMarketFallback: localMarketFallback,
  localStudentFallback: localStudentFallback,
  demandFromJobs: demandFromJobs,
  sourceCounts: sourceCounts,
  rolesFromJobs: rolesFromJobs,
  sectorsFromJobs: sectorsFromJobs,
  marketTemplateFromJobs: marketTemplateFromJobs,
  aiJson: aiJson,
};

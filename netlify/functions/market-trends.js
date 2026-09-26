/**
 * Market trends + student trend analysis
 * Prefer Gemini (1 try, 4.5s) → Groq (1 try, 4.5s) → region-specific local fallback.
 * body.region (state or "India (All)") scopes both AI and baseline.
 */
const { generateMarketAi, extractJsonObject } = require('./_lib/marketAi');

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

const JSON_SYSTEM =
  'You are a JSON API. Reply with ONLY one valid JSON object. ' +
  'No markdown, no code fences, no explanation, no trailing text.';

function normalizeRegion(raw) {
  const r = String(raw || '').trim();
  if (!r || /india\s*\(all\)|pan[- ]?india|^india$/i.test(r)) return 'India (All)';
  return r;
}

function regionLabel(region) {
  return region === 'India (All)' ? 'India (pan-India tech jobs)' : region + ' (India)';
}

function marketTemplate(region) {
  const label = regionLabel(region);
  const regionField = region === 'India (All)' ? 'India' : 'India / ' + region;
  return (
    'Labour-market analyst for tech jobs ONLY in ' +
    label +
    '. IMPORTANT: numbers, top skills, salaries and sectors MUST be different from other Indian states. ' +
    'Reflect local hubs (e.g. Pune/Mumbai vs Bengaluru vs Goa tourism-IT vs smaller UTs). ' +
    'Return ONLY this JSON: ' +
    '{"updatedAt":"ISO","region":"' +
    regionField +
    '","summary":"2-3 sentences unique to this region",' +
    '"risingSkills":[{"skill":"","demandScore":0,"trend":"rising","note":""}],' +
    '"stableSkills":[{"skill":"","demandScore":0,"trend":"stable","note":""}],' +
    '"decliningSkills":[{"skill":"","demandScore":0,"trend":"declining","note":""}],' +
    '"topRoles":[{"role":"","openingsIndex":0,"avgSalaryLpa":0}],' +
    '"sectors":[{"name":"","demandScore":0}],' +
    '"emergingTech":[""],"sourcesNote":""}. ' +
    'Exactly 8 risingSkills, 3 decliningSkills, 5 topRoles, 4 sectors. demandScore 0-100. ' +
    'Do NOT reuse a generic national list — customise for ' +
    label +
    '.'
  );
}

function studentTemplate(p) {
  const region = normalizeRegion(p.region);
  return (
    'Compare this student to the tech job market in ' +
    regionLabel(region) +
    '. Return ONLY this JSON: ' +
    '{"generatedAt":"ISO","summary":"2-3 sentences","matchScore":0,' +
    '"marketSkills":[{"skill":"","marketDemand":0,"studentLevel":0,"status":"strong|gap|missing"}],' +
    '"skillGaps":[{"skill":"","priority":"high|medium|low","why":"","action":""}],' +
    '"strengths":[""],"recommendations":[""],' +
    '"comparisonBars":[{"skill":"","market":0,"student":0}]}. ' +
    'Field: ' +
    (p.field || 'General') +
    '. Interests: ' +
    (p.interests || []).join(', ') +
    '. Strengths: ' +
    (p.strengths || p.skills || []).join(', ') +
    '. Gaps: ' +
    (p.gaps || []).join(', ') +
    '. matchScore 0-100. comparisonBars: 6 skills scores 0-100.'
  );
}

/** Region profiles so baseline is NOT identical across states when AI is down. */
const REGION_PROFILES = {
  'India (All)': {
    summary:
      'Pan-India demand is led by Bengaluru, Hyderabad, Pune, NCR and Chennai. Full-stack, cloud and GenAI roles dominate product + services hiring.',
    rising: [
      ['React / Next.js', 90, 'National product hiring'],
      ['Python / GenAI', 89, 'Automation + LLM apps'],
      ['Cloud (AWS/Azure/GCP)', 86, 'Every major hub'],
      ['System Design', 84, 'Mid/senior interviews'],
      ['TypeScript', 82, 'Safer frontend/backend'],
      ['Data / SQL', 80, 'Analytics everywhere'],
      ['DevOps / CI-CD', 78, 'Ship velocity'],
      ['Cybersecurity basics', 74, 'Compliance push'],
    ],
    declining: [
      ['jQuery-only stacks', 26],
      ['Legacy COBOL (non-bank)', 22],
      ['Flash / Silverlight', 10],
    ],
    roles: [
      ['SDE / Fullstack', 92, 9],
      ['Backend Engineer', 88, 11],
      ['Data Analyst', 80, 7],
      ['Cloud / DevOps', 78, 10],
      ['Cybersecurity junior', 70, 8],
    ],
    sectors: [
      ['Product / SaaS', 90],
      ['IT Services', 82],
      ['FinTech', 78],
      ['EdTech / HealthTech', 70],
    ],
    emerging: ['GenAI apps', 'Platform engineering', 'Edge / IoT'],
  },
  Maharashtra: {
    summary:
      'Pune + Mumbai drive Maharashtra tech. BFSI, product startups and services need full-stack, Java/Spring, cloud and data skills. FinTech depth is above national average.',
    rising: [
      ['Java / Spring Boot', 90, 'BFSI + enterprise Pune'],
      ['React / Next.js', 87, 'Product + agency work'],
      ['Cloud (AWS/Azure)', 85, 'Banking + SaaS'],
      ['SQL / Data engineering', 83, 'Analytics teams'],
      ['Python / automation', 81, 'Ops + ML lite'],
      ['API / Microservices', 80, 'Integration heavy'],
      ['TypeScript', 76, 'Growing in startups'],
      ['DevOps basics', 74, 'CI-CD adoption'],
    ],
    declining: [
      ['Classic ASP / old PHP', 30],
      ['jQuery-only UIs', 28],
      ['Desktop-only VB stacks', 18],
    ],
    roles: [
      ['Java Backend', 90, 10],
      ['Full Stack (MERN)', 86, 9],
      ['Data Analyst', 82, 7],
      ['Cloud Engineer', 78, 11],
      ['QA / Automation', 72, 6],
    ],
    sectors: [
      ['BFSI / FinTech', 90],
      ['IT Services', 84],
      ['Product startups', 80],
      ['Manufacturing IT', 68],
    ],
    emerging: ['Open banking APIs', 'GenAI for BFSI', 'Industrial IoT'],
  },
  Karnataka: {
    summary:
      'Bengaluru remains India’s deepest product hub. System design, distributed systems, Go/Java, React and platform/DevOps skills command premium demand.',
    rising: [
      ['System Design', 92, 'Product interviews'],
      ['Go / Java backend', 90, 'Scale services'],
      ['React / TypeScript', 88, 'Consumer + B2B UI'],
      ['Kubernetes / DevOps', 86, 'Platform teams'],
      ['Python / ML engineering', 84, 'AI product orgs'],
      ['Cloud (GCP/AWS)', 83, 'Native cloud stacks'],
      ['Data engineering', 80, 'Pipelines + warehouse'],
      ['Observability', 74, 'SRE culture'],
    ],
    declining: [
      ['Monolith-only PHP', 28],
      ['jQuery SPAs', 24],
      ['On-prem only admin tools', 20],
    ],
    roles: [
      ['SDE (product)', 94, 14],
      ['Backend / Platform', 90, 16],
      ['ML Engineer (junior)', 78, 12],
      ['SRE / DevOps', 80, 13],
      ['Frontend Engineer', 85, 11],
    ],
    sectors: [
      ['Product / SaaS', 94],
      ['Global capability centres', 86],
      ['Deep tech / AI', 82],
      ['IT Services', 70],
    ],
    emerging: ['LLM productisation', 'Platform eng', 'Developer tools'],
  },
  Telangana: {
    summary:
      'Hyderabad is strong in cloud, enterprise Java, data and cybersecurity (GCC + product). Pharma IT and IT services remain large employers.',
    rising: [
      ['Cloud (AWS/Azure)', 88, 'GCC cloud migration'],
      ['Java / enterprise', 86, 'Legacy + modernisation'],
      ['Data / Snowflake-style', 84, 'Analytics centres'],
      ['Cybersecurity', 82, 'Security ops growth'],
      ['React / Angular', 80, 'Enterprise UI'],
      ['Python', 78, 'Automation + data'],
      ['DevOps', 76, 'Release automation'],
      ['API design', 74, 'Integration layers'],
    ],
    declining: [
      ['Unsupported Windows stacks', 30],
      ['jQuery portals', 26],
    ],
    roles: [
      ['Cloud Engineer', 88, 11],
      ['Java Developer', 86, 9],
      ['Security Analyst', 80, 8],
      ['Data Analyst', 78, 7],
      ['Full Stack', 82, 9],
    ],
    sectors: [
      ['GCC / Enterprise', 90],
      ['IT Services', 82],
      ['Pharma IT', 74],
      ['Product', 72],
    ],
    emerging: ['Cloud security', 'Data platforms', 'GenAI ops'],
  },
  'Tamil Nadu': {
    summary:
      'Chennai + Coimbatore mix IT services, automotive embedded and growing product work. Strong need for Java, testing, embedded/C++ and full-stack.',
    rising: [
      ['Java / Spring', 86, 'Services + product'],
      ['Selenium / Test automation', 84, 'Large QA demand'],
      ['React', 82, 'Web delivery'],
      ['Embedded / C++', 80, 'Auto + IoT'],
      ['Cloud basics', 78, 'Migration projects'],
      ['Python', 76, 'Scripting + data'],
      ['SQL', 78, 'Reporting heavy'],
      ['DevOps intro', 72, 'CI adoption'],
    ],
    declining: [
      ['Manual-only testing', 34],
      ['VB6 maintenance', 22],
    ],
    roles: [
      ['Java Developer', 88, 8],
      ['QA Automation', 84, 6],
      ['Full Stack', 80, 8],
      ['Embedded Engineer', 76, 7],
      ['Support / L2', 70, 5],
    ],
    sectors: [
      ['IT Services', 88],
      ['Automotive / Embedded', 80],
      ['Product', 72],
      ['BFSI tech', 70],
    ],
    emerging: ['EV software', 'Test automation', 'Cloud services'],
  },
  'Delhi NCR': {
    summary:
      'NCR (Delhi, Noida, Gurgaon) mixes startups, GCCs and large services. Product, growth/data, cybersecurity and full-stack hiring is active.',
    rising: [
      ['React / Node', 88, 'Startup + product'],
      ['Python / data', 86, 'Growth & analytics'],
      ['Cybersecurity', 84, 'Enterprise risk'],
      ['Cloud', 82, 'Hybrid estates'],
      ['TypeScript', 80, 'Modern web'],
      ['System design', 78, 'Scale interviews'],
      ['SQL / BI', 80, 'Ops reporting'],
      ['API / backend', 79, 'Service layers'],
    ],
    declining: [
      ['Flash-era CMS', 16],
      ['jQuery monoliths', 28],
    ],
    roles: [
      ['Full Stack', 90, 10],
      ['Data Analyst', 84, 8],
      ['Security Analyst', 80, 9],
      ['Backend Engineer', 86, 11],
      ['Product Engineer', 82, 12],
    ],
    sectors: [
      ['Startups / Product', 88],
      ['GCC', 84],
      ['Consulting / Services', 80],
      ['E-commerce', 76],
    ],
    emerging: ['Growth analytics', 'AppSec', 'GenAI pilots'],
  },
  Gujarat: {
    summary:
      'Ahmedabad / Surat / Vadodara: services, manufacturing IT and growing product. ERP, full-stack, data and cloud skills are practical hiring priorities.',
    rising: [
      ['Full stack (MERN)', 84, 'SME + product'],
      ['ERP / SAP basics', 82, 'Manufacturing IT'],
      ['SQL / Excel-to-BI', 80, 'Ops analytics'],
      ['Cloud fundamentals', 76, 'Migration wave'],
      ['Python', 74, 'Automation'],
      ['React', 78, 'Web apps'],
      ['API integration', 75, 'ERP connectors'],
      ['QA', 72, 'Delivery quality'],
    ],
    declining: [
      ['Desktop-only FoxPro', 20],
      ['Unsupported PHP4 sites', 24],
    ],
    roles: [
      ['Full Stack', 84, 7],
      ['ERP Consultant junior', 78, 6],
      ['Data Analyst', 76, 6],
      ['Support Engineer', 70, 5],
      ['Cloud associate', 72, 7],
    ],
    sectors: [
      ['Manufacturing IT', 86],
      ['IT Services', 80],
      ['SME product', 72],
      ['Logistics tech', 68],
    ],
    emerging: ['Industrial IoT', 'ERP cloud', 'SME SaaS'],
  },
  Goa: {
    summary:
      'Goa has a smaller but active tech + tourism-digital market. Web, mobile, digital marketing tech, and remote-friendly full-stack roles matter more than large enterprise Java campuses.',
    rising: [
      ['React / frontend', 82, 'Agencies + product'],
      ['Node / APIs', 78, 'Small backends'],
      ['Mobile (Flutter/React Native)', 76, 'Consumer apps'],
      ['Digital analytics', 74, 'Tourism + D2C'],
      ['WordPress / headless CMS', 72, 'Content sites'],
      ['Cloud basics', 70, 'Hosted apps'],
      ['UI/UX implementation', 80, 'Design-to-code'],
      ['Python scripting', 68, 'Automation'],
    ],
    declining: [
      ['Flash banners', 12],
      ['Static-only brochure sites', 30],
    ],
    roles: [
      ['Frontend Developer', 84, 7],
      ['Full Stack (small teams)', 80, 8],
      ['Mobile Developer', 74, 7],
      ['Digital analyst', 70, 5],
      ['WordPress / CMS', 68, 4],
    ],
    sectors: [
      ['Tourism / hospitality tech', 86],
      ['Digital agencies', 82],
      ['Remote product', 78],
      ['SME IT', 70],
    ],
    emerging: ['Tourism apps', 'Remote-first stacks', 'No-code + APIs'],
  },
  Puducherry: {
    summary:
      'Puducherry has a modest local IT footprint; many learners target Chennai / pan-India remote roles. Fundamentals, web, and job-ready projects matter more than niche deep-tech volume.',
    rising: [
      ['HTML/CSS/JS fundamentals', 80, 'Entry web roles'],
      ['React basics', 76, 'Frontend path'],
      ['Python basics', 74, 'Scripting + data'],
      ['SQL', 72, 'Reporting jobs'],
      ['Communication + Git', 78, 'Team readiness'],
      ['Cloud intro', 68, 'Deploy portfolio'],
      ['APIs', 70, 'Integrate services'],
      ['Testing basics', 66, 'QA entry'],
    ],
    declining: [
      ['Certificate-only theory', 40],
      ['Outdated Turbo C only', 25],
    ],
    roles: [
      ['Junior Web Developer', 78, 5],
      ['Support / L1', 72, 4],
      ['Data entry → analyst path', 68, 4],
      ['QA trainee', 66, 4],
      ['Remote freelance web', 70, 5],
    ],
    sectors: [
      ['Education / training', 80],
      ['Local SME IT', 74],
      ['Remote services', 78],
      ['Tourism digital', 70],
    ],
    emerging: ['Remote work skills', 'Portfolio projects', 'Cloud deploy'],
  },
};

function pickProfile(scope) {
  if (REGION_PROFILES[scope]) return REGION_PROFILES[scope];
  // Fuzzy match key
  const keys = Object.keys(REGION_PROFILES);
  for (let i = 0; i < keys.length; i++) {
    if (scope.toLowerCase().indexOf(keys[i].toLowerCase()) !== -1) return REGION_PROFILES[keys[i]];
  }
  // Generic smaller-state profile (different scores from India/MH)
  return {
    summary:
      'Localised tech demand for ' +
      scope +
      ' is smaller than major hubs; many roles are services, web, support and remote. Strong fundamentals + one portfolio project improve outcomes.',
    rising: [
      ['Web fundamentals (HTML/CSS/JS)', 78, 'Local + remote entry'],
      ['React basics', 74, 'Frontend path'],
      ['Python', 72, 'Automation'],
      ['SQL', 70, 'Data literacy'],
      ['Git + collaboration', 76, 'Team workflows'],
      ['Cloud intro', 66, 'Deploy demos'],
      ['APIs', 68, 'Integrate tools'],
      ['Communication skills', 80, 'Client-facing work'],
    ],
    declining: [
      ['Theory-only certificates', 38],
      ['Obsolete desktop stacks', 22],
    ],
    roles: [
      ['Junior Web Developer', 76, 5],
      ['Support Engineer', 70, 4],
      ['Data / ops analyst', 68, 5],
      ['QA trainee', 64, 4],
      ['Freelance full stack', 72, 6],
    ],
    sectors: [
      ['SME IT', 78],
      ['Education / training', 74],
      ['Remote services', 80],
      ['Local government / digital', 66],
    ],
    emerging: ['Remote delivery', 'Portfolio-first hiring', 'No-code + APIs'],
  };
}

function localMarketFallback(region) {
  const scope = normalizeRegion(region);
  const regionField = scope === 'India (All)' ? 'India' : 'India / ' + scope;
  const p = pickProfile(scope);
  return {
    updatedAt: new Date().toISOString(),
    region: regionField,
    summary: p.summary,
    risingSkills: p.rising.map(function (row) {
      return { skill: row[0], demandScore: row[1], trend: 'rising', note: row[2] };
    }),
    stableSkills: [
      { skill: 'Git / collaboration', demandScore: 75, trend: 'stable', note: 'Universal' },
      { skill: 'Problem solving', demandScore: 78, trend: 'stable', note: 'Interviews' },
    ],
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
    sourcesNote:
      'Region-specific baseline for ' +
      scope +
      ' (live AI unavailable this request). Refresh again when Gemini/Groq is free for model data.',
    provider: 'local-fallback',
  };
}

function localStudentFallback(p) {
  const strengths = [].concat(p.strengths || p.skills || []).filter(Boolean);
  const gaps = [].concat(p.gaps || []).filter(Boolean);
  const field = p.field || 'Software Engineering';
  const region = normalizeRegion(p.region);
  const known = strengths.map(function (s) {
    return String(s).toLowerCase();
  });
  function has(kw) {
    return known.some(function (s) {
      return s.indexOf(kw) !== -1;
    });
  }
  const bars = [
    { skill: 'React / Frontend', market: 88, student: has('react') || has('front') ? 70 : 35 },
    { skill: 'APIs / Backend', market: 84, student: has('api') || has('node') || has('backend') ? 65 : 30 },
    { skill: 'Python / Data', market: 82, student: has('python') || has('data') ? 68 : 28 },
    { skill: 'Cloud / DevOps', market: 78, student: has('aws') || has('cloud') || has('docker') ? 55 : 20 },
    { skill: 'System Design', market: 76, student: has('system') || has('design') ? 50 : 22 },
    { skill: 'Projects / Portfolio', market: 90, student: has('project') ? 60 : 25 },
  ];
  const avgStudent =
    bars.reduce(function (a, b) {
      return a + b.student;
    }, 0) / bars.length;
  const matchScore = Math.max(
    15,
    Math.min(92, Math.round(avgStudent + (strengths.length > 2 ? 8 : 0))),
  );
  const skillGaps = (gaps.length ? gaps : ['Project building', 'APIs', 'Practical experience'])
    .slice(0, 6)
    .map(function (g, i) {
      return {
        skill: g,
        priority: i === 0 ? 'high' : i < 3 ? 'medium' : 'low',
        why: 'Market demand in ' + region + ' is high relative to current profile depth.',
        action: 'Build 1 focused mini-project and document it on GitHub.',
      };
    });
  return {
    generatedAt: new Date().toISOString(),
    summary:
      'Based on your onboarding profile for ' +
      field +
      ' vs market in ' +
      region +
      ', focus on shippable projects and APIs to close gaps.',
    matchScore: matchScore,
    marketSkills: bars.map(function (b) {
      return {
        skill: b.skill,
        marketDemand: b.market,
        studentLevel: b.student,
        status: b.student >= 55 ? 'strong' : b.student >= 35 ? 'gap' : 'missing',
      };
    }),
    skillGaps: skillGaps,
    strengths: strengths.length ? strengths : ['Willingness to learn', 'Onboarding completed'],
    recommendations: [
      'Ship one full-stack mini project with public README.',
      'Practice REST APIs + auth on a small backend.',
      'Add TypeScript or stronger typing if on JS stack.',
      'Prepare 2–3 interview stories from real work.',
    ],
    comparisonBars: bars,
    provider: 'local-fallback',
  };
}

async function aiJson(messages, temperature) {
  const res = await generateMarketAi(messages, temperature);
  const reply = typeof res === 'string' ? res : res.text;
  const provider = (res && res.provider) || 'ai';
  const parsed = extractJsonObject(reply);
  return { parsed: parsed, provider: provider, reply: reply };
}

let memoryMarket = null;

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });
  if (event.httpMethod === 'GET') {
    return json(200, {
      ok: true,
      market: memoryMarket,
      hasGemini: Boolean(process.env.GEMINI_API_KEY),
      hasGroq: Boolean(process.env.GROQ_API_KEY),
    });
  }
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });

  try {
    const body = JSON.parse(event.body || '{}');
    const action = body.action || 'refresh_market';
    const region = normalizeRegion(body.region || 'Maharashtra');

    if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) {
      if (action === 'refresh_market') {
        const market = localMarketFallback(region);
        memoryMarket = market;
        return json(200, { ok: true, market: market, provider: 'local-fallback' });
      }
      if (action === 'analyze_student') {
        const analysis = localStudentFallback({ ...body, region: region });
        return json(200, {
          ok: true,
          analysis: analysis,
          market: memoryMarket || localMarketFallback(region),
          provider: 'local-fallback',
        });
      }
    }

    if (action === 'refresh_market') {
      try {
        const { parsed, provider, reply } = await aiJson(
          [
            { role: 'system', content: JSON_SYSTEM },
            { role: 'user', content: marketTemplate(region) },
          ],
          0.35,
        );
        if (!parsed) {
          console.warn('Market AI non-JSON, local fallback. Preview:', String(reply).slice(0, 160));
          const market = localMarketFallback(region);
          memoryMarket = market;
          return json(200, {
            ok: true,
            market: market,
            provider: 'local-fallback',
            warning: 'AI non-JSON',
          });
        }
        parsed.updatedAt = parsed.updatedAt || new Date().toISOString();
        if (!parsed.region) {
          parsed.region = region === 'India (All)' ? 'India' : 'India / ' + region;
        }
        parsed.provider = provider;
        memoryMarket = parsed;
        return json(200, { ok: true, market: parsed, provider: provider });
      } catch (e) {
        console.error('refresh_market failed', e);
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
        const { parsed, provider, reply } = await aiJson(
          [
            { role: 'system', content: JSON_SYSTEM },
            { role: 'user', content: studentTemplate(payload) },
          ],
          0.35,
        );
        if (!parsed) {
          console.warn('Student AI non-JSON, local fallback. Preview:', String(reply).slice(0, 160));
          const analysis = localStudentFallback(payload);
          return json(200, {
            ok: true,
            analysis: analysis,
            market: memoryMarket,
            provider: 'local-fallback',
            warning: 'AI non-JSON',
          });
        }
        parsed.generatedAt = parsed.generatedAt || new Date().toISOString();
        parsed.provider = provider;
        return json(200, {
          ok: true,
          analysis: parsed,
          market: memoryMarket,
          provider: provider,
        });
      } catch (e) {
        console.error('analyze_student failed', e);
        const analysis = localStudentFallback(payload);
        return json(200, {
          ok: true,
          analysis: analysis,
          market: memoryMarket,
          provider: 'local-fallback',
          warning: String(e.message || e).slice(0, 200),
        });
      }
    }

    return json(400, { ok: false, error: 'Unknown action. Use refresh_market or analyze_student.' });
  } catch (err) {
    console.error('market-trends error', err);
    return json(500, { ok: false, error: err.message || 'Market trends failed' });
  }
};

/**
 * Live internship/job search via Adzuna API (India + international country codes).
 * POST { query?: string, where?: string, page?: number, country?: string }
 * GET  ?what=internship&where=Maharashtra&country=in
 */
function env(name) {
  try {
    return (typeof process !== 'undefined' && process.env && process.env[name]) || '';
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
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

function mapAdzunaJob(j) {
  const title = j.title || 'Role';
  const company = (j.company && j.company.display_name) || 'Company';
  const location = (j.location && j.location.display_name) || 'India';
  const url = j.redirect_url || j.adref || '';
  const description = (j.description || '').replace(/<[^>]+>/g, ' ').slice(0, 280);
  const created = j.created ? new Date(j.created).toLocaleDateString('en-IN') : '';
  return {
    id: 'adz-' + (j.id || Math.random().toString(36).slice(2)),
    role: title,
    company: company,
    location: location,
    stipend: j.salary_min
      ? '₹' + Math.round(j.salary_min).toLocaleString('en-IN') + (j.salary_max ? '–' + Math.round(j.salary_max).toLocaleString('en-IN') : '') + ' / mo'
      : 'Stipend not listed',
    type: /intern/i.test(title) ? 'Internship' : 'Job',
    duration: /intern/i.test(title) ? 'Internship' : 'Full-time',
    mode: /remote/i.test(location + ' ' + title) ? 'Remote' : 'Onsite / Hybrid',
    posted: created || 'Recently',
    logo: 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(company.slice(0, 12)),
    tags: (j.category && j.category.label ? [j.category.label] : []).concat(
      (j.contract_type ? [j.contract_type] : []),
    ).slice(0, 4),
    sector: 'software',
    verified: true,
    fastTrack: false,
    description: description,
    applyUrl: url,
    source: 'adzuna',
  };
}

async function fetchAdzuna({ what, where, page, country }) {
  const appId = env('ADZUNA_APP_ID');
  const appKey = env('ADZUNA_APP_KEY');
  if (!appId || !appKey) {
    return { ok: false, error: 'ADZUNA_APP_ID / ADZUNA_APP_KEY not set on Netlify', jobs: [] };
  }
  const q = encodeURIComponent(what || 'internship software');
  const loc = encodeURIComponent(where || (country === 'in' || !country ? 'India' : ''));
  const pg = Math.max(1, Number(page) || 1);
  const cc = country || 'in';
  const url =
    'https://api.adzuna.com/v1/api/jobs/' +
    cc +
    '/search/' +
    pg +
    '?app_id=' +
    encodeURIComponent(appId) +
    '&app_key=' +
    encodeURIComponent(appKey) +
    '&results_per_page=12&what=' +
    q +
    (loc ? '&where=' + loc : '') +
    '&content-type=application/json';
  const res = await fetch(url);
  const data = await res.json().catch(function () {
    return {};
  });
  if (!res.ok) {
    return {
      ok: false,
      error: (data && data.error) || 'Adzuna HTTP ' + res.status,
      jobs: [],
    };
  }
  const results = Array.isArray(data.results) ? data.results : [];
  return {
    ok: true,
    jobs: results.map(mapAdzunaJob).filter(function (j) {
      return j.applyUrl;
    }),
    count: data.count || results.length,
    source: 'adzuna',
  };
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });

  try {
    let what = 'internship';
    let where = 'Maharashtra';
    let page = 1;
    let country = 'in';
    if (event.httpMethod === 'GET') {
      const q = event.queryStringParameters || {};
      what = q.what || q.query || what;
      where = q.where || where;
      page = q.page || 1;
      country = q.country || country;
    } else if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      what = body.what || body.query || what;
      where = body.where || where;
      page = body.page || 1;
      country = body.country || country;
    } else {
      return json(405, { ok: false, error: 'Method not allowed' });
    }

    if (!/intern/i.test(what)) what = what + ' internship';

    const result = await fetchAdzuna({ what: what, where: where, page: page, country: country });
    return json(200, result);
  } catch (e) {
    return json(200, {
      ok: false,
      error: String(e.message || e).slice(0, 200),
      jobs: [],
    });
  }
};

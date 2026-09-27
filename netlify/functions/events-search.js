/**
 * Live events aggregator for EduRoute.
 * Adzuna (India + international) + curated platforms with real URLs.
 * Optional AI refresh (Groq/Gemini) ranks/summarizes — never invents links.
 * POST/GET: { region?: india|international|all, query?: string, page?: number, aiRefresh?: boolean }
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

const CURATED_INDIA = [
  { id: 'cur-unstop-hack', title: 'Unstop Hackathons & Challenges', date: 'Ongoing', location: 'India · Online & Onsite', category: 'Hackathon', region: 'india', attendees: '50K+', description: 'Live student hackathons, case competitions, and hiring challenges across India.', url: 'https://unstop.com/hackathons', source: 'unstop', tags: ['Hackathon', 'India', 'Students'] },
  { id: 'cur-unstop-intern', title: 'Unstop Internships', date: 'Ongoing', location: 'India', category: 'Internship', region: 'india', attendees: '—', description: 'Verified internship listings with direct apply on Unstop.', url: 'https://unstop.com/internships', source: 'unstop', tags: ['Internship', 'India'] },
  { id: 'cur-hackerearth', title: 'HackerEarth Challenges', date: 'Ongoing', location: 'India · Online', category: 'Hackathon', region: 'india', attendees: '—', description: 'Coding challenges, hackathons, and hiring contests.', url: 'https://www.hackerearth.com/challenges/', source: 'hackerearth', tags: ['Coding', 'Hackathon'] },
  { id: 'cur-startup-india', title: 'Startup India — Events & Programs', date: 'Ongoing', location: 'India', category: 'Gov / Startup', region: 'india', attendees: '—', description: 'Official Startup India programs, workshops, and government-backed events.', url: 'https://www.startupindia.gov.in/', source: 'gov', tags: ['Government', 'Startup'] },
  { id: 'cur-mygov', title: 'MyGov India — Engage & Events', date: 'Ongoing', location: 'India', category: 'Gov', region: 'india', attendees: '—', description: 'Citizen engagement, contests, and national campaigns from MyGov.', url: 'https://www.mygov.in/', source: 'gov', tags: ['Government', 'India'] },
  { id: 'cur-nss', title: 'National Career Service (NCS) Events', date: 'Ongoing', location: 'India', category: 'Career Fair', region: 'india', attendees: '—', description: 'Government career services, job fairs, and counselling events.', url: 'https://www.ncs.gov.in/', source: 'gov', tags: ['Government', 'Jobs'] },
  { id: 'cur-devfolio', title: 'Devfolio Hackathons (India)', date: 'Ongoing', location: 'India · Hybrid', category: 'Hackathon', region: 'india', attendees: '—', description: 'Popular college and community hackathons hosted on Devfolio.', url: 'https://devfolio.co/hackathons', source: 'devfolio', tags: ['Hackathon', 'College'] },
];

const CURATED_INTL = [
  { id: 'cur-mlh', title: 'Major League Hacking (MLH) Events', date: 'Seasonal calendar', location: 'Worldwide · Hybrid', category: 'Hackathon', region: 'international', attendees: '100K+', description: 'Official MLH student hackathon season — events across the world.', url: 'https://mlh.io/seasons/2025/events', source: 'mlh', tags: ['Hackathon', 'Global', 'Students'] },
  { id: 'cur-devpost', title: 'Devpost Hackathons', date: 'Ongoing', location: 'Worldwide · Online', category: 'Hackathon', region: 'international', attendees: '—', description: 'Global online and in-person hackathons with prizes and portfolio projects.', url: 'https://devpost.com/hackathons', source: 'devpost', tags: ['Hackathon', 'Global'] },
  { id: 'cur-eventbrite-tech', title: 'Eventbrite — Tech & Career Events', date: 'Ongoing', location: 'Worldwide', category: 'Meetup', region: 'international', attendees: '—', description: 'Discover workshops, meetups, and career events near you or online.', url: 'https://www.eventbrite.com/d/online/technology/', source: 'eventbrite', tags: ['Meetup', 'Workshop'] },
  { id: 'cur-meetup-tech', title: 'Meetup — Technology Groups', date: 'Ongoing', location: 'Worldwide', category: 'Meetup', region: 'international', attendees: '—', description: 'Local and virtual tech meetups, study groups, and networking.', url: 'https://www.meetup.com/find/?source=EVENTS&keywords=technology', source: 'meetup', tags: ['Meetup', 'Networking'] },
  { id: 'cur-hackathon-com', title: 'Hackathon.com Global Listings', date: 'Ongoing', location: 'Worldwide', category: 'Hackathon', region: 'international', attendees: '—', description: 'Aggregated global hackathon calendar.', url: 'https://www.hackathon.com/', source: 'hackathon.com', tags: ['Hackathon', 'Global'] },
  { id: 'cur-luma', title: 'Lu.ma Tech Events', date: 'Ongoing', location: 'Worldwide · Online', category: 'Meetup', region: 'international', attendees: '—', description: 'Modern event pages for tech talks, launches, and community sessions.', url: 'https://lu.ma/tech', source: 'luma', tags: ['Meetup', 'Community'] },
];

const ADZUNA_COUNTRIES = {
  india: ['in'],
  international: ['gb', 'us', 'ca', 'au', 'de', 'fr', 'nl', 'at', 'nz', 'pl', 'br', 'za', 'sg'],
  all: ['in', 'gb', 'us', 'ca', 'au', 'de'],
};

function mapAdzunaToEvent(j, country) {
  const title = j.title || 'Opportunity';
  const company = (j.company && j.company.display_name) || 'Organizer';
  const location = (j.location && j.location.display_name) || country.toUpperCase();
  const url = j.redirect_url || '';
  if (!url) return null;
  const description = (j.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 320);
  const created = j.created ? new Date(j.created).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently';
  const isIntern = /intern/i.test(title);
  const isHack = /hackathon|challenge|contest/i.test(title + ' ' + description);
  const category = isHack ? 'Hackathon' : isIntern ? 'Internship' : /workshop|training|course/i.test(title) ? 'Workshop' : 'Career';
  return {
    id: 'adz-' + country + '-' + (j.id || Math.random().toString(36).slice(2)),
    title: title,
    date: created,
    location: location,
    category: category,
    region: country === 'in' ? 'india' : 'international',
    attendees: '—',
    description: description || (company + ' — open role / program. Click to view full details and apply.'),
    url: url,
    source: 'adzuna',
    company: company,
    tags: [category, country.toUpperCase()].concat(j.category && j.category.label ? [j.category.label] : []).slice(0, 5),
    verified: true,
  };
}

async function fetchAdzunaCountry(country, what, page) {
  const appId = env('ADZUNA_APP_ID');
  const appKey = env('ADZUNA_APP_KEY');
  if (!appId || !appKey) {
    return { ok: false, events: [], error: 'Adzuna keys not configured' };
  }
  const q = encodeURIComponent(what || 'internship OR hackathon OR workshop');
  const pg = Math.max(1, Number(page) || 1);
  const url =
    'https://api.adzuna.com/v1/api/jobs/' +
    country +
    '/search/' +
    pg +
    '?app_id=' +
    encodeURIComponent(appId) +
    '&app_key=' +
    encodeURIComponent(appKey) +
    '&results_per_page=10&what=' +
    q +
    '&content-type=application/json';
  try {
    const res = await fetch(url);
    const data = await res.json().catch(function () { return {}; });
    if (!res.ok) return { ok: false, events: [], error: 'Adzuna ' + country + ' HTTP ' + res.status };
    const results = Array.isArray(data.results) ? data.results : [];
    const events = results.map(function (j) { return mapAdzunaToEvent(j, country); }).filter(Boolean);
    return { ok: true, events: events, count: data.count || events.length };
  } catch (e) {
    return { ok: false, events: [], error: String(e.message || e).slice(0, 120) };
  }
}

async function aiEnrich(events, region, query) {
  const groqKey = env('GROQ_API_KEY');
  const geminiKey = env('GEMINI_API_KEY');
  if (!groqKey && !geminiKey) {
    return { events: events, aiNote: 'AI keys not set — showing live + curated results only.', aiUsed: false };
  }
  const compact = events.slice(0, 24).map(function (e, i) {
    return { i: i, title: e.title, category: e.category, location: e.location, region: e.region, source: e.source };
  });
  const prompt =
    'You help students find real events, hackathons, workshops, and internships.\n' +
    'Region filter: ' + region + '. User query: ' + (query || 'general') + '.\n' +
    'Given this JSON list of events (index i), return JSON only:\n' +
    '{ "order": [indices best-first], "summaries": { "0": "one short student-friendly line" }, "note": "one sentence" }\n' +
    'Do NOT invent new events or URLs. Only reorder and summarize.\nEvents:\n' +
    JSON.stringify(compact);

  async function callGroq() {
    const model = env('GROQ_MODEL') || 'llama-3.1-8b-instant';
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + groqKey },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: 'Reply with valid JSON only. No markdown.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 900,
      }),
    });
    const data = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error((data && data.error && data.error.message) || 'Groq HTTP ' + res.status);
    return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
  }

  async function callGemini() {
    const model = env('GEMINI_MODEL') || 'gemini-2.0-flash';
    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + encodeURIComponent(geminiKey),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 900 },
        }),
      },
    );
    const data = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error('Gemini HTTP ' + res.status);
    const parts = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
    return (parts && parts[0] && parts[0].text) || '';
  }

  try {
    let raw = '';
    if (groqKey) {
      try { raw = await callGroq(); } catch (e1) {
        if (geminiKey) raw = await callGemini();
        else throw e1;
      }
    } else {
      raw = await callGemini();
    }
    const match = String(raw).match(/\{[\s\S]*\}/);
    if (!match) return { events: events, aiNote: 'AI returned non-JSON — showing original order.', aiUsed: true };
    const parsed = JSON.parse(match[0]);
    const order = Array.isArray(parsed.order) ? parsed.order : [];
    const summaries = parsed.summaries || {};
    let next = events.slice();
    if (order.length) {
      const picked = [];
      const used = {};
      order.forEach(function (idx) {
        if (typeof idx === 'number' && events[idx] && !used[idx]) {
          used[idx] = true;
          const copy = Object.assign({}, events[idx]);
          if (summaries[String(idx)]) copy.aiSummary = String(summaries[String(idx)]).slice(0, 220);
          picked.push(copy);
        }
      });
      events.forEach(function (e, idx) { if (!used[idx]) picked.push(e); });
      next = picked;
    } else {
      next = events.map(function (e, idx) {
        if (summaries[String(idx)]) return Object.assign({}, e, { aiSummary: String(summaries[String(idx)]).slice(0, 220) });
        return e;
      });
    }
    return { events: next, aiNote: parsed.note ? String(parsed.note).slice(0, 240) : 'AI re-ranked results for students.', aiUsed: true };
  } catch (e) {
    return { events: events, aiNote: 'AI refresh failed: ' + String(e.message || e).slice(0, 120), aiUsed: false };
  }
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });
  try {
    let region = 'india';
    let query = '';
    let page = 1;
    let aiRefresh = false;
    if (event.httpMethod === 'GET') {
      const q = event.queryStringParameters || {};
      region = (q.region || 'india').toLowerCase();
      query = q.query || q.what || '';
      page = q.page || 1;
      aiRefresh = q.aiRefresh === '1' || q.aiRefresh === 'true';
    } else if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      region = String(body.region || 'india').toLowerCase();
      query = body.query || body.what || '';
      page = body.page || 1;
      aiRefresh = Boolean(body.aiRefresh);
    } else {
      return json(405, { ok: false, error: 'Method not allowed' });
    }
    if (region !== 'india' && region !== 'international' && region !== 'all') region = 'india';

    const what =
      query.trim() ||
      (region === 'international'
        ? 'internship OR hackathon OR workshop OR graduate'
        : 'internship OR hackathon OR workshop');

    const countries = ADZUNA_COUNTRIES[region] || ADZUNA_COUNTRIES.india;
    const countrySlice = countries.slice(0, region === 'international' ? 6 : 1);
    const adzResults = await Promise.all(
      countrySlice.map(function (c) { return fetchAdzunaCountry(c, what, page); }),
    );

    let live = [];
    const errors = [];
    adzResults.forEach(function (r) {
      if (r.ok) live = live.concat(r.events || []);
      else if (r.error) errors.push(r.error);
    });

    const seen = {};
    live = live.filter(function (e) {
      if (!e.url || seen[e.url]) return false;
      seen[e.url] = true;
      return true;
    });

    let curated = [];
    if (region === 'india' || region === 'all') curated = curated.concat(CURATED_INDIA);
    if (region === 'international' || region === 'all') curated = curated.concat(CURATED_INTL);

    if (query.trim()) {
      const qlow = query.trim().toLowerCase();
      curated = curated.filter(function (e) {
        return (
          e.title.toLowerCase().includes(qlow) ||
          e.category.toLowerCase().includes(qlow) ||
          e.description.toLowerCase().includes(qlow) ||
          (e.tags || []).some(function (t) { return String(t).toLowerCase().includes(qlow); })
        );
      });
    }

    let combined = live.concat(curated);
    let aiNote = '';
    let aiUsed = false;
    if (aiRefresh && combined.length) {
      const enriched = await aiEnrich(combined, region, query);
      combined = enriched.events;
      aiNote = enriched.aiNote || '';
      aiUsed = enriched.aiUsed;
    }

    return json(200, {
      ok: true,
      region: region,
      query: query,
      count: combined.length,
      liveCount: live.length,
      curatedCount: curated.length,
      events: combined,
      aiUsed: aiUsed,
      aiNote: aiNote,
      warnings: errors.slice(0, 5),
      sources: ['adzuna', 'unstop', 'mlh', 'devpost', 'gov', 'hackerearth', 'devfolio', 'eventbrite', 'meetup'],
    });
  } catch (e) {
    return json(200, {
      ok: false,
      error: String(e.message || e).slice(0, 200),
      events: CURATED_INDIA.concat(CURATED_INTL),
      liveCount: 0,
      curatedCount: CURATED_INDIA.length + CURATED_INTL.length,
    });
  }
};

/**
 * Shared college-ID verification queue (works when Render /students/pending returns 401).
 * GET  → list pending (+ optional all)
 * POST → append compressed submission { name, email, fileName, documentDataUrl, mimeType, ... }
 * PATCH → { id, action: 'approve'|'reject' }
 *
 * Storage: Go /api/user-data under fixed userId so admin & student share one queue.
 */
const { proxyToGo } = require('./_lib/goProxy');

const SYSTEM_USER = 'college-verifications-queue';
const DATA_KEY = 'queue';

function cors(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

function resolveGoBase() {
  return (process.env.GO_API_URL || process.env.BACKEND_URL || 'https://eduroute-api-nho4.onrender.com')
    .trim()
    .replace(/\/$/, '');
}

async function readQueue() {
  const base = resolveGoBase();
  const q = `key=${encodeURIComponent(DATA_KEY)}&userId=${encodeURIComponent(SYSTEM_USER)}`;
  try {
    const res = await fetch(`${base}/api/user-data?${q}`, {
      headers: { 'X-User-Id': SYSTEM_USER, 'Content-Type': 'application/json' },
    });
    if (!res.ok) return [];
    const body = await res.json();
    const data = body?.data ?? body;
    const payload = data?.payload ?? data;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.items)) return payload.items;
    return [];
  } catch {
    return [];
  }
}

async function writeQueue(items) {
  const base = resolveGoBase();
  const res = await fetch(`${base}/api/user-data`, {
    method: 'POST',
    headers: { 'X-User-Id': SYSTEM_USER, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: SYSTEM_USER,
      key: DATA_KEY,
      payload: { items: items.slice(0, 200) },
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(t.slice(0, 120) || `write failed ${res.status}`);
  }
  return true;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors(200, { ok: true });

  try {
    if (event.httpMethod === 'GET') {
      const items = await readQueue();
      const pendingOnly = (event.queryStringParameters || {}).all !== '1';
      const list = pendingOnly ? items.filter((x) => x.status === 'pending') : items;
      return cors(200, { ok: true, data: list, total: list.length });
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const email = String(body.email || '').toLowerCase().trim();
      if (!email || !body.documentDataUrl) {
        return cors(400, { ok: false, error: 'email and documentDataUrl required' });
      }
      let items = await readQueue();
      // replace prior pending for same email
      items = items.filter(
        (x) => !(String(x.email).toLowerCase() === email && x.status === 'pending'),
      );
      const id = `cv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const entry = {
        id,
        verificationId: id,
        name: body.name || 'Student',
        email: body.email,
        phone: body.phone,
        course: body.course,
        college: body.college,
        location: body.location,
        fileName: body.fileName || 'id.jpg',
        documentDataUrl: body.documentDataUrl,
        mimeType: body.mimeType || 'image/jpeg',
        appliedAt: new Date().toISOString(),
        status: 'pending',
        compressed: Boolean(body.compressed),
        source: 'queue',
      };
      items = [entry, ...items];
      await writeQueue(items);
      return cors(200, { ok: true, data: entry });
    }

    if (event.httpMethod === 'PATCH') {
      const body = JSON.parse(event.body || '{}');
      const id = body.id || body.verificationId;
      const action = body.action;
      if (!id || !['approve', 'reject'].includes(action)) {
        return cors(400, { ok: false, error: 'id and action required' });
      }
      const status = action === 'approve' ? 'verified' : 'rejected';
      let items = await readQueue();
      let found = false;
      items = items.map((x) => {
        if (x.id === id || x.verificationId === id) {
          found = true;
          return { ...x, status };
        }
        return x;
      });
      if (!found) return cors(404, { ok: false, error: 'not found' });
      await writeQueue(items);
      return cors(200, { ok: true, data: { id, status } });
    }

    return cors(405, { ok: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('college-verifications', err);
    return cors(500, { ok: false, error: err.message || 'Server error' });
  }
};

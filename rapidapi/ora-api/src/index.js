import { ERRORS } from './data.js';

const VERSION = '1.0.0';
const BY_CODE = new Map(ERRORS.map(e => [e.code, e]));
const CODE_RE = /\b(ORA|PLS)[-_ ]?(\d{1,5})\b/gi;

export function normalize(raw) {
  if (raw == null) return null;
  const s = String(raw).trim().toUpperCase();
  let m = s.match(/^(ORA|PLS)[-_ ]?(\d{1,5})$/);
  if (m) return `${m[1]}-${m[2].padStart(5, '0')}`;
  m = s.match(/^(\d{1,5})$/);
  if (m) return `ORA-${m[1].padStart(5, '0')}`;
  return null;
}

const view = e => ({ code: e.code, title: e.title, cause: e.cause, action: e.action,
  url: `https://catalonec1.github.io/Gr-dina-de-stele/ora/${e.code.toLowerCase()}.html` });

export function lookup(raw) {
  const code = normalize(raw);
  if (!code) return { status: 400, body: { error: 'invalid_code', message: 'Use a code like ORA-00942, ORA-942, 942 or PLS-00201.' } };
  const e = BY_CODE.get(code);
  if (!e) return { status: 404, body: { error: 'not_found', code, message: 'This code is not in the catalog yet.' } };
  return { status: 200, body: view(e) };
}

export function search(q, limit = 10) {
  const terms = String(q || '').toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return { status: 400, body: { error: 'missing_query', message: 'Pass ?q=words' } };
  const scored = [];
  for (const e of ERRORS) {
    const t = e.title.toLowerCase(), all = (e.code + ' ' + e.title + ' ' + e.cause + ' ' + e.action).toLowerCase();
    let s = 0;
    for (const w of terms) { if (t.includes(w)) s += 3; else if (all.includes(w)) s += 1; else { s = 0; break; } }
    if (s) scored.push([s, e]);
  }
  scored.sort((a, b) => b[0] - a[0] || a[1].code.localeCompare(b[1].code));
  const n = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
  return { status: 200, body: { query: q, total: scored.length, results: scored.slice(0, n).map(x => view(x[1])) } };
}

export function explain(text) {
  if (typeof text !== 'string' || !text.trim()) return { status: 400, body: { error: 'missing_text', message: 'POST JSON {"text": "<error stack or log>"}' } };
  if (text.length > 100000) return { status: 413, body: { error: 'too_large', message: 'Max 100000 characters.' } };
  const seen = new Set(), found = [], unknown = [];
  for (const m of text.matchAll(CODE_RE)) {
    const code = normalize(m[1] + '-' + m[2]);
    if (seen.has(code)) continue;
    seen.add(code);
    const e = BY_CODE.get(code);
    if (e) found.push(view(e)); else unknown.push(code);
  }
  return { status: 200, body: { count: found.length, errors: found, unknown, primary: found[0] ? found[0].code : null } };
}

export function list(prefix, page = 1, size = 50) {
  const p = prefix ? String(prefix).toUpperCase() : null;
  if (p && p !== 'ORA' && p !== 'PLS') return { status: 400, body: { error: 'invalid_prefix', message: 'prefix must be ORA or PLS' } };
  const items = ERRORS.filter(e => !p || e.code.startsWith(p));
  const sz = Math.min(Math.max(parseInt(size, 10) || 50, 1), 100);
  const pg = Math.max(parseInt(page, 10) || 1, 1);
  return { status: 200, body: { total: items.length, page: pg, size: sz,
    items: items.slice((pg - 1) * sz, pg * sz).map(e => ({ code: e.code, title: e.title })) } };
}

const json = (status, body) => new Response(JSON.stringify(body), { status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: {
      'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': '*' } });
    if (path === '/' || path === '/health') return json(200, { ok: true, service: 'oracle-error-explainer', version: VERSION, errors: ERRORS.length });
    // Only RapidAPI may call the data endpoints once the secret is configured.
    const secret = env && env.RAPIDAPI_PROXY_SECRET;
    if (secret && request.headers.get('x-rapidapi-proxy-secret') !== secret)
      return json(403, { error: 'forbidden', message: 'Subscribe on RapidAPI to use this API.' });
    let r;
    const m = path.match(/^\/errors\/([^/]+)$/);
    if (m && request.method === 'GET') r = lookup(decodeURIComponent(m[1]));
    else if (path === '/errors' && request.method === 'GET') r = list(url.searchParams.get('prefix'), url.searchParams.get('page'), url.searchParams.get('size'));
    else if (path === '/search' && request.method === 'GET') r = search(url.searchParams.get('q'), url.searchParams.get('limit'));
    else if (path === '/explain' && request.method === 'POST') {
      let body;
      try { body = await request.json(); } catch { return json(400, { error: 'invalid_json', message: 'Body must be JSON {"text": "..."}' }); }
      r = explain(body && body.text);
    } else r = { status: 404, body: { error: 'no_route', routes: ['GET /errors/{code}', 'GET /errors', 'GET /search?q=', 'POST /explain'] } };
    return json(r.status, r.body);
  }
};

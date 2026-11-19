import http from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { validateBrief, validateStorefront, InputError, validSlug, validEmail } from './lib/validation.js';
import { generateFromAI } from './lib/ai.js';
import { storageMode, tokenHash, equalsToken, insertStore, getStore, updateStore, addLead, getLeads, deleteLead } from './lib/store.js';
import { checkLimit } from './lib/rate-limit.js';
import { publicStorefrontPage, notFoundPage } from './lib/template.js';

const DIR = resolve(fileURLToPath(new URL('./public/', import.meta.url)));
const PORT = Number(process.env.PORT || 3000);
const MAX_BODY = 24 * 1024;
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.ico':'image/x-icon', '.json':'application/json' };
const HEADERS = { 'x-content-type-options':'nosniff', 'referrer-policy':'strict-origin-when-cross-origin', 'x-frame-options':'DENY', 'permissions-policy':'camera=(), microphone=(), geolocation=()',
  'content-security-policy':"default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'" };
function write(res, status, body, contentType = 'text/html; charset=utf-8', extras = {}) {
  res.writeHead(status, { ...HEADERS, 'content-type':contentType, 'cache-control':'no-store', ...extras });
  res.end(body);
}
function json(res, status, data, extras = {}) { write(res, status, JSON.stringify(data), 'application/json; charset=utf-8', extras); }
function fail(res, error) {
  if (!(error instanceof InputError)) console.error('Unexpected server error:', error?.message || error);
  const known = error instanceof InputError;
  return json(res, known ? error.status : 503,
    { error: known ? error.message : 'The service is temporarily unavailable. Please try again.', code: known ? error.code : 'SERVER_ERROR' });
}
async function bodyJson(req) {
  if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) throw new InputError('Send JSON content.');
  let size = 0;
  const parts = [];
  for await (const part of req) {
    size += part.length;
    if (size > MAX_BODY) throw new InputError('The request is too large. Try shorter text.', 413, 'BODY_TOO_LARGE');
    parts.push(part);
  }
  try { return JSON.parse(Buffer.concat(parts).toString('utf8')); }
  catch { throw new InputError('Could not read the request. Try again.'); }
}
function verifyOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return;
  try {
    if (new URL(origin).host !== req.headers.host) throw new Error('Cross-origin');
  } catch { throw new InputError('This request must come from the storefront page.', 403, 'ORIGIN_MISMATCH'); }
}
function slugFor(name) {
  const prefix = String(name).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 42).replace(/-$/,'') || 'creator';
  return `${prefix}-${randomBytes(4).toString('hex')}`;
}
function ownerToken(req) {
  const value = req.headers['x-edit-token'];
  if (typeof value !== 'string' || !/^[0-9a-f]{64}$/.test(value)) throw new InputError('Only the owner of this draft can access this action in this browser.', 403, 'NO_EDIT_ACCESS');
  return value;
}
function publicOrigin(req) {
  const configured = String(process.env.PUBLIC_BASE_URL || '').trim();
  if (configured && /^https?:\/\//.test(configured)) return configured.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  const host = String(req.headers.host || `localhost:${PORT}`).replace(/[^a-zA-Z0-9.:-]/g, '');
  return `${proto}://${host}`;
}
async function serveAsset(req, res, path) {
  const relative = path === '/' ? 'index.html' : path.replace(/^\/assets\//, '');
  if (relative.includes('..') || relative.includes('\\') || relative.startsWith('/') || relative.startsWith('.')) {
    return write(res, 404, notFoundPage());
  }
  const full = resolve(DIR, relative);
  if (!full.startsWith(DIR + sep)) return write(res, 404, notFoundPage());
  try {
    const stats = statSync(full);
    if (!stats.isFile()) throw Error('Not file');
    res.writeHead(200, { ...HEADERS, 'content-type': types[extname(full)] || 'application/octet-stream',
      'cache-control': path === '/' ? 'no-store' : 'public, max-age=600', 'content-length': stats.size });
    createReadStream(full).pipe(res);
  } catch { write(res, 404, notFoundPage()); }
}

export async function handleRequest(req, res) {
  const address = new URL(req.url || '/', 'http://localhost');
  const path = address.pathname;
  const method = req.method === 'HEAD' ? 'GET' : (req.method || 'GET');
  try {
    if (method === 'GET' && (path === '/api/health' || path === '/health')) {
      return json(res, 200, { ok:true, aiConfigured:Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'replace_me'), persistence:storageMode(), livePayments:false });
    }
    if (['POST','PUT','DELETE'].includes(method) && path.startsWith('/api/')) verifyOrigin(req);

    if (method === 'POST' && path === '/api/generate') {
      if (!checkLimit(req, 'generate', 8, 60 * 60 * 1000)) throw new InputError('Too many generations from this connection. Try again later.', 429, 'RATE_LIMIT');
      const brief = validateBrief(await bodyJson(req));
      const result = await generateFromAI(brief);
      return json(res, 200, result);
    }
    if (method === 'POST' && path === '/api/publish') {
      if (!checkLimit(req, 'publish', 14, 60 * 60 * 1000)) throw new InputError('Publishing is temporarily rate-limited. Try again later.', 429, 'RATE_LIMIT');
      const body = await bodyJson(req);
      const store = validateStorefront(body?.store);
      const token = randomBytes(32).toString('hex');
      const hash = tokenHash(token);
      let slug;
      let saved = false;
      for (let i = 0; i < 4 && !saved; i++) {
        slug = slugFor(store.creatorName);
        saved = await insertStore(slug, store, hash);
      }
      if (!saved) throw new InputError('Could not choose a unique link. Please retry publishing.', 503, 'SLUG_CONFLICT');
      return json(res, 201, { slug, url:`${publicOrigin(req)}/s/${slug}`, editToken:token, isNew:true });
    }
    if (method === 'PUT' && path === '/api/publish') {
      const token = ownerToken(req);
      const body = await bodyJson(req);
      if (!validSlug(body?.slug)) throw new InputError('The published link is invalid.');
      const current = await getStore(body.slug);
      if (!current) throw new InputError('This storefront was not found.', 404, 'NOT_FOUND');
      if (!equalsToken(token, current.ownerHash)) throw new InputError('This browser does not have permission to edit the live store.', 403, 'NO_EDIT_ACCESS');
      const store = validateStorefront(body?.store);
      if (!(await updateStore(body.slug, store, current.ownerHash))) throw new InputError('Could not update the page. Please retry.', 503, 'UPDATE_FAILED');
      return json(res, 200, { slug:body.slug, url:`${publicOrigin(req)}/s/${body.slug}`, updated:true });
    }
    if (method === 'POST' && path === '/api/interest') {
      if (!checkLimit(req, 'interest', 20, 60 * 60 * 1000)) throw new InputError('Too many requests. Try again later.', 429, 'RATE_LIMIT');
      const body = await bodyJson(req);
      if (body?.website) return json(res, 200, { ok:true, registered:true });
      const slug = body?.slug;
      if (!validSlug(slug)) throw new InputError('That page link is invalid.');
      const current = await getStore(slug);
      if (!current) throw new InputError('This storefront does not exist.', 404, 'NOT_FOUND');
      const productId = String(body?.productId || '');
      const product = current.store.products.find(p => p.id === productId && p.visible);
      if (!product) throw new InputError('That offer is not available.', 404, 'OFFER_NOT_FOUND');
      if (body.consent !== true) throw new InputError('Please agree to share your email with this creator.');
      const email = validEmail(body.email);
      const isNew = await addLead(slug, productId, email);
      return json(res, 200, { ok:true, registered:true, isNew });
    }
    if (method === 'GET' && path === '/api/leads') {
      const slug = address.searchParams.get('slug');
      if (!validSlug(slug)) throw new InputError('That page link is invalid.');
      const current = await getStore(slug);
      if (!current) throw new InputError('Store not found.', 404, 'NOT_FOUND');
      if (!equalsToken(ownerToken(req), current.ownerHash)) throw new InputError('You do not have access to these leads.', 403, 'NO_EDIT_ACCESS');
      const leads = await getLeads(slug);
      return json(res, 200, { count:leads.length, leads });
    }
    if (method === 'DELETE' && path === '/api/leads') {
      const token = ownerToken(req);
      const body = await bodyJson(req);
      if (!validSlug(body?.slug)) throw new InputError('That page link is invalid.');
      const current = await getStore(body.slug);
      if (!current) throw new InputError('Store not found.', 404, 'NOT_FOUND');
      if (!equalsToken(token, current.ownerHash)) throw new InputError('You cannot delete leads from this storefront.', 403, 'NO_EDIT_ACCESS');
      const productId = String(body?.productId || '');
      if (!current.store.products.some(p => p.id === productId)) throw new InputError('This offer is not found.', 404, 'OFFER_NOT_FOUND');
      const email = validEmail(body.email);
      return json(res, 200, { deleted:await deleteLead(body.slug, productId, email) });
    }
    if (method === 'GET' && path.startsWith('/s/')) {
      const slug = path.slice(3);
      if (!validSlug(slug)) return write(res, 404, notFoundPage());
      const row = await getStore(slug);
      if (!row) return write(res, 404, notFoundPage());
      return write(res, 200, publicStorefrontPage(row, publicOrigin(req)));
    }
    if (method === 'GET' && (path === '/' || path.startsWith('/assets/') || path === '/favicon.ico')) return serveAsset(req, res, path === '/favicon.ico' ? '/assets/favicon.ico' : path);
    if (method === 'GET' && path === '/robots.txt') return write(res, 200, 'User-agent: *\nDisallow: /api/\n', 'text/plain; charset=utf-8');
    if (path.startsWith('/api/')) return json(res, 404, { error:'This API route does not exist.', code:'NOT_FOUND' });
    return write(res, 404, notFoundPage());
  } catch (error) { return fail(res, error); }
}

if (process.env.NODE_ENV !== 'test') {
  http.createServer((req, res) => { handleRequest(req, res).catch(err => fail(res, err)); }).listen(PORT, '0.0.0.0', () => {
    console.log(`Sparkform ready on http://localhost:${PORT} | AI ${process.env.OPENAI_API_KEY ? 'configured' : 'not configured'} | ${storageMode()}`);
  });
}

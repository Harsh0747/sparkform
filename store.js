import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createHash, timingSafeEqual } from 'node:crypto';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL?.trim();
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
const USE_REDIS = Boolean(REDIS_URL && REDIS_TOKEN);

let db;
function sqlite() {
  if (db) return db;
  const path = resolve(process.env.STORE_DB_PATH || './data/sparkform.sqlite');
  mkdirSync(dirname(path), { recursive: true });
  db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS stores (slug TEXT PRIMARY KEY, payload TEXT NOT NULL, token_hash TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS leads (slug TEXT NOT NULL, product_id TEXT NOT NULL, email TEXT NOT NULL, created_at TEXT NOT NULL,
      PRIMARY KEY(slug, product_id, email));`);
  return db;
}

async function redis(...args) {
  const response = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${REDIS_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(7000)
  });
  if (!response.ok) throw new Error('Persistent storage is unavailable');
  const payload = await response.json();
  if (payload.error) throw new Error('Persistent storage rejected a command');
  return payload.result;
}

export function storageMode() { return USE_REDIS ? 'upstash-redis' : 'local-sqlite'; }

export function tokenHash(token) { return createHash('sha256').update(token).digest('hex'); }
export function equalsToken(presented, expectedHash) {
  if (typeof presented !== 'string' || presented.length !== 64 || !/^[0-9a-f]+$/.test(presented)) return false;
  const left = Buffer.from(tokenHash(presented), 'hex');
  const right = Buffer.from(String(expectedHash || ''), 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function insertStore(slug, store, ownerHash) {
  const now = new Date().toISOString();
  const row = { slug, store, ownerHash, createdAt: now, updatedAt: now };
  if (USE_REDIS) return (await redis('SET', `sparkform:store:${slug}`, JSON.stringify(row), 'NX')) === 'OK';
  const result = sqlite().prepare('INSERT OR IGNORE INTO stores (slug,payload,token_hash,created_at,updated_at) VALUES (?,?,?,?,?)')
    .run(slug, JSON.stringify(store), ownerHash, now, now);
  return result.changes > 0;
}

export async function getStore(slug) {
  if (USE_REDIS) {
    const value = await redis('GET', `sparkform:store:${slug}`);
    return value ? JSON.parse(value) : null;
  }
  const row = sqlite().prepare('SELECT * FROM stores WHERE slug=?').get(slug);
  if (!row) return null;
  return { slug: row.slug, store: JSON.parse(row.payload), ownerHash: row.token_hash,
    createdAt: row.created_at, updatedAt: row.updated_at };
}

export async function updateStore(slug, store, ownerHash) {
  const existing = await getStore(slug);
  if (!existing || existing.ownerHash !== ownerHash) return false;
  const now = new Date().toISOString();
  if (USE_REDIS) {
    await redis('SET', `sparkform:store:${slug}`, JSON.stringify({ ...existing, store, updatedAt: now }));
    return true;
  }
  const res = sqlite().prepare('UPDATE stores SET payload=?,updated_at=? WHERE slug=? AND token_hash=?')
    .run(JSON.stringify(store), now, slug, ownerHash);
  return res.changes === 1;
}

export async function addLead(slug, productId, email) {
  const now = new Date().toISOString();
  if (USE_REDIS) {
    const hash = createHash('sha256').update(`${productId}:${email}`).digest('hex');
    return (await redis('HSETNX', `sparkform:leads:${slug}`, hash,
      JSON.stringify({ productId, email, createdAt: now }))) === 1;
  }
  const result = sqlite().prepare('INSERT OR IGNORE INTO leads (slug,product_id,email,created_at) VALUES (?,?,?,?)')
    .run(slug, productId, email, now);
  return result.changes > 0;
}

export async function getLeads(slug) {
  if (USE_REDIS) {
    const values = await redis('HGETALL', `sparkform:leads:${slug}`);
    if (!values) return [];
    const encoded = Array.isArray(values) ? values.filter((_, i) => i % 2 === 1) : Object.values(values);
    return encoded.map(v => JSON.parse(v)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  return sqlite().prepare('SELECT product_id AS productId,email,created_at AS createdAt FROM leads WHERE slug=? ORDER BY created_at DESC')
    .all(slug);
}

export async function deleteLead(slug, productId, email) {
  if (USE_REDIS) {
    const hash = createHash('sha256').update(`${productId}:${email}`).digest('hex');
    return (await redis('HDEL', `sparkform:leads:${slug}`, hash)) === 1;
  }
  const result = sqlite().prepare('DELETE FROM leads WHERE slug=? AND product_id=? AND email=?').run(slug, productId, email);
  return result.changes > 0;
}

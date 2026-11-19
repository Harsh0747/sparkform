// Process-local anti-abuse control. This is deliberately a best-effort limit:
// production multi-instance use should add a distributed edge limit.
import { createHash } from 'node:crypto';
const buckets = new Map();
export function clientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.socket.remoteAddress || 'unknown';
}
export function checkLimit(req, type, quota, windowMs) {
  const ipHash = createHash('sha256').update(clientIp(req)).digest('hex').slice(0, 16);
  const key = `${type}:${ipHash}`;
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.until < now) b = { uses: 0, until: now + windowMs };
  b.uses += 1;
  buckets.set(key, b);
  if (buckets.size > 2000) {
    for (const [k, v] of buckets) if (v.until < now) buckets.delete(k);
  }
  return b.uses <= quota;
}

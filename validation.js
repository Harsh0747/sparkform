export class InputError extends Error {
  constructor(message, status = 400, code = 'INVALID_INPUT') {
    super(message);
    this.name = 'InputError';
    this.status = status;
    this.code = code;
  }
}

export function clean(value, max = 120) {
  return String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/\s+/g, ' ').trim().slice(0, max);
}

export function normalizeHandle(value) {
  const raw = clean(value, 90).replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '').replace(/\/$/, '').split(/[/?#]/)[0];
  if (!raw) return '';
  if (!/^[a-zA-Z0-9._]{1,30}$/.test(raw) || raw.startsWith('.') || raw.endsWith('.') || raw.includes('..')) {
    throw new InputError('Enter a valid Instagram handle (letters, numbers, dots or underscores).');
  }
  return raw.toLowerCase();
}

function looksLikeGibberish(description) {
  const letters = [...description.matchAll(/\p{L}/gu)].map(m => m[0]);
  const distinct = new Set(letters.map(x => x.toLowerCase())).size;
  const words = description.split(/\s+/).filter(Boolean);
  if (letters.length < 26 || distinct < 7 || words.length < 6) return true;
  if (/(.)\1{6,}/iu.test(description)) return true;
  const asciiWords = words.filter(w => /^[a-zA-Z]+$/.test(w));
  const allAscii = letters.every(c => /[a-zA-Z]/.test(c));
  if (allAscii && asciiWords.length >= 5) {
    const vowels = letters.filter(c => /[aeiou]/i.test(c)).length;
    if (vowels / letters.length < 0.12) return true;
  }
  return false;
}

export function validateBrief(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new InputError('Please describe your expertise first.');
  const creatorName = clean(input.creatorName, 60);
  const description = clean(input.description, 1000);
  const audience = clean(input.audience, 180);
  const handle = normalizeHandle(input.handle || '');
  if (description.length < 45) {
    throw new InputError(handle
      ? 'We cannot read Instagram profiles from a handle alone. Add 2-3 sentences about what you teach, who it helps, and the result.'
      : 'Add a little more detail (at least 45 characters) about your expertise, audience, and the result you help them achieve.');
  }
  if (looksLikeGibberish(description)) {
    throw new InputError('We could not understand this description. Try 2-3 clear sentences about your skills and whom you help.');
  }
  const goal = ['first_sale', 'grow_audience', 'premium'].includes(input.goal) ? input.goal : 'first_sale';
  const tone = ['warm', 'bold', 'calm'].includes(input.tone) ? input.tone : 'warm';
  const pricing = ['accessible', 'balanced', 'premium'].includes(input.pricing) ? input.pricing : 'balanced';
  return { creatorName, description, audience, handle, goal, tone, pricing };
}

export const formats = ['guide', 'template', 'workshop', 'session', 'course', 'challenge', 'other'];
export const themes = ['mint', 'lavender', 'sunset', 'midnight'];

function requiredString(value, label, max, min = 2) {
  const str = clean(value, max + 2);
  if (str.length < min || str.length > max) throw new InputError(`Check the ${label} field (${min}-${max} characters).`);
  return str;
}

export function validateStorefront(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new InputError('Store content is missing.');
  const products = input.products;
  if (!Array.isArray(products) || products.length < 2 || products.length > 4) {
    throw new InputError('A storefront needs 2-4 products.');
  }
  const ids = new Set();
  const checked = products.map((p, index) => {
    if (!p || typeof p !== 'object') throw new InputError(`Product ${index + 1} is incomplete.`);
    const id = String(p.id ?? '').trim();
    if (!/^[a-z0-9-]{3,50}$/.test(id) || ids.has(id)) throw new InputError('Each product needs a unique ID.');
    ids.add(id);
    if (!Number.isInteger(p.price) || p.price < 0 || p.price > 100000) {
      throw new InputError(`Enter a valid INR price (0-100000) for product ${index + 1}.`);
    }
    const includes = Array.isArray(p.includes) ? p.includes : [];
    if (includes.length < 1 || includes.length > 5) throw new InputError('Give each product 1-5 included items.');
    return {
      id,
      format: formats.includes(p.format) ? p.format : 'other',
      title: requiredString(p.title, 'product title', 72),
      description: requiredString(p.description, 'product description', 360, 18),
      includes: includes.map(x => requiredString(x, 'included item', 100, 3)),
      price: p.price,
      whyThisWorks: clean(p.whyThisWorks, 240),
      cta: requiredString(p.cta || 'Get updates', 'product button', 30, 2),
      visible: p.visible !== false
    };
  });
  if (!checked.some(p => p.visible)) throw new InputError('Keep at least one offer visible before publishing.');
  let handle = normalizeHandle(input.handle || '');
  return {
    creatorName: requiredString(input.creatorName, 'creator name', 60),
    handle,
    tagline: requiredString(input.tagline, 'headline', 110, 6),
    bio: requiredString(input.bio, 'bio', 420, 25),
    audience: clean(input.audience, 160),
    positioning: clean(input.positioning, 350),
    theme: themes.includes(input.theme) ? input.theme : 'mint',
    products: checked
  };
}

export function validEmail(email) {
  const normalized = clean(email, 254).toLowerCase();
  if (normalized.length < 6 || normalized.length > 190 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized)) {
    throw new InputError('Enter a valid email address.');
  }
  return normalized;
}

export function validSlug(slug) {
  return typeof slug === 'string' && /^[a-z0-9][a-z0-9-]{5,85}$/.test(slug);
}

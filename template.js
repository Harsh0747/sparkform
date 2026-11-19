import { escapeHTML as esc, safeJSON } from './utils.js';
const fmtPrice = value => value === 0 ? 'Free' : `&#8377;${Number(value).toLocaleString('en-IN')}`;
const formatLabels = { guide:'Guide', template:'Template', workshop:'Workshop', session:'1:1 session', course:'Course', challenge:'Challenge', other:'Digital offer' };
function card(product, index) {
  const includes = product.includes.map(x => `<li>${esc(x)}</li>`).join('');
  return `<article class="offer-card" id="${esc(product.id)}" data-offer="${esc(product.id)}">
    <div class="offer-card-top"><span class="offer-type">${esc(formatLabels[product.format] || 'Offer')}</span><span class="offer-count">0${index + 1} / OFFER</span></div>
    <h3>${esc(product.title)}</h3>
    <p class="offer-description">${esc(product.description)}</p>
    <ul class="offer-includes">${includes}</ul>
    <div class="offer-bottom"><div class="offer-price">${fmtPrice(product.price)}</div>
      <button class="btn btn-dark offer-interest" type="button" data-interest="${esc(product.id)}">${esc(product.cta)}</button>
    </div>
  </article>`;
}
export function publicStorefrontPage(row, origin) {
  const s = row.store;
  const first = s.creatorName.trim().slice(0, 1).toUpperCase();
  const safeLink = `${origin}/s/${row.slug}`;
  const handleLink = s.handle ? `<a class="ig-link" href="https://www.instagram.com/${encodeURIComponent(s.handle)}/" target="_blank" rel="noopener noreferrer">@${esc(s.handle)} <span aria-hidden="true">&#8599;</span></a>` : '';
  const cards = s.products.filter(p => p.visible).map(card).join('');
  const productData = s.products.filter(p => p.visible).map(({ id, title, price }) => ({ id, title, price }));
  return `<!doctype html><html lang="en"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#f7f7f3">
  <title>${esc(s.creatorName)} | ${esc(s.tagline)} | Sparkform</title>
  <meta name="description" content="${esc(s.bio.slice(0, 155))}">
  <meta property="og:type" content="website"><meta property="og:title" content="${esc(s.creatorName)} | ${esc(s.tagline)}">
  <meta property="og:description" content="${esc(s.bio.slice(0, 180))}">
  <meta property="og:url" content="${esc(safeLink)}">
  <meta name="twitter:card" content="summary">
  <link rel="icon" href="/assets/logo.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/styles.css">
  <script defer src="/assets/storefront.js"></script></head>
  <body class="store-page theme-${esc(s.theme)}">
    <div class="store-announcement">A small idea, a big first step <span class="spark-symbol" aria-hidden="true">&#10022;</span></div>
    <header class="store-nav"><a href="/" class="brand-mini"><img src="/assets/logo.svg" alt="" width="29" height="29"><span>sparkform<span class="brand-dot">.</span></span></a>
      <button id="share-store" class="text-action" type="button"><span aria-hidden="true">&#8599;</span> Share page</button></header>
    <main class="store-main">
      <section class="creator-hero"><div class="creator-avatar" aria-hidden="true">${esc(first)}</div>
        <div class="hero-kicker">WELCOME TO MY SPACE <span aria-hidden="true">&#10022;</span></div>
        <h1>${esc(s.tagline)}</h1>
        <p class="creator-bio">${esc(s.bio)}</p>
        <div class="creator-identity"><span>${esc(s.creatorName)}</span>${handleLink}</div>
      </section>
      <section class="offers-section" id="offers"><div class="section-eyebrow"><span class="eyebrow-rule"></span> HANDPICKED FOR YOU</div>
        <div class="offers-heading"><h2>Let's make something happen.</h2><p>Explore the ways we can work together, learn, or get started.</p></div>
        <div class="offers-grid">${cards}</div>
        <div class="disclaimer"><strong>Heads up:</strong> These are proposed offers, not live checkout products. Tap an offer to register interest; no payment is taken.</div>
      </section>
      <section class="store-closer"><div class="decor-spark" aria-hidden="true">&#10022;</div><p>YOUR NEXT CHAPTER STARTS HERE</p><h2>Good things begin with a single step.</h2><a href="#offers" class="btn btn-dark">Explore offers <span aria-hidden="true">&#8599;</span></a></section>
    </main>
    <footer class="public-footer"><span>Made with <a href="/">sparkform<span class="brand-dot">.</span></a></span><a href="https://superprofile.bio/" target="_blank" rel="noopener noreferrer">Creator commerce by SuperProfile &#8599;</a></footer>
    <div class="modal-backdrop" id="interest-modal" hidden><div class="interest-dialog" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <button type="button" class="dialog-close" id="close-interest" aria-label="Close dialog">&#10005;</button>
      <div class="dialog-icon" aria-hidden="true">&#10022;</div><div class="section-eyebrow">STAY IN THE LOOP</div>
      <h2 id="modal-title">Be first to know.</h2><p class="modal-explain" id="modal-description">Leave your email and we'll share your interest with this creator.</p>
      <form id="interest-form"><label for="lead-email">Email address</label><input id="lead-email" type="email" autocomplete="email" placeholder="you@example.com" maxlength="190" required>
        <label class="consent-label"><input type="checkbox" id="lead-consent" required><span>I agree to share my email with this creator for updates about this offer.</span></label>
        <input type="text" name="website" id="lead-honeypot" tabindex="-1" autocomplete="off" class="visually-hidden" aria-hidden="true">
        <button type="submit" class="btn btn-dark btn-wide" id="submit-interest">Register my interest &#8599;</button>
      </form><div class="form-feedback" id="interest-feedback" aria-live="polite"></div><p class="privacy-note">No purchase, payment or automatic email is involved. Your email is stored for the creator to follow up.</p>
    </div></div>
    <div id="toast" class="toast" role="status" aria-live="polite"></div>
    <script id="store-data" type="application/json">${safeJSON({ slug: row.slug, productData })}</script>
  </body></html>`;
}

export function notFoundPage() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Storefront not found | Sparkform</title><link rel="stylesheet" href="/assets/styles.css"></head><body class="error-page"><div class="error-container"><div class="error-icon">&#10022;</div><h1>This store isn't here (yet).</h1><p>The link may have been mistyped, or the page may no longer be available.</p><a href="/" class="btn btn-dark">Create a storefront &#8599;</a></div></body></html>`;
}

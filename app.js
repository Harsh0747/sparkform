const byId = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const money = n => Number.isInteger(n) && n >= 0 ? (n === 0 ? 'Free' : '\u20B9' + n.toLocaleString('en-IN')) : 'Check price';
const fmtNames = { guide:'Guide',template:'Template',workshop:'Workshop',session:'1:1 session',course:'Course',challenge:'Challenge',other:'Other' };
const STORAGE_KEY = 'sparkform-draft-v1';
const example = 'I teach beginner-friendly home workouts and simple nutrition habits to busy Indian working professionals. I help people build sustainable routines without fancy equipment or extreme dieting.';
const messages = [
  'Finding the first offer that makes sense for your audience...',
  'Shaping an easy-to-launch offer ladder in INR...',
  'Writing friendly copy for your new storefront...',
  'Checking the draft for a clear first step...'
];
let brief = { creatorName:'', handle:'', description:'', audience:'', goal:'first_sale', tone:'warm', pricing:'balanced' };
let store = null;
let published = null;
let lastLeads = [];
let editorOpen = new Set();
let generationBusy = false;
let publishBusy = false;
let saveTimer;
let toastTimer;

function toast(text) {
  const el = byId('toast');
  el.textContent = text;
  el.classList.add('active');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('active'), 3900);
}
function showError(id, error) {
  const el = byId(id);
  el.textContent = error;
  el.hidden = !error;
  if (error) el.scrollIntoView({ behavior:'smooth', block:'nearest' });
}
function saveLocally(showToast = false) {
  clearTimeout(saveTimer);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ brief, store, published, savedAt:new Date().toISOString() }));
    byId('save-status').innerHTML = '<span class="status-dot"></span> Saved in this browser';
    if (showToast) toast('Your draft is saved in this browser.');
  } catch {
    byId('save-status').innerHTML = '<span class="status-dot"></span> Browser storage unavailable';
    if (showToast) toast('Browser storage is blocked. Download your JSON to keep a backup.');
  }
}
function queueSave() {
  clearTimeout(saveTimer);
  byId('save-status').innerHTML = '<span class="status-dot"></span> Saving locally...';
  saveTimer = setTimeout(() => saveLocally(false), 350);
}
function snapshotBrief() {
  brief = {
    creatorName:byId('creator-name').value.trim(),
    handle:byId('instagram-handle').value.trim(),
    description:byId('creator-description').value.trim(),
    audience:byId('creator-audience').value.trim(),
    goal:brief.goal, tone:byId('tone-select').value, pricing:byId('pricing-select').value
  };
  byId('desc-count').textContent = `${byId('creator-description').value.length} / 1000`;
}
function fillBrief() {
  byId('creator-name').value = brief.creatorName || '';
  byId('instagram-handle').value = brief.handle || '';
  byId('creator-description').value = brief.description || '';
  byId('creator-audience').value = brief.audience || '';
  byId('tone-select').value = brief.tone || 'warm';
  byId('pricing-select').value = brief.pricing || 'balanced';
  byId('desc-count').textContent = `${byId('creator-description').value.length} / 1000`;
  document.querySelectorAll('[data-goal]').forEach(button => {
    const active = button.dataset.goal === brief.goal;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}
function editorField(id, value) { byId(id).value = value || ''; }
function renderEditor() {
  if (!store) return;
  editorField('edit-name',store.creatorName);
  editorField('edit-tagline',store.tagline);
  editorField('edit-bio',store.bio);
  editorField('edit-handle',store.handle);
  editorField('edit-audience',store.audience);
  document.querySelectorAll('[data-theme]').forEach(button => {
    const active = button.dataset.theme === store.theme;
    button.classList.toggle('selected',active);
    button.setAttribute('aria-pressed',String(active));
  });
  const list = byId('product-editor-list');
  list.innerHTML = store.products.map((p,index) => {
    const open = editorOpen.has(p.id);
    const formatOptions = Object.entries(fmtNames).map(([value,label]) => `<option value="${value}"${p.format === value ? ' selected' : ''}>${esc(label)}</option>`).join('');
    return `<article class="product-editor" data-product="${esc(p.id)}">
      <div class="product-editor-summary"><div class="product-editor-identity"><span class="product-editor-count">${String(index+1).padStart(2,'0')}</span><div><b>${esc(p.title)}</b><small>${esc(fmtNames[p.format] || 'Offer')} &middot; ${money(p.price)}${p.visible ? '' : ' &middot; Hidden'}</small></div></div>
        <div class="product-editor-controls"><button type="button" class="icon-button" data-action="up" data-id="${p.id}" aria-label="Move ${esc(p.title)} up" ${index===0?'disabled':''}>&#8593;</button>
        <button type="button" class="icon-button" data-action="down" data-id="${p.id}" aria-label="Move ${esc(p.title)} down" ${index===store.products.length-1?'disabled':''}>&#8595;</button>
        <button type="button" class="icon-button" data-action="expand" data-id="${p.id}" aria-expanded="${open}" aria-label="${open?'Collapse':'Edit'} ${esc(p.title)}">${open?'&#8722;':'+'}</button></div></div>
      ${open ? `<div class="product-editor-body">
        <div class="field"><label for="edit-title-${p.id}">Offer name</label><input id="edit-title-${p.id}" data-product-field="title" data-id="${p.id}" maxlength="72" value="${esc(p.title)}"></div>
        <div class="product-row-compact"><div class="field"><label for="edit-format-${p.id}">Format</label><select id="edit-format-${p.id}" data-product-field="format" data-id="${p.id}">${formatOptions}</select></div><div class="field"><label for="edit-price-${p.id}">Price in INR (0 = free)</label><input id="edit-price-${p.id}" data-product-field="price" data-id="${p.id}" type="number" min="0" max="100000" step="1" value="${esc(p.price)}"></div></div>
        <div class="field"><label for="edit-desc-${p.id}">Product description</label><textarea id="edit-desc-${p.id}" data-product-field="description" data-id="${p.id}" rows="4" maxlength="360">${esc(p.description)}</textarea></div>
        <div class="field"><label for="edit-includes-${p.id}">What's included (one item per line, up to 5)</label><textarea id="edit-includes-${p.id}" data-product-field="includes" data-id="${p.id}" rows="4">${esc(p.includes.join('\n'))}</textarea></div>
        <div class="field"><label for="edit-cta-${p.id}">Interest button label</label><input id="edit-cta-${p.id}" data-product-field="cta" data-id="${p.id}" maxlength="30" value="${esc(p.cta)}"></div>
        <div class="product-note"><strong>Why AI suggested it:</strong> ${esc(p.whyThisWorks || 'Consider whether this is the right first offer for your audience.')}</div>
        <label class="visible-toggle"><input type="checkbox" data-product-field="visible" data-id="${p.id}" ${p.visible?'checked':''}> Show this offer on my public page</label>
      </div>` : ''}</article>`;
  }).join('');
}
function previewMarkup() {
  const avatar = esc((store.creatorName || 'S').trim().slice(0,1).toUpperCase());
  const offers = store.products.filter(p=>p.visible);
  const cards = offers.map((p,i) => `<article class="offer-card"><div class="offer-card-top"><span class="offer-type">${esc(fmtNames[p.format]||'Offer')}</span><span class="offer-count">0${i+1} / OFFER</span></div>
    <h3>${esc(p.title)}</h3><p class="offer-description">${esc(p.description)}</p><ul class="offer-includes">${(p.includes||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
    <div class="offer-bottom"><div class="offer-price">${money(p.price)}</div><span class="btn btn-dark offer-interest">${esc(p.cta)}</span></div></article>`).join('');
  return `<div class="store-page theme-${esc(store.theme)} preview-mode">
    <div class="store-announcement">A small idea, a big first step &#10022;</div>
    <div class="store-nav"><span class="brand-mini"><img src="/assets/logo.svg" alt="" width="22" height="22">sparkform<span class="brand-dot">.</span></span><span aria-hidden="true">&#8599;</span></div>
    <main class="store-main"><section class="creator-hero"><div class="creator-avatar">${avatar}</div><div class="hero-kicker">WELCOME TO MY SPACE &#10022;</div><h1>${esc(store.tagline)}</h1><p class="creator-bio">${esc(store.bio)}</p>
      <div class="creator-identity"><span>${esc(store.creatorName)}</span>${store.handle?`<span class="ig-link">@${esc(store.handle.replace(/^@/,''))} &#8599;</span>`:''}</div></section>
      <section class="offers-section"><div class="section-eyebrow">HANDPICKED FOR YOU</div><div class="offers-heading"><h2>Let's make something happen.</h2><p>Explore the ways we can work together, learn, or get started.</p></div>
        <div class="offers-grid">${cards || '<p>Make at least one offer visible to preview it.</p>'}</div><p class="disclaimer">Offer validation only. No payments are taken on this prototype.</p></section>
      <section class="store-closer"><div class="decor-spark">&#10022;</div><p>YOUR NEXT CHAPTER STARTS HERE</p><h2>Good things begin with a single step.</h2><span class="btn btn-dark">Explore offers &#8599;</span></section></main>
    <div class="public-footer"><span>Made with sparkform.</span><span>SuperProfile &#8599;</span></div>
  </div>`;
}
function renderPreview() {
  if (!store) return;
  const content = byId('preview-content');
  const stage = content.closest('.preview-stage');
  const oldScroll = stage.scrollTop;
  content.innerHTML = previewMarkup();
  stage.scrollTop = oldScroll;
}
function studioTab(tab) {
  const layout = byId('studio-layout');
  layout.classList.toggle('show-edit', tab === 'edit');
  layout.classList.toggle('show-preview', tab === 'preview');
  document.querySelectorAll('[data-studio-tab]').forEach(b => b.classList.toggle('active', b.dataset.studioTab === tab));
}
function showStudio({ scroll = true } = {}) {
  byId('intro-section').hidden = true;
  byId('studio-section').hidden = false;
  editorOpen = new Set([store.products[0]?.id]);
  renderEditor(); renderPreview();
  studioTab(window.matchMedia('(max-width:800px)').matches ? 'preview' : 'edit');
  syncPublishUi();
  if (scroll) byId('studio-section').scrollIntoView({ behavior:'smooth',block:'start' });
}
function syncPublishUi() {
  if (published?.slug && published.editToken) {
    byId('published-panel').hidden = false;
    byId('publish-btn').innerHTML = 'Update live page <span aria-hidden="true">&#8599;</span>';
    byId('share-url').value = published.url || `${location.origin}/s/${published.slug}`;
    byId('whatsapp-share').href = `https://wa.me/?text=${encodeURIComponent(`Explore my new storefront: ${byId('share-url').value}`)}`;
  } else {
    byId('published-panel').hidden = true;
    byId('publish-btn').innerHTML = 'Publish my page <span aria-hidden="true">&#8599;</span>';
  }
}
async function api(path, options = {}) {
  let response;
  try { response = await fetch(path, options); }
  catch { throw new Error('Could not connect to the app. Check your connection and retry.'); }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Something went wrong. Please try again.');
  return payload;
}
async function generateStore() {
  if (generationBusy) return;
  snapshotBrief(); saveLocally(); showError('form-error',''); showError('studio-error','');
  if (brief.description.length < 45) return showError('form-error','Add at least 45 characters about your expertise and the people you help.');
  generationBusy = true;
  byId('generate-btn').disabled = true;
  byId('regenerate-btn').disabled = true;
  byId('generation-overlay').hidden = false;
  byId('generation-message').textContent = messages[0];
  let index = 0;
  const rotate = setInterval(() => { index=(index+1)%messages.length;byId('generation-message').textContent=messages[index]; }, 5600);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 39500);
  try {
    const payload = await api('/api/generate', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(brief), signal:controller.signal });
    store = payload.store;
    showStudio(); saveLocally(true);
    toast('Your new storefront is ready to edit.');
  } catch (error) {
    const message = controller.signal.aborted ? 'The response took too long. Your description is saved. Please retry.' : error.message;
    const target = byId('intro-section').hidden ? 'studio-error' : 'form-error';
    showError(target,message);
  } finally {
    clearInterval(rotate); clearTimeout(timer);
    byId('generation-overlay').hidden = true;
    byId('generate-btn').disabled = false;
    byId('regenerate-btn').disabled = false;
    generationBusy = false;
  }
}
async function publishStore() {
  if (!store || publishBusy) return;
  showError('studio-error','');
  if (store.products.every(p=>!p.visible)) return showError('studio-error','Keep at least one offer visible before publishing.');
  publishBusy = true;
  const button = byId('publish-btn');
  button.disabled = true;
  button.textContent = 'Publishing securely...';
  try {
    const isUpdate = Boolean(published?.slug && published.editToken);
    const payload = await api('/api/publish', {
      method:isUpdate ? 'PUT':'POST',
      headers:{ 'content-type':'application/json', ...(isUpdate ? {'x-edit-token':published.editToken}: {}) },
      body:JSON.stringify(isUpdate ? {slug:published.slug,store}:{store})
    });
    if (!isUpdate) published = { slug:payload.slug, url:payload.url, editToken:payload.editToken };
    else published.url = payload.url;
    syncPublishUi(); saveLocally();
    byId('published-panel').scrollIntoView({ behavior:'smooth', block:'center' });
    toast(isUpdate ? 'Your live storefront has been updated.' : 'Your public storefront is live!');
  } catch (error) { showError('studio-error',error.message); }
  finally { button.disabled = false; publishBusy=false; syncPublishUi(); }
}
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); toast('Link copied to clipboard.'); return; }
    const input = byId('share-url'); input.focus(); input.select();
    const copied = document.execCommand('copy');
    toast(copied ? 'Link copied to clipboard.' : 'Select the link to copy it.');
  } catch { toast('Clipboard unavailable. Select and copy the link above.'); }
}
function download(filename, content, type) {
  const a = document.createElement('a');
  const url = URL.createObjectURL(new Blob([content], { type }));
  a.href=url; a.download=filename;
  document.body.append(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function escapeCSV(value) { return '"'+String(value??'').replace(/"/g,'""')+'"'; }
function closeLeads() { byId('leads-modal').hidden = true; }
async function openLeads() {
  if (!published?.slug || !published.editToken) return toast('Publish your storefront first.');
  byId('leads-modal').hidden = false;
  byId('leads-content').textContent = 'Loading interest leads...';
  byId('download-leads').disabled = true;
  byId('close-leads').focus();
  try {
    const result = await api(`/api/leads?slug=${encodeURIComponent(published.slug)}`, { headers:{'x-edit-token':published.editToken} });
    lastLeads = result.leads;
    byId('leads-count').textContent = result.count ? `(${result.count})` : '';
    byId('download-leads').disabled = result.count === 0;
    const names = new Map(store.products.map(p=>[p.id,p.title]));
    byId('leads-content').innerHTML = result.count ? result.leads.map(lead=>
      `<div class="lead-item"><div><strong>${esc(lead.email)}</strong><small>${esc(names.get(lead.productId)||'Offer')} &middot; ${esc(lead.productId)}</small></div><div><span>${esc(new Date(lead.createdAt).toLocaleDateString('en-IN'))}</span><button type="button" class="text-action danger-text" data-delete-lead="${esc(lead.email)}" data-offer-id="${esc(lead.productId)}" aria-label="Delete lead for ${esc(lead.email)}">Delete</button></div></div>`
    ).join('') : '<div class="empty-leads">No interest leads yet.<br>Share your page with your audience to validate an offer.</div>';
  } catch(error) { byId('leads-content').textContent=error.message; }
}

byId('creator-form').addEventListener('submit', e => { e.preventDefault(); generateStore(); });
byId('creator-form').addEventListener('input', () => { snapshotBrief(); queueSave(); });
byId('creator-form').addEventListener('change', () => { snapshotBrief(); queueSave(); });
byId('use-example').addEventListener('click', () => {
  byId('creator-description').value = example;
  byId('creator-audience').value = 'Busy Indian working professionals starting a sustainable fitness routine';
  snapshotBrief(); saveLocally();
  byId('creator-description').focus();
  toast('Example input added. The AI results will be generated live.');
});
document.querySelectorAll('[data-goal]').forEach(button => button.addEventListener('click', () => {
  brief.goal=button.dataset.goal;
  document.querySelectorAll('[data-goal]').forEach(b => { const active=b===button; b.classList.toggle('active',active); b.setAttribute('aria-pressed',String(active)); });
  saveLocally();
}));
byId('edit-pane').addEventListener('input', e => {
  if (!store) return;
  const field = e.target.dataset.storeField;
  if (field) { store[field] = e.target.value; renderPreview(); queueSave(); return; }
  const id = e.target.dataset.id;
  const prop = e.target.dataset.productField;
  if (!id || !prop) return;
  const p = store.products.find(p => p.id === id);
  if (!p) return;
  if (prop === 'price') p.price = e.target.value === '' ? NaN : Number(e.target.value);
  else if (prop === 'includes') p.includes = e.target.value.split('\n').map(x=>x.trim()).filter(Boolean);
  else if (prop === 'visible') p.visible = e.target.checked;
  else p[prop] = e.target.value;
  renderPreview(); queueSave();
});
byId('edit-pane').addEventListener('change', e => {
  if (e.target.dataset.productField === 'visible' || e.target.dataset.productField === 'format') {
    if (e.target.dataset.productField === 'format') {
      const p=store?.products.find(x=>x.id===e.target.dataset.id);
      if (p) p.format=e.target.value;
    }
    renderEditor(); renderPreview(); queueSave();
  }
});
byId('product-editor-list').addEventListener('click', e => {
  const button = e.target.closest('button[data-action]');
  if (!button || !store) return;
  const id=button.dataset.id;
  const idx=store.products.findIndex(p=>p.id===id);
  if (idx === -1) return;
  switch(button.dataset.action) {
    case 'expand': if(editorOpen.has(id)) editorOpen.delete(id); else editorOpen.add(id); break;
    case 'up': if(idx>0) [store.products[idx-1],store.products[idx]]=[store.products[idx],store.products[idx-1]]; break;
    case 'down': if(idx<store.products.length-1) [store.products[idx+1],store.products[idx]]=[store.products[idx],store.products[idx+1]]; break;
  }
  renderEditor(); renderPreview(); queueSave();
});
document.querySelectorAll('[data-theme]').forEach(b => b.addEventListener('click', () => {
  if (!store) return;
  store.theme=b.dataset.theme;
  renderEditor(); renderPreview(); queueSave();
}));
document.querySelectorAll('[data-device]').forEach(b => b.addEventListener('click', () => {
  const frame=byId('device-frame');
  frame.classList.toggle('mobile-frame', b.dataset.device==='mobile');
  frame.classList.toggle('desktop-frame', b.dataset.device==='desktop');
  document.querySelectorAll('[data-device]').forEach(other=>{ const active=other===b;other.classList.toggle('active',active);other.setAttribute('aria-pressed',String(active)); });
  byId('preview-hint').textContent = b.dataset.device === 'desktop' && window.innerWidth <= 550 ? 'Swipe sideways to inspect the desktop layout.' : 'Each page adapts to phones, tablets and desktops.';
}));
byId('expand-preview').addEventListener('click',()=>{
  const expanded=byId('studio-layout').classList.toggle('preview-expanded');
  const b=byId('expand-preview');
  b.setAttribute('aria-pressed',String(expanded));
  b.textContent=expanded?'Close expanded view':'Expand \u2922';
});
document.querySelectorAll('[data-studio-tab]').forEach(b => b.addEventListener('click', () => studioTab(b.dataset.studioTab)));
byId('save-draft').addEventListener('click',()=>saveLocally(true));
byId('publish-btn').addEventListener('click',publishStore);
byId('regenerate-btn').addEventListener('click', async () => {
  if (!window.confirm('Generate a new AI draft from your original description? Your current local edits will be replaced. Your already published page will not change until you update it.')) return;
  await generateStore();
});
byId('edit-brief-btn').addEventListener('click',()=>{
  byId('studio-section').hidden=true; byId('intro-section').hidden=false;
  byId('intro-section').scrollIntoView({ behavior:'smooth',block:'start' });
  toast('Your previous draft is saved. Generate again to use your updated description.');
});
byId('copy-bio-btn').addEventListener('click', async()=>{
  if(!store) return toast('Generate your storefront first.');
  try {
    await navigator.clipboard.writeText(store.bio);
    toast('Creator bio copied. Ready to paste.');
  } catch {
    const field=byId('edit-bio');field.focus();field.select();
    toast('Select and copy the highlighted bio.');
  }
});
byId('export-json-btn').addEventListener('click',()=>{
  if(!store) return toast('Generate your storefront first.');
  const safeName=(store.creatorName||'creator').toLowerCase().replace(/[^a-z0-9]+/g,'-');
  download(`${safeName}-storefront.json`, JSON.stringify({store},null,2),'application/json');
  toast('Your storefront content was downloaded.');
});
byId('start-over-btn').addEventListener('click',()=>{
  if(!window.confirm('Start a new draft? This clears the editable draft and owner access from this browser. Already published pages stay live.')) return;
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  brief={creatorName:'',handle:'',description:'',audience:'',goal:'first_sale',tone:'warm',pricing:'balanced'};
  store=null;published=null;fillBrief();
  byId('studio-section').hidden=true;byId('published-panel').hidden=true;byId('intro-section').hidden=false;
  byId('intro-section').scrollIntoView({behavior:'smooth',block:'start'});
  toast('Ready for a fresh start.');
});
byId('copy-url').addEventListener('click',()=>copyText(byId('share-url').value));
byId('view-live').addEventListener('click',()=>{
  if(!published?.slug) return toast('Publish your page first.');
  const link=published.url || `${location.origin}/s/${published.slug}`;
  const win=window.open(link,'_blank','noopener,noreferrer');
  if(!win) location.href=link;
});
byId('view-leads').addEventListener('click',openLeads);
byId('close-leads').addEventListener('click',closeLeads);
byId('leads-content').addEventListener('click', async e => {
  const button = e.target.closest('button[data-delete-lead]');
  if(!button || !published?.editToken) return;
  const email = button.dataset.deleteLead;
  const productId = button.dataset.offerId;
  if(!window.confirm(`Permanently remove ${email} from your interest list?`)) return;
  button.disabled = true;
  try {
    await api('/api/leads', {method:'DELETE',headers:{'content-type':'application/json','x-edit-token':published.editToken},
      body:JSON.stringify({slug:published.slug, productId, email})});
    toast('Lead permanently deleted.');
    await openLeads();
  } catch(error) { toast(error.message);button.disabled=false; }
});
byId('leads-modal').addEventListener('click',e=>{if(e.target===byId('leads-modal'))closeLeads();});
byId('download-leads').addEventListener('click',()=>{
  if(!lastLeads.length) return toast('No leads to export yet.');
  const lines=[['Email','Offer ID','Offer title','Registered at'],...lastLeads.map(lead=>[lead.email,lead.productId,store.products.find(p=>p.id===lead.productId)?.title || 'Offer',lead.createdAt])];
  const csv='\ufeff'+lines.map(row=>row.map(escapeCSV).join(',')).join('\r\n');
  download(`sparkform-leads-${published.slug}.csv`,csv,'text/csv;charset=utf-8');
  toast('Lead export downloaded.');
});
document.addEventListener('keydown',e=>{if(e.key==='Escape' && !byId('leads-modal').hidden)closeLeads();});

try {
  const saved=JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  if(saved && typeof saved === 'object') {
    if(saved.brief) brief={...brief,...saved.brief};
    if(saved.store && Array.isArray(saved.store.products)) store=saved.store;
    if(saved.published?.slug && saved.published?.editToken) published=saved.published;
  }
} catch { /* Private browsing or corrupt local draft: start blank rather than crash. */ }
fillBrief();
if(store) showStudio({scroll:false});

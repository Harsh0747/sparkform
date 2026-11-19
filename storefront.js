const modal = document.getElementById('interest-modal');
const toastEl = document.getElementById('toast');
const form = document.getElementById('interest-form');
const feedback = document.getElementById('interest-feedback');
const data = JSON.parse(document.getElementById('store-data').textContent);
let currentProduct = null;
let saving = false;
let toastTimer;
function toast(text) {
  toastEl.textContent = text;
  toastEl.classList.add('active');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>toastEl.classList.remove('active'),3900);
}
function showInterest(id) {
  const p = data.productData.find(x=>x.id===id);
  if(!p) return;
  currentProduct=p;
  document.getElementById('modal-description').textContent = `Interested in ${p.title}? Leave your email so this creator can follow up when it's ready. No payment is taken here.`;
  feedback.textContent='';feedback.classList.remove('is-error');
  document.getElementById('submit-interest').disabled=false;
  document.getElementById('lead-email').value='';
  document.getElementById('lead-consent').checked=false;
  modal.hidden=false;
  document.getElementById('lead-email').focus();
}
function closeInterest() { modal.hidden=true; currentProduct=null; }
document.querySelectorAll('[data-interest]').forEach(b=>b.addEventListener('click',()=>showInterest(b.dataset.interest)));
document.getElementById('close-interest').addEventListener('click',closeInterest);
modal.addEventListener('click',e=>{if(e.target===modal)closeInterest();});
document.addEventListener('keydown',e=>{if(e.key==='Escape' && !modal.hidden)closeInterest();});
document.getElementById('share-store').addEventListener('click',async()=>{
  const url=location.href.split('#')[0];
  if(navigator.share) {
    try { await navigator.share({ title:document.title, url }); return; } catch(err) { if(err.name==='AbortError') return; }
  }
  try { await navigator.clipboard.writeText(url); toast('Page link copied to clipboard.'); }
  catch { toast('Copy the URL from your address bar to share this page.'); }
});
form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(saving || !currentProduct) return;
  const email = document.getElementById('lead-email').value.trim();
  const consent = document.getElementById('lead-consent').checked;
  if(!consent) { feedback.textContent='Please agree to share your email with this creator.';feedback.classList.add('is-error');return; }
  saving=true;
  const button=document.getElementById('submit-interest');
  button.disabled=true;button.textContent='Registering your interest...';
  feedback.textContent='';feedback.classList.remove('is-error');
  try {
    const response=await fetch('/api/interest',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({slug:data.slug,productId:currentProduct.id,email,consent,website:document.getElementById('lead-honeypot').value})});
    const payload=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(payload.error||'We could not save your interest. Try again.');
    form.hidden=true;
    document.getElementById('modal-title').textContent="You're on the list!";
    document.getElementById('modal-description').textContent=`Your interest in ${currentProduct.title} has been saved for this creator. They can reach out to you directly if they choose.`;
    feedback.textContent='You can close this window and keep exploring.';
    toast('Interest registered successfully.');
  } catch(error) {feedback.textContent=error.message;feedback.classList.add('is-error');}
  finally {saving=false;button.disabled=false;button.textContent='Register my interest \u2197';}
});
// Re-open the form for other offers without refreshing the page.
const showOriginalInterest=showInterest;
function resetModalForNextOffer() { form.hidden=false;document.getElementById('modal-title').textContent='Be first to know.'; }
document.querySelectorAll('[data-interest]').forEach(b=>b.addEventListener('click',resetModalForNextOffer));
// If a deep link selects a product, move it into view (without opening a consent form).
if(location.hash && /^#offer-[a-z0-9-]+$/.test(location.hash)) {
  const selected=document.getElementById(location.hash.slice(1));
  if(selected) selected.scrollIntoView({block:'center'});
}

# Sparkform end-to-end QA and release gate

## Verified locally (automated)

- [x] Node 22 project has no third-party runtime dependencies
- [x] Empty/short/handle-only/gibberish descriptions return useful 400 errors
- [x] Instagram links/handles normalized; bad handles rejected
- [x] Real LLM integration is called only server-side with structured output contract (test transport stub)
- [x] Invalid INR price and zero-visible-offer stores rejected
- [x] Publishing produces real permanent slug in SQLite in local integration tests
- [x] Public storefront SSR HTML contains products and no fake checkout
- [x] Explicit consent and valid email required; duplicate lead is idempotent
- [x] Leads private without owner key (403), accessible with correct key
- [x] Live edits update public page only when requested; wrong key refused
- [x] Owner can permanently delete lead
- [x] Missing slug returns a friendly 404 page
- [x] Phone/Desktop responsive editor and theme/field interactions checked in Chromium using test content

## MUST verify with your credentials before submission

- [ ] Real OpenAI provider credentials and quota are active
- [ ] End-to-end real generation with brand-new brief on deployed HTTPS origin
- [ ] 29-second timeout and realistic quota error displayed well (use staging)
- [ ] Upstash production credentials and durable persistence across redeploy
- [ ] Published page shared outside logged-in browser / on phone
- [ ] Consent flow, duplicate signup and CSV export on deployed product
- [ ] Editor update persists after refresh; secret owner token stays private
- [ ] Email deletion confirmed on deployed datastore
- [ ] All public URLs shareable without account access
- [ ] GitHub README setup follows actual deployment
- [ ] Loom walkthrough uses real LLM responses and correct public links
- [ ] Confirm attached brief PDF for requirements not in the email
- [ ] App remains hosted at least 14 days after submission

## Risks / limitations to disclose

- Owner edit key is browser-bound; incognito or cleared storage cannot edit the original draft.
- Process-local limits are abuse softening, not distributed protection.
- No KYC, checkout, automatic emails or payment collection; interest data is validation only.
- No production error monitoring or test of provider's actual credentials has occurred here.
- Browser render checks use authored test fixture, **not** evidence of an actual live AI response.

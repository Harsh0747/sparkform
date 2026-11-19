# Sparkform | PM decision narrative

**Thesis:** The activation barrier is not "creating a beautiful landing page." It is moving a new creator from uncertainty (what, for whom, how much?) to a **credible first offer and a link they choose to share**. Sparkform designs for that moment, while leaving paid commerce inside SuperProfile.

## 1. Problem, segment and sharp definition

SuperProfile already lets creators monetize digital products, courses, live events, coaching and communities. Its current Super AI can help create drafts. That makes this a **front-door activation wedge**, not a replacement for product creation tools. Focus on first-time Indian educators/coaches with an audience and niche expertise but zero published paid offers. Existing creators with validated catalogues have a different job and are not the target.

**Job to be done:** "When I sign up with an audience but no offer, help me turn my expertise into two or three understandable things people might pay for, so I can get confidence to publish and share a link."

**Core uncertainty:** Is the blocker lack of ideas, lack of confidence, unwillingness to set a price, or too much setup? The assignment implies all four; I would instrument the funnel and interview stallers instead of treating them as fact.

**Success for this slice:** The creator produces and reviews a storefront with 2-4 real suggestions, publishes it, opens it in another browser, and understands what the next step toward selling is. A generated page alone is not activation.

## 2. Flow and the deliberate rejection

1. **Input:** Self-description required; name/Instagram handle optional. One clear question beats a complex Instagram import permission flow. Secondary controls (goal, tone, pricing) are optional progressive disclosure.
2. **Generate:** Real LLM returns creator bio, tagline, audience, and a 3-rung offer ladder. Output includes INR price hypotheses and "why this works" for editability and trust.
3. **Review:** Full copy and price editing, offer visibility/order, and theme; phone/desktop preview. Save draft in browser. Humans approve everything; AI never auto-publishes.
4. **Publish and learn:** Unique persistent public mobile landing page with offer-specific opt-in interest forms, creator-only CSV leads and safe live updates.

**Rejected: automatically scrape Instagram as the default input.** It would add permission/API constraints, fail for nonexistent or private handles, incentivize inference from superficial signals, and send users into a permission dead end before value. Self-description captures a creator's intentions more accurately at this stage, and is explicitly allowed by the brief. An optional, permissioned import could come later.

Also consciously rejected fake payments or redirecting "Buy now" to a generic SuperProfile homepage. Public CTAs say "Get updates" and store real interest only, creating truthful demand data instead of a broken checkout.

## 3. Trade-offs and exclusions

| Choice | Benefit | Cost / risk |
|---|---|---|
| Three offers in a simple ladder | Faster decisions and a story around upsell | Not guaranteed to fit every niche; edit before publish |
| Self-description not scraped feed | Reliable, private and fast | Requires creator effort; misses existing post context |
| INR guardrails by offer format | India-relevant hypotheses and less arbitrary output | Not market-tested; creator edits price |
| Real model + strict JSON | Useful AI from open-ended text, predictable UI | Cost, network latency, quota and refusal edge cases |
| Owner edit secret in local browser | No sign-in friction during evaluation | No cross-device editing or key recovery |
| Interest capture rather than payment | Functional public CTA without faking commerce | Cannot validate willingness to pay; no sales attributed |
| Node 22 and Upstash | No package install, durable public URLs, fast shipping | For production, needs API/Redis credentials and monitoring |

**Intentionally not built:** Instagram scraping, account signup, identity verification/KYC, native SuperProfile account or checkout integration, automatic product fulfillment, email sending, A/B infra, analytics dashboard, price research backend, AI product-by-product retries, and payment processing. This fits a bounded MVP rather than an unreliable all-in-one demo.

## 4. How the AI part works

Server receives the validated creator brief; checks plausible input and allowed formats; calls a real OpenAI JSON-schema model with a system prompt for honest creator-specific copy, INR anchors, three offer types and no invented achievements, social proof or Instagram data. The self-description is labeled untrusted content. Model output is parsed and validated server-side for 2-4 products, unique IDs, price boundaries, copy limits and visible offers. Only valid output reaches the editor. Prompt text and API key stay server-side. Creator edits are not sent to the LLM unless they deliberately regenerate.

**Failure contract:** handle-only -> actionable prompt for description; low-signal/gibberish -> clearer input request; bad handle/prices -> field-specific error; timeout/429/provider failure -> original brief retained, accurate retry message; malformed model JSON -> no fabricated fallback; inaccessible URL -> branded 404; bad owner key -> 403. Interest forms demand clear consent; duplicate signups are idempotent.

No live LLM call has been verified by this authoring environment (no supplied secret). Passing automated tests do not substitute for the final live-key smoke test.

## 5. Metrics and a launch thought

**North-star for the experiment:** Percentage of eligible *new zero-product creators* who publish a reviewed storefront with at least 2 suggested offers within 24 hours. Exclude creators with pre-existing active stores; measure first-session completion separately. The long-term outcome is first paid product published and first successful sale in 7/14 days **inside SuperProfile**, once integrated.

Event funnel: `builder_viewed -> brief_submitted -> generate_succeeded -> editor_opened -> price_edited -> store_published -> share_link_copied -> public_product_viewed -> interest_registered`. Track `generate_failed` with reason, time-to-publish, prompt quality rating, and whether creator removes ideas. Guardrails: AI error/latency, unsupported claims, unreasonably priced offers, unwanted emails, and support tickets.

**Launch:** Add an optional "Start with AI" card on the existing blank-store onboarding screen. Randomize newly signed-up, eligible creators 50/50 vs existing flow. Talk to 10-15 non-activated creators and inspect 30-50 anonymized outputs before wide release. Hypothesis: reduce time to first published page and improve 24-hour activation without lowering offer quality. Do not quote an uplift until measured; pre-register a minimum detectable effect and sample-size plan after learning baseline conversion.

## 6. Two more weeks

**Week 1 - Trust + integrated workflow:** Instrument events end-to-end, interview creator stallers, evaluate a representative set of 50 anonymized briefs using quality rubric (specificity, feasibility, price realism, safety), add authenticated ownership and recovery, and test accessible mobile UX. Replace generic default copy for niches only where evaluations show failure.

**Week 2 - From interest to real commerce:** Turn approved suggestions into *draft* products through authenticated SuperProfile product APIs; hand off KYC, checkout and fulfillment to existing platform flows. Add account-based persistence, distributed abuse and cost limits, privacy retention/deletion workflow and monitoring. Run the initial blank-store activation A/B and iterate by segment.

**Sources / assumptions:** Assignment email as supplied; the separate PDF brief was not available to read. SuperProfile product and monetization details checked against https://superprofile.bio/products , https://superprofile.bio/products/super-ai and https://superprofile.bio/in/pricing on 20 November 2026. Public pricing and feature information may change; this prototype never claims a native connection.

# 6-8 minute Loom walkthrough (record after deployment)

**Recording rule:** Do not claim real AI works until you set the key and show an actual request finishing. Use a real freshly generated result, not the test fixture. Share the deployed HTTPS URL at the start. Keep browser zoom 100%, dev tools optional, and show a mobile-sized viewport.

**00:00-00:35 | Frame the problem.** "I'm tackling the blank-store activation problem. A creator knows their subject but hasn't decided what to sell or how to write the copy. The job is confidence to publish a first useful link, not a new checkout."

**00:35-01:40 | Input & why.** Open homepage on the live deployment. Show a handle-only attempt (`@randomhandle`) and the actionable message requesting a description. Explain scraping is intentionally not done: permissions, privacy and unreliable data; a self-description is a first-class input. Use your own accurate creator description for the real run, e.g. fitness or career guidance. Explain optional goal, tone, INR approach. **Do not claim you looked up the handle.**

**01:40-03:20 | Real AI end to end.** Click Generate. Show loading and the returned AI bio plus three distinct offers. Point out suggested INR prices and the rationale for each rung. Confirm the output is real-time model generated; if applicable show provider model in `/lib/ai.js`. If the provider fails, show retry and explain the output is not faked.

**03:20-04:30 | Creator control and responsive preview.** Edit tagline, product price and description, rearrange two offers, hide one (keep at least one visible), and change to Peach. Toggle Phone/Desktop. Show autosave. Explain why explicit review is key to trust and why price is editable.

**04:30-05:45 | Publish and verify.** Click Publish, copy link, open it in an incognito browser / another device. Show real page markup, a product CTA, explicit email consent, submit interest (use an email address you control). Return to the creator editor and view leads, export CSV, and show owner-only access. Then change headline and click **Update live page** to demonstrate that publishing and editing are separate intentional actions.

**05:45-06:35 | Edge case.** Try a gibberish description, nonexistent handle-only, or provider unavailability; show a helpful recoverable error rather than broken/placeholder output. For fairness, don't induce an unnecessary real API outage if the product is available.

**06:35-07:35 | PM decisions and trade-offs.** "I rejected default Instagram scraping. I'm using structured AI output and human approval, plus interest capture instead of fake checkout. The obvious next move is auth + native draft-product creation inside SuperProfile. The 24-hour reviewed-publish rate is the activation metric, backed by eventual first-sale conversion."

**07:35-08:00 | Close.** Show public live URL and GitHub README, describe AI-tool use accurately, and mention what is intentionally not built. Verify that Loom itself is public/open access.

## Checklist before pressing Record

- [ ] Live HTTPS URL loads on laptop and phone
- [ ] `GET /api/health` says `aiConfigured:true`, `persistence:upstash-redis`
- [ ] Real generation succeeds from new text (not only an old draft)
- [ ] Store publication survives incognito/reload
- [ ] Email interest actually appears in owner dashboard
- [ ] Mobile viewport and desktop toggles both work
- [ ] Short description, handle-only, 404 and timeout states reviewed
- [ ] Recording displays neither API key nor secret owner token
- [ ] Loom permissions set to "anyone with link" and checked in incognito

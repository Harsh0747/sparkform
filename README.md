# Sparkform: your expertise, your first storefront

**AI-native, zero-to-one creator onboarding concept for the SuperProfile Product Manager assessment.**

Sparkform transforms a creator's own description (with an optional Instagram handle) into a generated bio, **three real-LLM-produced product ideas priced in INR**, product descriptions, and a phone-friendly public page. Creators can edit, preview at phone/desktop sizes, publish, update a public URL and collect opt-in interest without pretending to have checkout.

> IMPORTANT: This is a working, deployable source package, **not an already deployed product**. Live AI generation requires your real API key, and durable public links require production persistence. No pre-generated output or model stub is used in the shipping application. The recruiter mentioned a detailed PDF attachment, but only the email summary was available when building this package; confirm any additional PDF requirements before submission.

## 1. Run locally in 2 minutes

Requires **Node.js 22.13 or newer**. No `npm install` is necessary because the server and UI use Node built-ins and browser-native JavaScript.

```bash
cp .env.example .env
# Edit .env: set OPENAI_API_KEY to a valid paid provider key.
npm start
```

Open **http://localhost:3000**. Generate uses a real server-side request to OpenAI `gpt-4o-mini` (change with `OPENAI_MODEL`). The UI never receives the secret. You can test every non-AI publish/lead path through `npm test` without spending API credits.

For a different port, edit `PORT` in `.env`. The default development database is `./data/sparkform.sqlite`, created automatically on first publish.

## 2. Product flow (every button does something)

1. **Describe yourself:** A 45+ character description of expertise and audience; name and Instagram handle are optional. The handle is a display link, not scraped. Choose goal, brand voice and price position.
2. **Generate:** The server validates the input, calls OpenAI with a strict JSON schema, rejects malformed output and returns three offer hypotheses in INR. If the AI times out, is unavailable, lacks credit or returns invalid JSON, the creator sees a retryable explanation, not a fake storefront.
3. **Review:** Edit bio, headline, identity, product title, format, description, inclusions, price, visibility and CTA; reorder the ideas. Change the color theme and toggle **Phone / Desktop** preview. Draft edits autosave locally. "Regenerate" makes a **fresh real LLM call** after confirmation.
4. **Publish:** Creates a unique `/s/<creator>-<random>` URL persisted on the server. Public page is server-rendered (including title, description and OG tags) and responsive. Edit access uses an unguessable owner secret stored **only in the creator's browser**. Updating live content requires explicit action.
5. **Validate demand:** Each product button opens an opt-in interest form. Consented emails are stored, deduplicated by offer, and available only to the creator with the owner key. Leads can be exported as CSV or permanently deleted. The public page explicitly says no payment is taken.

**Not built:** scraping Instagram, signup/auth, SuperProfile account APIs, paid checkout, payment capture, automatic follow-up emails, product file delivery, analytics dashboard or publishing to SuperProfile itself. These would be false integrations in a take-home environment.

## 3. Deploy to Render (recommended)

1. Put these source files in a **public GitHub repository**. Do not commit `.env` (already ignored).
2. Create a **free or paid Upstash Redis** database and copy its **REST URL** and **REST token**. Upstash is the recommended production datastore, because ephemeral instance disks do not reliably preserve share links over two weeks.
3. On [Render](https://render.com/), create a Web Service from the repo (or use `render.yaml`). Set runtime **Node 22.16+**, build command `npm install --omit=dev`, start command `npm start`.
4. Set these **server-side environment variables** in the Render dashboard:

   | Key | Value |
   |---|---|
   | `OPENAI_API_KEY` | Your actual API key, secret |
   | `OPENAI_MODEL` | `gpt-4o-mini` (or a supported JSON-schema model) |
   | `UPSTASH_REDIS_REST_URL` | HTTPS Upstash REST endpoint |
   | `UPSTASH_REDIS_REST_TOKEN` | Secret Upstash REST token |
   | `PUBLIC_BASE_URL` | `https://YOUR-RENDER-DOMAIN.onrender.com` (no trailing slash) |
   | `NODE_VERSION` | `22.16.0` |

5. Deploy, open `/api/health` and confirm `"aiConfigured":true` and `"persistence":"upstash-redis"`. `/api/health` does not check API credit balance, so **actually generate** a store and confirm success.
6. Publish, copy the public link, open it **in incognito and on a phone**, register interest from another email, verify the creator-only lead dashboard and owner update. Leave the app online at least **14 days after submission**.
7. Replace the sample `PUBLIC_BASE_URL` with your exact HTTPS deployment origin if different. Be sure GitHub, the decision PDF and the Loom link are publicly accessible.

**Other deployments:** Railway or an always-on Docker host work. SQLite persistence on production requires a **durable mounted volume** at `STORE_DB_PATH`; without Upstash or a volume, share URLs may disappear during restarts/redeploys. Render's `starter` plan in `render.yaml` is a paid choice; check actual platform costs.

### Deployment diagram

```text
Creator browser (responsive HTML/CSS/JS)
       | POST /api/generate
       v
Node 22 server --- HTTPS, server-side secret ---> OpenAI JSON-schema LLM
       | validate + normalize offers
       v
Browser draft (localStorage) ---- POST/PUT /api/publish ---> Upstash Redis
       |                                                  | public URL
       |                                                  v
       +---------------------------> Public /s/:slug (SSR HTML + SEO)
                                                             |
                  owner-only CSV/export  <--  consented interest emails
```

## 4. Safety, privacy and product truthfulness

- **No scraping.** A handle-only input asks for an actual self-description; nonexistent handles do not break the flow.
- **Real model output.** Only `POST /api/generate` generates AI content; it calls OpenAI from the server with `response_format: json_schema`. No static "AI result" is shown to users. The bundled test fixture is used only in automated tests.
- **No fake transactions.** Buttons on the public store collect interest with explicit consent; the prototype does not accept payments. The official SuperProfile link opens the real site for separate setup.
- **Owner protection.** Edit key never appears in the public URL. Lead APIs require that secret. Keys are lost if the creator clears browser storage; there is no account recovery in the MVP.
- **Input hygiene.** Byte limits, field limits, validated emails/prices, escaped HTML, safe handle normalization, strict schema, no user-selected arbitrary link URLs, CSRF origin checks for mutations, and protective response headers.
- **Abuse controls.** Process-local per-IP rate caps, a honeypot, 29-second upstream timeout, limited retry and server-side API key. Multi-instance rate limiting, deletion by data subject, CAPTCHA, automated retention and moderation are launch hardening tasks.
- **Data minimization.** Interest form requests email only and asks consent; emails are private to the owner and can be deleted individually. Do not use collected emails for unsolicited marketing.

## 5. Tests, edge cases and known limitations

```bash
npm test           # unit + route integration tests; no API credit
npm run check      # syntax checks + tests
```

The test suite exercises brief validation, Instagram handling, gibberish, numeric prices, interest consent, duplicate leads, non-owner access, publishing, live update, lead deletion and a missing URL. A test-only mocked **network transport** verifies the outgoing OpenAI API schema; it is not shipped into the product or used for user-facing output. Browser UI interactions were additionally checked at desktop/mobile viewport sizes.

**Manual production checks requiring credentials:** real AI success and quotas, live deployment persistence, Upstash REST integration, cross-device public links, email deliverability (not built), and 14-day uptime. Do not claim those checks passed until you run them.

**Environment caveat:** Node's built-in `node:sqlite` on 22.16 prints an experimental warning. In production, supply Upstash. No authenticated user accounts means edit-key recovery and multi-device creator editing are intentionally excluded. In very large scale, move to auth + a distributed rate limit and observability.

## 6. Project map

```text
server.js                 Node HTTP server and routes
lib/ai.js                 Real LLM integration and schema
lib/validation.js         Input/store validation, INR checks
lib/store.js              Upstash Redis or local SQLite persistence
lib/template.js           Server-rendered public store and SEO
lib/rate-limit.js         Basic per-process abuse control
public/index.html         Onboarding and editing studio
public/app.js             Creator interaction and local drafts
public/storefront.js      Public opt-in interest flow
public/styles.css         Responsive design, 4 themes, screen preview
public/logo.svg           Original Sparkform brand icon
render.yaml / Dockerfile  Deployment options
tests/                   Unit + integration tests
docs/                    PM decision doc, Loom outline, QA and email
```

## 7. What to submit

Use the checklist and copy-ready email in `docs/`. The decision doc is provided separately as `Sparkform_PM_Decision_Doc.pdf` in the downloadable handoff package.

Built as an independent SuperProfile assessment concept. Not an official SuperProfile product, trademark or company endorsement.

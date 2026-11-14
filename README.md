# What Raju Thinks

A working WhatsApp chat-report prototype built with **Next.js 16, React 19, TypeScript, Vercel AI SDK, SWR, Zod and SQLite**. The complete reference-product investigation is in [PRODUCT_SPEC.md](PRODUCT_SPEC.md).

## Run locally

Use Node **24.11 or newer** (Node 25 was used for verification).

```sh
npm install
npm run dev
```

Open [localhost:4173](http://localhost:4173). For a production-mode local run:

```sh
npm run build
npm start
```

## What works

- WhatsApp iPhone/Android `.txt` and `.zip` imports, drag and drop, and pasted exports.
- Seven-step setup: chat category, export guide, upload, participant names/merging and self identity, report language/tone, context notes, review and generation.
- Factual local reports with genuine source quotations; no provider request or payment required.
- AI reports with specific narrative titles, long-form sections, original-language quotations, tone choices and Hinglish support when a provider is configured.
- Saved reports and source chats; report follow-up questions; message share, reply gaps, initiations, question counts, monthly activity and emoji statistics.
- Copy/download text and browser Print / Save as PDF.
- Per-browser workspaces, source expiry, deleting chats while preserving reports, report deletion and whole-workspace deletion.

## AI integration

Copy `.env.example` to `.env.local`, choose the provider and model, and add its key:

```dotenv
AI_PROVIDER=anthropic
AI_MODEL=your-enabled-claude-model-id
ANTHROPIC_API_KEY=your-key
```

Or use OpenAI:

```dotenv
AI_PROVIDER=openai
AI_MODEL=your-enabled-openai-model-id
OPENAI_API_KEY=your-key
```

Restart Next.js after changing environment variables. Use a model your provider account supports; there is deliberately no hard-coded model selection. `AI_BASE_URL` optionally overrides the direct provider endpoint.

The server uses [`ai`](https://ai-sdk.dev/docs/introduction), [`@ai-sdk/anthropic`](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic) or [`@ai-sdk/openai`](https://ai-sdk.dev/providers/ai-sdk-providers/openai), and a Zod schema. OpenAI uses its Responses API. The schema validates the title and 5–8 report sections; AI reports are rejected if any quote does not exactly match its source sender and complete text, or if quote references are missing, repeated or out of range. Imported message rows are preserved, including repeated text with identical timestamps.

Keys stay on the server. Having a key configured does **not** send any messages automatically: select **AI report** and explicitly generate it. Local mode never invokes the SDK. Provider errors are surfaced without silently substituting a fake AI report. Usage is billed by your selected provider.

## Structure

```text
app/                         Next.js routes, layouts and global CSS
  api/[...path]/route.ts      Node-runtime API route handlers
components/                  React setup, library, reports, stats and shared UI
lib/api.ts                   Validated API actions and workspace ownership
lib/reports.ts               AI SDK adapter, prompt, schema and local report
lib/parser.mjs               Tested export decoding and deterministic statistics
lib/store.mjs                SQLite storage and source retention
lib/types.ts                 Shared TypeScript contracts
test/                        Parser, provider, API and retention tests
data/                        Local database (ignored by Git)
research/                    Public evidence notes; downloaded bundles ignored
```

The small parser/store modules remain plain ES modules and have typed declarations; the product UI, API and AI integration use TypeScript. No custom HTTP server or legacy HTML app remains.

## Checks

```sh
npm run check
npm test
npm run build
```

Tests cover multiline exports, Unicode, date-order inference, invalid dates, ZIP limits, stats, session isolation, participant cleanup, retention, deletion, SDK routing for both providers, malformed output, failures and explicit local-only operation. Provider tests use mocked HTTP responses; they incur no model charges.

Verified: TypeScript, the production build and all 18 tests pass. Browser checks covered the supplied ZIP, participant cleanup, local generation, saved-report persistence after migration, statistics, and follow-up creation. The mobile homepage fits a 390-pixel viewport without horizontal overflow. React Doctor reported warnings about component size and browser-draft navigation; these remain refactoring opportunities, not a clean scanner result.

## Current limits

- **WhatsApp only** in the prototype. Other messaging platforms, recording OCR, payments, email login/delivery, memberships, gifts and public share links are future modules from the reference spec.
- No live AI key was supplied, so real generation latency, cost and report quality have not been tested. The SDK protocol and error paths are tested with mocks.
- Maximum upload: 10 MB. Maximum extracted ZIP contents: 20 MB. AI source payloads over 400,000 characters are rejected without silently dropping messages; larger chats still support local analysis.
- Numeric export dates are inferred across the whole file. If every date is ambiguous, day/month is used. Timestamps retain the export’s clock as a UTC-shaped value; they do not prove the sender’s time zone.
- SQLite data is local and is **not encrypted at rest**. A cookie identifies the workspace; it is not a production authentication system. The API accepts localhost requests only. Clearing cookies creates a different workspace.
- Source chats expire after 48 hours without a report, or seven days after the latest generated report. Cleanup runs on the next API request. Report snapshots remain until deleted. SQLite deletion is logical deletion, not a forensic secure erase.

The supplied private export was tested locally (2,584 messages, two participants) and was not copied into source files, fixtures or research notes. Local browser-generated reports remain in the ignored database for review.

## Investigation boundary

The product spec distinguishes public claims, observed browser behavior, static shipped-code evidence and unknowns. REA MCP/CLI static analysis and browser capture attempts failed with tool I/O/execution errors; no successful REA Evidence IDs were produced. The report therefore uses its own explicitly labeled public/UI/static evidence ledger. The original paid report remainder was not purchased or inspected.

## Cloudflare deployment

The hosted app uses OpenNext for Next.js pages and a SQLite-backed Durable Object
per browser workspace for the API. Local development still uses `data/app.sqlite`.
Long exports are
chunked below Cloudflare's SQL cell size limit. Expiry alarms remove source text
and its chunks even when the browser is closed.

```bash
npm ci
npm run check
npm run check:cloudflare
npm test
npm run preview:cloudflare
npm run deploy:cloudflare
```

`npm run build` generates both the Next.js output and `.open-next/worker.js`
with `.open-next/assets`. OpenNext invokes `build:next` internally to avoid
recursion. Preview and deployment scripts build before starting Wrangler. The
existing Cloudflare Build settings (`npm run build`, then `npx wrangler deploy`)
therefore also work from a clean checkout. Commit `package-lock.json`,
`wrangler.jsonc`, `open-next.config.ts`, and the application changes together.
Do not commit `.env`, `.dev.vars`, `.open-next`, or `.wrangler`.

The Worker name and self-reference are both `whatrajuthinks`. Set `APP_ORIGIN` in
`wrangler.jsonc` to the exact public HTTPS origin when adding a custom domain.
Preview overrides this to `http://localhost:8787`. Foreign hosts and origins remain
blocked. Hosted cookies are HttpOnly, SameSite=Strict, and Secure over HTTPS.

Provider keys belong in Cloudflare Worker secrets (`wrangler secret put
ANTHROPIC_API_KEY` or `OPENAI_API_KEY`). Configure the other AI settings listed in
`.env.example` as Worker variables/secrets as appropriate. Existing deployed
secrets are preserved; local `.env` values are not uploaded by deploying. Without
a configured provider, factual reports still work without making AI calls.

The first deployment creates the `Workspace` SQLite Durable Object class through
the `v1` migration. It does not import the local SQLite file. This remains a
cookie-owned workspace without email login or cross-device recovery. Browser
sign-out removes access; deletion removes the workspace's stored chats and reports.

`test/cloudflare.test.mjs` exercises the real local Worker runtime when
`WORKER_TEST_URL=http://localhost:8787` is set. It uses a synthetic export to check
large Unicode payloads, workspace isolation, factual reports, and deletion.

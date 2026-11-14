# What Raju Thinks

A WhatsApp chat-report app built with Next.js, React, TypeScript and SQLite. Import a real export, name the participants, and generate a narrative report with conversation statistics. See [PRODUCT_SPEC.md](PRODUCT_SPEC.md) for scope and reference-product research.

## Run locally

Requires Node **24.11+**.

```sh
npm install
npm run dev
```

Open [localhost:4173](http://localhost:4173). For a production-mode local run, use `npm run build:next` followed by `npm start`.

## Reports

- Import WhatsApp `.txt` or `.zip` exports, or paste exported text. Uploads allow 10 MB compressed and 20 MB extracted text.
- Local reports use actual messages and statistics without an AI request. AI reports run only when explicitly selected and a provider is configured.
- Anthropic readings select complete recent messages within token and spending budgets, then make one writing request. Partial readings require confirmation of the included messages and period. Statistics cover the full upload.
- Readings run in the background. Failed or interrupted processes can be retried or removed while keeping chats and reports.
- Reports support follow-up questions, copying, text downloads and browser printing.

## Configure AI

Copy `.env.example` to `.env.local` and set your provider, model and key:

```dotenv
AI_PROVIDER=anthropic
AI_MODEL=claude-sonnet-5-5
ANTHROPIC_API_KEY=your-key
AI_MAX_REPORT_COST_USD=1
AI_TARGET_INPUT_TOKENS=80000
```

For OpenAI, set `AI_PROVIDER=openai`, `AI_MODEL` to an enabled model, and `OPENAI_API_KEY`. Keys stay on the server. Provider usage is billed separately; retries retain prior spending on the same job.

## Storage and limits

Local data lives in `data/app.sqlite` and is not encrypted. An HttpOnly cookie owns each browser's workspace; there is no email login or cross-device recovery. Signing out clears access without deleting stored chats.

Source messages expire after 48 hours without a report, or seven days after the latest report. Reports remain until deleted. Deleting a source chat preserves its reports. Payments, other messengers and public sharing are outside the current scope.

## Checks

```sh
npm run check
npm run check:cloudflare
npm test
```

Provider tests use mocked responses and incur no AI charges. Optional Worker runtime tests require `WORKER_TEST_URL`; the mock-AI test also requires `WORKER_TEST_MOCK_AI=1` and the fake-provider configuration in [test/cloudflare.test.mjs](test/cloudflare.test.mjs).

## Cloudflare

```sh
npm run preview:cloudflare
npm run deploy:cloudflare
```

Both commands build first. `npm run build` generates the OpenNext Worker and assets. Hosted workspaces use SQLite Durable Objects; deployment does not import the local database.

Set `APP_ORIGIN` in `wrangler.jsonc` to the public HTTPS origin. Add provider keys with `wrangler secret put ANTHROPIC_API_KEY` or `wrangler secret put OPENAI_API_KEY`, and configure other AI settings from `.env.example` as Worker variables. Keep credentials and generated build files out of Git.

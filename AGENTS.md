## Learned User Preferences

- Match whatbrandonthinks.com for type and report voice: Geist in the UI, the `whatrajuthinks.` wordmark at one weight including `thinks.`, and essays that make one argument with scenes, a committed read, and a concrete next text instead of an even topic catalog that hedges.
- Conversation stats match whatbrandonthinks.com: a year calendar, then who talks, rhythm, and words. In a two-person chat the reader is labeled You.
- The site header is only the "Open your account" button to `/account`. The logo and other navigation stay in the footer.

## Learned Workspace Facts

- What Raju Thinks is a local WhatsApp-only chat-report app, an independent rebuild of whatbrandonthinks.com. Import a real WhatsApp export; there is no sample chat. Name the people and save a narrative plus statistics. Writers are Raju, Meera, and Kabir. Local reports use real counts with no model call; AI runs only when chosen and a provider is configured.
- Next.js 16, React 19, TypeScript, SWR, Zod, Vercel AI SDK, and SQLite via `node:sqlite` in `data/app.sqlite`. `npm run dev` serves localhost:4173. Node 24.11 or newer.
- Routes sit in `app/(main)` (home, account, dashboard, `/r/[id]`, `/c/[id]`, stats, about, FAQ, privacy, settings) and `app/(setup)` (six-step wizard in `components/setup-wizard.tsx`: chat type, upload, names, language, notes, then the report). `/chat-export` redirects to `/upload`, and export instructions stay on the upload page. The JSON API is `app/api/[...path]/route.ts`. Parser `lib/parser.mjs`, store `lib/store.mjs`, validation `lib/api.ts`, generation `lib/reports.ts`. Product boundary is `PRODUCT_SPEC.md`.
- Ownership is an HttpOnly `raju_session` cookie and the API accepts localhost only. There is no email login: `/account` lists this browser's conversations, and sign-out on `/settings` clears the cookie while leaving chats on disk. A source chat expires after 48 hours with no report, or 7 days after the latest report; the report stays until deleted. SQLite is not encrypted.
- Uploads allow 10 MB compressed and 20 MB extracted text, and need at least two senders and five messages. AI payloads over 400,000 characters are rejected. `POST /api/ultimate` is a later multi-chat report with no UI. Other messengers, Stripe, public share links, and email login are still out of scope.
- UI type is Geist Sans and Geist Mono from `next/font` (weights 100–900). Report titles still use Georgia. The wordmark is weight 750; `.brand-sub` only changes color. The report writer is one argument, claim headings, in-paragraph quotes, names resolved across the chat, uneven sections, a required labeled read, and a suggested text.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

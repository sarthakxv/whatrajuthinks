# What Raju Thinks — product specification and reconstruction record

**Version:** 1.0 · **Investigation date:** 13 November 2026 · **Target:** [What Brandon Thinks](https://www.whatbrandonthinks.com/)

**Build decision confirmed by the user:** create an independently implemented, greenfield product named **What Raju Thinks**, running locally with an AI integration ready to configure. **Latest scope: the first prototype is WhatsApp only**, including uploaded text/ZIP and a paste path. Connect paid AI, payment, authentication, email and other messaging platforms later. The user also supplied a private friend-report link as a visual/content reference; do not send that link or its content to external extraction services or retain private chat uploads in tracked research/test fixtures. This document describes the whole discoverable reference product, then explicitly scopes this first implementation. It is not a claim that private source code, prompts or authenticated behavior have been recovered.

## 1. Product in one page

What Brandon Thinks is a consumer chat-analysis product. A person imports a conversation, identifies its participants and context, and receives a character-written narrative about its interpersonal dynamics. It sells an outside perspective and an entertaining, shareable verdict. Statistics support that experience; the narrative is the primary output. [E-PUBLIC-01–06, 12]

| Dimension | Reference product |
| --- | --- |
| Primary customer | Someone curious or uncertain about a relationship, friend group, family or work conversation |
| Primary job | “Read our conversation and tell me what is going on, with evidence I recognize.” |
| Inputs | Exported chat text or screen recordings, participant identities, context, output language and follow-up answers |
| Output | A saved narrative report, associated chat statistics, and a route to ask a deeper question |
| Modes | One-to-one relationship; group; individual member within a group; multi-chat Ultimate |
| Personalities | Brandon by default; Clara from report 3 and Diego from report 5 for two-person chats |
| Acquisition | Direct/social traffic, chat-type landing pages, screenshot reactions, repeat reports, gifts |
| Conversion | First-report free preview, then paid report; report packs; optional membership |
| Retention | Saved reports; further questions; updated chats; different writers; Ultimate; WhatsApp membership |
| Promise | Clear, direct opinions based on the conversation, in the user's chosen report language |
| Product boundary | AI entertainment and interpretation, not established knowledge of anyone's private intentions |

### Price sheet

| Offering | Publicly observed price | Included |
| --- | --- | --- |
| First preview | Free; no card needed | Opening portion of first report |
| Standard first report, inspected session | **₹999.00** | Stripe line item “Brandon Relationship Report”; first report on this conversation, one-time purchase; observed from supplied friend-report preview |
| Ultimate | **$99.99** | One report about the user across **2–5 chats** |
| Membership | **$29.99/month** | WhatsApp access, five reports/month, Ultimate allowance |
| Prepaid packs / gifts | Exact prices and quantities unverified | Nonexpiring report credits; some offers include a report to give |

Sources: [FAQ](https://www.whatbrandonthinks.com/faq), [Ultimate](https://www.whatbrandonthinks.com/ultimate), [Membership](https://www.whatbrandonthinks.com/membership), E-STATIC-07 and E-UI-07. **₹999.00 is a directly observed session/region checkout price, not a universal tariff.** The inspected source was a friend report although the Stripe product label said “Relationship Report”. The membership's $74.95 nominal valuation of five reports implies $14.99 per unit; it does not establish an equivalent universal USD checkout price. `$` is the symbol on the public membership/Ultimate pages; taxes and broader regional pricing were not established. Membership copy values Ultimate plus five reports at $174.94 and displays savings of $144.95 / 82%. [E-PUBLIC-07–10]

## 2. Evidence and confidence rules

- **Observed UI:** the original page was opened and its visible controls/state inspected. This establishes that state, not later server behavior.
- **Published claim:** text was read on the product's public pages. This establishes what is advertised or promised, not proof of enforcement.
- **Static observation:** an exact string, route or client implementation exists in a publicly shipped browser bundle. It does not establish that a branch is active or reachable for a particular user.
- **Inference:** the most plausible explanation joining those observations. Inferences are labeled.
- **Design choice:** behavior deliberately selected for What Raju Thinks, rather than recovered from the reference.
- **Unknown:** no adequate evidence was collected. A complete specification can name an unknown; it cannot turn it into observed behavior.

The detailed public-page ledger is [research/public-pages.md](research/public-pages.md). It contains E-PUBLIC-01 through E-PUBLIC-21, exact URLs, scope limits and contradictions.

### UI and static evidence ledger

All artifact paths below are relative to `/Users/sarthak/Public/WhatRajuThinks/`. Original client files were retrieved as public shipped artifacts; they are research material, not application dependencies. Text anchors are supplied because minified file line numbers are unhelpful.

| ID | Evidence / exact location | Finding and limit |
| --- | --- | --- |
| E-UI-01 | Original `/`, direct UI inspection | White mobile layout; circular character/app artwork; black headline; subdued lead; large blue raised-edge CTA; animated chat sample; social proof and footer. Desktop geometry was not established by this UI observation. |
| E-UI-02 | Original `/setup`, step indicator “1 of 7” | Six selectable chat contexts. Selecting Romantic starts an attempt and navigates to `/chat-export` with `context=partner`. |
| E-UI-03 | Original `/chat-export`, “2 of 7” | WhatsApp, iMessage, Instagram, Messenger, KakaoTalk and LINE choices. WhatsApp leads to `/upload` with source/context/attempt query fields. |
| E-UI-04 | Original `/upload`, “3 of 7” | Choose file / upload area, privacy explanation, tutorial, disabled Continue before acceptance, email-import alternative. No real conversation uploaded in this observation. |
| E-UI-05 | Original WhatsApp tutorial modal | Single-person/group tutorial choice; 10 steps: open chat, tap name, export, without media, save to Files, remember folder, return to site, upload, pick file, uploaded. Replay/previous/next controls present. |
| E-UI-06 | User-supplied private `/c/{id}/reports/1?show=writing` page, browser inspection by main investigator | Accessible **preview only**: chat-specific narrative title, serif headings, author card, share button, privacy disclosure, prose addressed to user, WhatsApp-style verbatim quote bubbles, emoji section headings, full-report unlock and specific teased chapters. Private URL identifier/text intentionally omitted. Paid remainder not read; no purchase made. |
| E-UI-07 | Stripe hosted checkout reached from that preview unlock, main investigator browser inspection | **₹999.00**, “Brandon Relationship Report”, first report on this conversation, one-time/no subscription; Add code and Apple Pay/Link/UPI/Card offered. Region/session observation only. No email entered, payment submitted or purchase completed. |
| E-STATIC-01 | `research/artifacts/0b778tf7u9ewr.js`, anchors `friends-group`, `close-friend`, `kind:"relationship"` | Context identifiers, default kind routing, locale-ranked app choices, query propagation. Context is a starting assumption; family/work can be offered as group even though public copy also permits one person. |
| E-STATIC-02 | `research/artifacts/03jdrpqz0gwor.js`, route anchors `/chat/:id/review`, `/chat/:id/preview`, `/c/:id/stats` | Registered route inventory includes review/preview/delivery, conversation/member reports, settings, stats, Ultimate and gifts. Route existence alone is not proof of completed flows. |
| E-STATIC-03 | `research/artifacts/setup.html`, decoded Next payload `messages.ChatTeaser` | Rename participants; merge duplicate identities, split merged profiles; choose self; group name; inspect a sender's messages/range. Errors imply at least two participants must remain after merge. |
| E-STATIC-04 | `research/artifacts/0y85tywcb29yt.js`, anchors `/api/upload/sign`, `/api/upload/validate`, `/api/upload/state` | Client signs uploads, transfers normalized text, validates, hydrates/retries/replaces; distinguishes accepted and rejected imports. Backend contract/enforcement unseen. |
| E-STATIC-05 | Same bundle, anchors `archive_without_transcript`, `encrypted_backup`, `transcriptTruncated`; `research/artifacts/07lb20-x_fwsz.js`, `kakaotalk`, `[LINE]` | ZIP/text/CSV handling, archive transcript selection, encrypted-backup rejection, diagnostics, KakaoTalk/LINE parsing and date-order logic. Exact overall parser coverage and thresholds were not audited. |
| E-STATIC-06 | `research/artifacts/setup.html`, decoded `Upload.imessageWays`, `Upload.recordingUpload`, `Upload.kakaotalkEmail`; `research/artifacts/1xb-7r0kgbf4r.js`, `/api/upload/intake-address` | Mac vs phone export, recording progress/errors, per-chat email intake and polling, updates, device-specific instructions. Companion executable and OCR service were not inspected. |
| E-STATIC-07 | `research/artifacts/setup.html`, decoded `ReportPack` | Single/pack purchases, prepaid credits, restore credit on failure, gifts/code checking, membership allowances, used allowance fallback to one-time purchase. Prices and active experiments remain unknown. |
| E-STATIC-08 | Same HTML, decoded `Login`, `DeliveryStep`; `research/artifacts/0gva5ua9n0dms.js`, `/api/auth/send-code`, `/api/auth/verify` | Email-first six-digit code flow, resend/different email, delivery-address attachment/change. Request rate limits and code lifetimes unknown. |
| E-STATIC-09 | Same HTML, decoded `Report`, `Pending`, `DemoLoader` | Report writing/pending/completed/error states; long-chat cutoff disclosure; failure/refund-pending/refunded copy; waiting-screen text. Animated progress text is not evidence of exact backend progress. |
| E-STATIC-10 | Same HTML, decoded `ConversationHub`, `Dashboard` | Conversation hubs, group/member report paths, report history, update history, settings, account reports, deletion, membership status/allowances and gift status. Layout and authenticated enforcement unobserved. |
| E-STATIC-11 | Same HTML, decoded `ChatStats` | Calendar, share of voice, initiations, reply timing, activity, first/last/longest text, words/emojis, regional statistics. The precise algorithms are not present in this translation evidence. |
| E-STATIC-12 | Same HTML, decoded `BrandonAsks`, `Depth`, `ChatLanguage`, `Setup` | Follow-up questions and free text, author choice, report language, depth bands/angles. Exact question generator and scoring algorithm unknown. |
| E-STATIC-13 | Same HTML, decoded `SupportFlow`, `Feedback`, `ReportFeedback` | Guided support topics, report/severity selection, email reply target; feedback incentive code; abandoned-preview feedback may unlock a report. Availability/eligibility rules unverified. |
| E-STATIC-14 | Same HTML, decoded `PrivacyNote`, `Dashboard.chats`, `Dashboard.deleteAccount` | Separate chat/report/account removal; chat removal should leave reports; typed confirmation for whole-account removal; prepaid/member consequences. Actual deletion mechanics unobserved. |

## 3. Main journeys and state model

### A. First standard report

1. **Discover:** homepage or chat-type landing page, then “Try It Now”.
2. **Choose context:** Romantic; Friends group; Any friend; Family; Work/team; Other. [E-UI-02]
3. **Choose platform:** six app options. Preserve context and draft-attempt identity across navigation. [E-UI-03]
4. **Import:** device/platform-specific guidance, file or recording selection, progress, validation and recoverable errors. Continue only after acceptance. [E-UI-04, E-STATIC-04–06]
5. **Review identities:** inspect detected senders, merge duplicate names/numbers, rename to simple first names, identify self, name group where appropriate. Do not allow a merge that destroys the two-person minimum. [E-STATIC-03]
6. **Set report details:** output language, context/notes and delivery identity are supported by shipped routes/copy. Their exact original ordering after step 3 is **not fully observed**. [E-STATIC-02, 08, 12]
7. **Generate preview:** show meaningful waiting/error/recovery states, then opening report content. Full report unlock is monetized. Exact boundary between preview generation and post-payment work is unknown. [E-PUBLIC-02, 17]
8. **Read and return:** report can be revisited from account/conversation hub; user can inspect stats, ask a deeper question, update the conversation or analyze another chat. [E-STATIC-09–12]

The original step counter is seven for the observed standard flow. Extra branches can add steps: the header's static helper includes conditional `7 + 1` handling. The reconstruction should not assert an exact universal seven-page original sequence.

### Observed friend-report reading experience

The user supplied one private friend-report URL, which was inspected through the browser rather than an external extraction service. The accessible portion provided a concrete report-layout reference: [E-UI-06]

- A descriptive title built from the conversation's specific motifs, rather than a generic “friend report” label.
- White single-column reading surface with a large Georgia-like serif headline, followed by a bordered author card with avatar/name/AI byline.
- A full-width share-report action and a privacy line with “Learn more”. The sharing action's resulting authority/default audience was not verified.
- Several paragraphs of conversational prose, addressed to the user by first name, opening with recent chat evidence and making callbacks to earlier history.
- Green WhatsApp-like quote bubbles containing original messages, including code-switched/Hinglish content, then emoji-led serif section headings.
- Interpretive conclusions can include qualified limits, such as an inability to establish something from the chat alone. That caveat is part of the observed writing style; the underlying interpretation was not independently evaluated.
- After several paragraphs and the first section, an unlock block offers the full report and a “Still inside” list with three specific teased chapters. This observation confirms **partial preview**, not the full report's structure or length.
- Unlock led to Stripe hosted checkout showing **₹999.00** for “Brandon Relationship Report”, despite the source being a friend report. It offered Add code, Apple Pay, Link, UPI and Card. No email or payment was submitted; the paid remainder was not read. This is a session-specific price observation. [E-UI-07]

**Reconstruction requirement:** prioritize a compelling, chat-specific title and readable evidence-grounded narrative with authentic quotations. With no AI configured, retain this reading hierarchy but explicitly label the factual local output; counts alone cannot reproduce the reference's long subjective writing. No private messages or personal motifs from the supplied reference should be used as demonstration content.

### B. Deeper report on an existing chat

Open conversation → choose report path/subject → choose writer when eligible → answer generated prompts and/or write a question/context → pay/use credit/allowance → create another saved report. Keep historical reports immutable. First-report preview and subsequent reports may use different entitlement rules. [E-PUBLIC-02–03; E-STATIC-07, 10, 12]

For groups, distinguish a report about the whole group from a report about one member. Routes include `/c/:id/members/:memberId/reports/:reportNumber` as well as group report paths. [E-STATIC-02, 10]

### C. Update an existing conversation

Open settings/update → export the full chat again or record only new messages → import and deduplicate/append → show added-message count or up-to-date notice → include new content in the next report. Preserve original report snapshots and display update history. A warning can flag a changed apparent partner. Exact deduplication semantics are unknown. [E-STATIC-04, 06, 10]

### D. Ultimate report

Learn about Ultimate → sign in → select/add **2–5 chats** → identify the common user → choose language/name details → pay/use member allowance → produce one report about patterns across the user's relationships. It is distinct from concatenating several standard reports. Cross-chat user identity is a required design concern; its original picker and resolution logic were not observed. [E-PUBLIC-10–11; E-STATIC-02]

### E. Membership and gifting

Membership landing → recap → email-code sign-in → subscription checkout → welcome/account. Account displays current period, available reports, Ultimate availability, renewal/end date, payment failure, manage/cancel action and WhatsApp access. Static support copy says cancellation runs through the end of the paid month. Actual billing behavior remains untested. [E-PUBLIC-07–09; E-STATIC-07, 10, 13]

A prepaid pack may allocate credits and a separate gift. Gift recipient opens code page → imports own chat → redeems valid unused code at checkout. Codes need validation and one-time redemption, plus graceful used/invalid/unavailable states. Credit quantities, prices and promotions are configuration, not established constants. [E-STATIC-07]

### F. Data management and support

Account lists reports and conversations separately. Remove source conversation without removing completed reports; remove an individual report separately; remove account and all linked products/data with an explicit typed confirmation. Source retention timers continue independently. [E-PUBLIC-16; E-STATIC-10, 14]

Support routes users through deletion, missing report, report quality, payment or other. Quality cases select report and severity; payment cases distinguish repeat purchase, missing unlock, subscription, double charge, refund and other. Escalation gathers a description and reply email, promises reply within five business days, and handles rate/open-request limits. No support request was submitted during inspection. [E-STATIC-13]

## 4. Surface inventory

| Surface | Main content/actions | Evidence status |
| --- | --- | --- |
| `/` | Hero, CTA, sample conversation, suggested chat categories, app list, usage counters, screenshot wall, closing CTA, footer | UI + published |
| `/relationship`, `/friends`, `/family`, `/imessage` | Context-specific headline, CTA, testimonials/social proof, shared footer | Published |
| `/setup`, `/chat-export`, `/upload` | Context/platform/import funnel | First three steps UI; later branches static |
| `/chat/:id/review`, `/chat/:id/scan`, `/chat/:id/flavor`, `/chat/:id/cover` | Registered review/analysis presentation routes | Static existence only; exact duties unknown |
| `/chat-context`, `/chat-language`, `/chat-note` | Report setup routes | Static existence; detailed ordering unknown |
| `/chat/:id/preview`, `/chat/:id/preview/delivery` | Preview and delivery setup | Static + published claim |
| `/c/:id` family | Conversation, reports, member reports, settings and stats | Static copy/routes |
| `/r/:id`, `/report-launch/:id` | Report permalink and launch/status | Static copy/routes |
| `/account`, `/dashboard`, `/settings`, `/login` | Retrieval, identity, settings, source/report/account deletion, entitlements | Public login gate + static |
| `/ultimate`, `/ultimate/start`, `/ultimate/:id/...` | Marketing, authenticated multi-chat builder, language/name/launch/show | Public marketing/gate + static route family |
| `/membership`, `/membership/recap`, `/membership/start`, `/membership/welcome` | Subscription offer, confirmation, login and joining | Public offer/gate + static |
| `/gift/:code`, `/payment-status`, `/pricing` | Gift entry, payment result, pricing | Static routes/copy; actual checkout unobserved |
| `/faq`, `/support`, `/support/contact`, `/feedback`, `/about`, `/privacy`, `/terms` | Help, support, feedback, provenance and policy | Public content + static forms |
| `/demo`, `/demo/studio`, `/demo/take`, `/agent`, `/emails`, `/insights` | Registered ancillary/internal-looking routes | Existence only; excluded from inferred customer scope |

Locale-prefixed equivalents are registered in shipped client routes. Public footer exposes English, French, Spanish, Portuguese, German, Italian, Turkish, Hebrew, Arabic, Hong Kong/Taiwan Chinese, Korean, Japanese, Dutch and Thai. Report output languages are a separate setting and include Hindi and an “Other” free-text choice. Locale support must not be confused with guaranteed parser support. [E-UI-01; E-STATIC-02, 12]

## 5. Functional requirements for the reference behavior

### Import and validation

- Support the advertised platform/device paths. WhatsApp exports on iOS/Android; iMessage Mac export or iPhone recording; Instagram/Messenger phone recording for one-to-one; KakaoTalk/LINE native exports with device-specific upload/email guidance. [E-PUBLIC-05]
- Handle text/ZIP/CSV formats actually supported by each path; never treat an encrypted WhatsApp backup as an ordinary export. Only transcript content should be forwarded, not unnecessary archive media. [E-STATIC-04–06]
- Preserve multiline content, Unicode names, emoji, localized timestamps and participant identifiers. Separate system notices, media placeholders and authored messages. Disclose ambiguous or incomplete interpretation.
- Distinguish empty export, unsupported extension/kind, unreadable cloud placeholder, corrupt ZIP, missing/empty transcript, multipart export issue, insufficient messages, network failure and stale client. Provide concrete recovery instructions. [E-STATIC-05–06]
- Capture timestamp/date-order uncertainty. Do not calculate reply-time statistics from unparseable or fabricated dates.
- Bound file size, expanded archive size, message count and AI context explicitly. If older messages are excluded, disclose the cutoff. Original exact limits and context budget are unknown. [E-STATIC-05, 09]
- Recording import should show actual measured progress where available, allow cancellation/retry, disclose duration cutoff, and explain keep-page-open/foreground limitations. Reject unsuitable recordings and unsupported groups. [E-STATIC-06]
- Resume a valid attempt; recover a lost/expired browser session with a start-over path. Prevent cross-browser/foreign-owner confusion. [E-STATIC-04, 09–10]

### Participant model and setup

- One human may have several original sender labels. Preserve original identities and an explicit alias mapping; permit merge/split and editable display names. [E-STATIC-03]
- Choose which participant is the uploader; allow “not in chat” where product design permits, rather than inventing identity.
- Make group vs one-to-one report eligibility depend on normalized people, not the landing-page label alone. Static checkout errors mention a three-person minimum for group reports. [E-STATIC-03; decoded `Checkout.errors.wrong_group_count`]
- Store chosen report language independently of chat language. Collect optional off-chat context without confusing it with chat evidence.
- Report configuration should snapshot participant mappings, source range, subject, context, language and writer so older reports remain understandable after later edits.

### Reports, questions and statistics

- A report must be traceable to the supplied chat. Distinguish evidence-supported observations from interpretive opinions; never present inferred motives as established facts.
- Expected narrative themes include an overall verdict, each person's role, effort/initiations, changes over time, private language/jokes and practical next actions. Group reports discuss each member. [E-PUBLIC-04]
- The exact original section schema, prompt, model, output length and evidence-retrieval strategy are **unknown**. Any reconstruction schema is an independent design.
- Preserve follow-up question, answers and writer identity; new reports do not overwrite previous reports. [E-STATIC-10, 12]
- Writer availability for two-person chats: default Brandon; Clara from third report; Diego from fifth. Whether failures/refunds count toward unlock is unknown. [E-PUBLIC-03]
- Provide pending, succeeded and failed states with recovery. Payment-linked generation must not duplicate charges or consume credits twice; restore/reconcile entitlements after failure. [E-STATIC-07, 09]
- Save reports independently of expiring source transcripts. Clearly explain when a chat is no longer available for follow-ups. [E-PUBLIC-16; E-STATIC-14]

The shipped statistics vocabulary includes:

| Family | Discoverable measures | Algorithm caveat |
| --- | --- | --- |
| People | Message count, share of voice, who starts, forms of address, “I love you” | Start threshold and phrase matching unknown |
| Rhythm | Median reply time, busiest day, streak, longest silence, hourly distribution, instant replies, good mornings/nights | Session boundaries and time-zone handling unknown |
| Calendar | Daily heatmap, activity over years | Original binning/intensity unknown |
| Text | Longest message, first/last messages, common words, emojis, catchphrases, laughter | Stop words, stemming and reference corpora unknown |
| Media | Stickers, voice notes | Requires distinguishing export markers from actual text |
| Regional | LINE call counts/durations, unsent messages, first/last love phrases, Shabbat quiet periods, regional catchphrases | Locale-specific and not universal product requirements |

### Account, commerce and operations

- Email-code sign-in, six-digit entry, resend, change email and expired/invalid/error states. Do not expose reports through guessed identifiers. [E-STATIC-08, 10]
- Reports, sources, billing and membership must be scoped to the owner; sharing/gift tokens need explicit distinct authority. Public report sharing defaults were not established.
- Model single purchases, prepaid credits, gifts, optional monthly membership and Ultimate independently. Offer display is not entitlement proof.
- Stripe checkout completion must be confirmed server-side, with idempotent webhook handling and a purchase/report linkage. This is a reconstruction requirement inferred from the paid product, **not recovered implementation**.
- Report-ready email, failed/refunded email and per-chat intake reply require templates, delivery tracking and bounce handling. [E-PUBLIC-02, 05; E-STATIC-06, 08–09]
- WhatsApp membership requires its own identity binding, webhook handling and context policy. The exact original integration, limits and provider are unknown.
- Support and feedback submissions require validation, rate limiting, persistence and honest delivery confirmation. Reward/promo eligibility is server-controlled. [E-STATIC-13]

## 6. Data and service design for an independent implementation

This is a proposed model; the original private schema was not recovered.

| Entity | Key fields / relationships |
| --- | --- |
| Session/account | Opaque ID; eventual verified email/phone; creation time; auth/session lifecycle |
| Import attempt | Context, platform, method, state, created/expiry times, failure code |
| Conversation | Owner, title, platform, context, source expiry, normalized participant mapping, created/updated times |
| Source/message | Conversation, original sender, normalized sender, text, optional real timestamp, type, original ordering, source provenance |
| Participant | Original labels/IDs, display name, optional self selection; merge history if editable after reports |
| Report | Owner, conversation(s), subject, question/answers, language, writer, source snapshot/range, state, output mode, stats, sections, created/completed time |
| Generation attempt | Report, provider/model, actual selected input range, status, duration, error; never raw transcript in logs |
| Purchase/entitlement | Payment reference, product, amount/currency, state; credit ledger with idempotency keys |
| Membership | Owner, provider subscription, current period, state, allowance usage, cancel-at-period-end |
| Gift | Hashed/opaque code, issuer purchase, state, recipient/redemption binding |
| Support/feedback | Owner or reply email, category/report/severity, description, state; optional reward grant |

### Report output contract for the local build

```text
Report {
  id, title, createdAt,
  conversationId? / conversationIds?,
  kind: standard | ultimate,
  mode: local | ai,
  character, participants[], messageCount,
  question?, stats,
  sections: [{ title, body, quotes?: [{ sender, text }] }]
}
```

`local` means deterministic analysis of actual import statistics; it is visibly labeled and must not claim an AI interpretation or invent psychological conclusions. `ai` means the configured provider was actually called. An AI failure must return an error, not silently substitute local text under the AI label.

### Local API target

This table is the broader local architecture target. The latest WhatsApp-only prototype makes import, report/library, identity cleanup and follow-up APIs first priority. Ultimate is a future module, not a prototype acceptance condition.

| Method/path | Purpose / boundary |
| --- | --- |
| `GET /api/session` | Local-session/config capability state; never keys |
| `POST /api/import` | Validated text or ZIP import; return conversation metadata + stats |
| `GET /api/conversations` | Current local session's sources, without raw text |
| `GET /api/conversations/:id` | Owned conversation details/statistics for setup/reuse |
| `PATCH /api/conversations/:id` | Title/identity alias cleanup and self selection |
| `DELETE /api/conversations/:id` | Remove source; preserve completed report snapshots |
| `POST /api/reports` | Generate from an owned unexpired source and explicit settings/question |
| `GET /api/reports` | Owned saved reports, no source transcript |
| `GET /api/reports/:id` | Owned report detail |
| `DELETE /api/reports/:id` | Remove that report |
| `POST /api/ultimate` | Analyze 2–5 distinct owned available chats |
| `DELETE /api/account` | Remove the current local session's stored chats and reports |

The implementation README must record any contract refinements and the actual delivered surface. A proposed endpoint here is not evidence that it passed tests.

### Implementation architecture

- **UI:** Next.js App Router with TypeScript and React components; responsive and keyboard accessible. The initial framework-free spike was replaced following the user's framework preference.
- **Server:** Next.js Node-runtime route handlers, server-side input checks, same-origin JSON APIs, SQLite persistence using `node:sqlite`.
- **ZIP:** bounded extraction through `fflate`; do not write archive entries to disk.
- **Identity now:** a random HttpOnly, SameSite local-session cookie. This is a single-browser local workspace, not verified cloud authentication.
- **AI:** Vercel AI SDK with Zod structured output and direct Anthropic/OpenAI adapters. Server-only `AI_PROVIDER`, `AI_MODEL`, and the corresponding `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`; optional `AI_BASE_URL` override. Explicit generation action is the data-transfer boundary; UI says whether live AI is configured. Live output quality remains unverified until a provider is connected.
- **Storage:** local SQLite under ignored `data/`; no credentials or conversations in Git. Persistent reports snapshot generated content independently of source expiry.
- **Production later:** verified auth, encrypted hosted storage, queue/jobs, email, Stripe, messaging and operational observability. Do not make those services prerequisites for a useful local evaluation.

## 7. What Raju Thinks first-build scope

The user selected a working local app with paid services connected later, then narrowed the first prototype to **the WhatsApp feature only**. Deliver the WhatsApp import → participant/context setup → report → saved report/follow-up/statistics journey as a usable product. Preserve the full reference spec above for future development; do not treat it as permission to expand this prototype into every platform and monetization surface.

| Area | First-build requirement | Reference capability deferred or different |
| --- | --- | --- |
| Identity/brand | Original What Raju Thinks identity and locally authored sample material | Do not imply this is the official Brandon service or copy its customer claims |
| Discovery | Polished responsive WhatsApp-focused homepage, chat-context choices, clear import CTA | Other platforms are future work; original testimonials/counters are not evidence of Raju usage |
| Setup | Local flow covering chat context, WhatsApp source, participants, report language/notes and review/generate; friend/group use case supported | Platform selection can be skipped for this WhatsApp-only prototype. Exact reference ordering after observed step 3 is unknown |
| Imports | **WhatsApp iOS/Android text and ZIP**, with a paste path and meaningful validation | LINE, KakaoTalk, Instagram, Messenger, iMessage, recording OCR, native exporter and email intake are all future work |
| Identity cleanup | Rename/merge aliases, choose self, title; recompute stats consistently | Full original profile preview/split/update UX may require later work |
| Statistics | Real counts/shares/words/questions/initiations, monthly activity, emoji, reply medians only from valid dates | Full reference calendar/regional/media/phrase analytics are later work |
| Reports | Useful deterministic report when no AI key; actual optional AI generation with validation and error handling | No artificial paywall; local mode cannot reproduce subjective AI insight |
| Follow-ups | Saved question and another report using retained source; writer/settings choices where supported | Generated adaptive interview, original unlock/generation/prompt parity unknown |
| Ultimate | **Not part of the WhatsApp-only prototype** | Preserve full 2–5-chat requirement for a later module; avoid inert controls that imply availability |
| Library | Stored conversations/reports, detail/statistics, delete source/report/account | Cross-device account, billing, subscriptions and production access control deferred |
| Commerce | **Not part of the prototype**; no purchase required for local evaluation | No pretend checkout, credits, gift redemption or membership activation |
| Help/privacy | Local import guidance and accurate local data explanation | No fake support email delivery or unearned privacy/security guarantees |
| Sharing/export | Local report export/print where implemented; escaping for text/HTML | Public share links and screenshot generation require separate explicit implementation |

### Local limits and honest product copy

- The backend design caps compressed upload at **10 MB**, expanded transcript data at **20 MB**, and requires at least **two senders and five authored messages**. These are **Raju design choices**, not recovered original limits; align displayed UI with tested implementation.
- When not configured for AI, show “Local analysis” prominently. Explain what counts measure and avoid statements such as “this person loves you” derived only from message quantity.
- If local output is English only, do not silently pretend the selected output language was honored. Disable unsupported choices or explain the live-AI requirement before generation.
- Importing a supported normalized text/JSON file from a platform is different from reproducing that platform's original screen-recording path.
- A local database is not encrypted cloud storage. Browser-session ownership is not verified account sign-in. Clearing cookies can make a local session's data inaccessible through the UI; provide clear local-workspace guidance.
- No payment, email, WhatsApp or cloud upload should claim success when its integration is absent.

## 8. Privacy, security and retention

### Original published policy

The [privacy page](https://www.whatbrandonthinks.com/privacy) states no selling chats and no training models on chats/reports. It declares Supabase, Vercel, Stripe, Resend, Sentry, Anthropic, Gemini and OpenRouter, plus limited advertising measurement data. These are the original operator's claims, **not promises inherited by the clone**. [E-PUBLIC-14–16]

| Original record | Published retention |
| --- | --- |
| Conversation upload | Within seven days of latest report; each new paid report restarts the period |
| Abandoned upload | Within 48 hours |
| Selected recording, even rejected | Within seven days of selection; purchase does not extend it |
| Report | Until report/account deletion |
| Account | While active |
| Billing evidence | Generally ten years, as legally required |
| Technical/security log | Up to 90 days except legal/incident requirements |

### Local requirements

- Bind to loopback by default; validate request origin for mutations; scope every data lookup/mutation to the random local session.
- Escape imported names, message quotations, model output and error details at render boundaries. Never inject untrusted HTML/Markdown as raw markup.
- Enforce request-size, filename/type, ZIP-expansion, participant-map and parameter limits on the server; frontend restrictions are guidance only.
- Do not log raw conversations, secrets, model prompts or provider responses. Serve only intended public files; prevent path traversal and accidental database/env exposure.
- Treat uploaded messages as quoted data in the AI prompt. They cannot override system instructions, request secrets or trigger tools/actions. AI output is untrusted data requiring schema checks and bounded fields.
- Keep keys server-side. Send only the explicitly requested input to the configured provider; disclose provider context truncation and failure. Do not silently omit older messages without a coverage notice.
- Purge abandoned local sources after 48 hours and used sources seven days after the most recent local report; this substitutes a local-report event for the original paid-report event. Report snapshots remain until deleted.
- Deleting a source preserves report snapshots; deleting a report removes it; deleting the local account removes its data. Do not imply deletion removes provider-side logs or backups outside the implementation's control.
- Local follow-up/Ultimate generation on expired/missing source returns a clear reimport requirement.

## 9. Visual and interaction specification

The reference uses a friendly, concise, mobile-first visual language: white ground, near-black text, subdued gray secondary text, blue primary actions with a raised lower edge, rounded rectangular choices, colorful app/character marks, ample vertical spacing and simple progress headers. Observed mobile screens have approximately 24-pixel horizontal insets, full-width choices and a compact sticky header. [E-UI-01–05; E-STATIC-01]

What Raju Thinks should preserve that approachable task flow while owning its branding and content. The hero must communicate input → readable result immediately. Use original character art or a distinct simple identity; do not copy Brandon's face, names or customer screenshots as Raju's own evidence. Use the original visual hierarchy as a reference rather than shipping a screenshot facade.

Interaction requirements:

- Tap/click choices advance predictably; selected and busy states are distinct. Back works without duplicating imports or losing accepted data.
- Primary actions are keyboard operable with visible focus; controls have labels and errors are associated with inputs.
- Screen headings describe current task; progress has an accessible label, not color alone.
- Upload supports a file picker, clear allowed formats/limits and an accessible alternative to drag/drop.
- Modal tutorials trap focus, close with a visible action/Escape and restore focus; no required information depends on animation.
- Waiting state follows real work and prevents duplicate submission. Never animate fabricated counts as actual progress.
- Layout fits 360-pixel phones through desktop; long names, multilingual text, emoji and long quoted messages wrap without horizontal overflow.
- Honor reduced motion; do not use endless motion that blocks reading.
- Empty, missing, expired, error and success states are designed surfaces, not console-only outcomes.

## 10. Acceptance and verification plan

These are requirements/checks to run; completion status belongs in the implementation README or final verification record.

| ID | Acceptance scenario | Expected result |
| --- | --- | --- |
| A01 | Start fresh local server/browser | Homepage renders; local mode and AI capability are accurate; no login/payment required |
| A02 | Follow primary CTA through WhatsApp context/import | Correct progress/back state; configured selections survive normal navigation; no unsupported platform promises |
| A03 | Import valid WhatsApp iOS/Android multiline fixtures | Authored messages, Unicode participants, content and dates preserved; notices excluded appropriately |
| A04 | Paste valid WhatsApp text | Same parser/report path works; unknown format returns actionable error |
| A05 | Supply malformed file/JSON/ZIP, missing transcript, oversized compressed/expanded data | Rejected within bounds; server remains usable; no archive files written to arbitrary paths |
| A06 | Rename and merge duplicate participants | Message counts/percentages update; original sender data remains traceable; two-human minimum enforced |
| A07 | Render long and malicious-looking names/quotes/model text | Literal content displays safely; no executable HTML and no layout overflow |
| A08 | Analyze without AI configured | Real deterministic statistics and local-labeled report; no network model request or claimed psychology |
| A09 | Configure live AI and request report | Server calls chosen endpoint once; validates output; preserves question/settings; keys absent from browser |
| A10 | AI timeout, HTTP error, malformed/missing output | Visible failure and retry; no false AI success or silently substituted local report |
| A11 | Generate follow-up, then restart server | Old/new reports remain distinct and retrievable for same local browser session |
| A12 | Future Ultimate module | Deferred beyond WhatsApp prototype; eventual server must validate 2–5 distinct owned available sources |
| A13 | Compare two independent browser sessions | Each cannot list/read/change/delete the other's chats or reports by guessed ID |
| A14 | Delete source after report | Raw source disappears; completed report remains; follow-up asks for reimport |
| A15 | Delete individual report / local account | Only intended owned records removed; irreversible action has explicit UI confirmation |
| A16 | Advance retention clock past 48 hours / seven days | Source purged at applicable clock; report retained; source status shown accurately |
| A17 | Missing/ambiguous timestamps | No fabricated reply medians, activity dates or date range; coverage caveat shown |
| A18 | Test 390px and desktop widths, keyboard navigation, reduced motion | Usable layout/focus/labels; no blocked action, clipping or dependency on motion |
| A19 | Refresh a detail URL, use browser Back, access unknown ID | Correct restored view or clear not-found/ownership state; no blank screen |
| A20 | Click paid-service affordances in local build | Clear unavailable/configuration state; no simulated charges, messages or subscription activation |

Meaningful automated tests should cover parser edge cases, statistics/date correctness, validation/ZIP bounds, session isolation, source/report deletion independence and AI error behavior. Browser QA should exercise the representative end-to-end flow and mobile layout. Do not claim tests were passed merely because they appear in this table.

## 11. Production completion roadmap

1. **Provider-backed narrative quality:** choose provider/model and price budget; finalize prompt/schema; evaluate grounded quotes, long-chat coverage, multilingual output and failure cases. The original prompts cannot be recovered from public copy.
2. **Import parity:** native iMessage export utility, recording decode/OCR/deduplication, foreground/resume behavior, email intake, multipart exports, device tutorials and broader locale fixtures.
3. **Verified identity and asynchronous delivery:** email OTP, session renewal, cross-device library, job queue, retries/idempotency, ready/status emails and operational tooling.
4. **Commerce:** verified standard/pack pricing, Stripe products/webhooks, credits/gifts/refunds, preview/full-generation boundary, optional membership and monthly allowance ledger.
5. **Follow-up depth and group members:** adaptive interview, original-style author unlocks, per-member reports, update history and full statistics families.
6. **Ultimate identity:** explicit self mapping per chat, cross-chat provenance, entitlement and report refresh policy.
7. **Messaging membership:** WhatsApp provider, ownership binding, screenshot/chat forwarding, history selection and usage limits.
8. **Production privacy/operations:** hosted storage policies, encryption, backups/deletion verification, monitoring without transcript leakage, abuse/rate controls and accurate published policies.

## 12. Remaining unknowns and contradictions

1. **Regional prices and checkout:** ₹999.00 was observed in one Stripe first-report checkout. Other regions/currencies, subsequent-report prices, pack/gift prices, taxes, promotion rules and actual payment completion remain unknown.
2. **Preview boundary:** FAQ promises a preview before payment; terms says generation begins after payment. Separate preview/full jobs are plausible, not proven.
3. **Outdated public copy:** About says no subscription, while membership and static support explicitly offer/describe one. Treat membership as optional, not absent.
4. **Report/model internals:** prompts, active model routing, section schema, context budgets, truncation strategy, content filters and quality evaluations remain private.
5. **Authenticated runtime:** one user-supplied real friend-report preview was read in-browser; its paid remainder, account screens, share defaults, writer unlock enforcement and billing actions were not executed.
6. **Post-upload ordering:** first three steps and tutorial were observed. Identity/language/notes/delivery/report sequencing after accepted import is supported partly by strings/routes, not a complete UI walkthrough.
7. **Companion/OCR:** native export app and recording infrastructure were not reverse engineered; public claims cannot establish their accuracy or data flow.
8. **Statistics:** broad families are visible in shipped copy; exact algorithms and eligible locales are unknown.
9. **Credit/member edge cases:** reset time zone, rollover, failed-report counting, upgrade/cancel/proration, gift expiry and payment race handling remain unknown. Static copy suggests monthly Ultimate allowance but does not prove all terms.
10. **Retention enforcement/security:** policy is clear, actual backend purge jobs, encryption implementation and vendor contracts were not audited.
11. **Support incentives:** feedback/promo/report-unlock strings may be conditional experiments; their public availability and thresholds were not tested.
12. **Route coverage:** registered internal/demo/legacy routes do not establish active customer features. Investigation did not enumerate private endpoints or bypass authentication/payment.

The private friend-report preview is recorded as E-UI-06. Its personal content and URL identifier have not been copied into this document or research fixtures.

### Investigation checklist at handoff

| Question | Status | Evidence boundary |
| --- | --- | --- |
| What does the product do and for whom? | Answered | Public proposition + landing UI |
| What is the first-use flow? | Partially answered | First three steps directly observed; later phases static/public |
| Which input paths and errors exist? | Partially answered | Public guidance + client bundles; real parser/backend coverage incomplete |
| What does a report contain? | Partially answered | One user-supplied friend-report preview directly observed; paid remainder still inaccessible |
| How do repeat use, groups, Ultimate and membership work? | Partially answered | Public offer/static feature model; authenticated execution unknown |
| What are prices? | Partially answered | Ultimate/member public prices and one ₹999.00 standard checkout observed; other regions/packs unverified |
| How are identity, sources, reports and deletion modeled? | Answered as requirements | Public policy/static UX; private schema/enforcement unknown |
| What can the local clone truthfully deliver now? | Specified | Section 7 + implementation verification record |
| Is this a complete private implementation recovery? | No | Black-box public investigation; residual gaps explicitly retained |

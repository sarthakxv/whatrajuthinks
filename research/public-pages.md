# Public product evidence: What Brandon Thinks

Inspected 2026-11-13. Public page extraction through TinyFish; no account creation, payment, uploaded conversation, or authenticated account was used. This records what the pages say, not an audit of backend behavior. Main onboarding investigation is separate.

## Evidence ledger

| ID | Source | Observed product facts | Coverage / confidence |
| --- | --- | --- | --- |
| E-PUBLIC-01 | https://www.whatbrandonthinks.com/faq | AI reads uploaded conversations and produces a character-led opinion/report. Inputs advertised: WhatsApp, iMessage, Instagram, Messenger, KakaoTalk, LINE. Chat categories include couple, ex, crush, friends, family, work. | High confidence in public offering; processing not executed. |
| E-PUBLIC-02 | https://www.whatbrandonthinks.com/faq | First report has a free introductory preview, no card needed; user decides whether to buy remainder. Report normally takes a few minutes and readiness is emailed. Each next question becomes a new deeper report on the same conversation. | High confidence in stated funnel; no preview or purchase inspected. |
| E-PUBLIC-03 | https://www.whatbrandonthinks.com/faq | Two-person chats unlock Clara as writer from report 3 and Diego from report 5. Brandon is default. Group reports include an opinion on every member. | High confidence in published rules; unlock enforcement untested. |
| E-PUBLIC-04 | https://www.whatbrandonthinks.com/faq | Report topics: verdict, relationship dynamics, week of change, initiators, apparent effort, private language/jokes, suggested next action. | High confidence in described content; actual generated schema unknown. |
| E-PUBLIC-05 | https://www.whatbrandonthinks.com/faq | WhatsApp uses iPhone/Android exports; iMessage uses Mac companion app or iPhone screen recording; Instagram/Messenger use phone recording for one-to-one chats; KakaoTalk/LINE use native exports. Phone KakaoTalk export is emailed; desktop export is uploaded. Setup supplies tutorials. | High confidence in advertised methods, file limits and import accuracy unknown. |
| E-PUBLIC-06 | https://www.whatbrandonthinks.com/faq | Chats may contain any/multiple languages; user picks output language. Examples listed: English, French, Spanish, Portuguese, German, Italian, Turkish, Hebrew, Arabic. | High confidence in claim, language model behavior untested. |
| E-PUBLIC-07 | https://www.whatbrandonthinks.com/membership | Membership costs $29.99/month. Includes Brandon on WhatsApp, Ultimate Report, and 5 reports/month usable on existing or new chats. WhatsApp examples include sending screenshots, forwarding chat, discussing story, requesting full report. | High confidence in displayed price and package; renewal, credits, limits unknown. |
| E-PUBLIC-08 | https://www.whatbrandonthinks.com/membership/recap | Recap displays $174.94/month nominal value, $29.99/month member price, $144.95 savings (82%). Continue-to-payment links to /membership/start. | High confidence in display; no payment initiated. |
| E-PUBLIC-09 | https://www.whatbrandonthinks.com/membership/start | Email login required before joining. Email field and send-code action displayed. Links back to recap. | High confidence in initial state only; code not requested. |
| E-PUBLIC-10 | https://www.whatbrandonthinks.com/ultimate | Ultimate costs $99.99 and combines 2–5 chats into one report about the user across relationships. Suggested mix: love, family, friends, work. Same six messaging apps advertised. CTA links /ultimate/start. | High confidence in price and stated scope; generated content not inspected. |
| E-PUBLIC-11 | https://www.whatbrandonthinks.com/ultimate/start | Login gate requires email code before selecting chats saved to account. | High confidence in initial state only; no code requested. |
| E-PUBLIC-12 | https://www.whatbrandonthinks.com/about | Group report can lead to an individual member report. Cast descriptions distinguish opinionated Brandon, confidante Clara, experienced Diego. Product deliberately prioritizes narrative opinions rather than charts. | High confidence in stated proposition; individual report path untested. |
| E-PUBLIC-13 | https://www.whatbrandonthinks.com/about | Page states free preview then one-off reports and says no subscription. Claims 540,000+ reports, 2026 launch, Paris team GumGum founded by brothers Matthias and Robin. Links sister products Moka Score and GumGum Creators. | Public claims only. Subscription statement conflicts with membership pages; see gaps. |
| E-PUBLIC-14 | https://www.whatbrandonthinks.com/privacy | Privacy updated 2026-10-07. Processes email/account, conversations, notes, reports, technical security/operations data; Stripe handles card details. States no selling conversations or AI training with conversations/reports. | High confidence in policy wording; implementation not audited. |
| E-PUBLIC-15 | https://www.whatbrandonthinks.com/privacy | Declared vendors: Supabase accounts/storage, Vercel hosting, Stripe payments, Resend email, Sentry errors/security, Anthropic/Gemini/OpenRouter report generation. Limited ad measurement data can include hashed email and purchases. | Vendor declarations only; exact active model, infrastructure, versions unknown. |
| E-PUBLIC-16 | https://www.whatbrandonthinks.com/privacy | Conversation/report/account deletion available in account. Conversations expire within 7 days of latest report, reset by each new paid report; abandoned imports 48h; selected recordings 7 days from selection regardless of purchases; reports until deletion; account while active; invoices generally 10 years; technical logs at most 90 days except obligations/incidents. | High confidence in policy; deletion and purge mechanics untested. |
| E-PUBLIC-17 | https://www.whatbrandonthinks.com/terms | Terms updated 2026-09-28. AI reports classified as entertainment; user must be entitled to use uploads. Total price before Stripe payment; generation starts after payment confirmation; delivery by email. Refund review can take 5 business days for major unusability; ordinary model inaccuracies generally excluded. | Policy observations, not legal advice or implementation evidence. |
| E-PUBLIC-18 | https://www.whatbrandonthinks.com/imessage | iMessage-specific landing page reuses core upload/report proposition, animated chat text, example chat categories, app list, social proof wall, try CTA, shared footer. | Initial public content only. |
| E-PUBLIC-19 | https://www.whatbrandonthinks.com/support | Starts a guided support flow with a Start action. | Initial state only; following steps not extracted. |
| E-PUBLIC-20 | https://www.whatbrandonthinks.com/feedback | Feedback page asks for impressions, improvements, and ideas; says team reads submissions. | Text visible, form fields/submission behavior untested. |
| E-PUBLIC-21 | https://www.whatbrandonthinks.com/account | Fetch returned login_required. | Authenticated contents inaccessible within this pass; do not infer dashboard layout. |

## Price and capability matrix

| Offering | Observed price | Inputs / outputs | Evidence |
| --- | --- | --- | --- |
| Initial preview | Free, no card | Opening part of first generated report | E-PUBLIC-02 |
| Standard report | Exact standalone price not observed | One chat; narrative verdict and dynamics; subsequent questions produce deeper reports | E-PUBLIC-02, 04 |
| Group report | Exact standalone price not observed | Group conversation, every member discussed, individual follow-up available | E-PUBLIC-03, 12 |
| Ultimate Report | $99.99 | 2–5 saved chats; report about common user across relationships | E-PUBLIC-10, 11 |
| Membership | $29.99/month | WhatsApp character access, Ultimate, five monthly reports | E-PUBLIC-07, 08 |

Membership assigns a $74.95 nominal value to five reports. $74.95 / 5 = $14.99, but this is an inferred unit value, not verified standalone checkout pricing. Currency symbol shown is `$`; tax treatment and location-based pricing were not established.

## Report / account requirements supported by evidence

- Save generated reports for account retrieval until explicitly deleted (E-PUBLIC-16).
- Keep chats available for deeper reports during retention window; expose removal separately from reports (E-PUBLIC-02, 16).
- Email-code authentication gates membership and Ultimate (E-PUBLIC-09, 11).
- Attach multiple reports to a conversation; preserve question/depth and writer identity (inference from E-PUBLIC-02, 03).
- Separate original conversation expiry, recording expiry, account deletion, and billing retention (E-PUBLIC-16).
- Entitlement model needs one-time purchases and optional membership, despite outdated no-subscription copy (E-PUBLIC-07, 13).

## Unknowns and contradictions to preserve

1. **Public-copy contradiction:** About says no subscription while live membership landing/start advertise a monthly plan. Implement the observed optional membership as an explicit offering, do not repeat the absolute no-subscription claim.
2. **Price:** Standard report price is only arithmetically implied by membership value. Verify checkout before claiming exact parity.
3. **Paywall ordering:** FAQ says preview before purchase; terms says generation begins after confirmed payment. Likely preview generation precedes full paid generation, but exact job boundary is inference.
4. **AI:** No exact prompt, model routing, context limits, evidence-selection algorithm, moderation rules, schema, retry, or latency SLA visible. These must be independent design choices.
5. **Membership:** Ultimate frequency, credit rollover/reset, cancellation, WhatsApp identity binding and history scope are unknown.
6. **Ultimate:** Actual saved-chat picker, user identity disambiguation across chats, report sections, purchase screen, and member entitlement checks unavailable without login.
7. **Import:** Exact supported formats, extension/MIME checks, upload limits, min message count, participant editing, native Mac companion behavior, video OCR/transcription approach unavailable from these pages.
8. **Account:** Authentication code rules, report list/detail layouts, deletion UX and billing-management routes not observed.
9. **Support/feedback:** Subsequent fields, category rules, and confirmation states not inspected, and no submission was made.
10. **Claims:** Marketing report counts and privacy/security claims are recorded as statements, not independently verified facts about runtime.

## Investigation checklist status

| Question | Status | Boundary |
| --- | --- | --- |
| What is the product and output? | Answered publicly | E-PUBLIC-01–06, 12 |
| What are monetized offerings? | Partially answered | Membership/Ultimate prices clear; standard checkout unobserved |
| Supported import methods? | Partially answered | Public list clear; parsing/file limits unobserved |
| How do deeper reports/cast work? | Partially answered | Published unlock rules; execution untested |
| What are retention/deletion requirements? | Answered as policy | Actual purge implementation unobserved |
| What vendors are declared? | Answered as policy | Active backend not audited |
| How do login/account/Ultimate/membership work after sign-in? | Unresolved | Stopped before email-code request |
| How do support/feedback submissions work? | Partially answered | Initial pages only, no messages sent |

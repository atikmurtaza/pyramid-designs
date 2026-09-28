# Phase 2I-D: Public intake abuse controls and trusted proxy foundation

Date: 2026-09-28. Repository implementation and offline verification; production intake remains closed.

## Baseline and isolation

The required remote main, fetched origin/main and starting HEAD were all `a6017ba274d5940a65fd09b0465d8d14e074909e`, `feat: add Resend email provider`. Work uses `phase/2id-abuse-controls` in `C:\Users\atikm\.codex\worktrees\pyramid-2id\Pyramid Designs`, initially clean with empty staging. The primary `feat/frontend-redesign` at `108200b3ea981957ba2683a8c050db7adba2ef42` and clean C2B worktree remain intact. No primary file, environment, branch or index was copied, changed or reconciled. Final preservation is checked against its initial status and changed/untracked file hashes.

The owner's C2B closure evidence includes identical provider receipt, provider-reported delivery and independent receipt in the contact mailbox. Initial Spam/Junk placement remains an operational deliverability observation. This phase neither repeats that send nor claims offline tests establish live email health.

## Architecture and threat model

[ADR 0016](../architecture/decisions/0016-public-intake-abuse-boundary.md) records the decision before code changes. The review traced both public encodings, application/idempotency repositories, file validation/quarantine, worker and email effects, staff claims/authorization, schema/migrations, configuration, Hostinger probes and production smoke.

Threats: forged network identity, automated/random-key floods, expensive pre-admission work, global bucket races/rollback, oversized or malformed bodies, multipart allocation amplification, PDF decompression, duplicate/conflicting retries, challenge bypass/outage, candidate enumeration, raw error/secret/content leakage and production test-mode activation. A distributed volumetric attack and one actor exhausting the shared budget remain availability risks requiring deployed edge/resource acceptance. No client fingerprint, email-based lockout, Redis or parallel limiter table is introduced.

## Actual control order

1. Bounded URL/Origin/Host checks and the existing exact-origin, loopback-only development/test authorization. Production returns a generic closed response before database or provider access, regardless of flags, spoofed forwarding headers or challenge configuration.
2. Fixed POST path, no query/fragment commands, supported Content-Type, no Content-Encoding and bounded declared length/header values. JSON is unsupported and returns 415 in the authorized synthetic environment.
3. Two active public requests per process across both handlers. Excess calls return a safe 429 without joining the DB pool queue. This is resource backpressure, not durable/global authority.
4. Separately committed PostgreSQL admission, before reading/parsing the body or invoking any provider.
5. Bounded byte read, strict encoding/form fields; for multipart, raw framing/header/part limits before native formData, then strict fields before PDF inspection/hash.
6. Authoritative job/question/consent/retention and idempotency resolution, followed by transactional domain work. File-required applications remain non-reviewable pending applications until the existing file workflow completes.
7. Drive allocation/reservation, fenced storage and finalization. Same successful upload retry reuses its stored ID and performs neither another allocation nor another write. Background confirmation remains eligible only after SUBMITTED.

Turnstile is a server-only contract for a later approved production caller. It is deliberately not wired into a public production activation path. The current synthetic rehearsal makes no challenge-provider requests. Future production integration must use admission before Siteverify, validate a fresh token before domain/provider effects, and leave the token outside application idempotency hashing. Removing the synthetic gate alone is not a supported production enablement procedure.

## Global limiter and failure behavior

Both JOB_APPLICATION and TALENT_NETWORK, with and without CV, share **20 attempts per 60 seconds**. No limit was raised. The existing unique `(scope, keyDigest, windowStartedAt)` row uses INSERT/ON CONFLICT update; PostgreSQL serializes contenders. Runtime rollover uses database statement time. Delayed statements can conservatively count toward a newer window; there is no unsynchronized application clock or counter read/modify/write race. A clock override is rejected outside NODE_ENV=test.

Exactly one non-personal row is retained and reused. Its count saturates at 21; expiry resets it to one on the next admitted statement. There is no stale-bucket accumulation or scheduler dependency. Missing/invalid counter results deny admission. Normal limiter transactions have a three-second statement deadline and commit independently. Domain rollback cannot refund a committed attempt; a failed limiter transaction admits no mutation. Pool acquisition retains the existing ten-second timeout, with the new two-request cap limiting intake queue pressure. These are application bounds, not claimed Hostinger transport guarantees.

Exact retries, conflicting keys, malformed admitted payloads and randomized-key floods consume the same budget. Cheap shape/origin rejection and process overload do not touch it. Every future challenged retry needs a fresh single-use token; application idempotency remains stable. No key, job, email or challenge acceptance creates an unlimited bypass.

429 and 503 responses carry fixed `Retry-After: 60`; all public handler responses are private/no-store and nosniff. Failure messages expose no SQL, network derivation, provider error, record identity or email existence. DB/provider outages never continue mutations with protection disabled.

## Request and multipart bounds

| Surface | Bound |
| --- | --- |
| URL | 2,048 characters; exact mutation path; no query/fragment |
| Relevant individual shape headers | 256 characters |
| Structured body | 24,576 bytes; five-second read deadline; strict UTF-8 and percent encoding |
| Fields/answers | Existing 15 named fields plus at most 50 answer fields; duplicates/unknowns rejected; no client-owned state fields |
| Name/email/city/phone/experience | 160 / 320 / 120 / 40 / 40 characters |
| Profile URLs/introduction | 500 / 2,000 characters; HTTPS URLs without credentials |
| Answers/options | 50 answers, 4,000-character raw answer cap, 500 short-text / 4,000 long-text, one authoritative option per SELECT; context fails closed above 50 options per question |
| Multipart body | 5 MiB + 32 KiB; ten-second read deadline |
| Multipart envelope | At most 66 raw parts; 1,024 bytes of headers per part; boundary at most 70 characters; aggregate names/field values at most 24,576 bytes |
| Candidate document | Exactly one nonempty PDF, at most 5 MiB; transient filename at most 160 characters |
| Concurrency | Two intake requests and at most two multipart parsers per process |

The multipart preflight accepts the normal browser-generated framing subset. It rejects duplicate/extra file parts, repeated names, malformed/truncated boundaries, preamble/epilogue, unsupported part headers/nested encodings, many tiny parts, empty CVs and filename path tricks before native materialization. Optional empty text values remain valid where the existing form permits them. Native FormData continues to decode the accepted bounded envelope; no general multipart parser or dependency is introduced.

Byte readers use one bounded buffer rather than retaining an object per incoming chunk. Empty chunks are rejected by the shared reader; elapsed-time checks supplement timers. Unresolved cancellation promises cannot keep the request waiting. Native parsing and synchronous PDF CPU cannot be preempted by a timer; byte/part/concurrency bounds are therefore essential. Existing PDF stream limits (4,096 streams, 8 KiB dictionary traversal, aggregate 5 MiB decompression) and active-content rejection remain unchanged. Structural inspection is never malware clearance.

## File transaction interaction

Previously Drive ID allocation ran before structured validation. Now a bounded transaction validates/reuses the application and checks live file-required eligibility before any allocation. A separate reservation transaction rechecks current state after external allocation. No database connection is held over Drive I/O. Allocation failure may leave one consent-bound, idempotently recoverable SUBMISSION_PENDING application without a file; no success, clearance or confirmation is produced. Its same-key retry can continue. Reservation, upload claim and later quarantine finalization retain the existing fenced worker semantics. Concurrent same-key reservations still converge on one active file; a racing unused preallocated ID has no stored content.

The Phase 2H finalization fault test now intercepts the actual quarantine update rather than assuming the second transaction is finalization. Existing legacy live-Drive rehearsal tooling was not run or expanded; a future separately authorized rehearsal must reconcile its historical transaction-count/worker-state assumptions before execution.

## Trusted proxy decision and current official research

Accessed 2026-09-28:

| Exact page title and URL | Fact relied on | Security provenance |
| --- | --- | --- |
| [How to add a Node.js web app in Hostinger](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/) | Managed Node deployment from GitHub/upload, runtime/build settings and environment management are documented. | Does not specify authoritative client-IP headers, inbound replacement/append behavior, trusted hop count, stable source ranges, origin bypass controls or a native trusted address primitive. |
| [Node.js hosting options at Hostinger](https://www.hostinger.com/support/node-js-hosting-options-at-hostinger/) | Business web/Cloud managed applications are distinct from root-controlled VPS and static Agency hosting. | Generic VPS/Nginx instructions cannot establish the Managed Web App trust boundary. No adequate forwarding provenance is documented here. |
| [Validate the token — Cloudflare Turnstile docs](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/) | Official Siteverify endpoint; mandatory server validation; token maximum 2,048 characters; five-minute expiry; single-use tokens; optional remoteip; hostname/action response. | Establishes challenge verification semantics, not Hostinger header trust. Forwarding-header examples are not adopted. |

The previously referenced Hostinger `how-to-fix-common-nodejs-errors-at-hostinger` URL returned 404; it supplies no current evidence. Reviewed documentation does not establish even a security-usable header/hop model. This is a documented evidence gap, not a claim that no platform proxy exists. Repository Phase 2A runtime evidence proves bounded upload transport and pg compatibility; it did not test spoof resistance. No deployment/configuration change was made to obtain new observations.

**TRUSTED CLIENT IP: DEFERRED**

**PER-IP RATE LIMIT: DEFERRED**

Both readiness values explicitly remain `UNAVAILABLE_UNTIL_TRUSTED_PROXY_PROVEN`. All request headers, including X-Forwarded-For, X-Real-IP, Forwarded and CF-Connecting-IP, are ignored as network identity. IPv4, IPv6, mapped IPv6, multiple/duplicate values, casing/whitespace, malformed and missing values cannot alter admission identity. No raw IP, IP hash, network key or fingerprint is logged/persisted.

Later evidence requires owner-authorized isolated deployment plus platform documentation/support confirmation: identify every ingress/CDN/origin route; prove direct-origin bypass is impossible or equally protected; record source-peer visibility and header stripping/replacement/appending; send benign synthetic marker headers through each route with missing, forged, repeated, malformed and chained values; test IPv4/IPv6/mapped forms and custom versus temporary domains; repeat across restart/redeploy. Observing a plausible address once is insufficient. If the runtime only exposes attacker-reproducible headers, per-IP enforcement remains unavailable. Only then design a bounded, rotating, purpose-specific keyed identity with reviewed retention/privacy; raw-IP persistence is not the default.

## Challenge contract, configuration and privacy

Turnstile remains required as defense in depth. The server contract returns only VERIFIED, REJECTED or UNAVAILABLE. Native fetch uses exactly the official HTTPS Siteverify URL, POST, no redirects, no cache, one call, a three-second overall wait, an 8 KiB body limit and strict JSON/UTF-8/schema checks including duplicate fields. Acceptance requires exact configured hostname, fixed `candidate_intake` action, valid nonfuture timestamp younger than five minutes and no conflicting errors/cdata. False/expired/duplicate tokens deny acceptance. Provider errors, malformed responses, timeout or missing/invalid configuration fail closed. No token or raw response is logged, persisted or included in an application hash. No `remoteip`, candidate data or arbitrary provider URL is sent.

There is no runtime fake verifier, synthetic acceptance switch or injected verifier parameter. Official Turnstile test keys fail configuration validation. Offline tests replace fetch before imports and do not configure a deployed environment. `CONFIGURED_UNVERIFIED` means syntactically complete configuration only. Public production intake remains closed even with that result.

**CHALLENGE CONTROL: DEFERRED** — server contract/offline behavior verified; real provider configuration, browser widget, CSP/accessibility and deployed verification remain uncompleted production gates.

### OWNER ACTION REQUIRED — before a separately authorized live challenge rehearsal

| Variable/item | Value and handling |
| --- | --- |
| `PUBLIC_INTAKE_CHALLENGE_PROVIDER` | Exact non-secret value `turnstile` |
| `PUBLIC_INTAKE_ORIGIN` | Exact owner-approved HTTPS intake origin, no trailing slash/path/query. No production hostname is invented or defaulted; the owner must approve it. |
| `TURNSTILE_SITE_KEY` | Public identifier of the real widget restricted to that hostname; keep in server configuration until approved rendering exists. |
| `TURNSTILE_SECRET_KEY` | Private matching widget secret; server-only, never NEXT_PUBLIC, never pasted into chat. |
| Widget action | Exact non-secret value `candidate_intake`, fixed by code |

Configure privately in the isolated rehearsal environment only after authorization. A later production release must provision its own reviewed Hostinger environment; this phase does not authorize Hostinger changes. Neither provider configuration nor a successful token opens intake. Stop before live verification until that specific action is authorized. No new secret is needed to run these offline checks.

Turnstile introduces Cloudflare processing of browser/device/network challenge signals and transmission of a token to Siteverify. Omitting remoteip from the server payload does not make browser processing privacy-neutral. Appropriate notices, processor/cross-border/legal review and accessible failure/retry behavior must be approved before a widget is enabled. Do not send application content or use cdata for candidate tracking.

## Verification and independent final review

All database tests run against fresh named loopback-only PostgreSQL 17 disposable databases in a dedicated container, never the configured development/production DB. Every regression database replays all nine committed migrations from zero with anon/authenticated role scaffolding. RLS is enabled on 28/28 public tables; zero policies, prohibited effective table grants and callable public application functions. Prisma status is current on replay only. Historical SQL, schema, lockfile and canonical logo are unchanged.

The independent final diff pass examined spoofable identity, clock/race/rollback behavior, parser amplification, challenge failure/secret handling, idempotency, disclosure, PDF/worker/email/staff/RLS boundaries and scope. It found and fixed the early answer-count gap, Host/Origin canonicalization edge case, and stream cancellation/time-budget weaknesses. The focused suite also verifies an actual blocked limiter statement times out without changing the counter. No remaining local implementation blocker was identified; deployment/provider uncertainties remain explicit below.

No UI, browser widget, CSS, motion, logo, staff authorization, email implementation or database permissions were changed. Phase 1 appearance and keyboard/error/pending behavior are retained; no new browser accessibility acceptance is claimed. Server validation errors remain generic and field-safe. A later widget needs 320/390/768/1280/1440-width, keyboard, screen-reader, no-focus-trap, reduced-motion and no-overflow acceptance.

Final local gates after the review corrections:

| Gate | Evidence |
| --- | --- |
| Phase 2B / 2C / 2D / 2E / 2F | All five existing success markers passed in separate fresh replay databases |
| Phase 2G / 2H | 83 / 291 checks; rollback verified |
| Worker / C1 notifications / C2B Resend | 431 / 230 / 250 checks; Resend live_requests=0 |
| Phase 2I-D | 422 checks; actual 45-request DB race admitted exactly 20; lock timeout, rollback, shared budgets, recovery, malformed bounds, forwarding matrix and offline provider failures |
| Migration replay and status | Nine migrations replayed from zero for each regression; Prisma status current on disposable DB; 28/28 RLS; zero policies/prohibited effective grants/callable public application functions |
| Prisma validation / lint / typecheck / production build / post-build typecheck | Passed |
| Full dependency audit | Zero vulnerabilities |
| Production smoke | 31 checks; intake still closed, worker replay bounded, anonymous candidate/staff access denied |
| Secret canaries | 92 client build files and build/server logs; zero synthetic challenge-key canary occurrences |
| Sensitive source scan | 11 intended files; zero private-key, JWT, DB connection, Resend/Google key or literal bearer-secret findings; synthetic fixture values and reserved documentation IPs reviewed separately |
| Historical files | Nine migration SQL files plus migration lock unchanged; Prisma schema/dependency lock unchanged |
| Canonical logo SHA-256 | `2c5d2042ef020aa7ad37ff92e6fd9c3407ef305102ee49da3b6900ff99ffe60c`, baseline and LF-normalized working copy match |
| Primary preservation | Original branch/HEAD/status unchanged; all ten originally modified/untracked file hashes match; primary index untouched |

The first focused run exposed a test helper's default-value assertion error, and the next caught a multipart filename capture-index error; both were corrected before any passing evidence above. The first Phase 2H regression exposed transaction-count-coupled fault injection; the fault now targets the actual finalization statement and all affected suites were rerun. No failure was suppressed. Review then added canonical Host/Origin, explicit answer count, monotonic stream timing, cancellation and blocked-limiter checks; the table reports the resulting final runs.

No live Resend email or Google operation occurred. The configured development/production database was not contacted, migrated or reset. Supabase's current grants/RLS guidance and September PostgreSQL changelog were reviewed; the extension/operator changes do not occur in these committed migrations. This is not a hosted database upgrade or live-grant audit.

Release is conditional on the exact staged 11-file snapshot, repeated sensitive/diff checks and unchanged remote baseline. The authorized commit message is `feat: harden public candidate intake`, followed only by normal fast-forward `HEAD:main`. Commit SHA and remote synchronization are recorded in the closure response. C2B and Phase 2I-D worktrees/branches are retained. No deployment command or production configuration action is part of this release.

MIGRATION REQUIRED: NO

NEW DEPENDENCY REQUIRED: NO

LIVE RESEND EMAILS SENT DURING 2I-D: 0

## Remaining production gates

Trusted Hostinger ingress/proxy and edge-resource acceptance; real Turnstile setup plus production-origin/widget/CSP/accessibility integration and verification; privacy/legal and purpose-specific consent/retention approval; least-privilege runtime database identity; staff Auth/MFA/recovery and operational ownership; actual scheduler execution; approved Google conditional deletion/reconciliation and manual malware-review rehearsal; backup/restore and incident/deliverability operations; real-device acceptance; separately authorized diagnostic/synthetic cleanup, production migrations/configuration, deployment and intake activation. No frontend/Neon reconciliation or worktree cleanup is included.

GLOBAL RATE LIMIT: READY (local durable boundary verified)

REQUEST BOUNDS: READY (application boundary; deployed transport evidence remains separate)

MULTIPART ABUSE CONTROL: READY (bounded application parser)

PUBLIC INTAKE ABUSE FOUNDATION: NOT READY for production activation while challenge/deployment gates remain open; the closed-intake repository implementation can be released independently.

REAL CANDIDATE INTAKE: NO

PRODUCTION DEPLOYMENT: NO

NEXT PHASE HAS NOT STARTED.

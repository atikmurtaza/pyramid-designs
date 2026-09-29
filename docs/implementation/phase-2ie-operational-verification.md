# Phase 2I-E: Turnstile integration and operational verification

Date: 2026-09-29. Controlled integration and bounded live widget rehearsal; no production activation.

## Baseline and isolation

Fetched origin/main, actual remote main and isolated starting HEAD all matched `d6c92b5d7e51c7c7061387fa3d9563edb0162f63`, `feat: harden public candidate intake`. The clean Phase 2I-D checkout with empty staging and ignored/untracked `.env.local` was reused at `C:\Users\atikm\.codex\worktrees\pyramid-2id\Pyramid Designs`. Dedicated branch: `phase/2ie-operational-verification`. No environment file or credential was copied.

Protected primary: `feat/frontend-redesign`, HEAD `108200b3ea981957ba2683a8c050db7adba2ef42`. Its existing modified/untracked files, branch, index and HEAD were preserved. The historical C2B checkout and branch were preserved. Neither checkout was synchronized, switched, staged, committed, reset, stashed or cleaned. Final preservation is checked against starting status and file hashes. No worktree or phase branch is removed.

## Current official documentation

All accessed 2026-09-29. Short technical observations, not copied documentation:

- [Embed the widget](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/): official `api.js?render=explicit`, explicit render, remove/reset lifecycle, mandatory server verification. The async script's load callback starts rendering; do not call ready() on an async/defer script.
- [Widget configurations](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/): compact size, tabindex, success/error/expiry/timeout/unsupported callbacks, disabling hidden response fields, retry/refresh controls. No custom candidate data is used.
- [Validate the token](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/): official Siteverify POST, 2,048-character maximum, 300-second expiry, single use, hostname/action verification, optional remoteip. Optional Enterprise metadata is not enabled or stored; the existing strict response contract fails closed on unknown fields.
- [Content Security Policy](https://developers.cloudflare.com/turnstile/reference/content-security-policy/): nonce support and `https://challenges.cloudflare.com` in script-src/frame-src; self in connect-src. No extra provider connect origin is required.
- [Error codes](https://developers.cloudflare.com/turnstile/troubleshooting/client-side-errors/error-codes/): `110200` means domain not authorized; this is the observed local real-widget outcome.
- [How to add a Node.js web app in Hostinger](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/) and [Node.js hosting options at Hostinger](https://www.hostinger.com/support/node-js-hosting-options-at-hostinger/): managed hosting/deployment differs from root-controlled VPS. These pages do not establish authoritative client-IP headers, replacement/append behavior, source-peer trust or direct-origin bypass protection.
- [Securing your Data API](https://supabase.com/docs/guides/api/securing-your-api) and [Supabase changelog](https://supabase.com/changelog): grants and RLS are separate controls. The September 25 PostgreSQL breaking-change notice concerns extension/index/cipher/operator behavior; this phase changes none of those and makes no claim about hosted server patch status.

## Integration, controls and data boundary

One `IntakeChallenge` component is shared by JOB_APPLICATION and TALENT_NETWORK through the existing Join form. Phase 1 typography/layout remains unchanged outside the added security-check section. Compact widget size fits the narrow form. A 15-second script-load deadline produces an accessible retry state. Render success enables submit; expiry, error, interactive timeout and unsupported-browser callbacks clear the credential and disable submit. An explicit retry removes/recreates the widget. After every submission attempt, the token is cleared and a new challenge is required. No widget retry loop, Siteverify automatic retry or automatic form resubmission is introduced.

The browser holds the credential in a ref until submission, adds it only to the POST body, then clears both form payload collections. No hidden token input, URL token, local/session storage, analytics, logging or persistent identity is introduced. A retry uses the same application idempotency key and a fresh token. Both handlers delete the credential before application validation/hash/transaction calls. Successful prior verification never exempts a later request. JSON remains explicitly unsupported; switching encoding or route cannot bypass protection.

Order: bounded URL/Host/Origin and unconditional production closure; fixed request shape and declared-size checks; two-request process guard; separately committed global PostgreSQL admission; bounded body/envelope parsing; required real verifier; strict application validation and PDF inspection; authoritative domain transaction; Drive allocation/storage/finalization; eligible background work. Failure at verification creates no application, file, idempotency, audit or notification record and invokes no Drive storage. The admission counter deliberately remains consumed.

The server-only native-fetch verifier retains one official HTTPS request, redirect refusal, a three-second overall deadline, 8 KiB response cap, strict UTF-8/JSON/field checks, exact action and hostname, nonfuture timestamp younger than five minutes, and no remoteip, candidate data or retries. Production additionally refuses an origin other than the owner-approved `https://pyramiddesigns.co`. Official test keys and missing/invalid configuration fail closed. There is no injected runtime fake verifier or production acceptance switch.

Both owner-configured keys and both non-secret settings were PRESENT with valid shapes; origin/provider matched the approved values. No key is printed or committed. Only the public site key crosses into the browser for the local form; it is necessarily visible to that widget. The secret never becomes a prop, route response, HTML value, source map or client asset. The production form is closed, so neither key is rendered there.

Cloudflare processes browser/device/network challenge information. The application sends only the secret and transient token to Siteverify, never name, email, answers, CV, application ID, Drive information or Resend information. No cdata is provided. This is a technical boundary, not legal/privacy approval; browser processing still requires approved notices and processor review.

## CSP and accessibility

The dynamic Join document receives a fresh server nonce in its request/response CSP; an incoming nonce/CSP header is overwritten. Script sources are self, that nonce and the exact Cloudflare origin. Frame source is the exact Cloudflare origin; connect-src is self. Object/base/frame-ancestor restrictions, same-origin form action, no-referrer, nosniff, DENY framing, private/no-store and camera/microphone/geolocation denial are applied. No broad https source, wildcard or unsafe-eval is added. Style unsafe-inline is limited to presentation compatibility. Staff proxy/session behavior is unchanged. Other public documents retain baseline headers; global header/HSTS and deployed client-navigation acceptance remain operations gates.

Real Chromium application acceptance uses an intercepted official script URL supplying a clearly synthetic provider fixture, with intercepted submission responses. It tests 320, 390, 768, 1280 and 1440 px, both application types, URL-encoded and multipart modes; keyboard traversal/Enter, no application focus trap, labelled challenge region, polite status, error association and summary focus, pending field/button state, expiry/error/timeout/unsupported behavior, script failure/retry, stable idempotency with fresh tokens, ambiguous network retry, success focus, reduced-motion preference and no horizontal overflow. Screenshots were inspected at all five widths. This verifies application semantics, not a screen-reader certification or the external widget's successful production interaction. The provider's real checkbox/iframe and assistive-technology behavior still require authorized-host acceptance.

## Live Turnstile and trusted ingress

**LIVE TURNSTILE VERIFICATION: BLOCKED_BY_PRODUCTION_HOSTNAME.** The real official script was loaded in an isolated loopback browser against disposable synthetic context. The provider returned `110200`; the application showed an unavailable/retry state and kept submit disabled. No legitimate valid token was produced, no live Siteverify token acceptance is claimed, and no token was saved. No hostname restriction, DNS entry, production deployment or provider configuration was changed. Success, invalid/expired/reused tokens and provider/network failures are proven offline only.

**TRUSTED CLIENT IP: DEFERRED. PER-IP RATE LIMIT: DEFERRED.** Repository Hostinger compatibility evidence establishes runtime/upload/protected endpoint behavior, not spoof resistance. Current official pages supply no adequate ingress contract. No platform settings were changed and forwarding headers remain ignored for public admission identity.

Later owner-authorized rehearsal must identify all ingress/CDN/origin routes; establish source-peer trust and bypass protection; record forwarding replacement/append behavior; compare missing/forged/duplicate/multi-hop markers, IPv4/IPv6/mapped forms and custom/temporary domains across restart/redeploy. Observing plausible forwarded values is insufficient. If deployment is needed, it is a separate gate, never a reason to deploy during this phase.

## Resource and regression boundaries

The global budget remains 20 attempts/60 seconds, one saturating row; the actual 45-session race still admits exactly 20. Challenge failures and same-key retries consume it. Focused verification admits at most 20 Siteverify calls for a 25-request challenge-failure flood. Two held verification calls occupy both process slots and a third request produces no new provider call. DB admission failure denies mutation.

Structured body remains 24 KiB; multipart 5 MiB + 32 KiB; PDF 5 MiB; headers 1,024 bytes/part; boundary 70 characters; fields aggregate 24 KiB; 50 answers and existing string/PDF stream/decompression bounds are preserved. The sole envelope count change is 66 to 67 raw parts for the token. There are still at most two multipart parsers and three DB pool connections; connection wait remains ten seconds, admission statement deadline three seconds. No DB connection is held across Siteverify.

Offline file tests retain quarantine, SHA-256 binding, no premature clearance, no public links or original filename persistence, staff attachment authorization and retention/tombstone invariants. Offline notification tests retain confirmation only at eligible SUBMITTED, none at SECURITY_PENDING, fixed Resend sender/reply-to, no tracking and unchanged ambiguity/idempotency behavior. Staff verified claims, ACTIVE mapping, current database roles, AAL2, operation/target/state checks, default deny, BOLA and no-store boundaries remain unchanged.

**LIVE RESEND EMAILS SENT DURING 2I-E: 0. LIVE GOOGLE MUTATIONS DURING 2I-E: 0.** Existing C2B evidence is provider-reported Delivered and owner-confirmed Hostinger mailbox receipt, initially in Spam/Junk. That is successful provider delivery with an ongoing deliverability concern; no reputation/DMARC optimization completion is claimed and DNS is unchanged.

## Phase 2I operational assessment

**IMPLEMENTATION COMPLETE:** durable worker admission/leases/fencing/reconciliation/retention foundation; transactional notification eligibility/outbox; Resend adapter; global admission and request bounds; mandatory browser/server challenge integration. Local/offline verification does not activate any feature in production.

**PRODUCTION VERIFIED:** no new production runtime is verified in this phase. Existing Phase 2A protected diagnostic/runtime evidence and C2B accepted/delivered email evidence remain historical evidence, with their original limits. Live Turnstile acceptance is blocked by the hostname.

**DEFERRED TO DEPLOYMENT/OPERATIONS:** trusted ingress/per-IP decision, real-domain Turnstile/UI/CSP acceptance, actual scheduler, manual malware-review rehearsal, conditional Google deletion/reconciliation, least-privilege production database role and hosted grants, environment isolation, staff MFA/recovery, privacy/consent/retention approval, monitoring/backup/restore ownership, deliverability monitoring, content approval and explicit activation/deployment authorization.

Scheduler endpoint readiness is implemented: protected empty-body POST `/api/internal/worker`, no arbitrary query commands, server-only CRON_SECRET of at least 32 characters, authentication before DB work, private/no-store, aggregate responses. Candidate initial cadence is once per minute subject to actual Hostinger facility/plan acceptance; it is not configured or observed. Durable admission permits at most one invocation per 60 seconds, five sequential claims/five recoveries/five due-retention enqueues, a 20-second work deadline and bounded retries from 60 seconds to one hour. Later acceptance must prove authenticated scheduling, secret-safe configuration/logs, repeated invocation/restarts, overlap, skipped ticks, backlog/dead-job alerts, provider timeout and reconciliation outcomes against isolated synthetic resources.

Manual Microsoft Defender review remains the provisional SOP. A named trained reviewer must rehearse quarantine-only retrieval without preview, exact-file explicit scan, scanner evidence and hash-bound outcome, failure/escalation and controlled local deletion. No automated malware-scanning claim or manufactured clearance is made.

Google retention/reconciliation code is ready for a separately authorized bounded rehearsal of exact identity/digest/private permissions, ETag conditional delete, changed-version precondition failure, 404 confirmation, provider success/DB failure recovery, lease fencing and permission drift. Repair the historical live harness's transaction-count assumptions before using it. No live deletion, retention run or permission change was attempted; production erasure remains gated.

## Verification and review

All database regression runs use new named loopback-only PostgreSQL 17 databases in the dedicated `pyramid-2ie-postgres` container on port 55440. Configured development/production URLs are not used. Each replay applies nine migrations from zero: 28/28 RLS, zero public policies, zero prohibited anon/authenticated effective grants, zero callable public application functions. No schema, migration, dependency or lockfile change is needed.

Final check evidence:

- Phase 2B/2C/2D/2E/2F: all five existing success markers passed, each on its own fresh replay database.
- Phase 2G: 83 checks; Phase 2H: 291 checks, rollback verified.
- Phase 2I-B worker: 431 checks; Phase 2I-C1: 230 checks; Phase 2I-C2B: 250 checks, live_requests=0.
- Phase 2I-D: 422 checks, actual 45-session admission race admitted exactly 20.
- Phase 2I-E server: 648 checks; both types/encodings, failure matrix, duplicate tokens, idempotency, no mutation before verification, token-free persistence, bounded amplification/concurrency and production closure.
- Phase 2I-E browser: 216 URL-encoded + 216 multipart checks (432 total), five widths and two contexts per encoding, actual Chromium with offline provider/submission interception.
- Nine-migration replay: 28/28 RLS, zero policies, prohibited effective grants and callable public application functions, on every regression database.
- Prisma validation, lint, typecheck, production webpack build and post-build typecheck: passed. Full dependency audit: zero vulnerabilities.
- Production smoke: 32 checks, including production closure despite synthetic flags, worker authentication/admission, anonymous staff/file denial, generated nonce CSP and security headers. Client files inspected: 92.
- Sensitive-material/build scan: 353 files including 20 intended source files; zero findings. Both raw build output (before sanitizing saved logs) and generated server/client output checked against real private configuration and noncredential canaries. Staged scan is repeated before commit.
- Canonical logo SHA-256: `2c5d2042ef020aa7ad37ff92e6fd9c3407ef305102ee49da3b6900ff99ffe60c`; baseline and LF-normalized working copy match. All nine migration SQL files, migration lock, schema and dependency lock are unchanged.
- Primary and historical C2B branch/HEAD/status/index preservation passed; all ten originally changed/untracked primary file hashes match.

Test fixtures live under scripts or browser interception; none are imported into runtime. Build verification substitutes noncredential canaries and blanks unrelated private provider settings. Secret scanning compares real configured values internally without printing them and checks intended source, generated server/client output and logs. Synthetic fixture tokens are reviewed separately from real credentials. The only package manifest change adds the Phase 2I-E test command; it adds no package.

The final diff review covers challenge/encoding/alternate-path bypass, ordering, stale tokens, exact hostname/action, no runtime fake modes, CSP scope, secret/token persistence, idempotency independence, provider amplification, parser bounds, accessibility and all protected staff/file/email/database boundaries. The initial real-browser pass exposed an async-script ready() incompatibility and the fixture test initially queried React expiry state before its commit; both were corrected and rerun. No gate failure is suppressed.

Release uses only reviewed Phase 2I-E paths and the exact message `feat: integrate candidate intake challenge`. Remote main must still equal the starting SHA before a normal fast-forward push. Release SHA is recorded in the accompanying final report, not fabricated inside its own commit.

## Closure and production gates

GLOBAL RATE LIMIT: READY. TRUSTED CLIENT IP: DEFERRED. PER-IP RATE LIMIT: DEFERRED.

CHALLENGE IMPLEMENTATION: READY. REQUEST BOUNDS: READY. MULTIPART ABUSE CONTROL: READY. PUBLIC INTAKE IMPLEMENTATION: READY.

LIVE TURNSTILE VERIFICATION: BLOCKED_BY_PRODUCTION_HOSTNAME. PRODUCTION PUBLIC INTAKE: NOT READY.

MIGRATION REQUIRED: NO. NEW DEPENDENCY REQUIRED: NO. REAL CANDIDATE INTAKE: NO. PRODUCTION DEPLOYMENT: NO.

Phase 2I implementation closure is distinct from production readiness. Scheduler, real-domain provider acceptance, trusted ingress/resource acceptance, Google/manual-review rehearsal and the privacy/security/operations approvals above remain explicit gates. No staff email, webhook, production migration, frontend/Neon reconciliation, housekeeping or next phase is included. Stop after this release.

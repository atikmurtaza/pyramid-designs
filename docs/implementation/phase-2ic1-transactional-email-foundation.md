# Phase 2I-C1: Transactional email foundation

## Scope and baseline

Owner-approved C1 implementation began on clean `main`, empty staging, with local HEAD, origin/main and actual remote main equal to `a11c38161c7b66a38a7b37007f2c3807bd41584b`, `feat: add durable background worker foundation`. Phase 2I-B was closed. Nine migrations were present; configured migration status confirms migration nine remains unapplied. No configured database migration was executed.

MIGRATION REQUIRED: NO

NEW DEPENDENCY REQUIRED: NO

Next.js 16.3.3, React 19.2.8, pg runtime, Prisma schema/migration tooling, RLS, AAL2 staff authorization, application/file evidence and worker ownership/admission remain intact. No provider, SMTP, SDK, real email, staff email, abuse controls, scheduler setup, deployment, DNS or real intake activation is included.

## Submission and outbox

`createFileFreeApplication` enqueues in its successful SUBMITTED transaction. `recordCandidateFileReview` enqueues only after valid CLEAN review and the SECURITY_PENDING -> SUBMITTED update, in that same transaction. CandidateFile review, Application transition, status history, notification job and scheduling evidence commit or roll back together. No provider call occurs inside either transaction. UPLOAD_PENDING, quarantine and SECURITY_PENDING do not enqueue confirmation. Hiring transitions never enqueue email. Both job applications and talent-network submissions have their own completed-submission event/template.

BackgroundJob remains the sole outbox. Payload is exactly `{ event, templateVersion: 1, identity }`, alongside the exact Application FK. There is no recipient, name, body, answer, CV, file/Drive identity, URL, custom subject/template or header in the payload. The handler reloads only application type, technical state, email, deletion timestamps and expiry eligibility from the exact authoritative Application. It never reconstructs erased contact from audit/history.

## Identity and templates

The deterministic SHA-256 logical identity includes `pyramid-designs`, an explicit allowlisted NODE_ENV, canonical exact application UUID, JOB_APPLICATION_SUBMITTED or TALENT_NETWORK_SUBMITTED, and the candidate recipient slot. Missing/unknown environment fails closed; environment drift invalidates a queued identity. Dedupe excludes raw email and template version. Same application/idempotency retry reuses one job. A conflicting payload/version under the same semantic identity fails rather than producing a second confirmation. Template upgrades require preserving already scheduled version semantics, not minting a new notification identity. C1 does not backfill old submissions.

Append-only NOTIFICATION_SCHEDULED evidence seals the exact job and payload. Execution requires one matching seal. This prevents job-payload poisoning from changing an exact subject to another application with a newly recomputed hash. Application/job row locks and the existing unique dedupe constraint provide transaction concurrency control; no process-local mutex or new table is used.

The two compile-time templates have distinct fixed subjects and factual plain text. Neither interpolates candidate input, so there is no raw HTML, contextual escaping surface or candidate-controlled header. There is no HTML variant, attachment, tracking, public/staff/Drive link, internal workflow/security terminology, private identifier, response-time promise or marketing claim. No canonical email origin is invented.

The recipient validator permits a single ASCII dot-atom mailbox with bounded local/domain/label lengths. CR/LF, whitespace/control characters, display names, quoted/list syntax, commas/semicolons, multiple @ signs, empty labels and malformed label boundaries are rejected. Internationalized/quoted mailbox forms are deliberately unsupported in this application-level validator. Validation failure terminalizes safely without logging contact.

## Adapter and acceptance

The small server-only contract receives one validated recipient, allowlisted event, pinned version, stable identity, fixed rendered subject/plain text and AbortSignal. It exposes no sender, Reply-To, arbitrary header, Message-ID override, URL or attachment API. No real provider configuration or network email implementation exists.

The normal worker always selects the explicit unavailable adapter. An offline adapter can only be explicitly injected in NODE_ENV=test. The synthetic implementation lives under scripts, is not imported by production source, requires example.invalid test recipients, checks cancellation before and after asynchronous inspection, and makes no network calls or persistent envelope writes. Isolated tests may inspect envelopes in memory. Synthetic acceptance is recorded as NOTIFICATION_SYNTHETIC_ACCEPTED and does not claim real email was sent.

`emailReadiness` always reports UNAVAILABLE_UNTIL_PHASE_2IC2 through safe worker evidence. A production-scoped job still becomes DEAD/CONFIGURATION even if synthetic injection is attempted. No production flag silently turns on test delivery. Public production intake remains closed independently.

## Retry, ambiguity and recovery

Before sending, a short bounded transaction checks current lease/token, immutable scheduling seal, unresolved prior intent, current application state and recipient. It locks the application and records NOTIFICATION_SEND_INTENT with only the attempt number. The transaction commits before provider invocation. The worker deadline and AbortSignal bound waiting; ownership is revalidated under the job lock before acknowledgement.

| Adapter evidence or failure | Queue behavior |
| --- | --- |
| Established ACCEPTED | SUCCEEDED and synthetic acceptance audit atomically; never means inbox delivery/read/open/click |
| Connect/DNS failure established before transmission | Adapter may return RETRYABLE_FAILURE only when acceptance is definitely excluded |
| Rate limit or 5xx with established non-acceptance | RETRYABLE_FAILURE/RATE_LIMIT -> existing exponential TRANSIENT retry; 60 seconds through one hour, five default attempts, at most ten |
| Definite invalid recipient/rejection | DEAD/EMAIL_RECIPIENT |
| Authentication failure | DEAD/EMAIL_AUTH; no rapid retry storm |
| Missing adapter/configuration | DEAD/CONFIGURATION; no pretend acceptance |
| Unsupported template/payload/version | DEAD/PAYLOAD through fixed dispatcher |
| Timeout, disconnect, unknown outcome or throw after possible transmission | DEAD/EMAIL_AMBIGUOUS; unresolved intent prevents automatic resend |
| Crash before durable send intent | Lease recovery may retry safely |
| Crash after committed intent but before call | Conservatively ambiguous; manual reconciliation, even if no message was actually sent |
| Acceptance followed by DB acknowledgement failure | Intent survives rollback; reclaimed worker does not call adapter again and terminalizes as ambiguous |
| Failure while recording definitive non-acceptance | Without committed resolution, intent remains ambiguous; no inferred safe retry |
| Final attempt crash | Existing exhausted-job sweep terminalizes; unresolved intent still requires manual reconciliation |

HTTP 429/5xx and generic transport exceptions alone do not establish non-acceptance. The future concrete adapter must map actual provider guarantees to this contract. A definite non-acceptance audit resolution commits with retry/terminal state; transient retries need this minimal evidence to distinguish a safe retry from an unresolved external effect. Acceptance and terminal evidence commit with acknowledgement. Raw provider responses/errors/receipts are not persisted in C1.

C2 must verify provider idempotency or acceptance reconciliation against the stable identity, define safe receipt handling, sender/configuration/authentication and transport cancellation, and conduct owner-authorized live synthetic verification. No automatic reopening, resend or manual-reconciliation endpoint is implemented. Operators must not simply reset attempts, remove intent evidence or reopen ambiguous jobs. Those operational actions need reviewed acceptance/non-acceptance evidence; already committed applications remain committed regardless of later notification failure.

## Retention and suppression

Deleted/tombstoned, erased-contact, due, non-SUBMITTED or withdrawn applications are terminally suppressed; invalid exact event identity is rejected. Suppression is DEAD/EMAIL_SUPPRESSED with safe terminal audit, not SUCCEEDED or another email. An unresolved earlier effect remains ambiguous even if the current application would otherwise be suppressible.

Send admission and retention responsibility serialize on the Application lock. If retention starts first, a later send observes due/deletion state and suppresses. If a live send claim exists, retention safely retries before starting erasure. If an unsuccessful job has unresolved intent, retention requires manual reconciliation rather than overtaking a possible late effect. This can delay erasure; C2 operational reconciliation is a real production gate. A successful bounded send can finish before retention subsequently erases the application. No database connection is held during the adapter call.

Cancellation cannot undo a message already transmitted. The adapter must prevent transmission from beginning after cancellation and check after asynchronous preparation. Promise.race only bounds the worker wait. Independent review identified this distinction in the test adapter; the adapter recheck, unresolved-intent retention guard and timeout/retention regression now cover it.

## Security and observability

Threat review covered header/recipient/template/HTML/URL injection, SSRF, duplicate/ambiguous effects, retry storms, authentication/configuration failures, crashes/stale claims, identity collisions, payload poisoning, BOLA, erased-contact recovery, log leakage and real/test/environment confusion. Exact-ID parameterized SQL, server-owned templates, sealed allowlisted payload, stable identity, append-only intent, fenced finalization and unavailable production adapter address these boundaries. The database owner can fabricate evidence and remains outside the application trust boundary; dedicated production least privilege is still required.

Safe evidence is job/opaque invocation identity, event/version, attempt, readiness and fixed classifications. It excludes recipient/name/body, answers, file/Drive data, claim tokens, provider response bodies and credentials. Audit actions are NOTIFICATION_SCHEDULED, NOTIFICATION_SEND_INTENT, NOTIFICATION_NOT_ACCEPTED, NOTIFICATION_SYNTHETIC_ACCEPTED and NOTIFICATION_TERMINAL, plus existing worker evidence. Existing audit target indexes and bounded worker transactions are reused. No schema/RLS/grant/function change was made.

## Verification and release

Use `npm run test:phase2ic1` with an explicit loopback `PHASE2IB_TEST_DATABASE_URL` pointing to a disposable `phase2ib_...` database that has all nine migrations. The suite commits synthetic fixtures, never resets a configured database, and cannot run against an arbitrary URL. `scripts/replay-phase-2ib-migrations.mjs` requires an empty disposable database and validates clean replay plus effective grants.

Observed local verification, 2026-09-07/08:

| Gate | Evidence |
| --- | --- |
| Fresh disposable replay | 9/9 migrations; 28/28 public tables with RLS; zero policies, prohibited effective grants and public callable application functions |
| Configured migration status | Eight applied; ninth migration pending as expected; none applied by C1 |
| Phase 2B / 2C / 2D / 2E / 2F | Existing success markers passed |
| Phase 2G / 2H | 83 / 291 checks passed |
| Phase 2I-B | 431 checks passed |
| Phase 2I-C1 | 230 checks, including atomic rollback, concurrent submission/review, all adapter outcomes, acknowledgement rollback, stale/reclaimed claims, production isolation and retention/cancellation races |
| Lint / typecheck / production build / post-build typecheck | Passed; affected gates rerun after review correction |
| Production dependency audit | Zero vulnerabilities; no dependency/lockfile change |
| Local production smoke | 31 checks; 92 client files scanned; intake closed; no real provider selected |
| Canonical master logo SHA-256 | Unchanged: 2C5D2042EF020AA7AD37FF92E6FD9C3407EF305102EE49DA3B6900FF99FFE60C |

Independent review and the final sensitive-material/staged snapshot gates precede the authorized commit `feat: add transactional email foundation` and normal origin/main push. The release response records the actual SHA and synchronization, without claiming deployment or live-provider acceptance.

## Remaining gates and hard stop

C2 provider choice/configuration/concrete adapter/live synthetic verification, provider idempotency/reconciliation and cancellation evidence; optional staff email decision; Phase 2I-D abuse controls and trusted proxy/IP; Hostinger scheduler/resource acceptance; Google conditional deletion/reconciliation rehearsal; malware/manual review rehearsal; legal/privacy/retention treatment and operational handling of ambiguous notification versus erasure; least-privilege DB identity; production Auth/MFA/recovery; real-device/browser acceptance; diagnostic/synthetic cleanup; separately approved production migrations, deployment and real intake activation remain pending. None of those phases is started by C1.

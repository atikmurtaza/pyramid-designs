# Phase 2G — Public Candidate Intake Foundation

**Date:** 2026-09-06 (implementation and initial closure checks: 2026-09-05)
**Status:** Controlled closure review passed. Real intake remains closed; no deployment or later phase is authorized.

## Baseline and approved decision

Closure pre-flight verified `main`, `HEAD`, `origin/main` and actual remote `main` at `03b64b90df1bffec8672a8424900838e8127a6e2`, exactly 14 intended unstaged files, no unrelated changes, empty staging and ignored `.env.local`.

The owner approved ADR 0015 after confirming that the previous unconditional cleared-file requirement prevented staff-readable file-free submissions. Pending-only intake was explicitly rejected. Migration `20260905000000_phase_2g_file_free_submission` adds non-null immutable `Application.requiresClearedFile` with default `true`. Implementation recorded a before/after count proving existing records retained the old requirement; closure rechecked the legacy fixture and column default. All seven already-applied migration checksums matched before correction.

Closure reproduced three blockers and made only their required corrections:

- With immediate constraints, the BEFORE file trigger checked the old file state and allowed an uncleared attachment to remain on a submitted application. Additive migration `20260905010000_phase_2g_immediate_file_evidence` moves the same trigger to AFTER. It retains parent-row serialization and works with immediate, deferred and mixed constraint timing. The original migration and migration ledger history are not rewritten. This necessary correction expands the closure package to **15 files and eight migrations**.
- Request-controlled loopback values could enable synthetic intake under production. Activation now also requires explicit `NODE_ENV=development` or `test`; production, missing and unknown environments fail closed before database access, even if synthetic mode is inherited.
- Fresh browser testing found that animation-frame focus could run before React committed the success panel. Error/success focus now runs in an effect after its corresponding state is rendered.

The database still requires accepted consent for `SUBMITTED`. A file-required application needs an active cleared file; every active attached file must be validated, quarantined and cleared even when the flag is false. Existing immutable, hash-bound review evidence remains mandatory. Candidate-file writes update/lock the parent application, queue its deferred evidence constraint and prevent file reparenting. Final transaction state is checked, including attachments and clearance downgrades after submission. Staff authorization is unchanged.

## Public boundary and activation

`POST /api/applications` is the sole public mutation. There is no application GET, ID lookup, candidate search or candidate account. Runtime remains server-only `pg`; Prisma remains schema/migration tooling.

The boundary is closed by default. Controlled review requires `NODE_ENV=development` or `test`, `PUBLIC_INTAKE_MODE=synthetic`, a loopback request origin/host, names beginning `Synthetic ` and emails at `example.invalid`. Production remains closed even with the synthetic flag and loopback headers. It does not provide a production activation switch. Only authoritative synthetic jobs/departments and existing synthetic policy versions are selectable. No environment file or production configuration was changed.

The sequence is exact origin/Host validation, global database abuse budget, content-type/body bounds, strict field validation, authoritative policy/job/question resolution, retry protection, transactional application/evidence creation, and a fixed minimized response. Forwarded host/IP headers are ignored. A narrow same-port loopback alias check accommodates Next's local `127.0.0.1`/`localhost` canonicalization. Deployment origin/proxy behavior must be verified separately.

URL-encoded bodies are capped at 24 KiB with a five-second read deadline. Unknown/duplicate fields, duplicate questions, malformed UUIDs/enums/emails, control characters, overlong strings, non-HTTPS or credential-bearing URLs, internal status/file/retention/staff/timestamp fields, and all file payloads are rejected. Public errors contain fixed messages and safe form-field names; SQL/provider errors and database references are not returned. Candidate content is neither logged nor placed in URLs or browser storage.

## Types, authoritative evidence and transaction

`JOB_APPLICATION` binds to the exact authoritative published job. Draft, scheduled, closed, archived, future, expired, nonexistent and otherwise unavailable targets are denied. The job and question rows are locked; options are checked against their exact question. A wall-clock eligibility check runs again after evidence writes and before completion, preventing stale deadline acceptance while waiting or writing.

`TALENT_NETWORK` has no job linkage and supports the four existing engagement types. Department must be active. Portfolio introductions require a portfolio or professional URL. Each Application owns an independent contact snapshot; matching email/phone does not merge records.

Existing `SHORT_TEXT`, `LONG_TEXT`, `SELECT` and `YES_NO` questions remain authoritative. Required answers, optional omissions, boolean false, single-select cardinality, foreign options/questions and text lengths are enforced. No multi-choice domain type is invented. Option UUIDs resolve to existing label snapshots. Candidate text remains untrusted and staff React rendering remains escaped.

The existing application repository is reused. Its legacy entry point preserves file-required pending behavior; the server-only Phase 2G entry point sets the immutable flag false. One transaction creates Application, answers, exact consent evidence, retention reference/expiry, initial immutable `NEW` hiring history and idempotency completion, then commits `SUBMITTED`. A failure at any required step rolls back all evidence. No email or background job is queued.

Consent must explicitly accept the displayed active synthetic definition; it is not prechecked and no marketing permission is bundled. The existing synthetic processing/retention fixtures exercise both forms only as test policy. Approved purpose-specific job/talent consent and retention mapping, final wording and legal review remain mandatory before real intake; the synthetic retention category is not a production policy decision.

## Retry and abuse semantics

Existing `APPLICATION_SUBMISSION` idempotency records bind a hashed random UUID to the normalized request hash for 24 hours. Completed retries return the same internal result with a fixed public success; changed payloads, expired keys and unresolved records fail safely. Completed retries are resolved before current job eligibility, so closing a job does not turn a previously accepted retry into another application. Concurrent attempts serialize through the existing unique reservation/row locks. There is no contact-based identity matching.

The existing `RateLimitBucket` table holds one rolling global bucket: 20 attempts per minute, counter capped at 21. Expiry resets on the next request, so no scheduler or unbounded bucket accumulation is introduced. The key hashes a fixed scope, contains no candidate identifiers and ignores unverified IP headers. Limiter writes have a three-second statement deadline and commit separately from domain writes; failed validation still consumes budget. Application transactions have eight-second statement and three-second lock deadlines. Database failure returns a generic retry response.

This conservative global budget can be exhausted by one caller and creates hot-row contention. Trusted Hostinger IP extraction and layered production abuse protection remain release gates; no production-grade IP identity is claimed. Turnstile remains deferred.

## UI and verification evidence

The existing Join layout, tokens and canonical logo are preserved. Unsupported prototype fields were reconciled with schema fields, city/experience are correctly required, authoritative role questions and synthetic consent are displayed, and the browser-local file/demo-success paths were removed. Careers presentation remains unchanged; prototype slugs do not silently fall back to a talent submission. Join exposes authoritative synthetic role links and a talent form during controlled local review.

Forms provide labels, required/optional markers, native validation, server errors associated with controls, focused error/success panels, pending text, disabled fieldsets/button and a synchronous double-submit guard. Idempotency keys remain in component memory across uncertain retries. Success comes only from the completed server response and states explicitly that no file was submitted. The native form method is POST, so hydration failure cannot place fields in a URL; without JavaScript the missing idempotency identifier fails safely. Role/consent context changes remount the form to clear old success/error/retry state.

`npm run test:phase2g` exercises valid job/talent submissions, all talent engagement types, optional omissions, required/optional typed answers, malformed/private/ineligible input, internal-field injection, foreign questions/options, missing consent, stale eligibility, same-key retries/conflicts, rollback faults, migration/file-evidence invariants, unchanged staff-read authorization, origin/body/response controls, rate exhaustion/recovery and RLS/grants. Tests use real PostgreSQL constraints with savepoints/rollback and verify unchanged persistent domain counts. A separate two-session test checks duplicate blocking and recovery after an aborted first attempt without leaving records.

Implementation browser verification covered populated talent and job forms at 320, 390, 768, 1280 and 1440 px: no horizontal overflow, labels present and measured input/select/button targets at least 44 px. Keyboard tabbing showed a visible 2 px focus outline. A server URL error was associated with the control via `aria-describedby`/`aria-invalid` and focused its summary. Successful synthetic submission showed disabled pending controls and focused truthful success. Rapid duplicate submission produced one POST; context navigation cleared the previous success panel. This is recorded Chromium evidence, not real-device acceptance. The earlier production-mode synthetic success is superseded by the closure correction: production now always rejects intake.

Fresh closure browser checks on September 6 repeated both forms at all five widths: no horizontal overflow, unlabelled controls, file inputs or framework error overlay. HTTP portfolio input produced an associated server error and focused summary. Two immediate submissions produced one POST with disabled pending controls and truthful success. After the focus correction, a real synthetic job submission focused its success panel with a visible 3 px outline. Both new browser submissions were confined to the disposable database, subsequently removed.

Full closure regression passed after the final focus correction on September 6: Prisma validation and eight-migration status; Phase 2B–2G; lint; typecheck; production build; post-build typecheck; production dependency audit (zero vulnerabilities); whitespace checks. The corrected Phase 2G suite passed on both development and disposable replay databases (`PHASE_2G_PUBLIC_INTAKE_OK checks=83 rollback=verified`), including immediate attachment/downgrade and production/unknown-environment rejection cases. All 28 public tables, including the migration ledger, retain RLS; zero public policies and zero effective `anon`/`authenticated` CRUD privileges were verified.

Rebuilt production smoke passed 16 checks with `PUBLIC_INTAKE_MODE=synthetic` deliberately inherited: home, careers, Join and staff entry returned 200; Join showed closed intake; submission returned 403 with and without forwarded headers; signed-out staff applications exposed only the authentication boundary; development/internal auth routes returned 404; application GET returned 405 and ID lookup 404. The compatibility database probe retained GET 405 / unauthenticated POST 401. All smoke evidence is local and does not establish deployment acceptance.

## Clean migration replay and concurrency

Docker Desktop started successfully on retry. An isolated `postgres:17-alpine` container used a fresh tmpfs database, loopback-only port 55437, no existing volumes and no production credentials. Empty `anon`/`authenticated` role placeholders supplied the platform roles referenced by migrations. Prisma applied migrations 1–7 from zero followed by corrective migration 8; all succeeded. Existing synthetic seed tooling and the full Phase 2G invariant suite passed against that database. The configured development database was never reset; only additive migration 8 was applied there, and all eight installed checksums matched their files.

Separate disposable two-session checks verified a committed same-key duplicate returns the same application with one consent/history set, and that concurrent uncleared attachment/submission is rejected at READ COMMITTED and REPEATABLE READ. The final invalid-submitted-file count was zero. The persistent regression also verifies recovery after an aborted first attempt with complete rollback. The disposable container and its tmpfs data were removed after browser checks; its absence was verified. Existing unrelated Docker containers were not modified.

## Synthetic data decision and rendering review

Both earlier browser records were inspected: one talent record and one job record, with explicit synthetic names, `example.invalid` emails, synthetic city/experience, null phone/free text and only a reserved-domain portfolio URL. Each has one consent and one initial history row; neither has a file. No real personal data was found. They remain because no existing candidate cleanup mechanism can delete their append-only consent/history evidence safely. No immutability trigger was disabled, and no ambiguous or pre-existing record was deleted. New closure browser writes use the disposable database.

Candidate contact values are rendered as React text in the unchanged staff detail page. Answers and profile URLs are not currently rendered there as navigable links or HTML. Public URLs require HTTPS without embedded credentials; no candidate HTML/script sink or browser database-write path was introduced. Required answer validation remains server-authoritative, backed by database row-shape, consent/file and immutable-evidence constraints; the database is not claimed to independently reproduce every public form validation rule.

## Deferred gates and scope

Production activation and purpose-specific approved legal/policy content; trusted Hostinger proxy/origin/IP behavior; least-privilege runtime database privileges; production Auth and authenticated browser acceptance; real-device review; synthetic/diagnostic cleanup; target-platform migration acceptance; deployment and production migration approval remain gates. Clean local PostgreSQL replay is obtained and does not replace target-platform acceptance. The canonical logo SHA-256 remains `2C5D2042EF020AA7AD37FF92E6FD9C3407EF305102EE49DA3B6900FF99FFE60C`.

Phase 2H binary/CV handling, Drive, malware/quarantine workflows, SMTP, Turnstile, production workers/schedulers, deployment, DNS, credentials and real candidate intake have not started. CandidateFile/FileSecurityReview rows in verification are rollback-only metadata fixtures, not an upload, scanner, quarantine workflow or evidence of any real cleared file.

The owner authorized a normal scoped commit and push only after blocking closure gates pass. This authorization does not extend to a later phase or production changes.

## Diff review

The exact 15-file Phase 2G package was reviewed for correctness, whitespace and sensitive material. No credentials, secret values, cookies, sessions, TOTP values, private keys, database URLs, environment files, real personal data, payload logs or generated artifacts are included. Synthetic adversarial fixtures remain test inputs. Final production smoke passed again after the focus correction; local test servers are stopped and ports 3107, 3108 and 55437 have no listeners. `next-env.d.ts` is restored to its baseline by the final production build. Temporary replay/browser/regression artifacts remain ignored and excluded from the commit. Commit/push is conditional on an identical staged snapshot and a clean staged scan.

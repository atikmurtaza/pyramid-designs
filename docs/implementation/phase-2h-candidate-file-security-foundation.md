# Phase 2H candidate-file security and Google Drive foundation

Date: 2026-09-07. Status: **implementation and closure verification passed**. This record accompanies the authorized release `feat: add candidate file security foundation`. Commit and remote synchronization are verified separately in the release report.

Phase closure is not production readiness. Real candidate intake remains closed; deployment and Phase 2I remain unauthorized.

## Starting baseline and package

Work started on `main` at `f0e57655b321203e9777b69ebe7ececef5decd2c`. Local HEAD, `origin/main`, and actual remote main matched at each owner-gate resumption. The original package had 11 modified files, nine untracked files, and no staged files. Eight existing migrations were current. `.env.local` was ignored, untracked, and unstaged.

The final package has 23 files: the original 20 plus three verification helpers. Modified files:

- `.env.example`
- `package.json`
- `scripts/verify-phase-2c-authorization.mjs`
- `scripts/verify-phase-2g-public-intake.mjs`
- `src/app/api/applications/route.ts`
- `src/app/join/join.css`
- `src/app/join/page.tsx`
- `src/components/join/JoinFormPrototype.tsx`
- `src/lib/server/auth/authorization.ts`
- `src/lib/server/public-intake.ts`
- `src/lib/server/repositories/applications.ts`

Added files:

- This implementation record
- `scripts/phase-2h-synthetic-pdf.mjs`
- `scripts/verify-phase-2h-candidate-files.mjs`
- `scripts/verify-phase-2h-google-adapter.mjs`
- `scripts/verify-phase-2h-live-drive.mjs`
- `src/lib/server/candidate-file-policy.ts`
- `src/lib/server/candidate-files.ts`
- `src/lib/server/google-drive.ts`
- `src/app/api/staff/candidate-files/[id]/download/route.ts`
- `src/app/api/staff/candidate-files/[id]/quarantine/route.ts`
- `src/app/api/staff/candidate-files/[id]/review/route.ts`
- `src/app/api/staff/candidate-files/[id]/review/initiate/route.ts`

No dependency, historical migration, branding asset, deployment configuration, SMTP, Turnstile, or worker/scheduler implementation changed. The development server's temporary `next-env.d.ts` change was regenerated back to baseline by the production build.

## Architecture, migration, and filename decision

Migration required: **NO**. New ADR required: **NO**. The rejected `CandidateFile.displayFilename` proposal was never implemented. Existing `CandidateFile`, immutable `FileSecurityReview`, submission constraints, audit/history, and reconciliation jobs express this phase without schema changes. Runtime access remains parameterized `pg`; Prisma remains schema/migration tooling.

Browser filenames are untrusted and transient, used only for validation and React-escaped selected-file feedback. No original or sanitized name, fakepath, candidate name, or email becomes the storage name. Drive naming uses a server-generated UUID PDF name. Staff attachments use only `candidate-cv.pdf` or `candidate-cv-quarantine.pdf`.

## PDF and request boundary

One non-empty PDF, at most 5 MiB, is permitted. Transient extension, advisory browser MIME, PDF signature, basic object/catalog/page/xref/EOF structure, stream boundaries, and detectable active content are checked. Unsupported or chained stream filters fail closed. Supported Flate forms, including a single-filter array and escaped filter name, undergo bounded decompression and active-content checks. The supported structural subset requires direct stream lengths and bounded dictionaries; it does not promise acceptance of every valid PDF encoding.

Multipart bodies are bounded to the file limit plus 32 KiB, ten seconds, bounded field/part counts, and two concurrent parsers per process. Stream inspection bounds dictionary traversal, stream count, and aggregate decoded bytes. These checks reject obvious malformed/active documents and resource attacks; **they are not malware scanning**.

Origin and controlled loopback synthetic-intake authorization precede body parsing. Structured application authority and server-owned file-required semantics reuse Phase 2G. The existing global database intake budget remains distinct from a verified production client-IP limit.

## Upload and reconciliation

The actual request handler validates the PDF and hashes its exact bytes. Before external storage, a committed transaction creates/reuses the file-required synthetic application, reserves one active `CandidateFile` with a preallocated Drive identity and UUID filename, records size/SHA-256 and `UPLOAD_PENDING`, and queues `CANDIDATE_FILE_STORAGE_RECONCILE`.

After private storage and retrieval verification, a transaction checks locked file/application state and expected update counts, changes the file to `QUARANTINED`, the application to `SECURITY_PENDING`, and the reconciliation job to `SUCCEEDED`. Upload never produces `CLEAN`, `CLEARED`, or `SUBMITTED`.

Repeated/concurrent requests with the same key and digest reuse one application, file, and storage identity. Changed content under that key is rejected. Storage failure leaves committed pending metadata and a queued reconciliation job. Storage success followed by database-finalization failure leaves the same durable responsibility; retry recovers against the preallocated identity without replacing content or creating a second active object. Scheduled reconciliation execution remains deferred.

## Google configuration and live root gate

All four private variables were PRESENT: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, and `GOOGLE_DRIVE_ROOT_ID`. Their values are excluded from reports, fixtures, source, browser responses, and logs.

The owner corrected an initially malformed root setting, enabled Drive API for the OAuth client's project, and provisioned the dedicated root through that same application. Each failed owner gate stopped before upload. The final configured root passed the actual adapter: OAuth HTTP 200, exact `drive.file` scope, root metadata HTTP 200, folder type, untrashed state, and a single user-owner permission. Its intended application-controlled purpose is owner-confirmed. Verification did not select a replacement root.

The adapter uses server-only confidential refresh-token authentication and native fetch. Missing configuration, empty tokens, excessive/unexpected scope, authentication failure, invalid metadata, non-owner sharing, pagination, or mismatched content fail closed. No runtime-selectable fake provider, Google redirect, or browser credential exists.

## Newly verified live evidence

`scripts/verify-phase-2h-live-drive.mjs` requires explicit `--live`, test mode, and the exact dedicated loopback disposable database. It exercises the real request handler, committed domain transactions, and actual Google adapter. Its storage wrapper tracks test-owned objects or injects explicitly bounded failures; runtime production code is not replaced.

The final live run passed **246 checks**: confidential OAuth, private root/object permissions, opaque identity under the exact root, multipart upload, private candidate response, exact byte/SHA-256 retrieval, quarantine/submission denial, concurrent retry, stale digest rejection, synthetic review, staff download, retention, authorization, content/version changes, failure recovery, filename privacy, and cleanup.

Two complete live runs created three objects each; **all six were deleted and deletion verified**. Each run covered ordinary upload, storage-failure recovery, and database-failure-after-storage recovery. No unrelated Drive object or folder was modified. Adapter deletion verifies the configured parent; an offline outside-root case verifies that no DELETE request is sent. Live cleanup verified exact synthetic content and root ownership before deletion, confirmed successful DELETE and unavailable subsequent retrieval, and checked idempotent deletion.

## Synthetic review and staff authorization

Before review, normal download and required-file submission were denied. Test evidence matched the exact file, immutable application association, and current SHA-256. The actual review domain boundary checked ACTIVE staff, exact subject mapping, PostgreSQL roles, AAL2, current file/application state, and retention. Immutable, idempotent review evidence updates file/application projections atomically with checked row counts.

The live test used ephemeral synthetic signatures verified by the installed Supabase `getClaims` implementation, followed by the real session/profile resolver and database-backed file authorization. Invalid signatures were denied. Test keys were accepted only by a separate test client; the application's provider configuration was not altered. This proves cryptographic claim verification and the domain chain, not a hosted Supabase login/MFA/browser-cookie acceptance rehearsal.

Synthetic CLEAN input was marked `SYNTHETIC TEST ONLY - NO MALWARE SCAN` and confined to the disposable database. It proves the transition/evidence contract; **no malware scan or real malware clearance is claimed**. No production mock scanner was introduced. The manual Microsoft Defender SOP remains provisional and requires trained-operator operational rehearsal.

Authorized hiring-role/AAL2 retrieval passed after exact evidence. AUDITOR, wrong role, AAL1, signed-out, wrong subject, disabled staff, revoked roles, unknown/malformed IDs, application IDs supplied as file IDs, quarantine/rejection, expired retention, changed content, and stale file versions were denied. The existing database constraint rejects file reassignment to another application. Final retrieval authorization locks current staff and existing role grants through the transaction, rechecks locked file/application state after storage retrieval, and records safe audit evidence before returning bytes.

Downloads are forced PDF attachments with neutral filenames, `private, no-store`, `nosniff`, and `default-src 'none'; sandbox`. No original filename, candidate identity, Drive URL/ID, token, or credential appears in download headers or candidate responses. SQL and provider failures become bounded generic errors.

## Security corrections during closure

1. Replaced the stream-dictionary regex that repeatedly searched an 8 KiB window at attacker-controlled opening delimiters. A 100 KB adversarial PDF took approximately 0.76 seconds before correction. Bounded traversal passes a one-million-character regression within a two-second ceiling.
2. Added inspection of supported Flate filter forms and fail-closed handling of unsupported/chained filters, malformed compression, excessive output, and compressed active content. Added aggregate decoding and stream-count bounds.
3. Held staff and role-row share locks through final authorized file transactions so revocation/status changes cannot invalidate a decision while it waits for file locks. Added during-retrieval revocation coverage.
4. Rejected empty OAuth tokens, non-exact `drive.file` grants, and zero-byte adapter writes. Added offline hostile-provider, sharing, parent-boundary, stale-permission, timeout, and bounded-body cases.
5. Isolated missing-configuration tests with temporary process-only overrides, including production mode, restoring owner configuration afterward. Shared the runtime-generated valid synthetic PDF helper, including its font resource. No binary fixture or credential was added.

Final source/diff review covered upload bounds, MIME/filename confusion, compressed content, BOLA, privilege/state checks, stale evidence, retries, storage ownership, logs, and fail-closed production behavior. No remaining blocking Phase 2H defect, schema requirement, or new architecture decision was identified.

## Submission invariants and database evidence

Fresh regression covers required-file applications with no file, quarantine, rejection, or exact cleared evidence; file-free/no-file behavior; rejection of active uncleared attachments on submitted file-free applications; clearance downgrade; and changed-content evidence reuse. Phase 2G semantics remain intact.

The configured development database was freshly checked: **28/28 public tables retain RLS, zero public policies, zero prohibited effective anon CRUD, and zero prohibited effective authenticated CRUD**. Eight migrations remain current. All eight unchanged migrations also replayed successfully in the dedicated disposable PostgreSQL instance with synthetic role scaffolding. Migration metadata hardening and production runtime identity remain operational concerns distinct from application-schema replay.

The disposable database held six live-test application/file records and two explicitly synthetic review records across the two runs. After Drive cleanup and focused tests, that exact test container and its volumes were removed. No immutable-evidence guard was bypassed and no destructive cleanup SQL was used. No live-test candidate/file evidence was written to the owner's configured database; full regression used established synthetic seed/rollback mechanisms there. Existing historical synthetic/diagnostic data remains subject to launch cleanup.

## Accessibility and responsive verification

Fresh Chromium/Edge QA covered 320, 390, 768, 1280, and 1440 px without horizontal overflow. The labelled PDF input measured 46 px high. Long filenames wrapped; keyboard order moved from introduction to PDF input and consent; focus had a visible 2 px outline. Pending state disabled all five fieldsets and submit, set `aria-busy`, and announced quarantine processing. A CV error focused the summary, set `aria-invalid`, and associated its message; success focused truthful quarantine feedback. No framework page error occurred.

Affected-region axe 4.10.3 reported **zero violations and 26 passed rules**. One contrast rule remained incomplete for the empty textarea and consent legend; the empty field was not treated as a text-contrast failure, and the legend was visually inspected. UI responses were intercepted for deterministic state inspection; actual upload/domain/Drive behavior was verified separately by the live handler test. Real-device acceptance remains deferred. Phase 1 was not redesigned.

## Complete final verification

After corrections and affected focused/live rechecks, the full sequence ran once and passed:

- `npm run prisma:validate`
- `npx prisma migrate status` — eight current migrations
- `npm run test:phase2b` — `PHASE_2B_DOMAIN_OK`
- `npm run test:phase2c` — `PHASE_2C_AUTHORIZATION_OK`
- `npm run test:phase2d` — `PHASE_2D_STAFF_READS_OK`
- `npm run test:phase2e` — `PHASE_2E_STAFF_PORTAL_OK`
- `npm run test:phase2f` — `PHASE_2F_STAFF_MUTATIONS_OK`
- `npm run test:phase2g` — **`PHASE_2G_PUBLIC_INTAKE_OK checks=83 rollback=verified`**
- `npm run test:phase2h` — **`PHASE_2H_CANDIDATE_FILES_OK checks=290 rollback=verified`**
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- post-build `npm run typecheck`
- `npm audit --omit=dev` — **zero vulnerabilities**
- `git diff --check`

Phase 2B-2H scripts use their pinned Node.js 22 runtime. New full verification supersedes inherited pre-closure counts of 83/73 and the previous 20-check smoke. The final live run passed 246 checks. Production smoke passed **24 checks**, including closed intake even with synthetic mode configured, rejected multipart/forwarded-host attempts, public home, signed-out staff, unavailable diagnostics, no public candidate lookup, and anonymous file/review denial. Protected responses remain private/no-store. All **91 client build files** and tested responses were scanned for the four private Google values without a match.

The canonical logo remains unchanged at `public/brand/approved/pyramid-designs-master.svg`, SHA-256 **`2C5D2042EF020AA7AD37FF92E6FD9C3407EF305102EE49DA3B6900FF99FFE60C`**.

## Sensitive material and release boundary

Exact configured-value scans and sensitive-pattern/source review cover the intended package and staged release. No Google credential/root value, live token, authorization code, database connection value, real personal data, real CV, environment file, private-key material, or generated build output belongs in the package. An unchanged Phase 2G negative test contains synthetic URL userinfo at `example.invalid`; it is deliberate invalid input, not an actual credential. Temporary browser tooling, screenshots, logs, results, and the downloaded axe package remain ignored and outside the release.

Only the 23 Phase 2H files are eligible for staging. Release uses one new commit with the exact authorized message and a normal push to `origin/main`; no history rewrite, force push, deployment, DNS change, or next phase is authorized. Final staged checks and local/remote SHA synchronization are recorded in the release report.

## Remaining production gates

Operational Microsoft Defender/manual-review rehearsal; real-device acceptance; Hostinger deployed-runtime, resource, and trusted proxy/IP acceptance; least-privilege production runtime database identity; production Supabase Auth login/MFA/recovery/ownership acceptance; final legal/privacy and retention content; diagnostic/synthetic cleanup before launch; production credential provisioning; production migration approval; approved reconciliation/retention operations; real candidate intake activation; and deployment approval remain open where applicable.

Phase 2I, SMTP/email, Turnstile, worker/scheduler implementation, production migrations, production deployment, DNS, and real candidate intake have not started under this release.

REAL CANDIDATE INTAKE: NO
PRODUCTION DEPLOYMENT: NO
NEXT PHASE HAS NOT STARTED.

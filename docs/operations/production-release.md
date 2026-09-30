# Production release, migration and rollback runbook

**B4A foundation, 2026-09-30. This is a later operator procedure, not permission to execute production actions.** B4 prepares repository infrastructure; B3 upstream disclosure/remediation remains blocked. [Environment contract](production-environment.md), [B4A owner register](../implementation/phase-b4a-production-infrastructure-readiness.md#owner-action-register), [recovery policy](backup-and-restore.md).

## Release manifest and permissions

Record exact reviewed Git SHA, dependency/B3 status, owner/operator/deputy, target host/Neon/Auth identifiers, PostgreSQL and Node/tool versions, migration hashes/history, public build configuration, private secret version references (never values), false/true gates, backup references/checksum/expiry, test evidence and maintenance/cutover/rollback decisions in a restricted operations ledger.

No provider auto-deploy may track this preparation branch. Pushing B4 must not start a host deployment. Operator verifies exact immutable SHA and final integrated release independently. No merge/main update or dependency waiver is implied. All gates stay false unless separately approved. PUBLIC_INTAKE_MODE and development/test/obsolete secrets are absent from runtime.

## Hostinger managed Web App contract

Current official managed deployment guidance reviewed September 30 supports Node 22.x; its documented framework/build/environment controls are general guidance, not proof of this account's plan, scheduler, forwarding, persistence or rollback facility. Production target remains the approved Hostinger managed Web App; Node **22.x**, repository tooling verified **22.22.0**. Do not switch Node/version/provider/cost without review.

- Install: npm ci with the committed lockfile and approved dependency release. Install dev tooling for the build; never install Prisma Client. Do not upgrade/downgrade packages during deployment.
- Build: npm run build (next build --webpack). Do not load production DB/provider credentials into the build. Inject only approved public Auth build values; private configuration is runtime-only. Capture redacted exit status/logs and exact artifact/SHA.
- Start: npm run start (next start) using NODE_ENV=production and the provider-managed PORT/listener; no dev server, local mode, PM2 assumption or custom persistent daemon.
- Inject runtime DATABASE_URL only for a reviewed restricted Neon login. DIRECT_URL is absent. Use protected hPanel secret storage and independently verified per-environment manifests; no .env committed/uploaded with an artifact.
- Canonical traffic origin is https://pyramiddesigns.co. Before staff/intake traffic, verify TLS, canonical Host preservation, forwarding header stripping/replacement and rejection of direct-origin/alternate hosts. DNS/domain attachment changes require later explicit approval.
- Filesystem is treated as disposable across deployment/restart; no candidate bytes, durable queue, credentials, SQLite, backup or evidence storage in the Web App checkout. Next cache may be ephemeral. Confirm actual ISR/cache/process behavior on a closed synthetic rehearsal; do not assume shared disk or sticky sessions.
- Restart must replace/drain old processes and pools; three pg connections per application process plus bounded readiness connections must fit a documented Neon/host budget. Rehearse same-release restart and false gates surviving it.
- Logs expose fixed operational status and opaque counts only. Record access control, retention, export/redaction behavior, UTC clock and alert owner; never dump headers, environment, cookies, candidate fields or caught provider payloads.
- Health: public GET /api/health/live; protected GET /api/health/ready with bearer CRON_SECRET. Ready is connectivity only. A protected operator separately checks migrations/security/Auth/provider/activation acceptance. Do not send bearer in URL/query or emit response-body traces.
- Rollback must redeploy a retained compatible immutable SHA plus the reviewed environment manifest; hPanel's exact rollback/artifact retention mechanism is an owner verification item. Never assume a UI rollback also restores env/database/external effects.

## Read-only Neon preflight

Use a private operator environment, never credentials in command arguments or output. Select the independently approved endpoint/project/database/region; verify provider PostgreSQL major **17**, TLS/server identity and direct/pooler endpoints. Console-created privileged owners must never become runtime logins. Operational prerequisites are restricted NOLOGIN pyramid_runtime and pyramid_reference_locker plus separate operator and runtime logins, and denied browser anon/authenticated roles as required by the migrations. Role creation/ownership/grants need later operator approval; B4 does not apply them live.

The runtime login can SET only pyramid_runtime and owns no database/schema/table/function; no superuser/BYPASSRLS/role/database creation/replication, schema CREATE, TEMP, ledger access, broad function privileges or immutable-evidence updates/deletes. Locking role owns only the fixed reference-lock function, with fixed search_path and no mutable reference write authority.

After final migration acceptance, with credentials injected privately:

```text
node scripts/production-database-readiness.mjs --runtime --neon-read-only --expected-endpoint=<independently approved endpoint id>
node scripts/production-database-readiness.mjs --operator --neon-read-only --expected-endpoint=<same approved endpoint id>
```

Runtime uses DATABASE_URL; operator uses DIRECT_URL. Both are catalog/identity SELECT-only, read-only sessions with bounded waits. Never connect a local fixture harness to Neon. Operator check expects the full finished 11-migration history; a pending/fresh target intentionally fails. For pre-migration inventory use installed Prisma migrate status with DIRECT_URL under the freeze, preserve pending/failed/checksum evidence safely, and approve the expected target state explicitly. Do not interpret missing ledger as readiness.

Catalog fingerprint drift fails closed. A new PostgreSQL major or approved provider extension/schema difference needs a reviewed contract update generated from a fresh synthetic replay, never silently rebaselined from production. Endpoint/role/connection strings are kept out of published evidence. CLI credential absence is not a reason to paste secrets into chat.

## Production migration procedure — later approval required

1. **Freeze:** approved maintenance window; keep public intake/staff writers and scheduler/worker closed; drain in-flight bounded requests and leases; record outstanding external send/upload/deletion intents. Stop on concurrent writers or moved release SHA.
2. **Backup:** verified encrypted pre-change logical export plus actual provider snapshot/history-window reference as available. Confirm separate restore target, recovery deputy/key access and latest passed restore/security evidence. No backup/restore proof means stop.
3. **Identity/history:** confirm approved direct target, PostgreSQL/tool version, operator session and actual applied/pending/failed migration names/checksums. Independently validate restricted runtime credentials without using them for DDL. For already deployed portions, compare current catalog to their approved baseline. Never print DSNs/passwords.
4. **Compatibility:** replay the exact ordered 11-migration set on a disposable PG17 database; schema/RLS/column/function/default-grant checks and actual restricted-runtime smoke; confirm current data satisfies constraints and bounded DDL locks during freeze. Record backward app compatibility for each migration; not all failures can be reversed.
5. **Deploy migration:** use installed/pinned Prisma 6 only, command npm run prisma:migrate:deploy, with **DIRECT_URL** injected in the operator environment. DATABASE_URL is absent/validation placeholder, not the DDL credential. Capture exit status separately, record redacted standard output/error, and stop on nonzero. Do not run migrate reset, db push, seed, force resolve, historical edits or down SQL.
6. **Postflight:** npm exec -- prisma migrate status using same DIRECT_URL; finished migration checksum/history check; operator catalog/RLS/default/permission verification; separate runtime read-only checker. Then closed app health/public/staff-role/worker synthetic smoke as separately authorised, audit immutability/append checks and policy/provider gates. Keep live providers false until approved.
7. **Failure:** stop and keep traffic/writers closed. Preserve fixed/error-code/ledger/backup/release evidence without raw secrets/candidate data. Determine committed versus rolled-back DDL and any external effects; choose reviewed forward fix or isolated restore with owner/deputy. Do not blindly retry an ambiguous migration or modify history. Application rollback only if the prior app is compatible with the resulting schema.
8. **Completion:** verified encrypted post-change backup, signed postflight record, restore/rollback compatibility and owner decision. Deployment/activation remain separate events.

Prisma migrate deploy does not prove schema/security drift absence. The catalog contract and restricted-runtime checks are required. All **11 historical migrations remain byte-for-byte unchanged** in B4. CompatibilityProbe removal is a future reviewed forward migration, never a history rewrite.

## Worker and scheduler

POST /api/internal/worker uses bearer CRON_SECRET; no query/body/transfer-encoding commands, bounded empty-stream read and no unauthenticated work. PRODUCTION_WORKER_ENABLED defaults false both at HTTP/direct entry. The existing durable admission record is cross-process, uses a 60-second admission/lease, claims at most five jobs within a 20-second invocation and uses bounded statement/lock/external/finalisation waits. Claim tokens exclude stale completion; dedupe/retry/backoff/manual ambiguous-email handling remain authoritative. At-least-once execution is not exactly-once external delivery.

No appropriate **managed Web App scheduler** is confirmed. General hPanel cron availability or an old authenticated cron-probe is not proof of secret-safe scheduled POST. Owner must confirm actual plan controls: UTC schedule, HTTPS POST/header facility, protected bearer storage, no public job output, 30-second caller timeout, no provider-followed redirects, invocation/lease overlap, missed-run/restart recovery and alerts. Proposed low-volume cadence is once per minute, subject to measured host/Neon budget and owner approval. Database admission safely skips overlaps; do not use process memory as scheduler authority.

If hPanel cannot do protected POST safely, stop scheduling and seek an owner-approved external scheduler/architecture, without adding dependency/service/cost in B4. Do not put curl bearer in a visible cron command or query secret. No production scheduler is activated. Closed rehearsal may invoke the authenticated readiness endpoint; worker stays 404. Separately approved disposable test-mode suites exercise leases/recovery without live effects.

Track authenticated invocation status, due count/oldest due age, DEAD/retry/ambiguous class, leases, admission and last-completion time with a named alert owner. Existing worker counts are safe; do not export candidate/contact/provider payloads. Scheduling retention stays code-closed: job six-month lifecycle anchor, talent/employment policy and B2 note erasure require later reviewed implementation. Do not assume scheduler activation implements publication scheduling or production erasure.

## Closed deployment rehearsal — later approval required

Preconditions: exact integrated approved release (B3 gate closed), protected nonpublic host/access controls, authorised synthetic Neon/disposable target, false capability gates, production mode, no production candidate data/provider credentials, and explicit owner deployment approval. noindex/robots does not provide access isolation. Do not copy production secrets/data into preview.

Test exact SHA/install/build/start, Hostinger->Neon restricted TLS/pool/process identity, liveness, authenticated readiness (only boolean), temporary diagnostics 404, staff/files 404 with no provider call, worker POST 404 even with configured bearer, Join no active form and submissions denied despite synthetic mode/forged headers. Verify public zero-vacancy/empty synthetic-filtered content, cache/security headers, restart/redeploy/env retention, log redaction and private filesystem assumptions. Use independently confirmed service/version/role counts only; never expose topology publicly.

Host/proxy rehearsal must attempt forged Host, Origin, X-Forwarded-Host/proto chains, alternate/direct origin, cross-origin Server Actions and staff API requests. Verify TLS/redirect/canonical routing before any flags open. Once separately authorised for staff acceptance, test HTTPS cookies (Secure/Lax) across password/AAL1/TOTP/AAL2/refresh/logout/expired/stale sessions, role/BOLA/disabled local mapping and no-cache response isolation. MFA browser cookies remain readable under current SSR architecture; accept that design explicitly or approve a separate server-MFA redesign. Do not silently set HttpOnly and break the current client flow.

Record PASS/FAIL at the exact environment/SHA. B4 local production build is not a Hostinger rehearsal. Production Auth, provider I/O, scheduler, PITR and physical-device acceptance are not inferred.

## Rollback and incidents

First close staff/worker/email/Drive flags, stop scheduler and traffic/intake access as applicable, allow bounded in-flight work to settle, and retain logs/ledger/intents. Code-closed candidate intake should stay closed under every environment; accidental intake is an incident, not a reason to clear records. Preserve minimum evidence, revoke unintended access, inventory affected records/effects securely, involve named legal/operations owner and establish approved remediation.

- **App/health failure:** retain failing SHA/evidence; restore last reviewed schema-compatible artifact/config manifest, restart pools, verify liveness/ready/closed paths, then await activation decision. Never fall back to dev mode or diagnostics.
- **Environment/secret failure:** restore approved config *version references*, verify endpoint/role and build/runtime split; restart; rotate compromised credentials. Do not blindly reuse revoked tokens or combine staging/production manifests.
- **Migration incompatibility:** freeze writers; no down migration assumption. Forward-fix or isolated verified restore; reconcile writes/deletions/send intents after backup and external effects before an approved reconnect. Never rewind Neon by switching to an old Supabase application snapshot.
- **Auth failure:** close staff immediately; local disable/revoke current roles and provider sessions as authorised; valid JWTs may persist, so local mapping remains authority. Recovery requires named identity-proof/deputy procedure, not chat passwords/TOTP.
- **Provider/email/Drive failure:** close relevant effect/worker gates. Preserve opaque reservations/send-intent/receipt/evidence; no automatic fresh-identity resend, upload or deletion. Reconcile accepted/ambiguous effects manually and verify root/key/account scope before resuming.
- **Worker/scheduler failure:** stop triggers, inspect durable admission/leases/DEAD/backlog; stale claim tokens never permit completion. Recover only through reviewed bounded paths; external timeout is not proof of no effect.
- **Database restore:** isolated target, verified history/catalog/ACL/locking ownership, erasure and external reconciliation, accepted RPO/RTO; operator privately installs new restricted DATABASE_URL, restarts/drains pools and confirms identity. Staff/provider gates remain closed until owner reconnect acceptance.

Record every rollback decision and outcome in the restricted ledger; immutable business/security audit evidence is not edited to match a restored narrative.

## Public primary references

Accessed 2026-09-30, stored as public documentation evidence only; none establishes this account's current configuration:

- Hostinger [managed Node deployment](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/): framework/version/build/environment controls, including 22.x. Scheduler/proxy/persistence acceptance remains unknown.
- Neon [instant restore](https://neon.com/docs/postgres/backup-restore/branch-restore), [history window](https://neon.com/docs/postgres/backup-restore/history-window): recovery is plan/window dependent; no specific account retention/PITR is assumed.
- Supabase [changelog](https://supabase.com/changelog.md), [MFA](https://supabase.com/docs/guides/auth/auth-mfa.md), [SSR advanced guidance](https://supabase.com/docs/guides/auth/server-side/advanced-guide.md): current server verification/cookie/MFA model. Changelog review did not identify an applicable Auth-client breaking change; no library upgrade is made.
- Installed pinned pg/Prisma/Supabase source and official PostgreSQL 17 [pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html), [pg_restore](https://www.postgresql.org/docs/17/app-pgrestore.html) define the replay/restore tool behavior.

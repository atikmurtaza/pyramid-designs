# Phase B4A — production infrastructure readiness

**Date:** 2026-09-30. **Repository foundation: PASS; owner/provider acceptance remains required.** This phase is independent of frozen B3. No deployment, activation, production database operation, production migration, DNS change, live email, Drive mutation, Turnstile request or real candidate record is authorised or performed.

## Baseline and isolation

Remote main and origin/main were verified as 999603ea1a35d55896dfef94841feb015f982ab8. The primary checkout remains feat/frontend-redesign at 108200b3ea981957ba2683a8c050db7adba2ef42 with unrelated dirty files. Local main is older, b6d0460eb1267603f87a5e65b78e7610e43d08fb; it was not changed. B4 starts from the verified committed remote baseline, in C:\Users\atikm\.codex\worktrees\pyramid-b4\Pyramid Designs, branch phase/b4-production-readiness.

B3 at C:\Users\atikm\.codex\worktrees\pyramid-b3\Pyramid Designs was not entered, read for implementation, modified, staged, committed, merged, deleted or cherry-picked. Its upstream-disclosure gate is unchanged. No dependency change, lockfile change, historical migration edit or Prisma Client runtime is introduced. The repository still has **11 migrations**.

Control review covered AGENTS, website-plan production gates, package/lock, Next/Prisma config/schema, all migrations, current environment/Auth/database/worker/provider/diagnostic code, ADRs 0009/0013/0014/0016/0017, Phase A/B1/B2 and the historical 2J audit. No existing Graphify index exists; no rebuild/install was requested or needed. Current implementation and ADRs override older audit provider/count statements.

## Architecture

Hostinger managed Web App on Node 22.x serves the portable Next App Router application. Server-only pg uses the pooled Neon DATABASE_URL with a restricted runtime login. Operator tooling alone gets direct Neon DIRECT_URL. Prisma is schema/migration tooling. Supabase remains Auth; its PostgreSQL is not the application database. Candidate storage remains private Google Drive/exact drive.file, email Resend, abuse controls global PostgreSQL admission plus Turnstile. Initial malware disposition is manual Defender reviewer attestation, not an automated scanner claim.

The environment contract is [production-environment.md](../operations/production-environment.md). Operational deployment, migration, rehearsal and rollback commands are in [production-release.md](../operations/production-release.md). Current Neon recovery supplements historical policy in [backup-and-restore.md](../operations/backup-and-restore.md). [ADR 0018](../architecture/decisions/0018-closed-deployment-and-capability-activation.md) records deployment/activation boundaries.

## Repository changes

- Added exact-production capability switches. STAFF, WORKER, EMAIL and DRIVE default closed; only literal true selects a capability in production. Missing/invalid modes also deny. Configuration is not owner approval.
- Staff proxy paths and server Auth creation deny before provider use while closed. Production Auth project URLs require HTTPS. Server, proxy and existing browser MFA client explicitly set Secure and SameSite=Lax cookies. Browser MFA requires readable cookies under the existing SSR design; no HttpOnly claim is made.
- Worker HTTP trigger and direct runner deny before database admission while closed. Existing leases, dedupe, claim tokens, concurrency exclusion, five-job/20-second invocation bounds and fixed failure/log classifications remain.
- Resend selection/fingerprint/send recheck the email gate; Drive construction and every transport recheck the Drive gate, including OAuth/read/write. Rotating/closing cannot turn credentials alone into activation.
- Production mutation validation requires exact canonical Origin https://pyramiddesigns.co and Host pyramiddesigns.co. Forwarded Host/protocol confer no authority. Nonproduction rejects conflicting forwarding chains. Canonical edge provenance still requires Hostinger verification.
- Public GET /api/health/live returns only {ok:true}, uncached. GET /api/health/ready requires CRON_SECRET and returns only a boolean/status. It uses a separate one-slot, bounded SELECT 1; no candidate read, migration query, outbound-provider health request, topology or trace is exposed. It proves connectivity, not migration/Auth/provider/activation readiness.
- Compatibility server/database/outbound/upload/revalidation and cron-probe routes return 404 in production before secret/provider/database handling, with matching proxy protection. Dev/internal Auth diagnostics remain production-denied.
- Malformed runtime database URLs now raise a fixed error, avoiding URL-input reflection in framework logs.

## Neon checks

scripts/production-database-readiness.mjs never reads .env files, modifies data, executes domain functions, attempts DDL or locks candidate rows. Connections start default_transaction_read_only=on and BEGIN READ ONLY, with bounded connection/query/statement waits. CLI accepts exactly one runtime/operator mode and an explicit local or later Neon read-only target mode. Output is counts/booleans or a fixed failure, never credentials/rows/topology.

Later Neon execution requires privately injected credentials, an independently confirmed expected endpoint, pooled runtime versus nonpooler operator, Neon hostname, verified TLS, PostgreSQL 17 and separate login identity. Runtime checks prohibit owner/superuser/BYPASSRLS/CREATE/TEMP/role escalation/ledger access; only pyramid_runtime is SET-reachable. Capability/locking roles must remain restricted NOLOGIN and cannot create schema/database/temp objects. Browser privileges, effective runtime/locking columns/functions, RLS/policies, relations/columns/types/defaults/constraints/indexes/triggers/function definitions/search paths and default ACLs are checked against the committed independently replayed catalog contract.

Operator mode additionally verifies all 11 finished migration records and their checksums, allowing only LF/CRLF transport equivalence. Missing/pending/failed/divergent history is a failure, not permission to deploy. scripts/production-database-contract.json is a reviewed PostgreSQL-17 snapshot, not generated from a live target. PostgreSQL major/provider extensions differing in public/private schemas fail closed until separately reviewed; it is not a universal cross-version comparator.

The disposable checker rejects deliberate disabled RLS, browser SELECT grant and ledger-checksum corruption. Live Neon compatibility/credentials/plan/version/TLS/role bootstrapping remain **OWNER CONFIG REQUIRED**. No live Neon connection was attempted.

## Migration and recovery

The operator procedure separates preflight freeze/target/version/status/checksum/backup/compatibility/runtime checks; DIRECT_URL-only migrate deploy; exit-status capture; postflight history/catalog/restricted-runtime/application/audit verification; and failure evidence/restore/forward-fix decisions. No reset, down-migration assumption, blind resolve, historical edit or runtime-role deployment is permitted.

A real custom-format pg_dump/pg_restore rehearsal ran on synthetic disposable PostgreSQL 17, with separate runtime identity and restored catalog/evidence/permission validation. Two rehearsed restore prerequisites matter: restore deliberately assigns the locking function back to pyramid_reference_locker using temporary schema CREATE revoked in the same transaction, and revokes database CREATE/TEMP on the fresh target. A dump alone did not preserve these safe runtime assumptions automatically. The final run records duration, artifact bytes/checksum and fixed-status logs in external evidence.

This is logical PostgreSQL recovery evidence, **not Neon provider PITR/retention, live Auth, Drive byte recovery or production RTO acceptance**. Provider plan/window, backup automation/storage/encryption/key access/deputy execution, external reconciliation and business-approved RPO/RTO remain gates.

## Health, routes and diagnostic retirement

No public diagnostic oracle is created. Readiness authenticates before pool creation; wrong/missing bearer, query parameters, missing DB and failed DB return generic false. Monitor traffic needs a provider-approved frequency and protected credentials; one extra bounded readiness connection per request must fit the host/Neon budget.

CompatibilityProbe is still an inert, RLS-protected, runtime-denied table; model/migrations remain unchanged. Current endpoints cannot execute in production. Its later removal requires a reviewed twelfth forward migration, confirming the table has only obsolete synthetic probe records and no external dependencies, then removing the model/helper/local probes together. No DROP migration is created in B4A. Historical verification scripts may continue testing that table on disposable databases.

Production route smoke exercises marketing/work/careers/join, closed staff/files/worker, all temporary diagnostics and authenticated readiness. Public real submission still returns 403 even with synthetic mode/forged forwarding; Join has no active form/file input.

## Auth and providers

Supabase acceptance later requires company project/site/redirect settings, no public staff self-registration, secure HTTPS cookies/cache/refresh/signout, verified claims + ACTIVE StaffUser subject/current roles + AAL2/TOTP, disabled-user denial even with valid JWT, least-role provisioning and named recovery operators. Local getClaims/JWKS checks are not instantaneous provider-wide JWT revocation. Production staff remains NOT READY. Never expose TOTP QR/secrets/codes in evidence.

Drive preserves private app-created root, exactly drive.file, owner-only permissions, PDF <=5 MiB, quarantine, digest-bound review and manual Defender evidence. OAuth replacement cannot blindly repoint existing file metadata. Conditional deletion/reconciliation and reviewer/deputy workflow remain live operational gates; no scope broadening or public permission occurs.

Resend keeps applications@mail.pyramiddesigns.co / Pyramid Designs, fixed Reply-To contact@pyramiddesigns.co, tracking OFF and receiving OFF as provider owner requirements. Sending-only restricted key, verified domain, receipt validation, durable send intent, bounded idempotent retry and ambiguous/manual reconciliation remain. Key/sender/environment changes alter HMAC commitment; no automatic resend with a new identity. No bounce webhook is implemented; a named operator must monitor provider failures/bounces, avoid resending accepted messages, and retain the recorded junk/deliverability concern. Provider receipt is not inbox delivery.

Turnstile keeps exact hostname pyramiddesigns.co/action candidate_intake, three-second timeout, bounded response, action/hostname/freshness/schema checks, fail-closed error handling and no acceptance cache. Real widget/replay/CSP/accessibility acceptance later needs explicit authorisation; no live request occurred.

## Feature gates and staging

| Capability | B4 production posture | Activation requirement |
| --- | --- | --- |
| Public marketing | No traffic/DNS/deployment authorised | Final reviewed release, B3 closed, owner content/legal/performance/physical acceptance, host controls |
| Staff portal | PRODUCTION_STAFF_ENABLED absent/false; 404 and server Auth deny | Auth/Neon/HTTPS/proxy/role/MFA/operator acceptance and explicit owner approval |
| Candidate intake | Code-closed, no activating env flag | Later reviewed real-policy/intake code, global limiter + Turnstile, file/reviewer/email/retention/legal/operational gates |
| Background worker | PRODUCTION_WORKER_ENABLED absent/false; no admission | Queue/provider/recovery/monitoring acceptance and explicit approval |
| Scheduled retention | Code-closed in production | Reviewed lifecycle/policy/note erasure; scheduler + restore/deletion reconciliation acceptance |
| Live email | PRODUCTION_EMAIL_ENABLED absent/false | Sending-domain/provider/receipt/bounce/deliverability acceptance and explicit approval |
| Live Drive traffic/mutation | PRODUCTION_DRIVE_ENABLED absent/false | Exact-scope private-root/conditional-delete/reviewer acceptance and explicit approval |

Deployment places reviewed code/config into a host; activation is a separate recorded owner event for each capability. B3 cannot be waived by deployment, flags, a local pass or this document. Per-IP rate limiting stays deferred for initial launch; it is not added as a launch requirement.

The closed rehearsal procedure is ready in the release runbook. The actual environment/rehearsal is **NOT READY** pending named owner/provider actions, protected nonpublic access, exact target/configuration and later deployment authorisation. It uses only synthetic/disposable data, production NODE_ENV, false gates, no production provider credentials, no scheduled mutations and no automatic deploy/migration. Hostinger account was not opened/mutated.

## Logging, evidence and secret boundary

Runtime logs use fixed error codes and opaque worker IDs/counts/readiness classes. Existing business/security AuditEvent immutability is retained. Candidate contact/answers/CV contents, secrets, cookies, authorization headers, challenge/OAuth tokens, provider payloads and TOTP material are not added to operational logs. Note bodies remain protected domain data, not audit metadata. Framework/edge log redaction, staff access, retention and alert ownership still need host acceptance; pattern scanning is not a forensic guarantee.

Build verification injects synthetic private canaries (no real credentials), checks source/client boundaries via successful server-only build enforcement, scans browser assets for private environment names and scans generated server/client output/logs for canaries and bounded secret/JWT/key patterns. Staged scanning checks exactly the proposed files; private .env files are never loaded. Only public Auth URL/key and deliberately selected public widget identifier may reach browser consumers.

## Verification and release evidence

Evidence directory: C:\Users\atikm\.codex\worktrees\pyramid-b4-evidence. No evidence dump/log/build artifact is committed.

- Fresh PostgreSQL 17: all 11 migrations, Prisma validate/status, zero schema drift; 29 RLS tables, 80 policies, 22 restricted functions.
- B1 restricted permission/evidence suite 2,092 checks; B2 restricted workflow suite 142.
- Twelve historical suites passed, including intake 83, file 291, worker 431, notifications 230, Resend 251, abuse 422, Turnstile 648. No live transport.
- Final local verification completed **2026-10-01 (Europe/London)**: B4 offline capability/origin/health/target rejection **76 checks**; production closed-route smoke **56 checks**; actual synthetic logical dump/restore plus restored B1 restricted permission suite **2,092 checks**; all three injected catalog/security/checksum faults rejected. The final read-only checker passed for separate runtime/operator identities on source and restored databases.
- Lint, typecheck, clean production build and post-build typecheck passed on Node **22.22.0**. The private-canary source/client/generated/log scan passed across **96 client assets**, with no findings. Only checker/tooling/documentation changed after the final application build. Diff and exact staged-boundary checks remain mandatory immediately before commit; their final logs and Git identities are retained in external release evidence.
- B3 dependency security remains UPSTREAM DISCLOSURE BLOCKED; no package/lock change or security-waiver claim. Primary/main/B3 preservation and normal feature-branch push are verified at release closure.

Conditional commit is exactly feat: establish production infrastructure readiness; push only phase/b4-production-readiness. Never merge/update main. No next phase is started.

## Owner action register

Coding may continue before every listed action; activation/deployment at the stated gate may not. Credentials are installed privately, never pasted into chat.

| Gate / provider | Exact owner action | Why required | Credentials needed | Safe verification |
| --- | --- | --- | --- | --- |
| Before closed deployment / release owner | Approve exact integrated SHA after B3 disclosure/remediation closes; protect release branch and control Hostinger trigger | B4 cannot waive B3 or auto-deploy branch pushes | No | Reviewed release/CI/security evidence; no deploy |
| Before closed deployment / Hostinger | Confirm managed Web App subscription, Node 22, build/start/listener/process/restart/log/secret behavior; owner permits protected closed target | Plan/page guidance is not actual subscription proof | Provider login privately | Redacted settings/capability inventory, no mutation in B4 |
| Before closed deployment / Hostinger | Establish network/auth protected nonpublic rehearsal, synthetic-only target, no automatic Git deployment | noindex alone is not access protection | Provider login privately | Anonymous/direct-origin denial plan and later approved probe |
| Before closed deployment / Neon | Select exact company project/region/PG17/endpoint and provision reviewed NOLOGIN roles + separate owner/runtime logins | No target/credential/role assumptions | Yes, private operator/runtime | Approved catalog-only checker with independently confirmed endpoint |
| Before closed deployment / operations | Execute/accept encrypted backup and isolated restore with deputy, monitor/alert/contact plan | Local logical restore is not provider recovery | Private DB/storage/key access | Synthetic restore, checksums, security contract and timed evidence |
| Before closed deployment / operator | Approve maintenance freeze, target/data inventory, migration history/checksum/backup/compatibility and execution window | B4 never runs production migrations | Private DIRECT_URL | Read-only preflight/status; later separate migration authorisation |
| Before staff activation / Supabase | Configure production Site URL/redirect allowlist/registration/recovery/deputy, provision named staff/TOTP privately | No production Auth project/operator acceptance | Provider login; staff credentials outside chat | HTTPS login/AAL1 denial/AAL2/refresh/logout/expired claims; no QR/token output |
| Before staff activation / Neon + Auth operator | Bind subject to ACTIVE StaffUser and least current roles; test local disable/revoke with still-valid JWT | Provider identity alone is insufficient | Private operator access | Protected positive/negative role/BOLA/audit smoke |
| Before staff activation / Hostinger | Prove Host/Origin/proxy provenance, forwarding stripping, direct-origin rejection, HTTPS/Secure/Lax cookies and cache isolation | Canonical checks depend on verified edge routing | Provider access privately | Synthetic forged headers and direct-origin tests; metadata only |
| Before candidate intake / legal owner | Approve actual candidate notices/consents/policies; job lifecycle six-month anchor, talent/employment classes and note-erasure mechanism | Policies and production retention remain unresolved | No | Reviewed versioned policy/code and purpose-specific synthetic replay |
| Before candidate intake / Cloudflare | Configure exact domain/action/widget; approve real-host challenge rehearsal | Offline verifier is not deployed widget acceptance | Secret installed privately | Failure/replay/hostname/action/CSP/accessibility; redact tokens |
| Before candidate intake / Google | Exact drive.file consent, private app-created root, token rotation and conditional-delete reconciliation acceptance | Credential shape is not storage operational proof | OAuth credentials privately | Separately authorised synthetic object/permission/digest/recovery rehearsal |
| Before candidate intake / reviewer owner | Train Defender reviewer/deputy, bind hashes/versions/time/evidence and failure disposition, verify safe quarantine workstation | Manual attestation needs actual operational acceptance | No provider credential in report | Synthetic PDF workflow; no fake clearance or real CV |
| Before candidate intake / Resend | Verify mail domain, sending-only key, fixed identities, tracking/receiving OFF; accept deliverability/junk and bounce monitoring | Receipt is not inbox delivery | Provider login/key privately | Later separately authorised synthetic delivery/receipt/bounce acceptance |
| Before candidate intake / scheduler owner | Prove protected UTC POST invocation/secret storage/timeouts, lease overlap/recovery, monitoring; activate only after explicit release | Managed Web App scheduler capability unproven | CRON_SECRET privately | Closed synthetic HTTP/stale-job/backlog rehearsal |
| Before full production / business/content/legal | Approve true company/content/legal/media, zero-vacancy Careers and legal drafts | Repository must not invent facts or launch legal drafts | No | Owner acceptance on exact release |
| Before full production / release/operations | Complete physical-device/accessibility/performance, incident/recovery/deputy, provider and dependency acceptance; separate DNS/traffic approval | Local tests cannot grant public activation | Provider access privately if required | Signed checklist/exact SHA; explicit activation record |

## Live effects and remaining blockers

PRODUCTION DATABASE OPERATIONS: 0; PRODUCTION MIGRATIONS: 0; PRODUCTION DEPLOYMENTS: 0; LIVE RESEND EMAILS: 0; LIVE GOOGLE DRIVE MUTATIONS: 0; LIVE TURNSTILE REQUESTS: 0; REAL CANDIDATE RECORDS: 0.

B3 disclosure/remediation, live Neon target/permissions/TLS, Hostinger/proxy/scheduler/secret/log acceptance, protected closed target, provider backup/restore/RPO/RTO, production staff Auth, storage/delete/reviewer operations, email deliverability/bounces, real-domain Turnstile, legal/retention/note erasure, content/media, performance/device/owner acceptance and explicit release/activation remain gates. Candidate intake and production erasure remain code-closed. NEXT PHASE: NOT STARTED.

# Phase 2J — Production readiness audit and deployment-gate plan

**Date:** 2026-09-30. **Result:** AUDIT COMPLETE; RELEASE NO-GO. Documentation only. Every proposed action below needs separate phase approval. No recommendation authorizes implementation, deployment, production migration, provider changes, real intake or cleanup.

## 1. Baseline, isolation and evidence authority

Required and verified starting `HEAD`, fetched `origin/main` and actual remote main: `3d4042e7cf3fc7959de8a81d418b8ad526c2b6bd` (`feat: integrate candidate intake challenge`). Audit checkout: `C:\Users\atikm\.codex\worktrees\pyramid-2j\Pyramid Designs`, branch `phase/2j-production-readiness`; initial index and worktree clean. No private environment file was copied, created or read.

Protected primary: `C:\Users\atikm\Projects\Pyramid Designs`, `feat/frontend-redesign`, `108200b3ea981957ba2683a8c050db7adba2ef42`. Only Git metadata was inspected. Its modified/untracked filenames identify unfinished Neon work; their contents were not inspected or incorporated. Historical worktrees remain intact. Main already includes that frontend commit by ancestry, plus later frontend changes. **Frontend branch reconciliation is not a prerequisite for this baseline.** Current owner visual/content acceptance still is.

Evidence is committed code and records at the starting SHA, then fresh local/disposable checks. Historical provider tests establish only their recorded scope. Neither this audit nor green local checks establish live production state.

Evidence index (repository-relative paths, all reviewed):

- `AGENTS.md`, `PYRAMID_DESIGNS_WEBSITE_PLAN.md`, `package.json`, lockfile, `.env.example`, `prisma.config.ts`, `next.config.ts`, schema and all nine migration SQL files.
- `docs/discovery/phase-0b-requirements-matrix.md`, `phase-0-final-gate.md`; `docs/content/production-content-brief.md`; `docs/design/phase-1-static-frontend-audit.md`, `phase-1-final-frontend-gate.md`, `3d-motion-prototype.md` and page prototype records.
- Every ADR `0001`–`0016` in `docs/architecture/decisions/`; `system-architecture.md`, data/state/authorization models; `docs/security/threat-model.md`, `authorization-model.md`.
- Every Phase 2A–2H implementation record; Phase 2I-B, 2I-C1, 2I-C2B, 2I-D and `phase-2ie-operational-verification.md`; `readiness-checklist.md`.
- `docs/operations/backup-and-restore.md`, `candidate-file-security-review.md`.
- `src/lib/server/{database,public-intake,intake-abuse,intake-challenge,candidate-files,candidate-file-policy,google-drive,background-worker,worker-trigger,candidate-notifications,resend-email,staff-reads,staff-mutations,staff-portal}.ts`, auth modules and repositories; public/staff/API routes and public content sources.
- Seed scripts, migration replay, production smoke, challenge/browser/leakage and historical provider-verification scripts.

This document consolidates current gates without rewriting historical evidence. Old Phase 1 descriptions of browser-only Join are superseded by Phase 2G–2I. Old SMTP checklists/provider placeholders are superseded by Resend implementation. Earlier mailbox-unverified statements in ADR 0013/C2B are superseded by later owner receipt evidence recorded in Phase 2I-D/E. Supabase remains committed authority; unmerged Neon notes do not supersede it. Historical Phase 2C cleanup instructions to delete audit rows must yield to current immutable-evidence constraints and a separately approved cleanup design.

## 2. Executive readiness state

```text
PRODUCTION DEPLOYMENT READY: NO
PRODUCTION PUBLIC INTAKE READY: NO
CURRENT COMMITTED MAIN DATABASE PROVIDER: Supabase PostgreSQL
UNMERGED DATABASE ARCHITECTURE WORK DETECTED: YES
PRODUCTION DATABASE DECISION REQUIRED BEFORE DEPLOYMENT: YES
PRODUCTION MIGRATION PLAN: NOT READY
DEDICATED LEAST-PRIVILEGE RUNTIME DB IDENTITY: REQUIRED
BACKUP PLAN: NOT READY
RESTORE REHEARSAL: REQUIRED
PRODUCTION STAFF AUTH: NOT READY
GOOGLE STORAGE IMPLEMENTATION: READY
GOOGLE PRODUCTION OPERATIONS: NOT READY
FILE SECURITY IMPLEMENTATION: READY
MALWARE REVIEW OPERATIONS: NOT READY
EMAIL IMPLEMENTATION: READY
EMAIL PRODUCTION CONFIG: NOT READY
DELIVERABILITY OPERATIONS: NOT READY
TURNSTILE IMPLEMENTATION: READY
TURNSTILE REAL-DOMAIN VERIFICATION: REQUIRED
GLOBAL RATE LIMIT: READY
TRUSTED CLIENT IP: DEFERRED
PER-IP RATE LIMIT: DEFERRED
SCHEDULER IMPLEMENTATION: READY
SCHEDULER LIVE EXECUTION: REQUIRED
TECHNICAL PRIVACY IMPLEMENTATION: READY
LEGAL/POLICY APPROVAL: REQUIRED
LAUNCH CLEANUP PLAN: READY
PUBLIC CONTENT: NOT READY
PHYSICAL DEVICE ACCEPTANCE: REQUIRED
PERFORMANCE IMPLEMENTATION: READY
DEPLOYED PERFORMANCE ACCEPTANCE: REQUIRED
MONITORING PLAN: NOT READY
INCIDENT RESPONSE PLAN: NOT READY
REAL CANDIDATE INTAKE: NO
PRODUCTION DEPLOYMENT: NO
```

READY implementation labels mean the bounded, closed-production foundations are ready. They do **not** mean real-data policy, production intake/retention, final public content, operational tooling or deployment acceptance is complete. Cleanup-plan READY means the checklist exists; no cleanup has been executed. No security defect was identified that requires stopping this documentation audit while production remains closed. The full dependency audit nevertheless fails a release-quality gate (section 20).

## 3. Authoritative architecture and runtime identity

Server-first Next.js modular monolith; Next.js `16.3.3`, React `19.2.8`, Node `>=22`, `pg` `8.23.0`; `next build --webpack`, `next start`. Prisma `6.12.0` defines schema/migrations and is operator tooling, not the request-path ORM. Hostinger managed Node is the approved hosting direction; no Vercel/Redis/SMTP/scanner service is required by current runtime.

ADRs 0011/0014 establish Supabase PostgreSQL plus Supabase Auth. Mumbai is the intended region, not a verified current production-project location. Runtime uses `DATABASE_URL` through Supavisor **session** pooling (port 5432). Controlled migration uses `DIRECT_URL` through direct connectivity or a supported session pooler; transaction pooling is unsuitable for migration execution. Migration credentials must not be installed in normal Hostinger runtime. TLS/server identity, certificate compatibility, endpoint/project and role must be verified without printing connection strings.

`database.ts` uses one pool per process, maximum 3 connections, 10-second idle and connection timeouts, application name `pyramid-designs`. Three is per process, not a platform-wide limit; deployed process count and total pool budget remain unproven.

All 28 public tables have RLS in replay; zero policies and zero prohibited effective `anon`/`authenticated` grants. This is a closed-browser posture, **not proof that a dedicated least-privilege runtime works**. Current owner/admin development access can bypass RLS. A nonowner `NOBYPASSRLS` runtime with grants alone would still be denied by zero policies.

Required separately reviewed runtime-role design:

1. Inventory each request/worker query and dependency. Grant schema USAGE and only table/column SELECT/INSERT/UPDATE/DELETE actually needed by public intake, staff reads/transitions, file reconciliation, notification outbox, rate-limit and approved retention handlers. Distinguish application contact erasure from immutable evidence. UUID defaults do not justify broad sequence grants.
2. Add narrowly scoped runtime RLS policies or another explicitly approved authorization architecture; keep anonymous browser roles closed. Shared server credentials cannot independently prove each end-user role: server authorization remains mandatory. Test with the actual proposed runtime identity, not an owner.
3. Staff/file authorization uses `FOR SHARE` locks on `StaffUser`/`UserRole`; evaluate PostgreSQL's lock-compatible privilege requirements and narrowly bound column permissions/policies. Do not grant broad staff-status/role writes merely to satisfy locking.
4. Review narrowly necessary EXECUTE for trigger dependencies including `check_application_submission_evidence(uuid)` and `completed_retention_evidence(uuid)`, and each function's invoker/definer/search-path behavior. No blanket function access.
5. Prohibit schema/table/role ownership, superuser, BYPASSRLS, role/database creation, replication, grant options, disabling RLS/triggers, DDL, migration-ledger access and update/delete of immutable consent/security/audit/status evidence. Restrict role membership and default privileges, including future objects.
6. Keep owner/migration/backup/recovery authority separate and available only to named operators. Rotation must verify a new runtime login and then revoke the old one, restart pools, check no stale privileged connection, and repeat real-role positive/negative tests. Never rotate by copying production secrets into preview.

Starting operation inventory for that design (not executable grants): SELECT public-content/job/policy and authorization projections; INSERT application/answer/consent/status/security-review/audit evidence; UPDATE only mutable application, file, job, project, worker, idempotency and rate-limit projections; DELETE only expired scoped idempotency entries and application answers in approved erasure. `Project` needs SELECT/INSERT and bounded draft-field UPDATE; `Job` SELECT and bounded lifecycle-close UPDATE; `Department`, `JobQuestion`, `JobQuestionOption`, `ConsentDefinition`, `RetentionPolicy` need authorized selection/locking; `Application` SELECT/INSERT plus named submission/hiring/deletion/contact-erasure columns; `ApplicationAnswer` INSERT and approved erasure DELETE; `CandidateConsent`, `ApplicationStatusEvent`, `FileSecurityReview`, `AuditEvent` evidence INSERT and narrowly necessary SELECT only; `CandidateFile` SELECT/INSERT and named mutable storage/review/deletion/version columns; `BackgroundJob`, `IdempotencyRecord`, `RateLimitBucket` their exact claim/admission/retry/dedupe operations. Staff/role provisioning is operator authority; any server-side local-disable helper gets only separately approved status fields, not role administration. No runtime rights are implied for unused schema tables.

There is an additional locking design conflict: review idempotency reads `FileSecurityReview ... FOR UPDATE`; other read-only policy/authorization rows also use row locks. PostgreSQL locking privilege requirements must be reconciled with the prohibition on mutable evidence. Do not grant evidence UPDATE as an unexplained workaround. A reviewed change to the locking protocol or tightly constrained function boundary may be necessary, followed by actual-role concurrency/immutability/RLS tests. This is a required design/possible CODE gate, not a grants-only configuration task.

Owner must reaffirm Supabase or separately approve a Neon ADR, Auth/database separation, migration/cutover and revised recovery plan. The unmerged work is not approval or a release dependency that can be silently merged.

## 4. Production migrations

Nine migrations, in exact order:

1. `20260902000000_phase_2a_compatibility_probe`
2. `20260903000000_phase_2a_compatibility_probe_security`
3. `20260903220000_phase_2b_production_domain_foundation`
4. `20260903221000_phase_2b_candidate_file_constraint_correction`
5. `20260903222000_phase_2b_evidence_constraints`
6. `20260903223000_phase_2b_application_constraint_completion`
7. `20260905000000_phase_2g_file_free_submission`
8. `20260905010000_phase_2g_immediate_file_evidence`
9. `20260907000000_phase_2ib_completed_retention_tombstones`

Historical configured synthetic development evidence: first eight applied, ninth pending. **No current configured/production ledger was queried.** Fresh isolated replay applies all nine successfully; Prisma migrate status is current there only. Production target/ledger remains unknown.

No unconditional DROP TABLE/TRUNCATE/data DELETE was found. Constraint/trigger drops and replacements, function changes, defaults and retention invariants are still compatibility- and lock-sensitive. Ninth migration does not itself erase real candidates. These are forward migrations, not guaranteed reversible operations.

Before production execution: select exact project/database/region; inventory ledger/checksums and existing data; approve runtime-role/security and diagnostic cleanup changes; build/rehearse the complete final migration set on isolated synthetic infrastructure; validate existing-row compatibility and lock/time budgets; obtain encrypted verified pre-change backup and passed restore evidence; close intake and quiesce worker/writers; record owner/migration operator, exact release SHA, tools and maintenance window. Execute only unapplied migrations in order via controlled `prisma:migrate:deploy`, then validate ledger, constraints, triggers, RLS/effective grants and application behavior under actual runtime role. No synthetic seed script is a production migration step.

On failure, keep intake closed, preserve ledger/errors safely, determine committed versus rolled-back DDL and use a reviewed forward fix. Do not edit applied migration history, force resolution, disable guards or run a blind down migration. Restore only into isolation then reconcile external effects before approved cutover. **PRODUCTION MIGRATION PLAN: NOT READY** until target, role design, final set, backup/rehearsal and execution ownership are approved.

## 5. Backup and restore

Committed policy is provisional manual encrypted logical export: every 24 hours, extra pre/post migration exports, 14 daily plus 3 month-end copies, company-controlled off-site storage separated from recruitment Drive, encryption key separately controlled, technical owner and recovery deputy. Near-24-hour RPO requires business acceptance; actual RTO has not been rehearsed/agreed. Free-tier provider backups/PITR are not assumed. Current Supabase guidance recommends exports/off-site backups for Free; paid capabilities alone would not prove this programme's recovery readiness.

Export completeness must include schema, migration ledger, application/staff roles, consent/retention definitions and immutable evidence, jobs, dedupe and send intents. Record source identifier, version/tool, UTC time, encrypted checksum, expiry and operator without PII. Auth identities/factors/configuration, Hostinger config, Google file bytes, OAuth credentials and provider message history are separate recovery dependencies. Delete expired backup copies through an approved auditable process; approved legal treatment for erased data persisting in older backups is required.

Synthetic restore rehearsal must restore into a separate provider-isolated target, validate checksum/schema/invariants/runtime permissions; recreate synthetic Auth mappings; prove disabled/cross-role/uncleared/deletion-pending denials; recover stale jobs and unresolved send intents; replay approved erasure before staff exposure; compare exact synthetic Drive references/bytes/ownership; prevent duplicate mail and deleted-file resurrection. A DB dump does not restore Drive bytes. Define a policy-approved file recovery/backup approach or explicitly accept irrecoverability after permanent erasure; never resurrect erased candidate files from a recovered database.

Recovery deputy must execute without the primary operator. Record measured restore duration/RTO, export cadence/failure alert, key access and external reconciliation results. Routine rehearsal must never restore real candidate data into development. **BACKUP PLAN: NOT READY; RESTORE REHEARSAL: REQUIRED.**

## 6. Staff Auth, authorization and operating interface

Verified provider claims -> ACTIVE local `StaffUser` -> current database roles -> AAL2 -> operation/target/state authorization is implemented. Default-deny, local disable, CSRF checks, minimized reads and audit records are foundations. Historical owner-created synthetic MFA and disable tests are accepted; they are not real staff production acceptance.

Owner prerequisites: exact company-controlled Supabase production Auth project; named account owner/deputy; environment separation; exact canonical production redirect/allowed origins with preview/localhost excluded; invite-only real staff provision process; least-role mapping and approved access matrix; TOTP enrollment and recovery material outside repository; lost-device/factor proof-of-identity/escalation; disable local profile/revoke roles and provider sessions; break-glass account storage, expiry/review and audited use. A provider sign-out/`getClaims` check does not prove instant global revocation of every issued JWT; test still-valid token denial through the authoritative local disable switch.

Deployed acceptance: login/AAL1 denial/MFA/AAL2; secure HttpOnly/SameSite cookies and HTTPS; safe redirects; session expiry/sign-out/cache; invalid/stale/disabled claims; forbidden role/row/file/mutation; spoofed forwarded Host/proto/Origin and direct-origin attempts. Auth failure must deny access without leaking provider/candidate details.

Current application-detail UI offers contact snapshot and hiring transitions; Phase 2F also supports bounded project draft create/edit and job closure. Full answers/profile review, CV discovery/download and practical security-review operations are absent. Endpoints alone are insufficient for named operators to sustain recruitment. The approved requirements matrix labels managed content/jobs, internal notes and broader staff workflows MVP (`BR-004`, `FR-013`–`FR-016`). They are not silently waived by narrow Phase 2E/F closure: owner must explicitly amend initial launch scope and approve a safe operator procedure, or separately implement them. Candidate-review/file-review usability needed for any recruiting launch remains a CODE/OPERATIONAL gate. A full CMS is required only if the original requirement remains approved; no CMS is built in this audit. **PRODUCTION STAFF AUTH: NOT READY.**

## 7. Google Drive and candidate-file review

Private server-mediated native-fetch OAuth uses exact `https://www.googleapis.com/auth/drive.file`. Dedicated company-owned account/root and owner-only object/root permission checks; opaque UUID filenames, private hashes/IDs and attachment responses; no public Drive links or candidate names in object names. Phase 2H's bounded live authentication/upload/retrieval/cleanup is accepted without rerun.

Remaining operations: confirm exact production account/root/client ownership and deputies, private root and children with no public/shared/group permission; OAuth consent/refresh-token suitability and revocation/rotation; permission-drift alert, outside-root denial and recovery. Rehearse worker strong-ETag/If-Match conditional delete and subsequent 404, stale content/version denial, missing-object reconciliation, process death between provider and DB, retention tombstone completion, and credential/provider outages with isolated synthetic objects. Historical basic cleanup is not evidence of current worker conditional deletion/reconciliation. The legacy live Drive harness has obsolete transaction/worker assumptions; repair and review it in its own approved phase before invocation.

No automatic arbitrary orphan deletion. An authorized inventory must match exact parent/owner/preallocated ID/digest/size and durable DB ledger; unexplained files are held for review. Missing uploads stay pending; do not pretend they succeeded. Retention must resolve outstanding send/storage evidence before irreversible finalization. **GOOGLE STORAGE IMPLEMENTATION: READY; GOOGLE PRODUCTION OPERATIONS: NOT READY.**

Manual Defender SOP is provisional. HIRING_MANAGER/ADMIN begins an authorized quarantine review; named security reviewer uses a company-managed encrypted patched endpoint, approved quarantine outside sync folders, no preview/open before scanning, current Defender engine/signatures and explicit exact-file scan; verifies SHA-256 matches reserved/current bytes; records authenticated actor, tool/version, hash, timestamps and fixed outcome evidence; cleans the temporary copy under approved process. Assign deputy, target review time/backlog capacity, failure escalation and residual-risk acceptance for low-volume launch.

- CLEAN: matching immutable clean evidence clears file, permits file-required application submission and queues one notification.
- REJECTED: file/application remains unavailable to ordinary review; controlled retention/remediation follows policy.
- FAILED: REVIEW_FAILED remains blocked; approved retry/escalation without inventing clean evidence.

Authorization, hash/version/state checks and immutable evidence prevent unprivileged or stale clearance. **They do not prove Defender ran.** The application records a trusted reviewer's attestation; dishonest authorized reviewers/admins/DB owners remain a trust risk. Current structured evidence does not separately capture every signature/exit detail mentioned by the SOP. Approve a practical restricted evidence procedure or a separately reviewed minimal improvement; never assert automated scan authenticity. PDF structural validation is not malware scanning. Rehearse benign, rejected/failed and interrupted cases safely, without arbitrary malware on personal devices. **FILE SECURITY IMPLEMENTATION: READY; MALWARE REVIEW OPERATIONS: NOT READY.**

## 8. Resend and deliverability

Adapter code is ready for current transactional templates. Approved sending domain `mail.pyramiddesigns.co`; From `Pyramid Designs <applications@mail.pyramiddesigns.co>`; fixed Reply-To `contact@pyramiddesigns.co`; sending-only domain-restricted API key. Open/click tracking and Resend receiving are OFF by owner evidence. Domain verification/owner mailbox delivery is established; no new email was sent here. One logical synthetic message and same-key replay produced the same receipt; Resend reported Delivered; owner received it in Hostinger mailbox, initially Spam/Junk.

Messages must remain minimal with no CV attachments, Drive URLs, answers or unnecessary candidate facts. Approve processor/account access, provider retention, purpose and candidate notice. Set approved configuration in Hostinger only after separate authorization and verify names/scope without values. Mailbox receipt does not establish inbox placement or future deliverability. Review actual SPF/DKIM/DMARC alignment, sender reputation, bounce/failure handling and recipient-provider acceptance through a separately authorized bounded rehearsal. Assign mailbox owner and incident deputy.

Durable send intent + stable key/request seal protects duplicates. Ambiguous provider acceptance or crash after send must block blind resend pending receipt reconciliation; unresolved intent can also delay erasure. No attempt reset, new key, intent deletion or automatic replay beyond the provider's supported idempotency window as a workaround. Reconcile receipt/request digest with restricted provider evidence and record approved outcome. Key rotation changes HMAC request sealing; drain/reconcile unresolved work before rotation and explicitly plan old-key replay handling. **EMAIL IMPLEMENTATION: READY; EMAIL PRODUCTION CONFIG: NOT READY; DELIVERABILITY OPERATIONS: NOT READY.**

## 9. Turnstile, ingress and availability

Shared browser widget and mandatory server Siteverify precede candidate validation/provider writes. Expected action `candidate_intake`, exact production hostname `pyramiddesigns.co`, nonce Join CSP with narrow Cloudflare script/frame allowances. Token stays transient, excluded from request hash/persistence/logs/URLs; every retry needs a fresh token with the same application idempotency key. Server has one verification call, 3-second timeout, 8 KiB reply cap, redirect refusal, strict result/action/hostname/freshness checking; no `remoteip`, `cdata` or candidate contents; test keys denied. Official Cloudflare documents single-use tokens expiring after five minutes. Historical local `110200` is a real hostname block, not permission to add localhost.

Later rehearsal needs separate authorization for a real-hostname deployment while real intake remains closed. Current production Join does not render an active challenge; approve a limited challenge-only/synthetic rehearsal design and credentials scope before live testing. Confirm real browser token issuance/Siteverify, action/hostname, CSP, accessibility/errors, expiry/reset/retry, reuse/failure denial and zero secrets/tokens in logs/bundles. Do not enable real candidate acceptance to manufacture this evidence. **TURNSTILE IMPLEMENTATION: READY; TURNSTILE REAL-DOMAIN VERIFICATION: REQUIRED.**

Global durable limit is 20 attempts/60 seconds, one saturating row (21), admission committed separately; 2 concurrent public requests/process; bounded 24 KiB structured data, 5 MiB PDF, multipart file plus 32 KiB, 67 raw parts and field limits. Invalid/challenge-failing attempts still consume admission. This bounds application effects, not unlimited upstream bandwidth, database connection acquisition or malicious consumption of all 20 slots.

Trusted client IP and per-IP limiting remain DEFERRED; forwarding headers are not accepted as identity. Recommended security decision **B: conditional defense-in-depth deferral** for initial low-volume intake only if owner/security reviewer expressly accepts the shared-budget availability risk, proves deployed global limit across processes, real Turnstile, edge/request/resource/timeout controls and monitoring, and records triggers for adding trusted ingress/per-IP. This audit does not waive the earlier gate: until that decision and evidence exist intake is NO-GO. If controls cannot meet availability requirements, choose A and establish verified ingress/per-IP before intake. Cross-process abuse and challenge-provider outage are mandatory acceptance cases.

**Origin/cookie/CSRF proxy trust is mandatory even if per-IP is deferred.** Prove Hostinger forwarding provenance, canonical host/proto, spoof stripping/overwrite and direct-origin protection for staff mutations. Full-site security header/HSTS policy beyond Join/staff/file boundaries still needs code/deployed verification; enforce HTTPS after the approved domain setup, with HSTS scope agreed for affected subdomains.

## 10. Hostinger runtime and scheduler

Already proven historically, on Phase 2A-FR2 `81d3960191002ce155559c3da87891ae71c14043`: Node 22/Next/pg server runtime and Supabase session-pool connectivity, parameterized probe operations, outbound HTTPS, tagged cache/revalidation, environment persistence and same-commit redeploy/reconnection, bounded uploads (including 5 MiB and application rejection at 6 MiB + 1), protected cron probe auth and reviewed safe logs. These tests did not deploy current main.

Historical hPanel inventory: 3072 MB RAM, 2 CPU, 200 GB disk, 600,000 inodes, 120 processes and 1/5 Web App slots. Reverify the actual plan/account/current load. Must reverify after final approved deployment: exact SHA/build/start/Node, env persistence, DB role/TLS/pool budget, HTTPS/domain, redirects/cookies, all provider connectivity, final upload and slow-body bounds, process/restart/cache behavior, logs, route health/closures and controlled failure recovery. Never verified: actual scheduling facility/execution; trustworthy client-IP ingress; final custom-domain Turnstile/Auth; final-app concurrency/resource/runtime-timeout limits; production conditional Drive deletion and complete operational recovery.

Worker trigger: `POST /api/internal/worker`, empty body/no query, Bearer `CRON_SECRET` at least 32 characters. Proposed cadence: every minute UTC, pending account facility approval. One durable admission/60 seconds; bounded 5 sequential jobs, 5 stale recoveries and 5 retention enqueues per admitted invocation. Work deadline 20 seconds, 60-second leases, external call budget 10 seconds and finalization budget 3 seconds; retries 60 seconds–1 hour, default 5 attempts, capped at 10. Lease/admission handles overlap/restart; memory locks are not authority.

Twenty seconds is a work budget, **not a hard total HTTP ceiling**: pool acquisition/teardown may extend response. Propose at least a 40-second supported scheduler/request timeout margin, then measure worst cases and adjust the reviewed cadence/timeout. Missing/invalid secret, wrong method/body/query, concurrent trigger, provider timeout, stale lease, process restart, DEAD/ambiguity outcomes and scheduler missed runs must be rehearsed. Do not install a second scheduler or manual parallel runner. Rotate secret by coordinated trigger/runtime update and verify old-secret denial. **SCHEDULER IMPLEMENTATION: READY; SCHEDULER LIVE EXECUTION: REQUIRED.**

## 11. Privacy, production intake and retention code gates

Collected/processed foundation: name/email/phone, application type/job/department/interests, experience/portfolio/location/availability and conditional answers, accommodation-contact flag, versioned consent, CV bytes/hash/size/private object reference, security reviewer/evidence, application/hiring/audit states and job/idempotency evidence. No initial CNIC/passport/banking/family/identity-document collection is approved. Accommodation may be sensitive: limit it to contact request and approved purpose, never unnecessary medical detail. General public content and staff identity data have separate purposes.

PostgreSQL holds application data; Supabase Auth holds staff identity/factors; Google processes private CV bytes/metadata; Resend receives only minimal message recipient/content; Turnstile processes browser challenge signals; Hostinger processes request transport/runtime. No intentional per-IP persistence/remoteip submission; hosting/provider transport may still process IP/device metadata, which notices must accurately reflect.

Technical minimization, authorization, private storage, immutable consent/security evidence, bounded PII-free audit and synthetic erasure/tombstones are READY foundations. **Real production lifecycle is not implemented:** `public-intake.ts` permits only development/test plus loopback plus explicit synthetic mode, synthetic names/`example.invalid` recipients, synthetic consent/retention/department/job mappings and source. `background-worker.ts` production due-retention enqueue returns zero; execution accepts only explicit synthetic category `SYNTHETIC_JOB_APPLICATION`, version `phase-2b-fixture-v1` and synthetic sources. No production environment toggle currently enables real intake or erasure.

Separate CODE phase must map approved immutable purpose-specific consent/retention versions for job and evergreen purposes, real inputs/source, legal holds/request verification, production due-enqueue/erasure/recovery and explicit closed-default activation/rapid closure. It must preserve file-free versus file-required evidence, notification ordering, tombstones and restored-data deletion replay, and prove synthetic/real isolation. Do not substitute production policy rows with synthetic categories.

Owner/legal decisions: controller/entity and jurisdiction/contact; lawful basis/purpose for each collection/processor; whether evergreen retention/recontact needs separate optional consent; exact retention clocks/durations, legal holds and verified deletion requests; rejected/incomplete applications/files and minimal evidence lifetime; backups/provider retention and cross-border processing; staff access, file review and incident notification procedure; truthful accessible fallback when challenge/JS/file upload fails. Privacy notice and consent wording must match actual code/configuration. Qualified review for Pakistan/international scope remains REQUIRED; this audit provides no legal approval.

Public pages `/privacy`, `/candidate-privacy`, `/terms`, `/accessibility`: **PLACEHOLDER** (provisional shells, not approved production text). All need supplied accurate copy, owner/legal review as appropriate and accessible publishing. Cookie controls must reflect actual cookies; do not invent analytics or consent banners for nonexistent optional services. **TECHNICAL PRIVACY IMPLEMENTATION: READY (foundation only); LEGAL/POLICY APPROVAL: REQUIRED.**

## 12. Exact launch cleanup checklist — plan only

Prefer an owner-approved fresh production database/Auth project with final migrations and approved nonsynthetic content/policies, keeping historical development evidence isolated. If an existing target is chosen, first produce a restricted exact-ID/dependency inventory and an approved forward-only cleanup plan. No deletion is authorized here.

1. Remove/disable `/api/internal/compatibility/{database,outbound,revalidation,server,upload}` and `/api/internal/cron-probe`; they are diagnostics, not production health checks. Omit/revoke `COMPATIBILITY_PROBE_SECRET` after final authorized probe; expect unavailable/removed routes with safe responses, including with historical bearer tokens. Inventory `CompatibilityProbe` records/labels; retire table only by reviewed new forward migration, never amend migration 1/2.
2. Verify production 404 for `/dev/design-system`, `/internal/staff-auth`, `/api/internal/staff-auth/{read,verify}`; keep test-only routes/helpers inaccessible through production. Current smoke proves these closures locally.
3. Inventory Phase 2B seed IDs `00000000-0000-4000-8000-000000000001` through `...0018` (hex suffixes) from `scripts/seed-phase-2b-synthetic.mjs`: department/discipline/sector, project/media/credits/join tables, job/location/question/option, synthetic consent/retention, staff/roles, application/answers/consent/file/review/status/audit/job. Inventory Phase 2C IDs `...0020`–`...002b` from its seed, synthetic subjects and inherited Phase 2B admin/disabled subjects. Exact object maps in those files control ownership; UUID ranges alone do not authorize deletion.
4. Owner-created synthetic Auth subject `970e45fc-73cc-4f81-99e7-332aac583fee` and exact mapped staff `...0020`: confirm test ownership, disable mapping/revoke roles and terminate provider test identities/factors/sessions under approved procedure. Keep immutable audit evidence. Do not treat similarly named real users as fixtures.
5. Inventory additional synthetic applications/files/audit/jobs from later tests by exact fixture ledger, source and IDs, including C2B/challenge fixture modules; never broad `LIKE` deletion or assumed zero history. Existing immutable evidence/FK/trigger rules prohibit blanket deletion. Use approved lifecycle/tombstone operations or retain isolated historical database; any evidence-destruction exception requires explicit privacy/security review and a forward design, never guard bypass.
6. Drive historical Phase 2H six objects were deleted/verified in its record; do not delete again. For later artifacts, match exact root/account/ID/hash/size against restricted ledger and approve conditional deletion separately. No unowned orphan purge. Preserve DB/provider receipt consistency and immutable review evidence.
7. Remove test env from production build/runtime: synthetic intake mode, test DB URLs/recipients, fixture adapters, official challenge test keys, synthetic key canaries and test-only credential overrides. Source scripts can remain as reviewable development tooling; they must not be scheduled, run at build/start or given production secrets. `synthetic-email-adapter.mjs` is not a production provider. No `.env.local`, key/PEM, ignored logs/tmp/dumps/Blender working assets enter release artifacts.
8. Replace or withdraw five synthetic Work studies (`src/app/work/page.tsx`), four static synthetic Careers entries (`src/content/careers.ts`), fictional Culture profiles/stories/images, provisional Company/Contact/trust content and placeholder legal pages. Do not leave synthetic published DB project/job/policy rows active in production. Owner decides genuine vacancies versus truthful no-openings state.
9. Remove/replace diagnostic references and public placeholder claims; validate canonical/index policy, no private-route indexing and no prototype success claim for Contact. Confirm exact release artifact contains only approved assets/content/config.
10. Record approved cleanup target, before/after safe inventory, operator, data/evidence disposition, migration/test results and reviewer acceptance. Verify closures by HTTP, effective DB permissions, synthetic-content source/runtime scan, Auth test-user inventory and no unresolved provider effects. Retain historical evidence in controlled nonproduction storage with approved lifetime.

**LAUNCH CLEANUP PLAN: READY; execution unperformed.** Exact live inventory and approved commands remain prerequisites to execution; this checklist is not broad-delete authority.

## 13. Content, functionality, device and performance acceptance

**PUBLIC CONTENT: NOT READY.** Owner must supply/approve project facts and rights/credits (plan's recommended first release: at least three complete real case studies; its broader content checklist calls for six launch-quality projects including three deep studies, so owner must record the chosen launch minimum), real culture media/employee publication consent, truthful company/entity/parent relationship and contact/social details, genuine vacancies/location/work/benefits/compensation/hiring process, and four legal/trust texts. Confirm rights/licensing for final fonts/media/brand variants. No fake testimonial system was found; fictional stories must still be replaced, not presented as real staff. Approved logo master remains unchanged.

Careers currently reads static prototype data, not authoritative DB jobs; Apply passes prototype slugs while Join submission requires authoritative UUID context. Binding published jobs/questions/lifecycle and evergreen departments to real intake is a CODE gate. Contact is browser-local prototype: owner must choose verified contact-only delivery or approve a separate inquiry implementation. SMTP is not automatically required. Confirm planned receipt UX and all conditional fields/statuses against `FR-007`–`FR-018`; accept a documented scoped amendment or implement missing functionality before claiming complete MVP. Final per-route canonical/robots/sitemap and truthful eligible structured metadata remain CODE/CONTENT gates for the approved domain. A valid frontend freeze does not approve current synthetic content.

Minimum physical/manual matrix: iPhone Safari and mid-range Android Chrome; desktop Chrome/Edge/Firefox, macOS Safari where available (explicit owner exception if unavailable); keyboard-only; VoiceOver/Safari and NVDA/Firefox or Chrome; 200–400% zoom/reflow, contrast/forced colours and reduced motion; slow network/offline recovery/Save-Data/no WebGL/context loss; real-device file picker/5 MiB boundaries/retry/idempotency; Turnstile keyboard/errors/expiry; staff MFA/enrollment/logout/disabled access and authorized review/download. Use synthetic-only fixtures in approved isolated rehearsals, no real candidate data. Verify touch targets/errors/focus, fallback completeness, no sensitive caching and operational reviewer usability. **PHYSICAL DEVICE ACCEPTANCE: REQUIRED.**

Phase 1 evidence covers server-rendered useful content, deferred optional Home/Culture 3D, mobile/static/reduced-motion/Save-Data/WebGL-loss fallbacks. Historical deferred runtime ~238,824 bytes gzip, zero model/texture bytes, all emitted JS ~429,093 bytes gzip; not a current redesigned release budget. Current final baseline needs remeasurement and owner budget acceptance. Requirements: LCP <2.5 s, INP <200 ms, CLS <0.1 at p75; Home compressed model <700 KB excluding poster; stable 50–60 fps on representative mid-range Android, with static fallback when incapable. Local controlled and injected capability tests are not physical field proof.

After approved deploy: cold/warm CDN Lighthouse and real device/network measurements for Home/Culture, Careers/Join with challenge/upload, and authenticated staff paths; total/deferred JS and image/font bytes, no unnecessary mobile 3D request, layout stability, hidden/offscreen pause and error recovery. Authenticated measurements stay private with synthetic data. Field p75 requires enough traffic/time; use measured lab launch acceptance and an explicit post-launch field review rather than inventing field metrics. **PERFORMANCE IMPLEMENTATION: READY (foundation); DEPLOYED PERFORMANCE ACCEPTANCE: REQUIRED.**

## 14. Monitoring and incident operations

Fixed-code server logs, durable audit/jobs/intents/security states exist. A log stream is not a named alert/recovery process. Assign technical on-call/deputy, hiring/security reviewer, mailbox owner and privacy incident lead; owner must approve response times and handoff.

Minimum low-cost monitoring: canonical site/route availability; app restart/resource/pool failures; worker last successful admission/completion and missed cadence; oldest queued/retry/stale/DEAD jobs; unresolved email intents/provider receipts; pending storage/permission drift/reconciliation and failed conditional deletion; retention age/backlog/legal holds and stuck tombstones; aggregate auth denials and rate-limit saturation; backup last-success/expiry/rehearsal. No candidate names/emails/answers/CV/URLs/tokens/credentials in alerts. Restricted operators can correlate opaque IDs using authorized tools.

Proposed initial escalation thresholds for owner approval: missed worker >5 minutes, DEAD or ambiguous send/deletion immediately, unexpected permission drift immediately, backup >26 hours, persistent global saturation/resource errors immediately; target review backlog/SLA follows approved hiring volume. Implement an approved operator query/runbook and existing provider/log notification method, not a paid platform by default. Dry-run detection, delivery to deputy, closure/containment, evidence preservation and recovery.

Incident runbooks must cover DB/Auth/Drive/Resend/Turnstile/Hostinger outage; disable staff/profile; close intake and pause unsafe worker effects; credential compromise/revocation; candidate-file unauthorized access; broken retention; backup restore; public-content correction; notification obligations determined by legal lead. No blind retries/guard bypass. **MONITORING PLAN: NOT READY; INCIDENT RESPONSE PLAN: NOT READY** until owners, approved thresholds/tools and rehearsals are evidenced.

## 15. Production secret/config inventory — names only

No private values are included. Public does not mean suitable for arbitrary logging. Operator configuration must be recorded in a restricted company ledger; production secrets must never enter repository, preview, browser payloads or chat.

| Name | Visibility / owner | Purpose / requirement | Rotation or change impact |
| --- | --- | --- | --- |
| `NODE_ENV` | Public operational / Hostinger | Production runtime required | Rebuild/restart; reprove closures |
| `NEXT_PUBLIC_SUPABASE_URL` | Public / Auth owner | Exact production Auth project endpoint | Build/runtime consistency; remap identities only under approved migration |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public / Auth owner | Browser/SSR Auth project key | Rebuild and verify cookies/Auth; not a service-role key |
| `DATABASE_URL` | Server private / DB owner | Least-privilege runtime session pool connection | Drain/restart pools, verify role/TLS and revoke old login |
| `DIRECT_URL` | Operator private / DB owner | Controlled migration/administration only | Not normal web runtime; reverify target and ledger |
| `CRON_SECRET` | Server private / scheduler owner | Protected worker bearer, >=32 chars | Coordinate scheduler/runtime, verify old-secret denial |
| `GOOGLE_CLIENT_ID` | Server configuration / Google owner | Confidential OAuth client | Client ownership/consent/token compatibility |
| `GOOGLE_CLIENT_SECRET` | Server private / Google owner | Confidential OAuth authentication | Coordinated refresh/client rollover |
| `GOOGLE_REFRESH_TOKEN` | Server private / Google owner | Dedicated drive.file account access | Reconcile in-flight work; verify exact root/scope; revoke old token |
| `GOOGLE_DRIVE_ROOT_ID` | Server private / Google owner | Exact private recruitment root | Not casual rotation; reconcile object ownership/pointers first |
| `EMAIL_PROVIDER` | Server configuration / email owner | Resend selection | Rehearse adapter and unresolved intent handling |
| `RESEND_API_KEY` | Server private / email owner | Sending-only domain-restricted key | Request seal changes; drain/reconcile before rotation |
| `EMAIL_FROM_ADDRESS` | Public message setting / email owner | Approved sender address | Domain/config/template seal and deliverability acceptance |
| `EMAIL_FROM_NAME` | Public message setting / email owner | Approved sender display name | Template/request-seal consistency |
| `EMAIL_REPLY_TO_MODE` | Server configuration / email owner | Fixed mode | Never replace with user-controlled candidate value |
| `EMAIL_REPLY_TO_ADDRESS` | Public message setting / mailbox owner | Approved fixed contact mailbox | Mailbox ownership/access/receipt acceptance |
| `PUBLIC_INTAKE_ORIGIN` | Public boundary config / hosting owner | Exact canonical HTTPS origin | Reprove origin/CSRF/hostname controls |
| `PUBLIC_INTAKE_CHALLENGE_PROVIDER` | Server config / security owner | Turnstile selection | Fail-closed verifier/browser acceptance |
| `TURNSTILE_SECRET_KEY` | Server private / Cloudflare owner | Siteverify | Coordinated key rollover and replay denial |
| `TURNSTILE_SITE_KEY` | Public widget identifier, server configured / Cloudflare owner | Exact production widget | Rebuild/redeploy if needed; exact hostname/action acceptance |
| `COMPATIBILITY_PROBE_SECRET` | Server private / temporary diagnostics owner | Only separately authorized diagnostics; omit at launch | Revoke/remove when diagnostics retired |

Stale/reserved/test-only exclusions: `SUPABASE_SERVICE_ROLE_KEY` is unused/reserved, `SUPABASE_SECRET_KEY` not required by current runtime; do not install them. `PHASE2IC2B_LIVE_RECIPIENT`, `PHASE2IB_TEST_DATABASE_URL`, test overrides and `PUBLIC_INTAKE_MODE` are rehearsal/synthetic-only, not production activation. No SMTP, Redis, Vercel, scanner or webhook secret is currently required. Old SMTP backup/checklist wording does not add a runtime dependency.

## 16. Exact Hostinger environment checklist — planned, not configured

Apply only in an approved production configuration phase, confirming account/app/environment first. Private placeholders below are not usable credentials.

```text
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=<OWNER-VERIFIED PUBLIC PRODUCTION AUTH URL REQUIRED>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<OWNER-VERIFIED PUBLIC PUBLISHABLE KEY REQUIRED>
DATABASE_URL=<PRIVATE VALUE REQUIRED>
CRON_SECRET=<PRIVATE VALUE REQUIRED>
GOOGLE_CLIENT_ID=<OWNER-VERIFIED SERVER CONFIGURATION REQUIRED>
GOOGLE_CLIENT_SECRET=<PRIVATE VALUE REQUIRED>
GOOGLE_REFRESH_TOKEN=<PRIVATE VALUE REQUIRED>
GOOGLE_DRIVE_ROOT_ID=<PRIVATE VALUE REQUIRED>
EMAIL_PROVIDER=resend
RESEND_API_KEY=<PRIVATE VALUE REQUIRED>
EMAIL_FROM_ADDRESS=applications@mail.pyramiddesigns.co
EMAIL_FROM_NAME=Pyramid Designs
EMAIL_REPLY_TO_MODE=fixed
EMAIL_REPLY_TO_ADDRESS=contact@pyramiddesigns.co
PUBLIC_INTAKE_ORIGIN=https://pyramiddesigns.co
PUBLIC_INTAKE_CHALLENGE_PROVIDER=turnstile
TURNSTILE_SECRET_KEY=<PRIVATE VALUE REQUIRED>
TURNSTILE_SITE_KEY=<OWNER-VERIFIED PUBLIC PRODUCTION SITE KEY REQUIRED>
```

Operator machine/controlled migration job only: `DIRECT_URL=<PRIVATE VALUE REQUIRED>`. Temporary diagnostic deployment only, if explicitly authorized: `COMPATIBILITY_PROBE_SECRET=<PRIVATE VALUE REQUIRED>`; revoke/omit at final launch. No private key may have `NEXT_PUBLIC_` prefix. Confirm environment names/scopes/persistence without showing values; protect deployment/build logs; rebuild for public Auth configuration and restart pools; check generated bundles, secret-shaped patterns and provider/config canaries. Maintain intake closed throughout. No currently documented variable activates real intake.

## 17. Complete GO / NO-GO gate matrix

Status vocabulary: READY = bounded evidence complete; REQUIRED = work/evidence missing; DEFERRED = explicit unresolved deferral; BLOCKED = missing prerequisite prevents gate closure. D = final production deployment; I = real candidate intake. A closed rehearsal deployment may be separately approved before all launch gates, with scoped access and no real data. That is not production GO. Type codes: C CODE, O OWNER CONFIGURATION, R LIVE REHEARSAL, L LEGAL/POLICY, F INFRASTRUCTURE, P OPERATIONAL, U DEVICE/UX. Phase/order references are section 19. Every row states why, prerequisites and acceptance; owner and technical actions are separate.

| Gate / type | Status and evidence / why required | Owner action | Technical action / prerequisite | Blocks D / I; other capabilities | Verification | Order |
| --- | --- | --- | --- | --- | --- | --- |
| G01 Baseline/frontend / O | READY ancestry; final visual approval REQUIRED | Accept current main visuals/scope | Freeze final SHA after approved changes | Yes for final acceptance / Yes; public launch | Ancestry + final device/visual sign-off | A,B,E |
| G02 DB provider/region / O,F | REQUIRED Supabase committed, Neon unmerged | Reaffirm provider/exact company project/region | Approved ADR if changing; no silent merge | Yes / Yes; all DB paths | Project/endpoint/region metadata matches approved ADR | A |
| G03 Runtime identity / C,F | REQUIRED zero-policy RLS, privileged dev login | Name DB/security operator | Query/grant/policy design and actual-role tests (G02) | Yes / Yes; staff/worker/files | Positive workload + prohibited privilege/evidence/anon denial | B,C |
| G04 Migration / F,P | BLOCKED target/role/backup not approved; nine replayed | Approve target/window/operator | Final set, ledger/dry-run and forward policy (G02,G03,G05) | Yes / Yes; all DB capabilities | Controlled deploy + ledger/invariant/RLS tests | B,C |
| G05 Backup/restore / O,P,R | REQUIRED provisional policy; no recovery proof | Approve owners/storage/RPO/RTO/retention | Export/encrypt + deputy restore isolated fixtures | Yes / Yes; DB recovery/files | Checksums, complete restored state, no resurrection/duplicate email | A,C |
| G06 Auth/MFA/recovery / O,R | REQUIRED synthetic historical proof only | Company project, real staff/access/recovery owners | Redirect/cookie/AAL2/disable/break-glass (G02,G03) | Yes for staff deployment / Yes; staff portal | Real staff acceptance, synthetic BOLA and stale-token deny | C,D |
| G07 Google credentials/root / O,R | REQUIRED live historical storage; exact production ownership unverified | Dedicated account/deputy/token custody | Exact scope/root/privacy/rotation (G02 and isolated rehearsal) | Yes when file feature deployed / Yes file-required; uploads | Restricted root/object permission and revoked-token denial | C,D |
| G08 Conditional deletion/reconcile / R,P | REQUIRED current worker not live-rehearsed | Authorize bounded synthetic objects | Repair legacy harness, strong ETag/404/restart tests (G07) | Yes for operational release / Yes; files/retention/worker | Exact owned-object ledger, retry/race/missing tests, no unrelated deletion | B,C,D |
| G09 Malware review / O,P,U | REQUIRED provisional Defender SOP | Name reviewer/deputy/SLA, accept trust/endpoint risk | Practical UI/runbook + attestation/evidence (G06,G07) | Yes for file-review release / Yes file-required | Hash-bound clean/reject/fail/interrupt rehearsal and cleanup | A,B,C |
| G10 Resend runtime config / O,R | REQUIRED owner domain/receipt established, deployed env not verified | Key/mailbox/account access ownership | Apply names/scopes, preserve seals/intents | Yes for email-enabled release / Yes; mail | Deployed config/leakage, bounded separately authorized receipt test | C,D |
| G11 Email ambiguity/delivery / P,R | REQUIRED Spam/Junk, crash/reconcile not operationally accepted | Approve retention/deliverability and incident owner | Reconcile existing exact receipt/intent before resend (G10) | Yes for operational release / Yes; mail/retention | Same key/receipt, ambiguous crash recovery and inbox/bounce evidence | C,D |
| G12 Turnstile real hostname / R,O | REQUIRED local hostname blocked, code READY | Company widget/domain custody | Approved closed challenge rehearsal (G15,G21) | No for closed first deploy / Yes; intake | Real hostname/action Siteverify, token/retry/CSP/accessibility | D,E |
| G13 Durable global bound / C,R | READY local 20/60 + 648 focused checks; deployed REQUIRED | Accept availability budget | Multi-process/global/slow-body proof (G15) | No for closed first deploy / Yes; intake | Independent instances share one durable cap; no provider amplification | D |
| G14 Per-IP deferral / L,O,F | DEFERRED not silently waived | Explicit A or conditional B residual-risk decision | Prove adequate edge/global/challenge controls or trusted-IP implementation | No for closed first deploy / Yes until decision/proof; intake availability | Approved threat-model decision + saturation/resource rehearsal | A,D |
| G15 Hostinger final runtime / F,R | REQUIRED old compatibility proof only | Confirm plan/account/limits and deploy authority | Final SHA runtime/resources/restart/providers/TLS (G02–G05) | Yes / Yes; all hosted features | Actual final deploy evidence, limits and fail-closed smoke | C,D |
| G16 Proxy origin/CSRF/headers / C,F,R | REQUIRED forwarded provenance/full-site headers | Approve canonical domain/HSTS scope | Host/proto spoof/direct-origin/cookies/CSRF and header tests | Yes for staff mutations / Yes; staff/intake | Forged header/Origin deny + secure cookies/header review | B,D |
| G17 Scheduler / F,P,R | REQUIRED endpoint READY, cron never executed | Approve facility/cadence/owner | One protected runner, measured timeout, overlap/restart alerts | Yes for worker-operational release / Yes; worker/email/retention | Scheduled execution, stale recovery, unauthorized denial, missed-run alarm | C,D |
| G18 Real intake/retention / C,L | BLOCKED synthetic-only code; not env-enabled | Approve policy and closed activation design | Real purpose/source/mapping/erasure tests (G19) | No for closed public-only deploy / Yes; intake/retention | Nonproduction lifecycle/hold/tombstone then authorized synthetic rehearsal | A,B,E |
| G19 Legal/privacy approval / L,O | REQUIRED no approved notices/policies | Qualified purpose/processor/retention review | Implement/version exact approved policy, publish truthful notices | Yes for public launch / Yes; all data purposes | Signed decisions linked to code/notice/processor configuration | A,B,E |
| G20 Legal pages/content / O,L,C | REQUIRED four PLACEHOLDER pages and synthetic public content | Supply facts/rights/HR/consents/legal copy | Replace/withdraw fixtures; preserve approved design (G19) | Yes for public launch / Yes; site/careers | Source approval inventory + rendered content review | A,B,E |
| G21 Jobs/contact/MVP scope / O,C | REQUIRED static slugs vs UUID, browser Contact, missing management/review | Approve original MVP or explicit amendment/contact-only option | Bind DB job/evergreen/review/receipt UX; approved scoped features | Yes for claimed full MVP / Yes recruitment; staff/jobs/contact | End-to-end synthetic journeys and requirement acceptance ledger | A,B,E |
| G22 Diagnostic/synthetic cleanup / C,P | REQUIRED execution; plan READY | Approve target/disposition/history lifetime | Exact checklist section 12, no evidence bypass | Yes for public launch / Yes; Auth/data/diagnostics | Production closures and exact inventory/reviewer proof | B,C,E |
| G23 Device/accessibility / U,R | REQUIRED automation not physical acceptance | Provide devices/reviewer or explicit gap decision | Matrix section 13 (final content/deployed features) | Yes for final launch / Yes; all journeys | Signed real-device, keyboard/screen-reader/MFA/challenge/file review | E |
| G24 Performance / U,R | REQUIRED new baseline/deployed p75 unmeasured | Approve final byte/lab budget and field follow-up | Measure Home/Join/staff/3D fallbacks on final release | Yes for final launch / Yes; public/staff | Lighthouse/device + byte budgets; later actual p75 | D,E,F |
| G25 Monitoring/incidents / P,C | REQUIRED no named proven alert handoff | Owners/deputies/SLA/privacy lead | Minimal logs/queries/alarms/runbooks (G05–G17) | Yes for operational launch / Yes; all provider/lifecycle features | Failure injection detects/alerts/contains and deputy recovers | A,B,C,D |
| G26 Dependency quality / C | BLOCKED full audit high dev brace-expansion; runtime clean | Approve remediation phase or reviewed exception | Small dev dependency remediation, regenerate/test scoped lockfile | Yes release quality / Yes final release | Full/prod audit plus lint/type/build/smoke, exact advisory review | B |
| G27 Git/publication/release governance / O,P | REQUIRED main unprotected, public repo + Pages active | Approve public doc exposure and release safeguards | Exact staged scope/remote checks; assess Hostinger auto-deploy before app release | Yes for controlled app release / Yes; governance | Signed release SHA, CI/manual gates and external integration metadata | A,B,C |
| G28 Intake activation / O,P | BLOCKED all mandatory intake gates incomplete | Explicit final GO and incident closure owner | Approved closed-default switch only after final proof | No for closed deploy / Yes; real intake | Final signed gate ledger, activation/reclosure smoke + monitoring | F |

No overall GO. Accepted historical risks (free-tier availability/manual backup/manual reviewer model) still require final named-owner acceptance; stale docs are not new blockers; optional CMS/Contact scope changes require explicit amendments; per-IP is unresolved conditional deferral, not waived. Implementation fixes and missing evidence are distinct from owner decisions in the matrix.

## 18. Safest release sequence and rollback decision tree

1. **Pre-deployment owner actions:** approve database/project/region, unchanged frontend authority and exact MVP scope; supply truthful content/legal policies; name owners/deputies/reviewer and approve RPO/RTO/manual-scan/availability risks; decide A/B per-IP; confirm Hostinger/DNS/provider ownership and publication/automation boundaries. No live action from this document.
2. **Pre-deployment technical actions:** separately gated minimal code for runtime permissions/RLS, production policies/intake closed-default/retention, Careers UUID integration, practical staff/file-review tools, full-site headers/SEO, scope-approved functionality/content/diagnostic retirement, and development dependency issue. Freeze/recheck exact release SHA with synthetic-only tests and leakage scan.
3. **Isolated foundation rehearsal:** provider-separated synthetic DB migration/runtime-role/backup restore and bounded provider/Defender/email ambiguity rehearsal; provision approved production credentials without data activation. Establish monitoring/rollback/deputy procedures. Real provider actions only with separately explicit bounded authorization.
4. **First deployment:** separately authorize Hostinger and any domain/DNS changes; deploy frozen SHA with intake CLOSED, no real candidate data, synthetic/production separation and scheduler unsafe effects paused. Closed-route/basic liveness checks can run without database initialization; DB-dependent acceptance waits for controlled production migration. Prefer a separate synthetic staging target; never use production secrets/data in routine preview.
5. **Production data/migration actions:** after verified backup/recovery and explicit target/window approval, apply only approved migrations and minimum nonsynthetic policy/content/staff mapping data using operator identity; verify actual runtime grants/RLS. This must precede enabling DB-dependent routes/workers. If build requires initialized DB, perform this controlled step before first deployment instead and record the dependency; no blind deployment-triggered migrations.
6. **Deployed verification/staff Auth acceptance:** exact final SHA/runtime/env/TLS/resources/ingress/headers; legitimate staff MFA/recovery/disabled/session/BOLA; exact Google/email/challenge config; scheduler execution and failure/alert recovery. Rehearsal fixtures remain synthetic with explicit isolation; do not seed production indiscriminately.
7. **Public site/device acceptance:** final content/legal/SEO and no diagnostic exposure; visual/physical/manual accessibility and lab performance; final release artifact/role/provider inventory and operations handover.
8. **Candidate intake rehearsal:** separately authorize a bounded synthetic-only exercise at the correct hostname using isolated DB/objects/recipient, preserving real intake closure. Verify challenge/admission, duplicate/retry, file-required and file-free submission, manual review, one logical email/receipt, worker reconciliation/retention/reclosure. Do not use real applications as a test.
9. **Final GO-live:** owner/security/legal/operators sign exact gate ledger/SHA. Explicitly approve activation of the future implemented closed-default intake control; initial limited volume with closure procedure and reviewer capacity. Public/staff-only launch, if desired, needs its own revised scope and sign-off; it never implies intake approval.
10. **Post-launch:** monitor worker/retention/mail/file/rate-limit/resource/backup/deletion states, named deputy response, physical/field performance and incident readiness; reopen only after review when any gate regresses.

Rollback decision tree (intake CLOSED is default during uncertainty):

- Build/deploy failure -> preserve last known compatible application and database, do not activate; restore prior immutable build only after schema compatibility check; preserve safe failure evidence.
- Runtime DB failure -> close intake/private features, pause unsafe worker actions; verify endpoint/TLS/role/pool/provider availability; never widen grants or switch to owner credentials. Restore/cutover only through isolated recovery.
- Migration failure -> quiesce writers/worker, inspect transaction/ledger boundary; reviewed forward fix or isolated verified restore/cutover; no assumed down migration or migration checksum edits.
- Auth failure -> deny staff, local-disable compromised principals plus approved session/credential revocation; retain audits; verify recovery and stale-token denial before access resumes.
- Turnstile/abuse failure -> close intake; keep hostname/action/origin validation and admission enforcement; no challenge bypass, test key or fabricated client IP.
- Drive/privacy/file-review failure -> close file-required intake, deny affected downloads, preserve quarantine/state/digest, pause unsafe erasure and reconcile exact owned objects; no clean attestation without review. Entire intake stays closed unless a separately approved file-free safe scope exists.
- Resend ambiguity/outage -> preserve stable intent/key/receipt, stop blind resends, queue bounded recoverable work and alert; reconcile provider acceptance before retry or erasure. No new key/attempt reset to work around uncertainty.
- Worker failure -> pause problematic trigger/effects, inspect durable leases/DEAD jobs/intent state, allow reviewed recovery; never delete evidence to restart. Keep intake closed if lifecycle/backlog cannot meet policy.
- Candidate data/security incident -> close intake, restrict staff/file access and compromised provider credentials as necessary, preserve minimized evidence, involve privacy/security lead and deputy, perform legal notification analysis and verified recovery. No public candidate details in incident updates. Reopen only after explicit sign-off and repeat relevant gates.

## 19. Smallest recommended remaining phases — none started

**Phase A — Release decisions and approved operating policies.** Objective: resolve provider/exact target, MVP/content/legal, manual review, ownership, RPO/RTO and per-IP decision. Owner prerequisites: decision makers and supplied facts/legal review. Live actions: none proposed; read-only account metadata only if authorized. Expected code changes: none; approved ADR/policy/scope records. Stop condition: decisions unresolved or contradict current authority; do not provision/deploy.

**Phase B — Approved release gaps and synthetic verification.** Objective: smallest authorized code/content/security/dependency changes identified in G03/G09/G16/G18/G20–G22/G25/G26. Owner prerequisites: A approvals and exact implementation scope. Live actions: none; disposable/synthetic-only. Expected code changes: reviewed runtime-role migration/policy design, real-data policy mapping/retention with closed activation control, job UUID/review usability, agreed MVP amendment/features, truthful content/SEO/headers/diagnostic retirement and minimal dev dependency remediation. Split unrelated changes for review if needed. Stop condition: security/quality regression, policy ambiguity or requested real/provider action; keep intake closed.

**Phase C — Configuration, migration/recovery and operational rehearsal.** Objective: prove actual-role migrations/backups/deputy recovery and bounded provider/manual-review/mail reconciliation procedures; prepare named configuration and monitoring. Owner prerequisites: approved B release, exact isolated/production targets, credentials custody, test-root/recipient budgets and rollback plan. Live actions: only individually approved configuration and bounded synthetic provider actions; production migration is a separate explicit window within this phase or D, never implied. Expected code changes: only approved harness/runbook/alert support, no product redesign. Stop condition: target mismatch, backup restore failure, unexplained objects/receipts, immutable-evidence conflict, leakage or provider ambiguity; no deployment/real intake.

**Phase D — Closed deployment and deployed acceptance.** Objective: frozen-SHA Hostinger deployment with closed intake, controlled production schema if authorized, domain/Auth/providers/ingress/scheduler/resource verification. Owner prerequisites: C recovery/config proof; explicit deployment, domain/DNS and migration authorizations as applicable. Live actions: those exact approved effects only; real staff creation/MFA only under explicit approval; bounded synthetic verification. Expected code changes: none planned except separately approved defect remediation; re-freeze SHA if any. Stop condition: failed mandatory deployed gate, unintended auto-deploy, data/config crossover or real intake exposure; rollback/close.

**Phase E — Final public/device and synthetic candidate acceptance.** Objective: actual final content/accessibility/performance plus complete real-hostname challenge/application/file/mail/worker/retention synthetic exercise. Owner prerequisites: D proof, legal/content sign-off, devices/reviewer capacity, isolated synthetic routing and explicit bounded provider budget. Live actions: only authorized synthetic submissions, objects/mail and rehearsed cleanup; no real candidate intake. Expected code changes: none unless a discovered defect opens a separate reviewed fix. Stop condition: missing acceptance/failed operations or unsafe isolation; retain closure.

**Phase F — Explicit intake activation and handover.** Objective: signed final gate ledger, owner GO, controlled initial intake and post-launch monitoring. Owner prerequisites: all mandatory gates complete or expressly scoped reviewed exceptions, privacy/security/operations approval and tested reclosure. Live actions: explicitly authorized real activation and normal operations only. Expected code changes: none; use previously reviewed activation/closure control. Stop condition: any gate regresses, backlog/availability exceeds approved limits, or incident occurs; close immediately and follow rollback. No part of F is authorized by Phase 2J.

## 20. Fresh verification, sensitive scan and Git governance

Completed non-destructive/disposable checks on the exact baseline:

| Check | Result and scope |
| --- | --- |
| Git integrity | PASS; dangling objects only, no corruption |
| Prisma validate | PASS |
| Lint | PASS |
| Typecheck before/after build | PASS |
| Production Webpack build | PASS, 18 generated/static pages; closed synthetic configuration, no real provider credentials |
| Migration inventory/replay | PASS, all nine on new `phase2ib_2j_20260930_audit` database in existing dedicated loopback `pyramid-2ie-postgres` container; PostgreSQL 17.10 |
| RLS/effective grants | PASS disposable only: 28/28 public tables RLS, zero policies/prohibited browser-role grants/public callable functions |
| Prisma migrate status | PASS disposable only, all applied |
| Production smoke | PASS, 32 checks and 92 client files; production diagnostic/dev closures and fail-closed routes |
| Focused readiness/challenge | PASS, 648 checks, zero live requests, JSON denied, provider amplification bounded |
| Production dependency audit | PASS, `npm audit --omit=dev --json`: zero vulnerabilities |
| Full dependency audit | FAIL release-quality gate: one high vulnerable dev package (`brace-expansion`, multiple advisory entries/installed copies); no fix performed |
| Sensitive-material/canary scan | PASS initial 575 tracked/generated/log files; zero findings, one known loopback fixture URL occurrence; repeated for final document/staged snapshot |
| Canonical logo | PASS LF-normalized SHA-256 `2c5d2042ef020aa7ad37ff92e6fd9c3407ef305102ee49da3b6900ff99ffe60c`; Windows raw CRLF checkout difference does not alter master |
| Schema/migrations/lockfile | Unchanged from starting baseline |

Local host Node 24.15.0/npm 11.12.1; focused scripts use pinned Node 22.22.0. `npm ci --ignore-scripts` installed dependencies only in audit checkout; no lockfile mutation. Build used deliberately closed/synthetic loopback fallback with blank actual provider/Auth config and synthetic canaries. Existing private environment was not read. Disposable infrastructure is not production verification; no existing database/test artifacts were deleted.

Full audit detail: installed `brace-expansion` 1.1.18 via ESLint 9.39.1/minimatch 3.1.5 and 5.0.9 via eslint-config-next 16.3.3/typescript-eslint 8.69.0/typescript-estree/minimatch 10.2.6. Advisories: `GHSA-q2hr-2g5m-vwhr` (quadratic CPU, affected <1.1.21 and >=4 <5.0.12), `GHSA-qhr7-859c-m2p7` (nested recursion, <1.1.20 and >=4 <5.0.11), `GHSA-6j4f-fj2g-mc7p` (parseCommaParts, <1.1.19 and >=4 <5.0.10). Audit indicates all-fixed lines 1.1.21/5.0.12; confirm available compatible resolution in the future remediation phase. No runtime public caller was identified. This does not invalidate a closed-runtime documentation audit, but release quality requires remediation or explicit reviewed exception; do not claim all gates green.

Sensitive scan used an ignored local Node script, adapting existing leakage logic without its `.env.local` dependency. It scans tracked Git bytes, generated server/client artifacts and build/smoke logs for key/JWT/OAuth/MFA/DB-URL patterns and generated synthetic canaries; prints only counts/path/category, never matches. One loopback-only DB fixture literal is explicitly classified. Final staged document is scanned separately. Limitation: without reading private values this is a pattern/canary/path scan, not exact matching against an undisclosed secret inventory; no claim of exhaustive absence of every possible secret. No private configuration file, real candidate data, diagnostic log or generated artifact is staged.

Read-only GitHub metadata on audit date: repository public; main `protected=false`; no tracked app CI workflows; sole active dynamic workflow `pages-build-deployment`; Pages enabled, legacy main/root source, HTTPS enforced. Deployment records show GitHub Pages only; repository webhook inventory empty. This does not prove a Hostinger account has no external polling/integration, and no Hostinger configuration was read/changed here. No demonstrated app auto-deployment conflict was found. The explicitly authorized documentation push can trigger existing Pages publication of public repository documentation; that is distinct from deploying the Node candidate application, and must not be mistaken for production-ready application evidence. Owner must review publication exposure and normal app-release safeguards/integration before future code release. Do not disable Pages or change protection/provider config in this phase.

Only this document is authorized for staging. Review status, staged stat/full diff/diff-check and scan; commit `docs: audit production readiness`; fetch and require actual remote main still the exact starting SHA; normal fast-forward push `HEAD:main`, never force. Verify local/tracking/remote new SHA and protected primary branch/HEAD/status afterward. The commit SHA is reported externally because embedding it in its own commit would be circular.

## 21. External effects, references and hard stop

```text
LIVE RESEND EMAILS: 0
LIVE GOOGLE MUTATIONS: 0
LIVE CANDIDATE SUBMISSIONS: 0
PRODUCTION DEPLOYMENTS: 0
PRODUCTION MIGRATIONS: 0
DNS CHANGES: 0
HOSTINGER CONFIG CHANGES: 0
NEXT PHASE HAS NOT STARTED.
```

Counts describe Phase 2J application/provider actions. Existing GitHub Pages automation may publish the authorized documentation push; no Node application deployment is requested or performed. No new live Turnstile verification was run. Historical live evidence remains scoped to its phase.

Primary references supporting operational assumptions: committed ADRs/phase records above; Supabase official [backups guidance](https://supabase.com/docs/guides/platform/backups), [connection guidance](https://supabase.com/docs/guides/database/connecting-to-postgres), [Auth MFA guidance](https://supabase.com/docs/guides/auth/auth-mfa); Cloudflare official [Siteverify guidance](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/); PostgreSQL official [row security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) and [explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html); fresh npm audit advisory identifiers above. Provider guidance does not establish account-specific configuration or acceptance. Recheck current provider/account limits in the separately approved configuration phase.

**STOP after this audit's documentation commit/push.** No recommended phase, cleanup, credential creation, production data change, deployment, DNS/provider configuration, real staff onboarding, live mail/Drive operation or real candidate intake begins here.

# Phase B4B1-S1 — Supabase production database re-baseline

**Date: 2026-10-01 (Europe/London). Result: PASS — re-baseline and S2 plan complete; production acceptance remains closed.** The owner decision is applied, live read-only inspection is complete, the first eight migrations and their catalog effects match, and the pending delta is bounded. No production mutation or S2 execution occurred. Passing S1 does not waive the database, recovery, Auth, Hostinger or independent B3 gates.

## Repository state

Worktree: `C:\Users\atikm\.codex\worktrees\pyramid-b4\Pyramid Designs`. Branch: `phase/b4-production-readiness`. Starting local HEAD, tracking and remote feature branch matched `6b8f851b1f277fd262a39ce1e7a111cec1793e97`, with a clean tree. S1 is authorized for the exact commit message `refactor: restore Supabase production database architecture` and this feature branch only after final checks. The release receipt records the resulting SHA. No main merge, B3 worktree access, deployment or DNS action.

Review covered AGENTS, website plan/ADRs, records through B4B1-H4, eleven migrations, Prisma schema, pg repositories/transactions, Auth/local authorization, intake, worker, retention/evidence, health and deployment controls. B3 remains independently **UPSTREAM DISCLOSURE BLOCKED**.

## Architecture decision applied

[ADR 0019](../architecture/decisions/0019-supabase-production-database-rebaseline.md): existing **Supabase PostgreSQL + Supabase Auth**, server-only pg on Hostinger managed Next.js/TypeScript; Prisma schema/migration tooling only. Private Google Drive, Resend and Turnstile remain. The provider migration is **ABANDONED BY OWNER ARCHITECTURE DECISION — 2026-10-01**. Supabase is the sole production database source of truth.

## Supabase project

**Pyramid's Project**, reference **vimpcftbtbmezcrjzhfl**, organization **Pyramid Designs**, region **ap-south-1**, status **ACTIVE_HEALTHY**. The connector now accesses the correct project; no further reconnection is needed. Provider organization metadata confirms **Free / tier_free**. Public Auth configuration, retained Supabase operator configuration and provider metadata agree on the target.

Earlier wrong-account/unavailable-tool results are superseded by successful inspection. No unrelated project's database was queried. No DSN, password, key, token, CV identifier or Auth subject was printed. Primary-checkout private environment files were not changed; their current abandoned-provider database entries must not become the production template.

## Current Supabase database state

PostgreSQL **17.6**, provider build **17.6.1.166**, database postgres, size **13,773,971 bytes** at inventory, max_connections **60**. Database owner postgres; public schema owner pg_database_owner. All 28 public tables (27 application tables plus Prisma ledger) are postgres-owned, RLS enabled, FORCE RLS false; no policies. No application sequences or views, no pyramid_private schema, no Pyramid roles.

Application catalog: **23 enum types / 84 labels, 275 columns, 101 constraints, 71 indexes, 11 functions, 15 non-internal triggers** (ledger excluded from these facet counts). All eight catalog facets exactly match an isolated PostgreSQL17 replay of the first eight unchanged repository migrations, including function definitions and trigger timing. Both definitions and checksums were compared, not merely object names.

Installed extensions: plpgsql 1.0, pg_stat_statements 1.11, uuid-ossp 1.1, pgcrypto 1.3, supabase_vault 0.3.1. No extension relations/functions occupy public. Six Supabase-owned platform event triggers are present; do not disable them. Supabase's separate migration-tool list is empty; Prisma's completed ledger is authoritative for this repository.

## Production data preservation

Existing nonempty data is preserved. Aggregate evidence: Application 5; ApplicationAnswer 4; ApplicationStatusEvent 3; AuditEvent 1; BackgroundJob 1; CandidateConsent 5; CandidateFile 1; CompatibilityProbe 2; FileSecurityReview 1; IdempotencyRecord 4; StaffUser 8; UserRole 8. Each of ConsentDefinition, Department, Discipline, Job, JobLocation, JobQuestion, JobQuestionOption, Project, ProjectCredit, ProjectDiscipline, ProjectMedia, ProjectSector, RateLimitBucket, RetentionPolicy and Sector has 1 row.

These counts establish historical application data presence, not real-versus-synthetic provenance or completeness against an independent historical backup. Treat every record as production data; do not reset, reseed, delete unmatched staff or copy rows elsewhere. Only aggregates, catalog metadata and migration checksums were accessed. Zero retention requests/completions and zero deleted files were found; the pending CandidateFile constraint has zero aggregate violations. S2 must rerun preconditions under its writer freeze.

## Migration history reconciliation

All eleven SQL files remain unchanged; none is Neon-only. The first eight ledger rows are finished, not rolled back, with matching SHA-256 after recognized LF/CRLF normalization. Exact hashes and catalog fingerprints are retained in external evidence. No failed history or unexpected catalog drift was found.

| Repository migration | Classification | Exact delta |
| --- | --- | --- |
| 20260902000000_phase_2a_compatibility_probe | APPLIED_AND_MATCHING | Ledger and catalog match. |
| 20260903000000_phase_2a_compatibility_probe_security | APPLIED_AND_MATCHING | RLS and browser-deny history match. |
| 20260903220000_phase_2b_production_domain_foundation | APPLIED_AND_MATCHING | Domain/enums/constraints match. |
| 20260903221000_phase_2b_candidate_file_constraint_correction | APPLIED_AND_MATCHING | Corrected constraint matches. |
| 20260903222000_phase_2b_evidence_constraints | APPLIED_AND_MATCHING | Evidence functions/triggers match. |
| 20260903223000_phase_2b_application_constraint_completion | APPLIED_AND_MATCHING | Constraints match. |
| 20260905000000_phase_2g_file_free_submission | APPLIED_AND_MATCHING | File-free/default and locking effects match. |
| 20260905010000_phase_2g_immediate_file_evidence | APPLIED_AND_MATCHING | Immediate trigger timing matches. |
| 20260907000000_phase_2ib_completed_retention_tombstones | NOT_APPLIED_REQUIRED | Retention guards, revised checks/evidence functions. |
| 20260930000000_phase_b1_runtime_permissions | REQUIRES_SUPABASE_ADAPTATION | Pending portable SQL; operational role/default-grant/platform preflight and additional Supabase grant closure required. Preserve historical SQL. |
| 20260930010000_phase_b2_admin_workflows | NOT_APPLIED_REQUIRED | InternalNote, indexes, guards, workflow grants/policies; requires B1. |

No migration resolve, ledger repair, blanket deploy or historical rewrite is justified. History is reconciled as an inventory; production still **REQUIRES_ACTION** to apply the three pending migrations and surrounding hardening.

Pending migration SHA-256 (SQL normalized to LF; preserve the original files): retention `d74f7a4ad93180bbfc033d7c5326ad96a21223b8c360e41f2b7bafe2bbdc8f3e`; B1 `485cc1dbfea5a0af298a9aa9a508838869dd21aeb310f2f74ec9c51b4a5dd4a8`; B2 `300fe4de59ef7117fe6b01fee40d4354fea8ef88b1211383cdf554e0521337af`. Verify these again before S2. The original byte hashes and recognized line-ending comparison are in the evidence; no checksum was edited to match.

## Neon retirement

**A — provider-specific, retired:** project/branch IDs, API key/provider transport, branch creation/rehearsal/lifecycle/cleanup/support, Neon URI rules, provider migration/recovery/cutover and B4B1-P3/P4 gates. No runtime, deployment, environment, health, rollback or launch dependency remains.

**B — portable security, retained:** restricted runtime/locker roles, RLS, table/column/function/default grants, immutable evidence, private fixed reference locking, transactions, idempotency, durable jobs/fencing, retention controls, pool limits and server authorization.

**C — historical evidence, retained:** ADR0017 and original Phase A/B1/B4A/B4B1 bodies, manifests/provider/lifecycle scripts and acceptance records. Supersession notices point to ADR0019/current procedures. P3 environment names remain only as retired inventory. No calls, reads, copying or comparisons with Neon occurred.

## Supabase security state

- **RLS: REQUIRES_ACTION.** All 28 existing public tables are enabled and default-deny; 80 intended B1/B2 role policies are pending. Do not add permissive browser policies to silence advisors.
- **GRANTS: REQUIRES_ACTION.** anon/authenticated have zero effective application table/column/sequence/function privileges. service_role retains privileges on all 28 tables, 283 columns (ledger included) and 11 public functions; it also bypasses RLS. Remove unnecessary application access explicitly.
- **BROWSER ROLES: current PASS.** No unintended effective CRUD/EXECUTE was found. Public schema USAGE alone is not table access. Existing postgres and supabase_admin public defaults still grant anon/authenticated/service_role future object privileges; the October change is not a substitute for present closure.
- **CUSTOM RUNTIME ROLE: REQUIRES_ACTION.** No Pyramid role exists. Use two restricted NOLOGIN capability/locker roles and a dedicated LOGIN inheriting only pyramid_runtime. No ownership, elevated attributes, schema CREATE, database TEMP, ledger access or privilege-grant path. Current postgres is NOSUPERUSER but CREATEDB/CREATEROLE/REPLICATION/BYPASSRLS and must remain operator-only.
- **IMMUTABLE EVIDENCE: existing guards MATCH; full target REQUIRES_ACTION.** Existing immutable/history/file/submission triggers match first-eight replay; retention/B2 note safeguards remain pending. Synthetic restricted and recovery tests pass.
- **SECURITY ADVISORS:** 28 INFO RLS-without-policy findings are **INFORMATIONAL** for current default-deny; missing intended runtime permissions separately block application acceptance. Disabled leaked-password protection is **PRE-LAUNCH**, requiring plan/availability and password-policy review. No Auth setting changed.
- **PERFORMANCE ADVISORS:** 12 unindexed foreign keys are **POST-LAUNCH** tuning candidates at present small counts; 17 unused-index notices are **INFORMATIONAL**. Do not delete integrity/useful future indexes mechanically.

The 12 FKs are Application.departmentId/retentionPolicyId, ApplicationAnswer.jobQuestionId, ApplicationStatusEvent.actorStaffUserId, BackgroundJob.applicationId/candidateFileId, CandidateConsent.consentDefinitionId, FileSecurityReview.reviewerStaffUserId, Job.jobLocationId, ProjectDiscipline.disciplineId, ProjectSector.sectorId and UserRole.grantedByStaffUserId.

The actual operator owns all current public app objects and database and can create in public. Its CREATEROLE supports the intended operational provisioning in principle; new-role ownership/SET/default privileges must be tested in S2. It **cannot SET supabase_admin**. Do not attempt broad changes to platform roles, Auth/storage/realtime schemas or their defaults. B1 can be reused only after reviewing its public/schema-wide revocations, database TEMP consequence and locker ownership transfer. Its SQL does not close service_role or supabase_admin defaults by itself.

The readiness checker retains strict PG17 permissions/catalog checks. Target/identity parsing is Supabase-compatible; it is **not yet live Supabase acceptance**. Its all-owner default-ACL check will correctly refuse the observed platform defaults. S2 must implement/test an explicit distinction between approved application-object creators and platform-only defaults, while failing new application exposure, unexpected owners, role escalation and service_role grants. Never simply waive the failure or revoke platform privileges globally. Any owner able to create new public application objects needs a reviewed default-deny creation path; if managed-role defaults cannot be changed through supported controls, this remains a blocked S2 decision until a safe supported boundary is approved.

Advisor references: [RLS without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), [unindexed FK](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys), [unused index](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

## Supabase Auth state

Implementation remains @supabase/ssr/getClaims, request-scoped clients, fresh local ACTIVE mapping/current roles, AAL2, target/state authorization, redirects and same-origin/CSRF controls. Local regressions pass.

Aggregate live evidence: **1 Auth user, 1 verified TOTP factor, 8 StaffUser rows, 7 ACTIVE staff, 7 mappings without an Auth user; 1 mapped ACTIVE staff**. This is not live login/AAL2/disabled-user acceptance. Preserve unmatched historical rows; their authorization/provenance requires owner review, not automatic deletion or account creation. Redirects, registration/recovery, cookie/cache isolation and staff role acceptance remain production checks. No user/session/factor/key/Auth configuration changed.

## Runtime connection decision

**HOSTINGER NETWORK ASSUMPTION/PROOF:** Phase 2A-FR2 records successful Hostinger Node22/pg → Supabase session mode and reconnection on September 3 at 81d3960191002ce155559c3da87891ae71c14043. Current direct IPv6/IPv4-add-on and restricted-login/TLS acceptance are unproven.

**RUNTIME MODE:** retain Supavisor session **5432**, unless current direct-network proof justifies direct PostgreSQL. Do not use transaction6543 automatically. **MIGRATION MODE:** operator-only DIRECT_URL via verified direct or session5432; absent from app/build/scheduler.

**POOL CONFIGURATION:** max3, idle10s, connection timeout10s, application_name pyramid-designs, unchanged. Actual max_connections60 is known; actual Supavisor pool/client configuration and aggregate web/worker/readiness/maintenance budget still need verification. Three per process is not a complete multi-process capacity proof.

A retained operator DSN failed local certificate verification with SELF_SIGNED_CERT_IN_CHAIN before SQL. MCP inspection succeeded independently. Obtain the authentic project CA and prove verify-full/hostname validation locally and from Hostinger; do not disable verification. Existing environment values were not edited.

## Schema / repository delta

Supabase is close structurally: the first-eight schema is exact, with **one new table (InternalNote)** required. Target excluding ledger: 28 tables / 280 columns / 105 constraints / 74 indexes / 80 policies / 22 functions / 29 triggers / unchanged 84 enum labels. Delta: +1 table, +5 columns, +4 constraints plus two revised checks, +3 indexes, +80 policies, +11 functions plus two replacements, +14 triggers; pyramid_private and restricted roles/grants also required. The complete current/required definitions are in live-comparison.json and full-delta.json.

No new provider or data movement is needed. Production security/identity/recovery remain material prerequisites. Repository schema, migrations, application/Auth code and dependencies are unchanged; only architecture/environment/runbooks and narrow readiness-target verification changed.

## Production database changes performed

**NONE.**

## Production database changes required — exact S2 scope

1. **Refresh and freeze:** recheck this project/version/eight ledger hashes/catalog, counts and pending-migration preconditions; freeze all app/scheduler/operator writers in one approved maintenance window. Capture current Hostinger artifact/env references, public routes and rollback compatibility. Stop on any drift or unexpected objects/owners.
2. **Recovery before writes:** authentic CA and verified operator path; encrypted independent logical backup of application schemas/ledger plus required ACL/role definitions, with protected storage/key/deputy/expiry. Validate recovery in an isolated controlled recovery target, without exposing contents or using production data in development. Separately inventory Auth recovery scope. No verified usable recovery point means STOP.
3. **Prepare and test the bounded Supabase preflight:** review actual PG17.6 platform permission/event-trigger behavior; provision pyramid_runtime and pyramid_reference_locker as restricted NOLOGIN; grant only the required locker SET/INHERIT authority to operator. Pre-close postgres application defaults for PUBLIC/anon/authenticated/service_role, revoke service_role application object/column/function grants, and resolve managed supabase_admin future-public-object defaults through supported controls. Preserve platform schema privileges and necessary platform TEMP/CONNECT behavior. Rehearse exact SQL against a synthetic Supabase-shaped role/default fixture, and update readiness tests with deliberate service_role/default/ownership faults. Preserve historical migrations; put any new security effect in a reviewed forward change/operational preflight with exact hashes.
4. **Apply only pending reviewed SQL in order:** 20260907000000 retention → 20260930000000 B1 → 20260930010000 B2, after preflight passes. No blanket replay, resolve, reset or seed. Use bounded lock/statement timeouts and explicit failure/partial-ledger handling. No data deletions/updates are required by these migrations. Ledger writes are expected; the new InternalNote starts empty.
5. **Provision restricted runtime LOGIN:** secret-safe creation/rotation and only pyramid_runtime membership; CONNECT/USAGE/narrow grants, no elevated attributes, ownership or locker SET path. Test the project-qualified session username through verify-full. Never place postgres/DIRECT_URL/service_role credentials in runtime.
6. **Immediate acceptance:** ledger/hash and schema comparison; intended RLS/privileges including columns/defaults/service_role; fixed locker ownership/search_path; no extension/platform regressions; role/default negative tests locally, aggregate preservation and invariant checks live. Preserve existing counts, new notes0, and all feature gates closed. If a migration or outcome is ambiguous, stop; inspect read-only, then use reviewed forward-fix/recovery, never automatic retry/reset.
7. **Separate launch decisions in the same practical programme:** engine security-patch review, one existing PUBLISHED job versus zero-open-role launch, seven unmatched staff mappings, password protection and live Auth acceptance. Preserve data; do not close/delete jobs or alter staff in S2 unless its explicit scope includes those reviewed data changes.

**Next execution prompt requirements:** name this worktree/branch and resulting S1 SHA, project vimpcftbtbmezcrjzhfl, Free/PG17.6 baseline; authorize only bounded S2 preparation/execution after the above prerequisites; name approved maintenance window/operator/deputy/backup, CA and connectivity proof, exact preflight/three migration hashes, managed-default resolution, before/after counts, timeouts/abort/recovery rules and commit/push limits. Explicitly exclude deployment/DNS/Auth/data disposition/intake activation unless separately approved. S1 does not supply absent credentials, recovery timestamps or authorization by inference.

## Backup / recovery

Free/tier_free is confirmed. No provider backup timestamp or verified recovery point is available from the connected tools; no PITR entitlement or provider restore acceptance is claimed. The practical plan is an independent encrypted logical export and isolated controlled recovery as described above and in the [recovery policy](../operations/backup-and-restore.md). Owner/operator/deputy, protected destination, keys, RPO/RTO and actual restore validation are S2 prerequisites. Synthetic dump/restore passes but proves mechanics only. No production export was performed.

## Hostinger impact

Existing live site, environment, artifact, deployment source, domain and DNS were not changed. Minimal cutover remains verified S2 database → approved compatible exact release with closed gates → protected readiness/restart/public-route/Auth checks → separately accepted activation. Retain the old artifact/configuration and prove compatibility; an environment-only rollback must not bypass new schema/security requirements.

Current database has **one PUBLISHED job**. The zero-open-role launch requirement needs an explicit preserved-history job disposition before connecting a release that serves database careers. No job state changed in S1. Intake/retention stay closed; staff requires existing Auth/AAL2/authorization, diagnostics404 and production fake providers fail closed.

## Remaining production blockers

- Pending three-migration/security delta, restricted runtime identity, managed defaults/service_role closure and readiness acceptance.
- Authentic CA, current Hostinger DB connectivity, actual pool/process budget, backup/recovery and platform engine security-patch review.
- Live Auth/role/mapping acceptance, published-job disposition, provider/legal/retention and operational gates.
- Independent **B3 UPSTREAM DISCLOSURE BLOCKED**. S1 dependency audit remains NOT GREEN: critical direct Next.js and high development brace-expansion findings; no dependency edits or waiver.
- Exact integrated closed rehearsal, physical browser/device/accessibility/performance and owner production acceptance.

## Optimized remaining roadmap

One S2 hardening/reconciliation window with recovery and immediate verification; then combine Hostinger environment/network/TLS/proxy/restart/readiness and Auth acceptance in a protected closed rehearsal once S2/B3 permit release. In parallel, close Drive private scope/conditional deletion/trained Defender reviewer+deputy, Resend deliverability/bounces/ambiguous intent, real-domain Turnstile, legal/content/media and retention classes/note erasure. Scheduler overlap/log/alert acceptance is required for worker activation. Finish exact-release physical testing and closed recovery rehearsal, owner acceptance, then separately scoped capability activation. No provider migration chain or DNS migration.

## Verification

External evidence root: `C:\Users\atikm\.codex\worktrees\pyramid-b4-evidence\b4b1-s1-20261001`. Contains catalog/grant metadata, counts, public sources and synthetic test output; no candidate row content/credentials. Node22.22.0, loopback-only disposable PostgreSQL17. Existing synthetic fixtures retained.

| Check | Result |
| --- | --- |
| Starting HEAD/tracking/remote/clean tree | PASS, expected SHA |
| Live inventory/history/roles/RLS/grants/defaults/size/counts/advisors | PASS inspection; required production actions above |
| First-eight ledger/checksums and eight catalog facets | PASS, exact match to fresh isolated replay |
| Current full-eleven schema delta | PASS, bounded and recorded |
| Eleven migration replay / Prisma validate/status/diff | PASS, zero drift; 29 RLS tables including ledger |
| B1 / B2 restricted regression | PASS, 2,092 / 142 checks; B1 includes 1,977 negative-isolation checks |
| Phase2B/C/D/E/F | PASS domain/Auth/read/portal/mutation |
| Phase2G/H/IB | PASS, 83 / 291 / 431 checks |
| Phase2IC1/C2B/D/E | PASS, 230 / 251 / 422 / 648 checks |
| Lint/typecheck/clean build/post-build typecheck | PASS |
| Closed production route smoke | PASS, 56 checks |
| Synthetic dump/restore/restricted checks | PASS; RLS/browser-grant/checksum fault injection rejected |
| Pool/transactions/timeouts/idle eviction/reconnect | PASS, 15 checks |
| Secret/canary/environment/client scans | PASS bounded scan |
| Dependency audit | NOT GREEN, separate B3 blocker |
| Historical bodies/migrations/schema/app/dependencies/diff whitespace | PASS |

Final targeted scan: 294 tracked/new files inventoried, exact 17-file change scope; eight URL-pattern matches were individually reviewed as unchanged schema-only/offline canary fixtures, zero unresolved credential findings. Historical bodies, all eleven migrations, Prisma schema, dependencies and application source match the baseline. Supabase target/gate regression rerun: 110 checks, zero provider calls.

## Current official Supabase documentation

Public sources were freshly retrieved October1; URLs/status/timestamps/SHA-256 are in public-sources.json.

- [Changelog](https://supabase.com/changelog.md) and [Data API announcement](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically): all-project new-object opt-in enforcement **October30, 2026** is future relative to this review. Existing grants/defaults still need deliberate audit; it is not retroactive evidence of closure.
- [Connections](https://supabase.com/docs/guides/database/connecting-to-postgres.md), [limits](https://supabase.com/docs/guides/database/connecting-to-postgres/pooling-and-limits.md), [TLS](https://supabase.com/docs/guides/platform/ssl-enforcement.md), [roles](https://supabase.com/docs/guides/database/postgres/roles.md), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security.md), [API security](https://supabase.com/docs/guides/api/securing-your-api.md): session/direct network fit, project-qualified custom login, verify-full, distinct grants and policies.
- [September25 engine notice](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes) announces PG15.19/17.11 security fixes. Live PG17.6 is older: assess project-supported upgrade and recovery in the pre-launch gate; S1 does not upgrade.
- [Node20 support notice](https://supabase.com/changelog/45715-deprecation-notice-dropping-support-for-node-js-20): support ended June30, 2026; retain Node22. [SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client.md) and [advanced SSR](https://supabase.com/docs/guides/auth/server-side/advanced-guide.md): preserve verified claims, refresh cookies and cache isolation. No optional Auth redesign.
- [Backups](https://supabase.com/docs/guides/platform/backups.md), [production checklist](https://supabase.com/docs/guides/deployment/going-into-prod.md): Free independent exports differ from paid daily recovery/PITR; actual recovery point remains unverified.

## Repository changes

17 files: new ADR0019/S1 record; architecture/plan/checklist/PhaseA supersession; historical B1/B4A/B4B1/ADR0017 notices; ADR0018 provider correction; environment/example/release/recovery updates; readiness Supabase target/role parsing and negative tests. Historical bodies and all migrations/schema/dependencies/application/Auth source preserved. Supabase target validation rejects wrong project/host, abandoned-provider host, transaction6543, weak TLS, extra query parameters and URL fragments.

## Live effects

SUPABASE READ-ONLY QUERIES: 11 successful catalog/aggregate SELECT batches, plus 2 failed read-only batches; one separate TLS-blocked connection before SQL. Provider project/organization/advisor/migration metadata calls are additional read-only operations.

SUPABASE PRODUCTION SCHEMA MUTATIONS: 0

SUPABASE PRODUCTION DATA MUTATIONS: 0

SUPABASE ROLE/GRANT MUTATIONS: 0

SUPABASE AUTH MUTATIONS: 0

NEON PROVIDER CALLS: 0

NEON MUTATIONS: 0

REAL CANDIDATE ROW CONTENT ACCESSED: 0

REAL CANDIDATE DATA MUTATED: 0

## Next programme gate

**S2 — Supabase production hardening/schema reconciliation, separately authorized under the exact requirements above. NOT STARTED.** S1 is complete; no further reconnection or provider migration is needed.

PHASE B4B1-S1: PASS

PRODUCTION DATABASE: SUPABASE POSTGRESQL

SUPABASE -> NEON MIGRATION: ABANDONED

NEON PRODUCTION DEPENDENCY: NO

SUPABASE DATA PRESERVED: YES

SUPABASE MIGRATION HISTORY: REQUIRES_ACTION

SUPABASE RLS: REQUIRES_ACTION

SUPABASE GRANTS: REQUIRES_ACTION

RUNTIME DB IDENTITY: REQUIRES_ACTION

HOSTINGER DB CONNECTIVITY: REQUIRES_LIVE_TEST

SUPABASE AUTH: REQUIRES_ACTION

PRODUCTION DATABASE MUTATIONS THIS PHASE: 0

REAL CANDIDATE DATA ACCESSED: NO

NEON CALLS: 0

B3 WORKTREE TOUCHED: NO

B3 SECURITY GATE: UPSTREAM DISCLOSURE BLOCKED

PRODUCTION DEPLOYMENT: NO

NEXT PHASE: NOT STARTED

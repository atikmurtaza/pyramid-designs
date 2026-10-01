# Phase B1 — Neon production database architecture and permission review

**ABANDONED BY OWNER ARCHITECTURE DECISION — 2026-10-01:** The Supabase-to-Neon programme and its provider/support/rehearsal/P3/P4 gates are retired. Supabase PostgreSQL is the production application database; Supabase Auth remains. This record is historical evidence. Portable security controls remain applicable subject to the current [S1 re-baseline](phase-b4b1-s1-supabase-rebaseline.md) and ADR 0019.

**Date:** 2026-09-30. **Current result: B1-R1 LOCAL ARCHITECTURE CLOSURE PASS.** The owner explicitly authorized migration 10 and conditional commit/push. See [B1-R1 closure](#b1-r1-closure) below for the final permission model, verification and production gates. Live Neon compatibility remains OWNER CONFIG REQUIRED; production migration/deployment and B2 have not started.

**Original assessment result: B1 MIGRATION REVIEW REQUIRED.** The following original assessment is retained as history. At that gate B1 was incomplete and could not be committed/pushed; no tenth migration had been created. Its blocked-state statements and nine-migration tests describe that earlier assessment, superseded only by the authorized R1 evidence below.

## Starting baseline and isolation

Fetched `origin/main`, actual remote main and B1 starting HEAD: `9de6ba306916136e7d55c34b14932938fa99b7a5`, `docs: audit production readiness`. B1 checkout: `C:\Users\atikm\.codex\worktrees\pyramid-b1\Pyramid Designs`; branch `phase/b1-neon-production-db`. It began with a clean worktree and empty staging area. No private environment file was copied or read in that checkout.

Protected primary: `C:\Users\atikm\Projects\Pyramid Designs`; branch `feat/frontend-redesign`; HEAD `108200b3ea981957ba2683a8c050db7adba2ef42`. Before content inspection, its exact branch/HEAD/porcelain-v2 status, tracked-path inventory and SHA-256 hashes for all modified and nonignored untracked files were saved outside both worktrees in `C:\Users\atikm\.codex\worktrees\pyramid-b1-evidence\primary-before.json`. Only Git metadata and database-specific prior work were read. No stash, reset, clean, switch, stage, commit, overwrite or deletion was performed there. Final preservation verification is recorded below.

Graphify guidance was checked: no `graphify-out/graph.json` exists in the isolated baseline, and no graph rebuild was requested. Source, migrations and approved ADRs remain the evidence authority. No graph/tool installation or generated graph was introduced.

## Existing Neon work assessment

No Neon-named commit was found in available Git history. The Neon work is uncommitted; it must not be treated as merged authority or as a current production cutover.

- Reviewed primary modifications: `.env.example`, `prisma.config.ts`, `prisma/schema.prisma`, `docs/architecture/system-architecture.md`, `docs/operations/backup-and-restore.md`.
- Reviewed primary untracked database files: old ADR `0016-neon-postgresql-supabase-staff-auth.md`, `docs/implementation/supabase-to-neon-migration.md`, and `scripts/migrate-supabase-to-neon.mjs`.
- Reused after independent installed-package verification: Prisma 6 `earlyAccess: true`, removing its unsupported config `datasource` option, and datasource `directUrl = env("DIRECT_URL")`. The installed `@prisma/config` type has `earlyAccess` and no `datasource` field. Fresh validation, typecheck, migration status and zero-difference schema check passed.
- Reused conceptually: pooled runtime/direct operator contract, verified TLS requirement, retained Supabase Auth/Google responsibilities and reconciliation before rollback. Current `.env.example` was edited narrowly so later email/challenge contracts remain intact.
- Superseded: the old Prisma fallback from `DIRECT_URL` to `DATABASE_URL`. Migration commands now reject missing/blank `DIRECT_URL`; they never substitute runtime credentials. A broken runtime URL with a valid disposable direct URL still passed migration status.
- Rejected for porting: old ADR number 0016, now occupied by `0016-public-intake-abuse-boundary.md`. New accepted provider decision uses ADR 0017. No historical ADR was overwritten.
- Not ported: the eight-migration snapshot-copy script and its live-provider evidence. It pins the old eight-migration baseline and ninth-migration divergence and performs data transfer outside B1's scope. Its historical 27-table snapshot, local provider configuration and recovery notes do not prove current source/target identity, data, roles, hosted connectivity or final production suitability.
- No frontend branch merge, source schema copy, old live verification, existing Neon resource use or wholesale documentation copy occurred.

## Authoritative target architecture

```text
APPLICATION DATABASE: NEON POSTGRESQL
AUTH PROVIDER: SUPABASE AUTH
RUNTIME DATABASE CLIENT: PG
PRISMA CLIENT RUNTIME: NO
PRISMA MIGRATION TOOLING: YES
```

[Phase A](phase-a-release-decisions.md) and [ADR 0017](../architecture/decisions/0017-neon-application-database-supabase-auth.md) supersede only the prior application-provider selection. Hostinger Node/Next.js → server-only `pg` → Neon. Supabase Auth identity, local staff/domain-role authorization and private Google Drive file bytes remain separate responsibilities.

The provider decision is accepted. Operational implementation is **NOT READY** while runtime RLS/locking permissions, live endpoint/role/TLS acceptance and migration planning remain incomplete.

## Neon documentation and provider assumptions

Official sources retrieved on **2026-09-30**. These facts are provider guidance, not confirmation of any chosen account/plan or deployed behavior. Earlier backup URL locations returned 404; the current official documentation index supplied the working paths below.

| Page title / official URL | Specific fact relied upon |
| --- | --- |
| [Connection pooling](https://neon.com/docs/connect/connection-pooling) | `-pooler` endpoint uses PgBouncer transaction pooling, not Supavisor session pooling. Direct connections are required for migrations/pg_dump/session-dependent operations. 10,000 accepted client connections is not 10,000 simultaneous backend transactions; backend limits depend on compute and pool budgets. |
| [Connect securely](https://neon.com/docs/connect/connect-securely) | Neon requires TLS; `verify-full` is the approved contract for certificate/hostname verification. Exact driver and Hostinger certificate behavior still needs acceptance. |
| [Manage roles](https://neon.com/docs/manage/roles) | Console/CLI/API-created roles receive `neon_superuser` membership, including broad administrative capabilities. Create least-privilege roles using SQL and inspect attributes/membership; a console connection string is not a safe runtime identity by default. |
| [Manage database access](https://neon.com/docs/manage/database-access) | Grant only needed database/schema/object privileges. PostgreSQL-version-dependent public-schema defaults must be audited rather than assumed. |
| [Scale to Zero](https://neon.com/docs/introduction/scale-to-zero) | Current docs describe five-minute inactive suspension and automatic wake-up; Free cannot disable it, paid plans can. These are guidance, not measured Hostinger cold-start timings or chosen-plan evidence. |
| [Backup strategies](https://neon.com/docs/postgres/backup-restore/backups) | Logical export/restore with PostgreSQL tools and provider instant restore are recovery inputs. Neither substitutes for an approved, verified recovery procedure. |
| [History window](https://neon.com/docs/postgres/backup-restore/history-window) | Detailed limits: Free defaults/caps at six hours with 1 GB history cap; Launch default one day/up to seven; Scale default one day/up to thirty. Actual plan/window is unverified. The overview's broader one-to-thirty-day wording must not be used to assume Free has a day. |
| [Instant restore](https://neon.com/docs/postgres/backup-restore/branch-restore) | Current guidance scopes PITR to root branches and overwrites the timeline of all databases on the branch, interrupting connections; it is not a selective merge. External Google files and Supabase Auth require separate reconciliation. |
| [Branching](https://neon.com/docs/introduction/branching) | Branches copy parent database contents. A production branch is not automatically safe synthetic infrastructure; do not clone real candidate data into tests. |
| [Migrate data from Postgres with pg_dump/pg_restore](https://neon.com/docs/import/migrate-from-postgres) | Direct-endpoint logical transfer is an input to later authorized migration planning, not an instruction to transfer data in B1. |
| [PgBouncer features](https://www.pgbouncer.org/features.html) | Transaction pooling does not preserve arbitrary session state. Transaction-local settings differ from session settings. |
| [PostgreSQL row security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) | Enabled RLS with no applicable policy denies nonowner, non-BYPASSRLS access despite table grants. Owners generally bypass RLS. |
| [PostgreSQL SELECT](https://www.postgresql.org/docs/current/sql-select.html) | All row-lock clauses, including FOR SHARE/KEY SHARE, require UPDATE privilege on at least one column of each locked table in addition to SELECT. |
| [node-postgres SSL](https://node-postgres.com/features/ssl) | URL SSL parameters and explicit SSL options interact; do not silently override verified TLS with insecure driver options. Installed `pg-connection-string` parsing of a synthetic verify-full URL was checked. |
| [Supabase changelog](https://supabase.com/changelog.md) | Reviewed for relevant Auth/database breaking changes. No Supabase Auth API was changed; self-hosted/realtime/Data API changes do not justify replacing the existing verified-claims boundary. |

## Connection architecture

`DATABASE_URL` is the server-only approved Neon pooled application-role URL; `DIRECT_URL` is the server-only direct migration/admin URL. Neither is NEXT_PUBLIC. `.env.example` contains empty database values and comments only. Migration/admin credentials must not be installed in normal Hostinger runtime. Final endpoint, branch/database, credential owner, `-pooler` versus direct hostname and `sslmode=verify-full` must be checked privately by authorized operators.

Current `src/lib/server/database.ts` is unchanged: one process singleton `pg.Pool`, maximum **3**, idle timeout **10,000 ms**, connection timeout **10,000 ms**, `application_name=pyramid-designs`. These are per-process limits; 19 build workers or an unknown hosted process count is not a proved deployment connection budget. No bound was increased.

One checked-out client performs BEGIN/callback/COMMIT, with rollback and fixed error on failure. Default isolation is READ COMMITTED. Existing executor arguments avoid nested independent transactions in the intake/file/worker flows reviewed; no savepoint/nested-transaction API is introduced. Existing deferred/immediate constraint checks and worker `FOR UPDATE SKIP LOCKED` stay intact. Schema-qualified tables and parameterized values are retained; some enum casts use the existing public search path, which final role defaults must preserve safely without schema CREATE privileges.

Worker transaction-local bounds remain statement 2 seconds, lock 1 second, idle-in-transaction 3 seconds. Candidate-file/intake transactions retain their existing 8-second statement/3-second lock bounds. No session advisory locks, LISTEN/NOTIFY or session-dependent prepared-query names were found in runtime flows reviewed. No extensions beyond default plpgsql or application sequences were needed in replay. PostgreSQL enum/UUID/JSONB, deferred triggers, row locks, make_interval, clock_timestamp and transaction CURRENT_TIMESTAMP semantics remain PostgreSQL responsibilities, not Supabase features.

The **local direct PostgreSQL** runtime check verified 24 concurrent queries use at most three backend connections, same-client transactions, READ COMMITTED/REPEATABLE READ, worker SET LOCAL values, bounded fourth-client queue failure, successful later work, terminated-idle-client reconnect, ten-second idle eviction, verify-full driver parsing and fixed transaction failure. It did not emulate Neon PgBouncer, DNS/TLS transport, proxy queue time or compute suspension.

Cold-start/compute wake-up can consume a significant part of the ten-second connection budget before worker/admission/staff/intake queries run. Measure cold and warm invocations through the actual Hostinger/Neon endpoint, including pooled queue delay and failed wake-up. Rate-limit/staff/database failure must remain unavailable/denied, not fall back to local counters or browser state. Do not weaken statement/lock/lease/security bounds to conceal wake-up latency. Paid always-active compute, if necessary, is an owner/plan decision, not a B1 assumption.

## Supabase Auth / Neon separation

Reviewed `auth/supabase.ts`, `auth/session.ts`, `auth/authorization.ts`, `repositories/staff.ts`, staff reads/mutations and candidate-file authorization. Existing flow: `supabase.auth.getClaims()` → subject/AAL → local `StaffUser.supabaseUserId` and current nonrevoked `UserRole` rows → active mapping → AAL2 → operation/target/state authorization. Domain `StaffRole` values are not PostgreSQL LOGIN-role names.

No runtime `auth.uid()`, `auth.jwt()`, request.jwt session-setting authority, Supabase `.from()` database request, Prisma Client or adapter runtime import was found. The Supabase service-role key remains unnecessary. Auth outage returns no verified identity; local mapping outage fails the sensitive operation. These code/offline proofs do not establish production Auth redirect, enrollment, revocation or hosted login acceptance.

## Runtime least-privilege design

**Design inventory only; no executable production grants or policies were applied.** Migration/owner identity owns schema/objects and executes reviewed DDL using direct access. Runtime must be nonowner, NOSUPERUSER, NOBYPASSRLS, NOCREATEDB, NOCREATEROLE, NOREPLICATION, without privileged membership/SET ROLE path or grant option. Explicit database CONNECT and schema USAGE are needed; schema CREATE, database CREATE/TEMP and migration-ledger access must be withheld from runtime after reviewing effective PUBLIC defaults. Future object defaults must remain closed until a reviewed grant/policy covers them.

The table matrix derives from current code and invoker-trigger dependencies. S=SELECT, I=INSERT, U=only the named mutable columns, D=bounded DELETE. U is not ALL PRIVILEGES and does not authorize bypassing server state rules. Column-level SELECT projections can be narrowed during migration review; this inventory does not grant unrestricted end-user data access.

| Application table (all 27) | Current legitimate operations / source and locking consequence |
| --- | --- |
| CompatibilityProbe | Diagnostic S/I/U(label) in compatibility-probe.ts only; excluded from intended production runtime after separately approved diagnostic cleanup. |
| StaffUser | S for verified mapping and current-principal checks; FOR SHARE currently conflicts with read-only runtime. `setStaffStatus` U(status, disabledAt, updatedAt) is exercised by verification tooling, not an authorized public role-administration workflow; operator authority remains separate. |
| UserRole | S for current nonrevoked domain roles; FOR SHARE conflicts. No runtime I/U/D provisioning grant. |
| Department | S for job/talent context and trigger validation; talent creation FOR SHARE conflicts. No current runtime administration writes. |
| Discipline | No current runtime operation; deny. Future content management needs separately reviewed rights. |
| Sector | No current runtime operation; deny. |
| Project | S/I/U(title, summary, version, updatedAt), staff-mutations.ts and repositories/projects.ts; legitimate mutable parent FOR UPDATE. No runtime D. |
| ProjectMedia | No current runtime operation; deny; later media management must review ordered attachment/state rights. |
| ProjectCredit | No current runtime operation; deny. |
| ProjectDiscipline | No current runtime operation; deny. |
| ProjectSector | No current runtime operation; deny. |
| JobLocation | S for staff job-detail join; no current runtime write or lock. |
| Job | S/U(lifecycleState, version, closedAt, archivedAt, updatedAt); legitimate mutable parent lock for closure/intake. No current runtime I/D. |
| JobQuestion | S for validation/snapshot and triggers; FOR UPDATE conflicts with current read-only runtime use. Later publishing cannot rewrite used questions. |
| JobQuestionOption | S for snapshot/answer validation; FOR SHARE conflicts. No current runtime I/U/D. |
| ConsentDefinition | S for active policy/evidence; FOR SHARE conflicts. Version content is immutable; no runtime policy-content write. |
| RetentionPolicy | S for expiry/evidence; FOR SHARE conflicts. No activation of real policies or six-month synthetic substitution in B1. |
| Application | S/I/U on reviewed lifecycle/contact-erasure columns; mutable parent serialization, staff transitions, file finalization and synthetic retention. Never D, primary-key/context/retention-clock rewriting or arbitrary snapshot changes. |
| ApplicationAnswer | S/I and D only for approved parent-locked erasure, including invoker-trigger evidence checks; no current U. |
| CandidateFile | S/I/U(technicalStatus, securityStatus, clearanceMethod, clearedAt, driveFileId, driveZoneCode, contentHash, deletedAt, version, updatedAt); exact parent/file locking, optimistic version and retention evidence remain mandatory. No D. |
| FileSecurityReview | S/I only; immutable hash-bound manual-review evidence. Duplicate lookup FOR UPDATE conflicts. No U/D grant, even to obtain a row lock. |
| CandidateConsent | S/I, including submission/retention invoker dependencies; append-only, no U/D. |
| ApplicationStatusEvent | S/I for hiring history and submission evidence; append-only, no U/D. This is the schema's hiring-status history table. |
| AuditEvent | S/I for staff/audit and notification/retention evidence; append-only, no U/D. |
| BackgroundJob | S/I/U(state, attemptCount, claimedAt, leaseUntil, claimToken, availableAt, completedAt, failureClass, errorSummary, updatedAt); claim/SKIP LOCKED/recovery/fencing. Completed retention jobs remain immutable by trigger; no D. |
| IdempotencyRecord | S/I/U(state, resultReference, requestHash, expiresAt), D only expired records in the staff-mutation scope. Existing uniqueness/scope/fencing predicates remain required. |
| RateLimitBucket | S/I/U(count); atomic ON CONFLICT count increment; no runtime D/reset fallback. |

Application U columns currently used: technicalStatus, hiringStatus, submittedAt, withdrawnAt, deletionRequestedAt, deletionCompletedAt, updatedAt; retention also clears fullName, email, city, phoneOrWhatsApp, specialism, portfolioUrl, professionalUrl, availabilityText, remoteAvailable, shortIntroduction, preferredEngagement, freelancerRateMinMinor, freelancerRateMaxMinor, rateCurrency, accommodationContactRequested, safeCampaignCode, experienceLevel and source. Existing constraints/tombstone triggers authorize combinations; column grants alone are not a replacement for those invariants or server authorization.

`_prisma_migrations` is the 28th replay table, with RLS: owner/tooling access only, no runtime grant. Public application sequences: **0**; no blanket sequence USAGE grant is justified. Existing enum types need only normal type USAGE, never type/schema ownership.

### Function inventory (all 17; no SECURITY DEFINER)

| Function(s) | Runtime need / authority |
| --- | --- |
| check_application_submission_evidence(uuid) | Nested invoker call from submission/file/retention triggers. Scoped EXECUTE and SELECT/locking dependencies need actual-role proof. |
| completed_retention_evidence(uuid) | Nested invoker call for tombstone integrity. Scoped EXECUTE and evidence-read dependencies need actual-role proof. |
| prevent_immutable_change() | Trigger only; always rejects evidence update/delete. No direct runtime EXECUTE endpoint. |
| protect_versioned_policy() | Trigger only; preserves version content/retirement transitions. No current runtime policy writes. |
| protect_used_job_question(), protect_used_job_question_option() | Trigger only; immutable used-question/option enforcement. Future admin changes require reviewed dependencies. |
| enforce_application_insert_context(), protect_application_context() | Trigger only; validates job/department context and protects it. Runtime must have invoker relation dependencies, not direct unrestricted function access. |
| protect_published_slug() | Trigger only on Project/Job; preserves published slugs. |
| enforce_cleared_file_review_evidence(), enforce_submitted_application_evidence() | Trigger only; validates clearance/submission and invokes helpers where applicable. |
| serialize_application_file_change() | Trigger only; mutable Application parent lock serializes file evidence. |
| guard_retention_application(), guard_retention_file() | Trigger only; authorizes complete, evidence-bound tombstone lifecycle. |
| protect_retention_job_evidence() | Trigger only; prevents modification of completed retention-job evidence. |
| guard_tombstone_answers(), guard_retention_review() | Trigger only; prevent answer/review changes after deletion responsibility, locking mutable Application/CandidateFile parents. |

Trigger invocation and SQL calls inside an invoker function are different privilege boundaries. Migration ownership needs trigger-creation/function EXECUTE; runtime needs the underlying relation privileges and EXECUTE for nested ordinary-function calls. Do not grant every trigger function as a direct endpoint. All 17 existing functions have fixed `search_path=pg_catalog, public`, `prosecdef=false`; no additional definer function was introduced.

## Row-locking conflict resolution — proposal, not implemented

PostgreSQL's lock privilege requirement was verified against docs and replay: S-only roles fail FOR SHARE/UPDATE with SQLSTATE 42501 even for empty selections. A nominal immutable row lock is not available without UPDATE authority. The eight conflicting read-only table groups are StaffUser, UserRole, Department, JobQuestion, JobQuestionOption, ConsentDefinition, RetentionPolicy and FileSecurityReview. Mutable Job/Application/CandidateFile/BackgroundJob/IdempotencyRecord locks already correspond to legitimate named writes.

Proposed minimum protocol for review:

1. **FileSecurityReview:** remove duplicate lookup's FOR UPDATE only after proving the existing `loadFile(..., true)` Application/CandidateFile parent locks serialize same-target review, and the unique idempotency key still rejects cross-target races. Evidence remains SELECT/INSERT-only. Recheck CLEAN/REJECTED/FAILED replay, same-key same/different target, hash mismatch, retention races and READ COMMITTED/REPEATABLE READ. No code change or claim of solved runtime concurrency is made here.
2. **StaffUser/UserRole:** preserve locking against disable/revoke and role additions throughout authorization. Removing locks or taking advisory locks that independent provisioners do not honor is unsafe. Review a constrained locking-only boundary owned by a separate nonlogin, non-runtime role, or another native protocol proved safe against all writers. Broad StaffUser/UserRole UPDATE is rejected.
3. **Department/policies/questions/options:** preserve active-policy retirement, parent publication and answer-snapshot stability. Locking only a parent is sufficient only where all child edits/additions/retirements share an enforced parent protocol; current external/operator writes must be included. Version immutability does not imply active status is immutable. Do not remove these locks by assumption.
4. If narrowly scoped SECURITY DEFINER locking functions are necessary, obtain explicit architecture review before implementation: schema-qualified fixed SQL; safe immutable search_path; no request-controlled identifiers/dynamic SQL; separate minimal nonlogin owner; no PUBLIC/anon/auth EXECUTE; runtime-only grants; exact UUID bounds and escalation/noninterference/concurrency tests. No all-powerful schema-owner wrapper or arbitrary SQL endpoint.

No UPDATE grant to immutable evidence was introduced, and no row-lock implementation was claimed complete. The negative proof establishes the blocker, not the safety of an unimplemented replacement.

## B1 MIGRATION REVIEW REQUIRED

**Exact need:** Nine migrations establish zero policies and no dedicated runtime privilege model. A nonowner NOBYPASSRLS runtime with SELECT/INSERT grants sees no protected rows and cannot insert. It additionally cannot issue eight read-only locking groups. Existing migrations reference Supabase compatibility roles `anon`/`authenticated` unconditionally; a clean Neon target needs restricted NOLOGIN compatibility roles (if absent) before replay, not actual Supabase Data API access.

**Proposed change for review:** a forward-only runtime permission migration, with stable nonlogin capability roles and owner-controlled environment-specific login membership; exact table/column grants and operation-specific RLS policies applying only to runtime capability roles, never PUBLIC/anon/authenticated; safe schema/database defaults and narrow ordinary helper EXECUTE; separately reviewed locking protocol/function boundary if needed. Runtime stays nonowner/non-BYPASSRLS. Compatibility-role provisioning precedes historical replay via reviewed operator bootstrap. No table data-model change is currently justified by changing providers.

**Why the existing migrations cannot establish it:** enabled RLS with no policies is default deny. Granting owner/neon_superuser/BYPASSRLS would evade the owner's explicit runtime constraints; broadly granting evidence UPDATE would violate immutable-evidence requirements; changing nine historical migration checksums would invalidate controlled replay. None is an acceptable alternative to review.

**Forward-only plan after approval:** agree the role/policy/locking specification and any required definer ADR; create the new migration only then; preserve all nine prior files/checksums; provision bootstrap roles in empty isolated infrastructure; replay nine plus the approved new migration; validate schema/ledger/RLS/scoped policies/effective defaults/function ownership; run every positive workflow and negative DDL/role/immutability/escalation/concurrency test under the actual proposed nonowner login; repeat all offline phases and live disposable Neon compatibility only with privately authorized configuration; review final diff/scan/audits. Existing zero-policy replay assertions must be deliberately updated to require zero **public** policies while accepting only the exact reviewed runtime policies. No production execution follows automatically.

## RLS / grants

Replay in fresh loopback `pyramid-b1-postgres`, PostgreSQL **17.10**, port **55441**, passed all **9** migrations from zero. **27 application tables + migration ledger = 28 RLS tables**, **0 policies**, **0 effective prohibited anon/authenticated table/function grants** (PUBLIC inheritance included). No schema migration SQL was edited or added. The compatibility roles were local disposable NOLOGIN/NOINHERIT/NOSUPERUSER/NOBYPASSRLS/NOCREATEDB/NOCREATEROLE identities.

The 27-check baseline blocker script creates its probe role/grants/fixture inside a transaction and rolls them all back. It proves zero-policy read denial, INSERT denial despite grants, all eight locking conflicts, immutable-review UPDATE denial, schema/table/role modification denial, BYPASSRLS escalation denial, role-grant denial, no membership and no leftover fixture/role. Its successful exit means **review required proved**, not least-privilege model passed. Full legitimate workflow positive tests under the proposed runtime remain blocked until review.

## Migration status

**REPOSITORY MIGRATIONS: 9. PRODUCTION MIGRATION PERFORMED: NO.** All nine were replayed without historical changes on disposable PostgreSQL. Prisma validate/status passed, and `prisma migrate diff --from-url <disposable direct URL> --to-schema-datamodel prisma/schema.prisma --exit-code` reported **No difference detected**. The directUrl contract is not a schema model change. No tenth migration or real-data import was created.

## Neon compatibility verification

**NEON LIVE COMPATIBILITY: OWNER CONFIG REQUIRED.** No live Neon project was connected to, created, modified or assumed to be production. The isolated checkout has no private `.env.local`; B1 never read/copied primary private environment or old project credentials.

**OWNER ACTION:** first review the concrete permission/locking migration proposal above. Separately identify approved synthetic-only disposable Neon infrastructure and provide configuration privately through the approved secret mechanism, not chat: SQL-created nonowner runtime login plus separate direct migration identity, exact branch/database/region, plan/history window, certificate support and accountable owner/deputy. After the approved permission migration exists, accept pooled transactions/SET LOCAL/SKIP LOCKED, cold/warm startup, exhaustion/reconnect/idle and Hostinger fail-closed behavior under actual roles. Final production configuration remains later controlled work.

## Backup/recovery inputs

Later recovery work should use direct-endpoint `pg_dump` custom-format logical exports, compatible `pg_restore` tooling, explicit schema/ledger/object/role expectations, encrypted approved storage and restricted credential access. Restore into a separately authorized isolated target and verify constraints, triggers, role/policy grants, Auth subject mappings, retention evidence/deletion replay and external-object references before accepting RPO/RTO.

Provider history/PITR is plan/window/cap-dependent; the chosen plan is unknown. Root-branch restore can overwrite all branch databases and discard later writes; branched contents may contain real data. Supabase Auth, Google file bytes, email receipts, Hostinger config and credentials are not recovered by a Neon application-data restore. Restored expired candidates/deletion responsibilities need authorized replay before reopening operations. Credential owner, deputy, export frequency, retention, exact RPO/RTO and passed rehearsal are unresolved. **BACKUP PLAN: NOT READY.** No export, provider snapshot or restore rehearsal was performed in B1.

## Supabase database decommissioning plan

Move only approved application-owned tables, schema/ledger and local subject/domain mappings in a later migration. Supabase Auth users/sessions/MFA remain at Supabase; do not delete its project/database or migrate its auth schema into Neon. The Supabase application schema can remain unused after controlled cutover, with writes quiesced and access restricted under a separately approved procedure.

Later verify every hosted process/tool/scheduler application DATABASE_URL points only to the approved Neon runtime role; DIRECT_URL is only in operator tooling. Inventory/revoke/rotate obsolete Supabase application credentials after accepted cutover/rollback window; never rotate retained Auth configuration blindly. Confirm no old source writers remain. Preserve a verified backup and rollback criteria; after Neon-only required writes, reconcile instead of simply restoring the old URL. No credential rotation, deletion or source mutation occurred here.

## Data migration assessment

Current real production data existence is **UNKNOWN**. B1 did not query production or an old live source. Repository fixtures/historical notes show synthetic development examples only; they do not prove any current live database is synthetic, empty or authoritative. Schema replay is not a data transfer. No candidate data moved.

Later source inventory must record authorized target/source identity, migration ledger/checksums, restricted counts/classes and writer provenance without exporting PII into chat or preview. Choose fresh schema-only production setup only if independently proving there are no required real records. Otherwise approve a bounded encrypted data transfer/delta/cutover procedure, integrity and subject/reference verification, writer quiescence, backup and rollback/reconciliation. Include new role/policy migration in the final release set. **PRODUCTION MIGRATION PLAN: NOT READY** until these facts and recovery/permission approvals exist.

## Full-admin workflow database implications

Full workflows are approved for later implementation, preserving AAL2, domain role/state/BOLA validation and evidence. Current primitives cover bounded project drafts, job closure, application/hiring transitions, file review/download, audit reads and worker/retention/notification lifecycles. Later management of media/credits/discipline/sector joins, locations, job publication/questions/options and versioned policies needs targeted writes/state/version/audit checks currently absent from normal runtime grants.

The existing schema lacks a dedicated application-note model; the original internal-notes requirement needs an explicit later design/migration decision, not invented general CRUD. Staff provisioning/revocation remains separately authorized operator capability. Used question/consent/evidence content and completed retention tombstones must stay immutable. Inventory is not implementation or advance permission. Careers still contains existing prototype role pages: owner-approved no-open-roles behavior requires a later content/workflow phase, not fake Job seeds. No Careers/UI/file-security semantics were changed in B1; no synthetic vacancy became production content through deployment.

## Dependency vulnerability assessment

Fresh full audit: **1 HIGH vulnerable transitive dev package** (`brace-expansion`), with six advisory/range entries across installed **1.1.18** and **5.0.9** copies. Paths: ESLint 9.39.1 → minimatch 3.1.5 → brace-expansion 1.1.18; eslint-config-next 16.3.3 → typescript-eslint 8.69.0 → typescript-estree → minimatch 10.2.6 → brace-expansion 5.0.9. Advisory identifiers: GHSA-q2hr-2g5m-vwhr, GHSA-qhr7-859c-m2p7 and GHSA-6j4f-fj2g-mc7p (CPU/recursion exhaustion).

Production `npm audit --omit=dev --json`: **0 vulnerabilities**. No production request caller was found. The package is reached by lint/dev tooling; current `next build --webpack` does not invoke ESLint (no prebuild/lint script), so a direct executed build path was not established. Dev packages still exist in the build environment; no claim of zero build/supply-chain exposure is made.

Registry confirmed same-line fixed versions **1.1.21** and **5.0.12** are available; dependency ranges permit a targeted lockfile refresh without broad direct upgrades. That would need exact lockfile diff, clean install, full/production audit and lint/build verification. B1 is stopped at a permission review gate, so no dependency mutation was bundled; record a dedicated minimal remediation task. **Full dependency audit remains a failed release gate**, not an accepted exception.

## Regression

Fresh isolated installation: `npm ci --ignore-scripts`, **415 packages installed / 416 audited**, pinned lockfile unchanged. Native host Node 24/npm 11; phase scripts and runtime check use Node **22.22.0**. Tests use explicit loopback synthetic databases, mock providers and blank real provider/Auth configuration; no live email/Google/Turnstile calls.

| Gate | Result |
| --- | --- |
| Nine migration replay / RLS / effective grants | PASS: 9, 28 RLS, zero policies/prohibited grants; repeated fresh replay for isolated later suites |
| Prisma validate / migrate status / schema diff | PASS; all nine current; zero model difference |
| Phase 2A pg; 2B, 2C, 2D, 2E, 2F | PASS markers; these suites do not emit exact assertion counts |
| Phase 2G | PASS, 83 checks |
| Phase 2H | PASS, 291 checks |
| Phase 2I-B | PASS, 431 checks (cumulative final total, not added to intermediate markers) |
| Phase 2I-C1 | PASS, 230 checks on fresh dedicated database |
| Phase 2I-C2B offline | PASS, 250 checks, live_requests=0 |
| Phase 2I-D | PASS, 422 checks, parallel admitted=20, live_requests=0 |
| Phase 2I-E offline | PASS, 648 checks, live_requests=0 |
| B1 permission/connection contract blocker proof | PASS expected-negative proof, 27 checks; restricted runtime workflows remain blocked |
| B1 local pg runtime | PASS, 15 checks; bounds, queue timeout, isolation, idle eviction/reconnect/failure; not live Neon |
| Production smoke | PASS, 32 checks; 92 client files scanned; closed intake/anonymous denial |
| Lint / typecheck / production build / post-build typecheck | PASS; build compiled and generated 18/18 static pages |
| Production dependency audit | PASS, zero vulnerabilities |
| Full dependency audit | FAIL, one HIGH dev package; no suppression or mutation |
| Diff/whitespace / canonical logo | PASS; LF-normalized master SHA-256 `2c5d2042ef020aa7ad37ff92e6fd9c3407ef305102ee49da3b6900ff99ffe60c` |

Counted totals: **2,432 checks**, plus passing Phase 2A–2F markers and migration/security/schema gates without assertion totals. Initial shared-database C1 run failed at `verify-phase-2ic1-notifications.mjs:132`, expected one admitted invocation but got zero; preceding worker tests retained admission state. No application change was made to hide it. Fresh C1 replay passed 230; C2B/D/E and production smoke each used separately created disposable databases. The expected forced-idle disconnect in the B1 pool test emits only the existing fixed `database_pool_idle_client_error` marker; this was intentional fault injection.

Positive regressions run with disposable migration/owner access and verify existing behavior. They do not validate the proposed least-privilege runtime. Actual-role positive workflow, approved policy, locking escalation tests and Neon live compatibility remain required after review.

## Security review

Final diff review scope: connection/runtime-owner separation, missing-direct fail-closed guard, no browser URLs, default-deny RLS, no PUBLIC/anon/auth grants, no historical migration edits, no definer/search-path or SQL interpolation addition in application code, retained parameterization/pool/transaction/SKIP LOCKED/worker fencing/rate-limit/retention/evidence/Auth boundaries. Two verifier scripts accept only loopback `phase2ib_*` targets and reject a private .env.local checkout; proof roles/fixtures roll back. Pool termination targets only the selected disposable database's `pyramid-designs` connections, never a remote endpoint.

**Remaining blockers:** reviewed role/policy/locking migration; actual-role positive/escalation/immutability concurrency proof; private live Neon/Hostinger acceptance; full dependency audit. The safe configuration-only reconciliation does not solve those. No broad evidence UPDATE, runtime owner role, privileged membership, public policy, production data transfer or stale Supabase application write was introduced. Review was a separate final read of the diff and test effects, not a claim of external independent security sign-off.

## Sensitive-data scan

Final scan inspected **10 intended files + 318 generated files = 328 files**, including built client/server output and test logs: **zero sensitive-pattern findings**; four explicitly synthetic database URL occurrences; no .env.local present or tracked. Database examples are empty assignments, variable names or synthetic loopback/placeholder test URLs only. Test identities use synthetic fixture data and example.invalid; existing approved fixed company email identities are not candidate data. No primary private env, credentials, tokens, JWT/cookies, production candidates or real connection string was read, copied, printed or staged. This is a bounded pattern/configuration audit, not a claim to have compared against unread private secrets.

## Documentation / ADR / commit / Git state

Created Phase A decisions, this B1 assessment and ADR 0017. Updated current system architecture, backup/deployment connection guidance and .env.example; historical phase records/migrations were untouched. Reconciled Prisma config/schema connection fields and added two runnable offline verifiers. No frontend/admin/legal/retention activation implementation.

**Commit: NONE.** Requested conditional message remains `feat: establish Neon production database architecture`; no commit SHA exists because B1 needs an unapproved forward migration and the full dependency audit fails. Nothing staged or pushed. B1 HEAD remains the baseline. Do not interpret local documents as a completed B1 release.

## Original closing verification

## B1-R1 pre-SQL design validation (2026-09-30)

Migration 10 is explicitly authorized by the B1-R1 request. The original assessment above remains historical evidence. The continuation starts at the same baseline with its ten review files and empty staging preserved. No next phase is authorized.

Executable paths were rechecked before migration SQL was written. Staff profile/read repositories SELECT local identity, current nonrevoked roles and minimized domain DTOs; Supabase verified claims, ACTIVE/AAL2 and target/state checks remain in server code. Project draft create/edit and job close/archive lock mutable parents, check versions/state, and atomically append audit plus scoped idempotency evidence. Application creation reserves idempotency, locks policy/context/questions, inserts snapshots/answers/consent, completes submission/history/audit/notification scheduling, and commits atomically; invalid context/evidence or collisions roll back. Hiring transitions lock Application and active staff and append ApplicationStatusEvent and audit. No staff provisioning or content-reference administration workflow exists at runtime.

File intake uses three bounded transactions around synthetic storage, authoritative Application/CandidateFile locks and a fenced background claim. Review rechecks current staff/roles before locking exact mutable parents, then appends immutable hash-bound evidence and performs state/version transitions with audit and notification scheduling. The duplicate FileSecurityReview row lock is redundant: same-target parents serialize it and a globally unique idempotencyKey rejects different-target collisions atomically. Workers retain SKIP LOCKED, leases/tokens, dedupe, bounded retry/DEAD/reclaim; notifications lock jobs and Application and append immutable schedule/send/receipt/reconciliation audit. Retention locks Application/files, establishes evidenced responsibility, erases answers/contact columns, tombstones files and completes the job with deferred evidence constraints; no production policy is activated. Global intake admission uses one atomic UPSERT: both count and expiresAt need UPDATE (the original inventory omitted expiresAt); a DB/counter failure remains fail-closed. All these paths use the existing same-client transactions and generic errors.

Selected design: operationally provisioned NOLOGIN `pyramid_runtime` capability, separate credential-bearing runtime login, and nonowner/non-BYPASSRLS NOLOGIN `pyramid_reference_locker`. Operation-specific runtime policies grant server-mediated row access, combined with exact relation/column/function privileges. Unused tables and migration ledger remain denied. Evidence receives SELECT/INSERT only. Answer DELETE requires a retention-pending parent; idempotency DELETE requires expired staff scope. Current SQL needs no table-wide UPDATE.

Seven read-only references require stable locks. A fixed, schema-qualified locking-only definer is necessary to avoid granting runtime UPDATE. Its owner has SELECT and UPDATE(id) solely on those references, SELECT/UPDATE policies with UPDATE WITH CHECK(false), no table ownership, no bypass, no login and no runtime membership. A rolled-back disposable prototype proved FOR SHARE returns the row while even UPDATE id=id fails with 42501. The function returns void and accepts only fixed branch names plus UUID; it performs no dynamic SQL or writes. Explicit lock calls precede separate reads so READ COMMITTED observes post-lock state; known policy IDs are rechecked after locking, never silently replaced by another unlocked policy. REPEATABLE READ conflicts retain PostgreSQL serialization failure semantics.

The migration operator must own database/application objects, have INHERIT and SET membership in the locking role for default-privilege administration/controlled ownership transfer, and provision the two stable restricted roles and browser sentinel roles in advance. An initial non-superuser experiment exposed the INHERIT requirement; it is now checked before migration work. Credential creation/rotation is operational. No superuser, provider-owned object or embedded credential is needed. Default function EXECUTE is revoked globally for the actual migration role and locking owner; public schema CREATE and database CREATE/TEMP are denied to browser/runtime roles. Future workflow privileges must accompany implemented, reviewed SQL paths.

**PRIMARY WORKTREE PRESERVED: YES.** Final branch/HEAD and all 10 status entries match the before snapshot; the 231 tracked-path inventory and all 10 changed-file hashes match. Final B1 HEAD, fetched origin/main and actual remote main remain `9de6ba306916136e7d55c34b14932938fa99b7a5`; staging is empty, with exactly 10 intended unstaged/untracked B1 files. Historical migrations, package/lockfile, application source/frontend and canonical logo are unchanged. Diff/whitespace checks passed for tracked and untracked changes. Sensitive scan is above. These local artifacts remain reviewable in the B1 worktree; evidence logs are ignored or outside the worktree. No worktree/container cleanup follows this phase stop.

```text
PHASE A DECISIONS RECORDED: YES
PHASE B1 COMMITTED: NO
PHASE B1 PUSHED: NO
APPLICATION DATABASE: NEON POSTGRESQL
AUTH PROVIDER: SUPABASE AUTH
NEON APPLICATION DATABASE ARCHITECTURE: NOT READY
SUPABASE AUTH SEPARATION: READY
RUNTIME LEAST-PRIVILEGE MODEL: NOT READY
NEON LIVE COMPATIBILITY: OWNER CONFIG REQUIRED
PRODUCTION MIGRATION PLAN: NOT READY
PRODUCTION DATABASE MIGRATED: NO
FULL ADMIN WORKFLOWS IMPLEMENTED: NO
LEGAL PAGES DRAFTED: NO
REAL CANDIDATE INTAKE: NO
PRODUCTION DEPLOYMENT: NO
NEXT PHASE HAS NOT STARTED.
```

## B1-R1 closure

**Result: local architecture closure PASS, 2026-09-30.** Exactly one forward migration was authorized and created: `20260930000000_phase_b1_runtime_permissions`. The nine historical SQL files retain their pre-R1 SHA-256 hashes. Repository migration count is **10**. No configured development/production database was connected to or modified. All R1 database work used newly created `phase2ib_b1r1_*` databases in loopback-only disposable PostgreSQL **17.10**; old disposable databases were retained.

### Final role and RLS contract

The migration creates no role or credential. Operators must first create restricted NOLOGIN `pyramid_runtime` and `pyramid_reference_locker` using SQL, and ensure `anon`/`authenticated` exist as restricted NOLOGIN sentinel roles if absent. Both capability roles must have no parent memberships, protected-object/database ownership, SUPERUSER, BYPASSRLS, CREATEDB, CREATEROLE or REPLICATION. Migration 10 checks these attributes/ownership preconditions before changing permissions. Existing column ACLs are explicitly revoked because table-level REVOKE alone does not clear them.

The migration operator owns the target database/application objects and can INHERIT and SET `pyramid_reference_locker`; these membership options are required for its default privileges and function ownership transfer. Provisioning is separate administrative work. A fresh non-superuser, non-BYPASSRLS owner with no CREATEROLE/CREATEDB successfully applies all ten migrations. No managed-provider superuser or provider-owned object is assumed. PostgreSQL **17** is the verified portability target; the SET membership check requires version 16 or newer. Confirm the chosen Neon engine before a separately authorized rehearsal.

A separate SQL-provisioned runtime LOGIN inherits only `pyramid_runtime`, without ADMIN OPTION or unrelated privileged membership, and owns no protected object/database. Privately generate/store/rotate its credential outside migrations. Inspect the actual login's attributes, effective grants/defaults and memberships before acceptance. `DATABASE_URL` belongs to that login and the approved pooled endpoint; `DIRECT_URL` belongs only to operator tooling and the direct endpoint. Normal hosted runtime receives no operator credential. Runtime may CONNECT, but cannot CREATE/TEMP in the database or CREATE in public/private schemas. The two stable capability roles have no credential lifecycle.

All **28** public tables retain RLS (27 application tables plus ledger). **54** policies are explicitly targeted: **40** runtime operation policies and **14** locking-owner policies. No policy targets PUBLIC, anon or authenticated. Runtime row visibility is deliberately broad within allowed operations because trusted server verified claims, local ACTIVE/current role lookup, AAL2 and operation/target/state validation remain authoritative. This is identity isolation, not a browser JWT/tenant policy system. A runtime credential is a trusted server capability; column permissions and constraints do not replace server authorization.

### Final privilege matrix

The original complete 27-table executable inventory remains above. Final privileges are:

- **SELECT only:** StaffUser, UserRole, Department, JobLocation, JobQuestion, JobQuestionOption, ConsentDefinition, RetentionPolicy. Staff/reference provisioning and policy activation are operator-only.
- **SELECT/INSERT only:** FileSecurityReview, CandidateConsent, ApplicationStatusEvent (actual hiring-history model), AuditEvent. No UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER or grant option.
- **Project:** SELECT/INSERT plus UPDATE(title, summary, version, updatedAt); no DELETE or publication-state/slug edits. Current server workflow inserts drafts and checks draft/version state on edits.
- **Job:** SELECT plus UPDATE(lifecycleState, version, closedAt, archivedAt, updatedAt); no INSERT/DELETE, question/content/slug/context writes.
- **Application:** SELECT/INSERT plus UPDATE of technical/hiring/submission/withdrawal/updated and deletion-responsibility/completion fields and the named contact/snapshot-erasure fields in migration 10. No primary-key/context, requiresClearedFile, retentionPolicyId, expiresAt or createdAt updates; no DELETE. Existing lifecycle/tombstone guards enforce evidence; server state authorization remains necessary.
- **ApplicationAnswer:** SELECT/INSERT; DELETE only when its Application is retention-pending. No UPDATE. Live answer deletion returns zero eligible rows under RLS.
- **CandidateFile:** SELECT/INSERT plus UPDATE(technicalStatus, securityStatus, clearanceMethod, clearedAt, driveFileId, driveZoneCode, contentHash, deletedAt, version, updatedAt); no DELETE or validation/metadata/context rewriting.
- **BackgroundJob:** SELECT/INSERT plus UPDATE(state, attemptCount, claimedAt, leaseUntil, claimToken, availableAt, completedAt, failureClass, errorSummary, updatedAt). No DELETE, job-type/target/payload/dedupe/maxAttempts/createdAt edits. Completed retention evidence remains trigger-protected.
- **IdempotencyRecord:** SELECT/INSERT plus UPDATE(state, resultReference, requestHash, expiresAt); DELETE only expired `staff:%` rows. No scope/key/createdAt rewrite or general cleanup privilege.
- **RateLimitBucket:** SELECT/INSERT plus UPDATE(count, expiresAt). No DELETE, key/window rewrite or runtime reset fallback.
- **No access:** CompatibilityProbe, Discipline, Sector, ProjectMedia, ProjectCredit, ProjectDiscipline, ProjectSector and `_prisma_migrations`.

There is **no table-wide UPDATE** grant. All 283 public columns are checked for exact effective runtime UPDATE and zero browser column rights, alongside the seven table privilege classes across all 28 tables. INSERT remains table-level on eleven tables for server-managed records/evidence; server validation and existing constraints govern inserted state. This avoids an unmaintainable second domain-authorization system. Future media/credits/joins, jobs/questions/publication, policies, notes and staff administration require narrowly reviewed schema/privilege extensions when their workflows are implemented, rather than speculative CRUD now.

### Locking and functions

Seven reference groups use the fixed locking-only definer in `pyramid_private`: StaffUser/UserRole, Department, ConsentDefinition, RetentionPolicy, JobQuestion/JobQuestionOption. Its NOLOGIN nonowner/NOBYPASSRLS owner has only SELECT and lock-required UPDATE(id) on those references, with UPDATE WITH CHECK(false). Existing immutable/reference triggers can reject writes before that RLS check; all attempted writes fail and none commits. Runtime has no membership in that role, no direct reference UPDATE and no function/schema ownership.

`lock_reference(text,uuid)` returns void; fixed CASE branches, fixed pg_catalog search_path, schema-qualified references, no dynamic SQL/writes, narrow UUID targets and explicit runtime EXECUTE. Temporary schema CREATE for ownership transfer is revoked immediately. PostgreSQL row locks stay with the caller's transaction. Active policy IDs are selected, locked and then those exact IDs reread; retirement between selection/lock fails closed. Job/question/option locks and current staff/role locks preserve parent/FK serialization. FileSecurityReview's redundant duplicate row lock is removed; exact Application/CandidateFile locks plus globally unique idempotencyKey serialize same-target replay and reject different-target collisions.

All **17** existing functions remain invokers with safe fixed search paths. Only `check_application_submission_evidence(uuid)` and `completed_retention_evidence(uuid)` need runtime EXECUTE because triggers invoke them; the other **15** are trigger-only and direct calls remain denied. The single new locking definer brings the function count to **18**. Browser/PUBLIC execution is revoked across both schemas. Global and public-schema function defaults for the actual migration creator are hardened, as are table/sequence defaults and locking-owner function defaults. Future operator roles or explicit grants must receive equivalent review; default privileges belong to the creating role, not a universal database rule.

### Verification and independent final security review

`run-phase-b1-disposable.mjs` creates fresh generated-credential owner/runtime identities and databases without dropping/resetting existing targets; it never reads `.env.local`. Administration credentials are excluded from child environments. Fixture setup/fault injection use explicit owner clients; application DATABASE_URL, singleton pools, transactions and domain calls in the new permission suite use the restricted login. Test owner credentials remain only in process memory, and output is sanitized before external logs are written. Container authentication is local trust; these tests establish authorization as separate login identities, not production password/TLS authentication. Production authentication is a later gate.

- **Restricted permission suite:** **2,021 checks per run**, repeated on three fresh databases (**6,063 executed checks**). Two deterministic SQL replays plus one actual Prisma migrate deploy; all ten applied, migration status current and Prisma model drift zero. Native deploy used the same realistic non-superuser owner. Status also succeeds with an unavailable runtime URL and valid DIRECT_URL; missing DIRECT_URL fails before connecting. Model drift does not introspect RLS/function/default ACLs; those are checked separately by SQL.
- **Negative isolation subset:** **1,906** counted checks per run. Direct immutable UPDATE/DELETE, unauthorized tables/ledger/functions, schema/table/temp/function creation, ALTER/DROP, GRANT/membership, SET ROLE/session authorization, BYPASSRLS/RLS-off, replication-trigger bypass and exclusive evidence locks fail or confer no privilege. Changing search_path cannot shadow qualified objects; invalid lock kinds fail. Browser/public equivalents cannot SELECT/INSERT/UPDATE/DELETE any application/ledger table or execute any of eighteen functions. New owner-created table/function defaults remain denied.
- **Positive workflow and concurrency:** verified claims fixture → restricted StaffUser/current roles → ACTIVE/AAL2 and role/target/state checks; staff content/application reads, draft create/edit/version/idempotency, hiring transition, job closure; job/talent intake/answers/consent/history/audit; candidate upload/quarantine/manual CLEAN/REJECTED/FAILED, same-key replay, hash mismatch and different-target key races; worker SKIP LOCKED/dedupe/token fencing/completion/retry/DEAD/expired reclaim/exhaustion and file reconciliation; notification schedule/send/acknowledgement reconciliation using in-memory adapters; genuine retention handler/tombstones and irreversible evidence. No production retention or provider request occurred.
- **Lock races:** seven reference locks block concurrent owner changes. READ COMMITTED same-file review commits once; REPEATABLE READ same-file race produces one commit and one **40001**, then safe idempotent retry. Stale staff snapshots cannot cross a later revocation under REPEATABLE READ. Policy retirement before lock is rejected. Mutable worker leases/tokens and global admission SQL are unchanged.
- **Global limiter:** normal/threshold/rollover, DB failure and invalid-counter failures pass; **20 admitted from 45** concurrent restricted-runtime requests.
- **Full historical offline regression:** Phase 2A–2F PASS markers; 2G **83**, 2H **291**, 2I-B **431**, 2I-C1 **230**, 2I-C2B **250**, 2I-D **422**, 2I-E **648**. Each uses its own fresh ten-migration database and owner-only fixture/malicious setup; these suites are regression evidence, not mislabeled restricted-runtime proof. Policy assertions now deny all policy targets except the two authorized roles; no browser guarantee was removed.
- **Runtime/quality:** pg pool contract **15** checks; production smoke **32** checks, **92** client files, using a restricted runtime login with operator URL absent; Prisma validate, lint, typecheck, production build (18/18 static pages) and post-build typecheck PASS. Counted execution total: **8,465**, including the three permission runs and counted regression/runtime/smoke checks, plus uncounted Phase 2A–2F/schema gates. The original 27-check nine-migration blocker proof is retained as historical evidence; its verifier now explicitly expects migration 10 pending when run against that old fixture.

The final security review was a separate reread of migration, runtime diff, membership/ownership/default ACLs and test evidence; no subagent/external sign-off is claimed. Initial non-superuser default-privilege denial exposed a missing INHERIT prerequisite, fixed and positively checked. Final review also cleared pre-existing column ACLs and both global/schema default grants. No blocking permission/security finding remains. Supabase Auth code/provider verification, server authorization, real-intake closure, retention gates and bounded worker/provider behavior remain intact.

### Dependency audit, portability and remaining production gates

Fresh full dependency audit still exits 1 with **one HIGH dev-only transitive brace-expansion** issue; production audit exits 0 with **zero vulnerabilities**. The recorded paths/advisories above remain the release-gap evidence. Package/lockfile are unchanged. The explicit R1 instruction defers this maintenance outside B1; it is not reported as a green full audit or a hidden waiver.

**NEON PORTABILITY: READY** for the documented PostgreSQL 17 operational contract: ordinary SQL-created restricted roles, owned application objects, controlled membership/ownership transfer and standard PostgreSQL RLS/ACL/default/locking features; no actual superuser, Neon password/URL or provider-owned-object dependency. Official Neon roles/database-access guidance retrieved on 2026-09-30 supports SQL role provisioning, whereas Console/API/CLI runtime identities would inherit administrative rights. **NEON LIVE COMPATIBILITY: OWNER CONFIG REQUIRED.** Three local replays do not prove real endpoint/branch, provider privilege edges, pooled execution, TLS, password authentication, cold starts or Hostinger behavior.

**PRODUCTION MIGRATION PLAN: NOT READY.** Remaining exact gates: owner-selected engine/target/region/plan/data boundaries; SQL-provisioned role/member/default-ACL audit and privately accepted separate pooled/direct verify-full credentials; separately authorized live synthetic rehearsal of pooling/SET LOCAL/locks/fencing/admission/timeout/reconnect/cold-warm behavior through Hostinger; source/target/real-data inventory and writer quiescence; accepted encrypted backup/restore/RPO/RTO and cross-provider reconciliation; explicit cutover/data-transfer/migration/rollback approval; hosted Auth/MFA/staff acceptance; approved legal and purpose-specific retention policies. These are production gates, not authorization to start them after B1. No production data migration, backup rehearsal, scheduler, email/Google/Turnstile request or deployment happened.

### Release evidence and hard stop

The original ten B1 review files were retained; additions are limited to migration 10, necessary locking/query changes and disposable/security regression utilities. Documentation preserves the original review history and records the subsequent explicit authorization. The protected primary remains on `feat/frontend-redesign` at `108200b3ea981957ba2683a8c050db7adba2ef42`; its 231 tracked paths, ten status entries and ten changed-file hashes match the preserved snapshot. Canonical logo and package/lockfile/historical migrations are preserved. Sensitive scan, staged review and exact commit/push identities are recorded externally alongside the release; no credential belongs in this document or commit.

Conditional release message: `feat: establish Neon production database architecture`. Push may occur only after frozen B1 gates and a fresh remote-main check against `9de6ba306916136e7d55c34b14932938fa99b7a5`, by normal fast-forward. A changed remote requires STOP, not rebase/merge/force. After release **STOP**: B2, live Neon verification, production data/migrations, retention/legal/admin workflow implementation, Hostinger/DNS, Auth onboarding, provider rehearsal, scheduler, real intake and cleanup remain unauthorized.

# Phase B4B1 — Neon live compatibility and recovery acceptance

**Latest H1 update, 2026-10-01:** Root cause is proven in the retained ephemeral R1 lifecycle invocation, not the committed P3A harness. Its empty project-root GET suffix failed a slash-only guard before fetch. The same helper has no method/resource allowlist or canonicalization; permitting the empty suffix alone cannot meet H1's required security boundary. H1 section 19's material-incompleteness stop applies. See [B4B1-P3B-H1 path-policy investigation and stop](#b4b1-p3b-h1-path-policy-investigation-and-stop). Result: OWNER ACTION REQUIRED; no harness correction, commit/push, Management API call, SQL connection or mutation; R2 NOT READY and NOT STARTED.

**Latest P3B-R1 update, 2026-10-01:** Credential presence and authenticated access to the exact project now pass; owner authorization and the unchanged 55-operation manifest are verified. R1 stopped before operation 1 when the local lifecycle invocation rejected its project-root request path with `API_PATH_DENIED`. See [B4B1-P3B-R1 stopped lifecycle invocation](#b4b1-p3b-r1-stopped-lifecycle-invocation). Result: FAIL; disposable branch NOT_CREATED; all provider/database mutations 0. No repair or retry occurred. P2's production classification remains HISTORICAL / data UNKNOWN. Earlier sections remain historical evidence; offline/local checks do not establish live Neon acceptance.

**P1 inspection update, 2026-10-01:** The authenticated Neon dashboard has now been inspected read-only. See [B4B1-P1 inspection and provisioning plan](#b4b1-p1-inspection-and-provisioning-plan) below. The original credential-unavailable acceptance attempt remains historical evidence. Final runtime identity/credentials must not be assumed to exist; dashboard identification does not authorize provisioning or establish schema/SQL acceptance.

**Date:** 2026-10-01 (Europe/London). **Result: OWNER ACTION REQUIRED — stopped before connection because both required database credentials are unavailable.** No live acceptance pass or provider failure is claimed. Production migration and the next provider phase remain prohibited.

## Repository and authority

Worktree: `C:\Users\atikm\.codex\worktrees\pyramid-b4\Pyramid Designs`. Branch: `phase/b4-production-readiness`. Starting HEAD: `c93b1e577260946c0ebd4ad7521a0bea2777c8f8`, `feat: establish production infrastructure readiness`. The working tree and staging area began clean. Local HEAD, tracking branch and actual remote feature branch matched this baseline before editing.

The primary checkout was not used. The B3 worktree was not entered, inspected or modified. Its supplied status remains **NEXT.JS SECURITY GATE: UPSTREAM DISCLOSURE BLOCKED**; B4B1 does not re-audit or waive it.

Authority is the current repository: AGENTS, [B1-R1 role contract](phase-b1-neon-production-database.md#b1-r1-closure), [B2-R1 continuation](phase-b2-full-admin-workflows.md#b2-r1-implementation-continuation--2026-09-30), [B4A record](phase-b4a-production-infrastructure-readiness.md), [ADR 0017](../architecture/decisions/0017-neon-application-database-supabase-auth.md), [ADR 0018](../architecture/decisions/0018-closed-deployment-and-capability-activation.md), [environment contract](../operations/production-environment.md) and [release runbook](../operations/production-release.md). Historical assessment stops/counts in B1/B2 are superseded by their authorized closure sections. Older provider experiments do not establish this live target.

The existing schema, 11 migration files, runtime/configuration modules and B4 scripts were inspected/inventoried. No existing Graphify index is present. No graph installation, generated graph, new verifier or dependency change was needed. Credential absence stopped all live inspection and rehearsal; no production schema comparison was completed.

## Credential availability and stop

Names-only checks found **DATABASE_URL absent** and **DIRECT_URL absent** in the inherited process environment, Windows user environment and Windows machine environment. No private environment file, secret store contents, credential value or connection string was read, printed, copied or requested. Credentials that may exist elsewhere are not available to this execution context and were not sought in the primary checkout or another worktree.

No independently confirmed expected Neon endpoint/project/branch/database was supplied. Optional Neon API/project environment names were also absent; they are not prerequisites for the existing SQL checker and no API credential is requested just to perform read-only SQL acceptance.

The explicit credential-unavailable stop applies. No connection attempt, SQL statement, Prisma migration command, application workflow, provider API call, branch creation, backup or restore was executed. Documentation and repository verification only continued to record the blocker.

## Target safety and live classification

**Target safety: OWNER ACTION REQUIRED.** With no credentials or independently approved target, Neon-controlled hostname, non-local/non-Supabase target, exclusion of other projects, matching intended database/branch, distinct login identities and verified TLS cannot be established. No hostname, role-login name or database identifier is published.

**PRODUCTION SCHEMA STATE: UNKNOWN (unobserved).** Categories EMPTY, CURRENT, HISTORICAL and PARTIAL cannot be assigned. UNKNOWN here does not assert that an inspected target contained unexpected objects. Familiar table names or old experiment records are not accepted as current architecture. Historical/divergent state, overprivileged runtime or missing separation must stop a resumed phase before mutation.

## PostgreSQL and schema/migration state

**Live PostgreSQL version: NOT OBSERVED. LIVE NEON COMPATIBILITY: OWNER ACTION REQUIRED.** PostgreSQL 17 is the repository acceptance requirement, not an observed live version. Runtime access remains server-only `pg`; Prisma remains schema/migration tooling without Prisma Client runtime. Neon is the application database; Supabase remains Auth.

The committed B4 contract describes 28 non-ledger relations, 280 non-ledger columns, 80 policies and 22 functions across public/private application schemas. B4A records 29 RLS-enabled public tables including the migration ledger. These are repository/local-replay expectations, not B4B1 live measurements. The repository still contains 11 migrations ending in `20260930010000_phase_b2_admin_workflows`; no migration file or schema was changed.

Applied versions, checksums, pending/failed migration history, object ownership, live drift and historical divergence remain unobserved. No source/target data comparison or corrective DDL occurred.

## Runtime identity acceptance

**RUNTIME IDENTITY: OWNER ACTION REQUIRED.** DATABASE_URL must use the intended Neon pooled endpoint and a separate SQL-provisioned restricted LOGIN that inherits only `pyramid_runtime`, without ADMIN OPTION, unrelated privileged membership or a SET path to `pyramid_reference_locker`. It owns no database/schema/table/function and has no SUPERUSER, BYPASSRLS, CREATEDB, CREATEROLE, REPLICATION, database CREATE/TEMP, schema CREATE, grant option or migration-ledger access. Both capability roles are restricted NOLOGIN roles without parent memberships.

Current rights must match migration 10 **plus migration 11**, not the original B1-only matrix. This includes exact column UPDATE grants, bounded retention/expired-idempotency/draft-relationship/unused-option DELETE policies, and no arbitrary record deletion. AuditEvent, ApplicationStatusEvent, CandidateConsent, FileSecurityReview and InternalNote remain append-only. B2 adds reviewed content/job/note rights while server ACTIVE/current-role/AAL2/state authorization remains authoritative.

Function EXECUTE, fixed SECURITY DEFINER search path/ownership, locking-only reference permissions, RLS, PUBLIC/anon/authenticated denial, object/default ACLs and effective grants must all be checked. None was tested on Neon. No destructive privilege probe or synthetic transaction was run against production.

## Operator identity acceptance

**OPERATOR IDENTITY: OWNER ACTION REQUIRED.** DIRECT_URL must use the same intended branch/database through the direct endpoint with a distinct migration/operator LOGIN. It must own the database/application objects and have the documented INHERIT/SET relationship to `pyramid_reference_locker` for creator defaults and function ownership transfer. The locking function's restricted owner is the deliberate ownership exception. Migration-ledger access and operational ability to establish the restricted capability roles require separate verification/provisioning authority.

DIRECT_URL is operator-only and must never be injected into normal application/build/scheduler runtime. A privileged operator URL cannot substitute for missing runtime credentials. No production role creation, membership/grant change or migration is authorized by this record. No migration deploy was executed.

## Existing acceptance tooling and remaining checks

`scripts/production-database-readiness.mjs` is reused as the acceptance authority; it never loads private environment files. Its target validator requires an independently confirmed expected endpoint, runtime pooler versus direct operator mode, Neon hostname, `sslmode=verify-full`, allowed URL parameters and port. It uses one bounded `pg.Client` per invocation, startup read-only defaults, BEGIN READ ONLY, transaction-local search path, catalog SELECTs and ROLLBACK. Fixed failure output suppresses values/topology/rows.

Operator mode verifies finished migration names/checksums with LF/CRLF transport equivalence. Both modes compare catalog/security facets to the committed independently replayed contract; runtime mode compares effective login permissions. A full-state checker pass is deliberately unavailable for an empty, historical or partial target. On resumption, target safety and observational classification must precede full-state acceptance. Never rebaseline the contract from production or run migrations to obtain a green result.

Live SQL connection, certificate/hostname validation, authentication, role membership, RLS, policies, functions, defaults, privileges, catalog drift, transaction behavior and connection timing were **NOT RUN**. This stop has not exposed a provider-compatibility defect and does not justify modifying the checker.

## Connection pooling and budget

Current `src/lib/server/database.ts` uses one singleton pool per process: **max 3**, **idle timeout 10,000 ms**, **connection timeout 10,000 ms**, **application_name pyramid-designs**. Transactions use one checked-out client for BEGIN/work/COMMIT or rollback. Worker HTTP handling in that same process shares its pool; a separately running worker process would have its own three-slot pool. No limit was increased.

`src/lib/server/health.ts` creates a separate max-1 pool for **each concurrent authenticated readiness request**, then closes it. It is not one globally shared readiness connection. Reserve H connections for H simultaneous readiness calls, across all processes.

For A application processes and W independent worker processes, the source-derived client connection ceiling is **3A + 3W + H + O**, where O is concurrent operator/tool connections. The read-only checker uses one operator connection per invocation; the eventual Prisma migration engine's concurrency has not been measured, so its budget is not asserted to be one.

- One application process, worker handled inside it: up to 3 application connections, plus H and O.
- One application process plus one independent worker process: up to 6, plus H and O.
- Old/new application processes overlapping during restart: up to 6, plus H and O, without an independent worker.
- Overlap of both a separate application and worker process: up to 12, plus H and O.

These are client-side planning ceilings, not measured Neon backend use or accepted provider limits. Actual Hostinger instance/process count, drain/overlap, readiness concurrency, Neon pooling/backend/compute limits, cold/warm wake-up and TLS transport remain unverified. No Hostinger configuration or acceptance was started.

## Disposable Neon and migration rehearsal

**DISPOSABLE NEON REHEARSAL: NOT RUN. MIGRATION REHEARSAL: NOT RUN.** The B4 disposable runner is a local loopback-only PostgreSQL harness, not Neon branch lifecycle tooling. Its fixed loopback/port checks must not be bypassed or repointed to Neon. No safe owner-configured disposable remote target was established; no provider API was improvised.

Before a future provider rehearsal, first establish production target identity and data classification. A branch derived from production is not authorized while real/sensitive data status is unknown. If production is independently proven empty, identify an explicitly approved disposable branch and isolated credentials/tooling; otherwise obtain explicit data-cloning authorization or use a separately approved empty target. Production migration remains a later release decision even when compatibility passes.

B4A's recorded local 11-migration replay, zero drift, restricted B1/B2 suites and logical dump/restore remain prior local evidence. They were not rerun or relabelled as live Neon evidence in B4B1.

## Recovery/restore acceptance

**NEON RECOVERY: OWNER VERIFICATION REQUIRED.** Actual account plan, configured history/retention window and limits, available restore points, backup facilities, branch/PITR mechanism and scope, authorized owner/deputy access and operational recovery impact are unobserved. **Expected RPO: UNVERIFIED. Expected RTO: UNVERIFIED.** No generic provider documentation or local restore duration substitutes for those account and business decisions.

Owner verification must record the actual settings and available recovery mechanism without exposing credentials or rows, including earliest/latest restore points, branch/database scope, any connection interruption or overwrite implications, and restrictions affecting an isolated recovery target. Record named operator/deputy permissions, encrypted logical-backup storage/key access, business-approved RPO/RTO and the validation/return-to-service decision. A retention window alone is not a measured RPO or RTO.

Recovery validation on a separately approved synthetic disposable target must include migration history/checksums, schema/catalog drift, RLS/policies/function owner/search path/defaults, restricted runtime/B1/B2 synthetic workflows, data-integrity aggregates and timed operator/deputy execution. B4A's logical restore required restoration of locking-function ownership and revocation of fresh-database CREATE/TEMP; these remain prerequisites. Auth/Drive/email reconciliation belongs to the approved recovery procedure, not permission to start their provider configuration here. No production restore or disposable remote recovery occurred.

## Owner actions required to resume B4B1

1. Privately make **both existing final intended credentials** available to the process executing this B4 worktree: DATABASE_URL for the separate restricted runtime LOGIN through the pooled endpoint; DIRECT_URL for the migration/operator LOGIN through the direct endpoint. Preserve `sslmode=verify-full`. Use protected secret injection, never chat, screenshots, committed files or literal shell-history values. If user-level settings were changed after the app started, ensure the execution process actually inherits them before resuming. Do not substitute another project's URL or an operator login for runtime.
2. Independently confirm and retain the exact company Neon project, branch, database, region, PostgreSQL version and matching expected endpoint in restricted operator configuration. The checker expects the endpoint through its existing `--expected-endpoint` option; no new environment-variable convention is introduced. Confirm both credentials refer to that same approved database and logically distinct logins before any SQL.
3. If the final identities or required role architecture do not already exist, report that prerequisite and seek a separately authorized provisioning/migration plan. **Do not create roles, change grants, migrate, reset, copy historical data or repair production in B4B1.** Historical/partial state needs review of an exact safe forward path first.
4. Inspect the intended project's recovery settings and operator/deputy capabilities as described above. Supply only redacted settings/status evidence and approved recovery objectives, never credentials or candidate contents. Identify safe disposable branch lifecycle tooling/target only after production data classification permits it; otherwise leave remote rehearsal pending.

These actions do not authorize Hostinger, production Auth, Drive, Resend, Turnstile, scheduler, DNS, deployment, capability activation or the next phase.

## Repository changes and verification

Documentation only: this B4B1 blocked-acceptance record and a B4A owner-register pointer. No source/tooling, package manifest/lockfile, Next.js/React, Prisma schema or migration change was made. No B3 path was accessed.

Working whitespace and protected-path checks passed. The existing B4 boundary/sensitive scan passed: **320 files, two changed documents, 96 existing client assets, 32 environment consumers, zero bounded-pattern findings**. The existing artifacts are B4A build output; this scan is not a new production build or live acceptance result. Exact staged whitespace/sensitive checks and feature-branch-only commit/push identity verification are required at release closure. No application lint/typecheck/test/build rerun is required for this documentation-only stop. The full B1/B2 suite and database verifiers are not run without the required target/credentials.

Conditional documentation commit: `docs: record Neon production acceptance`, pushed only to `phase/b4-production-readiness`; no merge or main update. Git completion and exact SHA are reported with the release result; a published blocker record does not make acceptance pass.

## Live effects

PRODUCTION DATABASE READ-ONLY CONNECTIONS: 0

PRODUCTION DATABASE MUTATIONS: 0

PRODUCTION MIGRATIONS: 0

DISPOSABLE NEON BRANCHES CREATED: 0

DISPOSABLE NEON BRANCHES REMOVED: 0

REAL CANDIDATE RECORDS READ: 0

REAL CANDIDATE RECORDS WRITTEN: 0

## Final gate status

PHASE B4B1: OWNER ACTION REQUIRED

LIVE NEON COMPATIBILITY: OWNER ACTION REQUIRED

RUNTIME IDENTITY: OWNER ACTION REQUIRED

OPERATOR IDENTITY: OWNER ACTION REQUIRED

PRODUCTION SCHEMA STATE: UNKNOWN

DISPOSABLE NEON REHEARSAL: NOT RUN

NEON RECOVERY ACCEPTANCE: OWNER VERIFICATION REQUIRED

PRODUCTION DATABASE MUTATIONS: 0

PRODUCTION MIGRATIONS: 0

REAL CANDIDATE DATA ACCESSED: NO

B3 WORKTREE TOUCHED: NO

B3 SECURITY GATE: UPSTREAM DISCLOSURE BLOCKED

PRODUCTION DEPLOYMENT: NO

NEXT PHASE: NOT STARTED

## B4B1-P1 inspection and provisioning plan

**Date:** 2026-10-01 (Europe/London). **Result: OWNER ACTION REQUIRED.** Inspection/planning completed; production schema and identity privileges remain unverified. No SQL, credential reveal/copy/reset, provider mutation, branch creation, production migration or deployment was performed. The existing authenticated Neon browser session was used; no credentials were requested.

### Repository and evidence boundary

Verified first: clean B4 worktree, branch `phase/b4-production-readiness`, HEAD `d05971672158d0953875da6f998cfef0bb65b001`. Reviewed AGENTS, relevant website-plan gates/Phase A/ADRs, all 11 migrations, Prisma schema/config, B1-R1 and B2-R1 contracts, B4A/B4B1, environment/release/recovery procedures, provisioning/permission/catalog tooling and runtime pg configuration. No existing Graphify index; no graph installation/rebuild. B3 was not accessed.

Sources below are authenticated dashboard observations on this date, not SQL measurements. The public official [Manage roles](https://neon.com/docs/manage/roles) page was also inspected directly: SQL-created restricted LOGIN/NOLOGIN roles are supported; Console/CLI/API-created roles receive administrative neon_superuser membership. Provider documentation does not establish any existing role's actual membership. No Tables, SQL Editor, preview-data or domain-data view was opened.

### Project, branches, database and roles

- **PROJECT IDENTIFIED: YES.** The selected account's project list contains one project, `pyramid-design-production`, ID `withered-feather-01662312`; no competing Pyramid project was listed.
- **REGION:** AWS Asia Pacific 1 (Singapore). **POSTGRESQL VERSION:** 17. **PLAN:** Free. Region/plan suitability still requires owner acceptance.
- **BRANCHES:** `migration-baseline` (`br-still-lab-b3q03yuz`), default/root, created September 10, 2026; `migration-synthetic-verification` (`br-square-resonance-b3ew5c59`), child of migration-baseline, created September 10, 2026. The child is archived, with displayed archive timestamp `2026-09-24 17:31:36` and Idle compute. The default branch showed Active compute during the inspection; its initial view had an archived notice. No SQL/unarchive or compute-setting action was submitted.
- **INTENDED PRODUCTION BRANCH:** UNCONFIRMED. The default branch is the candidate; default status and names do not constitute owner designation. The child is not accepted as disposable/synthetic merely from its name.
- **DATABASES:** Each branch's database list shows `pyramid_design`, owner `pyramid_owner`. Both list one database/one compute. Default compute shows 0.25 to 1 CU; child shows 0.25 CU.
- **ROLES:** Both branches list `pyramid_owner`, `anon`, `authenticated`; only pyramid_owner is shown owning pyramid_design. Connection-role choices on the default branch match those three names.
- **PRIOR USE:** Default branch displayed 33.64 MB storage and 0.23 CU-hours cumulative compute; the child overview displayed 33.21 MB and 0.08 CU-hours. This is prior resource usage, not proof of candidate data, current schema or required migration history.
- **PRODUCTION SCHEMA STATE: UNVERIFIED.** No schema/table/ledger or row query was performed. Real/sensitive data status is UNKNOWN.

### Actual versus required identities

- `pyramid_owner`: **EXISTS**, database owner and selectable connection identity. Candidate operator only. Actual LOGIN attributes, administrative authority, parent memberships, public/private schema and object ownership, creator defaults and migration history are UNKNOWN.
- `anon`, `authenticated`: **EXISTS**, but restricted NOLOGIN sentinel suitability is UNKNOWN. Their appearance in connection-role choices does not establish safe sentinel attributes. Validate before reusing; do not blindly recreate, alter or remove them.
- `pyramid_runtime`, `pyramid_reference_locker`: **UNKNOWN** at PostgreSQL catalog level; neither is dashboard-listed. Do not treat absence from a management view as an exhaustive pg_roles inventory. Later SQL must verify absence or validate an existing role before any CREATE.
- Dedicated application runtime LOGIN: **no suitable identity identified** among the listed connection roles; actual restricted-runtime existence is **UNKNOWN** pending catalog inspection. A proposed new runtime name is a placeholder, not an observed identity.

### Exact repository role architecture

No committed migration creates a role or runtime LOGIN. Migration 10 explicitly requires operationally pre-provisioned restricted NOLOGIN pyramid_runtime and pyramid_reference_locker; both must have no privileged flags, parent memberships or object/database ownership. Restricted sentinel roles anon/authenticated must exist before migration 2, which references them unconditionally.

The migration operator must own the database/application schemas and tables, enums, ordinary functions and migration ledger, with INHERIT TRUE and SET TRUE membership in pyramid_reference_locker. Actual public schema ownership may use PostgreSQL's pg_database_owner mechanism; verify effective authority. The sole deliberate function-owner exception is pyramid_private.lock_reference(text,uuid), owned by pyramid_reference_locker. Migration 10 grants that owner temporary private-schema CREATE for transfer, then revokes it, and hardens creator-specific global/schema defaults. Migration 11 replaces the locking function under the operator without changing its restricted owner. No blanket ownership repair or manual duplicate table/function grants are proposed.

Runtime must be a separate SQL-created LOGIN, INHERIT, with only pyramid_runtime membership, no ADMIN OPTION and SET reachability only to that capability. The existing checker explicitly expects SET pyramid_runtime to be possible; disabling SET for that sole membership would fail the approved contract. No locker/operator/neon_superuser/browser-role membership is permitted. Runtime owns no database/schema/table/function and has no SUPERUSER, BYPASSRLS, CREATEDB, CREATEROLE, REPLICATION, database CREATE/TEMP, schema CREATE, grant option, migration-ledger access or arbitrary immutable-evidence UPDATE/DELETE.

Current rights are the combined migrations 10 and 11, verified by the exact B1 permission manifest and B4 contract: 27 readable application relations, 18 insertable relations; UPDATE only on the named columns of Project, Job, JobQuestion, ProjectMedia, Application, CandidateFile, BackgroundJob, IdempotencyRecord and RateLimitBucket; DELETE only on ApplicationAnswer, IdempotencyRecord, ProjectCredit, ProjectDiscipline, ProjectSector and JobQuestionOption under their retention/expired-staff/draft-unused policies. AuditEvent, ApplicationStatusEvent, CandidateConsent, FileSecurityReview and InternalNote remain SELECT/INSERT only. CompatibilityProbe and migration ledger are runtime-denied. No table-wide UPDATE, TRUNCATE, REFERENCES or TRIGGER rights are granted. Runtime EXECUTE is limited to the two invoker evidence helpers and fixed private lock function; other functions are trigger-only. Current expected full state: 29 RLS-enabled public tables including ledger, 80 policies, 22 functions. These are repository expectations, not Neon observations.

The capability roles and operator locking membership must exist before migration 10; creating them before the entire ordered replay is simplest. Runtime LOGIN is not required to apply migrations: it may be created during bootstrap, as in the disposable harnesses, or after migrations. This plan creates it after migration verification in the disposable target. Production identities are not activated by that rehearsal.

Neon's documented SQL role model can represent this architecture. The dashboard does not prove that pyramid_owner can perform the specific grants/default-ACL/ownership operations, or that existing objects/roles satisfy it. Provider-owned or unexpected public/private objects must be reviewed; never weaken the checker or rebaseline it from production.

### Connections and recovery observed

**DIRECT CONNECTION AVAILABLE: YES. POOLED CONNECTION AVAILABLE: YES.** The default branch's connection dialog exposes the same primary compute, pyramid_design and selectable pyramid_owner with pooling on/off. No password reveal, snippet copy or credential output occurred. Only safe booleans/role/database/TLS-option metadata were retained; endpoint/DSN values are omitted from this document.

Displayed templates use sslmode=require and channel_binding=require. Final DIRECT_URL and DATABASE_URL must instead satisfy the existing sslmode=verify-full contract and be tested with actual pg/Prisma transport. The optional channel_binding parameter is allowed by the checker; its presence is not proof of driver enforcement. Direct operator and pooled runtime must refer to the same owner-approved branch/database/endpoint identity. DIRECT_URL is absent from builds, application and scheduler runtime; DATABASE_URL contains only the restricted runtime identity, server-only. No value was set.

**RECOVERY CAPABILITY: PARTIAL.** Backup & Restore shows a six-hour history window and point-in-time restore controls on migration-baseline. At the inspected view the earliest time was **September 30, 2026, 7:14 pm (GMT+1)**; the date-time selector showed October 1, 2026, 1:14 am in Europe/London. These are transient UI observations, not a guaranteed/latest recoverable point. No preview/restore was invoked. Snapshot area says **No snapshots, no schedule set**; scheduled snapshots require upgrade. Postgres settings describe history for instant restore/time travel/branching, and upgrade for a larger window; Free plan update scheduling is provider-managed. Compute defaults show 0.25 CU and five-minute scale-to-zero, with upgrade required for size/scale-to-zero controls; defaults do not prove every existing compute's settings. No independent logical backup, encryption/key/deputy access, successful restore, RPO or RTO is verified. General settings show the default branch is not protected; protection/expiration controls there were disabled. None was changed.

### Disposable branch strategy

**DISPOSABLE BRANCH CAPABILITY: AVAILABLE.** The New Branch form opened without creating anything: it reported eight more branches available and offered data-and-schema (default), past-point data-and-schema, schema-only Beta and anonymized-data Beta. Schema-only explicitly says no data included and displayed 536.87 MB remaining space. The form's one-day auto-delete default was observed only; no setting or branch was saved. Database/backend connection limits and performance/cold-wake behavior remain unverified.

Default branching would copy existing parent data. Because real/sensitive data status is UNKNOWN, no default data clone is acceptable. Even schema-only copies existing schema and may preserve role/credential architecture; it is not a migration-from-zero database or an independent credential boundary. Under later explicit approval, use schema-only only after verifying its scope, then create a separately named genuinely empty database in that disposable branch, owned by the approved rehearsal operator. Validate inherited roles/defaults; establish independent rehearsal runtime credentials privately. Do not reuse either existing branch or database as a clean fixture merely from its name. If schema-only/provider ownership/inherited role constraints cannot safely meet this design, seek an approved independent empty target. No branch/database creation or deletion is authorized/performed in P1.

### Required provisioning order

The requested eight steps describe the eventual architecture; prerequisites are explicit. Step 5's private direct operator access must precede any SQL in steps 2-4. Production changes in step 3 remain separately unauthorized; exercise the sequence first in step 8's approved empty disposable target.

1. **Already present:** project, PG17, both historical branches, pyramid_design and pyramid_owner, both endpoint modes, partial recovery controls. Obtain owner designation of production branch/database and acceptance of region/plan. Authorize bounded catalog-only pre-provision inventory to classify roles, schema/ledger, ownership/defaults and data safety without candidate contents.
2. **Operational roles:** with approved direct provisioning authority, validate existing anon/authenticated and create restricted sentinels only if actually absent; validate or provision the two NOLOGIN capability roles before migration 10. Grant operator INHERIT/SET locker membership. Stop on incompatible existing roles/ownership rather than blindly alter them.
3. **Repository migrations:** in an independently verified empty disposable database, run the exact ordered 11 files through pinned Prisma 6 with the approved operator direct connection. Historical/current/partial production requires a separately reviewed history/checksum/backup/forward-path decision, never fresh replay, reset, db push or force resolve. Migrations establish all table/column/policy/function/default restrictions; do not duplicate them manually.
4. **Runtime LOGIN:** create a distinct SQL-restricted credential-bearing role privately, inherit only pyramid_runtime with ADMIN FALSE/INHERIT TRUE/SET TRUE, grant database CONNECT, verify no other effective authority/ownership. Creating it after migrations avoids premature application use. No production runtime configuration occurs during rehearsal.
5. **Direct operator connection:** verify the approved branch/database/direct endpoint and TLS privately before provisioning; retain DIRECT_URL in protected operator-only execution, never host build/web/scheduler runtime. Do not retrieve/reveal/reset the existing password in P1.
6. **Pooled runtime connection:** privately construct/verify DATABASE_URL only after restricted identity acceptance, same branch/database, pooled endpoint and verify-full. Secret delivery/storage needs an approved private mechanism; no owner copy/paste into chat or repository is requested.
7. **B4B1 read-only acceptance:** use scripts/production-database-readiness.mjs in separate operator/runtime modes with independently confirmed expected endpoint. The full contract requires all 11 finished matching migrations; it cannot pass on a pre-migration target. Use pre-provision inventory first, full acceptance after the disposable replay, and production full acceptance only after a later authorized production migration.
8. **Disposable Neon migration rehearsal:** separate approval specifies branch creation, schema-only scope, empty database, role/membership changes, secure rehearsal credentials, migrations and synthetic verification/recovery scope. Execute steps 2-7 there before any production migration decision. Existing local harnesses remain loopback-only and must not be repointed/bypassed for Neon; approved remote orchestration is a later tooling gate.

### SQL required — YES

**DO NOT RUN YET — REQUIRES OWNER AUTHORISATION.** Conditional template only; placeholders are not valid deployment inputs. Execute CREATE only where a separately authorized catalog inventory establishes absence. Existing sentinel roles must be validated; no duplicate sentinel creation or blanket ALTER/REASSIGN is proposed. Use the approved empty disposable database first; the production names shown below are the eventual candidate and do not authorize execution there. New password generation/storage/entry requires an approved confidential mechanism, never a literal in logs, persisted SQL editor history, shell history, documentation or chat.

```sql
-- Before migrations, if catalog-confirmed absent:
CREATE ROLE pyramid_runtime NOLOGIN NOSUPERUSER NOCREATEDB
  NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE pyramid_reference_locker NOLOGIN NOSUPERUSER NOCREATEDB
  NOCREATEROLE NOREPLICATION NOBYPASSRLS;

-- pyramid_owner is a candidate; verify actual provisioning/ownership authority first.
GRANT pyramid_reference_locker TO pyramid_owner
  WITH ADMIN FALSE, INHERIT TRUE, SET TRUE;

-- Exact repository migrations establish object ACLs/RLS/defaults/function ownership.
-- Do not manually duplicate that DDL. No production migration is authorized.

-- After migrations in the authorized target; replace database for disposable rehearsal:
CREATE ROLE "<APP_RUNTIME_LOGIN>" LOGIN INHERIT NOSUPERUSER
  NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
  PASSWORD '<GENERATE_PRIVATE_RUNTIME_PASSWORD>';
GRANT pyramid_runtime TO "<APP_RUNTIME_LOGIN>"
  WITH ADMIN FALSE, INHERIT TRUE, SET TRUE;
GRANT CONNECT ON DATABASE pyramid_design TO "<APP_RUNTIME_LOGIN>";
```

No generic SQL owner creation is needed while an existing operator candidate owns the database. If later inventory finds unacceptable operator/sentinel/capability attributes or historical object ownership, stop for an exact reviewed correction rather than execute this template. Sentinel SET membership in the disposable harness is for negative tests, not a mandatory production operator membership. Runtime search path must remain compatible with public enum casts and inaccessible CREATE scopes; no new session-based authorization is introduced.

### Owner actions and next phase

Only owner decisions genuinely remain: designate the production branch/database and approve region/plan/data boundaries; authorize read-only catalog preflight; approve the exact isolated schema-only/empty-database rehearsal and role/membership/credential scope with private secret delivery; name recovery operator/deputy and accept recovery objectives before production. Codex can perform the subsequent authorized metadata/configuration work rather than require owner screenshots or secret copying. No claim is made that confidential credential transfer tooling has already been accepted.

**Recommended B4B1-P2:** read-only catalog pre-provision inventory and a reviewable isolated rehearsal execution plan first. Provisioning remains gated by its findings and explicit authorization. Do not start production DDL/migrations or another provider phase. The existing checker can be reused for full-state post-rehearsal acceptance, but cannot classify a fresh target as accepted.

**Repository changes and verification:** only this dated addendum/material correction to prior resume assumptions. No application/dependency/schema/migration/B3 change; nothing staged, committed or pushed. Working and staged whitespace checks passed; protected source/schema/migration/dependency diff is empty and HEAD/branch are unchanged. The existing B4 boundary scan passed: 319 files, one changed document, 96 existing client assets, 32 environment consumers, zero bounded-pattern findings. The addendum has zero PostgreSQL connection literals, private-key literals or trailing-whitespace findings; its credential text is a placeholder only. Existing build assets were scanned, not rebuilt. No lint/typecheck/application test/build or SQL suite was rerun for this documentation-only inspection; earlier local acceptance counts remain historical, not live evidence.

PHASE B4B1-P1: OWNER ACTION REQUIRED

NEON PROJECT IDENTIFIED: YES

NEON MUTATIONS: 0

NEON SQL EXECUTED: NO

PRODUCTION MIGRATIONS: 0

OPERATOR IDENTITY EXISTS: YES (pyramid_owner; suitability pending catalog verification)

RESTRICTED RUNTIME LOGIN EXISTS: UNKNOWN (none identified in dashboard)

DIRECT CONNECTION AVAILABLE: YES

POOLED CONNECTION AVAILABLE: YES

DISPOSABLE BRANCH CAPABILITY: AVAILABLE

RECOVERY CAPABILITY: PARTIAL

OWNER CAN PROCEED TO PROVISIONING: NO (target designation/catalog prerequisite review required)

B3 WORKTREE TOUCHED: NO

PRODUCTION DEPLOYMENT: NO

NEXT PHASE: NOT STARTED


## B4B1-P2 read-only catalog inventory and rehearsal design

**Date:** 2026-10-01 (Europe/London). **P2 inventory/design: PASS. Production acceptance: OWNER ACTION REQUIRED.** The authorized observational work and reviewable rehearsal design are complete. PASS applies only to this bounded P2 scope: it does not accept the current production schema, identities, runtime, recovery or provider architecture. Missing prerequisites and historical divergence are recorded below; no repair was needed or authorized to complete classification/planning. P3 has not started.

### Repository State

The exact authorized B4 worktree and branch were verified before continuation: `phase/b4-production-readiness`, HEAD `d05971672158d0953875da6f998cfef0bb65b001`. The only starting modification was the preserved 138-line P1 addition to this document; staging was empty. Secret-free catalog evidence is retained outside the repository in `C:\Users\atikm\.codex\worktrees\pyramid-b4-evidence\b4b1-p2-catalog-inventory.json`, SHA-256 `52fdf02e7363abb6e99a468a45ca1adaaf17d453b8814dcc42f91b136c2a5dd4`; it includes metadata/counts, never credentials or record contents. Local HEAD, tracking branch and actual remote feature branch matched. The primary checkout and B3 were not accessed. Prior credential-unavailable and P1-only findings above are historical; this P2 section is the latest evidence.

All 11 migrations, Prisma schema/config, B1-R1/B2-R1 contracts, B4A/control/environment/release/recovery material, provisioning/checker/privilege scripts and server pg configuration were reviewed. Existing Graphify guidance and Ponytail discipline were applied without generating a graph, adding dependencies or duplicating the production checker.

### Approved Neon Target

Authenticated dashboard independently established project `pyramid-design-production`, ID `withered-feather-01662312`; designated production branch `migration-baseline`, ID `br-still-lab-b3q03yuz`; database `pyramid_design`; owner `pyramid_owner`. AWS Asia Pacific 1 (Singapore) is owner accepted. Free plan is accepted for pre-production/rehearsal only. The direct compute was independently identified on Computes and privately matched to the connection template before SQL. Neither endpoint nor DSN is published. The historical `migration-synthetic-verification` child remains untouched and provides no production acceptance evidence.

### Connection Safety

Exactly **one** successful direct production connection used existing `pg`, the repository target validator, `sslmode=verify-full`, startup `default_transaction_read_only=on` and `BEGIN READ ONLY`. Both read-only settings were observed on; encrypted TLS 1.3 and authorized certificate/hostname validation succeeded. Connection/query/statement bounds were 5s/5s/3s. Queries were identity/catalog/ledger SELECTs, function-definition comparison and permitted aggregate counts only. No application function was executed. Transaction rolled back; client and credential-bearing subprocess closed.

The dashboard template's `sslmode=require` was strengthened privately for inspection, not accepted as final production configuration. Channel-binding enforcement, pooled runtime authentication, Prisma transport and reconnect/pool behavior were not established. System Node 24.15.0 was used only for this read-only inventory; the repository B1/B2 suites require Node 22.

An existing credential moved privately from the rendered authenticated snippet through a single-use local password handoff to process memory/private subprocess stdin. No credential was printed, placed in command arguments, copied to clipboard, saved to disk, committed or documented. The receiver and handoff tab closed, provider display was remasked, and parent credential variables were cleared. No password reset or provider setting changed.

### Target Classification

**C — HISTORICAL PYRAMID SCHEMA.** Nine finished, ordered repository migrations and matching checksums establish the historical prefix. There is no failed/rolled-back/unexpected ledger entry. Current migrations 10/11 and their security/workflow objects are absent. The 17 live function definitions exactly match their effective definitions in migrations 1-9. These checks go beyond names; remaining facets differ from the current contract, so current compatibility or exhaustive historical drift freedom is not claimed.

### Data Classification

**UNKNOWN.** Aggregate-only evidence: **58 rows across 27 application tables**, excluding migration ledger. Counts do not establish provenance, even if familiar. No names, emails, answers, notes, file bytes/CVs or business-record contents were selected. No further business-data inspection is needed or authorized to resolve this inventory. Default data cloning and anonymized-data cloning are excluded from P3.

`Application`: 5; `ApplicationAnswer`: 4; `ApplicationStatusEvent`: 3; `AuditEvent`: 1; `BackgroundJob`: 1; `CandidateConsent`: 5; `CandidateFile`: 1; `CompatibilityProbe`: 2; `ConsentDefinition`: 1; `Department`: 1; `Discipline`: 1; `FileSecurityReview`: 1; `IdempotencyRecord`: 4; `Job`: 1; `JobLocation`: 1; `JobQuestion`: 1; `JobQuestionOption`: 1; `Project`: 1; `ProjectCredit`: 1; `ProjectDiscipline`: 1; `ProjectMedia`: 1; `ProjectSector`: 1; `RateLimitBucket`: 1; `RetentionPolicy`: 1; `Sector`: 1; `StaffUser`: 8; `UserRole`: 8.

### PostgreSQL / Provider Compatibility

Live PostgreSQL **17.11** (`server_version_num=170011`), actual NOLOGIN sentinels, PG17 membership options, RLS catalogs, application functions/owners, and direct verified TLS were observed. Direct and pooled endpoints are dashboard available. Pooled runtime, new-role provisioning, migration-10 SECURITY DEFINER/function transfer and final memberships/default ACL operations remain untested; therefore **LIVE NEON ARCHITECTURE COMPATIBILITY: FAIL (acceptance gate incomplete, not a demonstrated provider defect)**.

Official [Manage roles](https://neon.com/docs/manage/roles), [Manage databases](https://neon.com/docs/manage/databases) and [Manage branches](https://neon.com/docs/manage/branches) pages were read on this date. SQL-created restricted roles/NOLOGIN, branch-scoped roles and standard CREATE DATABASE parameters except TABLESPACE are documented. Console/API/CLI role creation grants neon_superuser and is unsuitable for restricted rehearsal identities. Documentation supports planning, not a live DDL pass. Provider/internal roles must not be modified.

**Planning correction:** schema-only branches are independent **root branches**, not ordinary copy-on-write children. The creation UI selects a source branch, but the result has no parent. Schema-only excludes rows while copying schema/roles. Branch guidance warns that parent/source role passwords can be retained; independent runtime/operator credentials must be created, and copied administrator authority remains an explicit residual exposure during the disposable branch's lifetime. Do not claim a schema-only branch automatically provides credential isolation. Default-branch protection is not enabled and cannot be relied on for automatic password separation.

### Migration Ledger

1. `20260902000000_phase_2a_compatibility_probe` — PRESENT; finished; checksum matches.
2. `20260903000000_phase_2a_compatibility_probe_security` — PRESENT; finished; checksum matches.
3. `20260903220000_phase_2b_production_domain_foundation` — PRESENT; finished; checksum matches.
4. `20260903221000_phase_2b_candidate_file_constraint_correction` — PRESENT; finished; checksum matches.
5. `20260903222000_phase_2b_evidence_constraints` — PRESENT; finished; checksum matches.
6. `20260903223000_phase_2b_application_constraint_completion` — PRESENT; finished; checksum matches.
7. `20260905000000_phase_2g_file_free_submission` — PRESENT; finished; checksum matches.
8. `20260905010000_phase_2g_immediate_file_evidence` — PRESENT; finished; checksum matches.
9. `20260907000000_phase_2ib_completed_retention_tombstones` — PRESENT; finished; checksum matches.
10. `20260930000000_phase_b1_runtime_permissions` — MISSING.
11. `20260930010000_phase_b2_admin_workflows` — MISSING.

For all nine present entries, SHA-256 matches committed migration bytes with LF/CRLF transport equivalence. No unexpected names, unfinished entries, rollback markers or out-of-order application were found. **MIGRATION HISTORY: PASS for the consistent historical prefix; current 11-migration completeness FAIL.** No migration deploy/resolve/reset/db push occurred. The full-state checker was intentionally not invoked against absent prerequisites, nor was its contract rebaselined.

Current non-ledger fingerprint comparison:

- relations: 27 observed / 28 current expected; fingerprint DIFFERS.
- columns: 275 observed / 280 current expected; fingerprint DIFFERS.
- constraints: 101 observed / 105 current expected; fingerprint DIFFERS.
- indexes: 71 observed / 74 current expected; fingerprint DIFFERS.
- policies: 0 observed / 80 current expected; fingerprint DIFFERS.
- functions: 17 observed / 22 current expected; fingerprint DIFFERS.
- triggers: 20 observed / 29 current expected; fingerprint DIFFERS.
- enums: 84 observed / 84 current expected; fingerprint MATCH.

### Role Inventory

- `pyramid_owner`: LOGIN, INHERIT; SUPERUSER false; CREATEDB, CREATEROLE, REPLICATION, BYPASSRLS true. Membership in `anon` and `authenticated`: ADMIN true, INHERIT false, SET false. Membership in `neon_auth` and `neon_superuser`: ADMIN false, INHERIT true, SET true. No locker membership. Role configuration null; connection limit -1.
- `anon` and `authenticated`: NOLOGIN, NOINHERIT; SUPERUSER/CREATEDB/CREATEROLE/REPLICATION/BYPASSRLS all false. No parent memberships, relevant ownership or role configuration; connection limit -1. An operator's membership in these sentinels is not a parent membership held by them.
- `pyramid_runtime` and `pyramid_reference_locker`: **MISSING**.
- Separate restricted runtime LOGIN: **MISSING**, established by catalog candidate/membership/ownership inspection and zero qualifying runtime logins, not dashboard absence alone.

### Sentinel Validation

**Migration-2 prerequisites PASS; current B1 final hardening FAIL.** Each sentinel owns zero relevant objects, has no LOGIN/privileged flags/parent memberships, and fails all 196 inspected table privilege checks, all 283 inspected column checks and all 17 function EXECUTE checks. Database CONNECT/TEMP and public-schema USAGE are nevertheless effective through PUBLIC; public-schema CREATE and database CREATE are false. Final current-contract denial/default hardening is missing. No sentinel was altered.

### Operator Validation

**Current B1 operator prerequisites FAIL.** `pyramid_owner` is a genuine direct LOGIN/database/application owner with effective public-schema CREATE and administrative provisioning attributes; its existing provider memberships are operator-only authority. The missing locker and required ADMIN FALSE / INHERIT TRUE / SET TRUE locker membership prevent current B1 ownership/default work. Specific operations require disposable rehearsal; attributes are not proof of successful provider DDL. Never use this identity for application runtime.

### Capability Roles and Restricted Runtime LOGIN

Both capability roles and the distinct restricted runtime LOGIN are **MISSING**. No membership/grant could be accepted for absent roles. No production CREATE ROLE, GRANT, credential generation or provisioning occurred.

### Object Ownership

`pyramid_owner` owns the database, all 28 public tables including `_prisma_migrations`, their indexes/associated relation objects (100 owned relation catalog entries), all 17 application functions and 23 enums. Public-schema owner is `pg_database_owner`; its database-owner member has effective CREATE. No application sequences exist. `pyramid_private` and `pyramid_private.lock_reference(text,uuid)` are absent; no SECURITY DEFINER function exists in the application schemas. `neon_auth` is provider-owned metadata, outside the application contract; no provider objects or contents were changed/read for application acceptance.

### RLS / Policies

28/28 public tables including ledger have RLS enabled; none FORCE RLS. Application count excluding ledger: 27 versus current 28. **Policies: 0 versus current 80**; there are no policy target roles or PUBLIC/anon/authenticated policy exposures to inventory. Owner BYPASSRLS/ownership does not establish runtime protection. **RLS/POLICY STATE: FAIL against the current B1/B2 contract.** No policy was altered.

### Privilege Inventory

PUBLIC has database CONNECT/TEMPORARY and public-schema USAGE; no application-table/function grants. Sentinels have zero effective application/ledger table, column or function rights. Operator has all seven requested table privilege classes on all 28 tables and EXECUTE on all 17 functions; its owner authority includes database CONNECT/CREATE/TEMP and public-schema USAGE/CREATE. No explicit relevant ACL grant options were found; ownership/ADMIN authority is separate from that finding. No owner-specific default ACL hardening entries were present, leaving default future-function PUBLIC EXECUTE a concern until migration 10. Missing roles prevent runtime/locker rights acceptance.

### Function Inventory

All 17 functions are SECURITY INVOKER, owned by `pyramid_owner`, language SQL or PL/pgSQL, with fixed `search_path=pg_catalog, public`; EXECUTE is owner-only. All body comparisons to migrations 1-9 matched. Functions were inspected, never invoked; bodies are omitted from saved evidence. Current contract requires 22 functions, including the missing locking SECURITY DEFINER exception and B2 additions.

`check_application_submission_evidence` (plpgsql), `completed_retention_evidence` (sql), `enforce_application_insert_context` (plpgsql), `enforce_cleared_file_review_evidence` (plpgsql), `enforce_submitted_application_evidence` (plpgsql), `guard_retention_application` (plpgsql), `guard_retention_file` (plpgsql), `guard_retention_review` (plpgsql), `guard_tombstone_answers` (plpgsql), `prevent_immutable_change` (plpgsql), `protect_application_context` (plpgsql), `protect_published_slug` (plpgsql), `protect_retention_job_evidence` (plpgsql), `protect_used_job_question` (plpgsql), `protect_used_job_question_option` (plpgsql), `protect_versioned_policy` (plpgsql), `serialize_application_file_change` (plpgsql).

### Recovery Findings

Reconfirmed dashboard: six-hour history window/point-in-time restore controls; earliest displayed point **2026-09-30 19:50 GMT+1**, picker **2026-10-01 01:50 Europe/London**. These are transient inspected values, not a guaranteed latest recoverable point or business RPO. No snapshots or schedule; scheduled snapshots require upgrade. General settings reconfirmed **Not protected**, disabled protection control, default branch `migration-baseline`, no expiration. No data preview, snapshot, restore or setting change occurred. Successful provider recovery, independent encrypted backups/key/deputy access and business-approved/measured RPO/RTO remain unverified production activation gates. P3 below excludes restore; it needs separate later authority.

### Production Divergences

Historical nine-migration schema; unknown-provenance nonempty data; missing migrations 10/11, capability roles, runtime LOGIN, locker membership/private schema/locking function/InternalNote; zero current policies; absent final public/default privilege hardening; pooled runtime/provider DDL/recovery acceptance unverified. The source schema is not the rehearsal migration target. A future production forward migration/provisioning/data-provenance/recovery decision is separate and must never be inferred from P2/P3.

### P3 Disposable Rehearsal Design

**Plan READY for owner review; execution NOT AUTHORIZED and tooling NOT READY.** Request one schema-only root branch sourced from `migration-baseline`, explicitly excluding rows. Name: `b4b1-p3-schema-only-20261001`, never default/protected/production. Reconfirm schema-only selection, no-row scope, root/branch/storage allowance and the created branch ID/direct endpoint before any child SQL. Use one primary compute with current Free defaults; no upgrade, new project, integration or networking change. One-day expiration is a proposed cleanup backstop, not permission to lose evidence or guaranteed auto-delete acceptance.

Within this disposable branch request two genuinely fresh databases from `TEMPLATE template0`: `phase2ib_b1r1_neon_b4b1_p3_b1_20261001` (B1) and `phase2ib_b1r1_b2_neon_b4b1_p3_20261001` (B2). Separate databases avoid contaminated/interacting B1/B2 fixtures and follow existing permissions orchestration. Stop on name collisions; no overwrite/reset/reuse. Catalog-verify no application objects or ledger and zero application rows before replay. Copied `pyramid_design` schema is outside the migration/test targets and remains unused except branch-wide role/bootstrap catalog checks. No owner/sentinel/provider repair in the source is requested.

Create one SQL-restricted rehearsal operator LOGIN per fresh database: `b4b1_p3_b1_owner`, `b4b1_p3_b2_owner`. Explicit INHERIT; no SUPERUSER/CREATEDB/CREATEROLE/REPLICATION/BYPASSRLS or provider/admin parent membership; each owns only its fresh database/application objects. Bootstrap uses the copied `pyramid_owner` privately on the disposable endpoint solely for required provisioning, never as runtime or migration executor. Inspect any creator-generated membership before setting approved options. A temporary bootstrap membership in each operator, ADMIN TRUE / INHERIT FALSE / SET TRUE, permits provisioning and database ownership; remove that relationship after provisioning. Do not change copied/provider role attributes, passwords or ownership, or grant provider/admin roles to new identities.

Validate copied `anon`/`authenticated` exact flags/ownership/parent memberships before migration 2; they are present in source so this authorization does **not** include creating/replacing/ALTERing sentinels. Stop if missing/incompatible. Create the two missing fixed-name restricted NOLOGIN capability roles in the disposable branch only. Each operator receives locker membership ADMIN FALSE / INHERIT TRUE / SET TRUE. Each receives sentinel and its own fresh `b1_public_<12-hex>` negative-test role membership ADMIN FALSE / INHERIT FALSE / SET TRUE; that role is restricted NOLOGIN with no objects/parent memberships. These SET-only grants are test authority, not production architecture.

Replay the unchanged ordered 11 migrations into **each** empty database with pinned Prisma **6.12.0**, Node 22 and that database's new operator through direct verify-full TLS. Migration 10 alone establishes private locking ownership, temporary schema CREATE/revocation and ACL/default hardening; migration 11 supplies current workflow rights. No manual duplicate ownership repair, historical-file edit or new migration. Require all 11 ledger names/checksums, no failures, zero current schema drift and the existing operator-mode checker contract before runtime creation.

Then create two independent SQL-restricted runtime LOGINs: `b4b1_p3_b1_runtime`, `b4b1_p3_b2_runtime`. Explicit INHERIT, all privileged flags false, no ownership; only pyramid_runtime membership ADMIN FALSE / INHERIT TRUE / SET TRUE and CONNECT on its test database. No operator/locker/provider membership, CREATE/TEMP/schema CREATE, grant options or ledger rights. Remove any unauthorized bootstrap-created runtime membership before acceptance; operator-role parent memberships must remain exactly the test/locker set above. Creator/administrative ability held by bootstrap is recorded separately, never attributed to runtime.

Generate four independent random credentials privately (existing randomBytes discipline, no literals/logs/history/files), retain in process memory/ephemeral child environment and destroy at cleanup. Privately build DIRECT_URL/operator and DATABASE_URL/pooled-runtime for the same registered rehearsal branch/database; check direct versus pooler and verify-full. Operator DIRECT_URL must never enter application/build/scheduler runtime. No copied production credential goes into the app. Copied administrator passwords/authority may still exist on the disposable branch; owner review must accept this bounded bootstrap/residual authority or request a separately approved independent empty project/target. That fallback is **not** authorized by this set.

**Remote tooling gate:** existing B1/B2 verifiers and disposable runners reject remote endpoints and are not directly executable against Neon. P3 must first provide/review the smallest remote orchestration/adaptation that reuses their assertions/fixtures and the current production checker, retains the original local guards, requires an explicit disposable-branch ID/direct endpoint/database/role allowlist and rejects the production branch/database/endpoint. Include secret-safe Prisma output/arguments and failure paths; use environment-backed datasource comparison rather than credential-bearing --from-url arguments; absent private env files; provider variables removed; external Auth/Drive/email/challenge adapters synthetic only. Current B1 checks name local `postgres`, which is not a Neon login contract: replace that provider-specific negative membership reference in the reviewed remote path with catalog-confirmed existing administrator roles, never fabricate a role or weaken the isolation assertion. No guard bypass, hosts alias/proxy trick, force flag, build/deployment or implementation is authorized in P2.

After approval/review, seed only committed synthetic fixtures separately into both databases; run B1 permissions/negative/workflow and B2 workflows under their restricted identities. Authorize the suites' explicit synthetic INSERT/UPDATE/DELETE/worker/retention/idempotency operations, transactional default-ACL table/function probes, SET ROLE/locking and denied DDL/GRANT/escalation attempts in the disposable databases only. Unexpected successful denied probes must rollback and abort; no durable privilege repair to force PASS. Remote adaptation must classify and contain every mutating/locking probe before execution; no blanket arbitrary SQL permission.

Provider-specific acceptance covers separate direct operator/pooled runtime verified TLS and pg/Prisma authentication; same-client transactions/rollback; RLS/SET LOCAL context isolation across pool checkout; security-definer locks and intended waits; reconnect after a client disconnect; cold/warm idle wake-up within current bounds without forcing suspend/restart or changing compute; prepared-query behavior if used; and bounded concurrent checkouts at existing pool max 3. Synthetic-only probe data/temporary transactions; no production endpoint. Report transport/channel-binding limitations and measured connection budget, retaining `3A + 3W + H + O` planning ceiling. No live provider email/Auth/Drive/challenge calls, production activation, dump/restore, destructive resource recovery or account configuration.

Capture secret-free evidence, close pools/subprocesses, revoke temporary test/bootstrap relationships and delete only the recorded disposable branch ID (never names alone). Branch deletion removes its databases/roles/compute; it is irreversible and must occur only after evidence capture and explicit P3 cleanup authorization. No independent production DROP/REASSIGN is requested. If deletion fails, report retained IDs and cleanup blocker without touching another branch; expiration is only a backstop. Resource creation is compensatable by deletion; synthetic/migration state need not support a down-migration because the entire target is disposable.

### Exact P3 Mutation Authorization Requested

**REQUEST ONLY; none executed.** For each item below: **production database/schema/roles/data impact ZERO**, target is solely the recorded `b4b1-p3-schema-only-20261001` branch and named fresh databases/roles. Project-wide Free quotas/compute/storage consumption may increase; stop rather than upgrade or modify production. No historical branch is a target.

1. **Create one schema-only root branch and one primary compute** from the designated source, with no source rows. Purpose: isolated provider test environment. Compensatable by deleting that recorded branch and compute; creation itself is not a production data clone.
2. **Set one-day expiration during branch creation** if available. Purpose: cleanup backstop. Reversible on the disposable branch; cleanup via recorded-branch deletion. Never change production expiration/default/protection.
3. **Create LOGIN b4b1_p3_b1_owner** with the restricted attributes above. Purpose: B1 migration ownership with independent credential. Compensatable by branch deletion; no reuse of production operator in migrations.
4. **Create LOGIN b4b1_p3_b2_owner**, same attributes. Purpose: separate B2 migration ownership. Same reversibility/cleanup.
5. **Establish necessary temporary bootstrap membership in each new operator** with ADMIN TRUE / INHERIT FALSE / SET TRUE; inspect creator-generated options and remove both temporary memberships after provisioning. Purpose: CREATE DATABASE OWNER authorization without privileging the operators. Reversible by exact REVOKE on new-role relationships; full cleanup branch deletion. No new parent authority granted to either operator.
6. **Create B1 fresh database from template0, OWNER b4b1_p3_b1_owner**. Purpose: migration from zero. Compensatable by branch deletion; no use or overwrite of copied pyramid_design.
7. **Create B2 fresh database from template0, OWNER b4b1_p3_b2_owner**, same purpose/reversibility/cleanup.
8. **Create pyramid_runtime NOLOGIN**, explicit INHERIT and all privileged flags false; no parents/ownership. Purpose: missing runtime capability prerequisite. Compensatable by branch deletion; stop if already present rather than alter.
9. **Create pyramid_reference_locker NOLOGIN**, same initial restriction. Purpose: missing locking owner prerequisite. Compensatable by branch deletion; migration 10 alone later assigns its deliberately narrow ownership/rights.
10. **Grant locker to b4b1_p3_b1_owner**, ADMIN FALSE / INHERIT TRUE / SET TRUE. Purpose: B1 default/ownership operations. Reversible by exact REVOKE; cleanup branch deletion.
11. **Grant locker to b4b1_p3_b2_owner**, same options/purpose/reversibility/cleanup.
12. **Create two fresh b1_public_<12-hex> restricted NOLOGIN test roles** (record exact generated names before execution). Purpose: emulate an otherwise ungranted PUBLIC principal in each B1/B2 fixture. Compensatable by branch deletion; no provider-role creation.
13. **Grant anon, authenticated and the corresponding fresh public-test role to each rehearsal operator** with ADMIN FALSE / INHERIT FALSE / SET TRUE. Purpose: negative principal isolation tests only. Reversible by exact REVOKE, performed after testing; cleanup branch deletion. Sentinels retain their attributes/no parent memberships.
14. **Apply migration 1 to each fresh database**: `20260902000000_phase_2a_compatibility_probe`.
15. **Apply migration 2 to each**: `20260903000000_phase_2a_compatibility_probe_security`.
16. **Apply migration 3 to each**: `20260903220000_phase_2b_production_domain_foundation`.
17. **Apply migration 4 to each**: `20260903221000_phase_2b_candidate_file_constraint_correction`.
18. **Apply migration 5 to each**: `20260903222000_phase_2b_evidence_constraints`.
19. **Apply migration 6 to each**: `20260903223000_phase_2b_application_constraint_completion`.
20. **Apply migration 7 to each**: `20260905000000_phase_2g_file_free_submission`.
21. **Apply migration 8 to each**: `20260905010000_phase_2g_immediate_file_evidence`.
22. **Apply migration 9 to each**: `20260907000000_phase_2ib_completed_retention_tombstones`.
23. **Apply migration 10 to each**: `20260930000000_phase_b1_runtime_permissions`.
24. **Apply migration 11 to each**: `20260930010000_phase_b2_admin_workflows`.

For **each of mutations 14-24**, target is both named empty test databases, purpose is the exact corresponding committed schema/security/workflow transition and Prisma ledger write, production impact zero, reversibility is disposal rather than an assumed down-migration, and cleanup is recorded-branch deletion. Total: **22 individual migration applications via two ordered Prisma deploys**. No seed or production migration is implied by deploy.

25. **Create LOGIN b4b1_p3_b1_runtime after migration verification**, with independent credential and restrictions above. Purpose: B1 restricted runtime acceptance. Compensatable by branch deletion; no provider/admin membership.
26. **Create LOGIN b4b1_p3_b2_runtime after migration verification**, same purpose/reversibility/cleanup for B2.
27. **Grant pyramid_runtime to b4b1_p3_b1_runtime**, ADMIN FALSE / INHERIT TRUE / SET TRUE. Purpose: inherit approved capability. Reversible by exact REVOKE; cleanup branch deletion.
28. **Grant pyramid_runtime to b4b1_p3_b2_runtime**, same options/purpose/reversibility/cleanup.
29. **Grant CONNECT on the B1 database to its runtime LOGIN**. Purpose: restricted authentication. Reversible by exact REVOKE; cleanup branch deletion.
30. **Grant CONNECT on the B2 database to its runtime LOGIN**, same purpose/reversibility/cleanup. PUBLIC CONNECT is recorded separately; exclusive cross-database access is not falsely claimed and no copied-database ACL changes are requested.
31. **Remove unintended creator/bootstrap-generated membership involving the new runtime LOGINs**, if observed, before acceptance. Purpose: retain exactly one runtime parent and no bootstrap runtime SET/INHERIT authority. Reversible by reviewed exact GRANT, never done merely to force acceptance; branch deletion cleans up. No copied/provider membership repair.
32. **Seed the committed synthetic B1/B2 fixtures into their respective databases** after empty-state proof. Purpose: permitted acceptance inputs, synthetic example.invalid recipients only. Data writes are not intrinsically reversible; disposal removes all fixtures. No production or copied-schema seeding.
33. **Run the reviewed B1/B2 synthetic mutation/negative probe set** described above, including worker/retention operations, disposable table/function probes, denied DDL/grants and transaction/locking/pool context probes. Purpose: security/workflow/provider behavior evidence. Probe DDL/denied attempts use rollback; durable synthetic workflow state is disposed with the branch. Remote probe manifest review is required before execution.
34. **Revoke the exact test-only sentinel/public-test memberships after tests and any remaining temporary new-role bootstrap memberships**. Purpose: close test authority and capture final runtime contract. Reversible by exact GRANT; full cleanup branch deletion. Retain operator locker membership through final verification because it is contractual.
35. **Delete the single recorded disposable branch, including its databases/roles/compute**, after evidence capture and connection closure. Purpose: complete disposal and remove independent/copy credential exposure. **Irreversible**, authorized test resources only; confirm branch ID is neither production nor historical before the deletion. Expiration is a backstop, not a reason to assert successful cleanup.

Catalog validation, constructing ephemeral URLs, running existing read-only checker modes and recording evidence are observational/process actions, not additional database mutations. P3 remote-runner implementation/review is a necessary separate engineering gate, with no source changes performed under P2. No new project, sentinel repair, copied owner-password rotation, provider/internal role changes, production grant, production migration, manual migration-10 ownership duplication, restore, Hostinger/configuration/deployment/DNS or real-data action is in this authorization set.

### Repository Changes and Verification

Only the canonical B4B1 record changes; the complete P1 addition and all historical sections are preserved. No application/package/lockfile/schema/migration/B3 modification. Working whitespace/protected-path checks passed. The existing B4 boundary scan passed: **319 files, one changed document, 96 existing client assets, 32 environment consumers, zero findings**. Documentation/evidence checks found zero credential/DSN/endpoint/private-key literals and zero trailing-whitespace findings; the entire pre-P2 document including P1 was verified preserved. Repeat whitespace/boundary/secret/scope checks on exact staged content before commit. Existing build outputs are scanned, not rebuilt; no unrelated lint/typecheck/application suites/build are warranted for documentation only. Full-state/live workflow acceptance is not represented by documentation checks.

The user-authorized conditional documentation commit applies because the bounded inventory and P3 design completed with meaningful evidence, despite production acceptance remaining blocked. The truthful commit message is exactly `docs: record Neon catalog acceptance`; only this document is eligible. Push only the existing feature branch, never main. Exact commit/push identity and check results are reported at closure; no production PASS is inferred from publication.

### Live Effects

PRODUCTION DATABASE READ-ONLY CONNECTIONS: 1 (rolled back and closed)

PRODUCTION DATABASE MUTATIONS: 0

PRODUCTION ROLE MUTATIONS: 0

PRODUCTION MIGRATIONS: 0

PRODUCTION DATA WRITES: 0

REAL CANDIDATE RECORDS READ: 0 (aggregate counts only; provenance UNKNOWN)

REAL CANDIDATE RECORDS WRITTEN: 0

DISPOSABLE NEON RESOURCES CREATED / REMOVED: 0 / 0

PROVIDER CONFIGURATION CHANGES: 0

P3 STARTED: NO

### Owner Decision Required

Approve or revise the exact P3 mutation set, including schema-only row exclusion, two template0 databases, independent SQL LOGIN credentials, copied administrative-credential residual authority, the reviewed remote-runner/probe boundary, one-day expiration and irreversible disposal. If that credential/branch model is unacceptable or provider constraints fail, separately approve an independent empty target; no silent fallback. Unknown production rows remain untouched. Production forward migration/provisioning and provenance/recovery/activation require their own later decisions. B3 remains blocked without access or modification.

### P2 Final Gate Status

PHASE B4B1-P2: PASS (authorized inventory/design only; production acceptance OWNER ACTION REQUIRED)

NEON TARGET VERIFIED: YES

PRODUCTION SCHEMA STATE: HISTORICAL

PRODUCTION DATA CLASSIFICATION: UNKNOWN

OPERATOR IDENTITY: FAIL (current B1 prerequisites)

SENTINELS: FAIL (current B1 hardening; migration-2 prerequisites PASS)

CAPABILITY ROLES: MISSING

RESTRICTED RUNTIME LOGIN: MISSING

RLS/POLICY STATE: FAIL (current contract)

MIGRATION HISTORY: PASS (nine-migration prefix; two expected migrations missing)

LIVE NEON ARCHITECTURE COMPATIBILITY: FAIL (acceptance incomplete; no provider defect established)

P3 REHEARSAL PLAN: READY (owner review; remote tooling review and authorization pending)

PRODUCTION DATABASE MUTATIONS: 0

PRODUCTION MIGRATIONS: 0

REAL CANDIDATE DATA ACCESSED: NO

B3 WORKTREE TOUCHED: NO

B3 SECURITY GATE: UPSTREAM DISCLOSURE BLOCKED

PRODUCTION DEPLOYMENT: NO

NEXT PHASE: NOT STARTED

## B4B1-P3A disposable Neon harness and mutation preflight

**Date:** 2026-10-01 (Europe/London). **Result: PASS for repository preparation; P3B owner authorization required.** No Neon connection, creation, SQL mutation, remote migration or production operation was performed. No live compatibility pass is inferred. Production findings remain P2's historical schema/data-UNKNOWN observation. P3B is not started.

### Repository and control review

The requested B4 worktree was clean at `0ddcfe36ad4af54418b780c4009dfde42fc30667`, `docs: record Neon catalog acceptance`; local HEAD, tracking `origin/phase/b4-production-readiness` and the actual remote feature branch matched. All implementation/verification changes are confined to this B4 checkout. The initial current-directory status inventory identified unrelated primary-checkout work; no primary-checkout file was changed. Main was not used or modified. B3 was not entered or modified; **UPSTREAM DISCLOSURE BLOCKED** remains unchanged.

Control review covered AGENTS, Phase A/ADRs 0017/0018, B1/B2 closure contracts and orchestration, B4A tooling, this canonical P1/P2 record, production environment/release procedures, package scripts and pinned dependencies, Prisma schema/config, all 11 migration SQL files, pg runtime/pool helper, seeds, and relevant 2C/2H/2I guards/fixtures. No dependency, migration, schema, application runtime, hosting or deployment change is required. Existing local runners/replay scripts remain unchanged. Ponytail and Neon PostgreSQL skills were used for implementation discipline and provider context; current repository decisions govern scope.

### Architecture, separation and production denial

`scripts/run-phase-b4b1-neon.mjs` is the deliberately separate entry point. Default B1/B2 invocations retain their original local host/port/database restrictions. Only explicit `--neon-disposable` calls enter `authorizeRemoteVerifier`, which independently repeats authenticated provider and SQL preflight before opening mutating suite connections. Fixture imports occur after this gate, so an unauthorized remote invocation cannot load private environment configuration. Remote errors have fixed output; the orchestration wrapper discards raw child output.

Remote authorization binds the exact project, real disposable branch creation receipt, run UUID, exact branch name/root/schema-only mode, nondefault/nonprotected status, Singapore primary read-write compute, exact compute ID/host, exact B1/B2 database and owner, direct operator versus pooled runtime, distinct exact SQL LOGINs and same-run public-test role receipts. Native authenticated GETs fetch branch, compute and database metadata from the fixed Neon API origin with redirects refused and bounded waits. File-supplied/mock metadata cannot authorize CLI execution. The current public Neon OpenAPI schema was read to confirm response fields and schema-only/expiration semantics; no account API request was made in P3A.

Both `br-still-lab-b3q03yuz` and `br-square-resonance-b3ew5c59`, both historical branch names, and database `pyramid_design` are hard denied. Authenticated SQL must independently report the expected database, current/session user, database owner, PostgreSQL 17, read-only transaction and SSL. The actual pg TLS stream must be encrypted and certificate/hostname-authorized. Branch identity is obtained through authenticated provider metadata and exact immutable compute-host binding; no invented SQL branch-identity function or URL heuristic is treated as branch proof. A production credential's username/URL, provider branch, endpoint, or authenticated database mismatch aborts before mutating operations.

No fictional branch ID is committed. A syntactically plausible ID alone cannot pass: a real authenticated GET and matching creation receipt are mandatory. Explicit rehearsal mode is `P3_REHEARSAL_AUTHORIZATION=AUTHORIZE_B4B1_P3B_DISPOSABLE_ONLY`; supplying this value is an operator action after owner approval, not approval by itself. Ambient PG*/NODE_OPTIONS overrides and private `.env`/`.env.local` files are refused.

### Credential and evidence handling

Privately inject four independently generated rehearsal credentials and the metadata API credential into the process environment. Bootstrap/provider provisioning credentials stay outside this runner and never enter migration/app/suite environments. No DSN/password/token argument, credential file, browser client code, raw provider payload, caught SQL detail or credential-bearing Prisma log is persisted. Child environments use a fixed platform allowlist plus the exact required rehearsal fields; unrelated Auth/Drive/Resend/Turnstile/provider/production variables are excluded. Prisma receives only that database's direct operator URL through environment. Suite DIRECT_URL is blank; application DATABASE_URL uses its pooled restricted runtime. B1_TEST_OWNER_URL is confined to the existing explicit setup/fault-injection test process.

Evidence projects only fixed status, exit code, assertion counts, project/branch/run/database/role identifiers, major PostgreSQL version and verified TLS mode into external JSON. Raw stdout/stderr is discarded, including failed child output. Output files use exclusive creation to prevent overwriting prior-run evidence. No secret-bearing temporary file is created; subprocess closure and CLI process exit end credential lifetime. Synthetic local regression uses the unchanged local orchestration; its legacy local drift command must never be repointed to remote credentials.

### Empty-state, migration and role boundary

The reusable `emptyDatabaseFacts`/`assertEmptyDatabase` checks catalog aggregates only. It rejects any application relation including views/sequences/partitioned tables/foreign tables, `_prisma_migrations`, non-system schema, function, type, operator/opclass/opfamily/collation/conversion/text-search object, non-plpgsql extension, event trigger, foreign server/wrapper, publication/subscription, large object, default ACL, extra language, transform or user-created cast. No application relation implies no application rows; no candidate fields are queried. Additional provider structures outside this narrow template0 expectation stop for review. Failure never invokes DROP, reset or automatic cleanup.

`--preflight` requires both fresh databases, prerequisites and receipts and performs read-only verification. `--migrate` first preflights both, then rechecks each immediately before its native ordered deploy: Node 22, installed pinned Prisma 6.12.0, direct verify-full operator, exactly 11 unchanged files per database. Total is **22 applications through two ordered deploys**. It validates finished ordered ledger/checksum state and the existing operator catalog/security contract afterward. No `reset`, `db push`, `resolve`, hand-written ledger, historical repair or migration edit exists in this path. A partial first deploy aborts the second/future fresh invocation; cleanup is branch disposal, never implicit resume.

Role preflight inventories all visible role attributes, memberships and aggregate ownership without querying password hashes/values. It checks copied anon/authenticated as NOLOGIN/NOINHERIT with all privileged flags false, no parents/config/ownership. New capability/public-test roles are NOLOGIN/INHERIT, with no privileged flags/parents/config/initial ownership. Each operator is LOGIN/INHERIT, all privileged flags false, owns only its named database, and has exactly locker ADMIN FALSE/INHERIT TRUE/SET TRUE plus sentinel/public-test ADMIN FALSE/INHERIT FALSE/SET TRUE memberships. Temporary bootstrap operator memberships must already be revoked. Runtime creation before empty-state deployment is rejected.

Current runtime preflight requires LOGIN/INHERIT, all privileged flags false, exactly pyramid_runtime ADMIN FALSE/INHERIT TRUE/SET TRUE, no ownership/config/other SET paths, no bootstrap runtime relationship, and every existing readiness-checker privilege/default-ACL/function/ownership/RLS contract assertion. Existing B1 tests retain their privilege matrix, immutability, default privileges, reference locking, sentinel/PUBLIC, job, audit, worker, retention, concurrency and escalation assertions. The sole provider-specific administrator adjustment replaces local `postgres` with catalog-confirmed privileged/provider roles, including pyramid_owner/neon_superuser, while strengthening rejection of any unrelated runtime SET path. B2 retains its workflows, InternalNote, hiring/content/jobs/audit/authorization/concurrency assertions. No expected behavior assertion is removed or relaxed.

### Probe containment and provider behavior

The checked-in mutation manifest includes source hashes, complete containment ranges and **246 enumerated SQL/workflow source entries across four seed/suite files**. Dynamic loops remain bound to these exact reviewed files; source changes invalidate manifest verification. DDL prerequisites and migration-derived privileges are separately explicit manifest operations, never silently supplied by verifiers.

B1's denial/savepoint blocks, sentinel SET blocks, default-ACL table/function probes and locker escalation probes roll back, including unexpectedly successful SQL denials before assertion failure. B2's SQL denial helper always rolls back. Durable synthetic seed/workflow/fault-injection/worker/retention/idempotency operations stay in their exact registered database; concurrency tests intentionally commit permitted synthetic transitions. Unexpected successful higher-level denial calls fail assertions and abort; any already-committed synthetic state remains confined to the disposable database and is removed by branch disposal. Temporary inactive reference fixtures are restored on normal success; interrupted runs rely on exact branch deletion. No production-like table cleanup assumption or broad repair is introduced.

Direct operator authentication/TLS/readonly transaction behavior precedes deployment. Pooled acceptance reuses the actual pg runtime with max 3 and idle/connection timeouts 10 seconds; it verifies expected user/database, transaction backend/context consistency across concurrent checkouts, rollback/context isolation, bounded client count, destruction of only its own checked-out client, reconnect and idle eviction/reconnect. It never terminates a provider backend, forces compute suspension or changes provider settings. Existing pool instances are refused. Cold-provider wake-up and channel binding are not proven by offline testing; live P3B records success/failure under current bounds. pg verify-full is enforced; URL channel_binding=require is not falsely claimed to enforce SCRAM-PLUS in the installed pg driver. Provider/whole-process connection budget remains separate from the application's three-slot pool.

Schema-only root metadata proves the no-data initialization mode; it does not prove copied role/password isolation. P3B must accept the documented copied administrator residual authority for this bounded lifetime or stop for a separately approved alternative. All new operators/runtime credentials are independent. Copied/provider role attributes/passwords and copied database ACLs are never repaired by this harness. Exclusive cross-database CONNECT is not claimed where PUBLIC CONNECT exists. Password inheritance cannot be established from the intentionally password-free catalog inspection.

### Cleanup receipts and exact P3B mutation manifest

`scripts/neon-rehearsal-mutation-manifest.json` is the generated reviewed authority: **55 ordered operations, 22 migration applications, two deployments**. It enumerates operation ID/type/target/purpose/prerequisite/production-impact assertion/reversibility/cleanup requirement, migration names/checksums and source-bound probe inventory. It remains `REQUEST_ONLY_NOT_EXECUTED` with `disposableBranchId: null`.

The exact boundary is: project withered-feather-01662312; one schema-only root b4b1-p3-schema-only-20261001 sourced without rows from migration-baseline; one primary compute/current Free defaults; optional 24-hour creation expiration; b4b1_p3_b1_owner and b4b1_p3_b2_owner plus only temporary bootstrap relationships needed to assign ownership and their exact revocations; the two named fresh template0 B1/B2 databases; new restricted pyramid_runtime/pyramid_reference_locker; contractual locker grants; two recorded distinct b1_public_<12-hex> NOLOGIN principals and test-only sentinel/public SET grants; all 11 unchanged migrations first to B1 then B2; two named independent restricted runtime LOGINs with sole runtime memberships/CONNECT and observed new-role creator relationship revocations; committed synthetic fixtures and reviewed B1/B2/pool probes; exact test-membership revocations/final contract checks; evidence capture and connection closure; deletion of only the same-run recorded disposable branch and its contained resources. No new sentinel, source-row clone, production resource mutation, copied/provider role repair, password rotation, extra project, upgrade, restore, provider activation or deployment is in this boundary.

P3B must record secret-free successful creation receipt projections immediately after each operation. Ledger shape is exactly `{ runId, project, branchId, startedAt, resources }`; each resource has only `{ kind, id, source, createdAt, runId, branchId }`. Source tags are neon-create-schema-only, neon-create-compute, sql-create-template0 or sql-create-role. IDs/names must be exact allowed targets, unique and created during that execution. Record branch/compute, both databases, both operators/runtimes, both capabilities and both public-test roles. Never save raw creation responses that might contain passwords or session metadata.

Cleanup planning accepts a partial same-run ledger so provisioning/migration failures can still be disposed. `--cleanup-plan` validates receipts and freshly GETs/rechecks only the recorded branch identity; it does not need an intact schema/runtime or open a database connection. It emits a plan only, never submits DELETE. Actual branch deletion belongs to P3B's separately authorized lifecycle workflow after evidence/connection closure, using that exact recorded ID, followed by a secret-free deletion result/absence check. No search-and-delete by name/prefix is provided. A missing creation receipt, production/historical ID, foreign run or unexpected resource rejects the plan. If deletion fails, retain and report exact IDs; expiration is an optional backstop, never cleanup proof. Optional expires_at is calculated at creation plus one day only if supported through the approved workflow; lack of safe support does not authorize changing plan/account settings.

### Commands and P3B prerequisites

Run from this worktree under Node 22 using the installed runtime; no package addition is needed:

```text
node scripts/verify-phase-b4b1-neon.mjs
node scripts/run-phase-b4b1-neon.mjs --manifest
node scripts/run-phase-b4b1-neon.mjs --dry-run
```

P3A's truthful dry-run result is **BLOCKED_DISPOSABLE_BRANCH_REQUIRED; provider calls 0; database connections 0; mutations 0**. A supplied ID still returns BLOCKED_LIVE_PREFLIGHT_REQUIRED offline. No mocked provider evidence can produce READY.

After separate owner authorization, P3B's authenticated lifecycle workflow must perform the proposed creation/provisioning operations, stop on collisions/incompatible inherited roles, and inject its actual receipts/identities through the [environment contract](../operations/production-environment.md). The runner deliberately has no provider POST/PATCH/DELETE or role/database provisioning executor. Its future staged commands are `--preflight`, `--migrate`, `--verify`, `--final-check` after exact membership revocations, then `--cleanup-plan`. These commands require the matching reviewed manifest, Node 22, Prisma 6.12.0, real branch/compute/database metadata, exact fresh owners/public-role receipts, absent private env/ambient overrides and an external evidence directory for execution. Migrations require no premature runtime; verification requires both accepted runtime identities and the complete resource ledger. Revoke test/bootstrap relationships using their exact recorded identities, retain contractual locker membership, and complete read-only final contract checks before disposal. CLI failures suppress details and stop; diagnose only through fixed classifications/source review, never raw secret-bearing logs.

### P3A verification and live effects

Offline/local harness checks: **190 PASS in aggregate** (159 final offline checks, ten real local catalog checks and 21 application-pool checks under a separate restricted local LOGIN). The final combined local command passed all 190, including temporary-object rejection and actual gated B1/B2 subprocess failure redaction. The manifest creates both accepted runtime identities before either suite starts and revokes test memberships only after both suites complete, matching runner stages. All twelve requested hard-deny classes, target bindings, missing authorization/branch, malformed configuration, authenticated production identity, metadata mismatch, empty-target fields, credential/evidence projection, manifest identity, same-run/partial cleanup, final role contract and local-default rejection are covered. Local pool evidence includes the actual ten-second saturated-pool timeout, rollback/context isolation, client disconnect, idle eviction and reconnect; it does not prove Neon PgBouncer/TLS/cold-provider behavior. Mock tests are explicitly labeled offline and cannot enter the CLI's live metadata authorization.

Dedicated local PostgreSQL **17.11**, Node **22.22.0**, pinned Prisma **6.12.0**. Isolated containers/networks and unused loopback 55442 were used; no unrelated containers were reused. The first internal-network attempt could not publish a host port and failed before SQL; it was removed and replaced with a dedicated bridge network. Final empty-catalog tests passed as a restricted database owner. Final local B1: **2,092 assertions**; B2: **142 assertions**; two native 11-migration deployments, status and zero schema drift passed. Local fixtures are synthetic only. All dedicated P3A containers/networks and their anonymous/named PostgreSQL test volumes have been removed; exact-ID cleanup, absence and the unchanged unrelated container-name inventory were checked. No provider expiry is relied on for local cleanup.

Relevant source lint, targeted script lint, typecheck, offline/local tests, existing B4 boundary scan, staged sensitive-content scan and git diff --check are required before commit and recorded in the release result. Production build/browser reruns are intentionally unnecessary because application/runtime source, schema, dependencies and frontend are unchanged. No dependency/security remediation or B3 gate waiver is claimed.

Changed scope: two documentation files, five new harness/test/manifest files, two minimal existing verifier adaptations; no package/lock/schema/migration/runtime/local-runner change. Conditional commit `feat: prepare isolated Neon rehearsal harness` is pushed only to phase/b4-production-readiness after all checks; exact local/tracking/remote SHA and clean state are reported at closure. Main is not merged.

P3A live counters: PRODUCTION DATABASE CONNECTIONS 0; PRODUCTION DATABASE MUTATIONS 0; PRODUCTION ROLE MUTATIONS 0; PRODUCTION MIGRATIONS 0; PRODUCTION DATA WRITES 0; NEON DISPOSABLE BRANCHES CREATED 0; NEON DATABASES CREATED 0; NEON ROLES CREATED 0; REMOTE MIGRATIONS EXECUTED 0; REAL CANDIDATE DATA ACCESSED NO. B3 WORKTREE TOUCHED NO. PRODUCTION DEPLOYMENT NO. NEXT PHASE NOT STARTED.

**Owner decision:** authorize precisely the generated 55-operation disposable P3B boundary, including scoped provisioning, synthetic probes, copied administrator residual exposure and irreversible exact-ID cleanup, or leave P3B closed. Authorization never extends to production provisioning/migration/repair or deployment.

## B4B1-P3B authorized attempt and credential blocker

**Date:** 2026-10-01 (Europe/London). **Result: OWNER ACTION REQUIRED.** The owner supplied `AUTHORIZE_B4B1_P3B_DISPOSABLE_ONLY` for only the verified P3A manifest. Execution stopped before operation 1. No disposable branch, compute, database or role was created; no SQL connection, provisioning, migration, seed, suite, pool probe or deletion was executed. No live compatibility acceptance is established.

### Repository, authorization and manifest validation

The requested B4 worktree was clean on `phase/b4-production-readiness` at `bcc4ba8a8118aa12e1918fb73354f1f30e3537fa`, `feat: prepare isolated Neon rehearsal harness`. Local HEAD, tracking branch and actual remote feature branch matched before provider inspection. Main was not merged or changed. B3 was not entered or modified; **UPSTREAM DISCLOSURE BLOCKED** remains unchanged.

The manifest's LF-normalized SHA-256 is exactly `28ae551e32af7f8f009d23b7521b93706d93d03529e15e0d6059b49163ba2eb8`; its status remains `REQUEST_ONLY_NOT_EXECUTED`, with 55 operations, 22 proposed migration applications and two ordered deployments. Regeneration from current migration/probe sources matched the reviewed JSON exactly. Authorization has been received; prerequisites for its execution have not been satisfied. No manifest or harness change was made.

Execution UUID: `d744470a-583a-4ad8-b126-02055e2686c4`. No created-resource receipts or fictional branch ID exist. The external blocked-attempt evidence is separate from a creation/cleanup ledger and contains no credentials.

### Authenticated provider inspection and pre-operation stop

The existing authenticated Edge Neon Console session was confirmed in the exact project. Two read-only Neon connector branch inventories independently confirmed only these existing branches:

| Branch | Exact ID | Observed state |
| --- | --- | --- |
| migration-baseline | br-still-lab-b3q03yuz | ready; default |
| migration-synthetic-verification | br-square-resonance-b3ew5c59 | archived |

The exact disposable branch name `b4b1-p3-schema-only-20261001` was absent. No SQL query or database connection was used for either existing branch. Archived historical state was preserved.

**Blocker:** `providerPreflight` and `cleanupMetadata` in the unchanged `scripts/neon-rehearsal-target.mjs` require an ephemeral `P3_NEON_API_KEY` for native authenticated metadata GETs. Presence-only checks found neither `P3_NEON_API_KEY` nor `NEON_API_KEY` in process, user or machine environments. No installed Neon CLI command was found. The browser and connector sessions authenticate their own operations but their inspected interfaces expose no supported bearer-token handoff to this local runner. Browser cookies/session material were not extracted. Connector snapshots were not substituted for the harness's native authenticated gate.

Creating a new API credential is not one of the authorized 55 operations. It was not attempted. The inspected connector branch-creation signature also has no schema-only parameter, so it was not used to create a normal data-copy branch. The browser creation workflow was not submitted while the required subsequent authentication path remained unavailable. Existing operator/runtime variables were absent, as expected before identity provisioning; they are not treated as a separate failure of already-created resources.

The safe continuation prerequisite is to make an appropriate existing Neon API credential available through private ephemeral process injection, without sharing its value in chat, repository, arguments or evidence. If acquiring a new credential or adopting another authentication mechanism is necessary, that needs a separately authorized preparation step. P3B does not patch the harness, manufacture metadata, weaken TLS/target checks or expand the mutation manifest to work around this blocker.

### Rehearsal, verification, evidence and cleanup

B1/B2 empty-target checks, copied-role catalog inspection, capability provisioning, migrations, runtime creation, live suites, direct transport, pooled transport and final contract checks are all **NOT_RUN**. B1, B2 and live pool assertion counts are each 0. Copied role/password isolation and live PostgreSQL/Neon architecture compatibility remain unverified; the stop is an authentication prerequisite failure, not an observed database incompatibility.

Node 22 offline regression passed **159 assertions**, including production hard-deny, manifest/source identity, redaction and cleanup-receipt rejection. Two additional direct refusal checks confirmed that both native metadata preflight and cleanup metadata reject absent credentials with `PROVIDER_METADATA_CREDENTIAL_REQUIRED` before any provider call or database connection; no branch ID was supplied to those refusal checks. Dry run remained **BLOCKED_DISPOSABLE_BRANCH_REQUIRED; provider calls 0; database connections 0; mutations 0**. Those counters describe the dry-run command; the separate two connector metadata reads are disclosed above. They do not establish a live READY preflight. No real disposable ID or receipt was invented to invoke the live runner.

Secret-free external evidence is stored under `C:\Users\atikm\.codex\worktrees\pyramid-b4-evidence\b4b1-p3b-d744470a-583a-4ad8-b126-02055e2686c4\attempt.json`: exact run/manifest identifiers, projected branch metadata, credential-presence classifications, verification counts, all-zero mutation effects and blocked status only. No raw provider response, password, DSN, token, cookie or candidate record is persisted. No secret-bearing artifact was created.

Cleanup is **NOT_REQUIRED**: no same-run disposable resources exist. Final read-only provider inventory confirmed both exact existing branch IDs remain present and no disposable branch was created. No delete, expiry, reset, restore or production database post-check connection occurred. Disposable resources remaining: **0**.

The canonical acceptance record is the only repository change. Documentation scope, sensitive-content/boundary scan including external attempt evidence, and `git diff --check` passed before the conditional documentation commit. No application, dependency, package, schema, migration, verifier, runtime or B3 change is made. Unrelated frontend/browser/build suites are not rerun. A documentation commit records this blocked attempt and never implies PASS.

### Live effects and programme boundary

NEON DISPOSABLE BRANCHES CREATED: 0; NEON DISPOSABLE BRANCHES DELETED: 0; NEON DISPOSABLE DATABASES CREATED: 0; NEON DISPOSABLE ROLES CREATED: 0; REMOTE MIGRATION APPLICATIONS: 0; B1 ASSERTIONS: 0; B2 ASSERTIONS: 0; POOL ASSERTIONS: 0. PRODUCTION DATABASE CONNECTIONS: 0; PRODUCTION DATABASE MUTATIONS: 0; PRODUCTION ROLE MUTATIONS: 0; PRODUCTION MIGRATIONS: 0; PRODUCTION DATA WRITES: 0; REAL CANDIDATE DATA ACCESSED: NO; DISPOSABLE RESOURCES REMAINING: 0.

No production migration/provisioning decision was made. The historical production schema/data remain outside this attempt. No deployment, DNS, plan, provider activation, B3 waiver or B4B1-P4 is authorized by this result. Resume P3B only after its private authentication prerequisite is satisfied and repository/manifest/provider identity are freshly revalidated; a new execution must use its own UUID and receipts.

PHASE B4B1-P3B: OWNER ACTION REQUIRED; MANIFEST AUTHORIZATION: VERIFIED; DISPOSABLE BRANCH: NOT_CREATED; B1 MIGRATIONS: NOT_RUN; B2 MIGRATIONS: NOT_RUN; B1 LIVE NEON: NOT_RUN; B2 LIVE NEON: NOT_RUN; DIRECT NEON TRANSPORT: NOT_RUN; POOLED NEON RUNTIME: NOT_RUN; LIVE NEON ARCHITECTURE COMPATIBILITY: FAIL (acceptance not established; no live test executed); FINAL CONTRACT: NOT_RUN; CLEANUP: NOT_REQUIRED; DISPOSABLE RESOURCES REMAINING: 0; PRODUCTION DATABASE MUTATIONS: 0; PRODUCTION MIGRATIONS: 0; REAL CANDIDATE DATA ACCESSED: NO; B3 WORKTREE TOUCHED: NO; B3 SECURITY GATE: UPSTREAM DISCLOSURE BLOCKED; PRODUCTION DEPLOYMENT: NO; NEXT PHASE: NOT STARTED.

## B4B1-P3B-R1 stopped lifecycle invocation

**Date:** 2026-10-01 (Europe/London). **Result: FAIL — local lifecycle invocation stopped before manifest operation 1.** The previously unavailable credential is now present and accepted for authenticated metadata access to the exact project. No disposable branch creation was attempted. No SQL connection, role/database provisioning, migration, seed, live suite, pool probe or deletion ran. Live Neon architecture acceptance remains incomplete; this attempt establishes no SQL/provider compatibility defect.

### Repository, authorization and preflight

The exact requested B4 worktree began clean on `phase/b4-production-readiness`, at `4ee4e751224dca616f21e80b79bf4d4e5fd86a22`, `docs: record live Neon rehearsal`. HEAD, tracking branch and the actual remote feature branch matched. Repository authority was re-read: AGENTS, Phase A, ADRs 0017/0018, B1/B2 closure contracts, B4A, this canonical P3A/P3B record, the runner/target/manifest modules, relevant verifier adaptations and readiness checker, and production environment/release procedures. The primary checkout and B3 were not entered or changed.

The unchanged manifest's byte SHA-256 is `28ae551e32af7f8f009d23b7521b93706d93d03529e15e0d6059b49163ba2eb8`. Its generated source inventory exactly matches the checked-in JSON: 55 operations, `REQUEST_ONLY_NOT_EXECUTED`, null disposable branch ID, 22 proposed migration applications and two ordered deployments. Owner authorization remains exactly `AUTHORIZE_B4B1_P3B_DISPOSABLE_ONLY`; no additional operation or production authority was inferred.

Execution UUID: `091aab01-1c02-4f96-ae64-cca7c99be986`, distinct from the blocked attempt. Installed cached Node **22.22.0** ran the unchanged offline verifier: **159 PASS**. The dry run remained **BLOCKED_DISPOSABLE_BRANCH_REQUIRED**, with zero provider calls, database connections and mutations for that command. These are offline checks, not live READY evidence.

### API credential and exact project access

Presence-only inspection found `P3_NEON_API_KEY` present. Its value was used privately in authenticated request headers and was never displayed, hashed, persisted, included in command arguments or placed in evidence/documentation. Other environment variables were not inventoried for credential discovery.

Native authenticated read-only project access verified **withered-feather-01662312**, provider PostgreSQL major **17**, region **aws-ap-southeast-1**. The project-scoped branch inventory matched the protected identities: `migration-baseline` / `br-still-lab-b3q03yuz` was ready/default/unprotected; `migration-synthetic-verification` / `br-square-resonance-b3ew5c59` was archived/nondefault/unprotected. The proposed disposable branch name was absent. These metadata observations opened no SQL connection and did not inspect business rows.

Broader credential permissions were not established or enumerated. Every authenticated request was constrained to the fixed approved project; no unrelated project was enumerated or modified. The credential was not rotated or replaced. Credential result: **PRESENT_AND_ACCEPTED** for the metadata access performed, not a claim that mutation permissions were tested.

### Failure and mandatory stop

The existing repository runner deliberately delegates provider creation/provisioning/deletion to the authorised lifecycle workflow. The local ephemeral invocation used the unchanged repository modules and supplied no fabricated provider receipt. During its initial project revalidation, its request-path guard required a slash-prefixed suffix; the invocation passed an empty suffix for the project-root metadata request. The guard raised **API_PATH_DENIED before fetch**. Manifest operation 1 was never reached and no provider mutation request was submitted.

This was an error in the local invocation, not a credential rejection or an observed defect in the committed P3A harness. Forward execution stopped. The invocation was not patched or retried, and no SQL, manifest, migration, privilege, security expectation or repository harness was changed. Any corrected execution requires a separately reviewed continuation; it was not started in R1.

### Acceptance gates and copied roles

| Gate | R1 result |
| --- | --- |
| Exact project / manifest / credential access | PASS / VERIFIED / PRESENT_AND_ACCEPTED |
| Disposable branch / real provider-generated ID | NOT_CREATED / no ID or creation receipt |
| Live P3A provider and SQL preflight READY | NOT_RUN; remains BLOCKED_DISPOSABLE_BRANCH_REQUIRED |
| Copied role attributes / memberships / residual authority | NOT_OBSERVED in R1; prior findings remain historical |
| B1 / B2 genuinely empty databases | NOT_RUN / NOT_RUN |
| Capability roles and exact memberships | NOT_RUN |
| B1 / B2 migrations and checksum/order acceptance | NOT_RUN / NOT_RUN |
| B1 / B2 restricted runtime identity | NOT_RUN / NOT_RUN |
| B1 / B2 live suites | NOT_RUN / NOT_RUN; zero live assertions |
| Direct SQL TLS / pooled runtime / context and reconnect | NOT_RUN / NOT_RUN / NOT_RUN |
| Final RLS / policies / functions / ownership / defaults contract | NOT_RUN |
| Cleanup | NOT_REQUIRED; no created resources |
| Production metadata post-check | PASS; protected branch projections unchanged; disposable name absent |

HTTPS API authentication does not establish direct PostgreSQL TLS, Prisma transport, restricted runtime, pooling or SQL contract acceptance. No copied role/password was inspected or modified during R1. The 58 unknown-provenance production rows were not revisited; there was no production SQL connection or real candidate-data access.

### Evidence and post-check clarification

Secret-free external evidence directory: `C:\Users\atikm\.codex\worktrees\pyramid-b4-evidence\b4b1-p3b-r1-091aab01-1c02-4f96-ae64-cca7c99be986`.

- `preflight.json`: verified run/manifest/project, projected protected branch metadata, credential classification, 159 offline assertions and zero mutations.
- `result.json`: original fixed-code invocation failure and all-zero live counters. No creation ledger exists because no resource was created.
- `post-check-and-clarification.json`: independent final authenticated read-only comparison with the saved preflight baseline, no disposable branch and unchanged protected metadata.

The original invocation also emitted `PRODUCTION_METADATA_CHANGED` after comparing post-check metadata with an uninitialised in-invocation baseline. That generated diagnostic is preserved and explicitly corrected by the separate evidence: it does **not** establish a production change. The final check used the saved authenticated preflight baseline, passed, and performed no repair or forward mutation. Production schema/data equivalence was not re-queried or inferred from metadata.

Evidence contains fixed classifications, approved identifiers, counts and projected metadata only; no raw provider response, DSN, password, token, cookie, candidate record or secret-bearing output is persisted. No secret was sought in another checkout. Documentation/evidence boundary, sensitive-pattern, staged scope and whitespace checks are required before the authorised documentation commit. Application/build suites are not rerun for this documentation-only result; their historical passes are not represented as live acceptance.

### Repository scope and live effects

Only this canonical acceptance record is updated. Application code, dependencies, schema, migrations, manifest, harness, verifier adaptations and security expectations remain unchanged. The conditional commit message is exactly `docs: record completed Neon rehearsal`; it records a completed **failed attempt**, not successful live acceptance. Push is limited to `phase/b4-production-readiness`; main and B3 remain untouched.

NEON DISPOSABLE BRANCHES CREATED: 0; NEON DISPOSABLE BRANCHES DELETED: 0; NEON DISPOSABLE DATABASES CREATED: 0; NEON DISPOSABLE ROLES CREATED: 0; REMOTE MIGRATION APPLICATIONS: 0; B1 ASSERTIONS: 0; B2 ASSERTIONS: 0; POOL ASSERTIONS: 0; PRODUCTION DATABASE CONNECTIONS: 0; PRODUCTION DATABASE MUTATIONS: 0; PRODUCTION ROLE MUTATIONS: 0; PRODUCTION MIGRATIONS: 0; PRODUCTION DATA WRITES: 0; REAL CANDIDATE DATA ACCESSED: NO; DISPOSABLE RESOURCES REMAINING: 0.

No production provisioning/migration/deployment, B3 work, B4B1-P4, further unknown-row investigation or Hostinger/Supabase/Drive/Resend/Turnstile phase was started. No live compatibility PASS is claimed.

PHASE B4B1-P3B-R1: FAIL; MANIFEST AUTHORIZATION: VERIFIED; API CREDENTIAL: PRESENT_AND_ACCEPTED; DISPOSABLE BRANCH: NOT_CREATED; B1 MIGRATIONS: NOT_RUN; B2 MIGRATIONS: NOT_RUN; B1 LIVE NEON: NOT_RUN; B2 LIVE NEON: NOT_RUN; DIRECT NEON TRANSPORT: NOT_RUN; POOLED NEON RUNTIME: NOT_RUN; LIVE NEON ARCHITECTURE COMPATIBILITY: FAIL (acceptance incomplete; no live SQL test executed); FINAL CONTRACT: NOT_RUN; CLEANUP: NOT_REQUIRED; DISPOSABLE RESOURCES REMAINING: 0; PRODUCTION DATABASE MUTATIONS: 0; PRODUCTION MIGRATIONS: 0; REAL CANDIDATE DATA ACCESSED: NO; B3 WORKTREE TOUCHED: NO; B3 SECURITY GATE: UPSTREAM DISCLOSURE BLOCKED; PRODUCTION DEPLOYMENT: NO; NEXT PHASE: NOT STARTED.

## B4B1-P3B-H1 path-policy investigation and stop

**Date:** 2026-10-01 (Europe/London). **Result: OWNER ACTION REQUIRED.** The H1 instruction permits inspection, official contract verification, offline checks and documentation, but explicitly requires a stop if the provider model is materially incomplete. That stop was reached before editing any harness source. No P3B mutation authorization was exercised. No R2 attempt, credential access, provider metadata call or SQL connection occurred.

### Repository identity and evidence

The exact B4 worktree began clean on `phase/b4-production-readiness`, at `192435d9befbdab5eb12289be2226b7e76f4343c`, `docs: record completed Neon rehearsal`. Local HEAD, tracking `origin/phase/b4-production-readiness` and actual remote feature branch matched. Main was not merged. B3 was not entered, read or changed; its supplied **UPSTREAM DISCLOSURE BLOCKED** gate remains.

Repository authority and trace review covered AGENTS, Phase A, ADRs 0017/0018, B1/B2 closure and remote verifier guards, B4A/P3A/P3B/R1 records, the complete P3 runner/target/manifest/offline verifier, cleanup ledger validation, environment contract and release procedures. The retained R1 `result.json` and `post-check-and-clarification.json` were read as evidence; their old results are not a new live verification. The clarification distinguishes the original uninitialized metadata comparison from the subsequent successful read-only post-check.

H1's external, secret-free evidence directory is `C:\Users\atikm\.codex\worktrees\pyramid-b4-evidence\b4b1-p3b-h1-20261001-h1-muoz67gb`. It contains `reproduce-r1-guard.mjs`, `verification.json` and a public `neon-openapi-v2.json` snapshot. Its identifier is an investigation record, not a P3B execution or creation receipt. No raw credential-bearing provider response is retained.

### Proven root cause and request trace

The retained R1 custom tool-call source in session `01a0f569-a283-7111-8f44-24c74fe7902c` constructs a fixed base of `https://console.neon.tech/api/v2/projects/` plus `REHEARSAL.project`. The actual call is `const projectData=await api('')`; `api(path,method='GET',body)` defaults to GET. Its exact guard is:

```js
requireSafe(path.startsWith('/')&&!path.includes('..')&&!path.includes('://'),'API_PATH_DENIED');
```

Thus the intended request was **GET /api/v2/projects/withered-feather-01662312**. Empty suffix construction reached no normalization, method allowlist or resource classification: the first conjunct failed before `fetch(base+path, ...)`. No network request for that project-root call and no manifest operation followed. The fixed project base was present, but method/resource authorization was absent. The provider would execute only after this guard passed.

Searching committed scripts confirms no `API_PATH_DENIED` implementation, lifecycle `api()` helper, POST/DELETE executor or shared API path/method classifier. `providerPreflight` and `cleanupMetadata` in `scripts/neon-rehearsal-target.mjs` perform fixed-origin native GETs only. The P3A canonical design deliberately delegates provider mutation to a separate authorized lifecycle workflow. The R1 helper was ephemeral and never committed. Altering those existing GET wrappers would not repair the actual failing invocation.

The original predicate also accepts encoded traversal/slash/backslash, duplicate/trailing slashes, query/fragment suffixes and unsupported resources. It accepts any HTTP method for a permitted suffix, including DELETE of either protected branch or an unrecorded branch. These are offline observations about the helper, not provider executions or a claim that every surrounding workflow guard is bypassed. Host/TLS were not relaxed: the original base is fixed HTTPS, redirects are refused, and committed SQL TLS validation remains unchanged.

### Official provider contract, verified 2026-10-01

Current primary evidence is the [Neon API index](https://neon.com/docs/reference/api.md), its linked [release v2 OpenAPI specification](https://neon.com/api_spec/release/v2.json), and [branching API guide](https://neon.com/docs/guides/branching-neon-api.md), fetched without authentication. The saved public specification SHA-256 is `e4a2b8f77f9dcbc6b4b829790829b3a9d5d5df72f16d4a5182063a787780a004`. Public documentation reads are separate from Management API/account calls, which were zero.

The specification's server is exactly `https://console.neon.tech/api/v2`. Only these classes are actually used by the committed P3A GET wrappers or retained R1 invocation:

| Method | Path below /api/v2 | operationId | Use |
| --- | --- | --- | --- |
| GET | /projects/{project_id} | getProject | R1 initial project identity |
| GET | /projects/{project_id}/branches | listProjectBranches | Collision/protected inventory and cleanup absence |
| GET | /projects/{project_id}/branches/{branch_id} | getProjectBranch | Branch identity/readiness and cleanup recheck |
| POST | /projects/{project_id}/branches | createProjectBranch | Manifest branch-create, never executed in H1 |
| DELETE | /projects/{project_id}/branches/{branch_id} | deleteProjectBranch | Same-run disposal, never executed in H1 |
| GET | /projects/{project_id}/branches/{branch_id}/endpoints | listProjectBranchEndpoints | Compute binding |
| GET | /projects/{project_id}/branches/{branch_id}/databases | listProjectBranchDatabases | Database/owner binding |
| GET | /projects/{project_id}/connection_uri | getConnectionURI | R1 disposable bootstrap URI retrieval |

The last operation uses project/branch/endpoint/database/role/pooled parameters; its credential-bearing response must remain memory-only. Role/database provisioning in the retained invocation is SQL, not API role/database creation. No operations endpoint or role endpoint is invoked; none is proposed for an allowlist. The specification supports schema-only root creation using `parent_id` as schema source, a `read_write` endpoint in the creation body, and branch DELETE responses 200/204. No incompatibility with the 55-operation plan was identified from these public contracts; account availability/permissions are untested. Project creation/deletion/configuration mutation, organization/account mutation and alternate hosts remain outside authority.

### Stop and required correction for review

Changing the slash predicate to accept an empty string would cure the immediate symptom but leave H1's required method-aware, resource-aware, canonical deny-by-default policy absent. There is no committed policy to amend or regression-test for lifecycle POST/DELETE. Building and integrating that policy is a provider-boundary implementation, not the presumed narrow allowlist correction. H1 section 19 therefore prohibits proceeding with it here.

A separately reviewed correction must establish one source-controlled canonical request boundary shared by metadata and lifecycle callers: exact approved HTTPS origin/project; explicit method/resource classes from the table; unambiguous pathname/query handling; rejection of traversal, encoded separators, userinfo, malformed/foreign URLs and Unicode confusion; manifest/body validation before branch creation; and same-run receipt plus fresh branch identity validation before exact-ID deletion. Both protected branch IDs/names and production database remain hard denies for mutating targets. The connection_uri query needs exact same-run branch/compute and bootstrap scope, with memory-only credentials. Integrating the external lifecycle caller and writing H1's full 18-case positive/negative policy suite requires review; no mutation executor, endpoint expansion, manifest change or new approval token was introduced here.

### Offline verification, scope and manifest integrity

Node **22.22.0** complete existing offline suite: **159 PASS**, including native GET mocks, project/production-target denials, same-run/partial cleanup, manifest regeneration/source containment inventory, redaction/environment projection and B1/B2 default/gated subprocess refusal. The external pure-predicate reproduction passed **25 assertions**, proving rejection before mocked transport and reproducing missing defenses. It has no fetch or database client; accepted bad cases deliberately document defects and are not security acceptance passes. H1's corrected-policy regression suite is **NOT IMPLEMENTED** under the stop. B1/B2 full SQL/catalog/pool replays and live tests were not run; no changed SQL boundary needs replay.

Non-mutating native `--dry-run`: **BLOCKED_DISPOSABLE_BRANCH_REQUIRED provider_calls=0 database_connections=0 mutations=0**. It never calls project-root metadata and cannot establish that path's acceptance. No credential presence/value inspection was needed. No key was read, printed, hashed, persisted or enumerated; test canaries are synthetic only.

Application lint, targeted lint for all four existing harness modules, typecheck, repository scope/whitespace and existing B4 boundary/sensitive scan passed. The sensitive scan inspected retained B4A build artifacts; no new production build/browser/SQL suite is claimed for this documentation-only stop. All source, dependencies, schema, migration files and the manifest are unchanged. Only this canonical document is modified. No files are staged. The conditional `fix: correct Neon rehearsal API path policy` commit/push is **NOT ELIGIBLE** because no correction/security acceptance exists; HEAD/tracking/remote remain the baseline. This document is left for review.

MANIFEST OPERATIONS: 55

MANIFEST STATUS: REQUEST_ONLY_NOT_EXECUTED

MANIFEST SHA256 BEFORE: 28ae551e32af7f8f009d23b7521b93706d93d03529e15e0d6059b49163ba2eb8

MANIFEST SHA256 AFTER: 28ae551e32af7f8f009d23b7521b93706d93d03529e15e0d6059b49163ba2eb8

MANIFEST SEMANTICS CHANGED: NO

Generated semantic/source inventory matches the reviewed JSON exactly, including 22 migration applications and two deployments. Existing owner authorization remains applicable only to that unchanged manifest; it is not permission to bypass the newly identified provider implementation/review prerequisite.

### Live effects and final gates

PROVIDER READ-ONLY CALLS: 0; PROVIDER MUTATION CALLS: 0; DATABASE CONNECTIONS: 0; NEON DISPOSABLE BRANCHES CREATED: 0; NEON DISPOSABLE BRANCHES DELETED: 0; NEON DISPOSABLE DATABASES CREATED: 0; NEON DISPOSABLE ROLES CREATED: 0; REMOTE MIGRATION APPLICATIONS: 0; PRODUCTION DATABASE MUTATIONS: 0; PRODUCTION ROLE MUTATIONS: 0; PRODUCTION MIGRATIONS: 0; PRODUCTION DATA WRITES: 0; REAL CANDIDATE DATA ACCESSED: NO; DISPOSABLE RESOURCES REMAINING: 0. Resource zero follows prior verified no-creation evidence plus H1's zero creation calls; no fresh account inventory was performed.

PHASE B4B1-P3B-H1: OWNER ACTION REQUIRED; ROOT CAUSE: PROVEN; API PATH POLICY: FAIL; METHOD BINDING: FAIL; PROJECT BINDING: PASS (existing fixed project and authorization checks only; not complete lifecycle policy acceptance); PROTECTED RESOURCE DENIALS: FAIL (existing P3A guards pass, R1 helper path policy does not enforce them); MANIFEST UNCHANGED: YES; MANIFEST AUTHORIZATION STILL APPLICABLE: YES (same 55 operations only; execution blocked); OFFLINE HARNESS: PASS (existing 159 checks; corrected policy acceptance absent); LIVE MUTATIONS: 0; DISPOSABLE RESOURCES REMAINING: 0; P3B-R2 READY: NO; B3 WORKTREE TOUCHED: NO; B3 SECURITY GATE: UPSTREAM DISCLOSURE BLOCKED; PRODUCTION DEPLOYMENT: NO; NEXT PHASE: NOT STARTED.

## B4B1-P3B-H2 canonical provider boundary

**Date: 2026-10-01 (Europe/London). Result: PASS for security architecture remediation and offline verification.** R2 is ready for programme review, not started or authorized by this engineering result. No Management API/account call, SQL connection, provider/database mutation or resource creation/deletion occurred. Public documentation retrieval is separate from Management API calls. No live Neon compatibility pass is claimed.

### Repository and H1 preservation

The prescribed B4 worktree and `phase/b4-production-readiness` branch started at `192435d9befbdab5eb12289be2226b7e76f4343c`; local, tracking and actual remote feature-branch SHAs matched. The sole pre-existing modification was this document's 79-line H1 addition. It was inspected and copied to external evidence before edits. This H2 section is appended after the complete unchanged H1 record. R1's failure and H1's architectural stop remain historical facts. No reset, main merge, primary-checkout edit or B3 access occurred. B3 remains **UPSTREAM DISCLOSURE BLOCKED**.

H1's external verification/OpenAPI and retained R1 source were inspected. They are historical evidence only, never runtime dependencies. H2 evidence directory: `C:\Users\atikm\.codex\worktrees\pyramid-b4-evidence\b4b1-p3b-h2-20261001`. It contains the H1 preservation copy, current public contract snapshots, verification logs, manifest/source inventory and scope checks, with no real credentials or raw account responses.

### Provider architecture and allowed matrix

`scripts/neon-rehearsal-provider.mjs` is the sole P3 Management API transport. Its frozen explicit operation matrix constructs methods/paths internally. Callers cannot supply URLs, origins, HTTP methods, request bodies, query strings, redirect settings or transport options. Existing metadata preflight/cleanup reads and the new committed lifecycle all invoke it.

All paths below are under exactly `https://console.neon.tech/api/v2/projects/withered-feather-01662312`:

| Operation | Method and suffix | Authority |
| --- | --- | --- |
| getProjectMetadata | GET exact project root | fixed project; projected ID/PostgreSQL major/region |
| listBranches | GET /branches | fixed project; incomplete paginated inventory stops |
| getBranch | GET /branches/{id} | validated ASCII branch ID; matching returned project/ID |
| listBranchEndpoints | GET /branches/{id}/endpoints | validated ID; project/branch/region/host/read-write binding |
| listBranchDatabases | GET /branches/{id}/databases | validated ID; projected name/owner/branch only |
| createDisposableBranch | POST /branches | unchanged manifest, operator authorization, one session attempt, fresh collision/source checks |
| getConnectionUri via withBootstrapConnection | GET /connection_uri | authentic same-run receipt; fresh branch/compute/database checks; fixed query; memory-only consumer |
| deleteSameRunDisposableBranch | DELETE /branches/{id} | authentic same-session receipt, execution UUID, valid ledger, closed cleanup state, fresh provider identity |

No generic `api(path, method, body)` or `deleteBranch(id)` exists. No second provider transport remains in the lifecycle or target module. A saved ledger alone cannot grant delete authority.

### Official Neon contract verification

The current public [API reference](https://neon.com/docs/reference/api.md), linked [release v2 OpenAPI](https://neon.com/api_spec/release/v2.json), [API key concepts](https://neon.com/docs/reference/api/key-concepts.md), and [branch guide](https://neon.com/docs/manage/branches.md) were retrieved on 2026-10-01. OpenAPI SHA-256: `e4a2b8f77f9dcbc6b4b829790829b3a9d5d5df72f16d4a5182063a787780a004`, matching H1's public snapshot. Its server is `https://console.neon.tech/api/v2`.

Verified operationIds: getProject, listProjectBranches, getProjectBranch, createProjectBranch, deleteProjectBranch, listProjectBranchEndpoints, listProjectBranchDatabases, getConnectionURI. All eight are required by the retained lifecycle and existing preflight. No additional endpoint is authorized. Creation accepts 201; delete accepts 200/204. Schema-only uses parent_id as a schema source and creates a root without source rows. One read_write endpoint is part of that creation body.

The generic API description says root branches cannot be deleted; the more specific current branch guide explicitly distinguishes the original project root from deletable backup/schema-only roots. H2 retains only reviewed nondefault/unprotected schema-only root cleanup. Actual account behavior remains untested. Optional expiration remains skipped because OpenAPI describes Early Access availability and account support is unproven. No alternative endpoint or account configuration is introduced.

### Denied matrix, origin/project binding and canonicalization

Everything outside the eight operations is denied: project creation/deletion/PATCH, organization/account/API-key mutations, Auth/Data API, role/database API provisioning, endpoint mutations, billing/plan changes, recovery, branch patch/default/protection changes, arbitrary methods and extra resources. Provisioning remains fixed SQL from the unchanged manifest, confined to the same-run disposable branch.

Exact project and HTTPS origin are constants verified inside the boundary; foreign project/configuration keys fail before transport. A canonical URL is constructed from constants and strict ASCII IDs, then its origin/protocol/credentials/exact pathname and absence of injected query/fragment are checked before fetch. Redirects use `error`; redirected/different final URLs are rejected. TLS remains verified and Node's disable-verification override is refused. The lifecycle additionally refuses private env files and ambient PG/NODE_OPTIONS overrides.

Regressions reject alternate schemes/hosts, absolute/protocol-relative URLs, userinfo/host confusion, traversal/dot segments, encoded traversal/slash/backslash, double encoding, literal backslash, duplicate/trailing slashes, query/fragment injection, malformed percent sequences, controls/NUL, Unicode separators and trailing resources. Authorization cannot inspect one string while fetching a differently interpreted URL.

### Branch creation authorization

Before creation, the boundary verifies exact manifest bytes/SHA-256, full regenerated semantic/source inventory and all 55 operations. It snapshots reviewed data, checks project PostgreSQL 17/region/protected-source identity, and rejects name collisions/incomplete inventories. The only body contains the fixed name, approved source ID, schema-only mode, protected false and one default read_write endpoint. Arbitrary JSON, parent/name/region/expiration/compute/data-copy/protection fields are not accepted. Response metadata must prove a new nondefault/unprotected schema-only root and expected compute.

Only a validated provider creation response creates the immutable in-memory receipt. If the branch is positively receipted but compute validation fails, a partial receipt remains eligible for same-run cleanup. A missing/malformed/ambiguous response cannot be converted into delete authority through a later name search.

### Same-run cleanup authorization

Delete requires the original receipt object from that boundary session, matching execution UUID and exact project/provider branch ID, expected disposable name freshly verified from the provider, matching creation timestamp, existing ledger validation and `EVIDENCE_SAVED_CONNECTIONS_CLOSED`. The lifecycle saves evidence and closes connections first; the boundary independently denies cleanup while its bootstrap consumer is active. Both protected branch IDs are rejected independently even in forged cleanup contexts. Names/prefixes, cloned or stale ledgers, unrecorded IDs, previous UUIDs and mismatched receipts cannot authorize deletion.

### Non-idempotent retry handling

Create/delete each have synchronous one-attempt guards, including concurrent callers. There is no mutation retry loop for timeout, network loss, bad JSON, non-success status or ambiguity. Read-only reconciliation records exact delete-target absence/presence or unreceipted creation-name presence; it never restores mutation authority. Successful DELETE additionally requires exact-ID 404 absence confirmation. A still-present/deleting target, unknown outcome, process loss or missing authentic receipt requires owner reconciliation. No second POST/DELETE, name-based cleanup or resume flag is offered. Generic provider retry guidance does not override this stricter manifest safety policy.

### Secret and connection URI handling

The real API key was not read, printed, hashed, persisted or enumerated in H2. In the implementation it is header-only and excluded from Prisma's environment. Diagnostics contain only fixed classification, approved operation, method and HTTP status. Caught transport errors, response bodies, headers, cookies and causes are discarded. Metadata is projected and identifiers/state/timestamps validated; raw creation/connection responses never enter evidence.

Connection URI parameters are internally fixed to the authenticated same-run branch/compute, copied bootstrap database pyramid_design, bootstrap role pyramid_owner and pooled=false. This is the already-approved schema-only disposable bootstrap context, never production or an application-data test target. Returned endpoint/user/database are validated and verify-full enforced. Use is scoped to a callback, callback errors are suppressed, and the URL password is cleared on exit. Four independent SQL credentials are generated in memory, passed through the existing ephemeral environment path and cleared at closure. JavaScript garbage collection is not secure memory erasure; no stronger guarantee is claimed. All test credentials/canaries are synthetic.

### Lifecycle integration

`scripts/run-phase-b4b1-neon-lifecycle.mjs` commits the previously ephemeral orchestration: manifest/runtime guards; collision-free creation and receipt capture; readiness; isolated bootstrap catalog checks; fixed manifest SQL provisioning; existing runner preflight/migrations/restricted B1/B2/final-contract stages; membership revocation; evidence/connection closure; same-run cleanup. It preserves copied-role/sentinel checks and never repairs production or copied application objects. All provider requests invoke the canonical boundary.

Future approved R2 needs only committed code plus ephemeral authorization/credentials and an external evidence root. The lifecycle generates a fresh UUID and exclusive run directory; previous execution inputs do not resume mutations. **No ad-hoc or ephemeral provider security helper remains required for R2.** Offline --dry-run and future --execute-rehearsal prerequisites are documented in the environment contract. H2 never invokes live execution. No new dependency or package script is introduced.

### Regression and existing harness verification

- Provider regression: **325 PASS**, covering all requested classes plus concurrent calls, active-consumer cleanup refusal, partial creation cleanup, wrong fresh metadata, redirect/TLS failures, 200/204 deletion, incomplete inventory and URI callback errors. Transport is mocked; synthetic IDs are not represented as live resources.
- Lifecycle integration: **49 PASS across seven mocked scenarios**: success, SQL failure, migration/verification failure, ambiguous creation/deletion, and partial compute receipt. Node 22 test-only module mocks replace all SQL, child/suite effects and provider transport. This verifies orchestration/cleanup/evidence, not Neon or SQL compatibility. Production code exposes no test bypass.
- Existing full offline P3 harness: **159 PASS**, including unchanged manifest/source regeneration, protected targets, partial/complete cleanup, redaction and B1/B2 default/gated subprocess refusal. Local-default B1/B2 entry paths are exercised before any connection. Full mutating B1/B2 SQL/catalog/pool replays are **NOT RUN** under H2's zero-database-mutation restriction; historical counts are not re-claimed.
- Application/targeted lint, typecheck, production build and post-build typecheck: **PASS**. Build environment excludes provider credentials. Application/runtime/schema/dependencies are unchanged; B3 acceptance is not implied.
- Scope/whitespace and B4 sensitive-content scan: **PASS**, zero findings against the fresh build; 96 browser assets and 34 documented environment consumers. Source inventory and staged scope/scan are regenerated at closure. No dependency-audit waiver or B3 re-audit is claimed.

Offline Node 22 commands: `node scripts/verify-phase-b4b1-provider.mjs`; `node --experimental-test-module-mocks scripts/verify-phase-b4b1-lifecycle.mjs`; `node scripts/verify-phase-b4b1-neon.mjs`. Node's experimental module-mocking warning is expected and test-only.

### Manifest integrity and source-bound evidence

MANIFEST OPERATIONS: 55

MANIFEST STATUS: REQUEST_ONLY_NOT_EXECUTED

MANIFEST SHA256 BEFORE: 28ae551e32af7f8f009d23b7521b93706d93d03529e15e0d6059b49163ba2eb8

MANIFEST SHA256 AFTER: 28ae551e32af7f8f009d23b7521b93706d93d03529e15e0d6059b49163ba2eb8

MANIFEST SEMANTICS CHANGED: NO

Regeneration matches the checked-in JSON exactly, including migration checksums, 22 applications/two deployments and complete seed/B1/B2 containment inventory. H2's external inventory also hashes provider, lifecycle, integration, existing runner/target/manifest and regression modules. Evidence is never a runtime dependency. Existing manifest authorization remains applicable only to that unchanged scope; R2 still requires programme review.

### Live verification, effects and release

Optional authenticated provider checks were not needed and were not run. **PROVIDER READ-ONLY CALLS: 0; PROVIDER MUTATION CALLS: 0; DATABASE CONNECTIONS: 0; DATABASE MUTATIONS: 0; NEON DISPOSABLE BRANCHES CREATED: 0; NEON DISPOSABLE BRANCHES DELETED: 0; NEON DISPOSABLE DATABASES CREATED: 0; NEON DISPOSABLE ROLES CREATED: 0; REMOTE MIGRATION APPLICATIONS: 0; PRODUCTION DATABASE MUTATIONS: 0; PRODUCTION ROLE MUTATIONS: 0; PRODUCTION MIGRATIONS: 0; PRODUCTION DATA WRITES: 0; REAL CANDIDATE DATA ACCESSED: NO; DISPOSABLE RESOURCES REMAINING: 0.** Resource zero follows retained R1/H1 no-creation evidence plus H2 zero creation calls, not a fresh inventory.

Release scope: exactly eight files comprising this H1/H2 record, environment documentation, canonical provider, lifecycle, two new regression suites, target integration and one existing mock response's explicit HTTP status. No manifest/package/lock/schema/migration/B1/B2 source/application change. Conditional commit: `fix: secure Neon rehearsal provider boundary`, feature-branch-only normal push after staged gates. Final local/tracking/remote SHA and clean state belong in external release evidence/report, avoiding a self-referential source hash.

PHASE B4B1-P3B-H2: PASS; CANONICAL PROVIDER BOUNDARY: PASS; LIFECYCLE INTEGRATION: PASS; ORIGIN BINDING: PASS; PROJECT BINDING: PASS; METHOD/RESOURCE BINDING: PASS; CANONICALIZATION: PASS; CREATE-BRANCH CONTRACT: PASS; SAME-RUN DELETE CONTRACT: PASS; NON-IDEMPOTENT RETRY SAFETY: PASS; SECRET REDACTION: PASS; PROTECTED RESOURCE DENIALS: PASS; MANIFEST UNCHANGED: YES; MANIFEST AUTHORIZATION STILL APPLICABLE: YES; OFFLINE HARNESS: PASS; PROVIDER MUTATIONS: 0; DATABASE MUTATIONS: 0; DISPOSABLE RESOURCES REMAINING: 0; P3B-R2 READY: YES (for programme review, execution not started); B3 WORKTREE TOUCHED: NO; B3 SECURITY GATE: UPSTREAM DISCLOSURE BLOCKED; PRODUCTION DEPLOYMENT: NO; NEXT PHASE: NOT STARTED.

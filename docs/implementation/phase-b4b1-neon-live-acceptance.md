# Phase B4B1 — Neon live compatibility and recovery acceptance

**Latest P2 update, 2026-10-01:** Authorized read-only inventory and rehearsal design completed. See [B4B1-P2 evidence and exact P3 authorization request](#b4b1-p2-read-only-catalog-inventory-and-rehearsal-design). Target is HISTORICAL; data UNKNOWN; production acceptance remains OWNER ACTION REQUIRED. Earlier blocked/P1 results below are historical. P3 is not started.

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

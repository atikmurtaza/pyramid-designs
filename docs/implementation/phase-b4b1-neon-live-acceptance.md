# Phase B4B1 — Neon live compatibility and recovery acceptance

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

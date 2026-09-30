# ADR 0017: Neon application PostgreSQL with retained Supabase Auth

**Status:** Accepted provider and restricted-runtime architecture; B1-R1 permission migration authorized and verified offline. Live provisioning/acceptance remains owner-gated.

**Date:** 2026-09-30.

## Context

The owner has selected Neon PostgreSQL following closed Phase 2J. Current main at `9de6ba306916136e7d55c34b14932938fa99b7a5` still describes Supabase PostgreSQL as the application provider. Separate unmerged Neon work exists in the protected frontend checkout. Its old ADR number 0016 now collides with the accepted intake-abuse ADR and cannot be copied wholesale.

## Decision

Neon PostgreSQL is the production application database. Supabase remains the staff identity/session/MFA provider. This supersedes the application-database selection in ADR 0011, while preserving its Auth responsibilities, ADR 0014's server-only `pg` runtime/Prisma migration split and all server authorization/domain evidence constraints.

Hostinger Node/Next.js uses `DATABASE_URL` through `pg`, targeting a Neon transaction-pooled endpoint when compatible. Controlled migration/admin tooling uses a distinct `DIRECT_URL` and direct endpoint. Prisma 6 reads `directUrl` in its datasource schema. Runtime never imports Prisma Client or receives migration credentials. Keep pool maximum 3, idle and connection timeouts 10 seconds and application name `pyramid-designs`; live Hostinger/Neon acceptance must establish the aggregate process/connection budget and cold-start behavior.

Supabase verified claims map to local Neon `StaffUser`/`UserRole` records, followed by AAL2 and operation/target/state authorization. No JWT/session settings or Supabase database policies confer Neon permissions. Browsers receive neither database connection string nor CRUD rights.

The runtime identity must be a nonowner with no superuser, BYPASSRLS, role/database creation, replication, privileged memberships or grant options. Do not use Console/API/CLI-created privileged Neon roles for runtime. All application tables keep RLS; no PUBLIC/anon/authenticated policies or grants are authorized. Narrow runtime-only policies, column grants and necessary function dependencies require a new reviewed forward migration: the nine current migrations provide no policies and therefore cannot support this identity with grants alone.

## Original assessment and review gate

At the original assessment, the connection contract was reconciled but B1 was incomplete. The [B1 assessment](../../implementation/phase-b1-neon-production-database.md) retains that replay, inventory, conflict and proposal history. No tenth migration or SECURITY DEFINER existed at that review gate. No old Neon database, region, plan or migration snapshot is designated production by this ADR.

## B1-R1 authorized permission decision

Migration 10, `20260930000000_phase_b1_runtime_permissions`, keeps RLS on every application table and the operator-only migration ledger. Forty operation-specific policies target operationally provisioned NOLOGIN `pyramid_runtime`; fourteen reference-lock policies target NOLOGIN `pyramid_reference_locker`. Neither role owns application tables, has privileged parents, LOGIN, SUPERUSER, BYPASSRLS, CREATEROLE, CREATEDB or REPLICATION. A separately provisioned SQL-created login inherits only `pyramid_runtime`; credentials and membership lifecycle stay outside migrations. The migration operator owns database/application objects and has INHERIT/SET membership in the locking owner for default-privilege administration and controlled function ownership transfer. The supported offline baseline is PostgreSQL 17; the SET membership check requires PostgreSQL 16 or newer.

Server verified-claims/local-role/AAL2/operation/target/state authorization remains authoritative. Runtime policies grant row visibility for those server operations, with SELECT on twenty tables, INSERT on eleven, named-column UPDATE on seven and constrained DELETE on two. No broad table UPDATE is needed. Append-only evidence is SELECT/INSERT only; unused content joins, staff provisioning and the migration ledger are denied. Future administrative writes need extensions alongside their reviewed executable workflows.

The seven read-only reference groups genuinely require stable row locks. The minimum definer `pyramid_private.lock_reference(text,uuid)` returns void, uses only fixed CASE branches and schema-qualified SQL, and fixes search_path to pg_catalog. Its nonowner/NOBYPASSRLS owner has SELECT and lock-required UPDATE(id) on those references, but UPDATE WITH CHECK(false) rejects actual writes. Runtime cannot SET that owner or modify the function/schema. Temporary schema CREATE needed for ownership transfer is immediately revoked. PUBLIC/anon/authenticated cannot EXECUTE it. Lock calls precede rereads of exact IDs to preserve post-lock active-state checks. FileSecurityReview instead uses the existing mutable parent locks and its globally unique idempotency key, retaining immutable SELECT/INSERT access.

All seventeen existing functions remain invokers with fixed search paths. Only the two nested evidence helpers receive runtime EXECUTE; the other fifteen are trigger-only. Public execution, schema CREATE, database CREATE/TEMP and stale table/column ACLs are revoked. Actual migration-role function defaults are revoked both globally and per public schema; table/sequence defaults and locking-owner function defaults are hardened. Any future migration using another creator role must establish equivalent defaults before creating objects.

Three fresh non-superuser-owner runs (two SQL replays and one native Prisma migrate deploy) each pass 2,021 restricted-runtime assertions, migration status and zero schema drift. These tests prove direct PostgreSQL semantics, including default-deny browser roles and malicious SQL; they do not prove live Neon pooling, transport or hosted acceptance. See B1-R1 closure for exact privilege matrix, operational prerequisites and remaining production gates.

Keep Supabase Auth and its underlying project/database intact. Later application-data cutover requires independent source inventory, backup/restore proof, final role/endpoint acceptance, controlled migration authorization and reconciliation before any rollback after Neon-only writes. Backup features alone do not establish a ready recovery plan.

The [Phase A decisions](../../implementation/phase-a-release-decisions.md) govern launch policies. No production migration, deployment, real intake, retention activation or next phase is authorized by this ADR.

## Sources

Official pages accessed 2026-09-30; page titles, precise relied-on facts and compatibility limitations are recorded in the B1 assessment:

- [Connection pooling](https://neon.com/docs/connect/connection-pooling).
- [Connect securely](https://neon.com/docs/connect/connect-securely).
- [Manage roles](https://neon.com/docs/manage/roles).
- [Manage database access](https://neon.com/docs/manage/database-access).
- [PostgreSQL row security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).
- [PostgreSQL SELECT locking privileges](https://www.postgresql.org/docs/current/sql-select.html).

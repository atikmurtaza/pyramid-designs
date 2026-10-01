# ADR 0019: Restore Supabase as the production application database

**Status: ACCEPTED BY OWNER — 2026-10-01.** Supersedes ADR 0017 and the database-provider decision in Phase A. The Supabase-to-Neon migration programme is **ABANDONED BY OWNER ARCHITECTURE DECISION — 2026-10-01**. Historical records remain evidence, not current release requirements.

## Decision

Use the existing Pyramid Designs Supabase PostgreSQL database as the production source of truth, preserving its data and Supabase Auth. Hostinger managed Node.js runs Next.js App Router/TypeScript with server-only `pg`. Prisma remains schema/migration tooling only. Candidate CV storage is private Google Drive; transactional email is Resend; bot protection is Cloudflare Turnstile. No new database provider or data transfer is required.

Neon is not a runtime, deployment, environment, health, recovery, fallback, replica or launch dependency. Do not call its provider, retry branch creation, wait for support, copy its rows back, or require B4B1-P3/P4 completion. Retain historical provider scripts, manifests and acceptance records outside the active production procedure.

## Preserved security and application contract

Preserve all eleven historical migrations without rewriting checksums or pretending unapplied work is applied. B1 restricted roles, RLS, operation/column grants, private reference locking and immutable evidence are portable controls; B2 workflows remain required. Audit their exact compatibility with existing Supabase ownership, extensions, platform roles and default grants before execution. A local PostgreSQL replay does not establish permission to modify Supabase-managed objects. Never use service_role, a secret key, postgres or another owner as normal runtime access.

The target is a dedicated restricted LOGIN inheriting only `pyramid_runtime`, with no ownership, superuser, CREATEDB, CREATEROLE, REPLICATION or BYPASSRLS, no schema CREATE/database TEMP, ledger or evidence-rewrite privileges. The private locking function retains its restricted NOLOGIN owner and fixed search_path; the runtime cannot SET that role. Supabase `anon` and `authenticated` receive no application CRUD or helper EXECUTE. Inspect both effective grants and RLS, including PUBLIC inheritance, columns, sequences, default ACLs and function execution.

Auth remains `@supabase/ssr`, verified claims, fresh local ACTIVE StaffUser mapping/roles, AAL2, operation/target/state authorization, safe redirects and same-origin/CSRF controls. No Auth redesign or dependency update is part of S1.

## Connection and environment decision

Retain Supavisor **session mode, port 5432**, for persistent Hostinger Node unless a current direct-network proof justifies direct access. Phase 2A-FR2 records successful Hostinger session-mode pg execution/reconnection on September 3, 2026; it does not prove today's restricted identity or network configuration. Direct connectivity is unverified; no IPv4 add-on or cost change is authorized. Do not choose transaction mode automatically.

`DATABASE_URL` is a restricted runtime connection. `DIRECT_URL` is still needed by this repository's Prisma operator configuration; its name denotes separation from runtime, and it may use verified direct access or session mode where IPv4 requires it. It is absent from web/build/scheduler. Require certificate and hostname verification, with a provider-authenticated CA available to the process when necessary. Never fix certificate errors by disabling verification. Retain pg max 3, idle timeout 10 seconds, connection timeout 10 seconds, application_name `pyramid-designs`; confirm aggregate process/readiness/worker demand against actual project limits before cutover.

Public Supabase URL/publishable key remain the Auth configuration. No service-role/secret-key requirement is introduced. No `P3_*` variable is a production requirement.

## Execution boundary

S1 first inspects catalog/history/counts only. No candidate content, CV identifiers, Auth credentials or tokens may enter output/evidence. Existing production data must not be reset, reseeded or exported into development. A production change requires proven preservation/recovery and an exact reviewed effect; otherwise S1 returns an S2 plan and stops. Read-only access failures remain explicit blockers, never inferred schema states.

Hostinger is already live. Retain its current artifact and configuration until an explicitly approved cutover. No main merge, production deployment, DNS change, environment overwrite or automatic S2 follows. Staff/worker/email/Drive gates remain false; intake/retention stay closed in code, diagnostics 404 and fake providers fail closed. Careers launches with zero open roles. B3 remains independently **UPSTREAM DISCLOSURE BLOCKED**.

Current execution record: [S1 re-baseline](../../implementation/phase-b4b1-s1-supabase-rebaseline.md). Current procedures: [environment](../../operations/production-environment.md), [release](../../operations/production-release.md), [recovery](../../operations/backup-and-restore.md).

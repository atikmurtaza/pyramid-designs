# Phase 2F — Staff Mutation and Audit Foundation

**Date:** 2026-09-05
**Status:** closure review passed locally; uncommitted and undeployed.

## Boundary and authorized operations

Browser mutations use one server-owned sequence: current verified Supabase claims, active local `StaffUser`, current PostgreSQL roles, AAL2, operation/target pre-authorization, strict allowlisted validation, transactional state lookup with row lock, database-state authorization, conditional mutation, immutable audit/history evidence, and a fixed safe response. Client roles, staff IDs, assurance, ownership and target state are never accepted as authority.

The Phase 2F surface is deliberately narrow:

| Operation | CONTENT_EDITOR | HIRING_REVIEWER | HIRING_MANAGER | ADMIN | AUDITOR | State rule |
| --- | :---: | :---: | :---: | :---: | :---: | --- |
| Create project draft | A | — | — | A | — | Always creates `DRAFT` |
| Edit project draft | A | — | — | A | — | `DRAFT` plus expected version |
| Change application hiring status | — | A | A | A | — | Existing permitted transition; reviewer cannot record `WITHDRAWN` |
| Close job | — | — | A | A | — | `PUBLISHED -> CLOSED` plus expected version |
| Archive job | — | — | A | A | — | Existing `DRAFT`/`SCHEDULED`/`CLOSED -> ARCHIVED` rule plus expected version |

Publishing, job creation/editing, questions, notes, staff/role administration, site settings, retention, candidate-file operations and arbitrary status assignment remain unimplemented and gated.

## Validation, CSRF, transactions and audit

Form and domain inputs reject unexpected fields, malformed identifiers, invalid enums, invalid slugs, non-positive versions and strings beyond schema bounds. Browser actions require an `Origin` matching the effective host; a supplied forwarded protocol must also match. Next.js server-action protection remains in place, while Hostinger proxy/header behavior is still a deployment gate.

Each mutation runs through the existing `pg` transaction helper. Target rows are locked with `FOR UPDATE`; project/job writes require the displayed version and application writes require the displayed current status. Mutation and evidence roll back together. Application changes append both `ApplicationStatusEvent` and `AuditEvent`; other mutations append `AuditEvent`. Existing database triggers keep those evidence tables append-only. Audit metadata contains only state/version transitions and excludes request bodies, candidate contact, credentials, cookies, tokens, MFA and file contents.

The existing `IdempotencyRecord` table protects all Phase 2F submissions for 24 hours. Keys are actor-bound and hashed; request hashes prevent key reuse for a different operation payload. A completed retry returns a fixed already-applied result without a second mutation or audit event.

## Portal and verification

The existing `/staff` portal adds only authorized controls: draft creation/editing, permitted application transitions, and permitted job close/archive actions. Controls are presentation only; every action re-resolves the server session and authorization. Native forms provide labels, required confirmation for state changes, visible focus, pending disabled buttons, fixed success/error notices and single-column small-screen layouts.

`npm run test:phase2f` uses synthetic fixtures to cover authentication/AAL2, role and state matrices, BOLA/privilege denial, malformed/nonexistent targets and unexpected input, same-origin checks, successful mutation plus audit/history, audit-failure rollback, stale writes, duplicate submission, disabled staff, revoked roles, sign-out freshness, ADMIN target/state limits, DTO minimization, RLS/grants, runtime dependency boundaries and sensitive source patterns.

Final local regression passed on 2026-09-05: Prisma validation and six-migration status; Phase 2B, 2C, 2D, 2E and 2F suites (`PHASE_2F_STAFF_MUTATIONS_OK`); lint; typecheck before and after build; production build with 18 generated pages; production dependency audit with zero vulnerabilities; and `git diff --check`.

Dev-browser checks used an exact 320 px Chromium device-metrics override. `/staff` and `/` had no horizontal overflow, no framework error overlay and no visible control below 44 px. Signed-out `/staff` showed only the authentication boundary and no protected mutation controls. Production-mode smoke returned `200` for `/` and `/staff`; protected `/staff/content` returned a server redirect marker without protected content; `/internal/staff-auth`, both internal staff-auth APIs and `/dev/design-system` returned `404`. The canonical logo SHA-256 remained `2C5D2042EF020AA7AD37FF92E6FD9C3407EF305102EE49DA3B6900FF99FFE60C`.

## Decisions and deferred gates

No migration is required: the approved Phase 2B schema already provides versions, immutable evidence and idempotency. No ADR change is required: the implementation follows the existing server-side default-deny architecture and operation matrix. The authenticated mutation UI was not exercised with owner-held credentials; automated server/database tests prove the mutation boundary, so live authenticated browser use remains an acceptance gate rather than a reason to request a password, TOTP, cookie or token. Hostinger forwarded-host/protocol behavior also remains a deployment gate.

Deferred gates remain authenticated owner acceptance, Hostinger origin/proxy confirmation, least-privilege production database identity, production Auth ownership/recovery/MFA, synthetic/diagnostic cleanup, deployment, production migration execution, DNS and Phase 2G.

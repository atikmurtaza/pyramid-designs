# Phase 2B — Production Database & Domain Foundation

**Date:** 2026-09-03
**Status:** **PASS WITH ISSUES**
**Scope:** Real relational/domain foundation applied only to the synthetic development Supabase project. No production deployment, production DNS, real candidate intake, file upload, Google Drive, Supabase Auth user, login, session, middleware authorization, SMTP, scheduler or frontend form integration was created.

## 1. Scope

Phase 2B implements the approved Phase 0 production data model for:

- portfolio projects, media, credits and filter vocabulary;
- jobs, locations, departments, questions and options;
- application-owned candidate/contact snapshots with no reusable `Candidate` table;
- application answers, immutable consent evidence, versioned consent definitions and retention policies;
- candidate-file metadata and immutable hash-bound security-review evidence only;
- current hiring status plus append-only hiring history;
- local staff profiles and fixed role assignments, without credentials or sessions;
- append-only audit events, PostgreSQL background jobs, idempotency records and rate-limit buckets.

The frozen Phase 1 frontend remains disconnected from these repositories. `CompatibilityProbe` and all Phase 2A diagnostic routes remain intact for the dedicated cleanup phase.

## 2. Schema

`prisma/schema.prisma` remains the schema-definition source. Prisma Client is not generated or used at runtime.

### Public content

- `Project`, `ProjectMedia`, `ProjectCredit`
- `Discipline`, `Sector`, `ProjectDiscipline`, `ProjectSector`
- `Department`, `JobLocation`, `Job`, `JobQuestion`, `JobQuestionOption`

Projects and jobs use stable slugs, explicit publication/lifecycle states, timestamps and optimistic versions. Public-media rows store metadata/references only; no binary content is stored in PostgreSQL.

### Recruitment and policy

- `Application`, `ApplicationAnswer`
- `CandidateFile`, `FileSecurityReview`
- `ConsentDefinition`, `CandidateConsent`, `RetentionPolicy`
- `ApplicationStatusEvent`

### Staff and operations

- `StaffUser`, `UserRole`
- `AuditEvent`, `BackgroundJob`, `IdempotencyRecord`, `RateLimitBucket`

Database enums preserve the approved application, hiring, file, review, publication, staff-role, policy, audit and background-job vocabularies.

## 3. Migrations

Four forward migrations implement Phase 2B:

1. `20260903220000_phase_2b_production_domain_foundation`
   - generated from the live synthetic development schema to the expanded Prisma datamodel;
   - creates Phase 2B enums, tables, foreign keys and workload-critical indexes;
   - adds conditional `CHECK` constraints, partial unique indexes, append-only/version-protection triggers, effective job-intake enforcement and published-slug/application-context immutability;
   - revokes public-role table/function privileges and enables RLS on every table in the exposed `public` schema, including Prisma migration history.
2. `20260903221000_phase_2b_candidate_file_constraint_correction`
   - replaces only the newly introduced opaque-PDF filename check after its regular expression was found to be over-escaped;
   - preserves applied migration history rather than rewriting it.
3. `20260903222000_phase_2b_evidence_constraints`
   - adds deferred commit-time checks requiring a cleared file to have matching immutable hash/method review evidence;
   - requires a submitted application to have accepted consent and cleared file evidence.
4. `20260903223000_phase_2b_application_constraint_completion`
   - requires the contact snapshot until completed deletion/anonymisation;
   - requires a professional or portfolio URL for `PORTFOLIO_INTRODUCTION` talent-network records.

The SQL was inspected before each application. No migration resets, `prisma db push`, table/data truncation, Auth schema change, Storage schema change, Realtime schema change or CompatibilityProbe weakening occurred. All four migrations were applied only through `prisma migrate deploy` to the existing synthetic development Supabase project.

## 4. Runtime repository architecture

The Hostinger application runtime remains `pg` through `src/lib/server/database.ts`. Repositories use fixed SQL text, PostgreSQL parameters, deliberate row types and plain returned values:

- `repositories/projects.ts` — effectively published project reads;
- `repositories/jobs.ts` — effectively open job lookup using the request-time deadline predicate;
- `repositories/applications.ts` — idempotent application creation, exact consent/retention references, answer snapshots and atomic hiring transitions/history/audit;
- `repositories/staff.ts` — effective local roles, with disabled staff returning zero roles;
- `repositories/audit.ts` — append-only PII-safe audit insertion;
- `repositories/background-jobs.ts` — deduplicated enqueue, `FOR UPDATE SKIP LOCKED` claim/lease and token-bound completion;
- `repositories/rate-limits.ts` — atomic PostgreSQL bucket increments using keyed digests.

No generic repository framework, ORM/query builder or runtime-validation dependency was added.

## 5. Production table security

The initial database posture is server-mediated and default-deny for Supabase browser roles:

- `PUBLIC`, `anon` and `authenticated` have no direct privileges on any current `public` table;
- RLS is enabled on every current table in `public`;
- zero permissive RLS policies exist;
- trigger functions have public-role execution revoked;
- public-content tables are not browser-readable through Supabase; the Next.js server remains the intended read path;
- audit/history/review immutability is protected by database triggers in addition to application code.

The synthetic development migration/admin connection is still the privileged `postgres` role and therefore bypasses RLS. Phase 2B does not create a production login, rotate a database credential or change Hostinger configuration. A separately controlled production release must provision and verify the least-privilege runtime/migration-role split before launch; this is the principal issue behind the Phase 2B status.

### Mandatory production/release security gate

**PRODUCTION DATABASE RUNTIME IDENTITY:** A dedicated least-privilege runtime PostgreSQL identity must be provisioned and verified before production launch. The current privileged development/migration identity must **not** become the production application runtime identity.

Current Supabase guidance was rechecked on 2026-09-03: grants determine object reachability and RLS controls rows, so both explicit revocation and RLS are retained for exposed-schema defence in depth. No current changelog item required a different Phase 2B design.

## 6. Application model

Each `Application` owns its independent candidate/contact and professional snapshot. Email and phone have no uniqueness constraint and are never used to merge or link records.

- `JOB_APPLICATION` requires an immutable job reference and has no talent engagement type.
- `TALENT_NETWORK` has no job reference and requires one approved engagement type: `PERMANENT_INTEREST`, `FREELANCE_PROJECT`, `INTERNSHIP_EARLY_CAREER` or `PORTFOLIO_INTRODUCTION`.
- The application stores technical state, current hiring state, exact retention-policy reference, calculated expiry and deletion timestamps.
- Job application creation rechecks `PUBLISHED`, `publishAt`, `applicationDeadline` and `closedAt` in both repository SQL and a database insert trigger.
- `ApplicationAnswer` snapshots question prompt, type and selected label/value. Used questions/options are immutable.

The repository creates an application, exact accepted consent reference, answer snapshots and completed idempotency record in one PostgreSQL transaction. The frontend prototypes do not call it.

## 7. Candidate file metadata

`CandidateFile` stores metadata only:

- application relation;
- nullable synthetic/future Drive object and zone references;
- generated opaque `.pdf` filename, declared/detected MIME and byte size;
- SHA-256 content hash;
- independent validation, technical and security states;
- clearance method, timestamps, deletion state and optimistic version.

The schema enforces PDF metadata and the current 5 MiB ceiling, one non-deleted file per application, irreversible application-domain deletion shape, and the rule that validation failure can never be cleared. No upload, retrieval, Drive call, credential, provider URL or file bytes exist in Phase 2B.

`FileSecurityReview` is immutable and records method, actor shape, tool/version description, reviewed SHA-256, outcome, safe code/summary and idempotency key. Deferred constraint triggers require a `CLEARED` projection to match immutable `CLEARED` review evidence by file, method and hash.

## 8. Staff roles

`StaffUser` stores only the future Supabase subject identifier, local `ACTIVE`/`DISABLED` status and timestamps. It stores no password, factor, token, session or copied Auth metadata.

`UserRole` stores fixed assignments for:

- `CONTENT_EDITOR`
- `HIRING_REVIEWER`
- `HIRING_MANAGER`
- `ADMIN`
- `AUDITOR`

A partial unique index permits only one active assignment per staff/role. The staff repository returns no effective roles when the local staff status is `DISABLED`, even if historical active role rows remain.

## 9. Hiring state history

The current projection uses the approved hiring states:

`NEW -> UNDER_REVIEW -> SHORTLISTED -> INTERVIEW -> OFFER -> HIRED`

with allowed `REJECTED` and `WITHDRAWN` terminal paths.

Repository transitions lock the application, require technical `SUBMITTED` state, validate the transition, update the projection, append `ApplicationStatusEvent` and append a safe `AuditEvent` in one transaction. `ApplicationStatusEvent` rows cannot be updated or deleted. A future authorised correction therefore must append new history; it cannot rewrite an earlier event.

## 10. Consent and retention

`ConsentDefinition` and `RetentionPolicy` are uniquely versioned. Content/duration/version fields cannot change after insertion; only forward policy status transitions are permitted. Deletes are prohibited.

`CandidateConsent` is append-only and references the exact consent definition shown for the application. Submitted applications must have accepted consent evidence.

The synthetic fixture uses a clearly non-production 30-day retention duration and clearly non-legal consent text. This duration and wording are test fixtures only and are not legal/business policy. Production durations, legal wording, post-deletion consent/audit treatment and any legal-hold requirement remain owner/legal gates.

## 11. Jobs

Jobs retain their own lifecycle: `DRAFT`, `SCHEDULED`, `PUBLISHED`, `CLOSED`, `ARCHIVED`. Application acceptance is always evaluated at request time:

`PUBLISHED AND publishAt <= now AND (applicationDeadline IS NULL OR now < applicationDeadline) AND closedAt IS NULL`.

Compensation storage supports only the approved structural modes: hidden, complete numeric range, or approved text. No actual compensation policy or value was invented. Used questions and options cannot be edited or deleted; application answers retain snapshots.

## 12. Projects

Projects include stable publication fields, summary/brief, constrained-rich-text storage positions, optional client descriptor/year, featured state, media, credits, disciplines and sectors. Synthetic database content is not connected to public pages and is not represented as approved production content.

Rich-text AST validation/rendering remains deferred until an authorised write surface requires it. Raw HTML is not introduced.

## 13. Background jobs

`BackgroundJob` supports:

- type and safe opaque subject/payload references;
- `QUEUED`, `RUNNING`, `SUCCEEDED`, `DEAD` states;
- attempt/max-attempt counters;
- availability, claim and lease timestamps;
- random claim token;
- dedupe key, bounded failure class/summary and timestamps.

Claims use a short transaction, `FOR UPDATE SKIP LOCKED`, bounded batch size, per-job random token and bounded lease. Completion requires the matching live claim token. The Hostinger scheduler itself remains unconfigured and deferred.

## 14. Idempotency

`IdempotencyRecord` stores scope, SHA-256 key hash, request hash, state, opaque UUID result reference and expiry. Unique `(scope, keyHash)` prevents retry duplication.

The application repository proves:

- the same key and request return the same application;
- the same key with a different request fails;
- a different key with the same email/contact snapshot creates a separate application by design.

Background jobs also have an optional unique dedupe key and state checks remain authoritative.

## 15. Rate limits

`RateLimitBucket` stores scope, keyed digest, UTC window, count and expiry with a unique scope/digest/window constraint. Raw IP addresses are not represented. The repository provides an atomic upsert/increment. No Redis or public rate-limit middleware was added.

## 16. Audit

`AuditEvent` is append-only. It stores fixed actor/action/target/outcome/reason/correlation fields plus an optional small JSON object intended only for allowlisted safe metadata.

Database triggers prohibit update/delete. The repository API accepts opaque target IDs and primitive safe metadata only. Tests verify the synthetic candidate email does not appear in audit metadata or background-job payload/error fields.

## 17. Transactions

The existing `pg` transaction helper remains the single transaction primitive. Phase 2B uses it for:

- application + consent + answer + idempotency creation;
- hiring projection + immutable event + audit;
- background-job claim/lease;
- the synthetic seed.

Integration tests force a rollback after an in-transaction hiring transition and after a rate-limit insert; neither partial write persists.

## 18. Synthetic seed

`scripts/seed-phase-2b-synthetic.mjs` is explicit, idempotent and manual-only. It creates obvious fixtures including:

- `Synthetic Phase 2B Project`;
- `Synthetic Phase 2B Role`;
- `synthetic-supabase-subject-admin` and a disabled synthetic subject;
- `Synthetic Candidate` at `example.invalid`;
- synthetic consent/retention versions;
- metadata-only synthetic candidate file/review evidence;
- one synthetic reconciliation job.

The file-review fixture explicitly states `SYNTHETIC_FIXTURE_NO_SCAN`; it does not claim that any real file was scanned. Production seeding is not automatic.

## 19. Tests

`scripts/verify-phase-2b-domain.mjs` uses Node 22, `pg`, the live synthetic development database and Node's built-in strict assertions. It verifies:

- application retry idempotency and no contact-based candidate merge;
- invalid job/application context rejection;
- submitted-application evidence and hash-bound file-clearance constraints;
- answer snapshots and used-question immutability;
- append-only hiring history and audit records;
- consent and retention version immutability;
- disabled staff have zero effective roles;
- transactional hiring/history/audit rollback;
- general transaction rollback;
- background-job claim exclusivity, lease/token behavior and completion;
- RLS/public-role grants and zero permissive policies;
- PII exclusion from audit/job payload fields;
- absence of Prisma Client/adapter runtime dependencies and continued `pg` runtime.

The deterministic integration suite passes repeatedly after the idempotent seed.

## 20. Deferred auth, file and backend integration

Deferred and not authorised by Phase 2B:

- Supabase Auth users, login, TOTP, sessions, revocation and MFA assurance;
- server authorization policy implementation, middleware and staff UI;
- real application/talent intake and frontend form persistence;
- candidate file upload, download, quarantine retrieval, Google Drive and malware-review workflow;
- SMTP/receipts, Turnstile, public rate-limit middleware and Hostinger scheduler;
- production runtime/migration credentials and production migration execution;
- legal consent text, production retention periods, legal hold and deletion policy;
- rich-text authoring/validation/rendering and production content import;
- deployment, DNS or public Supabase access.

No ADR changed: Phase 2B implements ADRs 0012, 0013 and 0014 without revising their decisions.

## 21. Phase 2C recommendation

Recommend the next separately authorised phase as:

**Phase 2C — Synthetic Staff Authentication and Server-Side Authorization Foundation**

That phase should connect Supabase Auth only in the isolated development/staging boundary, map verified subjects to `StaffUser`, implement the approved default-deny operation/target/state policy, require disabled-user denial, exercise all five roles and establish TOTP/session-revocation evidence. It must continue to exclude real candidate intake, file upload/Drive, production deployment and DNS changes.

Phase 2C has not started.

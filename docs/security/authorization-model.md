# Phase 0E: Authorization Model

**Status:** Accepted for Phase 0E documentation; implementation remains gated

**Date:** 2026-08-27

**Scope:** Staff authorization for public content, jobs, applications, candidate files, retention, audit, and administration. Authentication is supplied by Supabase Auth; authorization remains in the Pyramid Designs application and PostgreSQL model.

## Principles

1. Default deny. A permission not explicitly granted is denied (SEC-001).
2. Authorize domain operations, not pages or hidden buttons. Every sensitive server read, mutation, file retrieval, and background action checks the actor, operation, target, state, retention, and scope.
3. Supabase identity is necessary but insufficient. The application requires an active local `StaffUser` and effective local role assignment.
4. UI visibility is convenience only. Server Actions, route handlers, loaders, database queries, and file-streaming paths apply the same policy.
5. Candidate access is purpose-limited and fail closed. No role receives a Drive link or general Drive membership (SEC-002, PRIV-005).
6. Quarantined-file retrieval is a separate privileged operation. Ordinary hiring review never implies security-review access.
7. Staff MFA is required for privileged access. Destructive or quarantine operations may require recent MFA/reauthentication when implementation support is verified (SEC-005).
8. Candidate data, audit data, and internal notes never appear in public/client telemetry, URLs, or error messages (SEC-006, SEC-008).
9. Disabled staff have zero effective permissions even if a Supabase session or historical role assignment remains valid.
10. Authorization decisions that access or change candidate, role, policy, publication, or security state are auditable.

## Roles

Role codes are fixed for MVP. `UserRole` stores assignments; there is no dynamic permission-builder or custom-role editor.

| Role | Purpose | Explicit exclusions |
| --- | --- | --- |
| `CONTENT_EDITOR` | Manage and publish approved portfolio/culture/public settings within the content domain. | No jobs, applications, candidate files, retention policy, staff, or security audit access. |
| `HIRING_REVIEWER` | Review submitted applications, cleared files, answers, status, and notes. | No quarantined-file retrieval/security outcome, job publication, retention execution, staff/role management, or global audit. |
| `HIRING_MANAGER` | Own jobs and recruitment workflow; perform approved manual candidate-file security review. | No public-content publication outside jobs, staff/role management, or retention-policy configuration. |
| `ADMIN` | Administer staff assignments and operational policy; may perform all domain operations when target/state checks pass. | No bypass of file clearance, retention, audit, MFA, or fail-closed rules. |
| `AUDITOR` | Read PII-safe audit evidence and approved operational status. | No candidate contact/answers/notes/files, mutations, publishing, or administration. |

Possession of a role does not bypass target rules. For example, `ADMIN` cannot download an uncleared file through the cleared-download operation, and `HIRING_MANAGER` cannot mark a validation-failed file clear.

## Permission matrix

Legend: **A** = allowed after target/state/scope checks; **L** = limited as stated; **—** = denied.

### Public content

| Domain operation | CONTENT_EDITOR | HIRING_REVIEWER | HIRING_MANAGER | ADMIN | AUDITOR |
| --- | :---: | :---: | :---: | :---: | :---: |
| `content.draft.read` | A | — | — | A | — |
| `content.create` | A | — | — | A | — |
| `content.edit` | A | — | — | A | — |
| `content.publish` | A | — | — | A | — |
| `content.archive` | A | — | — | A | — |
| `site_settings.public.edit` | A | — | — | A | — |
| `site_settings.recruitment.edit` | — | — | — | A | — |

Content publication still requires approved source/rights/claims; role possession is not content approval (CR-001, CR-003, CR-008).

### Jobs

| Domain operation | CONTENT_EDITOR | HIRING_REVIEWER | HIRING_MANAGER | ADMIN | AUDITOR |
| --- | :---: | :---: | :---: | :---: | :---: |
| `job.draft.read` | — | L | A | A | — |
| `job.create` | — | — | A | A | — |
| `job.edit` | — | — | A | A | — |
| `job.publish` | — | — | A | A | — |
| `job.close` | — | — | A | A | — |
| `job.archive` | — | — | A | A | — |
| `job.question.manage` | — | — | A | A | — |

`HIRING_REVIEWER` draft read is limited to the question/job context needed to interpret existing assigned applications; it does not expose unpublished recruitment planning generally.

### Applications and hiring

| Domain operation | CONTENT_EDITOR | HIRING_REVIEWER | HIRING_MANAGER | ADMIN | AUDITOR |
| --- | :---: | :---: | :---: | :---: | :---: |
| `application.list_metadata` | — | A | A | A | — |
| `application.contact.read` | — | A | A | A | — |
| `application.answers.read` | — | A | A | A | — |
| `application.accommodation.read` | — | — | A | A | — |
| `application.hiring_status.change` | — | A | A | A | — |
| `application.note.create` | — | A | A | A | — |
| `application.note.read` | — | A | A | A | — |
| `application.withdraw.record` | — | — | A | A | — |

Application reads require `technicalStatus = SUBMITTED`, no completed deletion, no expired access under retention policy, and an allowed recruitment scope. Metadata listings must select explicit safe columns; they do not automatically include contact, answers, accommodation data, notes, or file identifiers.

### Candidate files

| Domain operation | CONTENT_EDITOR | HIRING_REVIEWER | HIRING_MANAGER | ADMIN | AUDITOR |
| --- | :---: | :---: | :---: | :---: | :---: |
| `candidate_file.state.read` | — | A | A | A | — |
| `candidate_file.security_review.initiate` | — | — | A | A | — |
| `candidate_file.security_review.retrieve_quarantine` | — | — | A | A | — |
| `candidate_file.security_review.record_outcome` | — | — | A | A | — |
| `candidate_file.cleared.download` | — | A | A | A | — |
| `candidate_file.delete.request` | — | — | A | A | — |
| `candidate_file.delete.execute` | — | — | — | A | — |

The three security-review operations form the dedicated `candidate_file.security_review` capability. Initial eligible roles are `HIRING_MANAGER` and `ADMIN`; the operational procedure must name trained individuals before use. `HIRING_REVIEWER` can see that a file exists and its safe state, and can download it only after `validationStatus = PASSED`, `securityStatus = CLEARED`, retention permits access, and the file hash/version still matches the cleared review.

Quarantine retrieval:

- requires fresh server authorization and recent MFA/reauthentication when supported;
- returns attachment disposition through the application server, never inline preview or a Drive URL;
- is allowed only for a validation-passed, non-deleted file in `UNREVIEWED`, `IN_REVIEW`, or `REVIEW_FAILED` state;
- records success/denial in `AuditEvent`;
- does not itself change security state.

No new `SECURITY_REVIEWER` role is created. If the named operational reviewer should not receive hiring-manager access, that is a real trigger to add a narrowly scoped role later rather than granting `ADMIN` for convenience.

### Retention, audit, and administration

| Domain operation | CONTENT_EDITOR | HIRING_REVIEWER | HIRING_MANAGER | ADMIN | AUDITOR |
| --- | :---: | :---: | :---: | :---: | :---: |
| `retention.expiry.read` | — | L | A | A | L |
| `retention.deletion.request` | — | — | A | A | — |
| `retention.deletion.execute` | — | — | — | A | — |
| `retention.policy.change` | — | — | — | A | — |
| `audit.events.read` | — | — | L | A | A |
| `staff.manage` | — | — | — | A | — |
| `staff.roles.manage` | — | — | — | A | — |
| `operational_policy.configure` | — | — | — | A | — |

Limited retention read exposes expiry/status only for applications already in the role's recruitment scope. `AUDITOR` sees policy/version, due/complete state, and PII-safe audit evidence, not candidate content. `HIRING_MANAGER` audit read is limited to recruitment actions needed to supervise the workflow; global staff/role/security audit remains Admin/Auditor only.

## Policy evaluation

Each sensitive server operation evaluates, in order:

1. **Authentication:** valid Supabase session and required MFA assurance.
2. **Local status:** mapped `StaffUser` exists and is `ACTIVE`.
3. **Role permission:** at least one active role grants the exact domain operation.
4. **Target scope:** the actor is allowed to operate in the requested domain/assignment scope.
5. **Target state:** publication, job deadline, application technical state, file validation/security state, retention, deletion, and optimistic version permit the operation.
6. **Input rules:** identifiers, state-transition intent, idempotency key, and bounded input validate server-side.
7. **Transaction/audit:** mutation and required event/audit record commit together where one database transaction can cover them.

Permission checks must be shared by all callers of an operation. Route-specific ad hoc role checks are insufficient because Server Actions, route handlers, scheduled jobs, and internal services can otherwise drift.

## Server enforcement

- Public pages query only effectively published content through server-owned data access.
- Admin loaders select only columns authorised for the operation. A metadata-list permission never calls a full application/detail query.
- Every mutation reruns authorization inside the server request and transaction; client-supplied roles, staff IDs, states, or ownership claims are ignored.
- Candidate-file streaming performs a fresh check immediately before retrieving from Drive and again before emitting headers/body when practical. No reusable Drive URL is issued.
- Background jobs act as `SYSTEM` only for the narrow job type. They validate referenced business state and cannot inherit the permissions of the staff actor who created the job.
- Database and provider errors fail closed and produce a generic unsuccessful result; email/queue success never substitutes for committed business state.
- Content-rich text, URLs, files, and all public form input are validated at the trust boundary (SEC-003, SEC-007).

## RLS defence in depth

Supabase PostgreSQL supports RLS, but Prisma/server database access can make per-user RLS misleading if every request uses one pooled privileged database identity. RLS must not be claimed as effective staff authorization unless the implementation proves safe request identity propagation through pooled transactions.

Recommended initial posture:

1. Do not expose application tables through a browser Supabase client. Revoke `anon` and `authenticated` access to staff, candidate, audit, job, idempotency, and rate-limit tables.
2. Use separate least-privilege PostgreSQL runtime and migration roles. The runtime database role cannot alter schema, PostgreSQL role grants, RLS policy, or existing audit history; authorised application operations may still insert `UserRole` assignment rows through narrow server logic.
3. Keep application authorization primary and exercise it on every server operation.
4. Apply RLS deny-all policies for public Supabase API roles on `Application`, `ApplicationAnswer`, `CandidateFile`, `FileSecurityReview`, `CandidateConsent`, `InternalNote`, `ApplicationStatusEvent`, `AuditEvent`, `StaffUser`, `UserRole`, `RetentionPolicy`, `BackgroundJob`, `IdempotencyRecord`, and `RateLimitBucket`.
5. Public content may be served only by the application server initially. A read-only published-content policy is optional later if a direct Supabase public client is actually required; no such requirement exists now.

Stronger per-staff RLS is an implementation option only if a proof demonstrates all of the following:

- each transaction sets a trusted local staff ID/role context from the verified server session;
- the context cannot leak between pooled connections;
- the runtime role does not bypass RLS;
- every Prisma query participating in a sensitive operation remains inside that transaction;
- tests prove cross-role, cross-row, disabled-user, and missing-context denial.

If that proof is too complex or fragile, retain application authorization plus least-privilege database roles and deny public Supabase access. This is an honest defence-in-depth model, not two nominal layers that silently bypass each other.

## Staff deactivation

`StaffUser.status = DISABLED` is the authoritative application deny switch. Deactivation:

1. requires `staff.manage` and recent MFA/reauthentication when supported;
2. commits disabled state/timestamp and an audit event;
3. makes every policy evaluation deny immediately, regardless of active `UserRole` rows;
4. triggers Supabase session revocation and records its operational outcome without reopening permissions on failure;
5. preserves historical actor links in notes, status events, file reviews, and audit records.

Reactivation is a separate audited operation and must not silently restore revoked role assignments.

## Audit expectations

Audit success and denial for:

- candidate metadata/detail/file access;
- quarantine retrieval and security-review result;
- cleared-file download and deletion;
- hiring-status and internal-note creation;
- retention/deletion request, execution, and policy change;
- job/public-content publication, closure, and archive;
- staff activation/deactivation and role changes;
- denied cross-role, invalid-state, expired, or missing-target operations where safe to record.

Events use fixed codes, opaque target IDs, outcome/reason, actor, timestamp, and correlation ID only. Candidate names, contact data, filenames, answers, notes, document metadata, Drive IDs, URLs, tokens, request bodies, and stack traces are prohibited.

## Denied-operation behaviour

- Missing/invalid session: `401` or redirect to staff sign-in for browser navigation, with no candidate detail.
- Authenticated but missing domain permission: `403` for known administrative capabilities.
- Cross-scope or sensitive target lookup where existence itself is confidential: generic `404`/not available.
- Invalid target state, expired retention, uncleared file, stale version, or closed deadline: deterministic conflict/unavailable response with no provider details.
- Rate limit or bot rejection: generic bounded response and retry guidance; no indication which abuse signal matched.
- Denied sensitive attempts are audited with safe reason codes. Client messages never reveal role assignments, Drive identifiers, database state, secrets, or file-security tool details.

## Implementation verification requirements

Before any candidate/admin release (FR-012–FR-016, SEC-001–SEC-008):

1. Unit-test the policy matrix and every state-dependent file/job/application transition.
2. Integration-test each role against every domain operation, including direct Server Action/route invocation without UI navigation.
3. Prove disabled users are denied with a still-valid Supabase session and stale role rows.
4. Prove `HIRING_REVIEWER` cannot retrieve quarantined, rejected, review-failed, validation-failed, deleted, or expired files.
5. Prove `HIRING_MANAGER`/`ADMIN` quarantine retrieval requires the dedicated permission, fresh checks, attachment delivery, and audit.
6. Prove a cleared download rechecks file hash/version, clearance, retention, and actor at request time and exposes no Drive URL.
7. Test BOLA/IDOR with valid opaque IDs from another scope and generic denial behaviour.
8. Prove metadata list queries cannot over-select contact, answers, notes, accommodation data, provider IDs, or audit metadata.
9. Test role changes, deactivation, session revocation failure, job deadline expiry, deletion-in-progress, and concurrent security-review outcomes.
10. If per-user RLS is adopted, test missing/leaked transaction context and verify the runtime role cannot bypass policies; otherwise verify public Supabase roles have no access.
11. Verify audit/error/log/email/job payloads with synthetic data contain no candidate PII, document metadata, secrets, or signed/provider URLs.
12. Run the relevant lint, type, tests, production build, dependency/secret checks, and authorised production-like security tests without suppressing failures.

No production candidate data or credentials may be used for these checks (OPS-001, SEC-006).

# Phase B2 — full administration workflow review gate

**Date:** 2026-09-30. **Result: STOPPED — B2 PERMISSION MIGRATION REVIEW REQUIRED and B2 MIGRATION REVIEW REQUIRED.** This is an assessment, not implementation or closure. No migration, permission change, application change, dependency change, commit, push or production operation was performed.

## Baseline and isolation

Fetched origin and verified both `origin/main` and actual remote main at `7feea8f5a513b365cb690fa2aa941e876db3bb41`, `feat: establish Neon production database architecture`. Created fresh branch `phase/b2-full-admin-workflows` in `C:\Users\atikm\.codex\worktrees\pyramid-b2\Pyramid Designs` from that exact commit. HEAD matched, working tree was clean and staging empty before assessment. No private environment file was copied or read.

Protected primary: `C:\Users\atikm\Projects\Pyramid Designs`, branch `feat/frontend-redesign`, HEAD `108200b3ea981957ba2683a8c050db7adba2ef42`. Its ten changed/untracked file hashes were captured for preservation checking. No primary mutation was performed. This assessment document is the only B2 checkout change and remains unstaged.

## Authority and assessment limits

Authority: Phase A decisions, B1-R1 closure, ADR 0017, current schema/migration 10, requirements FR-013–FR-016, data-model InternalNote definition, state machines, staff authorization/reads/mutations/pages and candidate-file server operations. Historical broad conceptual models and policy operation names are not executable workflow implementations.

Graphify guidance was checked; this fresh baseline contains no existing graph and no rebuild was requested. No graph installation/build was performed. Memory was used only to locate earlier staff boundaries; current repository files independently confirm the findings.

The mandatory migration gates were encountered during inventory, before application implementation. The complete implementation-reading, migration-replay, regression, accessibility and final independent-security-review programme was therefore not executed. No existing test result is relabelled as B2 evidence.

## Workflow inventory recorded before editing

### EXISTING

- Supabase verified claims, ACTIVE local staff mapping/current roles, AAL2, operation/target/state authorization; private dynamic staff navigation and pages.
- Content draft/scheduled metadata listing; exact draft detail; creation and title/summary editing of drafts with version/idempotency/audit protection.
- Job listing/detail with restricted reviewer context; manager/admin close/archive transitions. No job creation, rich editing, questions or publishing workflow.
- Minimized application listing and contact detail; permitted hiring transitions and append-only status/audit evidence. This is not a complete application-review surface.
- Candidate-file server APIs for review initiation, quarantine attachment retrieval, hash-bound manual Defender outcome recording and cleared attachment download. The existing application page does not expose the complete operational review UI.
- Bounded audit listing of 20 minimized events; manager recruitment scope and admin/auditor access. No filter/detail/pagination workflow.
- Existing gated worker, reconciliation, retention tombstone and notification foundations. No production policy or provider activation.

### MISSING INTENDED / IMPLEMENTED

**IMPLEMENTED IN B2: none.** Only this review-gate document was added.

- Project full-field draft editor, private preview, classifications, credits, existing-approved-media relationship management, explicit publish/archive and supported scheduling.
- Public Work/case-study consumption of published project data. `/work` currently renders its own synthetic prototype array; publication would not make it a production CMS view.
- Job draft creation/editing, question/option configuration and ordering, publish/schedule/unschedule, safe application context/count and public integration.
- Authoritative zero-vacancy Careers behavior. `/careers` currently imports synthetic `careerJobs`; `?view=none` is only a prototype empty-state switch.
- Application answers, history, consent context, candidate-file/security detail, truthful retention context, verified withdrawal and append-only internal notes.
- Staff-facing manual Defender retrieval/instructions/attestation/results/retry workflow using existing server security evidence.
- Audit safe indexed filters, exact detail, bounded cursor pagination and authorized target links.

### BLOCKED BY POLICY / PREREQUISITE

- Talent-network and successful-hire/employment retention remain unresolved.
- Six-month unsuccessful-job policy is approved in principle; its precise lifecycle anchor remains unresolved in Phase A. Existing `expiresAt` is not proof that it implements six calendar months from the correct terminal lifecycle event. Do not invent or relabel that date.
- Legal/consent approval, production staff Auth, live Neon compatibility and operational reviewer/deputy acceptance remain later release gates.
- Public binary-media ingestion/storage is a separate prerequisite. `ProjectMedia` is project-owned metadata, with no independent approved-media catalog/provenance field or complete ingestion pipeline. Do not improvise uploads or treat arbitrary submitted paths as approved assets.
- Automatic scheduled publication is not complete merely because enums/timestamps exist; the current fixed worker dispatch does not implement publication jobs.
- Broader conceptual Culture/SiteConfiguration models are absent from the current schema. Do not invent a generic CMS or silently add them under B2.

### INTENTIONALLY UNAVAILABLE / MUST REMAIN IMPOSSIBLE

Generic table editing; arbitrary record/state deletion or assignment; audit/history/security-evidence editing; ADMIN bypass; impersonation; fake malware clearance; policy invention; unrestricted role provisioning; public Drive IDs/links; real/synthetic production publication; live provider effects; production migration/deployment/intake and follow-on phases.

## Existing role matrix

- **CONTENT_EDITOR:** content metadata/draft reads and draft creation/editing. Policy already names content publish/archive, but executable full workflows and DB rights are absent. No hiring access.
- **HIRING_REVIEWER:** scoped job context, application metadata/contact, permitted ordinary hiring transitions; existing policy permits authorized answers/notes/file-state reads and cleared downloads. No withdrawal recording, quarantine security disposition, job management or content publication.
- **HIRING_MANAGER:** hiring review, permitted transitions/withdrawal policy, job management policy, quarantine/manual security review and recruitment-only audit. Several policy operations still lack portal/domain implementations.
- **ADMIN:** explicit cross-domain operational permissions subject to the same state/evidence/AAL2 constraints. No superuser bypass.
- **AUDITOR:** read-only audit; retention-expiry policy is additionally context-bound. No candidate contact, file retrieval or mutation.

Roles remain unchanged. A declared authorization operation is not evidence of an implemented route or sufficient runtime SQL privileges.

## B2 PERMISSION MIGRATION REVIEW REQUIRED

Migration 10 explicitly restricts `Project` UPDATE to title/summary/version/updatedAt; `Job` has no INSERT and UPDATE only for lifecycle/version/close/archive/updatedAt. `JobQuestion` and `JobQuestionOption` are SELECT-only. `Discipline`, `Sector`, `ProjectMedia`, `ProjectCredit`, `ProjectDiscipline` and `ProjectSector` have no runtime access or applicable runtime policies. B1's exact permission suite asserts these denials; they are intentional boundaries.

### Exact blocked SQL and necessary privileges

These parameterized examples describe required workflow statements; **they were not executed**. Each mutation would also require current staff/state validation, a transaction, parent locking/version predicates and immutable audit evidence.

```sql
-- Explicit project publish after a locked, approved-readiness check.
UPDATE public."Project"
SET "publicationState" = 'PUBLISHED', "publishedAt" = CURRENT_TIMESTAMP,
    "version" = "version" + 1, "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = $1 AND "version" = $2 AND "publicationState" = 'DRAFT'
RETURNING "id";
-- Missing: UPDATE(publicationState, publishedAt). SELECT/version/updatedAt already exist.

-- Minimum job draft creation, before later full editor fields/questions.
INSERT INTO public."Job" (
  "id", "slug", "title", "departmentId", "jobLocationId", "workArrangement",
  "employmentType", "experienceLevel", "shiftSchedule", "summary", "lifecycleState", "updatedAt"
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'DRAFT', CURRENT_TIMESTAMP);
-- Missing: INSERT plus runtime INSERT RLS policy on Job.

INSERT INTO public."JobQuestion" ("id", "jobId", "questionType", "prompt", "required", "sortOrder")
VALUES ($1, $2, $3::"QuestionType", $4, $5, $6);
INSERT INTO public."JobQuestionOption" ("id", "jobQuestionId", "label", "sortOrder")
VALUES ($1, $2, $3, $4);
-- Missing: INSERT and INSERT policies. Editing needs named-column UPDATE and UPDATE policies.

SELECT "id", "name" FROM public."Discipline" WHERE "active" = true;
INSERT INTO public."ProjectDiscipline" ("projectId", "disciplineId") VALUES ($1, $2);
-- Missing: SELECT/policy on Discipline; SELECT/INSERT/policies on ProjectDiscipline.
```

### Narrow proposed forward permission extension — review only

Create a new permission migration only after owner/reviewer approval; preserve all ten historical migrations and B1's default-deny ownership/role/function boundaries. No owner credential fallback, broad UPDATE or extra privileged role.

Minimum concrete additions for the statements above:

```sql
GRANT UPDATE ("publicationState", "publishedAt") ON public."Project" TO pyramid_runtime;
GRANT INSERT ON public."Job" TO pyramid_runtime;
CREATE POLICY b2_runtime_job_insert ON public."Job"
  FOR INSERT TO pyramid_runtime WITH CHECK ("lifecycleState" = 'DRAFT' AND "publishedAt" IS NULL);
GRANT INSERT ON public."JobQuestion", public."JobQuestionOption" TO pyramid_runtime;
CREATE POLICY b2_runtime_question_insert ON public."JobQuestion"
  FOR INSERT TO pyramid_runtime WITH CHECK (true);
CREATE POLICY b2_runtime_option_insert ON public."JobQuestionOption"
  FOR INSERT TO pyramid_runtime WITH CHECK (true);
GRANT SELECT ON public."Discipline", public."ProjectDiscipline" TO pyramid_runtime;
CREATE POLICY b2_runtime_discipline_select ON public."Discipline"
  FOR SELECT TO pyramid_runtime USING (true);
CREATE POLICY b2_runtime_project_discipline_select ON public."ProjectDiscipline"
  FOR SELECT TO pyramid_runtime USING (true);
GRANT INSERT ON public."ProjectDiscipline" TO pyramid_runtime;
CREATE POLICY b2_runtime_project_discipline_insert ON public."ProjectDiscipline"
  FOR INSERT TO pyramid_runtime WITH CHECK (true);
```

This is the smallest proven core, **not a complete approved B2 migration**. The remaining workflow-specific review set is:

- Project editor: UPDATE(clientDescriptor, year, brief, challenge, approach, outcome, featured); scheduling/archive: UPDATE(publishAt, archivedAt), alongside the publication columns above. Do not grant ID/createdAt changes or project DELETE.
- Job editor: UPDATE(title, departmentId, jobLocationId, workArrangement, employmentType, experienceLevel, shiftSchedule, compensationMode, compensationMinMinor, compensationMaxMinor, compensationCurrency, compensationPeriod, compensationText, summary, responsibilities, requiredQualifications, preferredQualifications, hiringProcessCopy, applicationDeadline); publication/scheduling: UPDATE(publishAt, publishedAt). Draft slug editing is optional and should not be granted unless the final editor requires it; published slugs remain protected.
- Questions: UPDATE(questionType, prompt, required, sortOrder, active); options: UPDATE(label, sortOrder), with runtime UPDATE policies. IDs, parent IDs and createdAt stay immutable. No question/option DELETE is needed for the initial review proposal. Existing used-question/option triggers must remain; even deactivating a used question is prohibited by current triggers.
- Sector classification mirrors Discipline reads; ProjectSector mirrors the join privileges above. Draft-only removal of a classification relationship may need narrowly scoped DELETE/policy on the join tables, never vocabulary deletion.
- Credits need scoped SELECT/INSERT and UPDATE(displayName, role, approvedUrl, sortOrder), plus their operation policies. Draft-only relationship removal, if required, must be separately specified; no arbitrary project/content deletion.
- Existing media records need SELECT and narrowly reviewed UPDATE of operational metadata/order only. Do not grant storage/source/path reparenting or speculative media INSERT until the approved-record/relationship boundary is specified. Binary ingestion remains unavailable.
- JobLocation/Discipline/Sector active-reference stability needs the existing fixed locking boundary extended narrowly, or another demonstrated serialization protocol. Do not remove locks to compensate for SELECT-only permissions. Any extension retains nonowner/NOBYPASSRLS locking owner, UPDATE(id) only for locking and WITH CHECK(false) against writes.

Server domain roles remain authoritative; new RLS policies target only the existing trusted server capability. Before approval/closure, exact column and policy expectations in the B1 suite must be deliberately extended together with executable B2 positive/negative/concurrency tests. New policies do not themselves implement staff authorization.

## B2 MIGRATION REVIEW REQUIRED — InternalNote

This is a required product workflow, not speculative CRUD: requirements FR-015 and PRIV-005, website-plan admin components, the data-model `InternalNote` definition and `application.note.create/read` policy all require it. `prisma/schema.prisma` contains no note model. Audit metadata and status-event summaries must not be used as editable or private free-text notes.

### Exact proposed model — review only

```prisma
model InternalNote {
  id                String      @id @default(uuid()) @db.Uuid
  applicationId     String      @db.Uuid
  authorStaffUserId String      @db.Uuid
  body              String      @db.VarChar(2000)
  createdAt         DateTime    @default(now()) @db.Timestamptz(6)
  application       Application @relation(fields: [applicationId], references: [id], onDelete: Restrict)
  authorStaffUser    StaffUser   @relation(fields: [authorStaffUserId], references: [id], onDelete: Restrict)

  @@index([applicationId, createdAt, id])
}
```

Add inverse `internalNotes InternalNote[]` relations to Application and StaffUser only after approval. The 2,000-character bound is a proposed validation limit, not an existing policy decision. Add a nonblank-body check and DB protections against UPDATE/ordinary DELETE; corrections append a new note. Creation must serialize on the Application parent, reject expired/deletion-pending/unsubmitted targets, bind author from fresh verified staff and use existing actor-bound staff idempotency. New-table RLS must remain enabled and default-deny for public/browser identities.

**Permissions:** HIRING_REVIEWER/HIRING_MANAGER/ADMIN only, AAL2 and exact application/current-state checks; CONTENT_EDITOR and AUDITOR denied. Runtime SELECT/INSERT only for normal notes. No direct body rewriting or ordinary admin deletion.

**Audit semantics:** `APPLICATION_NOTE_CREATED` plus opaque note/application target, actor, fixed reason/outcome and correlation ID in the same transaction. Note body never enters audit metadata, status-event summaries, URL/query parameters, logs, background payloads, provider messages or broad lists. A successful retry creates no duplicate note/evidence.

**Retention/privacy:** notes are candidate personal data, not permanent audit evidence. They inherit the application's approved purpose/lifecycle deletion responsibility; no separate duration is invented. Extend the existing authorized retention handler with bounded note erasure before completing the application tombstone. A new deletion guard/policy must reject ordinary DELETE and allow only the authoritative retention workflow under parent serialization; completion must prove notes are absent. The exact guard/worker SQL requires review together with the new table. Talent-network/successful-hire retention remains disabled while policy is unresolved. Do not interpret append-only as indefinite personal-data retention.

**Why existing evidence cannot serve:** AuditEvent explicitly prohibits note bodies and has immutable operational purposes. ApplicationStatusEvent records hiring state changes with safe summaries; note creation must not manufacture a status transition. Neither is an authorized private-note store or has the required personal-data erasure contract.

## Security and operational boundaries at the stop

Authorization/AAL2, current state machines, CSRF, DTO/cache protections, existing row/version/idempotency concurrency and immutable evidence remain unchanged. No new BOLA, mutation, relationship or publication endpoint exists. Candidate-file review APIs continue to use reviewer-attested Defender outcomes; the application cannot prove scanner execution. No staff-facing B2 review UI was created.

Staff provisioning/recovery/invitation and role lifecycle are not inferred from ADMIN or policy names. The historical authorization document does describe deactivation/session revocation, but B1-R1 makes staff writes operator-only. No B2 staff-management design or capability was silently implemented; a requested product-facing staff lifecycle would need its own scope/design and permission review.

No six-month retention date was invented, no production synthetic fixture was created/published and no fake vacancy was seeded. Public Careers and Work remain their baseline prototypes, so neither is claimed production-ready.

## Verification and release state

Current-turn checks: exact local/tracking/remote baseline; fresh clean/empty-staging worktree; repository schema/ACL/test-source assessment; ten migration files present; documentation-only diff/whitespace; preservation and sensitive-pattern checks. No DB connection, fixture creation, migration replay, functional regression, lint/typecheck/build or viewport/keyboard test was run after the mandated stop. Existing B1 counts (2,021 restricted checks per run; 8,465 counted total) are historical closure evidence only.

Final preservation checks: all ten protected-primary changed/untracked file SHA-256 values, status entries, branch and HEAD match the initial snapshot. B2 HEAD, origin/main and actual remote main still match the required baseline; staging remains empty. No .env.local exists in B2. The ten historical migrations and all application/dependency/architecture/security files have no diff. Canonical LF-normalized logo SHA-256 is `2c5d2042ef020aa7ad37ff92e6fd9c3407ef305102ee49da3b6900ff99ffe60c`. Documentation scan found zero matches across the eight credential/token/email patterns tested and zero trailing-whitespace lines; this is a bounded document-only pattern check, not proof of a complete repository/real-PII scan. No generated output, staged content or new execution logs exist for B2.

Dependency baseline records production audit zero vulnerabilities and one HIGH transitive dev-only brace-expansion issue. Neither audit was rerun here; dependencies/lockfile are untouched and remediation remains the separate release task. No green full-audit claim is made.

No final B2 implementation diff exists for independent security review. The assessment identifies blocking permission/schema gaps rather than claiming a completed implementation passed review. The resume gates require approval of exact forward changes, full required repository reading, fresh restricted-runtime tests and all B2 closure checks before conditional release.

LIVE RESEND EMAILS: 0. LIVE GOOGLE MUTATIONS: 0. LIVE TURNSTILE REQUESTS: 0. REAL CANDIDATE DATA: 0. PRODUCTION MIGRATIONS: 0. PRODUCTION DEPLOYMENTS: 0.

MIGRATION REQUIRED: YES. PERMISSION MIGRATION REQUIRED: YES. MIGRATIONS CREATED: 0. PERMISSIONS BROADENED: 0. COMMITTED: NO. PUSHED: NO. B2 CLOSED: NO. No ADR is created because no new decision has been accepted. Later phases have not started.

---

## B2-R1 implementation continuation — 2026-09-30

The preceding assessment is preserved as historical evidence of the original stop. The owner's B2-R1 instruction subsequently authorized one forward InternalNote/permission migration and completion of the intended workflows. This continuation supersedes those two review stops only. **Release status: repository/disposable implementation, regression, browser, quality and final security review gates passed.** The authorized scoped commit and normal fast-forward push require the final staged-snapshot and unchanged-remote-baseline gates below. Release identity and Git preservation evidence are recorded outside the repository. No later phase or production action is authorized.

### Starting state and migration review

Resumed the existing `phase/b2-full-admin-workflows` checkout at `7feea8f5a513b365cb690fa2aa941e876db3bb41`; tracking and actual remote main matched and staging was empty. The assessment was retained. The protected frontend checkout was not switched, stashed, reset, cleaned, staged or reconciled. Its exact porcelain-v2 status, branch, HEAD and ten changed/untracked file hashes match `pyramid-b1-evidence/primary-before.json`.

Independently reviewed the executable workflows and narrowed the assessment's proposals. Notes are application-scoped, not polymorphic. No note erasure permission was added while production retention is unresolved. Credits and unused options use transactional replacement, so no unused UPDATE capability was granted. Media remains operator-curated existing metadata, with no insertion, source/path editing or reparenting. No generic CMS, identity administration, scheduling worker or arbitrary deletion was introduced.

**Migration:** `20260930010000_phase_b2_admin_workflows`. **Repository count: 11.** Migrations 1–10 remain unchanged. Migration 11 adds InternalNote and its indexes/guards, an AuditEvent cursor index, the exact grants/policies below, draft-parent serialization triggers and narrow extensions to the existing reference-lock function. Four new trigger functions are SECURITY INVOKER and cannot be directly executed by public/browser/runtime identities. The only SECURITY DEFINER remains the existing private fixed reference-lock function owned by the nonowner, NOBYPASSRLS locking capability. No role/login/password is created by the migration.

### InternalNote

- Target and fields: id, applicationId, authorStaffUserId, body (varchar 2000), createdAt; restrictive Application/StaffUser foreign keys and application/date/id index.
- HIRING_REVIEWER/HIRING_MANAGER/ADMIN only, verified claims, ACTIVE current mapping and exact roles, AAL2, available submitted application. CONTENT_EDITOR/AUDITOR denied.
- Independent concurrent appends use Application SHARE locks; eight simultaneous valid notes are retained. Actor-bound idempotency prevents duplicate notes/audits and rejects changed request payloads.
- Server validation rejects malformed/unknown input, blank/oversized body and unavailable targets. SQL also rejects whitespace-only bodies. React escapes text; no HTML interpretation.
- Runtime SELECT/INSERT only. UPDATE/DELETE are denied by grants and immutable triggers. Corrections append another note.
- Notes appear only in protected detail (latest 50), never broad lists/public DTOs/provider payloads. Audit records action/actor/application/opaque noteId without body.
- Notes are personal data tied to the application's future approved erasure. Tombstone completion fails while notes remain; a note-bearing retention attempt remains pending/incomplete. No general note DELETE or policy activation was invented. A later reviewed erasure mechanism is required before enabling production retention.

### Exact B2 privilege manifest

Existing B1 grants/default privileges remain. Each addition targets only `pyramid_runtime` unless explicitly identified as a reference lock; browser equivalents remain denied.

| Table | New operation/columns | Server workflow and app roles | Policy/state restriction and reason |
| --- | --- | --- | --- |
| InternalNote | SELECT, INSERT | application detail/note append; reviewer, manager, admin | b2_note_select/insert plus availability/ACTIVE-author guard; append-only, no UPDATE/DELETE |
| Project | UPDATE clientDescriptor, year, brief, challenge, approach, outcome, featured, publicationState, publishAt, publishedAt, archivedAt | full content draft save, publish/archive; editor/admin | B1 update policy plus locked state/version authorization; no ID/slug/createdAt editing or DELETE |
| Job | INSERT | draft create; manager/admin | b2_job_insert: DRAFT with no publication/close/archive timestamps |
| Job | UPDATE title, departmentId, jobLocationId, workArrangement, employmentType, experienceLevel, shiftSchedule, compensationMode, compensationMinMinor, compensationMaxMinor, compensationCurrency, compensationPeriod, compensationText, summary, responsibilities, requiredQualifications, preferredQualifications, hiringProcessCopy, applicationDeadline, publishAt, publishedAt | draft save and publish; manager/admin | B1 update policy, locked DRAFT/version and active-reference/readiness checks; no slug/ID/createdAt/DELETE extension |
| JobQuestion | INSERT; UPDATE questionType, prompt, required, sortOrder, active | question editing/order; manager/admin | b2_question_insert/update and serialized draft parent; existing used-question immutability |
| JobQuestionOption | INSERT, DELETE | replace options for unused question; manager/admin | insert policy/draft trigger; b2_unused_option_delete requires unused question and draft Job; no UPDATE/reparenting |
| Discipline, Sector | SELECT | content references/readiness/public DTOs; editor/admin for staff | b2_content_select; no vocabulary mutation |
| ProjectDiscipline, ProjectSector | SELECT, INSERT, DELETE | draft relationship replacement; editor/admin | b2_content_select/relation_insert/relation_delete; locked exact draft parent and active target, transactional replacement |
| ProjectCredit | SELECT, INSERT, DELETE | draft credit replacement; editor/admin | same draft relation policies/trigger; HTTPS URLs validated, no UPDATE/reparenting |
| ProjectMedia | SELECT; UPDATE altText, caption, accessibilityDescription, sortOrder, updatedAt | existing curated metadata/order; editor/admin | b2_content_select/relation_update and draft-parent trigger; exact project-owned ID set; no INSERT/DELETE/path/source/reparenting |
| JobLocation, Discipline, Sector | SELECT, UPDATE(id) to pyramid_reference_locker only | fixed LOCATION/DISCIPLINE/SECTOR reference locks | b2_reference_select/lock; WITH CHECK(false) prohibits writes; no runtime membership/owner bypass |

Public consumption uses trusted server SELECT capabilities and minimized DTOs; it adds no browser grants. SQL privilege alone never confers an application-domain permission.

### Final roles and implemented workflows

| Role | Content | Jobs | Applications and notes | Files | Audit |
| --- | --- | --- | --- | --- | --- |
| CONTENT_EDITOR | draft create/edit/relationships/private preview/publish/archive | denied | denied | denied | denied |
| HIRING_REVIEWER | denied | authorized application context only | submitted detail/contact/answers/consent/context, permitted ordinary status changes, note read/append | authorized state and cleared attachment download | denied |
| HIRING_MANAGER | denied | create/edit/questions/order/publish/close/archive | reviewer operations plus verified withdrawal and separately gated accommodation context; security-pending metadata only | quarantine retrieval and manual review initiation/outcomes | recruitment-only read/filter/detail |
| ADMIN | explicit content operations | explicit management operations | explicit recruitment operations | explicit protected review/download operations | authorized read/filter/detail/target links |
| AUDITOR | denied | denied | denied, including note content | denied | read-only events/filter/detail; no candidate target link |

ADMIN does not bypass availability, stale versions, AAL2, evidence integrity or publication checks. Supabase provisioning/invitations/recovery/role administration remains a separate production gate.

Content supports full draft fields, native multiple-selection classifications, credit replacement, existing media metadata/order, private preview, explicit publication and archive removal from public consumption. Publication requires complete narrative sections, active discipline/sector references and curated local image paths/alt text. Project hard deletion and binary ingestion are unavailable. Scheduling is not represented as operational merely because enum/timestamp fields exist: no publication worker is implemented.

Job management supports draft creation/editing, compensation publication modes, bounded narrative/deadline validation, question creation/editing, option replacement, complete ordering, publish/open, close and archive. Used questions/options cannot be changed or removed; historical answer snapshots remain intact. Draft version/parent locks serialize saves, question changes and publication. No arbitrary state selector or hard Job/Question deletion exists.

Version-1 narrative JSON is a constrained document/paragraph/text AST, with at most 30 paragraphs of 2,000 UTF-16 code units each. Native textareas supply one paragraph per line. One shared server parser strictly validates the fixed shape and returns text for escaped React rendering. Required publication documents must be nonempty. Unsupported rich nodes/versions/raw arrays are rejected; the editor does not claim headings/lists/links/marks. The implementation contract is recorded in the data model; no editor dependency or new ADR is needed.

Public `/work` and `/work/[slug]` now consume published Project DTOs. `/careers` and role detail consume only effective published/open Jobs with active references and valid deadlines. Work/Careers independently exclude fixture markers across every returned text/relationship field. Positive DTO tests use unmarked text exclusively in confirmed disposable fixtures. No real content was populated. The actual Careers page renders `0 open roles` and the legitimate no-current-openings state without `?view=none`. Candidate intake stays closed. Public boundaries return an empty list only when DATABASE_URL is deliberately absent; configured database failures propagate.

Application management includes bounded index, submitted contact/detail, professional context, answers, immutable hiring history, consent context, latest notes, file/security state, permitted ordinary status transitions and separately confirmed verified withdrawal. Withdrawal updates technical and hiring dimensions together and records immutable history/audit. Legacy hiring-only WITHDRAWN submissions are denied. Expired/deletion-pending/unavailable targets fail closed. Manager/admin security-pending detail excludes candidate contact/profile/answers/notes/consents.

The manual Defender UI exposes protected quarantine attachment retrieval, review initiation, digest/time/tool-version/outcome fields and explicit reviewer attestation. It truthfully states that the application does not observe scanner execution. Existing backend guards bind the review to current digest/reviewer/time/tool, serialize concurrent outcomes and preserve immutable evidence. Browser tests exercise initiation, wrong digest denial, valid FAILED attestation and cross-application file denial; B1/2H cover synthetic attachment retrieval and CLEAN/REJECTED/FAILED outcomes. No live scanner, Google retrieval or operational endpoint acceptance was claimed.

Audit provides 20-event cursor pages, allowlisted bounded resource/exact-ID filters, event detail and authorized target links. Actor/context DTOs exclude contact/answers/note bodies/provider payloads; events remain immutable. AUDITOR cannot navigate to candidate detail. New browser forms reject unknown/duplicate scalar fields and preserve same-origin controls, native required confirmation, pending buttons and generic alert/status notices.

### Verification evidence

Evidence is retained outside the repository in `C:\Users\atikm\.codex\worktrees\pyramid-b2-evidence`. `scripts/run-phase-b2-disposable.mjs` uses PostgreSQL 17 on loopback 55442, fresh non-superuser migration owners, separate restricted runtime logins and generated in-memory credentials. No private environment file is read/copied. B1/B2 and historical suites use separate fresh databases; fixtures never reach configured development/production databases.

- All 11 migrations replay from zero; Prisma validation/status and schema comparison pass with zero drift.
- 29 public tables have RLS, 80 policies target only the runtime/locking capabilities, 22 application/private functions retain restricted EXECUTE. Public/browser CRUD/application-function access and ledger/default-privilege escalation are denied.
- B1 restricted permission/evidence suite: 2,092 counted checks (not the sum of its cumulative intermediate counts).
- B2 restricted workflow suite: 142 counted checks, including independent/concurrent notes, retention completion refusal, role/AAL1/disabled/revoked mapping denials, guessed/other-resource targets, relationship scope, stale/concurrent saves/publication/questions/hiring/withdrawal, active-reference locks/races, used-question integrity, malformed AST/date/filter input and positive/negative public DTOs.
- Twelve historical suites pass: 2B/2C/2D/2E/2F; 2G 83; 2H 291; 2I-B 431; 2I-C1 230; 2I-C2B offline 250; 2I-D 422; 2I-E offline 648. The first five do not expose total counters. Their fixture-only transactions remain separate from the B2 restricted runtime proof.
- Browser verification passed 478 checks and uses actual production Next pages/actions, the restricted runtime DB, local RSA-signed synthetic sessions and a loopback-only JWKS issuer. No application auth bypass/test route is added. Temporary public Auth build configuration is removed by the final clean production rebuild. AAL1 and invalid signatures deny; current database roles remain authoritative.
- Accessibility matrix covers ten routes at 320/390/768/1280/1440 (50 combinations): headings, native labels, keyboard/focus, required confirmations, reduced motion, empty public lists and no horizontal overflow. Actual notes, validation errors, unknown/duplicate fields, cross-origin mutation, content edits/publication refusal, question editing, file attestation, audit filters/detail/pagination and role-based response privacy are exercised. Visual screenshot review identified/fixed oversized confirmation checkboxes; a sizing assertion now protects their label layout. This is local Chrome evidence, not production Auth/operator acceptance.
- Final lint, typecheck, clean production build, post-build typecheck, 32-check production smoke/client scan, sensitive/whitespace/hash and staged-snapshot checks are recorded at release closure below.

### Final security review and remaining release gaps

An independent final pass over migration/grants, transaction boundaries, current-principal checks, public projection, new Server Actions and rendered screenshots found and corrected the legacy withdrawal confirmation bypass, swallowed read-denial errors, incomplete fixture filtering, unversioned narrative representation, unnecessary option/credit UPDATE grants, malformed deadline/filter acceptance, whitespace-only SQL note acceptance and confirmation layout. No unresolved B2 schema/permission blocker remains. Receipt retries disclose only the actor's already recorded opaque mutation reference, recheck the current principal and never replay a mutation or restore expired access.

Retention policy remains: unsuccessful JOB_APPLICATION six months in principle, exact lifecycle anchor unresolved; talent-network and successful-hire/employment retention unresolved. Note erasure requires later reviewed design; production erasure is not activated. Media ingestion/catalog/population, scheduling execution, legal approval, owner content approval, production Supabase Auth, reviewer/deputy acceptance, Neon live compatibility, backup/restore and hosting/scheduler acceptance remain later gates.

Dependency audit on September 30, 2026 differs from the earlier baseline. Production: **one CRITICAL Next.js advisory**, GHSA-vcvr-r3jv-pc5j, published 2026-09-30 14:48:30 UTC, affecting next >=16.2.0 <16.3.6; installed direct next 16.3.3, patch 16.3.6. Its documented attack requires attacker-controlled SVG content/attributes/styles through Node.js next/og ImageResponse. Repository scans found no next/og, ImageResponse, @vercel/og, generateImageMetadata or image-generation routes, so that attack path is absent here. The vulnerable package version remains and remediation is deferred to the separately authorized dependency phase; no zero-production-vulnerability claim is made. Full audit: **that CRITICAL plus one dev-only HIGH brace-expansion package finding**, installed 1.1.18 and 5.0.9 via ESLint/TypeScript tooling; GHSA-qhr7-859c-m2p7 / GHSA-6j4f-fj2g-mc7p high recursion issues and GHSA-q2hr-2g5m-vwhr moderate quadratic expansion. Safe fixed branches are 1.1.21 or 5.0.12 for all reported issues. Package manifest/lockfile remain unchanged; no modernization or remediation was started.

LIVE RESEND EMAILS: 0. LIVE GOOGLE MUTATIONS: 0. LIVE TURNSTILE REQUESTS: 0. REAL CANDIDATE DATA: 0. PRODUCTION MIGRATIONS: 0. PRODUCTION DEPLOYMENTS: 0. No live provider credentials, staff account/TOTP provisioning, legal drafting, DNS, backup rehearsal, scheduler activation, real content population, cleanup or next-phase work was performed.

### Release closure

All implementation gates passed: fresh 11-migration replay and zero drift; restricted B1/B2 suites; all twelve historical regressions; 478 browser checks across 50 page/viewport combinations; lint; typecheck; clean production build; post-build typecheck; and 32 production smoke checks with 94 client files scanned. Temporary browser Auth configuration is absent from the final emitted server/client output. The canonical logo, all ten historical migrations and both dependency files remain unchanged.

The final independent review found no unresolved B2 schema/permission or applicable security blocker. The critical Next.js package finding and dev-only brace-expansion finding remain explicitly recorded above; dependency remediation is outside B2 and no zero-vulnerability claim is made. READY means repository/disposable workflow verification only. Production Auth, Neon owner configuration, approved media/content population, legal/retention decisions and operational acceptance remain separate gates.

The working sensitive/whitespace scan covers 35 B2 source files, 262 generated files and the external evidence/log collection, with zero bounded-pattern findings. Exact working/staged counts and preservation checks are saved in `pyramid-b2-evidence/release-scan-working.json` and `release-scan-staged.json`; this is pattern-based verification, not exhaustive forensic detection. Protected-primary branch, HEAD, exact porcelain-v2 status and ten changed/untracked hashes match the baseline snapshot.

Release procedure: stage only the reviewed B2 files; inspect the full staged diff and stat; require `git diff --cached --check` and the staged sensitive scan to pass; commit exactly `feat: complete staff administration workflows`; fetch origin and require main still equals `7feea8f5a513b365cb690fa2aa941e876db3bb41`; then perform a normal fast-forward push and verify local HEAD, tracking main and actual remote main match. A moved main requires STOP without merge/rebase. Resulting commit identity, staged artifact hash and protected-primary closure proof belong to external release evidence, avoiding a self-referential commit SHA in this source. Stop after closure; no later phase or production activation follows.

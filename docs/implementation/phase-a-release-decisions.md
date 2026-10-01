# Phase A — authoritative owner release decisions

**Database decision superseded on 2026-10-01 by [ADR 0019](../architecture/decisions/0019-supabase-production-database-rebaseline.md):** Supabase PostgreSQL is production; Supabase-to-Neon migration is ABANDONED BY OWNER ARCHITECTURE DECISION — 2026-10-01. Other owner decisions remain in force. The original decisions below are retained as history.

**Date:** 2026-09-30. **Context:** Owner instructions following closed Phase 2J at `9de6ba306916136e7d55c34b14932938fa99b7a5`. These decisions supersede provider and release-policy recommendations in historical records; they do not rewrite those records or authorize production activation.

## Seven approved decisions

1. **Application database:** Neon PostgreSQL is the approved production application database. Retain Supabase Auth. Target: Hostinger Node/Next.js → server-only `pg` → Neon; Prisma is schema/migration tooling only, with no Prisma Client runtime. Reconcile this architecture in B1 before later workflows or release.
2. **Malware review:** Manual Windows Defender review may support initial low-volume candidate-file operations. Require a trained authorized reviewer, designated deputy, hash-bound evidence, CLEAN/REJECTED/FAILED disposition, no fake clearance and bounded capacity. PDF structural validation is not malware scanning. Automated scanning is not required for initial launch. Operational staffing and acceptance remain gates.
3. **Per-IP limiting:** May remain deferred for launch as defense in depth, conditional on deployed acceptance of existing protections. Global PostgreSQL admission limiting, Turnstile, request/multipart bounds, process concurrency controls, idempotency, authoritative server validation and platform/resource acceptance remain mandatory. Trusted client IP remains deferred until provenance is proven; do not trust forwarding headers.
4. **Retention:** Unsuccessful job applications and associated CV/current candidate personal data: six months from the relevant application lifecycle point, unless a valid earlier deletion request applies and no overriding retention requirement exists. The precise lifecycle implementation requires later review. Successful-hire/employment records require their own applicable employment/legal policy. Talent-network duration is unresolved; never silently apply the six-month job-application rule. Later execution must fail closed for unresolved policy classes.
5. **Legal pages:** Authorize later production-quality Privacy, Candidate Privacy, Terms and Accessibility drafts for owner/legal review. Drafts do not constitute legal approval. B1 does not draft these pages.
6. **Careers:** Launch with no open roles and a legitimate zero-vacancy experience. No fake vacancies or production synthetic seeds. Talent-network intake requires separately approved production policy and retention.
7. **Administration:** Implement the full intended administrative workflows in a later approved phase, not arbitrary CRUD. Preserve role/state authorization, AAL2, audit evidence, BOLA protection, strict validation, safe concurrency, immutable evidence and default deny. B1 inventories required database primitives only.

## Unresolved owner/legal/operations items

- Talent-network retention duration and production policy.
- Successful-hire/employment retention policy and lifecycle activation.
- Final legal/policy approval; draft authorization is not approval.
- Exact production operational owners, trained reviewers and deputies, capacity and recovery ownership.
- Exact Neon production target, plan, region, data boundaries and private role configuration.
- Production/source data inventory, backup/restore acceptance, migration/cutover and rollback approval.
- Production deployment authorization and all remaining deployed acceptance gates.

## Explicit non-decisions and phase boundary

No production migration, database/project deletion, data transfer, intake/retention activation, Auth replacement, production deployment/DNS change, backup rehearsal, scheduler configuration, Google/live-email rehearsal or worktree cleanup is authorized. No old Neon project is designated the final production target. No runtime owner/BYPASSRLS identity, broad immutable-evidence UPDATE grant or new forward migration is approved by these decisions. B1 must stop before creating a required new migration and submit its exact need and forward-only plan for review.

**B1-R1 authorization amendment, 2026-09-30:** The owner subsequently reviewed that proposal and explicitly authorized exactly one forward permission migration, necessary locking changes, disposable verification and conditional B1 commit/push. Migration `20260930000000_phase_b1_runtime_permissions` establishes the restricted server capability without changing the nine historical migrations. This supersedes only the migration-review stop above; it does not approve any production database operation, credential activation, unresolved retention class or next phase. The known dev-only dependency issue remains a separately recorded release gap under the explicit instruction to leave dependency maintenance outside B1.

**PHASE A DECISIONS RECORDED: YES.** Phase A closes business decisions only; unresolved legal/operational/release items remain unresolved.

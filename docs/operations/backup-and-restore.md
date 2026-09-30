# Application Database Backup and Restore Policy

**Current provider amendment, 2026-09-30:** Neon is the approved application database under [ADR 0017](../architecture/decisions/0017-neon-application-database-supabase-auth.md). Supabase Auth and its project/database remain intact. The provisional Supabase procedure below is historical source guidance; it does not establish a ready Neon production recovery plan. [B1 recovery inputs](../implementation/phase-b1-neon-production-database.md#backuprecovery-inputs) require a direct-endpoint logical export, isolated restore target, actual plan/history-window evidence, named credential owner/deputy, deletion replay and external-service reconciliation. No backup/restore rehearsal or production migration is authorized. After required Neon-only writes, an environment-only rollback to an older Supabase snapshot is unsafe without reconciliation.

**B1-R1 permission amendment:** Restore/rehearsal preparation must provision the two NOLOGIN capability/locking roles and separate operator/runtime logins, replay all ten migrations under the intended object owner, then verify the 54 targeted policies, exact column/function/default privileges and operator-only ledger. Restore role ownership deliberately; never run application traffic with the restore credential or copy production candidates into disposable verification. B1's fresh synthetic replay is not a recovery rehearsal.

## B4A current Neon recovery strategy (2026-09-30)

This section is current; the original Supabase provisional policy below remains historical. B4A authorises only repository preparation and **synthetic disposable** logical recovery. It performs no production export/migration/restore or Neon provider action. See [B4A evidence](../implementation/phase-b4a-production-infrastructure-readiness.md) and [release/incident runbook](production-release.md).

**Mechanisms:** encrypted operator logical custom-format pg_dump via the Neon direct endpoint, separately controlled offsite storage and keys, plus Neon provider history-window/instant-restore where the actual selected plan/configuration supports it. Record actual project/region/PG version/plan/history window and restore permissions before relying on PITR. Do not assume a Free/paid plan's current defaults, retention depth, availability or endpoint reconnection behavior. Provider PITR is additional protection, not a substitute for independent backup/rehearsal.

**Cadence/retention proposal:** retain the earlier provisional 24-hour logical export cadence, extra pre/post migration copies, 14 daily and three month-end exports, subject to named business/legal approval and verified deletion/monitoring. Worst-case logical RPO approaches 24 hours plus any missed export interval; provider-history RPO depends on actual available restore point. RTO is not promised: measure dump, provisioning, restore, role repair, security validation, external reconciliation, app reconnect and deputy response. The local timed synthetic run is not a production or Neon RTO.

**Owners:** business owner accepts RPO/RTO/cost; technical operator configures/verifies export/restore/alerts; deputy independently proves key/storage/role/runbook access; privacy owner approves backup expiry and erasure replay. Names/deputy and an on-call failure escalation are required before production data. Export failure or empty/unverified artifact means no valid backup, with notification to the named owner.

**Credential/tool boundary:** compatible PG17 pg_dump/pg_restore, direct operator identity only, never runtime owner elevation. Use an owner-protected PGSERVICEFILE/PGPASSFILE service configuration for native tools, no DSN/password arguments or shell history. DIRECT_URL is privately injected only for Prisma/read-only operator tooling. pg_dump --format=custom --dbname=service=pyramid-backup --file=<controlled temporary path> must capture exit status, nonzero artifact, timestamp, release/migration version and checksum. Encrypt immediately using approved tooling/key management before leaving the controlled workspace; verify encrypted checksum and expiry, remove plaintext through the approved storage process. B4's synthetic archive contains no production data and is not encryption/escrow acceptance.

**Restore target:** new isolated Neon branch/project/database for later provider rehearsal, or fresh loopback PostgreSQL 17 for offline logical tests. No production traffic/provider credentials/scheduler. Restore preserves application data, history/checksums, RLS/policies/column/function/default ACLs, immutable evidence, idempotency/send intent and durable jobs. Company Supabase Auth identities/factors/configuration, Hostinger manifests/logs, Google file bytes/root permissions, email provider message/bounce history and secrets are outside the DB dump.

### Rehearsed logical restore procedure

1. Prepare the exact reviewed restricted NOLOGIN capability/locking roles and separate operator/runtime logins. Restore under an authorised operator with membership sufficient for the fixed locking role; never start the application under that operator. In an isolated target keep all production capability gates false.
2. Verify source/dump identity/checksum/tool/version, ensure the target is **new and empty**, then pg_restore --exit-on-error --no-owner --username=<restore operator> --dbname=<isolated target> <approved archive>. Local harness performs actual custom-format export and restore, not a second migration replay labelled restore.
3. In one operator transaction, grant CREATE on pyramid_private to pyramid_reference_locker temporarily, transfer only pyramid_private.lock_reference(text,uuid) to that restricted role, revoke CREATE immediately, and revoke database CREATE/TEMP from PUBLIC/anon/authenticated/pyramid_runtime/pyramid_reference_locker. Verify restored object/default/column/function ACLs instead of assuming dump restores database-level restrictions. No broad permanent grants.
4. Run both read-only checker identities: full finished migration/checksum history, RLS/capability/browser grants/default ACL/locking-definition ownership and catalog fingerprint. Compare synthetic sample/domain/evidence projections/counts without exporting contact/answers. Run restored B1 restricted positive/negative/concurrency/evidence suite only against synthetic targets, never production.
5. A live provider rehearsal additionally proves account plan/history-window restoration, target endpoint/TLS/runtime login/ownership and deputy-run time. It must be separately authorised and recorded. No such result is claimed here.
6. Before any recovered candidate data is visible, reconcile deletions since the chosen backup against a separately controlled erasure/incident ledger and external Google/provider evidence. Do not resurrect permanently erased Drive files or use a recovered stale send intent to resend email. Expired/ambiguous records remain closed for manual review. Production note erasure and talent/employment policy are unresolved; stop exposure where policy cannot be proved.
7. Recreate only synthetic Auth subject mappings for routine tests. Production Auth restore/reconnection requires its own provider/private identity procedure; do not duplicate real staff credentials or factors into test.
8. Following explicit owner recovery/cutover approval, install only the validated restricted runtime DATABASE_URL for the restored target in protected host config, restart/drain old pools, verify actual role/target/readiness and closed application smoke. Keep operator credentials out of runtime. Record elapsed recovery/RPO, failed steps, provider/external reconciliation and decision; gates open only after independent activation approval.

### Local execution and evidence

With an authorised fresh loopback PostgreSQL 17 fixture on port 55442, Node 22.22.0, no .env/.env.local and B4_DISPOSABLE_ADMIN_URL/B4_EVIDENCE_DIRECTORY injected locally:

```text
node scripts/run-phase-b4-disposable.mjs
```

The harness refuses remote/nonfixture targets, creates fresh source/restore identities/databases, installs all 11 migrations only in the source, seeds synthetic data, performs real pg_dump/pg_restore, repairs the two demonstrated restore prerequisites and verifies restricted workflows/fault rejection. It never reads production/provider credentials. Contract regeneration via --record-contract is for reviewed fresh synthetic source changes only; never rebaseline production drift.

The final synthetic restore/verification elapsed time, archive size/SHA-256, status and fault checks are in pyramid-b4-evidence/b4-summary.json; restored B1 permissions pass 2,092 checks. The elapsed time includes restored security testing and is not production RTO. In-memory local passwords are not saved or printed. Disposable fixtures and the loopback-only container may be retained for review; remove only under separately scoped cleanup.

**RESTORE REHEARSAL: LOCAL SYNTHETIC PASS. NEON PROVIDER BACKUP/RESTORE: OWNER CONFIG/ACCEPTANCE REQUIRED.**

**Historical status:** **PROVISIONAL OWNER/OPERATIONS POLICY**
**Date:** 2026-08-27
**Scope:** Minimum £0 logical backup and recovery process for the Pyramid Designs Supabase Free PostgreSQL database. No automation or provider resource is created by this document.

## Purpose and limitations

Supabase Free is the approved initial low-volume PostgreSQL/Auth provider. It does not provide the recovery depth of a paid production database: no point-in-time recovery is assumed, provider-managed automatic database backups are not relied upon, capacity is constrained and an inactive free project may be paused.

A logical export reduces data-loss risk but does not provide zero RPO, instant failover, guaranteed availability or byte-for-byte recovery of every external service. Google Drive candidate-file bytes, Hostinger configuration, SMTP configuration and secret values are outside the database export and require separate ownership/reconciliation.

## Responsibilities

- **TECHNICAL OWNER:** runs/validates exports, protects keys, performs restore tests and records evidence.
- **RECOVERY DEPUTY:** can access the approved backup location/key through controlled recovery and can execute the runbook if the owner is unavailable.
- **BUSINESS OWNER:** accepts the provisional RPO/RTO and approves paid escalation when the limits are unacceptable.
- **LEGAL/PRIVACY REVIEW:** approves retention/deletion treatment, including how restored data and expired backups are handled.

Named individuals must be assigned before production candidate intake.

## Backup content

Logical exports must cover the application-owned PostgreSQL schemas, migrations/history and data required to restore:

- staff identity mappings, status and application roles;
- public content, jobs and publication state;
- applications, answers and candidate contact snapshots;
- candidate-file metadata and Drive references, not file bytes;
- file-security reviews and current security projections;
- consent definitions, candidate consent records and effective versions;
- retention-policy definitions, expiry and deletion state;
- application/hiring status history and internal notes;
- append-only audit events;
- background jobs, idempotency records required for safe recovery and reconciliation state.

Supabase Auth configuration and users require separate documented recovery. A restore test may recreate synthetic Auth users and bind them to restored `StaffUser.supabaseUserId` values. Never copy real production identities into routine development.

## Logical export approach

Use a current supported PostgreSQL logical export tool compatible with the Supabase PostgreSQL version, normally `pg_dump` or the Supabase CLI database dump workflow. Produce schema and data artifacts sufficient for an ordered restore. Record the exact tool/version and command in the restricted operations ledger when the process is implemented.

The production database connection and backup passphrase remain secret-manager values. They are never embedded in scripts, shell history, filenames, documentation, tickets or chat.

Before treating a dump as complete:

- the command exits successfully;
- the artifact exists and has non-zero size;
- a SHA-256 checksum is recorded;
- the artifact is encrypted before leaving the controlled working directory;
- the unencrypted temporary artifact is removed;
- the ledger records source project identifier, UTC timestamp, schema/version, tool version, checksum, operator and retention expiry without candidate PII.

## Provisional cadence and retention

While production candidate intake is enabled:

- create one encrypted logical export every 24 hours;
- create an additional export immediately before and after each production migration or material data repair;
- retain the latest 14 daily exports;
- retain 3 month-end exports;
- delete expired backup artifacts through the controlled storage process and record completion.

This is a provisional low-volume balance. It implies a worst-case database RPO near 24 hours between successful exports. The business owner must approve that risk before intake. Move to a paid managed backup/PITR tier when a shorter RPO, automated verification, longer retention or stronger availability is required.

## Encryption, storage and access

- Encrypt each artifact with an approved maintained encryption tool using modern authenticated encryption.
- Keep the encryption key/passphrase in the company password/secret manager, separate from the backup files.
- Store at least one encrypted copy in company-controlled storage separate from the production Supabase project and separate from the recruitment Google Drive account/root folder.
- A second encrypted copy on an already-owned, company-controlled, access-restricted medium/location is recommended where it does not add recurring cost.
- Do not place database backups in the candidate recruitment Drive hierarchy.
- Do not store backup files on personal accounts, developer laptops as the only copy, public links or general shared folders.
- Limit access to the technical owner and recovery deputy. Review access at least quarterly and on staff departure/role change.
- Backup filenames use project/environment/date identifiers only, never candidate names or counts.

## Restore procedure

1. Declare the restore purpose and select an isolated non-production Supabase/PostgreSQL target.
2. Confirm the target contains no production or real candidate data and cannot send live email or access production Drive credentials.
3. Obtain the selected encrypted artifact and verify its recorded SHA-256 before decryption.
4. Record tool versions and the source/target database versions.
5. Restore schema/migration state in the documented order.
6. Restore application data.
7. Run constraints and invariant checks before enabling any application process.
8. Recreate only synthetic Supabase Auth users needed for the test and validate their restored local staff mappings/roles.
9. Verify authorization-critical records, consent versions, retention policies, expiry/deletion state, background jobs and candidate metadata/file references.
10. Keep candidate-file retrieval disabled. Reconcile Drive references using synthetic fixtures only.
11. Replay due retention/deletion work before exposing restored data to any reviewer role.
12. Run role/authorization tests, including disabled user, cross-role, cross-row and uncleared-file denial.
13. Record results and reviewer sign-off.
14. Destroy the isolated restore environment and any decrypted artifacts according to the approved test-data cleanup process.

Production disaster recovery follows the same isolation-first principle. A restored production candidate system must not reopen to staff or public intake until retention/deletion replay, authorization tests, Drive reconciliation and owner approval pass.

## Synthetic restore-test requirement

Complete a restore exercise before production launch, then at least quarterly and after material schema/auth/retention changes.

Synthetic fixtures must demonstrate:

- schema restoration and migration history consistency;
- public-content and job state restoration;
- active/disabled staff mappings and fixed role assignments;
- consent definitions, immutable versions and accepted/rejected decisions;
- retention-policy versions, expiry timestamps and deletion requests;
- queued/running/dead background-job integrity and duplicate-safe recovery;
- candidate application metadata, file hashes/security states and synthetic Drive references;
- no ordinary reviewer access to uncleared or deletion-pending files;
- expired/deleted records remain unavailable after restore.

Do not use real candidate data for development or routine restore testing.

## Expected evidence

The restricted operations ledger records:

- test date and operators;
- source export ID/date and encrypted artifact checksum;
- target environment identifier;
- PostgreSQL/Supabase/tool versions;
- restore start/end times;
- schema/migration result;
- table row-count and invariant summary using synthetic identifiers;
- staff authorization test result;
- consent/retention/deletion result;
- background-job result;
- candidate-file reference reconciliation result;
- cleanup completion;
- deviations, owner and due date;
- final technical-owner/reviewer sign-off.

Screenshots containing secrets, candidate data or connection strings are prohibited.

## Recovery limitations and escalation triggers

The £0 process remains manual and may fail through missed cadence, corrupt exports, lost keys, operator unavailability or provider outage. It cannot restore database changes after the latest successful export and does not independently restore Google Drive bytes or Supabase Auth operational configuration.

Escalate to an owner-approved paid database/recovery plan when any of these is true:

- a near-24-hour RPO is unacceptable;
- an export is missed or restore test fails;
- data volume or operational load makes daily manual export unreliable;
- production availability/pause behaviour causes an incident;
- legal, contractual or security review requires PITR, longer retention or automated backups;
- the technical owner/recovery deputy cannot sustain the process;
- candidate volume or business reliance materially increases.

## Incident recovery rule

Never restore directly over the only available production database as the first recovery action. Restore into isolation, validate, reconcile retention/deletion and Drive state, then follow an approved cutover plan. No email, candidate receipt or hiring access is authoritative until the restored PostgreSQL state is verified.

## Official references reviewed

- [Supabase database backups](https://supabase.com/docs/guides/platform/backups)
- [Supabase TOTP MFA](https://supabase.com/docs/guides/auth/auth-mfa/totp)
- [Supabase connection pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Supabase available regions](https://supabase.com/docs/guides/platform/regions)

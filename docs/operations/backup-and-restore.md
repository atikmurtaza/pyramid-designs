# Supabase Backup and Restore Policy

**Status:** **PROVISIONAL OWNER/OPERATIONS POLICY**
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

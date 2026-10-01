# Phase B4B1-S2F: recovery and maintenance freeze preparation

Owner instruction: October 1, 2026. Recovery operator: Atik Murtaza, owner-approved single-operator model. The preceding maintenance window expired. S2F authorizes encrypted recovery preparation and local freeze-patch verification, and stops before deployment, production database freeze mutations or S2 migrations.

## Recovery and drift result

Fresh read-only Supabase metadata still identifies Pyramid's Project / Pyramid Designs, `vimpcftbtbmezcrjzhfl`, ACTIVE_HEALTHY, PostgreSQL 17.6. All eight application catalog facets, owners/RLS, relevant roles/memberships, ACL/defaults, migration ledger/checksums and aggregate table counts match S1/S2. The original eleven migration files remain unchanged. No runtime/locking role provisioning or permanent hardening has occurred.

Backup A PASS: application-scoped PostgreSQL 17.11 custom archive from a shared exported read-only snapshot, plus password-free role/catalog recovery metadata. Both were DPAPI CurrentUser encrypted before artifact persistence, outside Git and evidence. Read-back and independent isolated PostgreSQL 17 restore validation passed: 28 tables including the ledger, eight completed migrations, all aggregate counts, eight catalog facets, ownership/RLS and object ACL/public-default comparisons. An additional standalone recovery invocation reads only the encrypted artifacts and validates without production credentials/connectivity. Recovery containers have network disabled, no ports, tmpfs database storage and no application/provider processes; they are destroyed after validation.

Supabase CLI 2.119.0 help was reviewed. Its dump interface exposes no shared-snapshot flag. Official PostgreSQL pg_dump, which underlies the CLI, was used with an explicit `public` scope, authentic CA/verify-full environment configuration and no credential/DSN command arguments. Managed schemas, Auth identities/secrets, Storage objects and role passwords were excluded. Four managed-role NOLOGIN stubs preserved ACL receivers in recovery; managed role capabilities were not cloned. No custom Pyramid roles exist at this baseline. DPAPI binds recovery to Atik's profile and machine; it is not offsite or machine-loss recovery.

The frozen authoritative Backup B is NOT_RUN. Backup A never substitutes for B after production state changes.

## Writer topology and option assessment

Authenticated Hostinger observation still shows `main` at `999603ea1a35d55896dfef94841feb015f982ab8`, Node 22.x, Next.js, auto-deployment on. Environment names are `DATABASE_URL`, `COMPATIBILITY_PROBE_SECRET` and `CRON_SECRET`; their values remain masked. The current runtime database target and external scheduling are not proven. No pg_cron extension is installed in the observed Supabase project. Empty write-lock observations and no active worker leases do not prove a continuing freeze.

Writer paths include staff/admin server actions, candidate-file review and GET audit effects, the background worker/retention/deletion flow, cron/database probes and public intake. Production intake is closed in deployed source. The single pg pool/executor lives in `src/lib/server/database.ts`; the deployed source predates B4 capability switches.

- Option A unavailable: current official Hostinger Node.js FAQ has no supported Stop control. Restart resumes execution; GitHub disconnect preserves existing running files. Website/application/domain removal is forbidden. No platform control was applied.
- Option B selected and locally verified: an isolated `codex/s2f-maintenance-freeze` patch based exactly on deployed `999603ea1a35d55896dfef94841feb015f982ab8`. It is staged locally, uncommitted and unpushed. No unrelated B4 source changes are included.
- Option C not selected: B can safely supply the application control after authorization. No production database guard SQL was proposed or executed.

## Exact maintenance patch and release boundary

Patch SHA-256: `89e91f00ac8aec0fb6fc3246891ce6bec6735a9a621d6951ebdb28d769fe8e18`.

Four files: `src/lib/server/database-maintenance.ts`, `src/lib/server/database.ts`, `src/proxy.ts`, and `scripts/verify-database-maintenance.mjs`. Three production source files change; the fourth is one runnable synthetic verification script. No dependencies, migrations, Auth configuration, credentials or frontend components change.

`DATABASE_MAINTENANCE` defaults OFF when absent, empty or false. `true` activates it; unexpected nonempty values also freeze. Server proxy returns controlled, no-store 503 responses for unsafe methods and all API/staff/internal paths before Auth/handler execution. Public informational GETs retain normal behavior and Join CSP. Transactions fail before callbacks; standalone queries use a fixed-snapshot PostgreSQL READ ONLY transaction and extended protocol to accept only one statement, then discard the connection. This prevents SQL writes while permitting public reads. Existing Auth/MFA authorization remains in place when maintenance is off.

Local verification PASS: lint, typecheck, production build, ten SQL/read-only escape checks, all fourteen API routes plus staff/internal paths across seven HTTP methods, and seven public pages under both switch states. Testing used fresh schema-only synthetic PostgreSQL, never restored production content. Dependency/security audit remains FAIL: one high brace-expansion finding and one critical Next.js finding in the unchanged deployed lockfile. No waiver or B3 remediation is implied; local functional verification is not release acceptance.

Required next owner authorization must identify this exact base/patch, a fresh bounded maintenance window, and the permitted hotfix commit/push/deployment mechanism for the existing Hostinger site. The B4 branch is not the maintenance deployment source. Resolve the preserved security release blockers and privately prove the deployed runtime target/external writer topology before claiming freeze readiness. Preserve the previous immutable artifact and protected environment references; do not change the database credential or deploy migration hooks.

Only after authorization may an exact reviewed hotfix commit be released from its isolated branch, the existing Hostinger source/artifact be changed through the approved mechanism, and `DATABASE_MAINTENANCE=true` applied. Verify the deployed immutable SHA, switch consumption, replacement/draining of every older process/pool, all blocked writer paths, public GET behavior, lack of active leases and database-side aggregate observations. Unknown/uncontrolled writers or a failed rollout mean freeze FAIL, not permission to mutate the database or improvise a rollback that reopens writers.

After independently proven continuing freeze, refresh state, create distinct encrypted Backup B, independently validate B and return for final bounded S2 migration authorization. Do not start migrations 9/11, the B1 Supabase forward adaptation, roles/grants or hardening under S2F. Freeze removal, production recovery and any later deployment remain separate owner decisions.

## Evidence and repository policy

Protected S2F receipts include drift, authentic CA/operator TLS, encrypted Backup A, standalone operator recovery, writer topology, Option A, patch identity, synthetic tests and quality/security results. They contain metadata/aggregate evidence only; encrypted backup artifacts and secrets stay outside Git/evidence. Prior S1/S2 records remain unchanged.

This B4 documentation release corrects the active [production sequence](../operations/production-release.md) and [recovery policy](../operations/backup-and-restore.md), retaining historical text. Commit `docs: establish Supabase maintenance recovery controls` and push only `phase/b4-production-readiness`, which is not Hostinger's tracked `main` branch. The maintenance application patch stays isolated pending exact release authorization; no main merge, deployment, Neon calls or B3 access occurs.

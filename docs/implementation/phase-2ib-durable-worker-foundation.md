# Phase 2I-B: Durable worker, reconciliation and retention foundation

## Scope and baseline

Owner-approved Phase 2I-B implementation, including the subsequent deleted-file migration interpretation. Starting branch `main`, HEAD/tracking/remote `5e9b78f9c91c431aa6cab00db633d74642ab0e3a`, subject `feat: add candidate file security foundation`; clean worktree, empty staging and eight applied migrations with matching checksums. The Phase 2I-A assessment was supplied through the owner's Production Website Plan Review task attachment; the durable implementation decisions are recorded here and in ADR 0013.

Real intake stays closed. No email, challenge, trusted-client-IP, Hostinger scheduler, production migration, deployment or DNS work is authorized by this record. No dependencies were added to the application.

## Migration and truthful tombstones

`20260907000000_phase_2ib_completed_retention_tombstones` changes only deletion-related checks/functions/triggers around existing Application, CandidateFile and evidence rows. All eight historical migrations are unchanged; no tables, columns, enums, public grants, RLS policies or SECURITY DEFINER functions are added.

The state-machine specification makes technical file state and security disposition separate dimensions, and immutable reviews preserve history. Accordingly, a DELETED file retains its truthful prior security status, validation status, clearance method/time and FileSecurityReview history. It is not current cleared content. Existing staff boundaries require QUARANTINED content, unexpired retention and no pending/completed deletion. Deleted files cannot regain their identity/hash, be re-reviewed or count toward ordinary submission evidence.

The exception requires the whole final combination: due application, separately established deletion responsibility, unchanged historical technical/hiring/submission state, exact successful retention job with fixed semantic identity/payload and consumed claim, append-only start/completion audit evidence, erased application personal fields and answers, and every file deleted with erased current identity/hash plus storage-verification and deletion audit evidence tied to the same job. A status, timestamp, expiry, security field or unrelated job alone does not qualify. Initial insertion as a tombstone is rejected. Before retention responsibility begins, all ordinary live submission evidence must pass, including when submission and deletion are attempted inside a savepoint. Retention cannot make a newly submitted application valid without actual clearance. Once deletion starts, application lifecycle and policy/expiry are frozen. Tombstones and their successful job evidence are irreversible.

The start/complete timestamps distinguish responsibility from completion using the existing schema. Application/file/job changes use deferred final-state validation and a final immediate check in the completion transaction. Immediate and deferred ordinary submission checks remain enforced. Exact parent locks precede answer/review insertion checks, preventing late writes racing deletion.

Erased application fields: fullName, email, city, phoneOrWhatsApp, specialism, portfolioUrl, professionalUrl, availabilityText, remoteAvailable, shortIntroduction, preferredEngagement, freelancerRateMinMinor, freelancerRateMaxMinor, rateCurrency and safeCampaignCode. Accommodation-contact indication becomes false; answers are deleted. Non-null free-text experienceLevel and source become empty strings (zero personal content, not invented replacement values). File driveFileId, driveZoneCode and current contentHash become null. The opaque generated filename and required non-personal file shape remain.

Retained evidence: opaque application/reference and relationships, type/engagement, historical technical/hiring status and timestamps, policy version, immutable consent, status history, audit and security reviews (including their historical digest). This does not assert that these records are legally anonymous or establish a production retention duration. Final legal treatment of historical digests, consent/audit and potential indirect identifiers remains unresolved. Therefore production erasure is unavailable; the executable verification policy is exactly the existing `SYNTHETIC_JOB_APPLICATION` / `phase-2b-fixture-v1` policy with explicit synthetic sources in development/test. No runtime flag enables production deletion or real intake.

PostgreSQL validates domain evidence, not external Google facts. The trusted, server-only handler is responsible for establishing those facts. A database owner capable of fabricating all audit/job/domain evidence or disabling triggers remains outside the application authorization boundary; a dedicated least-privilege production identity is still required.

## Job lifecycle, retry and evidence

The existing repository now supports exact-work dedupe comparison, database-time claims, post-lock lease/token validation, transactional completion, allowlisted safe failure classifications, bounded retry, DEAD and exhausted-crash recovery. An expired worker cannot acknowledge after waiting for another transaction's row lock. Wrong and reclaimed tokens fail. Retry/dead operations return an explicit unsuccessful ownership result rather than silently acknowledging.

Default five attempts, maximum ten accepted attempts, deterministic exponential retry from 60 seconds to one hour. The fixed failure summaries never persist raw exceptions. Unsupported jobs/payloads are terminal. Audit stores invocation start/completion, claims, retries/dead and exhausted recovery; domain handlers append storage/deletion evidence atomically with result state. Responses/logs contain only opaque correlation IDs, classifications and aggregate counts/backlog age. No claim tokens, provider IDs/URLs, original filenames, candidate fields or secrets are emitted.

## Upload/reconciliation and external deletion

Uploader reservation claims the reconciliation row in its transaction. Retry before lease expiry fails; retry/recovery after expiry obtains a new token. A successful upload finalizes quarantine/security-pending and job acknowledgement together. An already successful same-work upload retry performs no second write.

Reconciliation uses only the job's exact CandidateFile FK and its authoritative stored identity/name/digest/size. It verifies private root and owner-only permissions, object identity, name, size and digest, then rechecks DB version/state before quarantine finalization. Missing/delayed objects remain pending and retryable; mismatch or unauthorized state fails closed. No orphan deletion is inferred from missing uploads. UPLOAD_PENDING retention remains unavailable until separately reconciled, so an upload that might complete late is not deleted prematurely.

Retention locks/validates the due application and exact file, requires successful upload/reconciliation, then records responsibility before external work. A pending file is frozen and inaccessible. External metadata/private-root verification is followed by a short fenced transaction recording verification intent. Deletion re-verifies identity and uses the verified strong ETag as an `If-Match` precondition, then verifies 404 absence and root privacy. Missing ETag fails closed. Provider conditional-delete support and concurrent permission changes require live acceptance; no live Google request was performed for this phase.

An initially missing object without prior verified deletion intent stays unresolved. Once intent is durably established against the frozen identity, an already-absent object can converge after external success/DB failure. Only established external deletion permits the final file/application erasure, completion audit and valid token/lease acknowledgement transaction. No withdrawal or security downgrade is manufactured.

## Trigger and resource bounds

`POST /api/internal/worker`: dynamic Node route, empty body, no query commands, minimum 32-character server CRON_SECRET, constant-time comparison, authentication before DB access, private/no-store, generic unauthorized/unavailable responses. Deploy behind verified HTTPS; forwarded headers are not trusted for security decisions. The diagnostic cron-probe route retains its semantics. No secret was rotated or scheduler configured.

One durable admission record, at most one admitted invocation per 60 seconds, checked in every transaction. No process-local concurrency guarantee. At most five sequential claims, five exhausted recoveries and five due-retention enqueues per invocation. Shared 20-second work deadline; stop claiming without 10-second external and three-second finalization allowance. Existing pool maximum remains three; no connection is held over Google I/O. Worker transactions bound lock/statement waits, and check the remaining overall work deadline before/after queries. A delayed connection acquisition can delay the response but cannot start domain work after deadline. Platform request termination is a separate Hostinger gate.

## Threat model and limitations

Controls cover secret/auth bypass, authenticated replay, overlap, payload/dispatch poisoning, arbitrary SQL/URL/Drive IDs, stale tokens, expired leases after lock waits, duplicate effects, retry storms, upload/worker and retention/insert races, forged tombstones, reanimation, BOLA and data leakage. Parameterized exact-ID SQL and existing staff authorization remain authoritative. Short lock waits can cause safe retries instead of blocking capacity indefinitely.

No automatic operational reopening of DEAD jobs is exposed. Operators need an approved reconciliation procedure and alert channel for dead/old backlog, missing scheduler completion and pending deletion. Safety work has no email traffic competing for capacity in this phase. A future larger workload may require measured queue/admission tuning; no Hostinger resource limits are claimed.

## Verification

All schema-changing verification uses a new empty, loopback-only disposable PostgreSQL database. `scripts/replay-phase-2ib-migrations.mjs` requires an explicit `PHASE2IB_TEST_DATABASE_URL` with a `phase2ib_` database name, refuses nonempty databases, replays every migration and verifies RLS/effective grants/functions. It never reads `.env.local` or resets a configured database. `scripts/verify-phase-2ib-worker.mjs` similarly requires that disposable URL before committing synthetic fixtures.

Focused evidence covers real concurrent connections/SKIP LOCKED, wrong/stale/expired claims, lock-only blockers outliving leases, retry/backoff/cap/exhaustion/crash recovery, same/conflicting dedupe, fixed dispatch, cron rejection before DB calls, aggregate output, durable overlapping admission, both real handlers through the dispatcher, upload ownership and delayed same-ID recovery, no clearance manufacturing, active/deleted/portfolio invariants, immutable history, denied downloads/reviews/reanimation, pending deletion/Drive failures, external success/DB rollback, lease loss/reclaim, initial absence, root/permission/digest/identity mismatch, and concurrent late answer/review insertion. Offline fetch tests exercise the actual Google adapter, including missing ETag, failed precondition after revision change, absence/root checks and cancellation.

Regression includes Phase 2B–2H, Prisma validation/status against replay, lint/typecheck/build/post-build typecheck, production dependency audit, closed-intake production smoke and canonical logo hash. Phase 2H now expects RUNNING uploader ownership after ambiguous failure and proves retry is fenced until lease expiry. Phase 2G accepts PostgreSQL 18's specific RESTRICT SQLSTATE 23001 alongside older 23503; deletion remains rejected.

Observed local verification on 2026-09-07:

| Check | Result |
| --- | --- |
| Clean replay | 9/9 migrations, PostgreSQL 18.4 portable disposable runtime |
| Database security | 28/28 RLS; zero public policies, prohibited effective table privileges or callable application functions |
| Focused Phase 2I-B | 431 checks, including actual concurrent database connections and offline Google HTTP boundary tests |
| Phase 2B / 2C / 2D / 2E / 2F | All existing success markers passed |
| Phase 2G | 83 checks; rollback verified |
| Phase 2H | 291 checks; rollback verified (includes adapter assertions) |
| Prisma validation / migration status | Passed against the replay database |
| Lint / typecheck / production build / post-build typecheck | Passed |
| Production dependency audit | Zero vulnerabilities |
| Production smoke | 31 checks; 92 client files scanned; empty worker POST accepted, replay bounded, intake closed |
| Canonical logo SHA-256 | `2C5D2042EF020AA7AD37FF92E6FD9C3407EF305102EE49DA3B6900FF99FFE60C` unchanged |

Docker was unavailable; a portable PostgreSQL runtime was downloaded into ignored `tmp`, with no package dependency change. Each replay created a new empty database, never reset a configured database. The configured development/production-like database remains on its original eight migrations; this ninth migration was applied only in disposable tests. A final independent diff review found no remaining blocking defect after the lease-lock, late-insert, deadline and conditional-delete corrections. The overly broad prior-commit claim was removed and replaced by a savepoint test proving actual clearance remains required.

The Windows sandbox required explicit tool approvals for remote Git verification, cache/network access and starting the disposable server. These environment permissions do not authorize production actions. Final release SHA and push synchronization are reported after release. This record does not claim live-provider, scheduler or production readiness.

## Remaining production gates and phase boundary

Email provider selection/verification; Phase 2I-C candidate confirmation at successful SUBMITTED; optional staff notification decision; Phase 2I-D abuse controls; trusted Hostinger proxy/IP; challenge decision; Hostinger scheduler and runtime/resource acceptance; conditional Drive deletion and reconciliation/retention rehearsal; Defender/manual review rehearsal; real-device/browser acceptance; dedicated least-privilege production DB identity; production Supabase Auth/MFA/recovery/ownership; legal/privacy/retention treatment; diagnostic/synthetic cleanup; production credentials; separately approved production migrations, real intake activation and deployment. Phase 2I-C/2I-D, SMTP, Turnstile, trusted-IP, scheduler setup, production migration, deployment and DNS remain unstarted.

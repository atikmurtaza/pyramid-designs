# ADR 0013: PostgreSQL-backed background jobs

**Status:** Accepted

## Context

The approved Hostinger-first architecture has one UTC cron facility, modest expected workload, and no initial managed queue or Redis. Email retry, retention/deletion, stale-submission cleanup, and Drive reconciliation still require durable, concurrent-safe, idempotent processing.

## Decision

Use one PostgreSQL `BackgroundJob` table and a protected Hostinger cron-triggered worker route. Claim a bounded batch transactionally with `FOR UPDATE SKIP LOCKED` or an equivalent atomic lease, use claim tokens and bounded retries, and keep handlers idempotent. Payloads contain only opaque references and safe operational options; PostgreSQL business records remain the source of truth.

## Consequences

- No Redis, managed queue, or long-running worker is required initially.
- Overlapping cron invocations remain safe through leases, unique dedupe/idempotency controls, and business-state checks.
- Dead jobs require owned alerting and reconciliation.
- Adopt a managed queue only when measured backlog, concurrency, latency, or Hostinger execution limits make this design insufficient.

## Phase 2I-B execution and ownership

The existing job row is the transactional outbox and ownership record. Claim one job immediately before execution. Completion and classified retry/dead transitions lock the exact row, then check RUNNING, the current random claim token, and PostgreSQL `clock_timestamp()` lease expiry. Lock acquisition is not itself proof that the lease remains valid. Domain finalization, append-only result evidence and acknowledgement commit together. External operations occur between short transactions.

Retryable transient failures use deterministic exponential backoff: 60, 120, 240 seconds, doubling to a 3,600-second cap, with at most ten permitted attempts (five by default). Deterministic delay is chosen instead of jitter for this conservative single-invocation admission profile. Configuration, security, unsupported payload and terminal domain failures become DEAD. Expired final-attempt claims are terminalized by a bounded SKIP LOCKED sweep. Earlier failure classifications remain in append-only audit events when the current job projection is cleared by a later claim.

Dispatch is fixed to candidate-file reconciliation and application retention deletion; subject FKs and exact payload shapes are validated. A dedupe collision reuses a job only when type, subject, reference and JSON semantic payload agree. Neither an arbitrary Drive identifier nor a destination is a dispatch parameter.

Uploads claim the same reconciliation row before their external write and acknowledge it with the claim token. A failed/ambiguous upload retains its lease until expiry. Recovery uses the same reserved object identity; missing content is retryable and is never deletion authority. Reconciliation cannot clear malware, create security reviews or submit an application.

The separate `/api/internal/worker` POST trigger preserves the diagnostic cron probe. A single fixed `IdempotencyRecord` provides database-backed admission, renewed no more than once per 60 seconds. Its token/expiry is checked inside each worker transaction. This deliberately serializes normal invocations and bounds authenticated replay; it is not an exactly-once scheduler event. Workers have a shared 20-second work deadline, a maximum of five jobs, 60-second job leases, a 10-second external budget and a three-second finalization reserve. Pool acquisition/transport teardown may delay the HTTP response; after the work deadline, no further commands or external effects start. These are conservative implementation bounds, not measured Hostinger limits.

Executable retention currently accepts only the explicit existing synthetic test policy in development/test. Production policy remains unavailable until legal retention and immutable-evidence treatment are approved. Conditional Drive deletion must receive a strong revision ETag and sends `If-Match`; missing precondition support fails closed. Actual provider behavior, permission drift and scheduler/runtime acceptance require separately authorized live rehearsal.

Future candidate confirmation enqueue belongs to Phase 2I-C and is triggered by the successful SUBMITTED transition. Upload/quarantine is not that semantic event. No email delivery, provider or templates are implemented here.

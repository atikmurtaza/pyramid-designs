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

## Phase 2I-C1 transactional notifications

Candidate confirmation uses the same BackgroundJob outbox, enqueued in the transaction that reaches SUBMITTED (file-free creation or valid cleared-file completion). Upload/quarantine does not qualify. Dispatch additionally allowlists CANDIDATE_SUBMISSION_NOTIFICATION. No schema or dependency change is required.

Logical identity is SHA-256 over the fixed Pyramid Designs domain, explicit NODE_ENV, exact application UUID, submission event and candidate recipient slot. It excludes recipient contact and template version. The unique dedupe key and exact payload comparison reject conflicting work, including an attempted version change under an existing semantic identity. An immutable scheduling audit seal binds job, event, version and identity; the worker rejects a self-consistent poisoned payload without its matching seal.

A short ownership- and application-locked transaction reloads minimal authoritative state/contact, validates applicability, and commits an append-only send intent before invoking an adapter without a database connection. Only an established acceptance permits SUCCEEDED; it never proves inbox delivery or engagement. C1 acceptance is explicitly synthetic in audit. Definitive non-acceptance resolution commits with bounded retry or terminal state. Any unresolved intent blocks automatic resend across crash, timeout, lease reclaim or acknowledgement rollback. The existing DEAD state and safe EMAIL_AMBIGUOUS classification require manual reconciliation; no reopening API is introduced.

Retention defers while a notification claim is active and fails closed pending reconciliation if an unsuccessful notification has unresolved send intent. Both handlers serialize admission on the application lock. A deadline bounds worker waiting, not a remote effect: an adapter must observe cancellation before transmission and after asynchronous preparation; already transmitted uncertainty cannot be retracted. A chosen provider's idempotency, cancellation and acceptance reconciliation behavior must be verified in C2 before real sending or operational reconciliation is enabled.

Production email is explicitly unavailable until C2. Only NODE_ENV=test may execute an explicitly injected, offline synthetic adapter; the worker default is unavailable in every environment. Templates are fixed, versioned plain text without candidate interpolation or links. Provider choice, sender/configuration, concrete adapter and live synthetic verification remain separate owner gates.

## Phase 2I-C2B Resend integration

The owner-approved C2B implementation selects Resend explicitly, using native server-side fetch and the existing identity as Idempotency-Key. Fixed sender/Reply-To and existing plain-text templates are validated against configuration. A keyed commitment in durable send intent binds the exact request and key/account context without persisting contact or content. Only bounded, validated provider acceptance with an opaque receipt permits atomic `NOTIFICATION_PROVIDER_ACCEPTED` evidence and fenced completion. Synthetic evidence remains separate. Missing/invalid configuration fails closed; test workers require explicit adapter injection. No schema, dependency, webhook or staff-email change is required.

Resend retains same-request idempotency for 24 hours; this is not exactly-once delivery. C1 ambiguity remains authoritative. The minimum explicit local reconciliation path is restricted to a settled accepted call whose database acknowledgement failed, using an opaque one-use same-process permit. It requires the original durable unresolved intent, identical identity/request/key context, current application/retention eligibility, no competing active claim, unchanged attempt bounds and a conservative cutoff below 23 hours from the earliest intent. Crashed processes, unsettled calls, expired windows, missing request seals and drift remain manual. This is not general crash recovery or an automatic retry mechanism. No public replay endpoint exists.

See [C2B implementation and verification](../../implementation/phase-2ic2b-resend-adapter-verification.md) for the fixed identities, private configuration contract, provider references, failure mapping, bounds, offline checks and successful bounded live verification (one logical email, one identical replay, same validated receipt). Mailbox delivery remains unverified. These changes do not authorize deployment or real intake.

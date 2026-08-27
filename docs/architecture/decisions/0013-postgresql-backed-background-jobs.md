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

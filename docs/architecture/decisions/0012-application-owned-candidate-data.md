# ADR 0012: Application-owned candidate data

**Status:** Accepted

## Context

Candidates have no accounts in MVP. Job applications and talent-network submissions have separate purpose, consent, retention, answers, and hiring history. Email or phone equality is not reliable identity proof, and automatic matching would increase privacy, deletion, and accidental-disclosure risk.

## Decision

Do not create a reusable `Candidate` person table in MVP. Each `Application` owns its candidate contact snapshot and is either a `JOB_APPLICATION` tied to an immutable job ID or a `TALENT_NETWORK` submission with a required engagement type. Retry protection uses scoped idempotency and transactions, never email/phone matching. No application records are automatically merged or linked.

## Consequences

- Deletion and retention remain purpose-specific and easier to reason about.
- A person applying twice creates two independent application records by design.
- Staff receive no inferred cross-application identity view.
- Add a reusable candidate identity only after a separately approved requirement defines candidate authentication or explicit consent for cross-application linking.

# Pyramid Designs Threat Model

**Status:** Proposed — Phase 0C, 2026-08-27
**Scope:** Public portfolio/careers site, staff administration and private candidate-data flow. Trust boundaries and data classes are defined in [system architecture](../architecture/system-architecture.md).

## Scope and protected assets

Protected assets: staff identities/sessions, authorization decisions, private CV/document objects, candidate contact data/answers, internal notes, consent/retention records, audit integrity, public content, secrets, availability and reputation. Candidate documents/secrets are **RESTRICTED**; candidate records/notes are **CONFIDENTIAL**.

## Threat register

| Priority | Threat, asset and vector | Prevention | Detection/recovery | Residual risk / requirement |
| --- | --- | --- | --- | --- |
| P0 | Private CV exposure through object access, BOLA/IDOR or permanent URL | Private storage, random keys, clean-state gate, per-request server policy, short expiry; no public paths. | Audit success/denial; revoke sessions/links, investigate, rotate credentials, follow approved incident process. | Staff/provider compromise remains possible (SEC-001, SEC-002, PRIV-005). |
| P0 | Malware, polyglot, MIME spoof, archive bomb or scanner bypass | Allowlists/size limits, magic-byte/MIME validation, quarantine, scanning, no active inline render, fail closed. | Scan-job alerts; retain quarantine, retry/escalate/delete safely. | Scanner coverage is imperfect; types/limits/SLA **PROVISIONAL** (SEC-003). |
| P0 | Staff account takeover or privilege escalation | MFA, secure/revocable sessions, default-deny roles, step-up actions, server policy. | Auth/role audit and anomaly alert; disable/revoke, review affected actions. | Identity-provider/operator risk (SEC-005). |
| P0 | PII in telemetry, email, URL, signed link or log | Allowlisted/redacted telemetry, opaque IDs only, receipts without attachment, no PII in URLs. | Review/purge where permitted, rotate exposed credentials/URLs, incident process. | Third-party misconfiguration must be verified (SEC-006, PRIV-003). |
| P0 | Retention/deletion failure, including restore | Versioned policy jobs, object/database deletion workflow, retry/alert, restore replay. | Reconcile deletion/audit; quarantine restored system until policy replay. | Backups may retain data until expiry; legal policy **PROVISIONAL** (PRIV-004, OPS-002). |
| P1 | Spam, bots, upload abuse or duplicate submission | Challenge, honeypot, timing, scoped limits, upload-intent limits, idempotency/deduplication. | Safe rate/challenge telemetry; decay controls and review patterns. | Shared IP false positives; no permanent IP blocks (SEC-004, FR-010). |
| P1 | Injection, stored XSS or malicious rich text | Server validation, parameterized access, strict rich-text allowlist/output encoding, CSP. | CSP/security signals; remove content, patch, rotate credentials. | Dependency/editor defects (SEC-007). |
| P1 | CSRF, session fixation or open redirect | SameSite secure cookies, CSRF/Origin checks, rotation, redirect allowlist. | Audit origins; revoke sessions and safely reverse changes. | Browser/identity edge cases. |
| P1 | CI, preview or provider compromise | Least privilege, isolated environments/secrets, protected production access, dependency/secret scanning. | Audit alerts; revoke tokens, rebuild trusted state, assess exposure. | Supply-chain/provider compromise (OPS-001, OPS-007). |
| P1 | Database/storage/queue/scanner/email/monitoring outage | Durable jobs, retries, timeouts, health checks, safe degradation; candidate flow closed. | Owned alerts/runbooks; never claim completion without durable state. | Provider outage; RPO/RTO **PROVISIONAL** (OPS-003, OPS-004). |
| P2 | CSP/header/SSRF/secret-exposure failure | Strict CSP/HSTS/nosniff/frame/permissions/referrer policy; outbound allowlist; server-only secrets. | CSP/error/dependency signals; revoke and remediate. | Future integration review required (SEC-005). |

## STRIDE coverage

- **Spoofing:** MFA, session rotation/revocation, staff-only accounts, authenticated worker callbacks.
- **Tampering:** server validation, transactions, append-only audit, object-version-bound upload intent.
- **Repudiation:** actor/action/opaque target/outcome audit records.
- **Information disclosure:** private storage, just-in-time downloads, telemetry/email/URL exclusions, preview isolation.
- **Denial of service:** layered abuse controls, quotas, backpressure, health monitoring and safe degradation.
- **Elevation of privilege:** default deny and target/state-aware server policy on each sensitive operation.

## Highest-priority implementation verification

1. Prove quarantine-to-clean gating and no public candidate-object route.
2. Test every staff role, BOLA/IDOR attempts and signed-link expiry.
3. Test clean, infected, spoofed, oversized, failed and timed-out scan paths.
4. Establish approved retention/deletion policy, reconciliation and restore replay.
5. Prove PII-safe logs, analytics, error reporting and email.
6. Prove MFA/session revocation and preview/production identity separation.
7. Test rate limits, idempotency and shared-IP behaviour.
8. Test CSP, CSRF/origin, rich-text sanitization and dependency/secret scanning.

Provider access controls/encryption/audit, database least privilege/PITR, queue durability, scanner-result authenticity, upload restrictions, production CSP, telemetry redaction, end-to-end deletion/restore, accessibility/no-JS fallback and alert ownership must be verified before the relevant production gate. This document accepts no residual risk on behalf of the owner.

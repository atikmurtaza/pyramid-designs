# ADR 0018: Closed deployment and separate capability activation

**Status:** Accepted for the B4A repository foundation, 2026-09-30. Actual deployment/activation still requires separate owner approval.

Hostinger/Neon/Supabase Auth/private Drive/Resend/Turnstile architecture remains ADR 0009/0017 and earlier approved boundaries. A deployment does not activate staff access, worker admission, email or Drive traffic. Server-only exact-true production switches default closed; staff proxy and authoritative server Auth, direct/HTTP worker, email configuration/send and every Drive transport enforce them. Real candidate intake and production retention remain code-closed with no environment activation flag.

Public liveness is a minimal uncached boolean; authenticated bounded readiness checks only DB connectivity. Detailed catalog/history/permission checks stay operator CLI read-only. Temporary compatibility diagnostics are production-denied; later table cleanup uses a separately reviewed forward migration.

Production staff mutations use the fixed approved HTTPS Origin and exact Host, never authority inferred from forwarding headers. Hostinger edge provenance/HTTPS/direct-origin/cookie acceptance remains mandatory. Per-IP limiting remains deferred, while global limiter and Turnstile remain required.

The release manifest records separate owner gates for marketing/staff/intake/worker/retention/email/Drive. No flag or B4 evidence waives frozen B3. No deployment, provider mutation, DNS change, production migration or next phase is authorised by this decision.

Runbooks: [B4A record](../../implementation/phase-b4a-production-infrastructure-readiness.md), [environment](../../operations/production-environment.md), [release](../../operations/production-release.md).

# Implementation Readiness Checklist

**Status:** Phase 0F approved checklist. Future work remains unchecked.
**Rule:** Completing a section does not authorize the next phase, production deployment, DNS change or real candidate intake without the relevant owner/reviewer gate.

## Before Phase 1

- [x] Phase 0A repository/asset audit completed.
- [x] Phase 0B requirements and content matrix completed.
- [x] Phase 0C system architecture and threat model completed.
- [x] Phase 0D1 paid-provider research retained as superseded evidence.
- [x] Phase 0D2 Hostinger/Supabase/Drive direction approved.
- [x] Phase 0E data, state and authorization models completed.
- [x] Phase 0F final gate completed as **PASS WITH ISSUES**.
- [x] Information architecture and core route map are stable.
- [x] Brand direction is sufficient for non-production prototyping.
- [x] Missing content and approval owners are documented.
- [x] Synthetic/development placeholder rule is explicit.
- [ ] Owner/reviewer explicitly authorises Phase 1 start.

## Before Phase 2 platform foundation

- [x] Owner's Hostinger account exposes managed Web App deployment on an isolated temporary domain without changing production DNS.
- [ ] Hostinger CPU, memory, storage, process, build, cron and effective request/upload limits are recorded.
  - hPanel records 200 GB disk, 3072 MB RAM, 2 CPU cores, 600,000 inodes, 120 maximum processes and one of five Web App slots in use. Cron availability and effective request/upload limits remain unproven.
- [ ] Synthetic Hostinger compatibility spike passes App Router, server route, Server Action, environment-secret, Prisma connection, ISR/revalidation, cron, restart/redeploy and upload-limit checks.
  - Local and live Supabase connectivity, migrations, public-role denial, protected probes and idempotency pass.
  - Phase 2A-H on 2026-09-03 failed its deployment preconditions: Hostinger deploys `cf2dd2a7`, which predates the Phase 2A routes, and hPanel has zero environment variables. Public routes, static assets, Node 22.x configuration, logs and basic desktop/mobile rendering pass; protected runtime, database, upload, cron, persistence, restart/redeploy and cache tests remain deferred.
  - Phase 2A-D commit and push are owner/reviewer authorised. Hostinger environment configuration and redeployment remain owner-operated; Hostinger-to-Supabase has not yet passed.
- [x] Exact implementation-time Node.js, Next.js and package versions are selected and pinned after review.
- [ ] Production, preview and development environment boundaries are approved.
- [ ] Supabase Mumbai processing/privacy position is owner/legal reviewed.
- [ ] Supabase project/account ownership, recovery contacts and MFA are assigned.
- [ ] Runtime and migration database-role strategy is approved.
- [ ] RLS posture is approved: public API roles denied; no claim of per-staff RLS without proof.
- [ ] Environment variable inventory is approved; no secret values are committed.
  - Hostinger runtime requires `DATABASE_URL`, `COMPATIBILITY_PROBE_SECRET` and `CRON_SECRET`. `DIRECT_URL` remains reserved for controlled migration/administrative use and is not a running-web-app requirement.
- [ ] CI quality/security checks and protected branch/release rules are approved.
- [ ] Public media source/derivative ownership process is defined.
- [ ] Operational owners and deputies are named.

## Before candidate-upload implementation

- [ ] Candidate-file feature remains disabled by default.
- [ ] Candidate privacy notice and support/contact route have approved drafts for the implementation environment.
- [ ] Retention categories and configuration shape are approved, even if production durations remain pending.
- [ ] Minimal accommodation-contact flag wording and access owner are approved; no medical free text is added.
- [ ] PDF-only, initial 5 MiB policy is confirmed.
- [ ] Dedicated company-controlled Google identity/Drive arrangement is selected; no personal account is used.
- [ ] OAuth scope and server-only credential plan are reviewed.
- [ ] Private recruitment root/quarantine organisation and no-public-sharing rule are documented.
- [ ] Drive/database idempotency and reconciliation cases have implementation tests planned.
- [ ] File states and security-review outcome mappings match `state-machines.md`.
- [ ] Quarantine retrieval is a separate server-authorised attachment operation.
- [ ] Ordinary hiring reviewers are denied every uncleared/rejected/failed/deleted/expired file state.
- [ ] Candidate filenames, Drive IDs, URLs and content are excluded from logs/email/analytics/jobs.
- [ ] Manual Defender SOP has a named operational owner and synthetic test plan.
- [ ] Upload, validation and scanning UI includes truthful pending/retry/rejection states without implying safety.

## Before staging/pre-production

- [ ] Staging uses synthetic candidate data, synthetic staff identities, separate database, Drive folder/credentials and email sink.
- [ ] No staging/preview process can access production candidate data or production Drive credentials.
- [ ] Staff TOTP enrolment, MFA assurance, deactivation and session revocation are tested.
- [ ] Direct Server Action/route authorization tests cover every role and state.
- [ ] BOLA/IDOR, metadata over-selection and generic denial behaviour are tested.
- [ ] PDF extension, MIME, magic signature, size, empty file, corrupt file and retry paths are tested.
- [ ] Drive success/database failure and database success/Drive failure are tested idempotently.
- [ ] Manual deletion, credential revocation, quota/error, moved folder, permission drift and deletion-failure reconciliation are tested with synthetic files.
- [ ] Defender manual review runs end to end without opening/previewing the file.
- [ ] Hash mismatch, clean, suspicious, failed, corrupt and cancelled-review paths are tested.
- [ ] PostgreSQL background-job overlap, lease expiry, retry, dead-job and duplicate invocation are tested.
- [ ] Turnstile server validation, origin checks, rate limits, shared-IP behaviour and idempotency are tested.
- [ ] SMTP uses an approved test sender/sink; messages contain no attachments, Drive links or sensitive fields.
- [ ] CSP, HSTS, `nosniff`, frame, referrer and permissions policies are verified against actual integrations.
- [ ] Rich-text AST validation/rendering rejects raw HTML, scripts, unsafe URLs, unsupported nodes and excessive size/depth.
- [ ] Logs, errors, audit, jobs, email and analytics pass synthetic PII/secret leakage tests.
- [ ] Encrypted logical export is produced and checksum/ledger evidence recorded.
- [ ] Synthetic restore exercise passes schema, data, auth mapping, consent, retention, jobs and candidate-file reference checks.
- [ ] External uptime/error alerts reach named owners.
- [ ] Dependency, secret, lint, type, test and production-build checks pass without suppression.

## Before production launch

- [ ] Business owner approves production launch and any provider/DNS change explicitly.
- [ ] Hostinger account capability and compatibility evidence remain valid for the release versions.
- [ ] Supabase production configuration, region, runtime/migration roles and network/TLS settings are verified.
- [ ] Staff production accounts are company-controlled, least-privilege and TOTP MFA tested.
- [ ] Dedicated Drive ownership, recovery email/phone, MFA, credential rotation and account recovery are documented.
- [ ] Drive root/folders/files have no public or unintended sharing; permission audit passes.
- [ ] Candidate privacy notice, consent/basis wording, version, effective date, retention disclosure, deletion/correction route and contact route are approved.
- [ ] Retention periods and expiry/deletion behaviour are configured and approved per candidate category.
- [ ] Hiring process, departments, roles, shifts, work arrangement, benefits and compensation publication policy are approved.
- [ ] Manual malware-review SOP is accepted and tested end to end by the named reviewer.
- [ ] Candidate upload remains disabled until quarantine restrictions, hash-bound clearance and every failure path pass.
- [ ] SMTP sender SPF, DKIM and DMARC alignment are verified; bounce/failure ownership is tested.
- [ ] Backup cadence/access/key ownership is approved and a recent export succeeds.
- [ ] Restore exercise is complete with reviewed evidence.
- [ ] Monitoring and incident contacts are named; uptime/error/dead-job alerts are tested.
- [ ] PII-scrub verification passes on production-like configuration.
- [ ] Turnstile hostname/action, rate limits and abuse controls pass.
- [ ] Security headers and TLS/SSL pass on the actual custom domain.
- [ ] Dependency/security/secret scans pass with no unapproved high-severity exception.
- [ ] WCAG 2.2 AA automated and manual keyboard/screen-reader/zoom/contrast/reduced-motion checks pass.
- [ ] LCP, INP and CLS targets are measured; 3D/media budgets and fallbacks pass representative devices/networks.
- [ ] Metadata, canonical, sitemap, robots, redirects and valid structured data pass; closed jobs emit no `JobPosting`.
- [ ] Public content, claims, media rights, credits, employee consent, legal entity, contact details and social ownership are approved.
- [ ] Final operational handover and rollback/incident procedure are approved.

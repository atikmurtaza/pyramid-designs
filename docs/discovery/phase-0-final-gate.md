# Phase 0F: Final Architecture and Operations Implementation-Readiness Gate

**Date:** 2026-08-27
**Decision:** **PASS WITH ISSUES**
**Scope:** Final Phase 0 reconciliation only. No application, package manifest, Prisma schema, migration, cloud resource, credential, deployment, DNS change or production data was created.

## 1. Executive decision

Pyramid Designs may enter **Phase 1 — Design System Prototype**. The information architecture, route map, data boundaries, authorization model, candidate-file states and provider direction are stable enough for visual prototyping without architecture redesign.

The issues are production and later implementation gates, not Phase 1 blockers:

- verify the owner's actual Hostinger plan exposes the required Web App controls;
- run the Hostinger compatibility spike before Phase 2 depends on platform-specific behaviour;
- approve candidate privacy, retention and accommodation wording before production intake;
- configure and test Supabase, Google Drive, SMTP, backups and alerts later without using real candidate data;
- complete the manual candidate-file security-review end-to-end gate before enabling candidate uploads.

There is no unmitigated conceptual **HIGH** or **CRITICAL** threat. Candidate intake is **IMPLEMENTATION ALLOWED WITH PRODUCTION GATE** because the design remains fail closed until a file has an immutable clean review matching its hash.

## 2. Approved architecture summary

| Area | Approved baseline | Boundary |
| --- | --- | --- |
| Application | Server-first Next.js App Router modular monolith | Avoid provider-specific runtime APIs and unnecessary client JavaScript. |
| Hosting | Owner's existing Hostinger managed Node.js/Next.js Web App facility | Conditional on exact hPanel plan verification and compatibility spike. |
| Database | Supabase Free PostgreSQL, Mumbai | Standard PostgreSQL/Prisma; free-tier capacity, pause and recovery limits accepted only behind production gates. |
| Staff authentication | Supabase Auth | TOTP MFA required for privileged staff; local active staff mapping and server-side authorization remain authoritative. |
| Candidate documents | Private Google Drive through server-only OAuth credentials | No applicant account, public link, browser credential or general staff Drive membership. |
| Candidate file policy | One PDF, initially 5 MiB maximum | Extension, MIME, signature and size validation are not malware scanning. |
| Security review | Controlled manual Microsoft Defender Antivirus scan | Only an authorised security reviewer may retrieve quarantine; ordinary hiring review requires `CLEARED`. |
| Public media | Existing Hostinger storage/CDN | Candidate documents never share this boundary. |
| Background work | PostgreSQL-backed jobs invoked by one protected Hostinger UTC cron | PostgreSQL leases, idempotency and business state are authoritative. |
| Email | Existing authenticated business-mail SMTP | No CV, Drive link, answers or sensitive notes in email. |
| Abuse controls | Turnstile Free, origin checks, honeypot/timing, PostgreSQL limits and idempotency | In-memory checks are supplemental only. |
| Monitoring | Hostinger logs/resource controls, scrubbed free error monitoring, one external uptime check | Database audit records are the security source of truth. |
| Cost | £0 incremental recurring infrastructure cost | Existing Hostinger/domain/mail and already-owned storage are excluded; paid services need later owner approval. |

ADRs 0009-0013 supersede the Phase 0D1 paid stack. Phase 0D1 remains historical provider evidence.

## 3. Requirement traceability

Classification meanings:

- **ARCHITECTURE SATISFIED:** an approved design or policy boundary exists.
- **IMPLEMENTATION PENDING:** architecture supports the requirement but no application exists.
- **CONTENT/POLICY PENDING:** owner, HR, content or legal/privacy input remains required.
- **DEFERRED BY APPROVED SCOPE:** explicitly outside the first release.
- **CONFLICT:** a later approved decision contradicts the requirement without resolution.

No requirement remains in **CONFLICT**.

| ID | Classification | Phase 0 evidence or next gate |
| --- | --- | --- |
| BR-001 | CONTENT/POLICY PENDING | Portfolio model exists; verified case studies and claims remain owner/content inputs. |
| BR-002 | CONTENT/POLICY PENDING | Careers/culture architecture exists; publishable employer claims remain HR/content inputs. |
| BR-003 | CONTENT/POLICY PENDING | Relationship boundary exists; exact approved wording remains owner/legal input. |
| BR-004 | IMPLEMENTATION PENDING | Admin, publication and authorization models exist; no application exists. |
| FR-001 | IMPLEMENTATION PENDING | Route map is stable and approved for Phase 1. |
| FR-002 | IMPLEMENTATION PENDING | URL-query filtering and accessible reset behaviour are specified. |
| FR-003 | CONTENT/POLICY PENDING | Project model exists; approved project facts/media/credits are missing. |
| FR-004 | CONTENT/POLICY PENDING | Culture model exists; approved real content and consents are missing. |
| FR-005 | IMPLEMENTATION PENDING | Careers filter and truthful empty-state requirements are stable. |
| FR-006 | IMPLEMENTATION PENDING | Job model, immutable ID and lifecycle are specified. |
| FR-007 | CONTENT/POLICY PENDING | Form architecture exists; accommodation wording and role questions require approval. |
| FR-008 | IMPLEMENTATION PENDING | Talent-network types and conditional fields are modelled. |
| FR-009 | IMPLEMENTATION PENDING | Upload/quarantine/review states and user-facing failure boundaries are specified. |
| FR-010 | IMPLEMENTATION PENDING | PostgreSQL idempotency and opaque references are specified. |
| FR-011 | IMPLEMENTATION PENDING | Contact and recruitment routes remain separate. |
| FR-012 | IMPLEMENTATION PENDING | Supabase Auth plus local default-deny authorization is specified. |
| FR-013 | IMPLEMENTATION PENDING | Public-content records and permissions are specified. |
| FR-014 | IMPLEMENTATION PENDING | Job lifecycle/questions/publication rules are specified. |
| FR-015 | IMPLEMENTATION PENDING | Application review, cleared-file access, notes and hiring states are specified. |
| FR-016 | IMPLEMENTATION PENDING | Retention/deletion and append-only audit workflows are specified. |
| FR-017 | CONTENT/POLICY PENDING | Trust-page routes exist; approved legal copy and cookie decision remain pending. |
| FR-018 | IMPLEMENTATION PENDING | Opaque receipt route/reference boundary is specified. |
| FR-019 | DEFERRED BY APPROVED SCOPE | Candidate accounts, status login, blog, directory and ATS/CRM integration remain excluded. |
| FR-020 | DEFERRED BY APPROVED SCOPE | Project-specific 3D viewers require separate approval. |
| CR-001 | CONTENT/POLICY PENDING | Source/rights/approval controls exist; publishable project packs are missing. |
| CR-002 | CONTENT/POLICY PENDING | Three approved launch case studies remain a content gate. |
| CR-003 | CONTENT/POLICY PENDING | Real culture media and individual publication consent remain required. |
| CR-004 | CONTENT/POLICY PENDING | Compensation model supports optional publication; HR policy/content remains pending. |
| CR-005 | CONTENT/POLICY PENDING | Legal entity, address, contacts, socials and relationship wording require verification. |
| CR-006 | CONTENT/POLICY PENDING | Notices and actual processor/cookie disclosures require approval. |
| CR-007 | CONTENT/POLICY PENDING | Vector logo, favicon, font licence and colour approval remain design/content gates. |
| CR-008 | ARCHITECTURE SATISFIED | Source/approval/consent references are required by the content model. |
| CR-009 | CONTENT/POLICY PENDING | Final content completeness remains a pre-launch gate. |
| SEC-001 | ARCHITECTURE SATISFIED | Server-side operation/target/state/scope authorization model is approved. |
| SEC-002 | ARCHITECTURE SATISFIED | Private Drive quarantine and clean-state access gate are approved. |
| SEC-003 | ARCHITECTURE SATISFIED | Trust-boundary validation and PDF/size/signature rules are specified. |
| SEC-004 | ARCHITECTURE SATISFIED | Layered abuse controls, PostgreSQL limits and idempotency are specified. |
| SEC-005 | ARCHITECTURE SATISFIED | MFA, secure sessions, CSRF/origin, headers and audit requirements are specified. |
| SEC-006 | ARCHITECTURE SATISFIED | Secret, preview-data, URL, email, job and telemetry exclusions are specified. |
| SEC-007 | ARCHITECTURE SATISFIED | Constrained rich-text AST and sanitised renderer boundary is approved. |
| SEC-008 | ARCHITECTURE SATISFIED | Append-only PII-safe audit model is approved. |
| PRIV-001 | ARCHITECTURE SATISFIED | Prohibited high-risk fields and minimal accommodation boundary are explicit. |
| PRIV-002 | CONTENT/POLICY PENDING | Versioned consent model exists; approved wording/effective version is pending. |
| PRIV-003 | CONTENT/POLICY PENDING | Notice requirements exist; counsel-reviewed text/contact route is pending. |
| PRIV-004 | CONTENT/POLICY PENDING | Configurable retention architecture exists; exact durations remain pending. |
| PRIV-005 | ARCHITECTURE SATISFIED | Candidate files, notes and accommodation access are least-privilege. |
| PRIV-006 | CONTENT/POLICY PENDING | Pakistan/cross-border legal/privacy review remains a production gate. |
| ACC-001 | IMPLEMENTATION PENDING | WCAG 2.2 AA and colour approval are required. |
| ACC-002 | IMPLEMENTATION PENDING | Keyboard, focus and announced-error requirements are specified. |
| ACC-003 | IMPLEMENTATION PENDING | 44 by 44 CSS-pixel target requirement is specified. |
| ACC-004 | IMPLEMENTATION PENDING | Core content/actions must work without JavaScript or WebGL. |
| ACC-005 | IMPLEMENTATION PENDING | Semantic/2D equivalent for the Culture map is required. |
| ACC-006 | IMPLEMENTATION PENDING | Reduced motion/transparency, contrast and zoom requirements are specified. |
| PERF-001 | IMPLEMENTATION PENDING | LCP, INP and CLS production targets are stable. |
| PERF-002 | ARCHITECTURE SATISFIED | Server-first/indexable content and limited hydration are approved. |
| PERF-003 | IMPLEMENTATION PENDING | Responsive media/save-data controls remain build and QA work. |
| PERF-004 | IMPLEMENTATION PENDING | Hero model size and representative-device frame target remain prototype gates. |
| PERF-005 | IMPLEMENTATION PENDING | Offscreen pause and static fallback remain prototype work. |
| SEO-001 | IMPLEMENTATION PENDING | Metadata, canonical, sitemap, robots and indexability requirements are specified. |
| SEO-002 | IMPLEMENTATION PENDING | Verified structured-data boundary is specified. |
| SEO-003 | ARCHITECTURE SATISFIED | Job lifecycle removes `JobPosting` when closed/expired. |
| SEO-004 | ARCHITECTURE SATISFIED | Admin/application/receipt data is excluded from indexing. |
| SEO-005 | CONTENT/POLICY PENDING | Claims and attribution require verified source approval. |
| OPS-001 | ARCHITECTURE SATISFIED | Synthetic-only isolated development/preview environments are mandatory. |
| OPS-002 | CONTENT/POLICY PENDING | Backup/restore design exists; owner cadence acceptance and exercise remain gates. |
| OPS-003 | IMPLEMENTATION PENDING | Monitoring/alert ownership is defined but not configured or tested. |
| OPS-004 | ARCHITECTURE SATISFIED | PostgreSQL job lifecycle, retries, leases and reconciliation are specified. |
| OPS-005 | IMPLEMENTATION PENDING | Failure/empty/degraded behaviours require implementation tests. |
| OPS-006 | IMPLEMENTATION PENDING | Backup, security, dependency, analytics and notification checks remain release work. |
| OPS-007 | ARCHITECTURE SATISFIED | Explicit owner approval remains mandatory for production, DNS and provider changes. |
| UX-001 | IMPLEMENTATION PENDING | Header/mobile navigation behaviour is stable for design. |
| UX-002 | IMPLEMENTATION PENDING | Responsive route layouts are stable for design. |
| UX-003 | IMPLEMENTATION PENDING | Hover capability and no-motion dependency rules are stable. |
| UX-004 | IMPLEMENTATION PENDING | Mobile form layout and text-size rules are stable. |
| UX-005 | IMPLEMENTATION PENDING | Loading, empty, error, retry and success states are required. |
| UX-006 | CONTENT/POLICY PENDING | Both themes ship only if brand/accessibility review approves both. |
| UX-007 | ARCHITECTURE SATISFIED | Motion cannot block navigation, scrolling, selection or forms. |
| 3D-001 | IMPLEMENTATION PENDING | Hero scene plus poster fallback is a Phase 1 prototype task. |
| 3D-002 | IMPLEMENTATION PENDING | Culture semantic/2D equivalent precedes optional 3D. |
| 3D-003 | IMPLEMENTATION PENDING | Reduced-motion/save-data fallbacks require prototype verification. |
| 3D-004 | ARCHITECTURE SATISFIED | Dynamic isolated canvas and server-rendered core content are approved. |
| 3D-005 | ARCHITECTURE SATISFIED | Purpose-limited motion and single-owner animation loops are approved. |
| 3D-006 | DEFERRED BY APPROVED SCOPE | Spatial case-study viewers remain deferred. |

## 4. Architecture consistency and ADR audit

| ADR | Status at Phase 0F | Effect |
| --- | --- | --- |
| 0001 | Accepted | Modular monolith remains current. |
| 0002 | Accepted | Server-first rendering remains current. |
| 0003 | Accepted | Public media and candidate storage remain separate. |
| 0004 | Accepted, revised by Phase 0D2 | Server-mediated Drive upload supersedes direct object-store upload. |
| 0005 | Accepted, revised by Phase 0D2/0F | Manual fail-closed review is the MVP scanner path; automated scanning is a paid fallback. |
| 0006 | Accepted | Server-side default-deny authorization remains current. |
| 0007 | Accepted | Candidate accounts remain out of MVP. |
| 0008 | Accepted | Synthetic-only environment isolation remains current. |
| 0009 | Accepted | Hostinger-first £0 hosting supersedes Vercel Pro. |
| 0010 | Accepted | Private Google Drive supersedes S3 as current candidate storage. |
| 0011 | Accepted | Supabase Free data/auth supersedes Neon Scale/Clerk Pro. |
| 0012 | Accepted | Application-owned candidate snapshots remain current. |
| 0013 | Accepted | PostgreSQL jobs supersede QStash/Redis for initial scale. |

No new ADR is required: Phase 0F operationalises already approved decisions without changing the architecture.

## 5. Security gate

The threat model covers staff takeover, authorization bypass/BOLA, candidate-file exposure, malicious uploads, stored XSS, CSRF, SQL injection, bot/rate abuse, Drive permission drift, secret leakage, preview exposure, PII logging, retention failure, backup loss and dependency compromise.

No **HIGH** or **CRITICAL** threat lacks a planned mitigation. The candidate-file path is the highest residual-risk area and remains fail closed through:

- private server-only Drive access;
- PDF/5 MiB validation before storage;
- quarantine state unavailable to ordinary hiring reviewers;
- separate `candidate_file.security_review` permission;
- explicit Defender scan on a controlled Windows workstation;
- immutable hash-bound review evidence;
- no inline preview before clearance;
- end-to-end production-gate testing;
- paid automated scanning as a future trigger, not an assumed equivalent control.

## 6. Privacy and data minimisation gate

The MVP has no fields for CNIC, passport, banking details, family information, identity documents, health details or candidate credentials. Original candidate filenames are not stored. Candidate names, contact details, answers, accommodation data, filenames, Drive IDs, URLs and tokens are excluded from URLs, analytics, logs, emails and job payloads.

Accommodation is limited to an optional **request recruitment-process accommodation contact** flag. The public copy must ask candidates not to provide medical details; authorised HR contacts follow up through an approved private process. An open medical free-text field is not part of MVP.

## 7. Hostinger readiness

### Verified generic Hostinger capability

Official Hostinger documentation reviewed on 2026-08-27 supports:

- managed Node.js Web Apps on eligible plans and Next.js deployment;
- supported Node.js runtime selection;
- GitHub repository deployment and automatic rebuilds on push;
- hPanel environment-variable management;
- persistent Node server processes with deployment logs, resource graphs and restart controls;
- custom-domain selection, SSL and public hosting/CDN/security features subject to the plan;
- UTC cron jobs and documented per-plan cron/resource limits;
- ordinary production `next build` and `next start` style deployment.

Hostinger does not document a sufficiently precise guarantee for this exact application concerning App Router edge cases, Server Actions, on-demand ISR/revalidation persistence, cron-to-route authentication, Node request/body/upload caps or all WAF behaviours. Those remain tests, not assumptions.

### Owner account verification required

Before Phase 2 platform foundation:

1. Confirm the owner's exact plan exposes **Web App / Deploy Web App** without an upgrade.
2. Record available Node versions, CPU, memory, storage, process and build limits shown in hPanel.
3. Confirm custom-domain, SSL, CDN, WAF/security, logs and restart controls actually available on that plan.
4. Confirm GitHub repository permissions and production branch policy without changing production.
5. Confirm cron allowance and secure invocation method.
6. Confirm any effective proxy/body/upload/request-time limits through documentation or a synthetic test.

### Mandatory Hostinger compatibility spike

Before architecture-critical Phase 2 work relies on Hostinger-specific behaviour, deploy a synthetic-only spike containing:

- a minimal Next.js App Router page;
- one server route and one Server Action;
- server-only environment-variable read proving the value never reaches the browser;
- test Supabase PostgreSQL connection through the intended Prisma runtime connection and direct migration connection;
- cache/ISR/revalidation test with documented expected and observed behaviour;
- protected cron invocation that claims one synthetic PostgreSQL job idempotently;
- restart and GitHub redeploy tests proving secrets persist and the application returns healthy;
- bounded synthetic PDF upload test establishing effective request/body/time limits without storing candidate data.

Pass evidence: commit/ref, Node and Next.js versions, hPanel screenshots without secrets, build/start commands, route/action results, environment-secret non-exposure check, database connection result, ISR observations, cron duplicate-safety result, restart/redeploy result, upload limit result and log location. Any failed architecture-critical behaviour requires a fallback or later ADR before dependent implementation.

## 8. Supabase readiness

The selected design is internally consistent:

- Mumbai PostgreSQL is the approved starting region, subject to owner privacy acceptance and real Hostinger-to-Supabase testing.
- Prisma uses standard PostgreSQL with a pooled runtime URL and a direct migration/admin URL.
- server-side runtime access only; application tables are not exposed to browser Supabase clients.
- Supabase Auth provides staff identity and TOTP MFA; local `StaffUser`/`UserRole` state remains authoritative.
- development/preview use separate projects or isolated resources with synthetic identities/data.
- runtime and migration database roles are separate and least privilege.
- RLS denies public API roles as defence in depth; per-staff RLS is not claimed unless transaction identity propagation is proven safe.
- free-tier pause, capacity and recovery limits are explicit; no PITR is assumed.

Later configuration names/categories only:

- `DATABASE_URL` — pooled Prisma runtime connection;
- `DIRECT_URL` — direct migration/admin connection;
- `NEXT_PUBLIC_SUPABASE_URL` — public project URL;
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — public client key where the approved auth flow needs it;
- `SUPABASE_SERVICE_ROLE_KEY` — optional server-only admin API credential only if a narrow staff-management operation proves it necessary;
- approved auth redirect URLs, MFA assurance policy, SMTP/auth email settings and production/preview project identifiers.

No values or secrets are recorded in the repository.

## 9. Google Drive readiness and reconciliation

The expected arrangement is a dedicated company-controlled Google identity using ordinary Google Drive and the OAuth web-server flow. It may be a dedicated Gmail identity or an already-owned Google Workspace identity. Paid Google Workspace is not assumed or required. A Shared Drive/service-account design is used only if the company already has an appropriate Workspace arrangement and later approves it.

Before production:

- company ownership and operational owner are documented;
- recovery email and phone are company-controlled;
- MFA is enabled;
- the account is not a departing individual's personal identity;
- a private recruitment root folder exists with no public or `anyoneWithLink` sharing;
- server credentials and rotation/recovery procedures are documented;
- general hiring reviewers are not Drive members;
- least-practical OAuth scope is used and verified;
- periodic permission and file-reference reconciliation is owned.

| Failure | Required idempotent/fail-closed handling |
| --- | --- |
| Drive write succeeds, database write fails | Keep the object quarantined, identify it by upload correlation, retry database linkage or delete the orphan; never issue a receipt implying acceptance. |
| Database placeholder succeeds, Drive upload fails | Mark file `PROCESSING_FAILED`, keep application pending/failed, retry against the same idempotency scope or accept a replacement file row. |
| Drive file is manually deleted | Reconciliation marks it unavailable, blocks review/download, alerts the technical owner and starts approved replacement/deletion handling. |
| Credentials are revoked | Stop candidate-file operations, fail closed, alert, rotate/re-authorise credentials and reconcile before intake resumes. |
| Drive API quota/transient error | Bounded retry with backoff and idempotency; no ambiguous acceptance or clearance. Pause intake if the failure persists. |
| Folder is moved | File IDs remain checked against the expected private parent. Reconciliation restores the approved parent or marks the file unavailable; folder location never grants clearance. |
| Permission/public sharing changes | Immediately stop access/intake, remove the share, audit affected files, treat as a security incident and reconcile before resuming. |
| Application deletion commits but Drive deletion fails | Disable application access first, retain the deletion job/metadata, retry until external deletion is confirmed, then complete the tombstone. |

## 10. Manual malware-review policy

Microsoft Defender Antivirus is the **PROVISIONAL APPROVED MANUAL SCANNER** for Windows security-review workstations. Real-time protection remains enabled, but every quarantined PDF receives an explicit custom file scan. Antivirus reduces risk and does not guarantee safety or equal enterprise sandboxing.

Required workflow:

1. Candidate upload passes PDF validation and remains `QUARANTINED_UNSCANNED`.
2. Ordinary hiring reviewers cannot retrieve it.
3. A named operator assigned the operational **SECURITY REVIEWER** responsibility and holding `candidate_file.security_review` requests access.
4. Server reauthorizes role, active status, MFA assurance, target, hash/version, retention and state.
5. The PDF is delivered as an attachment through the controlled server path into a dedicated local quarantine directory.
6. The reviewer does **not** open or preview it.
7. The reviewer updates Defender protection intelligence where practical and explicitly scans the single file using the Windows UI or `MpCmdRun.exe -Scan -ScanType 3 -File <path>`.
8. The reviewer records file hash, reviewer, completion time, method, product, observed result and outcome.
9. Only `CLEAN` maps to the existing `CLEARED` state and allows ordinary hiring access.
10. Suspicious, infected, corrupt, failed or unverifiable outcomes remain unavailable.
11. The local copy is securely removed after evidence is recorded according to the SOP.

Operational outcome mapping:

| SOP outcome | Existing state/result |
| --- | --- |
| `CLEAN` | Review outcome `CLEARED`; security status `CLEARED`. |
| `MALICIOUS_OR_SUSPICIOUS` | Review outcome `REJECTED`; security status `REJECTED`. |
| `SCAN_FAILED` | Review outcome `FAILED` or `INDETERMINATE`; security status `REVIEW_FAILED`. |
| `FILE_CORRUPT_OR_INVALID` | Validation failure when detected before review, otherwise review outcome `FAILED`; never cleared. |
| `REVIEW_CANCELLED` | Audit-only cancellation before a review outcome; no clearance. If retrieval/review already began and cannot complete, record `FAILED` and `REVIEW_FAILED`. |

Minimum evidence is candidate-file ID, SHA-256, review method, scanner product, scanner result, reviewer, timestamp, safe outcome code and optional definition/product version when reliably available. Screenshots and full malware logs are not required by default and must not introduce PII.

Full instructions are in [candidate-file-security-review.md](../operations/candidate-file-security-review.md).

## 11. Backup and recovery policy

The minimum £0 recovery design uses encrypted PostgreSQL logical exports. It does not claim provider automatic backups or PITR.

**PROVISIONAL OWNER/OPERATIONS POLICY:** while candidate intake is enabled, export the application schema/data daily and immediately before/after production migrations; retain 14 daily exports and 3 monthly exports. Store encrypted copies in company-controlled storage separate from the recruitment Drive account/folder, with access limited to the technical owner and designated recovery deputy. Keep the encryption key separately in the approved password/secret manager. Record export time, source project, checksum, tool version, owner and expiry without candidate PII.

At least quarterly before launch and after material schema/auth changes, restore the latest encrypted export into an isolated non-production project using synthetic fixtures. Prove schema/data restoration, local staff/role mapping, consent definitions/versions, retention policies/expiry, background-job integrity, candidate metadata and Drive references. Synthetic auth users may be recreated to validate mapping. Restored systems stay isolated until retention/deletion state is replayed and authorization tests pass.

Required evidence: export and restore timestamps, source/target identifiers, encrypted artifact checksum, commands/tool versions, row-count/invariant report, authorization test result, consent/retention checks, job checks, candidate-file reference reconciliation and named reviewer sign-off. No real candidate data is used in development restore exercises.

Full policy is in [backup-and-restore.md](../operations/backup-and-restore.md).

## 12. Legal and HR production gates

Before production candidate intake, owner/HR/legal/privacy review must approve:

- candidate privacy notice and contact route;
- processing purpose and legal/privacy basis;
- consent wording where consent is the applicable basis;
- immutable notice/consent version and effective date;
- retention duration per job application and talent-network category;
- expiry/deletion/correction/withdrawal behaviour and request verification;
- disclosure of processors, recovery limits and relevant cross-border processing;
- minimal accommodation-contact wording and handling owner;
- hiring process, departments, work arrangements, job types, shifts, benefits and compensation publication policy.

This is a decision framework, not legal advice. The architecture records category, purpose, proposed duration, owner, legal/privacy review, configuration version, effective date and expiry behaviour. Final legal text is not required for Phase 1 visual design; synthetic labelled placeholders may be used.

| Candidate category | Purpose | Proposed duration | Owner | Legal/privacy review | Implementation configuration | Expiry behaviour |
| --- | --- | --- | --- | --- | --- | --- |
| Job application | Review for one identified vacancy | **PENDING** | HIRING/HR OWNER | **PENDING** | Versioned `RetentionPolicy` selected at submission | Disable access, delete Drive bytes and erase/anonymise approved fields through audited jobs. |
| Talent network — permanent interest | Consider for future permanent roles | **PENDING** | HIRING/HR OWNER | **PENDING** | Separate versioned policy/category | Notify/disclose as approved; disable access and delete/anonymise at expiry. |
| Talent network — freelance/project | Consider for future project engagement | **PENDING** | HIRING/HR OWNER | **PENDING** | Separate versioned policy/category | Same fail-closed deletion workflow; no silent extension. |
| Talent network — internship/early career | Consider for future early-career roles | **PENDING** | HIRING/HR OWNER | **PENDING** | Separate versioned policy/category | Same fail-closed deletion workflow; no silent extension. |
| Portfolio-only introduction | Review portfolio without promise of a vacancy | **PENDING** | HIRING/HR OWNER | **PENDING** | Separate versioned policy/category | Same fail-closed deletion workflow; no silent extension. |

## 13. Operational ownership

| Responsibility | Provisional role |
| --- | --- |
| Final company decisions, budget and production approval | **BUSINESS OWNER** |
| Candidate review workflow, jobs, retention proposal and accommodation follow-up | **HIRING/HR OWNER** |
| Quarantined-file scanning, evidence and escalation | **SECURITY REVIEWER** — a named trained operator holding the narrow application permission; not a new broad application role by default |
| Portfolio, culture and public-media source/approval records | **CONTENT OWNER** |
| Deployments, Hostinger, database, backups, restore tests, credentials, monitoring and incidents | **TECHNICAL OWNER** |
| Candidate/privacy/legal pages, legal basis and retention review | **LEGAL/PRIVACY REVIEW** |

Personal names are intentionally absent until owners assign them.

## 14. Remaining decisions

The following do not block Phase 1:

- exact Hostinger owner-plan capabilities;
- exact retention periods and deletion treatment of consent/audit history;
- candidate privacy/consent/accommodation wording;
- final hiring-status and vacancy-content policy details;
- verified company/legal/contact/parent wording;
- approved project/culture content and media rights;
- vector logo/font licence/accessibility colour approval;
- final compensation publication policy and allowed currency/period vocabulary;
- exact rich-text editor/library, provided it emits the approved constrained document model;
- named operational owners and deputies.

## 15. Phase 1 entry criteria

All entry criteria pass:

- information architecture and core route map are stable;
- brand direction is sufficient for prototyping, with unresolved asset/licence items recorded;
- architecture does not require a visual redesign;
- content gaps and approval owners are documented;
- clearly labelled synthetic/development content is permitted;
- no unresolved blocker prevents visual prototyping;
- Phase 0F documentation is committed and pushed.

Phase 1 is not started by this gate.

## 16. Production gates

Before real candidate intake:

- [ ] Hostinger account capability and effective limits verified.
- [ ] Hostinger compatibility spike passes.
- [ ] Supabase production region, connection roles and isolation verified.
- [ ] Staff TOTP MFA, deactivation and session-revocation paths tested.
- [ ] Server-side authorization, BOLA/IDOR and direct route/action tests pass.
- [ ] Dedicated Drive ownership/recovery/MFA/rotation documented.
- [ ] Drive recruitment root and every candidate file verified private.
- [ ] PDF/5 MiB validation, quarantine and failure paths tested.
- [ ] Manual Defender security-review SOP passes end to end.
- [ ] Ordinary reviewer quarantine restrictions and hash-bound clearance tested.
- [ ] Retention policy and candidate privacy notice approved and versioned.
- [ ] SMTP sender authentication and safe email content verified.
- [ ] Encrypted logical export procedure tested.
- [ ] Synthetic restore exercise completed and reviewed.
- [ ] Logs/errors/jobs/analytics/email verified PII-safe.
- [ ] Turnstile, origin, rate limits and idempotency tested.
- [ ] CSP and security headers verified against actual integrations.
- [ ] Dependency, secret and security scans pass without suppressed failures.
- [ ] External uptime/error alerts reach named owners.
- [ ] Accessibility, performance, SEO and structured-data release gates pass.

## 17. Accessibility, performance and SEO architecture gates

**Accessibility:** Phase 1 has sufficient requirements for WCAG 2.2 AA, keyboard operation, focus management, reduced motion, semantic 3D alternatives, contrast, 44 by 44 touch targets, linked/announced form errors, captions/transcripts and responsive reflow.

**Performance:** The approved server-first design supports LCP below 2.5 seconds p75, INP below 200 ms p75 and CLS below 0.1 p75. Optional 3D is isolated/dynamic with poster, save-data and reduced-motion fallbacks; controlled media and limited hydration remain mandatory. No current architecture decision inherently defeats the targets. The main risk is allowing 3D/media scope to expand during design; Phase 1 must measure it.

**SEO:** The architecture supports metadata, canonical URLs, sitemap, robots, `Organization`, verified-data-only `LocalBusiness`, appropriate `CreativeWork`, active-only `JobPosting`, stable human-readable slugs and future redirect records if published slug changes are approved.

## 18. Rich text and compensation boundaries

Constrained rich text is permitted only for project challenge/approach/outcome, job responsibilities/qualifications/hiring-process copy and culture stories. The stored value is a versioned structured document/AST, never arbitrary HTML. Initial allowed nodes are paragraph, heading levels 2-4, ordered/unordered list, list item, block quote, text, hard break and link. Text marks are bold and emphasis only. Links allow `https:` and `mailto:` where approved, reject scripts/data URLs, add safe external-link attributes and render through a server-owned sanitised allowlist. Tables, embeds, iframes, styles, scripts and raw HTML are excluded. Editor/library choice remains Phase 1/2 implementation work.

Jobs support either:

- hidden/not published compensation;
- optional numeric minimum/maximum in integer minor units, ISO currency and approved period; or
- approved alternative compensation text.

Numeric range requires both values, same currency/period and minimum not greater than maximum. No salary policy or amount is invented.

## Verification boundary

- no application code, package manifest, package installation, Prisma schema or migration exists;
- no cloud account/resource, credential, deployment, DNS change or production configuration was created;
- no real candidate data or invented legal conclusion was used;
- paid Phase 0D1 services are historical, superseded, paid fallback or rejected—not current architecture;
- candidate-file access remains fail closed;
- database recovery limitations and owner-account checks remain explicit;
- unresolved policy/content work does not unnecessarily block Phase 1.

## Official implementation-readiness references reviewed

- [Hostinger Node.js hosting options](https://www.hostinger.com/support/node-js-hosting-options-at-hostinger/)
- [Hostinger Node.js Web App deployment](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/)
- [Hostinger cron jobs](https://www.hostinger.com/support/1583465-how-to-set-up-a-cron-job-at-hostinger/)
- [Hostinger cron limits](https://www.hostinger.com/support/1583765-how-many-cron-jobs-can-you-set-up-in-hostinger/)
- [Hostinger hosting limits](https://www.hostinger.com/support/6976044-parameters-and-limits-of-hosting-plans/)
- [Microsoft Defender Antivirus command-line arguments](https://learn.microsoft.com/en-us/defender-endpoint/command-line-arguments-microsoft-defender-antivirus)
- [Supabase backups](https://supabase.com/docs/guides/platform/backups)
- [Supabase TOTP MFA](https://supabase.com/docs/guides/auth/auth-mfa/totp)
- [Supabase connection pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)

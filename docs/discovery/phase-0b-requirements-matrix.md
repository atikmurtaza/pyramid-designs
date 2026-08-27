# Phase 0B: Requirements, Content Matrix and Decision Classification

**Status:** PASS WITH ISSUES
**Date:** 2026-08-27
**Scope:** Requirements consolidation from the authoritative website plan, Phase 0A audit, and supplied brand/social assets. No implementation or provider selection.

## 1. Executive summary

Pyramid Designs needs a server-rendered portfolio and employer-brand site with two equal public journeys: prospective clients can assess credible work and contact the studio; candidates can find openings or submit an evergreen profile. The recommended first release includes the public route map, managed projects/jobs/applications, secure candidate submission, the Home and Culture 3D experiences with static/semantic fallbacks, and legal/trust pages.

The repository supplies a detailed plan, raster brand references, social URLs, and a parent-company domain. It does **not** supply publishable case studies, culture content, hiring policy, contact details, legal copy, approved logo vectors, or operating/provider decisions. These gaps do not all stop architecture. The genuine architecture decisions are isolated in the decision register; content and launch decisions remain at their latest safe gate.

## 2. Requirement taxonomy

IDs are stable and intentionally grouped as testable, decision-relevant requirements rather than implementation tasks. `MVP` means first production release; `DEFERRED` means explicitly outside that release.

| Prefix | Meaning | Count |
| --- | --- | ---: |
| BR | Business | 4 |
| FR | Functional | 20 |
| CR | Content | 9 |
| SEC | Security | 8 |
| PRIV | Privacy/data protection | 6 |
| ACC | Accessibility | 6 |
| PERF | Performance | 5 |
| SEO | SEO/discovery | 5 |
| OPS | Operations | 7 |
| UX | Interaction/responsive | 7 |
| 3D | 3D/motion | 6 |

## 3. Business requirements

| ID | Requirement | Release |
| --- | --- | --- |
| BR-001 | Demonstrate Pyramid Designs' quality and breadth through verified project-based evidence for prospective clients. | MVP |
| BR-002 | Present a credible early-career/freelance employer proposition without making unverified promises. | MVP |
| BR-003 | State the relationship with MAD Alpha Designers only with approved factual wording; do not imply Pyramid Designs is a US office. | MVP |
| BR-004 | Let authorised staff manage projects, portfolio media, culture content, jobs, and applications without code changes. | MVP |

## 4. Functional requirements

| ID | Requirement | Release |
| --- | --- | --- |
| FR-001 | Provide Home, Work, Culture, Careers, About and Join us navigation in the stated order, plus Contact and trust/legal routes. | MVP |
| FR-002 | Provide Work filtering by discipline and sector through accessible controls reflected in URL query parameters, clear no-results and reset states. | MVP |
| FR-003 | Publish a case study only with approved title/anonymisation, media, brief, approach, outcome and credits; link related work/contact where supplied. | MVP |
| FR-004 | Present Culture through approved real examples/media and link both current roles and evergreen talent submission. | MVP |
| FR-005 | Search/filter Careers by department, work arrangement, employment type and experience level; show a truthful empty state to `/join`. | MVP |
| FR-006 | Display job details and an application form bound to an immutable job identifier. | MVP |
| FR-007 | Accept job applications with the planned basic/contact, portfolio, CV, conditional role-question, accommodation and consent fields. | MVP |
| FR-008 | Accept evergreen submissions for permanent, freelance, internship/early-career and portfolio-only interest, showing only relevant conditional fields. | MVP |
| FR-009 | Show upload, validation, scanning, accepted, rejection/retry and technical-failure states without exposing candidate files. | MVP |
| FR-010 | Prevent accidental duplicate submissions and issue a non-sensitive application reference and confirmation email. | MVP |
| FR-011 | Keep Contact enquiries separate from recruitment and direct candidates to Careers or Join us. | MVP |
| FR-012 | Provide staff authentication, role-protected navigation and least-privilege access to the admin areas. | MVP |
| FR-013 | Let authorised staff create, preview, publish and manage projects/media/culture content. | MVP |
| FR-014 | Let authorised staff manage job lifecycle, job-specific questions and public availability. | MVP |
| FR-015 | Let authorised hiring staff review applications, access cleared files safely, add internal notes and record candidate status. | MVP |
| FR-016 | Support authorised retention/deletion actions and audit history for staff-sensitive actions. | MVP |
| FR-017 | Render legal/trust pages and conditionally expose cookie controls only when non-essential cookies are used. | MVP |
| FR-018 | Provide a receipt route after an accepted application without sensitive data in the URL or page. | MVP |
| FR-019 | Candidate accounts, public application-status login, blog/news, public employee directory and complex CRM/ATS integrations are out of scope. | DEFERRED |
| FR-020 | Project-specific interactive 3D viewers are limited to eligible spatial work and are out of initial release unless separately approved. | DEFERRED |

## 5. Content requirements

| ID | Requirement | Release |
| --- | --- | --- |
| CR-001 | Use only approved project facts, media rights, credits, client attribution/anonymisation and outcomes in public portfolio content. | MVP |
| CR-002 | Launch Work with at least three complete approved case studies, as the plan's recommended first-release minimum. | MVP |
| CR-003 | Use real approved culture media, employee names/roles/quotes only with publication consent, and no generic corporate stock imagery for culture/recruitment. | MVP |
| CR-004 | Publish job, benefit, workplace, compensation, location, shift and hiring-process information only when confirmed by HR/HIRING. | MVP |
| CR-005 | Publish exact legal entity, approved parent-company relationship wording, contact channels, address and social links only after owner verification. | MVP |
| CR-006 | Use approved general privacy, candidate privacy, terms and accessibility copy; disclose only actual processors/cookies. | MVP |
| CR-007 | Obtain an approved vector logo suite, favicon, permitted web-font delivery and accessible brand-use rules before final public visual delivery. | MVP |
| CR-008 | Maintain a source/approval record for each public claim, asset, client attribution and consent-bound employee content. | MVP |
| CR-009 | Do not fabricate company information, marketing claims, employee material, client results or operational promises in development or production. | MVP |

## 6. Non-functional requirements

| ID | Requirement | Release |
| --- | --- | --- |
| SEC-001 | Enforce authentication and role/scope authorisation server-side for every private admin action and candidate-file access. | MVP |
| SEC-002 | Keep candidate files private; use quarantine and only permit staff access after a successful malware result. | MVP |
| SEC-003 | Validate untrusted form, URL and file input; enforce file type/size limits once policy is approved. | MVP |
| SEC-004 | Apply production-capable rate limiting and idempotency/duplicate protection to public submissions. | MVP |
| SEC-005 | Use secure sessions, MFA for staff where the approved identity policy requires it, security headers, CSRF-aware mutation design and audit logging. | MVP |
| SEC-006 | Do not expose secrets, real candidate data in development/preview, or public candidate-file URLs. | MVP |
| SEC-007 | Use a strict rich-text element allowlist for managed public content. | MVP |
| SEC-008 | Record security-relevant administration and candidate-data actions in an auditable history. | MVP |
| PRIV-001 | Collect only application information needed for recruitment; never request CNIC, passport, banking, family data or unnecessary identity documents initially. | MVP |
| PRIV-002 | Capture candidate consent text/version and explain purpose and retention period before submission. | MVP |
| PRIV-003 | Provide a candidate privacy notice covering purpose, access, retention, deletion, processors and a contact route. | MVP |
| PRIV-004 | Apply an approved retention/deletion policy to applications, files and evergreen profiles. | MVP |
| PRIV-005 | Keep files and internal notes accessible only to authorised hiring staff. | MVP |
| PRIV-006 | Obtain qualified legal review for Pakistan-focused notices and assess cross-border duties if international candidates/analytics are in scope. | MVP |
| ACC-001 | Meet WCAG 2.2 AA, including an approved accessible use of brand colours. | MVP |
| ACC-002 | Keep all navigation, filters, galleries, dialogs and forms keyboard-operable with visible focus, skip link and route announcements. | MVP |
| ACC-003 | Use semantic labels, help text, field errors and a form error summary; target 44 by 44 CSS-pixel controls. | MVP |
| ACC-004 | Make all core content and actions useful without JavaScript or WebGL. | MVP |
| ACC-005 | Provide equivalent semantic Culture-map content and accessible alternatives for non-text media/3D. | MVP |
| ACC-006 | Respect reduced motion, reduced transparency, increased contrast and zoom/reflow requirements. | MVP |
| PERF-001 | Meet LCP under 2.5 s p75, INP under 200 ms p75 and CLS under 0.1 p75 in production measurement. | MVP |
| PERF-002 | Server-render indexable content and avoid delaying primary text/actions for client interaction or 3D. | MVP |
| PERF-003 | Optimise responsive images/video and avoid autoplay/high-resolution sequences when save-data is enabled. | MVP |
| PERF-004 | Keep Home's compressed 3D model under 700 KB excluding its poster and target stable 50-60 fps on representative mid-range Android hardware. | MVP |
| PERF-005 | Pause 3D when offscreen/hidden and recover to a static fallback on context loss/low capability. | MVP |
| SEO-001 | Serve indexable, canonical public content with per-route metadata and a sitemap. | MVP |
| SEO-002 | Use accurate structured data only for eligible published content. | MVP |
| SEO-003 | Publish `JobPosting` data only while a vacancy is public; remove/expire it when closed. | MVP |
| SEO-004 | Do not index private admin, application data or receipt-specific candidate data. | MVP |
| SEO-005 | Use verified claims, names, figures and client attributions only. | MVP |
| OPS-001 | Separate preview/development/production environments and ensure preview data contains no real candidate information. | MVP |
| OPS-002 | Use managed production data/storage with backup, restore, migration and retention/deletion capability. | MVP |
| OPS-003 | Monitor errors, uptime, structured logs and critical alerts with named operational ownership before launch. | MVP |
| OPS-004 | Support reliable asynchronous email, media processing, scan and deletion outcomes, including explicit failure states. | MVP |
| OPS-005 | Test authorisation, uploads, lifecycle/retention, accessibility, responsive behaviour and failure/empty states before launch. | MVP |
| OPS-006 | Run a backup-restore exercise, security/dependency review, analytics/notification verification and operational handover before launch. | MVP |
| OPS-007 | No production deployment, DNS or provider/account change occurs without explicit owner approval. | MVP |
| UX-001 | Use a 64-72 px single-line desktop header and an accessible full-screen mobile menu with the same navigation order. | MVP |
| UX-002 | Use desktop/tablet/mobile layouts specified by the plan: editorial work grid to one-column mobile feed, and responsive job filters. | MVP |
| UX-003 | Show desktop hover previews only on capable precise-pointer devices; never require motion to understand work. | MVP |
| UX-004 | Keep forms one column on mobile with minimum 16 px input text; use two columns only for short related fields on larger screens. | MVP |
| UX-005 | Provide truthful loading, empty, error, retry and success states for public and recruitment flows. | MVP |
| UX-006 | Preserve a coherent light/dark experience only if both themes pass brand/accessibility review. | MVP |
| UX-007 | Do not let animation block navigation, scrolling, text selection or form completion. | MVP |

## 7. 3D/motion requirements

| ID | Requirement | Release |
| --- | --- | --- |
| 3D-001 | Home must provide the assembled Pyramid-mark scene and an optimised static poster fallback. | MVP |
| 3D-002 | Culture must present department collaboration with an adjacent semantic list/2D equivalent; mobile uses the 2D accordion and may offer opt-in 3D. | MVP |
| 3D-003 | Reduced-motion users receive static/short non-scrubbed alternatives; save-data and low-capability users receive poster/static content. | MVP |
| 3D-004 | Load canvas dynamically and keep static content/metadata available before it; 3D is never required to navigate or convert. | MVP |
| 3D-005 | Restrict motion to approved scene purpose and do not compete animation libraries on the same element/loop. | MVP |
| 3D-006 | Spatial case-study viewers require eligibility, approved assets and separate performance approval. | DEFERRED |

## 8. Route/content matrix

`Exists` reflects only supplied repository evidence. `Mock` means layout-safe development placeholders only, never public or production claims. Approval roles are proposed operating roles unless confirmed.

| Route | Purpose / audience / action | Required content and source | Exists | Mock | Final approver | Missing blocks (A/D/I/L) |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | Explain value; clients/candidates; View work or Join us | Value proposition, verified selected work, capabilities, approved parent statement, culture media, open roles; plan plus approved content | PARTIAL | Yes | BUSINESS OWNER, CONTENT/MARKETING | Design, implementation, launch |
| `/work` | Assess portfolio; prospects/candidates; filter/open project | Approved project cards, cover media, discipline/sector; project owners | MISSING | Yes | BUSINESS OWNER, CONTENT/MARKETING | Design, launch |
| `/work/[project-slug]` | Prove process/outcome; prospect; contact | Approved project facts, media rights, client/anonymisation, outcomes, credits; project source pack | MISSING | Yes | BUSINESS OWNER, CONTENT/MARKETING | Design, launch |
| `/culture` | Show real working culture; candidates; Careers/Join | Manifesto, media, department information, voices/consent, growth facts; culture/HR inputs | MISSING | Yes | HR/HIRING, CONTENT/MARKETING | Design, launch |
| `/careers` | Find live roles; candidates; open job/Join | Published job data, process copy, confirmed benefits/expectations; HR inputs | MISSING | Yes | HR/HIRING | Implementation, launch |
| `/careers/[job-slug]` | Evaluate/apply for job; candidate; submit | Job description, location/shift/type/deadline, questions, policy-permitted salary, hiring timeline; HR input | MISSING | No for public application | HR/HIRING | Architecture, implementation, launch |
| `/join` | Evergreen talent; candidate; submit profile | Engagement choices, conditional fields, retention wording, consent; HR/legal input | PARTIAL | No for public submission | HR/HIRING, LEGAL/PRIVACY | Architecture, implementation, launch |
| `/about` | Explain identity; clients/candidates; Contact/Work | Story, approved relationship wording, local mission, approved leaders/milestones; business source | PARTIAL | Yes | BUSINESS OWNER | Design, launch |
| `/contact` | Qualify business enquiry; prospects; submit/contact | Approved channels, address/map, social ownership, supportable response copy; business/operations | PARTIAL | Yes | BUSINESS OWNER, TECHNICAL/OPERATIONS | Implementation, launch |
| `/privacy` | General privacy transparency; public; read/contact | Counsel-reviewed notice, actual processors/cookies/contact; legal/operations | MISSING | No | LEGAL/PRIVACY | Launch |
| `/candidate-privacy` | Candidate data transparency; candidates; read/contact | Purpose, access, retention/deletion, processors, contact; legal/HR/operations | MISSING | No | LEGAL/PRIVACY, HR/HIRING | Architecture, launch |
| `/terms` | Terms of use; public; read | Counsel-reviewed terms/legal entity/contact; legal input | MISSING | No | LEGAL/PRIVACY | Launch |
| `/accessibility` | Accessibility commitment/contact; public; read/contact | Accurate statement, assistance channel, testing basis; accessibility/operations | MISSING | Draft only, not publish | TECHNICAL/OPERATIONS, LEGAL/PRIVACY | Launch |
| `/application/received` | Confirm accepted submission; candidate; retain reference | Reference, next-step wording, support route; application outcome/HR copy | MISSING | Yes without real data | HR/HIRING | Implementation |
| `/admin/*` | Manage content/recruitment; authorised staff; administer | Roles, permissions, operating workflow, content/jobs/applications/audit data; business/HR/operations | MISSING | No with real data | BUSINESS OWNER, HR/HIRING, TECHNICAL/OPERATIONS | Architecture, implementation, launch |

Legend: A = architecture, D = design, I = implementation, L = production launch. `PARTIAL` is not publication approval.

## 9. Content ownership matrix

All assignments below are **proposed operating roles**.

| Content type | Creator/maintainer | Approver | Update frequency | Version history |
| --- | --- | --- | --- | --- |
| Portfolio projects/case studies/media/credits | CONTENT/MARKETING with project leads | BUSINESS OWNER | Per project/change | Yes |
| Culture stories/media/events/employee voices | CONTENT/MARKETING with HR/HIRING | HR/HIRING and BUSINESS OWNER | Monthly/as available | Yes, including consent |
| Jobs, questions, location/shift/deadline | HR/HIRING | HR/HIRING | Per vacancy | Yes |
| Hiring process, benefits, workplace expectations | HR/HIRING | HR/HIRING and LEGAL/PRIVACY where needed | Policy change | Yes |
| Candidate privacy/retention/consent text | LEGAL/PRIVACY with HR/HIRING | LEGAL/PRIVACY | Policy/legal change | Yes, required |
| General privacy, terms, accessibility statement | LEGAL/PRIVACY with TECHNICAL/OPERATIONS | LEGAL/PRIVACY | Legal/operational change | Yes |
| Company, parent relationship, services/contact/address | BUSINESS OWNER | BUSINESS OWNER | Change-driven | Yes |
| Social/contact information | CONTENT/MARKETING / TECHNICAL/OPERATIONS | BUSINESS OWNER | Change-driven | Yes |
| Portfolio/culture asset permission records | CONTENT/MARKETING | BUSINESS OWNER | Per asset | Yes, required |

## 10. Candidate journeys

### Job-specific candidate

1. A candidate views a `published` vacancy and its deadline, role details and candidate privacy information.
2. The application form collects full name, email, phone/WhatsApp, city, portfolio/profile URL, CV, configured role questions, optional accommodation request and consent. It must not collect prohibited high-risk identifiers (PRIV-001).
3. Client-side assistance may improve completion, but server validation is authoritative. The submission shows upload-pending/scanning states and does not expose the document.
4. The platform accepts an idempotent valid submission, assigns an application reference, records consent version and sends a confirmation without sensitive attachments.
5. Authorised hiring staff can only review a cleared file, then record business-defined hiring status/internal notes. Retention/deletion follows the approved policy.

### Evergreen talent candidate

1. A candidate chooses permanent role interest, freelance/project work, internship/early-career interest or portfolio-only introduction.
2. The form requests only applicable department/specialism, experience level, availability/engagement, city/remote availability, portfolio links, CV/profile PDF, optional freelance rate range, short introduction and consent.
3. The same validation, quarantine/scanning, receipt, restricted review and retention/deletion controls apply. The route clearly says that submission does not guarantee a role or response.

## 11. Job lifecycle requirements

| State | Public behaviour | Required rule |
| --- | --- | --- |
| Draft | Not visible or indexable. | Editable by authorised staff only. |
| Scheduled | Not visible/indexable until scheduled publish time. | Exact scheduling/time-zone handling is a B decision. |
| Published | Discoverable, present in Careers/filtering, direct URL available, application enabled until close condition. | Valid `JobPosting` structured data may be emitted. |
| Closed | No new applications; direct URL must give truthful closed/expired vacancy behaviour. | Whether it shows related/open talent options is a C decision; `JobPosting` must be removed/expired. |
| Archived | Not public or indexable. | Retain internally only per approved policy. |

Closing-date rules, wording and any grace period are not supplied; do not silently choose them (DEC-006).

## 12. Application lifecycle requirements

Technical state is deliberately separate from hiring status; this is not an ATS workflow specification.

| Technical state | Meaning / public behaviour |
| --- | --- |
| Started (optional) | Only if the approved design needs resumable progress; no candidate account is implied. |
| Upload pending | File transfer/validation in progress; show recoverable status. |
| Scanning | File quarantined; no staff access or public URL. |
| Submission accepted | Data/file checks passed; create reference and send receipt. |
| Technical failure | Explain retry/support path without revealing system detail or duplicating a submission. |
| Rejected | Explain validation/scan-safe retry path; retain only as policy permits. |

Hiring status labels and transitions are **undefined HR workflow decisions**. Initial implementation need only support a business-defined status and audit history; do not invent a complex pipeline (DEC-007).

## 13. Content availability assessment

| Classification | Confirmed inputs | Gaps/constraints |
| --- | --- | --- |
| AVAILABLE | Authoritative plan; route map; intended first-release scope; raster brand references; `#30323D`/`#E8C547`; Nexa Light reference; three social URLs; MAD Alpha Designers domain. | Plan statements are requirements, not independently publishable company facts. |
| PARTIAL | Parent-company relationship direction; brand direction; local Karachi/Pakistan signal; public positioning; social/contact publication inputs. | Needs legal/business verification, source ownership and approval. |
| MISSING | Case-study source packs/media/rights/credits/outcomes; culture media and consents; jobs and policy; office/contact details; legal copy; logo vectors/favicon/font licence; 3D assets; operations/runbooks. | Cannot be fabricated. |
| REQUIRES APPROVAL | Client attribution/anonymisation; testimonials/employee quotes; benefits/compensation; address/contact/social ownership; relationship/legal entity wording; all legal/privacy copy; colour accessibility rules. | Drafting may be possible where marked, publication is not. |

## 14. Decision register

| ID | Question | Class | Reason / latest safe point | Consequence of delay | Architecture-neutral default |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Which legal entity, approved MAD Alpha relationship wording, operating locations, data-residency and cross-border obligations apply to candidate data? | A | Determines personal-data boundary and notices. Resolve before data-model/threat-model approval. | Cannot safely finalise candidate data architecture. | Keep legal fields/content configurable; do not collect/submit data. |
| DEC-002 | What candidate retention/deletion rule, access roles, reviewer ownership and lawful consent wording apply? | A | Determines records/files lifecycle and access model. Resolve before candidate-data architecture. | Retention jobs, audit scope and permissions cannot be safely designed. | No production candidate data; model policy as configurable pending approval. |
| DEC-003 | What file types/sizes, scanning failure ownership and staff MFA/identity policy are required? | A | Determines upload/quarantine and authentication threat model. Resolve before security architecture/provider criteria. | Unsafe or incomplete submission architecture. | Specify private quarantine/cleared boundaries only. |
| DEC-004 | What provider/account, budget, regional latency and existing operational-stack constraints exist? | B | Needed to select services, not to state provider-neutral architecture requirements. Resolve before provider selection/platform implementation. | Delays implementation/provider selection. | Define capability requirements only. |
| DEC-005 | Is a client-acquisition conversion workflow beyond Contact required in the first release? | B | Affects contact/lead feature implementation, not portfolio/recruitment architecture. Resolve before Contact/lead implementation. | Contact scope remains minimal. | Separate inquiry types and basic contact route only. |
| DEC-006 | What are vacancy closing dates, scheduling time zone, expired-direct-URL copy and application grace policy? | B | Needed before job lifecycle feature implementation. | Cannot finalise scheduling/closure behaviours. | Draft/published/closed/archived model; no grace period. |
| DEC-007 | Which hiring-status labels/transitions, notes visibility and HR review steps are required? | B | Needed before application-review implementation. | Admin review stays intentionally minimal. | One configurable status plus audit events; no applicant portal. |
| DEC-008 | Which launch departments, roles, job types, shifts, office/remote policy, benefits and compensation statement are publishable? | C | Determines job/culture design fidelity and content, not platform architecture. Resolve before those pages are content-complete. | Pages use approved placeholders only. | Design adaptable modules without claims. |
| DEC-009 | Which case studies/culture assets, rights, client attribution/anonymisation and employee consents are approved? | C | Determines final visual/content fidelity. Resolve before content production/design QA. | Cannot publish credible portfolio/culture. | Use labelled non-public placeholders in development. |
| DEC-010 | Is English-only acceptable for launch? | C | Affects content/design completeness; framework can remain locale-ready without building multilingual support. | Translation work may delay content launch. | English-only, subject to approval. |
| DEC-011 | Are logo vector suite, favicon, Nexa Light web licence and accessible brand-colour rules approved? | C | Required for polished, compliant public identity. Resolve before design implementation/content QA. | Cannot safely ship final identity assets. | Use supplied assets only as non-production reference. |
| DEC-012 | What legal notices, processor list, cookie/analytics consent configuration and public contact route are approved? | D | Required before public launch; core pages can be designed as placeholders. | Launch is blocked. | Do not enable non-essential analytics/cookies. |
| DEC-013 | Which providers/accounts, DNS/domain control, email authentication, backup restore evidence, monitoring/on-call ownership and incident contacts are live? | D | Production operating readiness only. Resolve before launch gate. | No safe production launch. | None; no deployment. |
| DEC-014 | Have public content, device/performance/accessibility/security checks and search/structured-data validation passed? | D | Required launch evidence, not a current architecture decision. | Launch is blocked. | None; do not publish. |

## 15. Provider requirements (no providers selected)

| Capability | Minimum selection requirements |
| --- | --- |
| Hosting | Next.js support, regional/global delivery, preview isolation, environment separation, security headers and observability. |
| PostgreSQL | Managed service, backups and point-in-time recovery, suitable connection strategy/latency, supported migrations and production reliability. |
| Candidate file storage | Private objects, signed authorised access, separate quarantine/clean areas, lifecycle deletion, scanning integration and auditability. |
| Transactional email | Domain authentication compatible with SPF/DKIM/DMARC, delivery monitoring and safe confirmation delivery. |
| Rate limiting | Distributed production enforcement and support for idempotency/duplicate-protection patterns. |
| Malware scanning | Quarantine workflow, asynchronous result handling and reliable explicit failure states. |
| Monitoring | Error reporting, structured logs, uptime monitoring and owned alerts. |

## 16. Launch-readiness content checklist

| Group | Needed input | Latest required gate |
| --- | --- | --- |
| Brand | Approved SVG variants, favicon, clear-space/use rules, font licence/substitute, accessible colour rules. | Design/content QA |
| Portfolio | At least three complete approved case studies: media rights, client/anonymisation, brief, approach, outcome and credits. | Content QA / launch |
| Culture | Approved real media, story/principles, department material, quote/name/photo consent, confirmed growth/workplace facts. | Content QA / launch |
| Hiring | Launch jobs, departments/types/location/shifts, questions, deadlines, process, benefits/compensation policy, review team and retention rules. | Careers implementation / launch |
| Company | Legal entity, approved parent wording, verified services, contact channels/address/map and social ownership. | Content QA / launch |
| Legal/privacy | Counsel-approved privacy, candidate privacy, terms, accessibility, cookie/analytics position and candidate contact route. | Launch |
| Operations | Provider/account owners, domain/DNS, email authentication, backup/restore proof, monitoring/on-call, incident/support contacts. | Launch |

## 17. Phase 0C inputs

Phase 0C must not start without approval of this Phase 0B record. Its focus should be a provider-neutral architecture and threat-model decision using DEC-001 through DEC-003 as mandatory inputs, then DEC-004 as the provider-selection constraint set. It should explicitly map data classification, trust boundaries, staff roles, candidate upload/quarantine/scan lifecycle, retention/deletion, environment isolation and failure/operating controls before any implementation phase.

## Verification

- No application code was created; no packages were installed; no provider, infrastructure, deployment or production configuration was created.
- No production content was fabricated. Missing or approval-bound material is explicitly classified above.
- Architecture blockers (A) are distinct from pre-implementation (B), content/design (C) and pre-production (D) decisions.
- Scope remains the plan's recommended first release; deferred features are recorded without expansion.

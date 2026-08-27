# Phase 0A: Repository, Requirements and Asset Discovery

**Status:** PASS WITH ISSUES  
**Date:** 2026-08-27  
**Scope:** Read-only repository and supplied-asset discovery. No website implementation was started.

## 1. Executive summary

This is a clean planning-and-brand-assets repository, not an existing website or application scaffold. The authoritative product plan is present in `PYRAMID_DESIGNS_WEBSITE_PLAN.md`; project instructions are present in `AGENTS.md`. There are four raster logo/brand images and a text file with three Pyramid Designs social URLs plus the MAD Alpha Designers domain.

No runtime, source code, dependency manifest, lockfile, test suite, CI workflow, environment file, deployment configuration, database, authentication, storage, email, analytics, CMS, or monitoring configuration exists. Accordingly, no installed technology or source architecture can be evidenced. The Phase 0 content/decision gate is not yet ready for approval because material launch content, legal/HR decisions, approved vector assets, and provider constraints are absent.

## 2. Repository status

| Item | Observation |
| --- | --- |
| Classification | Planning documents and brand assets only; no website, prototype, package, or multiple-package structure. |
| Root files | `.gitignore`, `AGENTS.md`, `PYRAMID_DESIGNS_WEBSITE_PLAN.md`, four logo images, and `socials.txt`. |
| Source of truth | The website plan is explicitly marked planning-only and is the product specification for later approved phases. |
| Project instructions | `AGENTS.md` requires phase gates, server-first architecture, security/accessibility/reliability, and explicit approval before production deployment or DNS changes. |
| Other planning/architecture/design/deployment files | None found beyond the website plan and `AGENTS.md`; no ADR directory or ADR records exist. |

## 3. Current technology stack

No application technology is installed or actually used.

| Category | Installed and used | Planned only in the website plan |
| --- | --- | --- |
| Framework/runtime/language | None; no package manifest, lockfile, source, or runtime declaration. | Next.js App Router, TypeScript, React Server Components. |
| Styling/UI/motion/3D | None. | Tailwind CSS v4, Motion, React Three Fiber, Drei; GSAP only if later justified. |
| Data/auth/storage | None. | PostgreSQL, Prisma, private/public object storage, staff authentication with MFA, role-based access. |
| Validation/background processing | None. | Zod; queue, malware scanning, retention/deletion jobs. |
| Email/analytics/monitoring | None. | Transactional email, privacy-respecting analytics if approved, error/uptime monitoring and structured logs. |
| Testing/linting/formatting/CI/CD | None. | Future automated test, security, accessibility, and deployment checks. |

The planned stack is a proposal, not a repository decision implemented in code or configuration. Exact versions and providers remain deliberately unselected.

## 4. Dependency inventory

There is no `package.json`, package-manager lockfile, or other dependency manifest. Therefore:

- No dependencies are installed, used, redundant, stale, conflicting, or upgradeable in this repository.
- No package-manager or runtime can be identified.
- No dependency audit was applicable; no packages were installed, removed, or upgraded.

## 5. Source architecture

No application source files exist. Routing, server/client component boundaries, data access, APIs/server actions, shared components, feature modules, environment handling, error handling, authorization, storage access, logging, and tests are **not yet implemented** and cannot be assessed.

The website plan contains intended routes, a server-first architecture, candidate-upload workflow, authorization model, and quality requirements. Those are requirements for later architecture/design approval, not existing controls. There is no current evidence of client-side authentication, excessive hydration, scattered database access, unsafe upload handling, or secrets reaching client bundles because there is no application bundle or code.

## 6. Existing infrastructure

No Vercel, hosting, domain, database, storage, email, CI, deployment-script, container, or monitoring configuration was found. No `.env` or `.env.example` files exist, so there are no environment-variable names to classify. No secret values were read or recorded.

The repository's `.gitignore` covers common build outputs, local environment files, Vercel metadata, private key extensions, local databases, logs, and editor/OS files. This is a reasonable baseline only; it is not evidence of configured infrastructure.

## 7. Asset inventory

### Brand

| Location | Type and dimensions | Apparent purpose | Readiness and follow-up |
| --- | --- | --- | --- |
| `pyramid- logo.jpg` | JPEG, 1671 x 1607, 129 KB | Full-colour logo on white background. | Reference-quality raster only; requires approved vector master and web derivatives. |
| `pyramid-bgremove.png` | PNG, 3214 x 2632, 127 KB, includes transparent pixels | Full-colour logo on transparent background. | Useful source reference, but still raster and very large in pixel dimensions; requires approved vector master and responsive raster derivatives. |
| `pyramid-colour.jpg` | JPEG, 1790 x 1499, 195 KB | Dark mark/wordmark on yellow background. | Reference-quality raster only; requires approved light/dark variant approval and conversion/optimization. |
| `pyramiddesigns.jpg` | JPEG, 2416 x 1538, 367 KB | Brand board showing light/dark variants, colour values and the Nexa Light reference. | Evidence of identity guidance, not a production brand guide or vector suite. |

No favicon, SVG/vector source, font files or licence evidence, portfolio images/video/models, culture/recruitment media, case-study text, client approvals, contact details, office details, or legal documents were supplied. No asset was modified.

### Company and social information

`socials.txt` supplies these unverified publication inputs:

- Facebook: `https://www.facebook.com/pyramiddesignsbymadalpha/`
- Instagram: `https://www.instagram.com/pyramiddesigns.ch1`
- LinkedIn: `https://www.linkedin.com/company/pyramiddesignsofficial/`
- Parent-company domain: `madalphadesigners.com`

The repository contains no other company information or parent-company wording. No external site was scraped or used to source claims, statistics, names, testimonials, guarantees, or content.

## 8. Brand findings

### Confirmed by supplied materials

- The visual mark combines three pyramid triangles with an interlocking geometric P/D-style form.
- The brand board visibly labels charcoal `#30323D` and yellow `#E8C547` and shows matching swatches. Raster sampling also finds `#30323D`/nearby JPEG `#30323E` and `#E8C547` in supplied assets.
- The brand board states `FONT: Nexa Light`.
- Light, dark, yellow-background, and transparent-raster presentations are supplied.

### Interpretation from the website plan

- The intended public positioning, Karachi/Pakistan local focus, parent-company attribution, shape rules, dark/light theme behaviour, and proposed geometric interface language are requirements in the plan, not independently verified company facts.
- The plan calls for an approved SVG master and horizontal, stacked, mark-only, light, and dark variants before implementation.

### Requires approval or evidence

- Ownership/usage rights for supplied marks; an editable vector source; final logo clear-space/minimum-size rules; favicon assets; and Nexa Light web-font licence and permitted delivery method.
- Whether the exact planned colours are fixed for all UI uses, including accessible text/background combinations. JPEG files include compression-adjacent `#30323E`; this is not a conflicting identity colour claim.

## 9. Parent-company/source findings

The only supplied parent-company reference is `madalphadesigners.com`, and the website plan proposes the wording: “Pyramid Designs, a MAD Alpha Designers company.” The plan also states that Pyramid Designs is Pakistan-focused and must not imply it has a US office.

The legal entity name, approved relationship wording, facts suitable for publication, ownership, office location, and contact channels are not supplied. Any claim or material derived from the parent site requires explicit verification and content approval before publication.

## 10. Security observations

Actual findings:

- No tracked filenames match common environment/credential/private-key naming patterns; no `.env` files were present.
- No application, server endpoint, upload flow, database connection, public storage configuration, client bundle, or deployment configuration exists, so no active application security control can be validated.
- The planned candidate-data workflow is security-sensitive but remains unimplemented. It must not be treated as an existing protection.

No credentials or secret values were reproduced in this audit.

## 11. Git and repository health

| Check | Result |
| --- | --- |
| Repository | Git repository on `main`, tracking `origin/main`. |
| Working tree | Clean before this audit document was created; no pre-existing modified, staged, untracked, or ignored files were reported. |
| Latest commit | `b32e2a1` — `chore: initialize Pyramid Designs project` (2026-08-27). |
| Tracked files | Eight baseline files: instructions, plan, `.gitignore`, four images, and `socials.txt`. |
| Git object integrity | `git fsck` completed without reported errors. |
| Ignored tracked files | None reported. |
| Build/generated artifacts | None tracked. |
| Lockfile consistency | Not applicable; no manifest or lockfile exists. |
| Tracked secrets | None found by filename-pattern review; values were not searched or exposed. |

## 12. Plan-versus-repository gap analysis

### Available now

- Authoritative written product plan covering audiences, intended information architecture, security, accessibility, responsive behaviour, proposed delivery gates, and first-release scope.
- Project-level phase and production-safety instructions.
- Raster references for the charcoal/yellow Pyramid Designs identity and stated Nexa Light association.
- Three Pyramid Designs social URLs and a parent-company domain for owner verification.

### Partially available

- Brand identity: visual direction is available, but production vector assets, licence evidence, variant approval, favicon, and accessibility-safe colour-use decisions are missing.
- Parent-company relationship: a domain and proposed wording are available, but legal/publication verification is missing.
- Product and technical architecture: requirements are detailed, but no approved ADRs, provider selections, cost/region/data-residency decisions, or implementation baseline exist.

### Not yet available

- Existing website/application, dependencies, runtime, source architecture, test/CI/deployment pipeline, environment configuration, hosting/domain configuration, database, authentication, storage, email, analytics, CMS, monitoring, or operational runbooks.
- Approved portfolio/case-study media and facts, culture/employee media and consent, recruitment content, job data, department owners, hiring policy, office/contact information, legal entity wording, legal notices, candidate retention/deletion policy, and approved social/account ownership.
- 3D assets, performance validation on representative devices, and any approved design prototypes.

## 13. Unknowns register

### Blocks architecture

1. Approved launch scope and the provider constraints that select hosting, database, storage/quarantine/scanning, email, authentication, monitoring, and rate-limiting services.
2. Legal entity, approved parent-company relationship wording, operating location(s), and data-residency/retention requirements affecting the candidate-data model.
3. Initial hiring workflow: review roles, MFA/identity provider, HR recipients, candidate retention/deletion process, accepted file types/limits, and ownership of operational alerts.
4. Whether client acquisition requires a full conversion workflow in the first release or remains secondary to work/careers content.

### Blocks content

1. Approved logo/vector suite, font licensing, final tone of voice, social-account ownership, contact channels, address, and legal company facts.
2. At least the planned launch-quality case studies: approved names/anonymisation, media rights, credits, outcomes, and source materials.
3. Approved culture media, employee quote/name/role/photo consent, benefits, work arrangements, shifts, departments, job descriptions, deadlines, and hiring-process copy.
4. Legal-review owner and approved privacy, candidate privacy, terms, accessibility, cookie, and equal-opportunity text.

### Blocks production launch only

1. Approved production providers/accounts, DNS/domain control, transactional-email authentication, backups/restore evidence, monitoring/on-call ownership, and incident contacts.
2. Production content QA, accessibility review, performance/device verification, security review, analytics consent configuration, and search/structured-data validation.

## 14. Risks requiring later investigation

- Starting platform work before the architecture/content gate would turn unapproved provider, retention, and legal assumptions into costly rework.
- Using the raster marks directly would create inconsistent visual quality and cannot prove appropriate web-font or logo usage rights.
- Careers and CV processing introduce sensitive personal-data and malware risks; the plan's required private-storage, scanning, authorization, retention, audit, and notification controls must be architected before any form accepts data.
- The proposed 3D experience must be prototyped against its stated performance and non-WebGL/reduced-motion/save-data fallbacks before it becomes a release commitment.
- Social and parent-company references are supplied as links/domains only; publication authority and current accuracy need confirmation.

## 15. Recommended inputs for Phase 0B

1. Owner-approved content matrix: exact services, launch departments/job types, client-acquisition priority, case-study/culture asset owners, and publication approvals.
2. Legal/HR operating decisions: legal entity and parent wording, location/contact details, recruitment policy, consent/retention/deletion rules, reviewers, service levels, and legal-review owner.
3. Brand package: editable approved SVG suite, favicon, Nexa Light licence evidence or approved substitute, and final accessibility-safe colour rules.
4. Technology/provider constraints: existing MAD Alpha operational stack, budget, Pakistan latency/data-residency needs, chosen account owners, and production/preview data boundaries.

## Verification and change boundary

- Read all available project instructions and the website plan; no other repository planning, architecture, design, deployment, environment, manifest, CI, or README files exist.
- Performed lightweight read-only repository, Git, text, configuration-name, and image-metadata checks only.
- No implementation files were intentionally changed, no packages installed or upgraded, and no deployment, hosting, DNS, authentication, database, or provider action occurred.
- This document contains no secret values.
- The only change made for Phase 0A is this discovery record.

# Pyramid Designs Website Plan

Status: Planning only. No implementation, deployment, production configuration, or publishing is included in this phase.

## Design read

Reading this as: a portfolio and employer-brand website for Pakistani clients and multidisciplinary talent, with a clean geometric studio language, leaning toward asymmetric editorial layouts, restrained brand color, and purposeful 3D interaction.

Design dials:

- `DESIGN_VARIANCE: 8` - asymmetric enough to feel like a creative studio, while keeping navigation and application flows predictable.
- `MOTION_INTENSITY: 7` - cinematic in selected moments, not on every component.
- `VISUAL_DENSITY: 3` - work should have gallery-like space, while careers content remains easy to scan.

## 1. Product goals

The site has two equal conversion goals:

1. Prove the quality and breadth of Pyramid Designs through credible case studies.
2. Attract permanent employees, freelancers, contractors, and project-based collaborators across sales, marketing, design, development, engineering, and future departments.

Supporting goals:

- Establish Pyramid Designs as a Pakistan-focused company with the credibility of MAD Alpha Designers behind it.
- Communicate a real work culture through evidence: team stories, events, recognition, processes, workspace media, and employee voices.
- Let staff publish projects and job openings without code changes.
- Accept applications securely, track their status, and retain candidate data only as long as needed.
- Be fast and usable even when WebGL, high-performance hardware, or motion is unavailable.

## 2. Brand interpretation

### Existing identity

- Logo concept: interlocking P and D letterforms contained by three pyramid forms.
- Primary charcoal: `#30323D`.
- Primary yellow: `#E8C547`.
- Existing wordmark font: Nexa Light.
- Public positioning: captivating visuals, animation, and user-friendly websites.
- Local signal: Karachi, Pakistan.
- Parent-company relationship: MAD Alpha Designers provides history and international credibility, but Pyramid Designs needs its own local voice.

### Proposed visual system

- Base surfaces: off-white and near-charcoal, never pure white or pure black.
- Accent: Pyramid yellow only. No additional accent colors or generic purple glows.
- Typography: preserve Nexa Light for the wordmark. Use a modern geometric sans such as Satoshi or Cabinet Grotesk for interface and editorial display copy, subject to licensing review.
- Shape rule: project media and major panels use one consistent 16px radius. Buttons are pill-shaped. Form fields use an 8px radius. These roles stay consistent across the site.
- Graphic language: cropped triangles, interlocking paths, diagonal image masks, depth, and structured negative space derived from the logo.
- Photography: real work, real people, real office moments, and real events. No generic corporate stock imagery for culture or recruitment.
- Theme: system-aware light and dark modes using the same charcoal and yellow brand identity. Each page keeps one coherent theme during a visit.

### Brand guardrails

- Do not stretch, redraw, rotate, or recolor the supplied logo arbitrarily.
- Create a clean SVG master from the supplied artwork before implementation, with approved horizontal, stacked, mark-only, light, and dark variants.
- Do not reuse unverified statistics, reviews, guarantees, or portfolio claims from the parent website.
- State the relationship clearly: "Pyramid Designs, a MAD Alpha Designers company."
- Localize voice and hiring information for Pakistan. Do not imply that Pyramid Designs is a US office.

## 3. Information architecture

### Primary navigation

- Home
- Work
- Culture
- Careers
- About
- `Join us` primary action

The desktop navigation must fit on one line in a 64 to 72px header. Mobile uses an accessible full-screen menu with the same order.

### Route map

```text
/
|-- /work
|   |-- /work/[project-slug]
|-- /culture
|-- /careers
|   |-- /careers/[job-slug]
|-- /join
|-- /about
|-- /contact
|-- /privacy
|-- /candidate-privacy
|-- /terms
|-- /accessibility
|-- /application/received
|-- /admin                 private, staff only
    |-- /admin/projects
    |-- /admin/jobs
    |-- /admin/applications
    |-- /admin/content
    |-- /admin/audit
```

`/careers` is for current permanent and contract openings. `/join` is the evergreen talent network for open applications, freelancers, and portfolio submissions.

## 4. Page plans

### Home

Purpose: explain the company in one glance, prove the work, and split visitors cleanly between client and talent journeys.

Sections:

1. Asymmetric hero
   - Left: concise value proposition and two distinct actions: `View work` and `Join us`.
   - Right: interactive 3D Pyramid mark assembled from charcoal and yellow forms.
   - Suggested direction: "Ideas, built to be seen and used."
2. Selected work
   - One large featured case study followed by an offset pair, not three equal cards.
   - Media-first, with service, sector, and outcome only when verified.
3. Capability ribbon
   - One restrained marquee on this page only, listing actual disciplines such as brand, animation, web, software, content, and growth.
4. Parent-company credibility
   - Short factual relationship statement and link to MAD Alpha Designers.
5. Culture preview
   - Real team and event media arranged as an irregular image wall.
   - Links to the dedicated Culture page.
6. Open roles
   - Current openings pulled from the jobs database.
   - Clear empty state when no permanent roles are open, with an invitation to join the talent network.
7. Final choice
   - Two visually distinct paths: commission a project or join the team.

Mobile fallback:

- Hero stacks with copy first and a lightweight 3D or poster visual second.
- Work becomes a vertical editorial feed.
- Capability ribbon becomes a static, wrapping list under reduced motion.
- Both primary journeys remain visible before deep scrolling.

### Work index

Purpose: let prospects and candidates assess quality quickly.

Components:

- Featured project cover with large media.
- Filter bar for discipline and sector, implemented as accessible buttons with URL query parameters.
- Masonry-style visual grid on large screens using stable CSS grid placements.
- On-hover preview for pointer devices: short video loop or image sequence, never motion required to understand the item.
- Clear no-results state and reset action.
- Pagination or load-more using crawlable links, not infinite scroll alone.

Initial disciplines:

- Branding and graphic design
- Motion and animation
- Web design and development
- Software and engineering
- UI and UX
- Marketing and content
- 2D and 3D work

Mobile fallback:

- One-column cards with fixed aspect ratios and captions below media.
- Filters open in an accessible bottom sheet or disclosure panel.
- Video previews require tap and respect data-saving preferences.

### Project case study

Purpose: turn images into evidence of process and results.

Content sequence:

1. Project title, client or approved anonymized descriptor, year, discipline, and one-sentence brief.
2. Hero image or optimized showreel.
3. Challenge and context.
4. Approach and selected process artifacts.
5. Final work gallery using mixed full-width, paired, and detail crops.
6. Outcome, using only verified qualitative or quantitative evidence.
7. Credits with clear internal and freelance attribution.
8. Related project and relevant contact action.

3D option:

- A project-specific interactive object only when the work itself is spatial, packaging, 3D, or product related.
- Standard projects use image and video. 3D is not forced into every case study.

### Culture

Purpose: show what working at Pyramid Designs is actually like.

Sections:

1. Culture manifesto with one strong team film or photographic scene.
2. Principles expressed through real examples, not generic value cards.
3. "A week at Pyramid" media timeline covering collaboration, reviews, learning, events, and recognition.
4. Department map showing how sales, marketing, design, development, and engineering collaborate.
5. Employee voices, limited to short approved quotes with real names, roles, and consent.
6. Workspace, events, sports, celebrations, and employee-recognition gallery.
7. Growth and learning: onboarding, mentorship, review cadence, and career development, once confirmed by HR.
8. Link to current roles and the evergreen talent network.

3D interaction:

- The department map forms a low-poly pyramid of connected disciplines.
- Selecting a face reveals that department's role in a project lifecycle.
- Keyboard and screen-reader users receive the same content through an adjacent semantic list.

Mobile fallback:

- The department map becomes a 2D accordion with an optional tap-to-rotate model on capable devices.
- Timeline becomes vertical and media uses responsive crops.

### Careers

Purpose: publish live openings and answer practical candidate questions.

Components:

- Search and filters for department, work arrangement, employment type, and experience level.
- Job cards with title, department, location, shift or schedule, type, and closing date.
- Plain-language hiring process.
- Benefits and workplace expectations only where confirmed.
- Equal-opportunity and accessibility statement approved by HR or legal counsel.
- Empty state that sends candidates to `/join` without pretending roles are open.

### Job detail

Content:

- Title, team, location, on-site or hybrid status, shift, employment type, and application deadline.
- Role purpose.
- Responsibilities.
- Required and preferred qualifications, clearly separated.
- Salary range or compensation statement when company policy permits.
- Hiring process and expected timeline.
- Accessible application form tied to the immutable job ID.
- Valid `JobPosting` structured data with automatic expiry.

Application fields:

- Full name
- Email
- Phone or WhatsApp number
- City
- Portfolio or professional profile URL
- CV upload
- Short role-specific questions configured per job
- Accommodation request option with privacy-conscious wording
- Candidate privacy consent

Do not collect CNIC, passport, banking information, family data, or other high-risk identifiers at the application stage.

### Join us

Purpose: accept candidates when there is no exact vacancy and build a freelance network.

Entry choices:

- Permanent role interest
- Freelance or project-based work
- Internship or early-career interest
- Portfolio-only introduction

Conditional fields:

- Department and specialism
- Experience level
- Availability and preferred engagement type
- City and remote availability
- Portfolio links
- CV or profile PDF
- Optional rate range for freelancers
- Short introduction
- Consent to retain the profile for a clearly stated period

The form must explain that submission does not guarantee a role or response. Candidates receive a reference number and confirmation email, without sensitive attachments.

### About

Purpose: explain identity, parent-company relationship, local focus, and operating model.

Sections:

- Pyramid Designs story.
- Relationship to MAD Alpha Designers.
- Pakistan-focused mission and services.
- Leadership and team only where names and photos are approved.
- Factual milestones, without invented numbers.
- Contact and office information after address verification.

### Contact

- Separate inquiry types for project, partnership, and general contact.
- No job applications through this form. Point candidates to Careers or Join us.
- Business email, approved phone or WhatsApp channel, office address, map link, and social links.
- Spam protection and response-time copy only if operationally supportable.

### Legal and trust pages

- General privacy notice.
- Candidate privacy notice covering purpose, access, retention, deletion, processors, and contact route.
- Terms of use.
- Accessibility statement.
- Cookie controls only for non-essential cookies actually used.

Pakistan-focused legal copy should be reviewed by qualified local counsel before launch. If international candidates or analytics are in scope, the review must also cover the relevant cross-border obligations.

## 5. Shared component inventory

### Global shell

- Responsive header and accessible mobile menu
- Logo system and parent-company attribution
- Footer with navigation, contact, social links, legal links, and location
- Theme control, if both themes remain equally on-brand after design testing
- Skip link, focus management, and route announcements
- Global error boundary and not-found page

### Content components

- Project hero
- Project cover and media preview
- Responsive image, video, and showreel components
- Discipline filters
- Culture media wall
- Timeline
- Employee quote
- Department map
- Job card
- Job filter panel
- Rich-text content renderer with a strict element allowlist
- Related-content module
- Parent-company trust block

### Form components

- Text, email, phone, URL, select, radio, checkbox, textarea, and file upload
- Visible labels, helper text, field-level errors, and summary error block
- Upload progress, scanning state, rejection state, and retry
- Submission loading state and duplicate-submission protection
- Success receipt with application reference
- Consent version capture

### Admin components

- Role-protected navigation
- Project editor with preview and publish controls
- Job editor with draft, scheduled, published, closed, and archived states
- Application queue with filters and safe file access
- Candidate status and internal notes
- Retention and deletion controls
- Audit trail

## 6. 3D system

### 3D principles

- Every 3D scene must communicate brand geometry, project depth, or team relationships.
- No full-site canvas behind all content.
- No animation may block navigation, text selection, forms, or scrolling.
- Static content and metadata render on the server before the 3D client bundle loads.
- The site must remain complete when JavaScript or WebGL is unavailable.

### Scene A: assembled Pyramid mark

Location: Home hero.

Behavior:

- The three yellow pyramid forms and charcoal P/D paths assemble on entry.
- Pointer movement creates a small camera shift on desktop.
- Scroll moves the model from exploded to aligned state, communicating ideas becoming finished work.
- Selecting the model gives a brief, optional detail view. It is not required navigation.

Fallbacks:

- Reduced motion: fully assembled static model.
- No WebGL or low-power device: optimized AVIF or WebP poster.
- Save-data mode: poster only.

### Scene B: discipline pyramid

Location: Culture page.

Behavior:

- Each face represents a department or collaboration group.
- Hover, focus, or tap highlights one face and updates semantic content beside the canvas.
- The model illustrates the project lifecycle, not organizational rank.

Fallbacks:

- Accessible list and 2D diagram are always present.
- On small screens, 3D is optional and loads after user interaction.

### Scene C: selected spatial case studies

Location: only on eligible project pages.

Behavior:

- Orbit is constrained and damping is enabled.
- An explicit control opens fullscreen viewing.
- Download size and device capability determine whether the live model or poster loads.

### Technical implementation

- Three.js through React Three Fiber and Drei, pinned to reviewed stable versions.
- GLTF or GLB assets compressed with Draco or Meshopt.
- KTX2 or Basis textures, carefully limited resolution, and no uncompressed 4K textures by default.
- Dynamic import for every canvas.
- Device pixel ratio clamped, shadows and post-processing disabled on low tiers.
- Context-loss recovery and static fallback.
- Motion for UI transitions. GSAP only if a tested scroll-pinned story genuinely needs it.
- Never let Motion, GSAP, and Three.js compete for the same element or animation loop.

3D performance budgets:

- Home hero compressed model target: under 700KB, excluding poster.
- Initial 3D JavaScript must not delay text or primary actions.
- Target stable 50 to 60fps on representative mid-range Android hardware.
- Canvas pauses when offscreen or the tab is hidden.

## 7. Responsive and interaction matrix

| Capability | Large desktop, 1280px+ | Tablet and small laptop, 768-1279px | Mobile, below 768px |
|---|---|---|---|
| Navigation | Single-line header | Condensed header | Full-screen accessible menu |
| Hero | Two-column with live 3D | Balanced split or stacked | Copy first, poster or opt-in 3D |
| Work grid | Asymmetric 12-column grid | Two-column editorial grid | One-column feed |
| Hover previews | Enabled for precise pointers | Only when hover exists | Tap-controlled media |
| Culture map | Live 3D plus semantic panel | Simplified 3D | 2D accordion, optional 3D |
| Forms | Two-column only for short related fields | Mostly one column | One column, 16px minimum input text |
| Job filters | Inline or side panel | Collapsible panel | Bottom sheet or disclosure |
| Motion | Full approved choreography | Reduced parallax distance | Short transforms, no scroll hijack |

Additional adaptations:

- `prefers-reduced-motion`: remove parallax, autoplay, scrubbed movement, and magnetic effects.
- `prefers-reduced-transparency`: replace translucent panels with opaque surfaces.
- `prefers-contrast`: increase borders and text contrast.
- `navigator.connection.saveData`: do not load 3D, autoplay video, or high-resolution sequences.
- Keyboard: every menu, filter, gallery control, dialog, and form is fully operable.
- Touch targets: minimum 44 by 44 CSS pixels.

## 8. Recommended production architecture

### Front end

- Next.js App Router with TypeScript and React Server Components.
- Use the current reviewed stable release at implementation time and pin exact dependency versions.
- Tailwind CSS v4 with semantic CSS variables for brand tokens.
- Motion for isolated client-side interface animation.
- React Three Fiber and Drei for isolated 3D scenes.
- `next/image`, optimized video delivery, self-hosted or licensed fonts through `next/font`.
- Server-render all indexable content. Client components are limited to interaction leaves.

### Data and content

- PostgreSQL as the system of record.
- Prisma for schema, migrations, and type-safe server access.
- Private object storage for application documents and public optimized storage for portfolio media.
- A custom, staff-only admin surface keeps portfolio, jobs, and applications in one permission model.
- Background queue for email, media processing, malware scanning, retention, and deletion jobs.

Suggested core records:

- `User`, `Role`, `Session`
- `Project`, `ProjectMedia`, `ProjectCredit`, `Discipline`, `Sector`
- `CultureStory`, `TeamMember`, `Testimonial`, `SiteSetting`
- `Job`, `JobQuestion`, `JobLocation`
- `Application`, `ApplicationAnswer`, `CandidateFile`, `CandidateConsent`
- `ApplicationStatusEvent`, `InternalNote`, `AuditEvent`

### Deployment topology

- Vercel for the Next.js application and edge delivery.
- Managed PostgreSQL with point-in-time recovery.
- Private S3-compatible object storage with quarantine and clean zones.
- Managed Redis for distributed rate limiting and idempotency.
- Transactional email provider with SPF, DKIM, and DMARC alignment.
- Containerized malware-scanning worker or an equivalent managed scanner. CVs must not be made available to staff until scanning succeeds.
- Error monitoring, uptime monitoring, structured logs, and alerting.

The final provider selection should be made before implementation based on cost, Pakistan-region latency, data residency, and the existing MAD Alpha operational stack.

## 9. Secure application workflow

```text
Candidate requests upload
  -> server validates form intent and issues short-lived upload permission
  -> browser uploads directly to private quarantine storage
  -> server validates size, extension, MIME type, and file signature
  -> scanner processes the object
  -> clean file moves to restricted storage
  -> application becomes reviewable
  -> HR receives a notification with no attachment
  -> every view, download, status change, and deletion is audited
  -> retention job deletes expired records and files
```

Controls:

- Prefer PDF for CVs. If DOCX is accepted, treat it as higher risk and scan it.
- Maximum file size defined and enforced at proxy, storage, and application layers.
- Random object keys, private buckets, short-lived signed download URLs, and no public candidate paths.
- File content is never executed, rendered inline with active content, or attached to notification email.
- Strict allowlist for types and signatures. Rename files on storage.
- Cloudflare Turnstile or equivalent privacy-conscious bot protection.
- Honeypot, submission timing checks, per-IP and per-identity rate limits, and server-side duplicate detection.
- Zod validation on the server. Client validation is only a convenience.
- Same-origin checks, CSRF protection where relevant, secure cookies, and idempotency keys.
- Candidate consent text is versioned and stored with timestamp and source.
- Deletion and correction requests have an owned internal process.

## 10. Authorization and admin security

- Staff authentication with mandatory MFA for administrators and HR reviewers.
- Server-side role checks on every mutation and sensitive read.
- Suggested roles: `CONTENT_EDITOR`, `HIRING_REVIEWER`, `HIRING_MANAGER`, `ADMIN`, and `AUDITOR`.
- Content editors cannot access candidate data.
- Hiring reviewers cannot change site configuration or publish projects.
- Candidate documents require a fresh authorization check when a signed URL is issued.
- Database policies or equivalent controls provide defense in depth.
- Immutable audit events capture actor, action, target, time, and safe request context.
- No secrets in client bundles, repository history, analytics properties, or logs.
- Preview deployments must not use unrestricted production candidate data.

## 11. Web security baseline

- Strict Content Security Policy with nonces and an explicit source allowlist.
- HSTS, `X-Content-Type-Options: nosniff`, restrictive `Permissions-Policy`, and safe referrer policy.
- Frame protection through CSP `frame-ancestors`.
- Dependency updates and automated vulnerability scanning.
- Sanitized rich text with no arbitrary HTML from the admin editor.
- Parameterized database access through the ORM, with raw SQL reviewed separately.
- Generic public errors and structured private diagnostics without candidate content.
- Abuse limits on all public forms and preview endpoints.
- Backups, restore testing, incident runbook, and credential rotation procedure.

## 12. Accessibility requirements

- WCAG 2.2 AA minimum.
- Semantic landmarks, logical heading order, skip link, and visible focus states.
- Body and form text contrast at least 4.5:1.
- Captions and transcripts for culture and project videos.
- Meaningful alt text managed with every media record.
- No information available only through color, hover, motion, or 3D position.
- Form errors are linked to inputs and announced.
- Focus returns correctly after dialogs and mobile panels close.
- Screen-reader alternative for every canvas.
- Test with keyboard, NVDA or VoiceOver, high zoom, reduced motion, and forced colors.

## 13. SEO and discovery

- Human-readable slugs, canonical URLs, XML sitemap, robots rules, and correct redirects.
- Unique title, description, OG image, and social card per project and job.
- `Organization` and verified `LocalBusiness` structured data.
- `CreativeWork` or suitable project markup where valid.
- `JobPosting` structured data for active roles, removed or expired promptly when closed.
- Server-rendered project copy and descriptive media metadata.
- Internal linking among work, disciplines, careers, and culture.
- English-first launch. Add Urdu only when content ownership and translation QA are available. Do not ship incomplete machine-translated pages.

## 14. Analytics and operational measurement

Track only decisions the business can act on:

- Work viewed and case-study completion.
- Project inquiry started and completed.
- Career search and filter use.
- Job detail viewed.
- Application started, upload failed, application completed.
- Talent-network submission by engagement type.
- Core Web Vitals by route and device class.

Never send CV contents, names, emails, phone numbers, free-text answers, or file names to analytics. Use a privacy-respecting analytics configuration and a consent mechanism if non-essential tracking is enabled.

## 15. Content required before production

Brand:

- Approved vector logo suite and favicon.
- Font files or confirmed licensing.
- Final tone-of-voice guidance.

Work:

- At least 6 launch-quality projects, with 3 deep case studies.
- Approved client names, media rights, credits, and outcome statements.
- Optimized originals for images, video, and eligible 3D models.

Culture:

- Real office and event photography.
- One team film or enough footage to edit a short culture reel.
- Approved employee quotes, names, roles, and photo consent.
- Confirmed benefits, work arrangements, shifts, and hiring process.

Hiring:

- Department list and owners.
- Job template and approval workflow.
- Candidate retention period and deletion process.
- HR notification recipients and service-level expectations.
- Approved candidate privacy notice.

Company:

- Verified legal entity name, office address, contact channels, and parent-company wording.
- Approved social URLs.
- Legal review owner.

## 16. Delivery phases and gates

### Phase 0: discovery and content audit

- Confirm audiences, services, departments, hiring workflow, legal entity, and operating location.
- Inventory portfolio and culture assets.
- Approve site map, design direction, content ownership, and provider constraints.

Gate: content matrix and information architecture approved.

### Phase 1: design system and prototype

- Vectorize and normalize brand assets.
- Build tokens, typography, spacing, component states, and both color modes.
- Prototype Home, Work, Culture, Careers, and form flows at desktop and mobile widths.
- Prototype the hero 3D scene with a real performance budget.

Gate: visual design, mobile behavior, motion, and reduced-motion fallbacks approved.

### Phase 2: platform foundation

- Set up Next.js, database schema, migrations, storage boundaries, admin authentication, roles, logging, monitoring, CI, and test environments.
- Establish preview data that contains no real candidate information.

Gate: threat model and architecture review complete.

### Phase 3: public experience

- Build Home, Work, case studies, Culture, About, Contact, legal pages, SEO, and optimized media delivery.
- Add content admin and preview workflows.

Gate: content QA, accessibility pass, responsive pass, and performance baseline.

### Phase 4: careers and applications

- Build job publishing, job detail, structured data, permanent applications, talent network, secure uploads, scanning, notifications, audit history, and retention tasks.

Gate: authorization tests, upload abuse tests, retention test, and HR acceptance testing.

### Phase 5: 3D and motion refinement

- Integrate approved models after core pages meet performance targets.
- Test low-tier devices, reduced motion, no WebGL, save-data mode, and context loss.

Gate: 3D may ship only if it does not compromise Core Web Vitals or critical interactions.

### Phase 6: launch readiness

- Production-like end-to-end testing.
- Security review and dependency audit.
- Backup restore exercise.
- Analytics and notification verification.
- Search preview and structured-data validation.
- Browser and device matrix test.
- Operational handover, incident contacts, and content ownership.

Gate: explicit approval before any production deployment, DNS change, or public launch.

## 17. Verification matrix

Automated:

- Unit tests for validation, permissions, filters, job lifecycle, retention, and upload state transitions.
- Integration tests against a real test database and private test storage.
- End-to-end tests for navigation, work filtering, job publishing, application submission, clean and infected file paths, and admin access boundaries.
- Accessibility checks with axe plus manual keyboard and screen-reader review.
- Dependency, secret, and static security scanning in CI.

Manual:

- Chrome, Edge, Firefox, and Safari.
- Representative iPhone and mid-range Android hardware.
- Slow network, save-data, reduced motion, high contrast, 200 to 400 percent zoom.
- Signed-out, each staff role, and attempted cross-role access.
- Empty jobs, expired jobs, missing media, failed email, failed scan, and rate-limited form states.

Production acceptance targets:

- LCP below 2.5 seconds at the 75th percentile.
- INP below 200ms at the 75th percentile.
- CLS below 0.1 at the 75th percentile.
- No high-severity dependency finding without a documented exception.
- No candidate file publicly addressable.
- No application visible outside authorized hiring roles.
- All critical alerts route to an owned on-call or operations channel.

## 18. Decisions needed before implementation

These are the few choices that materially affect the build:

1. Confirm whether the yellow and charcoal identity is fixed or may be refined for contrast while preserving the logo.
2. Confirm the public legal name and exact approved relationship wording with MAD Alpha Designers.
3. Confirm whether client acquisition is a full conversion path now or secondary to work and hiring.
4. Confirm the initial launch departments, job types, office location, shifts, and remote-work policy.
5. Confirm who will review applications and how long unsuccessful candidate records should be retained.
6. Confirm which portfolio and culture media have public-use permission.
7. Confirm whether English-only is acceptable for launch.

## 19. Recommended first release scope

Launch with:

- Home
- Work index and at least 3 complete case studies
- Culture
- Careers and job detail
- Join us
- About and Contact
- Candidate privacy, general privacy, terms, and accessibility pages
- Staff admin for projects, jobs, and applications
- Home hero 3D mark with static fallback
- Culture department map with semantic 2D fallback

Defer until real content supports it:

- Blog or news section
- Multilingual content
- Project-specific 3D viewers on many case studies
- Candidate accounts or application-status login
- Public employee directory
- Complex CRM or applicant-tracking integrations

This keeps the first release distinctive, secure, maintainable, and honest about the content Pyramid Designs can prove.

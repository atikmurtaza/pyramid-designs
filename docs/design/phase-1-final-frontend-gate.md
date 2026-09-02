# Phase 1 final frontend acceptance gate

**Phase:** 1L
**Date:** September 2, 2026
**Result:** FRONTEND FREEZE APPROVED
**Gate decision:** FRONTEND FREEZE APPROVED

## 1. Executive result

The public frontend is functionally and visually accepted for production integration. The approved route set, responsive layouts, browser-local form prototypes, accessible semantic fallbacks and optional Home/Culture 3D enhancements form a coherent Phase 1 frontend that can now be frozen.

This decision is not production-launch approval. It does not approve final company content, legal wording, live data collection, backend/provider implementation, candidate-data handling, authentication, infrastructure, deployment or DNS changes.

Three clear frontend defects were corrected during this gate:

- Unknown Careers slugs now return a real 404 instead of a soft-404 page with status 200.
- Join's visually required controls now expose native required semantics, and the prototype CV error is programmatically associated with its input.
- Join and Contact error-summary links now provide 44-pixel minimum targets.

No major feature, redesign, backend, provider integration, dependency or deployment work was added.

## 2. Accepted public routes

The corrected production build returned HTTP 200 for:

- `/`
- `/work`
- `/culture`
- `/company`
- `/careers`
- `/careers/senior-brand-systems-designer`
- `/careers/front-end-developer-design-systems`
- `/careers/project-engineering-coordinator`
- `/careers/content-and-campaign-associate`
- `/join`
- `/contact`
- `/privacy`
- `/candidate-privacy`
- `/terms`
- `/accessibility`

`/dev/design-system` returned 404 in the production build. An unknown synthetic Careers slug also returned 404 after the Phase 1L correction.

## 3. Brand and design system

- The dark-first charcoal, warm neutral and Pyramid yellow system is consistent across public routes.
- Manrope remains the interface typeface.
- Header, navigation, page-intro, CTA, form, card and legal-shell patterns remain visually coherent.
- Desktop and mobile browser review found no page-family redesign requirement.
- The canonical master remains `public/brand/approved/pyramid-designs-master.svg` with SHA-256 `2C5D2042EF020AA7AD37FF92E6FD9C3407EF305102EE49DA3B6900FF99FFE60C`.
- The canonical master was not modified.

## 4. Responsive status

Production-browser checks covered 320, 390, 430, 768, 1280 and 1440 CSS-pixel widths across every public page family. No tested route produced document-level horizontal overflow, an off-screen H1 or a visible interactive target below 44 pixels in either measured dimension.

The mobile layouts remain intentionally composed rather than reduced desktop pages: navigation becomes a native modal dialog, Home keeps both primary journeys prominent, Work exposes a horizontally scrollable discipline row, Culture preserves the image-first story, Careers collapses its filters, form grids become single-column and legal tables of contents become readable vertical lists.

The browser's direct zoom control did not expose a reliable zoom-state measurement in this environment. Narrow reflow proxies and 320-pixel acceptance passed, but manual 200-400% browser zoom remains in the testing-gap register.

## 5. Accessibility status

Current browser and source checks found:

- one H1 and one main landmark per accepted route;
- no heading-level skips in the tested route output;
- a working skip link and stable `main-content` target;
- visible current-navigation state;
- native dialog mobile navigation with Escape close, modal focus entry, `aria-expanded` reset and trigger focus restoration;
- named native form controls, error summaries, focus movement to summaries and linked field errors;
- programmatic required state for Join and Contact required fields;
- descriptive synthetic image alt text and hidden decorative imagery;
- minimum 44-pixel visible controls and links in the measured route matrix;
- reduced-motion, forced-colours and non-hover foundations in source;
- semantic Culture radio controls that remain equivalent to the optional visual scene;
- 3D canvases contained by `aria-hidden="true"` wrappers and excluded from essential navigation or meaning;
- readable provisional legal shells at mobile and desktop widths.

This is not a formal WCAG certification. Screen-reader combinations, forced-colours runtime review, 200-400% zoom and a final specialist manual audit remain pre-production work.

## 6. Form prototype status

Join and Contact remain browser-local prototypes.

- Source contains no form action, Server Action, fetch/XHR/beacon path, API route, persistence API, email path or analytics event.
- Empty submissions expose field-level errors and focus their error summaries.
- Synthetic valid values reach explicit local prototype success states without URL navigation or network submission.
- Contact remains limited to project, partnership and general inquiries and directs recruitment users to Careers/Join.
- Join links the candidate-privacy prototype and does not create a candidate profile.
- CV selection remains local feedback only; no file is uploaded, stored or security-reviewed.
- No real candidate data was used during acceptance testing.

Live submission, consent, rate limits, server validation, file quarantine, malware review, retention and operational failure handling remain outside Phase 1.

## 7. 3D status

The approved progressive-enhancement policy remains intact.

### Home

- Server-rendered copy, calls to action and static visual appear independently of 3D.
- A capable desktop viewport loaded one deferred canvas.
- At 390 pixels, Home loaded the complete static path with zero canvases.
- Reduced motion, Save-Data, unavailable WebGL, runtime failure and context-loss fallback behavior remain documented and source-enforced from Phase 1K verification.

### Culture

- The production browser initially showed the fallback image, four native semantic radio choices and a 44-pixel-minimum opt-in control at mobile width.
- Activating the opt-in produced one canvas; the button then withdrew.
- Selecting Engineering updated the checked semantic state and visible supporting text.
- The canvas remained hidden from the accessibility tree and carried no essential content.

The scenes remain procedural with zero GLB/model bytes and zero texture bytes. No 3D scope beyond Home and Culture is accepted by this gate.

## 8. Performance baseline

Measurements use the final local production build. Gzip totals compress emitted files independently with .NET's smallest-size gzip setting; they are reproducible local evidence, not a production-CDN transfer claim.

| Measurement | Raw | Gzip |
| --- | ---: | ---: |
| All emitted static JavaScript | 1,516,300 bytes | 429,093 bytes |
| All emitted static CSS | 86,410 bytes | 20,763 bytes |
| Home mobile static script set | 481,409 bytes | 144,504 bytes |
| Home desktop enhanced script set | 1,384,939 bytes | 383,527 bytes |
| Deferred desktop 3D difference | 903,530 bytes | 239,023 bytes |

The approximately 239 KB gzip deferred runtime is accepted for the Phase 1 frontend freeze because it does not block server-rendered text or CTAs, is not requested by the observed mobile Home static path, introduces no model/texture payload and supports the specifically approved Home/Culture enhancement. Launch approval still requires production CDN, field Core Web Vitals and representative-device evidence.

The largest current local media asset is 175,286 bytes; the seven synthetic Culture WebP files total 686,814 bytes. Production replacements must preserve the documented crops and optimization discipline.

## 9. Dependencies

Direct runtime dependencies remain limited to:

- Next.js 16.3.3
- React 19.2.8
- React DOM 19.2.8
- Three.js 0.185.1
- React Three Fiber 9.7.0

Three.js and React Three Fiber are justified only by the approved Home/Culture enhancement. Drei, GSAP, Motion, a direct state-management dependency, CMS SDKs, form libraries, analytics SDKs, Supabase, Prisma and provider SDKs are absent. React Three Fiber's transitive Zustand dependency is not application-owned state architecture.

The local `node_modules` tree reported two extraneous platform image-runtime packages, but neither is declared in `package.json` or `package-lock.json`; they are local install residue rather than frontend dependencies or repository changes.

## 10. Client and server boundaries

Nine files declare `"use client"`, each for a browser-only reason:

- `MobileNavigation` — native dialog lifecycle and focus restoration.
- `CurrentNavigationLink` — pathname-aware `aria-current` state.
- `JoinFormPrototype` — local validation, file-selection feedback and prototype state.
- `ContactFormPrototype` — local validation and prototype state.
- `progressive-3d.tsx` — capability, visibility, viewport and error policy.
- `HomeHero3DEnhancement` — lazy scene lifecycle.
- `HomeHeroScene` — React Three Fiber canvas behavior.
- `CultureCollaborationVisual` — local opt-in and semantic selection state.
- `CultureCollaborationScene` — React Three Fiber canvas behavior.

Route pages, metadata, content, job lookup, legal shells, layout, header/footer and static fallbacks remain server-first. No route-level page was converted to a Client Component.

## 11. SEO readiness

- Every accepted public route has a title and description; synthetic job details generate route-specific titles.
- Invalid job slugs now return 404.
- No unsupported `JobPosting`, `LocalBusiness`, `Organization`, `CreativeWork` or project schema is emitted.
- Canonical URL, sitemap, public robots policy, Open Graph/Twitter assets and final structured-data policy remain intentionally absent because the canonical production domain and factual content are not approved.

Those missing production SEO inputs are Phase 2/3 integration gates, not reasons to invent facts during Phase 1.

## 12. Synthetic-content safety and production-content handover

Synthetic content remains visibly identified on Home, Work, Culture, Company, Careers, Join, Contact and the legal pages. It is not presented as internally approved production data.

`docs/content/production-content-brief.md` remains the replacement inventory for:

- approved projects, media, outcomes, credits and destinations;
- Culture photography, people, consent, stories, copy and discipline taxonomy;
- Company identity, MAD Alpha Designers relationship wording and operating facts;
- real vacancies and approved no-vacancy behavior;
- Join fields, CV/portfolio policy, privacy and consent language;
- Contact channels, ownership and service expectations;
- legal identity, privacy, terms and accessibility inputs;
- Home/Culture 3D decisions and production static-fallback requirements.

Synthetic content must not be removed until approved replacement inputs are supplied and reviewed in context.

## 13. Legal and privacy readiness

The current legal pages remain conspicuously provisional. The following unresolved gates remain explicit:

- legal identity and data-controller wording;
- candidate privacy wording and lawful-processing basis;
- retention periods;
- application and talent-network consent wording;
- governing law, jurisdiction and final terms;
- accessibility feedback contact;
- verified public and privacy contact information;
- processors and subprocessors;
- international-transfer wording where applicable;
- effective/revision dates and any cookie/tracking position.

No provisional text is accepted as final legal advice, certification or launch copy.

## 14. Security and frontend boundary

The accepted frontend contains no active Supabase client/server integration, Prisma, database, Google Drive, candidate persistence, contact persistence, SMTP, Turnstile, authentication, candidate upload, production API, secret value or PII analytics path.

No tracked `.env`, private-key or database file was found. A secret-pattern scan matched one documentation example location; no value was printed and no active secret was identified. `npm audit --omit=dev` reported zero vulnerabilities on September 2, 2026.

The repository's architecture documents describe future protected systems; those documents are not active frontend integrations and do not authorize implementation.

## 15. Device, browser and production testing gap register

| Gap | Phase 1 frontend acceptance | Production launch |
| --- | --- | --- |
| Real iPhone and mid-range Android review | Not blocking freeze | Required |
| Safari review | Not available locally | Required |
| Firefox review | Not available locally | Required |
| Forced-colours and screen-reader combinations | Source/semantic foundation accepted | Manual audit required |
| 200-400% browser zoom | Narrow reflow proxy passed | Manual review required |
| Hostinger compatibility spike | Outside frontend | Required before platform foundation proceeds past its gate |
| Hidden-tab 3D suspension/resumption | Source present; previous tooling limitation retained | Required |
| Mid-range FPS, thermal and battery review | Not blocking freeze | Required |
| Production CDN compression/cache behavior | Local baseline only | Required |
| Actual Core Web Vitals | Not measurable locally as field data | Required |
| Final factual content review | Replacement inventory complete | Required |
| Final legal review | Provisional shells accepted | Required |
| Backend, authorization and security tests | Outside Phase 1 | Required in later phases |

`FRONTEND ACCEPTANCE COMPLETE` and `PRODUCTION LAUNCH READY` are separate states. This gate establishes only the first.

## 16. Frontend freeze rules

1. Freeze the accepted public route map, dark-first design direction, shared shell, responsive behavior, accessibility foundations and browser-local prototype form behavior.
2. Future production integration may replace synthetic content and wire approved server behavior without redesigning accepted page concepts unless a separately reviewed requirement proves a redesign necessary.
3. Keep route pages server-first; add client code only for necessary browser interaction.
4. Keep Home and Culture complete before optional 3D loads and when it never loads.
5. Keep 3D scope limited to Home and Culture unless owner/reviewer separately approves another route.
6. Preserve reduced-motion, Save-Data, mobile, unavailable-WebGL, error and context-loss fallbacks.
7. Do not introduce unsupported company, project, job, contact, legal or structured-data facts.
8. Do not enable candidate/contact transmission or persistence until the relevant privacy, security, authorization and operational gates are approved.
9. Do not modify the approved logo master.
10. Do not deploy or change DNS without explicit production authorization.

## 17. Verification record

Final corrected-checkout results:

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm run build` — PASS; 17 pages generated, expected static/SSG/dynamic classifications retained
- `npm audit --omit=dev` — PASS; zero vulnerabilities
- `git diff --check` — PASS; only line-ending notices
- production HTTP route verification — PASS
- `/dev/design-system` production 404 — PASS
- unknown Careers slug 404 — PASS
- logo SHA-256 — PASS
- browser route semantics, responsive matrix, mobile navigation, Contact states, Join states, Home desktop/static paths and Culture mobile opt-in — PASS

No automated test script exists beyond lint, type-check and build. No Lighthouse or formal WCAG score is claimed.

## 18. Files created or modified

- `docs/design/phase-1-final-frontend-gate.md` — this final acceptance and handover record.
- `docs/content/production-content-brief.md` — Home/Culture 3D and static-fallback replacement requirements.
- `src/app/careers/[job-slug]/page.tsx` — real 404 for unknown role slugs.
- `src/components/join/JoinFormPrototype.tsx` — required-state and CV error semantics, with existing browser-local behavior preserved.
- `src/app/join/join.css` and `src/app/contact/contact.css` — 44-pixel error-summary link targets.

## 19. Phase 2 recommendation

If the owner/reviewer approves this frontend freeze, the first production-platform task should be a synthetic-only Hostinger compatibility and account-capability gate: record the exact plan limits and prove App Router, server route, Server Action, environment-secret handling, database connectivity, ISR/revalidation, cron, restart/redeploy and upload-limit behavior before implementing the wider Phase 2 platform foundation.

This document does not authorize Phase 2, provider configuration, data implementation, deployment or DNS work.

# Phase 1 static frontend audit

**Phase:** 1J  
**Date:** September 2, 2026  
**Scope:** Current static/frontend public routes only. This is an implementation and browser-review record, not production-content approval, legal approval, WCAG certification, deployment proof, or authorization for 3D, backend, CMS, data collection, authentication, or infrastructure.

## Accepted route scope

`/`, `/work`, `/culture`, `/company`, `/careers`, `/careers/[synthetic-job-slug]`, `/join`, `/contact`, `/privacy`, `/candidate-privacy`, `/terms`, and `/accessibility` were reviewed from the production build. `/dev/design-system` returned 404 in production.

All internal public destinations discovered from these routes returned 200, including the four synthetic job-detail routes and the visible local prototype-state URLs. No `/about` route reference remains; the visible About label consistently points to `/company`.

## Corrections made

- Replaced the stale Culture text saying Careers would arrive in Phase 1F with current prototype wording.
- Raised shared header and footer link boxes to a 44px minimum in both dimensions.
- Raised trust-page table-of-contents and related-policy links to 44px minimum height.
- Raised career-detail return links to 44px minimum height.

## Visual and responsive review

The review used a real production browser at 1440 x 1100, 390 x 844, and 320 x 760 viewport overrides. All reviewed public routes had one rendered H1 and no horizontal overflow at each size. Desktop review confirmed the dark-first shell, restrained yellow, Manrope typography, approved-logo presentation, header/footer transitions, editorial layout variety, and readable trust-page measure. Mobile review confirmed intentional one-column compositions for Work, Culture, Company, Careers, job detail, Join, Contact, and trust pages.

The native mobile navigation dialog opened from the 390px Culture page with focus on its close control and exposed the complete primary navigation. The Contact form remained readable at 320px with native controls, labels, and its recruitment redirect visible. The audit does not claim universal browser/device coverage or accessibility certification.

## Accessibility findings

- One H1 was confirmed for every reviewed public route; heading progression is H1, H2, then H3 where needed.
- Shared skip link, landmark structure, visible focus foundation, native controls, labels, error summaries, reduced-motion rules, and forced-colours rules remain in place.
- The only measured target defect found was sub-44px legal and career-detail return links; it was corrected in this phase.
- Culture imagery has descriptive synthetic alt text and visible replacement captions. Decorative CSS/SVG treatment is hidden from the accessibility tree where appropriate.
- Remaining validation is a future specialist/browser-assistive-technology and production-media review; no WCAG conformance claim is made.

## Forms and client/server boundaries

Contact and Join remain distinct browser-local prototypes. Neither has an API route, Server Action, database write, email/SMTP, analytics event, provider SDK, or network submission path. Contact stays a project/partnership/general-inquiry route; Careers and Join remain the recruitment paths.

Current Client Components are deliberately narrow:

- `MobileNavigation` — native dialog open/close and focus return.
- `CurrentNavigationLink` — current-route `aria-current` presentation.
- `JoinFormPrototype` — browser-local validation, prototype state, and local file-selection feedback.
- `ContactFormPrototype` — browser-local validation and prototype state.

All page shells, legal/trust layout, route data, and content rendering remain server-first.

## Dependency, performance, and build baseline

`package.json` uses only Next.js 16.3.3, React 19.2.8, and React DOM 19.2.8 at runtime. No unused runtime package, duplicate package, 3D runtime, CMS, provider SDK, analytics library, or new dependency was found.

The production build generated 17 app routes: static or statically generated public content where supported, with server rendering retained only for query-driven routes. The generated `.next/static` output measured 1,454,269 bytes: 608,276 bytes JavaScript and 84,375 bytes CSS. The seven local Culture WebP assets total 686,814 bytes. These are reproducible build-artifact totals, not route-level payloads or Lighthouse metrics. Manrope is emitted through `next/font` rather than a browser font-CDN dependency.

## SEO and trust status

Every accepted public route has a title and description. The site emits no fake JobPosting or Organization structured data. No canonical base URL, sitemap, robots policy, Open Graph policy, or production search-content decision is present; those require an approved canonical domain and final factual content. The legal/trust pages retain visible provisional wording and avoid unsupported controller, retention, processor, jurisdiction, governing-law, or certification claims.

## Security/frontend boundary

Source and dependency checks found no candidate/contact persistence, application API, Supabase integration, Google Drive integration, authentication, SMTP, analytics/PII capture, or tracked environment/secret file. The repository contains future architecture documentation that names example environment variables, but no values or active integration were found. The approved logo master hash remains `2C5D2042EF020AA7AD37FF92E6FD9C3407EF305102EE49DA3B6900FF99FFE60C`.

## Synthetic-content and production gaps

The consolidated replacement inventory is [production-content-brief.md](../content/production-content-brief.md). It covers portfolio projects and media, Culture people/stories/photography, all Careers facts, Join/privacy/consent requirements, Company factual relationship/taxonomy, Contact channels, and legal/trust inputs. Synthetic content remains intentionally present and clearly labelled; it was not removed merely because final content is not yet available.

## Open owner decisions

1. Approve all final public factual copy, portfolio/culture media rights, and the exact Company/MAD Alpha relationship wording.
2. Provide real job, contact, candidate-privacy, legal, and accessibility-feedback inputs before any data collection or launch.
3. Provide a canonical production domain and approved production SEO policy before canonical tags, sitemap, robots policy, or structured data are introduced.
4. Approve Nexa licence/source evidence only if editable live Nexa text is required.
5. Review and approve this uncommitted Phase 1J audit/correction set before any commit.

## Readiness conclusion

The static frontend is consistent enough for a separately authorized Phase 1K 3D/motion proof-of-concept. That future phase must remain static/frontend-only and must not begin from this audit.

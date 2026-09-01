# Pyramid Designs Home prototype

**Phase:** 1C - Home Page Visual Responsive Prototype

**Status:** Design prototype complete, owner visual decisions pending

**Review date:** September 1, 2026

This phase implements one public-page visual prototype only. It does not create backend functionality, CMS/data infrastructure, production integrations, final 3D, deployment configuration or production service changes.

## Provisional brand notice

The following choices remain:

`PROVISIONAL — OWNER VISUAL APPROVAL REQUIRED`

- Proposed Pyramid Designs SVG mark.
- Manrope as the primary UI typeface.
- Final Nexa/wordmark asset and licence evidence.
- Public theme-toggle decision.

The proposed mark geometry was not changed. The Home prototype places the existing mark in a replaceable static visual composition so the owner can assess it at realistic scale.

## 1. Home narrative

The Home page follows the approved sequence:

1. Header.
2. Hero.
3. Selected Work.
4. Capabilities.
5. Culture / People.
6. Careers / Join.
7. Parent-company relationship.
8. Footer.

The page first establishes the company, then presents work as the strongest evidence, explains its multidisciplinary scope, gives culture meaningful visual space, provides distinct recruitment paths and closes with restrained parent-company attribution.

## 2. Hero copy options

All three directions below are **PROPOSED COPY**, not approved production copy.

### Direction A

**Headline:** Creative work, technical depth.

**Support:** One multidisciplinary company for substantial projects and talented people in Pakistan.

- Clarity: strong. Creative and technical breadth is immediate.
- Brand character: direct and compact without generic agency phrasing.
- Work/career balance: support line and paired actions cover both purposes.
- Local relevance: Pakistan appears plainly without decorative geographic cliché.

### Direction B

**Headline:** Design, development and engineering in one place.

**Support:** Pyramid Designs brings different disciplines together for work and people in Pakistan.

- Clarity: strongest literal description.
- Brand character: more functional and less distinctive than Direction A.
- Work/career balance: present, but the headline leans toward services.
- Local relevance: explicit and restrained.

### Direction C

**Headline:** Built for the work and the people behind it.

**Support:** A creative and technical company for projects, permanent opportunities and independent collaborators.

- Clarity: strongest dual-purpose message.
- Brand character: warmer, but less immediately specific about disciplines.
- Work/career balance: strongest recruitment emphasis.
- Local relevance: would need a separate Pakistan reference.

## 3. Selected prototype hero copy

Direction A is the prototype default:

> Creative work, technical depth.

> One multidisciplinary company for substantial projects and talented people in Pakistan.

It keeps the headline to two desktop lines in Manrope, avoids familiar agency slogans, and leaves the distinct `View work` and `Join us` actions understandable above the fold.

## 4. Hero visual architecture

`HomeHeroVisual` is a server-rendered, decorative CSS/SVG composition. It uses:

- the unchanged proposed SVG mark;
- a charcoal field;
- controlled yellow triangular planes;
- a faint structural grid;
- a simple diagonal anchor related to the mark construction;
- one light mark panel so the original charcoal/yellow treatment remains legible in both theme families.

The visual is intentionally static and light. It communicates scale, whitespace, foreground/background separation and the approximate future interaction field without pretending to be final 3D.

## 5. Future 3D replacement boundary

`src/components/home/HomeHeroVisual.tsx` is the Phase 1G replacement boundary. The Home hero copy, actions, grid and responsive order do not depend on its internals.

Phase 1G may replace this one component with an isolated dynamic 3D client leaf after approval. The static component remains the conceptual reduced-motion, save-data, unsupported-WebGL and loading fallback. No complex 3D prop API has been defined early.

## 6. Selected Work composition

Selected Work uses one dominant project followed by two smaller projects in logical DOM order. Desktop CSS creates the asymmetric 1 + 2 composition; tablet and mobile collapse to a vertical editorial feed without reordering content.

Each prototype entry supports later:

- project media;
- title;
- discipline;
- sector;
- year;
- short descriptor;
- case-study path.

Current entries are explicitly synthetic in source and visible metadata. The compositions use abstract brand geometry rather than stock work or invented client attribution. `/work` remains a planned route and was not implemented in this phase.

## 7. Capabilities treatment

Capabilities use typography, a two-column editorial list and restrained dividers instead of icon cards. Categories come from approved planning material:

- Design.
- Development.
- Engineering.
- Marketing and content.

Supporting sentences are proposed prototype copy and must be reviewed against final approved service language.

## 8. Culture treatment

Culture receives a full section with two deliberately different media proportions and a substantial statement. Placeholder visuals are geometric and captions state that approved workplace, people and event photography is required.

No stock office imagery, employee identities, quotes, benefits or workplace claims are presented as Pyramid Designs facts.

## 9. Careers / Join treatment

The recruitment section has high page priority but remains visually secondary to Selected Work. It separates:

- `View open roles` for approved live permanent or contract vacancies.
- `Introduce yourself` for freelance, project, portfolio and future permanent interest.

Visible copy states that live availability is not connected. No vacancy is implied, and no form or candidate-data flow exists.

## 10. Parent-company treatment

The section uses the approved relationship statement:

> Pyramid Designs, MAD Alpha Designers company.

It includes the verified `madalphadesigners.com` domain and a short local-identity explanation. It does not reproduce the parent website or make the Home page primarily about MAD Alpha Designers.

## 11. Responsive behaviour

The prototype was reviewed at approximately 1440, 1280, 1024, 768, 430, 390 and 320 CSS pixels.

- Desktop: asymmetric split hero; dominant work entry plus paired secondary entries; culture media and copy share the field.
- 1024: hero remains split, actions stay above the fold and desktop navigation remains on one line.
- 768: hero becomes copy-first and stacked while desktop navigation still fits at the approved breakpoint.
- 430/390/320: mobile dialog navigation is active below 768px; hero copy is two lines; CTAs share one clear row; the visual becomes a short 16:10 field; work becomes a single reading flow; footer becomes one column.
- No tested width produced horizontal overflow, clipped headlines or wrapped CTA labels.
- DOM order remains the reading order for work and culture content.

## 12. Theme findings

System-aware dark mode was visually inspected across the full Home page, including header, hero, project media, capabilities, culture, recruitment, parent attribution and footer.

The light theme was code-reviewed against the established semantic token set. Full-page light visual inspection was not completed because the available browser session used a dark system preference and blocked the temporary local theme override. This is a review issue, not a code or architecture blocker.

Recommendation: keep public theme behavior **system-only** for now. Do not expose a toggle until the owner has visually approved the mark, media treatment and yellow balance in both complete themes.

## 13. Typography findings

Manrope remains suitable in realistic Home usage:

- the hero is direct without becoming oversized;
- section headings retain strong character at moderate scale;
- body copy and metadata remain readable;
- navigation and buttons fit their targets;
- mobile headline wrapping is deliberate at 320-430px.

Visual QA found and fixed a Phase 1A integration defect: the Manrope variable existed on `<body>`, while the font declaration was only on `<html>`, causing a Times New Roman fallback. The shared body rule now consumes the variable correctly.

Manrope remains `PROVISIONAL — OWNER VISUAL APPROVAL REQUIRED`.

## 14. Yellow / colour findings

`#E8C547` is used for primary actions, focus contrast, key geometric planes, project placeholder emphasis and a low-percentage recruitment surface tint.

It is not used as small body text, a full-page background, a glow or a gradient headline. The page remains primarily off-white/charcoal in the relevant system theme. Yellow feels recognisable without becoming wallpaper.

## 15. Accessibility findings

- One H1 and meaningful H2/H3 structure.
- Header, main sections and footer retain semantic landmarks.
- Skip link remains present.
- Mobile navigation uses the existing native dialog, exposes the active Home link, closes correctly and restores focus through the Phase 1B implementation.
- Visible keyboard focus was inspected on the mobile menu trigger.
- All tested controls meet the existing 44px minimum target.
- CTA labels remain on one line.
- Decorative hero and project geometry is hidden from assistive technology.
- Culture placeholder graphics are decorative; their required-media status is stated in visible captions.
- No essential information depends on hover, colour or motion.
- Forced-colour and reduced-motion foundations remain active.
- Repeated SVG title IDs were corrected by generating unique IDs; decorative mark instances now avoid redundant announcements.

## 16. Performance findings

- Home is a React Server Component.
- Home sections add no Home-specific client component.
- `HomeHeroVisual` and abstract media are CSS/SVG only.
- No image, video, animation or 3D dependency was added.
- No scroll listener, animation library or runtime media request exists.
- Geometry reserves stable aspect ratios to avoid layout shift.
- Existing shell client boundaries remain `MobileNavigation` and `CurrentNavigationLink` only.
- Production build observations are recorded in the completion report after verification.

## 17. Synthetic-content inventory

The following are synthetic or proposed and cannot be treated as approved production content:

- selected hero headline and support line;
- all three project titles, disciplines-as-presented, descriptors, sector/year placeholders and abstract media;
- capability supporting sentences;
- culture headline and narrative;
- culture media placeholders;
- recruitment headline and supporting sentences;
- parent-section explanatory sentence;
- all `data-content-status="proposed-copy"`, `synthetic`, `prototype-explanation` and `provisional` records in the Home source.

The following are verified planning inputs:

- Pyramid Designs identity.
- Multidisciplinary creative/technical positioning.
- Pakistan/local-market focus.
- permanent, freelance and project relationship concepts.
- capability category names drawn from the approved plan.
- parent-company statement and domain.
- approved social URLs in the shared footer.

## 18. Owner review decisions

1. Approve or replace the proposed SVG mark at realistic hero/header/footer sizes.
2. Approve Manrope as the public UI family or provide a licensed replacement.
3. Supply and approve the final Nexa/wordmark master and licence evidence.
4. Approve Direction A hero copy or select another documented direction.
5. Approve the static hero composition as the Phase 1G fallback direction.
6. Approve the Selected Work asymmetric rhythm and media proportions.
7. Approve yellow quantity across both complete themes.
8. Choose system-only, fixed approved theme or a later public toggle after full visual review.
9. Approve the culture section scale and required photography direction.
10. Approve the distinct `View open roles` and `Introduce yourself` recruitment paths.

## 19. Inputs required for Phase 1D

Recommended next task: **Phase 1D - Work Index Visual Responsive Prototype**.

Before or during that prototype, request:

- any approved project names and anonymisation rules;
- approved project disciplines, sectors, years and descriptors;
- media/credit/publication-rights status for candidate portfolio assets;
- which project, if any, may be the dominant prototype example;
- owner feedback on Home work proportions and metadata density;
- owner decision on the hero copy direction if it should carry into Work navigation context.

Phase 1D must remain a visual prototype. Do not begin CMS, database, admin, production media infrastructure or deployment work without the relevant later gate.

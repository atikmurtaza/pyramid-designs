# Pyramid Designs Home prototype

**Phase:** 1C-R - Owner Visual Refinement

**Status:** Owner review incorporated; implementation and verification complete

**Review date:** September 1, 2026

This phase refines the existing Home visual prototype. It does not redesign the page, begin Phase 1D, create backend or CMS functionality, add production integrations, implement 3D, deploy, or change production configuration.

## 1. Owner decisions recorded

The current approved direction is:

- Manrope is the working primary website typeface. The approved logo contains an outlined wordmark; Nexa remains relevant only if licensed editable live text is later required.
- Dark is the intentional public default. Functional semantic light tokens remain available. There is no public theme toggle.
- `Creative work, technical depth.` is the provisionally approved H1.
- The Selected Work asymmetric editorial composition and logical DOM order are approved.
- The global yellow balance is approved.
- The two recruitment paths are approved conceptually: published vacancies and general freelance, project, portfolio or future permanent introductions.
- `public/brand/approved/pyramid-designs-master.svg` is the **OWNER APPROVED MASTER** for the complete symbol and outlined wordmark.
- The Culture structure is approved. Final visual quality depends on genuine approved Pyramid Designs photography or video.
- Capabilities and parent-company presentation required refinement and were addressed in Phase 1C-R.

The Home information architecture, two-column hero, Selected Work composition, recruitment architecture, responsive and accessibility foundations, header, footer and `HomeHeroVisual` replacement boundary remain unchanged.

## 2. Hero supporting copy

The selected supporting copy is:

> Creative and technical disciplines working together, for ambitious projects and people ready to contribute.

It addresses prospective clients through the project reference and prospective talent through contribution, while keeping the sentence concise and avoiding an internal company-description tone.

Alternatives considered:

1. `Creative and technical disciplines together, for clients shaping new work and people who want to help make it.`
2. `A place for multidisciplinary work, and for creative and technical people looking to contribute.`

The H1 remains:

> Creative work, technical depth.

`HomeHeroVisual` remains an intentionally temporary, server-rendered CSS/SVG composition and the isolated Phase 1G replacement boundary. It received no material visual expansion.

## 3. Selected Work

Selected Work was not redesigned. It retains:

- one dominant project and two secondary projects;
- the approved asymmetric desktop composition;
- logical DOM order;
- a single-column mobile editorial feed;
- clearly synthetic project media and metadata.

Only section-end spacing changed as part of the page rhythm review.

## 4. Capabilities refinement

Capabilities remains a server-rendered typography-led section using only approved category names:

- Design.
- Development.
- Engineering.
- Marketing and content.

The refinement adds visible `01` to `04` numbering, stronger heading scale, a connected two-column rule system, clearer alignment between category and description, and a restrained yellow rule on precise-pointer hover. All capability information remains visible without hover. No cards, icons, accordion, client component or dependency were added.

On narrow mobile widths the grid becomes one column, removes the internal vertical divider and preserves the number, title and description reading order.

## 5. Culture refinement

The approved Culture structure is preserved. Placeholder graphics were simplified to quiet media-ready surfaces with a single restrained yellow baseline. They no longer try to substitute increasingly elaborate geometry for unavailable photography.

The two proportions remain available for future approved team, workplace, event, short video or poster media. Visible captions continue to state that approved media is required.

## 6. Parent-company and footer refinement

The verified disclosure remains:

> Pyramid Designs, MAD Alpha Designers company.

The relationship is now a compact provenance row with a small yellow rule, restrained heading size and the verified external link. The redundant explanatory paragraph was removed.

The footer no longer repeats the full relationship sentence. It retains the verified `MAD Alpha Designers` link in the Connect group, useful navigation, social links, legal links and the owner-approved Pyramid Designs logo master. Pyramid Designs remains the dominant site identity.

## 7. Vertical rhythm refinement

Spacing was reduced selectively rather than globally:

- less trailing space after Selected Work;
- tighter Capabilities and Culture section padding;
- a shorter Culture-to-recruitment transition;
- a tighter recruitment section;
- a substantially shorter parent-company row.

At the 1440 by 900 review viewport, the page height reduced from approximately 5,027px to 4,706px. The parent-company treatment reduced from approximately 324px to 142px. Editorial breathing room remains around the hero, work media and major section introductions.

## 8. Theme behaviour

The server renders `<html data-theme="dark">`. Dark semantic tokens therefore apply before first paint, without reading operating-system preference, local storage or client state. There is no theme initialization script, public toggle, hydration dependency or theme flash.

The existing `[data-theme="light"]` semantic token set remains maintained. A temporary server-side light selection was visually inspected at desktop width, including recruitment, parent attribution and footer, then the final source was restored to the dark default. The light check produced no horizontal overflow and retained the approved yellow accent and readable foreground hierarchy.

The architecture can support a future explicit owner-approved theme decision by changing the root `data-theme` value. No component contains scattered theme-specific hard-coded page backgrounds for this decision.

## 9. Responsive review

The refined Home was checked at approximately 1440, 1280, 1024, 768, 430, 390 and 320 CSS pixels, plus a typical 1440 by 800 laptop-height viewport.

- No tested width produced horizontal overflow.
- The hero H1 remains two lines at every tested width.
- Hero buttons remain on one line and retain the existing 44px minimum target.
- Desktop navigation remains on one line through the approved breakpoint; the existing mobile dialog navigation is active below it.
- Capabilities retains its two-column editorial relationship through tablet and becomes a clear single-column sequence on narrow mobile.
- Culture and recruitment preserve logical reading order.
- Parent attribution remains clear without competing with major Home sections.

## 10. Accessibility review

- The page retains one H1 followed by meaningful H2 and H3 structure.
- Main section and project DOM order is unchanged.
- Essential capability information is not hover-only and numbering is not required to understand the category names.
- Yellow is an accent, not the sole carrier of meaning.
- Existing focus-visible, skip-link, forced-colour, reduced-motion and touch-target foundations remain active.
- Decorative placeholder and hero geometry remains hidden from assistive technology.
- CTA labels do not wrap at the required widths.
- No animation, scroll listener or motion-only meaning was introduced.

## 11. Performance and architecture

- Home remains a React Server Component.
- No Home-specific client component was added.
- No dependency, image, video, animation library, 3D runtime, backend, CMS or production configuration was added.
- `HomeHeroVisual` remains the future 3D replacement boundary and static fallback direction.
- Placeholder media continues to reserve stable aspect ratios.

## 12. Remaining provisional decisions

Only the following genuinely unresolved decisions remain:

1. Supply a separate approved inverse/dark-background, horizontal, mark-only or favicon variant if a future placement requires one.
2. Supply Nexa licence/source evidence only if Nexa is to be used as editable live text.
3. Supply approved portfolio projects, media, credits, publication rights and factual descriptors.
4. Supply approved Pyramid Designs team, workplace, event or short-form culture media.
5. Approve final production service wording and all remaining proposed or synthetic copy before publication.

Manrope, dark-first presentation, Selected Work composition, yellow balance, recruitment-path distinction and Culture structure are no longer listed as unresolved owner direction.

## 13. Phase boundary

Phase 1C-R refines the Home prototype only. Phase 1D has not begun. Proceeding to Phase 1D still requires the explicit owner or reviewer gate defined by the controlled production programme.

## 14. Phase 1C-L approved logo integration

The owner-supplied `pyramidf.svg` was relocated without content changes to `public/brand/approved/pyramid-designs-master.svg`. Its SHA-256 before and after relocation is `2C5D2042EF020AA7AD37FF92E6FD9C3407EF305102EE49DA3B6900FF99FFE60C`.

The master declares `width="3214"`, `height="2632"` and `viewBox="0 0 3214 2632"`. It contains the complete symbol and `Pyramid Designs` wordmark as vector outlines. `PyramidLogo` now references this single production asset for the header, footer, Home hero and design-system review. The previous generated provisional mark and inline React path definitions were removed.

The supplied charcoal/yellow master is not recoloured or filtered. Phase 1D corrects its website presentation by deriving a transparent symbol-only SVG from the master's exact symbol paths while omitting the outlined wordmark path. Header and footer placements use the symbol inside compact geometric yellow and warm-neutral fields. `HomeHeroVisual` uses the same transparent symbol in its existing geometric composition rather than repeating the complete wordmark inside a white card. The canonical master remains unchanged.

## 15. Phase 1D-LR logo derivative repair

The initial Phase 1D presentation was rejected in owner visual review: yellow triangular logo elements were visually merged with surrounding hero and shell geometry. Phase 1D-LR preserves the entire approved yellow-and-charcoal symbol as a single asset and removes only the outlined wordmark. `HomeHeroVisual` remains the future replacement boundary, with independently decorative shapes visually separated from the complete symbol on a plain neutral contrast surface. The canonical master remains authoritative.

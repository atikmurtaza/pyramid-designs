# Pyramid Designs design system foundation

> **Phase 1B addendum:** The responsive shell, component contracts, native-dialog navigation, theme decision, form/status foundations, and client/server boundary are documented in `docs/design/component-system.md`. No public pages, providers, workflows, or deployment configuration are added by Phase 1B.

**Phase:** 1A — Brand Asset Normalisation and Design-System Foundation
**Status:** Foundation established; owner-approved logo master integrated in Phase 1C-L
**Research date:** September 1, 2026

## APPROVED FROM SOURCE MATERIAL

- Brand charcoal is `#30323D`; brand yellow is `#E8C547`.
- The identity combines interlocking `P` and `D` forms with three pyramid forms and controlled diagonal geometry.
- Major media/project panels use a 16px radius; fields use 8px; primary actions are pills.
- The owner-approved SVG contains the complete symbol and `Pyramid Designs` wordmark as vector outlines.
- Nexa Light remains the editable wordmark/type reference. No Nexa font file or licence evidence was supplied, so it is not embedded or used as live UI type.
- The visual direction is geometric, editorial, clean, premium and intentionally low-density (`VISUAL_DENSITY: 3`).
- Light and dark themes remain subject to the plan's brand and accessibility review gate.

## BRAND ASSET STATUS

### Brand source and logo status

All four supplied raster references were inspected and remain unchanged at the repository root. Copy-only review references are under `public/brand/reference/`.

| Asset | Status | Notes |
| --- | --- | --- |
| `pyramid- logo.jpg` | Reference only | Full logo on white. |
| `pyramid-bgremove.png` | Reference only | Transparent full-logo comparison source. |
| `pyramid-colour.jpg` | Reference only | Yellow-surface treatment source. |
| `pyramiddesigns.jpg` | Reference only | Brand board confirming colours and Nexa Light reference. |
| `public/brand/approved/pyramid-designs-master.svg` | **OWNER APPROVED MASTER** | Complete symbol and outlined wordmark. SVG contents are preserved exactly as supplied. |

The approved master resolves the complete stacked logo artwork used by the website. Phase 1D adds `public/brand/derived/pyramid-designs-symbol.svg`, a transparent website derivative containing only the master's exact symbol paths and original transform. The outlined wordmark path is omitted; no geometry is redrawn, recoloured, filtered or rasterised. Compact dark-first placements use this symbol inside deliberate yellow and warm-neutral compositions instead of presenting the full lockup on a white card. The outlined master wordmark does not require the site to embed Nexa, but a Nexa licence/source file is still required if Nexa is later used as editable live text.

### Stack baseline

`npm` was selected because it is available in the project environment and produces the repository-standard `package-lock.json`; no package manager choice was otherwise recorded. Stable versions verified from the publishers' package registries on September 1, 2026:

- Next.js `16.3.3`, React and React DOM `19.2.8`, App Router and server components by default.
- TypeScript `6.0.3` in strict mode. TypeScript `7.0.2` was current but is not yet supported by the installed Next ESLint integration, so it is deliberately not used.
- Tailwind CSS and `@tailwindcss/postcss` `4.3.3`.
- ESLint `9.39.1` with `eslint-config-next` `16.3.3`. ESLint `10.9.1` was current but incompatible with the installed Next configuration, so it is deliberately not used.

This is a local development baseline only. The exact Hostinger Node.js compatibility spike remains a Phase 2 gate; the application declares Node.js 22 or newer, and local verification uses Node.js 24.15.0.

### Colour and theme strategy

Semantic CSS tokens cover background, foreground, surface, elevated surface, primary, primary foreground, border, subtle border, muted/strong text, focus, danger and success. Tailwind v4 exposes the same semantic tokens. Raw brand values appear only in the token layer and the proposed SVG.

The light theme is warm off-white (`#F7F4ED`), not pure white. The dark theme is near-charcoal (`#1D1F27`), not black. System preference sets the initial theme without JavaScript; explicit `data-theme="light"` and `data-theme="dark"` selectors provide the future user-override hook. There is no theme switch in Phase 1A.

The yellow is not used as small text on light surfaces. It is an accent, border, graphic and dark-text button background. Both logo colours are preserved.

### Contrast findings

Manual WCAG relative-luminance checks:

| Combination | Contrast | Result |
| --- | ---: | --- |
| Charcoal text / light background | 11.59:1 | AA body and large text |
| Muted light-theme text / light background | 5.79:1 | AA body text |
| Charcoal text / yellow action | 7.58:1 | AA body and large text |
| Light text / dark background | 14.58:1 | AA body and large text |
| Muted dark-theme text / dark background | 9.43:1 | AA body and large text |
| Yellow focus accent / dark background | 9.79:1 | AA body and large text |

The focus treatment uses a two-tone outline/ring so at least one boundary remains visible on both themes.

### Typography and licence status

**Proposed primary UI family: Manrope.** It is a geometric, legible variable sans available under the SIL Open Font License through Google Fonts. `next/font/google` self-hosts the requested subset at build time, avoiding a browser request to a font CDN. It supports a useful weight range without introducing another font family.

Nexa Light is not downloaded, redistributed or used for UI text. Its licence/source file remains a brand-approval requirement. The live type scale is centralized in `src/app/globals.css`: display, H1–H4, body large/body, small, caption/metadata and button/label. Responsive display/H1–H3 sizes use `clamp()`; remaining roles deliberately stay stable for reading and controls.

### Spacing, radii, borders and shadows

Spacing tokens run from 4px through 96px: compact controls use 8–12px, normal components use 16–32px, and section/editorial spacing uses `clamp(48px, 7vw, 112px)`. Major panels are 16px, fields 8px and actions fully pill-shaped. Borders are semantic and shadows are restrained surface elevation only; no blur, glass effect, gradient or neon treatment is present.

### Layout and responsive behaviour

`Container`, `media-container`, `text-measure` and `editorial-grid` provide the only current layout primitives. The grid uses twelve columns at 1280px and wider, six flexible columns from 768px, then a one-column reading flow below 768px. Shared responsive tokens provide gutters, max widths, grid gaps, section spacing and a 64–72px future header target. No page layout or navigation was implemented.

### Accessibility foundation

- Semantic root document and a reusable skip-link pattern.
- Consistent visible two-tone `:focus-visible` treatment.
- 44px minimum interactive target rule for buttons and links.
- System light/dark preference, forced-colours and increased-contrast fallbacks.
- Reduced motion removes transitions and animation duration; reduced transparency disables backdrop filters.
- Native buttons and links first; no client component or fake control is needed for the reviewed primitives.

### Motion and layers

CSS variables define 140ms fast, 220ms standard and 480ms deliberate motion with one standard easing curve. No animation library is installed. Semantic layers are base 0, sticky 10, header 20, overlay 30, modal 40 and toast 50. Future interactive work must honour reduced motion and consume these variables.

### Icon decision

No icon library was installed because Phase 1A needs no repeated production iconography. A later phase may choose small local SVGs or a narrowly scoped library after actual icon requirements are known.

### Primitive components

- `Button`: primary, secondary and ghost native button styles with default, hover, focus, active and disabled states.
- `TextLink`: native anchor with a durable underline.
- `Container`: page-width constraint.
- `Surface`: semantic panel treatment.
- `PyramidLogo`: reusable reference to either the unchanged owner-approved complete SVG master or its documented exact-geometry symbol derivative.

### Review route and production exclusion

`/dev/design-system` is the only review surface. It uses synthetic labels only, sets `noindex, nofollow`, and returns 404 whenever `NODE_ENV=production`; it is not a production route.

### Open visual decisions

1. Supply a separate approved inverse/dark-background, horizontal, mark-only or favicon variant if future placements require one.
2. Supply Nexa Light licence/source evidence if Nexa is to be used as editable live text.
3. Approve any future public light-theme control after visual and accessibility review.

### Phase 1B inputs

The owner-approved logo master is integrated. Later phases still require real content/media rights and each explicit owner/reviewer gate defined by the plan.

## Phase 1D-LR logo derivative repair

Owner visual review rejected the earlier Phase 1D presentation because its yellow logo artwork was misclassified as surrounding page geometry and visually merged with it. The canonical `public/brand/approved/pyramid-designs-master.svg` remains authoritative. Its yellow `path4` and `path2` plus charcoal `path3` are indivisible symbol artwork; only charcoal `path5`, the outlined wordmark, may be removed. The repaired transparent symbol derivative preserves `path4`, `path3`, and `path2` in that order, with their canonical transform and colours. No rendered background shape exists in the master, so no transparent-lockup derivative is required.

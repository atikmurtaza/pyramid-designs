# Pyramid Designs component system

**Phase:** 1B — Responsive Site Shell and UI Foundations
**Status:** Development foundation only. No public pages or content workflows are implemented.

## Global shell

`RootLayout` provides a skip link, `SiteHeader`, page content, and `SiteFooter`. The currently proposed mark is isolated in `PyramidMark` so an approved master asset can replace it without changing shell layout.

## Header and mobile navigation

The desktop header uses semantic primary navigation in the approved order, with a separate Join us action. Below 768px it uses the browser-native modal `<dialog>` rather than a drawer dependency. The dialog provides modal background blocking and focus containment; Escape closes it and focus returns to the trigger. It does not misuse ARIA menu roles for ordinary links.

## Footer

The footer supports the supplied social URLs, the supplied MAD Alpha Designers domain, approved parent attribution wording, Pakistan context, and structured future legal/contact routes. It intentionally does not publish an address, phone number, legal claim, or invented social handle.

## Theme behaviour

Semantic light/dark CSS tokens follow the system preference without JavaScript. A very small pre-render script restores a future stored `pyramid-theme` override before hydration, preventing a flash when an override is eventually exposed. No public theme toggle is rendered in Phase 1B: its visual treatment remains an owner decision.

## Layouts and sections

`StandardPage`, `EditorialPage`, `WideMediaPage`, and `TextPage` are composable shells. `Section` has compact, normal, and editorial spacing only. This deliberately avoids a generic all-purpose layout with styling switches.

## Media, cards, metadata and filters

`MediaFrame` provides a 16:9, 16px-radius, overflow-safe frame with optional semantic caption. `ContentCard` serves project, job, and story cases through one accessible anchor-card pattern; do not put other interactive controls inside it. `Metadata` remains neutral, textual and non-colour-dependent. `FilterControls` is presentational only: future URL-query filtering owns the state.

## Form primitives and status patterns

`TextField`, `Textarea`, `SelectField`, `Checkbox`, and `Radio` use native controls, visible labels, mobile-safe 16px input text, required/error/help relationships, and disabled/invalid browser behaviour. `ErrorSummary` is focusable for a future form-submission flow, but no submission exists. Loading, empty, and error visual structures use synthetic review content only.

## Responsive and accessibility behaviour

Desktop navigation is single-line at 768px and above; the mobile dialog is used below it. Existing reduced-motion, reduced-transparency, forced-colours, increased-contrast, focus, and 44px target foundations apply to the shell. No essential information is hover-only.

## Client/server boundary

`MobileNavigation` handles browser dialog calls, open state, and focus restoration. `CurrentNavigationLink` reads the route to expose `aria-current` and the active visual treatment. Header, footer, cards, metadata, layouts, media, filters, and forms otherwise remain server-compatible.

## Phase 1C inputs

Phase 1C should start only after owner review of the provisional mark, Nexa/source resolution, public-theme decision, and supplied/reviewable real content or media. It must be explicitly authorized before any page implementation.

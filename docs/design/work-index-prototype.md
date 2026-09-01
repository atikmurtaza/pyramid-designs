# Pyramid Designs Work index prototype

**Phase:** 1D - Work Index Visual Responsive Prototype
**Status:** Implementation and verification complete; owner content decisions pending
**Review date:** September 1, 2026

## Concept

`/work` is a dark-first editorial index for multidisciplinary studio work. It uses one dominant project, two compact studies and two wider closing studies to establish visual rhythm without implying that every future case study has identical content or media.

All project titles, summaries, media, sectors and years are explicitly synthetic or pending. The prototype makes no client, outcome, award, testimonial or performance claim.

## Information hierarchy

Each project structure supports:

- title;
- discipline;
- sector;
- year;
- short summary;
- stable media region;
- future case-study route.

The DOM order is the editorial reading order. Desktop grid placement changes visual weight without reordering the source. The mobile layout becomes a single sequence in the same order.

## Responsive behaviour

- At wide desktop widths, the first study occupies eight of twelve columns and two rows. Secondary studies use intentionally varied proportions.
- At tablet and small desktop widths, the feature becomes full width and remaining projects form two columns.
- Below 768px, every project becomes a single-column editorial feed with consistent 16:10 media.
- At 430px and below, metadata becomes a two-column block to prevent crowded separators and clipped labels.
- The discipline index scrolls horizontally when required instead of compressing or wrapping into unusable targets.

## Synthetic media boundary

Media uses unmistakably abstract brand geometry rendered with CSS. It does not imitate client photography, interfaces or deliverables. Each project reserves a stable aspect ratio so approved images or video can replace the synthetic media without changing article structure or causing layout shift.

## Future structured-data assumptions

The local array models only fields needed to test presentation. It is not a CMS schema or approved taxonomy. Future structured data may add project slugs, approved services, media records, credits, publication state and case-study blocks after the relevant content and infrastructure gates.

Discipline labels follow the approved multidisciplinary direction but remain provisional production taxonomy.

## Filtering decision

Phase 1D does not implement filtering state. The small discipline index uses ordinary anchor links, remains understandable without JavaScript and demonstrates target sizing and label density. Real filtering should use URL query parameters after approved projects make the result set and taxonomy meaningful.

## Accessibility

- The route has one H1 and project titles are H2 headings.
- Header, navigation, main content, project section and footer retain semantic landmarks.
- Synthetic geometry is decorative and hidden from assistive technology.
- Synthetic status and metadata are visible text, so meaning does not depend on colour.
- Discipline links meet the shared 44px target rule and use the global focus treatment.
- Forced-colours support preserves media and control boundaries.
- Motion is limited to hover and active feedback and inherits the global reduced-motion override.

## Performance and client boundary

The Work route is a React Server Component. It adds no Client Component, dependency, animation library, image request, WebGL runtime, CMS call or backend integration. CSS reserves media proportions and changes only transform on hover-capable devices.

## Logo presentation correction

The canonical owner master remains `public/brand/approved/pyramid-designs-master.svg`. Its required SHA-256 is `2C5D2042EF020AA7AD37FF92E6FD9C3407EF305102EE49DA3B6900FF99FFE60C`.

`public/brand/derived/pyramid-designs-symbol.svg` is a transparent website derivative. It copies the master's three symbol paths and original group transform exactly, omits the outlined wordmark path and contains no background rectangle. `PyramidLogo` selects the complete master or symbol derivative through a small variant prop.

Header, footer and Home hero now use the symbol derivative. Their surrounding yellow and warm-neutral geometry provides contrast without recolouring, filtering, redrawing or rasterising the approved artwork. The development design-system route shows both the canonical master and derivative.

## Owner decisions still outstanding

1. Supply and approve real projects, titles or anonymisation, sectors, years, summaries, media rights, credits and outcomes.
2. Confirm the final production discipline taxonomy and whether URL-query filtering is useful for the approved project count.
3. Approve case-study route naming and the first content model before case-study implementation.
4. Supply a separately approved inverse or single-colour logo variant if future placements cannot use the current colour artwork with an intentional composition field.
5. Supply Nexa licence evidence only if Nexa is to become editable live text.

## Phase boundary

Phase 1D implements the Work index visual and responsive prototype only. It does not add CMS or database storage, production case studies, infrastructure, candidate submission, deployment, DNS changes or Phase 1G 3D work.

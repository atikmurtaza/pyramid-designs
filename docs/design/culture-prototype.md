# Pyramid Designs Culture prototype

**Phase:** 1E - Culture Visual Responsive Prototype
**Status:** Implementation verification complete; owner content decisions pending
**Review date:** September 2, 2026

## Concept

`/culture` extends the approved dark-first visual system through candid editorial photography, asymmetric compositions and concise working stories. It presents Culture as the environment around multidisciplinary work, then closes with a restrained bridge into Careers.

All photography, people, names, roles and stories in this phase are synthetic. They exist only to test layout, crop behaviour, information hierarchy and future content structure. They must not be described or published as factual Pyramid Designs material.

## Content structure

The route contains:

1. A photography-led hero with explicit prototype status.
2. A collaboration section connecting design and engineering work.
3. A multidisciplinary critique scene.
4. A career-stage structure awaiting approved programmes and policies.
5. Three fictional editorial profiles.
6. A digital handover scene.
7. A restrained Culture to Careers transition.

The page is a React Server Component. Story content is a small local array so approved names, roles, disciplines, stories and portraits can be replaced without restructuring components.

## Synthetic image inventory and production replacement specification

| Prototype asset | Intended production subject | Orientation | Recommended aspect | Minimum useful resolution | Crop and safe area | Visual purpose | Mobile crop notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `culture-collaboration-hero.webp` | Four to six approved Pyramid Designs people reviewing active multidisciplinary work in a real studio | Landscape | 16:10 | 2400 x 1500 | Keep the active group within the centre-right 60 percent. Preserve dark or quiet space at left for copy. Protect faces and hands inside the central 70 percent. | Establish workplace, collaboration and Pakistan context immediately | Supply an alternate vertical crop if possible. Main people must survive a centre-right crop at 390px and 320px. |
| `culture-prototype-review.webp` | Two approved people from different disciplines reviewing a physical prototype, drawing or printed composition | Portrait | 4:5 | 1600 x 2000 | Keep faces, hands and the reviewed object inside the middle 70 percent. Avoid critical detail at the bottom 10 percent. | Show collaboration as practical review rather than a posed team moment | Ensure both faces and the object remain legible after a mild centre crop. |
| `culture-project-critique.webp` | Overhead view of an authentic critique table with approved, publication-safe project material | Landscape | 3:2 | 2400 x 1600 | Distribute hands and artefacts across the frame, but keep the central 60 percent useful. Remove confidential or client-restricted information. | Provide tactile evidence of multidisciplinary work and review | Crop can tighten from both sides. Keep at least three hands and several work types visible. |
| `culture-digital-review.webp` | Two approved people reviewing a real interface, build or content draft at a workstation | Portrait | 4:5 | 1600 x 2000 | Keep both faces and the device within the central 75 percent. Screen content must be approved and readable only when intended. | Balance physical making with development and content work | A centre crop must retain both people. Provide a device-safe crop with no confidential screen detail. |
| `fictional-sana-qureshi.webp` | Approved Design discipline profile portrait | Portrait | 4:5 | 1600 x 2000 | Head and shoulders within the central 65 percent. Leave modest negative space around the gaze direction. | Test a design profile and larger lead-story treatment | Face must remain complete at 320px. Avoid placing important studio detail near edges. |
| `fictional-hamza-ilyas.webp` | Approved Development or Engineering discipline profile portrait | Portrait | 4:5 | 1600 x 2000 | Head and shoulders within the central 65 percent. Include restrained workplace context. | Test a technical profile in the secondary story position | Keep face and shoulders clear under a centre crop. Laptop may crop partially without losing meaning. |
| `fictional-mariam-raza.webp` | Approved Project operations, content or marketing discipline profile portrait | Portrait | 4:5 | 1600 x 2000 | Head and shoulders within the central 65 percent with safe room above the head. | Test a third profile and different editorial scale | Keep face complete in both full-width and narrower offset presentation. |

Production photography should feel candid, restrained and specific to the real workplace. Avoid staged handshakes, forced group smiles, exaggerated startup posing, decorative laptops with fake screens and confidential client material. Confirm consent, publication rights, names, roles and project permissions before replacement.

## Fictional story inventory

| Fictional identity | Prototype role | Discipline field | Story purpose | Production replacement required |
| --- | --- | --- | --- | --- |
| Sana Qureshi | Visual designer | Design | Tests a lead editorial profile about critique and visual decision-making | Approved person, name, title, portrait, discipline, account and consent |
| Hamza Ilyas | Web developer | Development | Tests a technical story about turning shared thinking into working interfaces | Approved person, name, title, portrait, discipline, account and consent |
| Mariam Raza | Project coordinator | Project operations | Tests a cross-discipline story about decisions and handovers | Approved person, name, title, portrait, discipline, account and consent |

The profiles are not testimonials. Production replacements should remain short first-person or editorial accounts about real work. Avoid unsupported praise, benefits claims, salary claims, policy claims or invented outcomes.

## Responsive decisions

- Wide desktop uses an image-led hero, offset editorial pairs and an asymmetric story grid.
- At 1024px, content proportions tighten without changing DOM order.
- At 768px and below, every high-variance layout becomes a single logical column.
- At 430px, 390px and 320px, hero type scales down, story media becomes full-width and section padding reduces.
- Images retain explicit aspect ratios through `next/image`, preventing layout shift.
- No horizontal interaction, carousel or hover-only information is required.

## Accessibility decisions

- The page has one H1 with logical H2 and H3 hierarchy.
- Header, main content, sections and footer retain semantic landmarks.
- Every meaningful synthetic image has useful alt text describing the visible action and clearly identifies synthetic portraits.
- Repeated prototype replacement notices remain visible captions, not colour-only status.
- Desktop visual offsets do not change source order.
- Shared skip-link, focus-visible, 44px target, reduced-motion and forced-colours foundations remain active.
- No information depends on hover, animation or pointer precision.

## Performance and client boundary

- The route is server-rendered and adds no Client Component.
- No animation, carousel, WebGL, CMS, database, authentication, analytics or candidate workflow is added.
- Seven repository-local generated images have no remote request, tracking or runtime licensing dependency.
- `next/image` supplies responsive image sizing and output optimisation. The hero alone is prioritised.
- Motion remains limited to existing global interaction feedback and respects the shared reduced-motion override.

## Verification record

Phase 1E passed the implementation gate on September 2, 2026.

- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm run build`: PASS. `/culture` is statically prerendered.
- `git diff --check`: PASS.
- Visible copy check for em dash and en dash characters: PASS with none found.
- Responsive browser checks at 1440 x 900, 1280 x 800, 1024 x 768, 768 x 1024, 430 x 932, 390 x 844 and 320 x 800: PASS.
- All tested viewports had no horizontal overflow and no clipped H1, H2, H3, paragraph or caption text.
- The H1 remained two lines at every tested viewport.
- Desktop navigation remained on one line through 768px. Mobile navigation replaced it below the existing breakpoint.
- Every visible link measured at least 44px high after the shared shell target correction.
- All nine rendered images, including the two shared logo instances, completed after normal progressive scrolling.
- Semantic audit found one H1, logical H2 and H3 order, header, main and footer landmarks, no duplicate IDs and no image missing alt text.
- Keyboard audit confirmed the skip link is the first focus target and receives the shared visible focus treatment.
- Desktop and mobile screenshots were visually inspected for crop quality, reading order, spacing and story presentation.

## Remaining owner approvals

1. Approve the final Culture information hierarchy and photography-led direction.
2. Supply or commission the seven production photography replacements using the shot list above.
3. Approve real employee participation, consent, names, roles, disciplines and story copy before publication.
4. Confirm factual Culture copy about the real review process, career development and cross-discipline working practices.
5. Approve the exact Culture to Careers transition after Careers content and vacancy policy are defined.
6. Confirm whether additional disciplines need representation in production profiles.

## Phase boundary

Phase 1E implements and documents the Culture visual responsive prototype only. It does not begin Careers, backend, CMS, candidate functionality, production content replacement, deployment or production configuration.

Recommended Phase 1F scope is a Careers visual responsive prototype that defines the vacancy index, role detail pattern, honest no-vacancy state, general introduction path and a clear boundary before any candidate application workflow.

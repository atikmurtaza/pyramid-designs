# Careers visual responsive prototype

## Narrative and index

Phase 1F provides a dark-first, editorial Careers prototype. It makes a clear distinction between current openings and a future general-introduction route. The index contains a prototype notice, current-opportunities list, native filter form, no-vacancy state, provisional hiring process, Culture connection and Join boundary.

## Vacancy presentation and filters

Each synthetic vacancy presents title, department, location placeholder, work arrangement, employment type, experience level and closing date. The list is deliberately a reading-first editorial list rather than a card dashboard.

Filtering is a server-rendered `GET` form using `department` and `arrangement` URL query parameters. The native `<details>` element keeps controls compact on mobile. There is no fake API, search backend or client-side state. `?view=none` demonstrates the mandatory no-vacancy state.

## Empty state and detail route

The empty state honestly says that no openings are published and points to the future general-introduction boundary without promising a response. `/careers/[job-slug]` renders a reusable static role detail with purpose, responsibilities, required and preferred qualifications, schedule, closing date, a not-published compensation treatment, provisional hiring process and a Join boundary. No application form exists.

## Culture and general introduction boundaries

Careers links to Culture with “See how we work” and to the future `/join` route with “Introduce yourself”. The latter is an explicit boundary for a later controlled Join and candidate-form phase. Neither route is treated as an application workflow here.

## Responsive and accessibility behaviour

At 1024px, list actions move below the role summary. At 768px and below, layouts become one column, filter controls stack within a native disclosure and metadata becomes a two-column reading grid. At 320px metadata becomes one column and heading scale reduces.

Each route has one H1, follows H2 then H3 hierarchy, uses a semantic ordered vacancy list, labels real form controls, retains visible shared focus styles and 44px controls, has no hover-only information and uses logical DOM order. Existing reduced-motion and forced-colours foundations apply.

## Server, client and performance boundaries

All Careers content is server-rendered. There are no Careers-specific Client Components. Static data lives in `src/content/careers.ts`; route filtering is query-driven on the server; `generateStaticParams` provides the synthetic detail routes. No dependencies, animation libraries, CMS, database, structured-data output or JobPosting schema have been added.

## Synthetic-content inventory and production replacement requirements

Replace before production publishing:

- Every vacancy title, department, location, arrangement, employment type, experience level, schedule and closing date.
- Every role summary, purpose, responsibility, qualification and preferred-qualification statement.
- The hiring-process wording, compensation policy treatment, no-vacancy wording and general-introduction CTA wording.
- The confirmation of which departments, work patterns and candidate routes Pyramid Designs actually offers.

Production implementation must use approved factual vacancy content, a published-job authorization workflow, a confirmed application policy and any approved structured-data strategy. Do not emit `JobPosting` structured data for synthetic prototype roles.

## Inputs for the next phase

The next controlled phase should define the Join/general-application visual prototype and its explicit candidate-form boundary. It needs approved audience routes, field content, privacy wording, consent requirements, response-expectation wording and factual owner-approved copy before any real candidate workflow is built.

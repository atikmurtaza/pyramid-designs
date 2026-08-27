# Pyramid Designs

## Project

Production website for Pyramid Designs.

## Source of truth

Use the detailed Pyramid Designs website plan and approved architecture decision records. Record architecture decisions in this repository; do not rely on prior AI conversation context.

## Development approach

Work through explicit production phases and gates. Do not start the next phase without owner or reviewer approval.

## Engineering principles

- Ponytail is the adopted general coding discipline: prefer the smallest maintainable solution that meets requirements.
- Security, privacy, accessibility, data integrity, authorization, and production reliability take priority over simplification.
- Use server-first architecture unless an approved ADR says otherwise.
- Avoid unnecessary dependencies and client-side JavaScript.
- Never expose secrets, use real candidate data in development or preview data, weaken authorization for convenience, or invent company facts or marketing claims.
- Do not deploy production or change production DNS without explicit approval.

## Quality gates

Before declaring implementation work complete, run the relevant available lint, type, test, production-build, and security checks. Do not suppress failures merely to obtain a green result.

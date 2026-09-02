# Join and application experience prototype

## Information architecture

Phase 1G provides `/join` as a dark-first, editorial application experience. It distinguishes a job-specific route from a general introduction, shows a structured single form, supports local validation and file-selection feedback, and provides controlled error, unavailable-job and success states.

## Job-specific and general-introduction journeys

`/join?job=<known-synthetic-slug>` resolves a known role from the static Careers dataset and shows its title, department and arrangement in a contextual banner. Careers detail actions use this path. Unknown slugs show an unavailable-job notice and fall safely back to the general-introduction form.

Without a job slug, applicants can select permanent opportunities, freelance or project collaboration, internship or early-career, or portfolio introduction. This does not create or merge a reusable candidate identity.

## Fields and validation states

The prototype includes identity, location, professional focus, discipline, experience, short introduction, portfolio and professional-profile links, a PDF selection control and a prototype acknowledgement. Required fields use native programmatic invalid state, a focusable error summary and field-level messages. `?demo=errors` and `?demo=success` provide controlled review states.

## Upload, security and privacy boundaries

The document input accepts PDF and provides local file-selection feedback for an optional 5 MB limit. It does not upload, store, hash, scan, clear or expose a file. A selected PDF is not represented as safe.

Future production flow remains separate: server validation, private quarantine, SHA-256 binding, approved security review and restricted hiring access. The page uses a visibly provisional acknowledgement only. It is not a privacy notice, consent record, retention statement or legal promise. No control is pre-checked, and future optional talent-network consent must remain separate from a job application.

## Success and failure states

The local success state says only that a future production service would receive the information and shows a clearly synthetic reference pattern. It promises no response, interview, employment or follow-up. Validation failures, invalid email and portfolio URL, invalid document selection and unavailable-job state are all demonstrated without a network request.

## Responsive and accessibility behaviour

Desktop uses two-column field groups. At 768px and below, all fields, context choices and actions become one column. At 320px heading scale and action spacing reduce without changing DOM order.

The page uses explicit labels, fieldset and legend grouping, instructions before the form, programmatic required and invalid states, an error summary that receives focus, visible field-level errors, keyboard-native controls, 44px targets, visible focus and logical tab order. The file input remains native.

## Server, client and performance boundaries

`/join` and job-context lookup are server-rendered. `JoinFormPrototype` is the only Phase 1G Client Component. It prevents browser form submission and keeps transient validation, success and file feedback in local browser state. No API route, SMTP, third-party integration, database, candidate record, provider SDK, analytics event, file persistence or network request is added. No dependency was added.

## Synthetic content and production replacement requirements

Replace before production implementation:

- All candidate-facing form labels, helper text, validation messages, success wording and reference format.
- Final role taxonomy, required fields, phone and profile policy, portfolio requirements and document policy.
- Privacy notice, lawful-processing basis, retention wording, consent wording and any talent-network opt-in.
- Immutable published Job ID binding, server-side validation, authorization, rate limiting, file quarantine, SHA-256, malware scanning, clearance, storage and hiring-access controls.

Production implementation remains blocked until those approved inputs and backend controls exist. This phase does not authorize candidate intake, deployment or provider configuration.

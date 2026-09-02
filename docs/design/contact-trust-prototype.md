# Contact and trust prototype

## 1. Contact structure

Phase 1I adds `/contact` for project, partnership and general inquiries. It omits unverified office, phone, response-time, registration, hours and location details. Candidates are directed to `/careers` and `/join`, not the Contact form.

## 2. Contact prototype states

`ContactFormPrototype` has browser-local validation, success and failure presentations. It has no API route, Server Action, email, CRM integration, analytics payload, storage or network submission. Its visible messaging says that no information was sent.

## 3. Legal page system

`TrustPage` is the shared server-rendered editorial layout for `/privacy`, `/candidate-privacy`, `/terms` and `/accessibility`: one H1, introductory status label, constrained reading measure, useful table of contents, H2 sections and related-policy links.

## 4–7. Privacy, candidate privacy, terms and accessibility boundaries

All legal/trust copy is labelled PROVISIONAL COPY and REQUIRES LEGAL / OWNER APPROVAL where facts are unresolved. Privacy avoids final controller, legal-basis, jurisdiction, processor and rights claims. Candidate Privacy names future candidate-data categories and boundaries without asserting retention, document workflow, security procedures or transfer facts. Terms avoids jurisdiction-specific clauses. Accessibility only states supported implementation aims, including WCAG 2.2 AA as a target, accessible forms and production-media captions/transcripts where relevant; it does not claim certification or complete compliance.

## 8. Cookie decision

No banner, tracking or analytics was introduced. The prototype documents that only technically required essential cookies may be considered for future approved services; a consent mechanism must be assessed before non-essential analytics or marketing cookies are added.

## 9. Cross-linking

The footer now links Contact, Privacy, Candidate Privacy, Terms and Accessibility. `/join` links Candidate Privacy. Every trust page includes related-policy links.

## 10–12. Responsive behaviour, accessibility and server/client boundary

Contact and trust layouts collapse to one column on narrow screens; form controls retain 16px minimum text, labels and visible error states. Trust pages use semantic main/article/section structure, logical heading hierarchy, readable line length and meaningful links. The four trust routes have zero route-specific Client Components. Contact uses only `ContactFormPrototype` for browser-local state; the route shell remains server-rendered.

## 13. Provisional-content inventory

Owner/legal replacement is required for: legal entity/controller wording; address; operational contact channel; privacy legal basis; candidate retention; processors/subprocessors; international handling; jurisdiction; governing law; limitation/disclaimer wording; accessibility contact details; revision/effective dates; and any response-time or office information.

## 14. Production legal and owner gates

Before launch, approve final legal text and ownership, the contact delivery and privacy-request channels, applicable jurisdiction and retention rules, provider/processor notice wording, cookie/tracking configuration, and accessibility feedback process. No real personal-information collection may be enabled until these gates are satisfied.

## 15. Inputs for Phase 1J

Perform a complete public-site route, content and responsive-consistency audit before any 3D work. Verify approved production content, legal copy, contact operations, cross-links, all breakpoint behaviour and browser accessibility evidence separately from implementation checks.

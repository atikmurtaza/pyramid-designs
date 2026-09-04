# Phase 2E — Staff Portal Read Foundation

**Date:** 2026-09-04

**Status:** VERIFIED — CLOSURE APPROVED

**Scope:** Synthetic-only read portal. No deployment, production identity/configuration, candidate intake, file handling, staff mutation, provider integration, migration or DNS work was performed.

## Architecture and routes

`/staff` is the production-intended login/MFA boundary. Its nested Server Component routes read directly through the existing `pg` staff-read layer:

- `/staff/content` — draft/scheduled project metadata for `CONTENT_EDITOR` and `ADMIN`;
- `/staff/jobs` and `/staff/jobs/[id]` — recruitment-context or management job DTOs;
- `/staff/applications` and `/staff/applications/[id]` — minimized application metadata and separately authorized contact detail;
- `/staff/audit` — minimized recent audit history.

The portal reuses the Phase 2C policy/session resolver, Phase 2D two-stage read boundary, Supabase SSR cookie client, verified existing-factor TOTP challenge and canonical design tokens/logo. No client role or assurance value is accepted as authority. Navigation is derived from the same centralized operation policy used by reads and remains presentation only.

## Authentication and session behavior

The login Server Action accepts an email/password only at the provider boundary and returns generic failure text. Redirects pass through the existing `/staff`-only sanitizer. AAL1 sessions receive only the existing verified-factor TOTP challenge; enrollment, QR and seed output remain absent. Sign-out uses the configured Supabase client and returns to the signed-out boundary.

Every protected page resolves current verified claims, active local `StaffUser` state and current PostgreSQL roles. Role removal, staff disabling, null claims and AAL downgrade therefore affect the next request. Proxy responses for `/staff` set `Cache-Control: private, no-store, max-age=0`, `Pragma: no-cache` and `Vary: Cookie`.

## Authorization and DTO boundary

Phase 2E adds only two policy operations needed for list surfaces: `content.list_metadata` and `job.list_metadata`. `ADMIN` remains an explicit entry in each grant set and is not a bypass.

Returned fields are allowlisted:

- content list: `id`, `title`, `publicationState`, `updatedAt`;
- job list: `id`, `title`, `departmentName`, `lifecycleState`, `applicationDeadline`;
- job detail: the existing application-context or management DTO;
- application list: `id`, `publicReference`, `applicationType`, `jobTitle`, `technicalStatus`, `hiringStatus`, `createdAt`;
- application detail: the existing contact DTO only;
- audit: the existing safe event-code/opaque-target DTO.

Application lists do not select contact data. Detail reads authorize the exact opaque ID before lookup, authorize current technical/retention/deletion state, query the exact ID again and reject a mismatched returned object. Answers, accommodation, files, consent, retention-policy identifiers, provider data and raw rows remain excluded.

## BOLA and security verification

`test:phase2e` covers the complete role/navigation matrix, denial before PostgreSQL for unauthorized roles/AAL1/null principals, malformed and nonexistent targets, an explicit mismatched-object BOLA seam, DTO key allowlists, disabled staff, role removal, null claims after sign-out, redirect safety, cache headers, no `SELECT *`, dependency boundaries, RLS/grants and zero public policies.

The portal has shared loading, empty, generic error and not-available states. Staff CSS keeps 44 px controls, visible global focus, semantic navigation/headings, wrapping detail values and single-column small-screen layouts. The final local closure suite passed: Prisma validation and six-migration status; Phase 2B, 2C, 2D and 2E verification; lint; post-build typecheck; production build; and production dependency audit with zero vulnerabilities. Production-build smoke returned `200` for `/`, `404` for the development-only internal page and read route, and unauthenticated `/staff` returned only the sign-in boundary with no protected DTO. The canonical approved logo SHA-256 remains `2C5D2042EF020AA7AD37FF92E6FD9C3407EF305102EE49DA3B6900FF99FFE60C`.

## Deferred production gates and cleanup

- Provision and verify a dedicated least-privilege production PostgreSQL runtime identity.
- Configure and verify production Supabase Auth redirect/origin/session policy without creating identities in this phase.
- Repeat live AAL1/AAL2, global revocation and multi-device session testing in the controlled production-like environment.
- Authenticated AAL2 visual confirmation remains deferred because it requires owner-held authentication material. Automated Phase 2C–2E evidence establishes the authorization and data boundary, so this is a non-blocking production/acceptance gate rather than a Phase 2E closure blocker.
- Complete real-device review and production deployment smoke/security tests when deployment is separately authorized.
- Remove development-only `/internal/staff-auth` and its API routes only in a separately approved cleanup after production portal acceptance.

No migration or ADR change is required. Phase 2F has not started.

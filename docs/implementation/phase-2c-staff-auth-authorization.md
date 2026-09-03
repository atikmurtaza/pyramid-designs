# Phase 2C — Synthetic Staff Authentication and Server-Side Authorization Foundation

**Date:** 2026-09-04

**Status:** **PASS**

**Scope:** Synthetic staff identities and authorization infrastructure only. No real staff access, candidate submission, file upload/retrieval, Google Drive, production authentication, deployment or DNS change is enabled.

## 1. Authentication architecture

The implementation follows the accepted server-first chain:

`verified Supabase session -> Auth subject -> local StaffUser -> ACTIVE status -> effective UserRole rows -> operation/target/state policy -> allow or deny`

Supabase supplies authentication and authenticator assurance. PostgreSQL remains authoritative for the application staff profile, enabled state and roles. Authentication alone grants no application permission. A missing profile, disabled profile, zero effective roles, unknown role, `aal1` session, unknown operation, missing/mismatched target or invalid state is denied.

No Auth schema, Prisma schema or ADR changed. The existing `StaffUser` model is the approved local staff-profile/domain record referred to by the programme as `StaffProfile`.

## 2. Supabase Auth integration

Official Supabase and Next.js guidance was rechecked on 2026-09-03:

- Supabase Next.js SSR: <https://supabase.com/docs/guides/auth/server-side/nextjs>
- Supabase server-client cookie API: <https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs&queryGroups=framework>
- verified claims API: <https://supabase.com/docs/reference/javascript/auth-getclaims>
- Supabase MFA/TOTP: <https://supabase.com/docs/guides/auth/auth-mfa/totp>
- Next.js data/security boundary: <https://nextjs.org/docs/app/guides/data-security>

Selected packages are pinned:

- `@supabase/ssr` `0.12.5`;
- `@supabase/supabase-js` `2.115.0`.

The supported `createServerClient` `getAll`/`setAll` cookie strategy is used. `src/proxy.ts` refreshes only the isolated `/api/internal/staff-auth/*` boundary. No deprecated Auth Helpers package, NextAuth/Auth.js, custom password store or home-grown JWT implementation was added.

## 3. Session verification

`readVerifiedSupabaseClaims()` calls `supabase.auth.getClaims()`. It does not trust `getSession()` data or merely decode a JWT. Current Supabase behaviour verifies asymmetric tokens against cached project JWKS and falls back to the Auth server for symmetric signing configurations. Provider errors are reduced to a null authentication result; tokens, claims and provider details are not logged or returned.

The internal subject value contains only:

- verified Auth subject ID;
- verified `aal1` or `aal2` assurance level.

The application principal adds only local `StaffUser.id` and effective local roles. Access and refresh tokens are not returned by the resolver.

## 4. Subject mapping

`findStaffAuthorizationProfile()` performs one parameterized PostgreSQL query by Supabase subject. It returns the local staff ID, status and active role assignments as plain values.

`resolveAuthenticatedStaff()` returns null for:

- absent or invalid verified claims;
- missing `StaffUser` mapping;
- `DISABLED` local status;
- zero effective roles.

No client-supplied role or staff ID participates in this chain.

## 5. Staff enabled-state enforcement

`StaffUser.status = DISABLED` is checked before a principal is constructed. Historical active role rows therefore do not restore access. The automated test resolves the existing disabled synthetic subject with a still-valid synthetic verified-claims seam and confirms denial.

Session revocation remains an operational companion action for a future staff-deactivation mutation, but revocation failure cannot reopen application permissions because local disabled state is evaluated on every request.

## 6. Roles

Only the accepted roles exist:

- `CONTENT_EDITOR`
- `HIRING_REVIEWER`
- `HIRING_MANAGER`
- `ADMIN`
- `AUDITOR`

Role assignments are read from PostgreSQL. Supabase custom claims are not an authorization store. Unknown roles make the complete decision deny rather than being ignored alongside a recognised role.

## 7. Authorization decision model

`authorize()` is a small explicit policy over:

- **subject:** mapped active principal, effective roles and verified assurance level;
- **operation:** the exact Phase 0 operation vocabulary;
- **target:** expected resource type and resource ID where an existing record is required;
- **state:** job lifecycle, application technical/hiring/retention/scope state, candidate-file validation/technical/security/deletion/hash state and limited recruitment scope.

`requireAuthorization()` converts every denial into the fixed public-safe error `Not available.`. `ADMIN` is an explicit grant set, not a bypass.

## 8. Default-deny behaviour

The policy denies before any grant when:

- no principal exists;
- assurance is not `aal2`;
- roles are missing or unknown;
- operation is unknown;
- no role explicitly grants the operation;
- target is absent, has the wrong type or lacks a required ID;
- required state/scope context is absent or invalid.

Every accepted operation from `authorization-model.md` has an explicit role grant. No wildcard operation, role inheritance or implicit `ADMIN` allow exists.

## 9. State-aware authorization

Implemented state checks include:

- content edit/publish/archive checks use the accepted publication states and publication requires an explicit approved-content signal;
- hiring reads/mutations require `SUBMITTED`, active retention, no completed deletion and recruitment scope;
- hiring transitions use the accepted Phase 0 state graph and reject terminal/invalid jumps;
- verified withdrawal recording remains manager/admin-only and can apply before technical submission;
- job edit/question management, publish, close and archive use the accepted lifecycle states;
- `HIRING_REVIEWER` draft-job access requires assigned application context unless a manager/admin role also applies;
- cleared-file download requires validation `PASSED`, technical `QUARANTINED`, security `CLEARED`, active retention and matching clearance/hash evidence;
- quarantine review requires manager/admin, validation `PASSED`, technical `QUARANTINED`, active retention and an approved reviewable security state;
- outcome recording requires `IN_REVIEW` plus matching hash evidence;
- file deletion execution requires an existing deletion request;
- retention deletion execution requires an existing deletion request;
- limited retention/audit reads require the accepted recruitment scope.

No file bytes, Drive IDs or retrieval operation were implemented.

## 10. MFA/TOTP boundary

All Phase 2C application authorizations require verified `aal2`. The value is taken only from the verified Supabase claims payload. `aal1` is denied even when the local profile and role would otherwise grant the operation.

No TOTP secret, QR code, recovery code or factor data is stored in application tables or application logs. The implementation-stage owner gate was subsequently completed with one owner-created synthetic Supabase Auth identity; the live closure evidence is recorded in section 19 without secret material.

### Owner-assisted live Auth/TOTP closure runbook

1. In the isolated development Supabase project, confirm TOTP enrollment/verification is enabled and production redirect URLs are not added.
2. Create one obvious synthetic staff Auth identity using an owner-controlled test inbox. Do not use a real owner, employee or candidate identity.
3. Record only the synthetic identifier and Auth subject UUID in the Phase 2C evidence record; keep password, TOTP seed and recovery material outside the repository.
4. Map that subject UUID to a dedicated synthetic `StaffUser` with one minimum role, initially `CONTENT_EDITOR`, through the controlled migration/admin database path.
5. Enroll TOTP interactively in Supabase, sign in and prove `getClaims()` reports `aal2`.
6. Invoke the local non-production `/api/internal/staff-auth/verify` boundary with the session cookie and existing diagnostic bearer secret. Expect `STAFF_AUTHORIZATION_OK` and one PII-free audit event.
7. Set the local profile to `DISABLED` without expiring the browser session and repeat. Expect generic authentication denial.
8. Re-enable only if another approved test requires it; otherwise delete the synthetic Auth user and the dedicated local mapping/role/audit rows.
9. Review browser/server logs and responses for password, token, factor, provider-error or role-detail leakage.

Owner interaction is required at step 2 and step 5. Phase 2C must not fabricate those credentials.

## 11. CSRF boundary

No authenticated state-changing endpoint or Server Action was introduced. The `hasSameOriginMutation()` seam establishes fail-closed Origin validation for future cookie-authenticated Route Handlers and is tested for same-origin, cross-origin and missing-Origin requests.

Future staff mutations must combine:

- secure HttpOnly SameSite cookies managed by Supabase SSR;
- explicit Origin validation for Route Handlers;
- Next.js Server Action Origin/Host protections where Server Actions are used;
- a synchronizer or validated double-submit CSRF token under the approved staff session design;
- fresh server authorization inside the mutation/transaction.

SameSite cookies alone are not treated as the complete mutation defence. Hostinger forwarded-host/protocol behaviour must be verified before production mutations rely on it.

## 12. Redirect safety

`safeStaffRedirectPath()` accepts only internal `/staff` destinations. Absolute URLs, protocol-relative URLs, non-staff paths and backslash variants fall back to `/staff`. Malicious/external cases are covered by the Phase 2C runner.

No login/callback redirect endpoint was exposed in this phase.

## 13. Audit behaviour

The isolated diagnostic boundary writes only:

- local staff actor ID;
- fixed action and target codes;
- a synthetic UUID target;
- allow/deny outcome and fixed reason code;
- random correlation ID;
- `{ "synthetic": true }` metadata.

It never writes an email, name, role list, token, JWT, factor, password, provider error or candidate value. If audit insertion fails, the diagnostic request fails closed with a fixed unavailable result.

Real staff/role mutations, hiring transitions and candidate-file operations remain outside this phase and must commit their required audit event with the business mutation.

## 14. Synthetic identities

The repository and its scripts do not create Supabase Auth users. For the owner-assisted live closure, the owner separately created one dedicated synthetic Auth identity, `test@example.com`, with subject `970e45fc-73cc-4f81-99e7-332aac583fee`. No password, token, cookie, recovery value or TOTP material was supplied to or stored by the repository.

The Phase 2C seed creates only local synthetic `StaffUser` mappings that cannot authenticate without a separate matching Supabase Auth identity:

- `synthetic-phase-2c-content-editor`
- `synthetic-phase-2c-hiring-reviewer`
- `synthetic-phase-2c-hiring-manager`
- `synthetic-phase-2c-auditor`
- `synthetic-phase-2c-zero-role`
- `synthetic-phase-2c-multiple-roles`

The existing Phase 2B synthetic subjects `synthetic-supabase-subject-admin` and `synthetic-supabase-subject-disabled` are reused for admin and disabled-profile verification. No password, token, TOTP or recovery value exists in the seed.

## 15. Tests

`scripts/verify-phase-2c-authorization.mjs` uses Node 22, built-in strict assertions and the synthetic development PostgreSQL project. It verifies:

- all five role mappings;
- content-editor grants and hiring/staff/audit denial;
- hiring-reviewer submitted-application and cleared-file access plus quarantine/staff denial;
- hiring-manager transitions and quarantine-review access;
- explicit admin grants without candidate-file state bypass;
- auditor read-only audit access and mutation denial;
- absent/invalid session, unmapped subject, disabled profile and zero roles;
- multiple roles;
- `aal1` denial;
- unknown role, operation and target;
- missing target context and invalid hiring/file state;
- generic authorization errors;
- redirect allowlisting;
- CSRF Origin checks;
- audit payload exclusion;
- continued `anon`/`authenticated` denial on staff/role tables;
- pinned official Auth packages and no Prisma Client runtime.

`scripts/seed-phase-2c-synthetic.mjs` is manual/idempotent and calls the Phase 2B synthetic seed first. It does not create Supabase Auth users.

### Verification result on 2026-09-03

- `npm run prisma:validate` — PASS;
- `npx prisma migrate status` — PASS outside the restricted command sandbox; six migrations found and the development database schema is up to date;
- `npm run test:phase2b` — PASS (`PHASE_2B_DOMAIN_OK`);
- `npm run test:phase2c` — PASS (`PHASE_2C_AUTHORIZATION_OK`);
- `npm run lint` — PASS;
- `npm run typecheck` — PASS;
- `npm run build` — PASS with 17 generated pages and the staff-auth diagnostic route present as a dynamic server route;
- `npm audit --omit=dev` — PASS with zero vulnerabilities;
- `git diff --check` — PASS;
- production-mode route smoke test — public/frozen routes returned `200`; `/dev/design-system` and `/api/internal/staff-auth/verify` returned `404`;
- canonical logo SHA-256 — unchanged at `2C5D2042EF020AA7AD37FF92E6FD9C3407EF305102EE49DA3B6900FF99FFE60C`;
- `.env.local` — ignored and untracked;
- Prisma Client/adapter runtime — absent;
- Supabase live Auth/TOTP user flow — not run as part of the initial implementation verification on 2026-09-03; completed later through the owner-assisted evidence in section 19.

## 16. Cleanup requirements

Before production launch or when Phase 2C evidence is retired:

1. Remove the six Phase 2C `UserRole` rows with IDs ending `0021`, `0023`, `0025`, `0027`, `002a`, `002b`.
2. Remove the six Phase 2C `StaffUser` rows with IDs ending `0020`, `0022`, `0024`, `0026`, `0028`, `0029`.
3. Remove diagnostic `AuditEvent` rows whose action code is `phase2c.authorization.check` or `phase2c.synthetic.authorization` after evidence retention is approved.
4. Remove or production-disable `/api/internal/staff-auth/verify`; it is already hard-disabled when `NODE_ENV=production`.
5. Replace the narrow proxy matcher only when an approved real staff route boundary exists.
6. Delete any later owner-created synthetic Supabase Auth user and its factor/session data through Supabase administration.
7. Remove any ignored local synthetic Auth password/TOTP material immediately after the live gate.

Do not remove the Phase 2A `CompatibilityProbe` in this phase.

## 17. Production release gates

Phase 2C does not clear these production release gates:

- company-controlled real staff account ownership/recovery and production MFA enrollment;
- approved production/preview/development Auth isolation and redirect URL allowlists;
- final cookie domain, Secure/SameSite and Hostinger proxy/origin behaviour;
- CSRF token design applied to actual mutations;
- production staff portal route review, BOLA/IDOR tests and metadata-selection review;
- removal/disablement of diagnostic surfaces;
- dedicated least-privilege production PostgreSQL runtime identity, separate from the current privileged development/migration identity;
- controlled production migration/deployment, Hostinger scheduler and DNS/launch approval.

The current development/migration PostgreSQL identity must not become the production web runtime identity.

## 18. Recommended next phase

Phase 2C and its owner-assisted live closure are complete. Do not start Phase 2D without separate owner/reviewer authorization.

If separately approved, the recommended Phase 2D is **Synthetic Staff Read Boundary and Session Lifecycle Verification**: an isolated, non-public staff read surface proving server-side authorised selections, session expiry/revocation and generic BOLA denial with synthetic content/jobs only. It must still exclude candidate intake, file upload/retrieval, Google Drive, real staff access, production deployment and DNS changes.

## 19. Phase 2C-LA Live Closure Evidence

### Synthetic identity and mapping

- owner-created synthetic Auth identifier: `test@example.com`;
- verified Supabase subject: `970e45fc-73cc-4f81-99e7-332aac583fee`;
- local synthetic `StaffUser`: `00000000-0000-4000-8000-000000000020`;
- mapping status: `ACTIVE` during the initial authorization proofs;
- sole effective role: `CONTENT_EDITOR`;
- authorization roles remained in PostgreSQL `StaffUser`/`UserRole` records and were not added to Supabase Auth claims.

### Live authentication and authorization results

- AAL1: the Supabase session was verified, the subject mapped to the active synthetic staff record and `CONTENT_EDITOR`, and the content operation was denied with `MFA_REQUIRED`. This proved that valid authentication did not establish application authorization.
- TOTP/AAL2: the owner completed the approved provider enrollment and challenge flow. No QR, seed, factor secret, recovery code or six-digit challenge was supplied to Codex or stored in application data.
- allowed operation: with the verified AAL2 session, synthetic draft-content read authorization was allowed for `CONTENT_EDITOR`.
- denied operation: with the same AAL2 session, the out-of-role `staff.manage` operation was denied with `ROLE_DENIED`.
- disabled staff: while the provider session remained verified at AAL2, the local synthetic staff status was changed to disabled through the approved repository/domain path. The previously allowed content authorization was immediately denied. The profile was temporarily restored to `ACTIVE` only for the controlled session/sign-out test; no role was added.
- sign-out: the supported sign-out path removed browser SSR authentication, and the prior browser state could no longer establish an application principal. This evidence does not claim immediate global invalidation of an already-issued JWT.
- invalid session: malformed authentication state was denied without returning provider details or token contents.

### Redirect, cookie and CSRF evidence

- redirect allowlist: `/staff` and approved `/staff/*` paths were accepted; `https://example.com`, `//example.com`, `\\example.com`, `/non-staff` and `/staff-evil` fell back safely to `/staff`.
- SSR boundary: cookies remained managed by the approved Supabase SSR server/proxy boundary; server authorization used verified claims plus local database state; browser role claims were not authoritative; application responses and logs did not expose provider tokens or cookie contents.
- CSRF: the existing same-origin mutation seam passed its regression cases. Because no live business mutation endpoint exists, end-to-end production mutation protection remains a production-deployment gate.

### Database and audit security regression

- all 27 expected public production-domain tables retained RLS;
- zero public policies were present and no public policies were introduced for Auth;
- `anon` and `authenticated` retained no prohibited direct CRUD access to production-domain tables, including `StaffUser` and `UserRole`;
- no grant, schema or migration change was made for the live Auth tests;
- `pg` remains the runtime database client and Prisma remains schema/migration tooling only;
- audit payload construction and tests allow only opaque synthetic IDs, fixed action/target/result/reason codes, a correlation ID and the synthetic marker;
- the live database contained zero `phase2c.*` diagnostic audit rows at final review, so no live application audit event is claimed. No sensitive audit metadata key/value was found.

### QR rendering correction and generated-state cleanup

The owner-assisted TOTP gate exposed a narrow rendering defect: Supabase returned the ephemeral TOTP QR as an inline SVG data URI, and the value was passed directly to Next.js `<Image>`. Next.js rejected the source when trailing whitespace/control characters were present. The correction uses a native fixed-size `<img>` with meaningful alternative text and `enrollment.qrCode.trimEnd()`. It introduces no image network request, raw SVG DOM injection, Blob URL, persistence or logging; enrollment data remains client component state for the active enrollment flow only.

The original contaminated development log was deleted. A later broad scan found generic `data:image/svg+xml` markers in generated framework, library and cache output; that generic prefix alone was not treated as enrollment material. Under explicit owner authorization, the entire ignored `.next` directory was deleted without inspection, preservation or recovery, then regenerated through a clean production build and a fresh development start.

The clean production-generated `.next` contained generic SVG support markers in 8 files, classified as framework/library/build syntax. Material-specific, non-disclosing scans found no surviving enrollment-shaped QR payload, `otpauth` URI, TOTP seed, six-digit challenge, JWT, access/refresh token, session cookie or password. Normal signed-out loading of `/internal/staff-auth` produced a fresh development log with zero generic SVG markers and zero sensitive-material-shaped matches. No MFA reenrollment or additional factor creation occurred during cleanup or verification.

### Final verification on 2026-09-04

- clean production build — PASS;
- `npm run prisma:validate` — PASS;
- `npx prisma migrate status` — PASS; six migrations found and the development schema was up to date;
- `npm run test:phase2b` — PASS (`PHASE_2B_DOMAIN_OK`);
- `npm run test:phase2c` — PASS (`PHASE_2C_AUTHORIZATION_OK`);
- `npm run lint` — PASS;
- `npm run typecheck` — PASS;
- `npm run build` — PASS;
- `npm audit --omit=dev` — PASS with zero vulnerabilities;
- `git diff --check` — PASS;
- `.next` and `.env.local` — ignored and untracked;
- canonical logo SHA-256 — unchanged at `2C5D2042EF020AA7AD37FF92E6FD9C3407EF305102EE49DA3B6900FF99FFE60C`;
- frozen Phase 1 frontend — unchanged;
- Auth/TOTP/session secret material — not committed or staged.

### Preserved cleanup inventory

Retain until owner/reviewer acceptance, then remove through a separately controlled cleanup:

1. the synthetic Supabase Auth identity;
2. the verified TOTP factor and any possible unverified factor from the failed pre-fix attempt;
3. the synthetic `StaffUser` and its sole `CONTENT_EDITOR` `UserRole`;
4. any approved diagnostic audit evidence;
5. the development-only diagnostic route.

No item in this inventory was deleted during Phase 2C-LA-GC. All Phase 2C work remains uncommitted and unpushed pending review.

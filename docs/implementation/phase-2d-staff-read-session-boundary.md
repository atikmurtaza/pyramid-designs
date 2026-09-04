# Phase 2D — Synthetic Staff Read Boundary and Session Lifecycle Verification

**Date:** 2026-09-04

**Status:** **PASS**

**Scope:** Development-only authenticated staff reads and synthetic verification. No migration, real staff/candidate data, candidate intake, file transfer, Google Drive, email, Turnstile, scheduler, production deployment or DNS change was made.

## 1. Repository starting state

- branch: `main`;
- `HEAD`: `fab6f5e0dbd57d265edc9bda1b7886a541c6f5e4` (`feat: add staff authentication and authorization foundation`);
- refreshed `origin/main`: the same commit;
- ahead/behind: `0/0`;
- working tree: clean before Phase 2D;
- unexplained changes: none.

The frozen Phase 1 public frontend was not modified. The existing development-only staff authentication page was extended only with links to the Phase 2D diagnostic read endpoint.

## 2. Migration and ADR decision

**Migration required:** NO.

**ADR change required:** NO.

The Phase 2B `Job`, `Application`, `AuditEvent`, `StaffUser` and `UserRole` structures already support the approved read boundary. Prisma remains schema/migration tooling and `pg` remains the deployable runtime database client.

## 3. Staff read architecture

Protected reads follow this server-owned sequence:

`verified Supabase claims -> local StaffUser -> ACTIVE status -> current UserRole rows -> AAL2/role/operation/target pre-authorization -> minimum target-state query -> full database-state authorization -> explicit DTO query -> safe response`

`authorizeBeforeTargetStateLookup()` reuses the Phase 2C principal, role, operation and target checks before any target row is queried. `requireAuthorization()` then evaluates database-derived state before a protected DTO query runs. The initial state query selects only the fields needed to decide authorization.

No role, staff identifier, target state or authorization decision is accepted from the browser. All SQL values are parameters and no arbitrary query endpoint exists.

## 4. Protected read operations

The fixed development-only endpoint is:

`GET /api/internal/staff-auth/read`

It supports only these allowlisted resource selections:

| Resource | Policy operation | Target | Result |
| --- | --- | --- | --- |
| `job&id=<uuid>` | `job.draft.read` | `JOB` | reviewer context DTO or manager/admin DTO |
| `application&id=<uuid>` | `application.contact.read` | `APPLICATION` | minimum contact DTO |
| `audit` | `audit.events.read` | `AUDIT` | maximum 20 PII-safe evidence rows |

The endpoint is hard-disabled with `404` in production. It performs no mutation and appends no audit event for a harmless GET.

## 5. Principal summary

The safe principal summary is returned only with a successful protected read. It contains:

- local opaque `staffUserId`;
- effective PostgreSQL roles;
- `aal2` assurance;
- fixed `AUTHORIZED` state.

It excludes the Supabase subject, access/refresh tokens, raw JWT, cookies, provider session, email, password, TOTP/factor data and recovery material.

## 6. DTO and data minimisation

### Job

`HIRING_REVIEWER` receives only `id`, title, department name, lifecycle state and the fixed `APPLICATION_CONTEXT` detail level. The read is available only when the target job has a current submitted, retained, non-deleted application context.

`HIRING_MANAGER` and `ADMIN` additionally receive the fixed management fields: slug, location label, work arrangement, employment type, experience level, shift schedule, summary, application deadline and version.

`CONTENT_EDITOR` and `AUDITOR` receive no job DTO because the accepted matrix grants neither role `job.draft.read`.

### Application contact

The contact DTO contains only:

- application ID and public reference;
- application type and optional job ID;
- name, email, city and optional phone/WhatsApp snapshot;
- technical/hiring status;
- expiry and creation timestamps.

It excludes answers, introduction, professional/portfolio URLs, accommodation state, source/campaign values, retention-policy internals, files, hashes, security reviews, consent, notes, history and audit metadata.

The current accepted hiring roles operate over the global recruitment domain because no narrower assignment model exists in the approved schema. The server supplies this scope; no client-supplied scope is read.

### Audit

The audit DTO excludes `safeMetadata` and `actorStaffUserId`. `HIRING_MANAGER` receives only `APPLICATION`, `CANDIDATE_FILE` and `JOB` target types. `ADMIN` and `AUDITOR` receive the broader PII-safe evidence selection. The fixed limit is 20 and is not client-controlled.

No protected read uses `SELECT *`.

## 7. Authorization matrix evidence

`A/A` means expected allowed / actual allowed. `D/D` means expected denied / actual denied.

| Principal | Job | Application contact | Audit |
| --- | :---: | :---: | :---: |
| `CONTENT_EDITOR` | D/D | D/D | D/D |
| `HIRING_REVIEWER` | A/A, context-limited | A/A | D/D |
| `HIRING_MANAGER` | A/A | A/A | A/A, recruitment-limited |
| `ADMIN` | A/A | A/A | A/A |
| `AUDITOR` | D/D | D/D | A/A |
| zero roles | D/D | D/D | D/D |
| disabled user | D/D | D/D | D/D |
| unknown role | D/D | D/D | D/D |
| no/invalid session | D/D | D/D | D/D |
| AAL1 | D/D | D/D | D/D |
| `CONTENT_EDITOR` + `AUDITOR` | D/D | D/D | A/A |

Denied role/AAL/session cases were exercised with a database executor that fails if called. All were denied before any target/content query.

## 8. Candidate-data isolation

The existing valid synthetic application ID was attempted as:

- `CONTENT_EDITOR`;
- `AUDITOR`;
- zero-role principal;
- unknown-role principal;
- disabled local user;
- AAL1 principal;
- unauthenticated/invalid session;
- multiple-role `CONTENT_EDITOR` + `AUDITOR` principal.

All were denied before an application query. The development HTTP endpoint returned only `401 AUTHENTICATION_REQUIRED` while signed out. Generic denied responses contain no candidate name, contact value, SQL, provider detail, role list or target-state detail.

## 9. Object/target authorization

- malformed UUID: denied before PostgreSQL;
- valid existing application ID with unauthorized role: denied before PostgreSQL;
- valid nonexistent application/job UUID: one minimum state lookup, then generic not available;
- expired retention state: state lookup only, protected DTO query did not run;
- target type and operation: fixed by the server resource switch;
- client state: no input exists for lifecycle, technical, hiring, retention, deletion or recruitment-scope state;
- database state: authoritative for every state-aware decision.

This prevents a supplied object ID or claimed state from establishing access.

## 10. Session lifecycle

### Proven

- AAL1 principal: denied before target lookup;
- AAL2 approved principals: allowed according to the exact role matrix;
- disabled `StaffUser`: a controlled transaction changed the local status while claims remained valid; the next principal resolution denied, then the transaction rolled back;
- role removal: a controlled transaction revoked the sole current role while claims remained valid; the next principal resolution denied, then the transaction rolled back;
- restoration: the synthetic `CONTENT_EDITOR` mapping and sole role were confirmed after rollback;
- sign-out/expiry seam: the same claims reader changed from a valid AAL2 subject to null; the next resolution returned no principal, proving no in-process/browser authorization object is cached;
- malformed/empty subject: denied;
- actual signed-out browser request: after supported sign-out, the same audit endpoint returned `401 AUTHENTICATION_REQUIRED` without a principal or audit DTO.

### Live evidence limitation

The owner-assisted live continuation on 2026-09-04 began after the session had already been upgraded to AAL2. A fresh real-browser AAL1 audit-read denial was therefore not captured in this continuation. The automated Phase 2C/2D authorization suites prove that AAL1 is denied before protected database reads, but that evidence is not represented as a new live-browser AAL1 request. On 2026-09-04, the owner accepted this as a non-blocking evidence limitation for Phase 2D closure; the AAL1 deny-by-policy and regression-test requirements remain unchanged.

No claim is made that browser sign-out immediately revokes every previously issued JWT globally.

## 11. Cache security

The endpoint declares Node.js runtime, `dynamic = "force-dynamic"` and `revalidate = 0`. Every JSON response sets:

- `Cache-Control: private, no-store, max-age=0`;
- `Pragma: no-cache`;
- `Vary: Cookie`.

The development HTTP probe confirmed these headers on the signed-out response. The endpoint is not statically generated and is unavailable in production.

## 12. Logging and error security

The route does not log provider/database exceptions. Browser responses use only fixed codes:

- `AUTHENTICATION_REQUIRED`;
- `NOT_AVAILABLE`;
- `READ_UNAVAILABLE`.

No SQL, connection string, stack, JWT, cookie, token, TOTP material, candidate contact/answers, file data or internal policy structure is returned. The route performs no read-access audit mutation and does not copy protected payloads into logs.

## 13. Database security regression

The Phase 2D suite confirmed:

- every current public table retains RLS;
- zero public RLS policies exist;
- `anon` and `authenticated` have no prohibited direct CRUD privileges;
- `StaffUser` and `UserRole` remain server-mediated;
- `pg` remains pinned runtime;
- `@prisma/client` and `@prisma/adapter-pg` remain absent.

The current synthetic development/migration identity remains privileged and is not approved as the production runtime identity.

## 14. Test results

Final mandatory regression on 2026-09-04:

- `npm run prisma:validate` — PASS;
- `npx prisma migrate status` — PASS; six migrations found, schema up to date;
- `npm run test:phase2b` — PASS (`PHASE_2B_DOMAIN_OK`);
- `npm run test:phase2c` — PASS (`PHASE_2C_AUTHORIZATION_OK`);
- `npm run test:phase2d` — PASS (`PHASE_2D_STAFF_READS_OK`);
- `npm run lint` — PASS;
- `npm run typecheck` — PASS;
- `npm run build` — PASS; 18 generated pages and the Phase 2D endpoint is dynamic;
- `npm audit --omit=dev` — PASS; zero vulnerabilities;
- `git diff --check` — PASS.

The Node verification scripts continue to emit the existing module-type performance warning. Adding `"type": "module"` was not necessary for Phase 2D and was not introduced.

## 15. Route and frontend regression

Production HTTP smoke results:

- approved public/frozen routes tested: `200`;
- `/dev/design-system`: `404`;
- `/internal/staff-auth`: `404`;
- `/api/internal/staff-auth/read`: `404`;
- `/api/internal/staff-auth/verify`: `404`.

The production home page rendered meaningful content in Edge with no framework error overlay and no document-level horizontal overflow at the connected desktop viewport. The only browser warning was the pre-existing Three.js `Clock` deprecation, unrelated to Phase 2D.

The connected browser viewport override did not change the actual rendered width, so this execution does not claim a fresh 320 px browser proof. No frozen public frontend file changed, and the complete diff confirms that Phase 2D cannot introduce a public-layout source regression.

The canonical approved logo remains unchanged at SHA-256 `2C5D2042EF020AA7AD37FF92E6FD9C3407EF305102EE49DA3B6900FF99FFE60C`.

## 16. Current guidance review

Official Supabase SSR/claims/security guidance and the Supabase changelog were rechecked. No current Auth/SSR breaking change requires a different Phase 2D design. The announced Supabase JavaScript client move to Node.js 22 or later is already satisfied by the repository's Node.js 22 requirement.

Next.js data-security guidance supports keeping reads server-side, returning explicit DTOs and re-authorizing at each server entry point. The Phase 2D endpoint is explicitly dynamic and no-store.

## 17. Sensitive-material scan

The final value-shaped scan excluded `.env.local` and found zero database URLs, access/refresh tokens, JWTs, session cookies, passwords, TOTP/OTP URIs, provider credentials or private keys in the seven Phase 2D files. The clean production-generated `.next/server` and `.next/static` output also had zero matches.

The repository-wide tracked scan identified only the pre-existing loopback PostgreSQL fallback in `prisma.config.ts`; it resolves to localhost port 5432 and is not a production credential. The tracked `.env.example` filename was separately reviewed and contains no non-placeholder assignment. No candidate file or generated/log output is tracked or untracked by Phase 2D.

## 18. Synthetic fixtures and cleanup inventory

No new persistent database fixture or Auth user was created. Phase 2D reuses the accepted Phase 2B/2C synthetic rows. Temporary status and role changes ran inside rollback-only transactions.

Retain for later controlled cleanup:

1. the Phase 2C synthetic Supabase Auth identity;
2. its verified TOTP factor and any possible earlier unverified factor;
3. the synthetic `StaffUser` and role rows;
4. Phase 2B/2C synthetic domain/audit evidence;
5. `/internal/staff-auth` and `/api/internal/staff-auth/verify`;
6. `/api/internal/staff-auth/read` and its Phase 2D page links;
7. Phase 2A compatibility probes pending their dedicated cleanup phase.

## 19. Deferred release gates

- company-controlled real staff ownership, recovery and production MFA enrollment;
- final production/preview/development Auth isolation and redirect allowlists;
- Hostinger cookie/proxy/origin and mutation-CSRF verification;
- dedicated least-privilege production PostgreSQL runtime identity;
- production staff portal/BOLA review beyond the development diagnostic surface;
- diagnostic and synthetic fixture cleanup;
- real-device and fresh 320 px responsive review;
- deployment, production migration execution, DNS and launch approval.

## 20. Git boundary

The owner approved Phase 2D closure and authorized the scoped commit/push on 2026-09-04 after accepting the absent fresh browser AAL1 repetition as a non-blocking evidence limitation. Final commit and remote-SHA evidence is reported by the release execution. No production action was authorized or taken.

Deployment, diagnostic cleanup and Phase 2E remain separately gated.

## Phase 2D-MFA existing-factor correction

The Phase 2D live browser test required a challenge against the synthetic account's existing verified TOTP factor, but the Phase 2C development UI supported enrollment only. The development verification UI now lists the account's factors, ignores every unverified or non-TOTP factor, and deterministically selects the oldest verified TOTP factor (then lexical factor ID for an equal creation timestamp). It creates and verifies a challenge for that factor without calling the enrollment API or displaying QR, secret, recovery or provider-response material.

Successful verification saves the provider-issued session through the installed Supabase client and reloads the page. The server then resolves current verified claims, assurance, local staff status and PostgreSQL roles; no client-side AAL flag is trusted. Any earlier unverified factor remains untouched for later controlled cleanup. The owner-assisted existing-factor AAL2 verification completed on 2026-09-04; the separate live AAL1-read evidence limitation is recorded below.

## Phase 2D-LA Live Browser Closure

On 2026-09-04, the owner authorized one temporary synthetic `AUDITOR` assignment solely for this live verification. The existing `CONTENT_EDITOR` assignment remained present, and the temporary effective roles were confirmed as `CONTENT_EDITOR` and `AUDITOR`. No Auth identity, MFA factor, JWT/custom claim, schema, migration or authorization rule was changed.

The owner completed the challenge against the existing verified TOTP factor. The staff-auth page then re-resolved the real provider/server state as authenticated, `ACTIVE`, AAL2, with effective `CONTENT_EDITOR` and `AUDITOR` roles.

Using that AAL2 browser session:

- the audit read succeeded through the protected Phase 2D route and returned the allowlisted audit DTO;
- the known synthetic application-contact read returned only generic `NOT_AVAILABLE` and no candidate/contact DTO;
- a malformed application ID returned only generic `NOT_AVAILABLE`;
- the supported staff-auth sign-out control returned the browser to the signed-out form;
- the same audit endpoint was manually reopened after sign-out and returned only `AUTHENTICATION_REQUIRED`, with no principal or audit DTO.

The route remains force-dynamic and applies `Cache-Control: private, no-store, max-age=0`, `Pragma: no-cache` and `Vary: Cookie` to every JSON response. No allowed audit payload, candidate payload, credential, password, TOTP value/seed, token, cookie or database secret was copied into this record or application logs.

The temporary `AUDITOR` row was removed by exact ID in a parameterized transaction. Final direct database verification confirmed the synthetic staff user is `ACTIVE` with exactly one effective role: `CONTENT_EDITOR`. The Auth identity and verified/unverified factor inventory were not modified. Cleanup was completed before the final manual post-sign-out request after the browser automation layer initially displayed stale content and then blocked direct JSON navigation; the endpoint resolves authentication before roles, and the final response was `AUTHENTICATION_REQUIRED` rather than a role denial.

Proven in the live browser: existing-factor AAL2 verification; allowed AAL2 audit read; candidate-data denial; malformed-target denial; supported sign-out; and denial of the next audit request after sign-out.

Not proven in this live continuation: a fresh AAL1 audit-read denial; immediate global invalidation of every already-issued JWT; revocation across other devices/browsers; or Hostinger production cookie/session behavior. The owner accepted the first item as a non-blocking evidence limitation; the remaining items stay deferred production/session gates.

The owner approved Phase 2D closure with the automated AAL1 denial evidence and the completed live AAL2/read/isolation/sign-out lifecycle. The absent fresh live AAL1 repetition remains recorded without weakening the authorization requirement.

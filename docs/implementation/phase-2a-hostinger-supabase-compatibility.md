# Phase 2A — Hostinger + Supabase synthetic compatibility spike

**Date:** 2026-09-02; live Supabase closure and Phase 2A-H Hostinger verification 2026-09-03

**Status:** **FAIL — SUPABASE COMPATIBILITY PASS; SECURITY PASS; HOSTINGER FRONTEND PASS; HOSTINGER PRISMA RUNTIME FAIL; NODE ISOLATION DIAGNOSTIC READY FOR HOSTINGER**

**Scope:** Synthetic compatibility preparation, local verification, live Supabase verification, the Phase 2A-SC server-only table correction and verification of an isolated Hostinger temporary deployment. The temporary Hostinger deployment does not change production DNS. No real candidate data, staff authentication, Google Drive integration, production-domain deployment or Phase 2B work was performed.

Current Phase 2A status on 2026-09-03:

- **SUPABASE COMPATIBILITY: PASS**
- **SUPABASE COMPATIBILITY SECURITY: PASS**
- **HOSTINGER FRONTEND DEPLOYMENT: PASS**
- **HOSTINGER PHASE 2A RUNTIME PROBES: FAIL — PRISMA ROUTES RETURN `500` BEFORE AUTHORIZATION**
- **PHASE 2A-NI NODE ISOLATION: LOCAL PASS; HOSTINGER DIAGNOSTIC DEPLOYMENT REQUIRED**
- **OVERALL PHASE 2A: FAIL — DO NOT APPROVE PHASE 2A**

The reviewed Phase 2A compatibility infrastructure and narrow Phase 2A-P Webpack correction are deployed from `origin/main`. The final Hostinger retest still fails before route authorization because the Hostinger process raises `EEXIST` while Node initializes `process.stdin`. Hostinger-to-Supabase connectivity through the deployed Prisma routes remains unproven.

## Phase 2A-H outcome on 2026-09-03

**Status: FAIL.** The isolated Hostinger Web App is running successfully, but it was deployed from `main` at `cf2dd2a7`, the Phase 1 frontend-freeze commit. All Phase 2A compatibility routes, Prisma files and the security migration remain uncommitted locally and are absent from `origin/main`. Hostinger also has zero environment variables configured. Protected Hostinger runtime testing therefore stopped without inventing or exposing credentials.

Temporary deployment: `https://blueviolet-dugong-584081.hostingersite.com`

Required Hostinger runtime variables after the approved Phase 2A commit is pushed:

- `DATABASE_URL` — required by the running Prisma database and cron probes;
- `COMPATIBILITY_PROBE_SECRET` — required by the protected compatibility routes;
- `CRON_SECRET` — required by the protected cron route.

`DIRECT_URL` is not required by the running web application. It remains reserved for controlled migration or administrative execution from the approved operator/release environment. Do not add it to Hostinger merely because it exists in `.env.example`.

The owner must not paste values into chat. After the correct commit exists on `origin/main`, add the three required runtime variable names in hPanel using their existing secret values and redeploy. That redeploy is required because the current process contains neither the probe code nor the variables.

## 1. Objective

Prove the smallest useful path for the accepted Hostinger managed Node.js Web App plus Supabase Free PostgreSQL architecture before production data models or workflows depend on it.

The repository now contains isolated probes for:

- Next.js App Router Route Handler execution;
- server-only environment access;
- Prisma-to-PostgreSQL read/write behavior;
- protected, idempotent cron invocation;
- outbound HTTPS to a public Google API endpoint;
- Next.js cache tagging and on-demand revalidation;
- bounded synthetic request-body transport around the future 5 MiB candidate-file target.

These probes prepare the real compatibility test. The owner created the isolated Supabase project, but the 2026-09-03 live attempt was rejected at PostgreSQL authentication for both configured connection variables. Hostinger runtime compatibility remains separately deferred and unproven.

## 2. Hostinger account requirements

The intended account must expose all of the following in hPanel without a plan upgrade:

1. **Web App / Deploy Web App** for a Node.js/Next.js repository.
2. A Node.js version compatible with the repository and Prisma 6.12.0. Select Node.js 22; use Node.js 24 only if it is a supported stable option shown by hPanel and the isolated test passes.
3. Enough CPU, memory, storage, process and build time for `npm ci` and `npm run build`.
4. Environment-variable management for server-only values.
5. Deployment and runtime logs that can be inspected without exposing secrets.
6. Restart and redeploy controls.
7. GitHub repository/branch deployment controls.
8. Cron jobs capable of making a protected HTTPS `POST` request.
9. A temporary generated URL, preview subdomain, or isolated non-production subdomain.

## 3. Verified Hostinger capabilities

### VERIFIED DOCUMENTED CAPABILITY

Hostinger's official documentation reviewed on 2026-09-02 documents:

- GitHub-based Node.js Web App deployment on eligible Business and Cloud hosting plans;
- framework detection including Next.js, configurable Node.js version, build command, start command and environment variables;
- deployment logs, application logs, resource usage, restart, redeploy and environment-variable management in hPanel;
- cron jobs configured in UTC through hPanel, with plan-specific command length, count, concurrency and minimum-interval limits;
- account-level resource and hosting limits shown in hPanel and the plan limit documentation.

Official sources:

- <https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/>
- <https://www.hostinger.com/support/1583465-how-to-set-up-a-cron-job-at-hostinger/>
- <https://www.hostinger.com/support/1583765-how-many-cron-jobs-can-you-set-up-in-hostinger/>
- <https://www.hostinger.com/support/6976044-parameters-and-limits-of-hosting-plans/>

These are generic product capabilities, not proof of the owner's plan or this application.

## 4. Account-specific unknowns

### OWNER ACCOUNT CONFIRMATION REQUIRED

Record screenshots or written evidence from the owner's hPanel for:

- exact hosting plan name;
- Web App / Deploy Web App availability;
- Node.js runtime choices;
- CPU, RAM, storage, inode, process and build limits;
- cron availability, minimum frequency, command length and concurrency;
- effective Node Web App proxy request/body limits;
- effective file-upload limit and timeout behavior;
- environment-variable management and whether changes require restart/redeploy;
- build and start command controls;
- deployment/application log access and retention;
- restart/redeploy controls and observed downtime;
- GitHub repository access, branch selection and automatic deployment controls;
- availability of a temporary generated URL or isolated subdomain.

Do not infer Node Web App request limits from PHP or File Manager upload limits. The official generic limits page does not establish the effective reverse-proxy/body limit for this exact Next.js application.

## 5. Next.js runtime result

### Locally proven

- Existing application remains on Next.js 16.3.3, React 19.2.8 and Node.js `>=22`.
- Local verification used Node.js 24.15.0.
- `next build` passed and retained 17 public/static pages.
- All Phase 2A API routes compiled as dynamic Node.js Route Handlers.
- Protected server probe returned Node runtime metadata, a server timestamp and a boolean proving a server-only secret was read. It did not reflect the secret.
- Unauthenticated access returned `401` with only `UNAUTHORIZED`.
- Home returned `200`; `/dev/design-system` returned `404` under the production server.

### Hostinger-dependent

App Router, Route Handlers, process lifetime, environment persistence, logs, restart and redeploy behavior must be repeated on the isolated Hostinger runtime. A local production build is not Hostinger evidence.

## 6. Environment strategy

`.env.example` contains names and descriptions only. `.env` and `.env.*` remain ignored except `.env.example`.

| Class | Variables | Rule |
| --- | --- | --- |
| Public browser configuration | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | May be bundled into browser code. Not used by Phase 2A because Auth is not implemented. |
| Runtime database secret | `DATABASE_URL` | Server-only PostgreSQL runtime connection. Never expose through `NEXT_PUBLIC_*`. |
| Migration/admin database secret | `DIRECT_URL` | Server-only connection used by Prisma CLI/migrations from a controlled operator environment. |
| Temporary diagnostic secrets | `COMPATIBILITY_PROBE_SECRET`, `CRON_SECRET` | Minimum 32 characters; server-only bearer secrets. |
| Reserved future server secrets | `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` | Leave unset in Phase 2A. Their presence in the example is inventory only, not implementation authority. |

`src/lib/env/public.ts` validates optional public URLs. `src/lib/server/environment.ts` is guarded by `server-only` and validates required PostgreSQL URLs and diagnostic secrets only when a server operation uses them. Missing provider credentials therefore do not break a documentation/preparation build.

## 7. Prisma version and strategy

Pinned versions:

- `prisma` 6.12.0;
- `@prisma/client` 6.12.0;
- `@prisma/adapter-pg` 6.12.0;
- `pg` 8.23.0;
- `@types/pg` 8.23.1.

Prisma 7.10.0 was evaluated first because it was the current stable release available during the spike, but its installed CLI dependency tree caused four high-severity findings under the mandatory `npm audit --omit=dev` check. Prisma 6.19.3 still caused three high-severity findings. Prisma 6.12.0 is therefore pinned as the smallest audited version that provides the required PostgreSQL driver-adapter and migration behavior; its installed tree reports zero vulnerabilities. Prisma 8.0.0 was still a release candidate and was not adopted.

The repository uses `prisma.config.ts` for CLI datasource selection and the `prisma-client` generator with an explicit output path. `npm ci` runs `prisma generate` through `postinstall`. Runtime access uses the official `@prisma/adapter-pg` driver adapter and a process-level pool limited to three connections for this low-volume spike. A clearly non-provider local schema-only URL lets generation/build run before owner credentials exist; migration commands use `DIRECT_URL` or `DATABASE_URL` when set and otherwise fail safely because no local PostgreSQL service is assumed.

The only schema object is temporary:

```text
CompatibilityProbe
- id UUID
- createdAt timestamptz
- label unique varchar(80)
```

No Phase 0 production business model was implemented.

## 8. Supabase connection architecture

Supabase's current documentation distinguishes direct, session-pooler and transaction-pooler connections:

- **Direct connection:** suitable for persistent servers and migration tooling when IPv6 connectivity is available.
- **Supavisor session pooler, port 5432:** suitable for persistent application servers needing IPv4 and supports prepared statements.
- **Supavisor transaction pooler, port 6543:** intended for transient/serverless clients; prepared statements are not supported and connection usage must remain conservative.

Selected Phase 2A arrangement:

- `DATABASE_URL`: use the exact **Supavisor session pooler** URL from the development project's Connect panel for the persistent Hostinger runtime. This is the safest first test where Hostinger IPv6 support is unknown.
- `DIRECT_URL`: use the exact direct database URL for controlled migration tooling when the operator environment has IPv6. If direct connectivity is unavailable, use the session pooler on port 5432. Do not use transaction mode for migrations.
- Run `prisma migrate deploy` from one controlled operator/release step, not from every application process startup.
- Never expose application tables through a browser Supabase client during this spike.

Official sources:

- <https://supabase.com/docs/guides/database/prisma>
- <https://supabase.com/docs/guides/database/connecting-to-postgres>
- <https://www.prisma.io/docs/orm/overview/databases/postgresql>

The first live attempt used the same direct Supabase connection for both variables and PostgreSQL rejected authentication. The first Phase 2A-SR Session Pooler retry also failed authentication. On the second retry on 2026-09-03, both `DATABASE_URL` and `DIRECT_URL` authenticated through the Connect-panel Session Pooler connection on port 5432 and executed a test query successfully.

No replacement URL was invented and `.env.local` was not modified during verification. The Session Pooler arrangement is proven from the local operator environment; Hostinger connectivity remains separately unproven.

## 9. Database probe

Route: `POST /api/internal/compatibility/database`

Controls and behavior:

- requires `Authorization: Bearer <COMPATIBILITY_PROBE_SECRET>`;
- performs no arbitrary SQL;
- upserts one fixed synthetic label and counts matching rows;
- returns only safe status, first creation timestamp and count;
- returns generic `DATABASE_UNAVAILABLE` without credentials, provider URL, SQL or stack trace;
- logs only a fixed safe failure code.

Live result: missing and incorrect secrets returned `401 UNAUTHORIZED`. The correct server-side secret returned `200 DATABASE_PROBE_OK`, upserted the fixed synthetic label and reported one matching row. A repeated call retained the original timestamp and one-row count. Responses and logs exposed no connection, credential, SQL or Prisma detail.

Provider status: **LIVE SUPABASE VERIFIED**. `DATABASE_URL` and `DIRECT_URL` authenticated separately. The reviewed migration applied successfully and is recorded once in Prisma's migration ledger. The fixed synthetic database probe, read/count and idempotency checks passed.

## 10. Cron probe

Route: `POST /api/internal/cron-probe`

- protected by the separate `CRON_SECRET`;
- upserts the fixed label `phase-2a-cron-probe`;
- repeated calls converge on one row, so the spike is idempotent;
- records no candidate data and returns no database/provider detail.

Phase 2A-SR live result on 2026-09-03: missing and incorrect secrets returned `401 UNAUTHORIZED`. The correct secret returned `200 CRON_PROBE_OK`. Two repeated calls retained the original timestamp and converged on the single fixed cron label. Responses and logs exposed no credential or provider detail. Hostinger cron execution remains **OUTSTANDING / HOST-RUNTIME GATE**.

Hostinger test command pattern, entered only in hPanel with the real temporary secret:

```sh
curl --fail --silent --show-error --request POST --header "Authorization: Bearer <CRON_SECRET>" https://<isolated-host>/api/internal/cron-probe
```

Test one manual invocation, two closely repeated invocations, and one scheduled invocation. Confirm the first timestamp remains unchanged and no duplicate row appears. Record hPanel's displayed UTC schedule, execution result and logs without the secret.

## 11. Outbound HTTPS probe

Route: `POST /api/internal/compatibility/outbound`

The server makes an unauthenticated HTTPS request to Google's public Drive v3 discovery document, requires a successful JSON response, discards the body and returns only `OUTBOUND_HTTPS_OK` or a generic failure code. It sends no secret or candidate data and does not create a Google resource.

Local production result: **PASS**.

Hostinger runtime result: **PENDING ISOLATED DEPLOYMENT**.

## 12. ISR and revalidation result

The frozen public routes do not currently need ISR. They remain static or server-rendered according to their existing design. Phase 2A therefore did not add a public test page or force caching architecture into production content.

The protected route `GET/POST /api/internal/compatibility/revalidation` uses a temporary tagged `unstable_cache` value with a five-minute revalidation interval:

- two reads returned the same cached timestamp;
- protected `POST` called `revalidateTag(..., { expire: 0 })`;
- the next read returned a new timestamp.

Local result: **PASS**.

Hostinger test must establish whether the cache survives ordinary requests and restart behavior as expected, and how redeploy replacement affects `.next/cache`. Next.js self-hosting documentation states the default cache is stored on the local filesystem and each process has its own in-memory cache; multi-instance deployments need shared cache coordination. Do not assume a cached value is authoritative business state.

Official source: <https://nextjs.org/docs/app/guides/self-hosting>

## 13. Request and upload limit result

Route: `POST /api/internal/compatibility/upload`

- accepts only a protected synthetic byte stream;
- streams and counts bytes without storing the payload;
- reports whether the request reached the 5 MiB transport target;
- caps the diagnostic at 6 MiB and returns `413 PROBE_PAYLOAD_TOO_LARGE` above that cap;
- does not inspect a CV, filename, phone number, candidate answer or other candidate information.

Local Node/Next production results:

| Synthetic payload | Result |
| --- | --- |
| 1 KiB | `200`, 1,024 bytes received |
| 5 MiB | `200`, 5,242,880 bytes received |
| 5 MiB + 1 byte | `200`, proving transport above the intended future policy limit |
| 6 MiB + 1 byte | `413 PROBE_PAYLOAD_TOO_LARGE` |

The endpoint's 6 MiB cap is a diagnostic ceiling, not the future candidate-file policy. The production candidate endpoint must separately enforce the approved 5 MiB policy and PDF validation in its authorized later phase.

Hostinger effective body, proxy, timeout and WAF limits remain **UNKNOWN** until the same tests run on the isolated Web App. A Hostinger rejection below 5 MiB is an architecture-significant finding and must be reported without adding a workaround.

## 14. Restart and redeploy assumptions

The architecture must treat Hostinger process memory as ephemeral:

- restart or crash discards in-memory state and database connection pools;
- the Prisma pool is recreated on the next request;
- deployment may replace application build files and local Next.js cache;
- cron may fire while an application instance is restarting and must tolerate a failed/retried invocation;
- database rows, unique constraints and idempotent transitions are authoritative;
- future jobs, candidate state and idempotency must live in PostgreSQL, never process memory.

Isolated runtime test sequence:

1. Run all probes and record results.
2. Restart the Web App in hPanel.
3. Confirm the server and database probes recover without changing the fixed database timestamps.
4. Trigger cron twice and confirm one row remains.
5. Record cache marker behavior before/after restart.
6. Redeploy the same reviewed commit.
7. Confirm environment variables remain configured, routes recover and database rows remain unchanged.
8. Record observed downtime, logs and whether an invocation during restart fails safely.

## 15. Security controls

- All compatibility operations are internal, non-linked and dynamic server routes.
- Every route that exercises sensitive server behavior requires a bearer secret.
- Secrets must be at least 32 characters and are compared with `timingSafeEqual`.
- Database and cron secrets are separate.
- Responses use fixed safe codes and `Cache-Control: no-store`.
- No route returns environment values, database URLs, Google URLs, SQL, stack traces or credentials.
- Database and cron operations use fixed Prisma queries only.
- `CompatibilityProbe` has RLS enabled with no policies and no `PUBLIC`, `anon` or `authenticated` table grants.
- Prisma uses the server-only Session Pooler database connection. The current pooled database role owns the temporary table and has database-level RLS bypass, so server access remains available while public Supabase roles are denied. The role name and credentials are not recorded.
- This temporary privileged compatibility path is not approval for future production tables. Phase 2B must separately implement and verify the approved least-privilege runtime/migration-role strategy.
- Upload bytes are counted and discarded.
- Outbound probe sends no authorization or candidate data.
- No Auth, staff user, MFA, RBAC, candidate backend or Google Drive credential exists.

## 16. Temporary spike code

- `.env.example`
- `prisma.config.ts`
- `prisma/schema.prisma`
- `prisma/migrations/20260902000000_phase_2a_compatibility_probe/migration.sql`
- `prisma/migrations/20260903000000_phase_2a_compatibility_probe_security/migration.sql`
- `src/lib/env/public.ts`
- `src/lib/server/environment.ts`
- `src/lib/server/compatibility.ts`
- `src/lib/server/prisma.ts`
- `src/app/api/internal/compatibility/server/route.ts`
- `src/app/api/internal/compatibility/database/route.ts`
- `src/app/api/internal/compatibility/outbound/route.ts`
- `src/app/api/internal/compatibility/revalidation/route.ts`
- `src/app/api/internal/compatibility/upload/route.ts`
- `src/app/api/internal/cron-probe/route.ts`
- `scripts/run-phase-2a-probes.mjs`

No frozen public page, component, stylesheet, content record or approved logo asset was changed.

## 17. Cleanup requirements

### 2026-09-03 retention decision

Retain the temporary model, applied migration, protected routes and probe runner for the separately deferred Hostinger runtime test. Removing them now would discard the agreed compatibility evidence path. No destructive cleanup was attempted.

Before launch, after compatibility evidence is accepted:

1. Remove all `/api/internal/compatibility/*` routes.
2. Remove `/api/internal/cron-probe` or replace it only in a separately authorized background-job phase.
3. Drop `CompatibilityProbe` through a reviewed migration and remove it from the Prisma schema.
4. Remove `COMPATIBILITY_PROBE_SECRET` from every environment.
5. Rotate/remove the temporary `CRON_SECRET` unless it is deliberately replaced for an approved real cron worker.
6. Remove the probe runner and recorded synthetic evidence containing temporary hostnames.
7. Retain Prisma only if the approved production data phase proceeds.

## 18. Owner actions required

The Supabase portion of Phase 2A is complete. Do not generalize the temporary table's privileged server role to production data models; the future least-privilege runtime/migration-role implementation remains subject to separate Phase 2B authorization and verification.

The isolated Hostinger deployment exists, but the runtime retry is blocked until the deployed source and variables match the approved probe:

1. Review the complete uncommitted Phase 2A change set and explicitly authorise its closure commit and push.
2. Confirm `origin/main` contains the compatibility routes, Prisma schema and both reviewed migrations.
3. In Hostinger hPanel, add `DATABASE_URL`, `COMPATIBILITY_PROBE_SECRET` and `CRON_SECRET` using controlled values. Do not paste values into chat or source control.
4. Keep `DIRECT_URL` in the controlled migration/operator environment; it is not required by the running Hostinger application.
5. Redeploy `main` to the existing isolated temporary domain using Node.js 22.x. Do not use the production domain or change DNS.
6. Confirm hPanel reports the new commit and the protected routes return `401` for missing/invalid secrets before using correct secrets.
7. Run the full probe suite from a controlled workstation:

```powershell
$env:COMPATIBILITY_BASE_URL = "https://<isolated-host>"
$env:COMPATIBILITY_PROBE_SECRET = "<temporary-secret>"
$env:CRON_SECRET = "<temporary-cron-secret>"
npm run probe:phase2a
```

8. Perform the restart/redeploy sequence in section 14.
9. Capture sanitized hPanel evidence: plan/runtime settings, build/start results, logs, resource graph, cron result, upload results, restart/redeploy observations and commit reference.

## 19. Blockers and open evidence

- The Phase 2A-H check found an isolated Hostinger deployment whose public frontend/runtime checks passed, but it deployed `cf2dd2a7`, which predates all Phase 2A compatibility code.
- Phase 2A-D subsequently authorised the reviewed compatibility infrastructure for commit and push. Hostinger must still redeploy the resulting `origin/main` commit.
- Hostinger hPanel currently has zero environment variables. `DATABASE_URL`, `COMPATIBILITY_PROBE_SECRET` and `CRON_SECRET` must be added by name after the Phase 2A commit is approved and pushed. `DIRECT_URL` remains operator-only.
- Live Supabase Session Pooler authentication, SQL, migrations, protected database/cron probes and idempotency are proven from the local operator environment.
- The temporary table's public-role access issue is corrected: RLS is enabled with no policies, and `PUBLIC`, `anon` and `authenticated` have no table grants.
- Hostinger cron execution is unproven; no Web App cron control was exposed in the inspected site navigation or hPanel search.
- Hostinger outbound HTTPS is unproven because the route is absent from the deployed commit.
- Hostinger ISR/cache behavior is unproven because the route is absent from the deployed commit.
- Hostinger request/body/upload and timeout limits are unproven because the route is absent from the deployed commit.
- Hostinger environment persistence and restart/redeploy database recovery are unproven because no variables or database route are deployed.

No ADR changed. The Hostinger-first architecture remains unchanged; the corrective build selection is recorded below as a deployment compatibility measure rather than a new architecture decision.

## Hostinger Prisma/Turbopack corrective analysis

**Research and local analysis date:** 2026-09-03.

### Failure and root cause

After the Phase 2A infrastructure reached the isolated Hostinger Web App, all non-Prisma compatibility routes passed. Only `/api/internal/compatibility/database` and `/api/internal/cron-probe` failed, including requests with missing or incorrect bearer credentials. Hostinger returned empty `500` responses because the route modules failed before their handlers and authorization checks ran. Repeated runtime logs reported `Failed to load external module @prisma/client-<content-hash>/runtime/library: Error: open EEXIST` from `.next/server/chunks/[turbopack]_runtime.js`; a same-commit redeploy did not clear the failure.

The Prisma generator is the supported `prisma-client` generator with a required custom output at `src/generated/prisma`. `npm run prisma:generate` produces ordinary TypeScript modules there; it does not create symlinks or junctions. The generated client imports `@prisma/client/runtime/library`, while the route handlers import the generated client through `src/lib/server/prisma.ts`.

The default Next.js 16.3.3 Turbopack production build bundled the custom generated client but externalized its `@prisma/client/runtime/library` import. The emitted route chunk dynamically imported a content-hashed package name such as `@prisma/client-<content-hash>/runtime/library`, backed locally by a `.next/node_modules/@prisma/client-<content-hash>` filesystem link to the installed package. This is the exact external-loading path named in the Hostinger failure. The failure boundary is therefore the Hostinger runtime loading Turbopack's linked, content-hashed Prisma external, not missing Prisma generation, route authorization, the database schema or a database credential response.

### Alternatives evaluated

1. **Build-time generation:** already guaranteed by `postinstall: prisma generate`; no redundant build hook was added.
2. **`serverExternalPackages`:** rejected as ineffective. Next.js already automatically externalizes `@prisma/client` and `pg`, and the failed Turbopack artifact already proves that the Prisma runtime was externalized. Explicitly listing the same packages would preserve the linked hashed alias that fails on Hostinger. `@prisma/adapter-pg` was successfully bundled and did not need forced externalization.
3. **Generated-client relocation or generator change:** rejected because generation completed reliably, the custom output itself contained no links, and changing the supported generator/output would be a broader workaround without removing Next.js's automatic Prisma externalization behavior.
4. **Webpack production fallback:** selected. Next.js 16 supports `next build --webpack` as the production-build opt-out from the default Turbopack bundler. The Webpack artifact imports `@prisma/client/runtime/library` by its real package name, contains no `.next/node_modules` hashed Prisma alias, and preserves the existing application/runtime contract.

### Correction and implications

The repository `build` script now runs `next build --webpack`. Development remains unchanged. Prisma, `@prisma/client` and `@prisma/adapter-pg` remain pinned at `6.12.0`; `pg` remains pinned at `8.23.0`. The Prisma schema, generated-client location, adapter, migrations and route code are unchanged. No ADR update is required because this is a narrow supported bundler fallback for the approved Hostinger runtime rather than a change to the server-first architecture.

Local production verification on Node.js `22.22.0` confirmed that the Webpack build completes and emits direct `@prisma/client/runtime/library` imports with no hashed Prisma alias or linked `.next/node_modules/@prisma` directory. In `next start` mode, both protected routes loaded; missing and incorrect secrets reached their handlers and returned `401`, correct secrets executed Prisma and returned `200`, and the complete Phase 2A probe suite passed. Representative public routes returned `200`, `/dev/design-system` returned `404`, desktop Home and in-view Culture rendered their optional canvases, 390 px Home retained the static fallback, 390 px Culture required explicit opt-in before creating a canvas, and browser checks found no error overlay, console error or horizontal overflow. The approved logo SHA-256 remained `2C5D2042EF020AA7AD37FF92E6FD9C3407EF305102EE49DA3B6900FF99FFE60C`. These local results prove the corrected artifact behavior but do not prove Hostinger until the isolated Web App is rebuilt and retested from the new commit.

### Current upstream sources

- Next.js CLI, including the supported `next build --webpack` option: <https://nextjs.org/docs/app/api-reference/cli/next>
- Next.js `serverExternalPackages`, including automatic externalization of `@prisma/client` and `pg`: <https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages>
- Next.js 16.3/Turbopack upstream report documenting content-hashed packages and links under `.next/node_modules`: <https://github.com/vercel/next.js/issues/95815>
- Prisma generators reference for `prisma-client`, its required custom output and generated TypeScript files: <https://www.prisma.io/docs/orm/prisma-schema/overview/generators>
- Prisma deployment guidance for explicitly running `prisma generate` during dependency installation where cached dependencies can otherwise leave a stale client: <https://www.prisma.io/docs/orm/more/help-and-troubleshooting/vercel-caching-issue>
- Supabase changelog reviewed for current breaking changes; none changed this Prisma packaging correction: <https://supabase.com/changelog>

### Hostinger retest requirement

Redeploy the temporary Hostinger Web App from the corrected `main` commit. Confirm the deployment log reports a Webpack production build, then repeat missing, incorrect and correct-secret tests for both Prisma-dependent routes. Confirm that unauthorized requests return `401`, authorized database and cron probes return their success codes, runtime logs contain no `EEXIST` or failed external-module error, and restart plus same-commit redeploy retain the result. Do not change production DNS and do not begin Phase 2B.

## Hostinger Prisma Webpack Retest

**Date:** 2026-09-03

**Status: FAIL.** The final Phase 2A-PR retest confirmed that the isolated Hostinger Web App deployed the intended correction, but both Prisma-dependent route modules still fail before their authorization handlers execute.

Deployment and packaging evidence:

- Hostinger deployed branch `main` at commit `29a4c37dee48f4c45d4790b0f3da6822d89c2149` (`29a4c37d` in hPanel).
- The deployment used Node `22.x`, ran Prisma postinstall generation successfully with Prisma Client `6.12.0`, and ran the Next.js `16.3.3` Webpack production build through `next build --webpack`.
- The previous Turbopack-generated `@prisma/client-<content-hash>/runtime/library` alias text was absent from the current Hostinger logs. This confirms that the corrected Webpack artifact was deployed; it does not establish successful Prisma loading.

Protected-route results:

| Route | Missing secret | Incorrect secret | Correct secret, first call | Correct secret, repeated call |
| --- | --- | --- | --- | --- |
| `/api/internal/compatibility/database` | Empty `500` | Empty `500` | Empty `500` | Empty `500` |
| `/api/internal/cron-probe` | Empty `500` | Empty `500` | Empty `500` | Empty `500` |

Authorization did not execute. Hostinger runtime logs repeatedly reported `Error: open EEXIST` from Node's `node:net` socket construction while initializing `process.stdin`, followed through the built-in ESM module-loading path. The earlier hashed Prisma/Turbopack alias stack is gone, but the required `EEXIST` absence gate still fails. No credential or secret value was reproduced in this record.

Consequences of the module-load failure:

- Prisma did not reach an executable route handler on Hostinger.
- Hostinger-to-Supabase connectivity through Prisma is not proven.
- The deployed database read, fixed synthetic upsert, count and repeated-call idempotency were not exercised.
- The deployed cron write and repeated-call idempotency were not exercised.
- A same-commit redeploy/restart and post-restart Prisma reconnection test were not attempted because the required successful Prisma/database verification prerequisite failed.
- Hostinger scheduler availability and actual scheduler invocation remain **DEFERRED / UNVERIFIED**. Manual endpoint testing would prove only deployed endpoint compatibility even if it passed.

Regression evidence remained healthy outside the Prisma route boundary:

- server execution returned `200 SERVER_EXECUTION_OK` under Node major 22;
- outbound HTTPS, cache stability and explicit revalidation passed;
- uploads of 1 KiB, 5 MiB and 5 MiB + 1 byte returned `200`; 6 MiB + 1 byte returned the application `413` response;
- public routes `/`, `/work`, `/culture`, `/company`, `/careers`, `/join` and `/contact` returned `200`;
- `/dev/design-system` and `/careers/unknown-synthetic-role` returned `404`;
- desktop Home rendered the 3D canvas; the 390 px Home used the static fallback with zero canvases; neither check found a console error or horizontal overflow;
- the deployed logo hash matched the approved repository logo hash;
- sampled public HTML and nine referenced scripts contained neither a PostgreSQL URL nor a configured secret value.

The direct controlled Supabase security regression query passed: RLS is enabled but not forced, zero policies exist, no `PUBLIC`, `anon` or `authenticated` grants exist, and exactly one row remains for each fixed synthetic label (`phase-2a-database-probe` and `phase-2a-cron-probe`). This operator-side evidence does not prove Hostinger-to-Supabase access.

Local verification on Node.js `22.22.0` passed `npm run probe:phase2a`, `npm run prisma:validate`, `npm run prisma:generate`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm audit --omit=dev` and `git diff --check`. The production build used Webpack, the approved logo hash was unchanged, and the local production server was stopped after verification. These local results do not override the Hostinger runtime failure.

**Final recommendation: DO NOT APPROVE PHASE 2A.** Phase 2B remains gated and has not started.

## Phase 2A-NI — Node / Database Runtime Isolation

**Date:** 2026-09-03

**Status: READY FOR HOSTINGER RETEST.** The diagnostic implementation passes locally under Node.js `22.22.0`, but no Hostinger conclusion is claimed until the isolated Web App is redeployed from the diagnostic commit and every stage is invoked independently.

### Preserved failure classification

The two observed Hostinger failures remain distinct:

1. The original Turbopack build failed while loading a linked, content-hashed `@prisma/client-<content-hash>/runtime/library` external from `.next/node_modules`.
2. Commit `29a4c37dee48f4c45d4790b0f3da6822d89c2149` removed that packaging form by using Webpack. The current failure is still `Error: open EEXIST`, but its stack now occurs while Node creates the `process.stdin` socket through `node:net` and the built-in ESM facade.

The second result does not establish bad Supabase credentials, a bad `DATABASE_URL`, failed Prisma generation, a schema error or recurrence of the original Turbopack alias problem. The first import or operation that causes Hostinger to initialize the failing stdio handle remains to be proven by the deployed isolation matrix.

### Authoritative research reviewed on 2026-09-03

- Node.js 22 process documentation: [Process standard streams](https://nodejs.org/download/release/v22.22.0/docs/api/process.html#processstdin). `process.stdin` is a `net.Socket` when file descriptor 0 refers to a pipe, a TTY stream for a terminal or a file stream otherwise. Merely accessing the property can therefore initialize a Node stream wrapper for descriptor 0.
- Node.js `v22.22.0` implementation: [`getStdin()`](https://github.com/nodejs/node/blob/v22.22.0/lib/internal/bootstrap/switches/is_main_thread.js) constructs a `net.Socket` around descriptor 0 for pipe/TCP handles. [`Socket` construction](https://github.com/nodejs/node/blob/v22.22.0/lib/net.js) opens the supplied descriptor and throws the returned libuv error if the handle cannot be opened. The Hostinger stack is consistent with this path, but the source alone does not identify which application import first accessed the property.
- Node.js built-in ESM implementation: [`BuiltinModule.getESMFacade()`](https://github.com/nodejs/node/blob/v22.22.0/lib/internal/bootstrap/realm.js) creates and synchronizes named exports for built-in modules. The observed Hostinger stack includes this function, so a built-in ESM namespace import is a relevant boundary to isolate; this is an evidence-based inference, not a confirmed Node defect.
- Prisma v6 client generation: [Generating Prisma Client](https://www.prisma.io/docs/orm/v6/prisma-client/setup-and-configuration/generating-prisma-client). Prisma v6 supports constructing the generated client without a driver adapter when using its normal library engine. Driver adapters are a separate opt-in path, documented in [Database drivers](https://www.prisma.io/docs/orm/overview/databases/database-drivers). The current generated configuration reports `engineType: "library"`, so a direct-client diagnostic is supported without changing Prisma versions.
- `node-postgres` pooling: [Pool API](https://node-postgres.com/apis/pool) and [Pooling](https://node-postgres.com/features/pooling). A `Pool` creates clients lazily; construction can therefore be tested separately from a fixed `SELECT 1` query, and `pool.end()` provides explicit resource closure.
- Next.js server externalization: [`serverExternalPackages`](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages), last updated 2025-12-05. Next.js automatically externalizes packages including `@prisma/client` and `pg` for Node.js server execution. The Phase 2A-NI routes retain the default configuration rather than adding another speculative bundling override.
- Hostinger managed Node deployment: [Deploying a Node.js Web App](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/) and [Node.js Web App troubleshooting](https://www.hostinger.com/support/how-to-fix-common-nodejs-errors-at-hostinger/). The reviewed Hostinger material documents supported Node versions, build/start configuration, environment variables and logs, but no supported workaround or stated limitation for `process.stdin` descriptor reuse was found.
- Supabase changelog: [Supabase Changelog](https://supabase.com/changelog.md). The current changelog was checked before implementation; no breaking change affecting the existing fixed PostgreSQL `SELECT 1`, Session Pooler connection or `CompatibilityProbe` security controls was identified.

No authoritative Node.js, Prisma, `pg`, Next.js or Hostinger source reviewed above identifies this exact managed-runtime `open EEXIST` stack as a known Prisma 6.12 or `pg` 8.23 defect. No forum-only workaround, global stdio monkey-patch, Node-internal patch, dependency downgrade or Prisma major-version change was adopted.

### Dependency and emitted-bundle inspection

- Generator: `prisma-client`, custom output `src/generated/prisma`, Prisma `6.12.0`, generated `engineType: "library"`, with the `driverAdapters` preview feature enabled.
- Current production construction: `PrismaPg` from `@prisma/adapter-pg` receives the server-only `DATABASE_URL`; the generated `PrismaClient` receives that adapter.
- The generated `src/generated/prisma/client.ts` imports `node:process` as a namespace and uses `process.cwd()` in a bundler file annotation. This is isolated separately from importing `@prisma/client/runtime/library`.
- The Prisma `runtime/library` artifact contains stdout/stderr TTY and logging access but no literal `process.stdin`, `setRawMode` or `readline` access.
- The inspected `pg` and `@prisma/adapter-pg` runtime entry points contain no literal `process.stdin` or `setRawMode` access. `pgpass` defaults a warning stream to `process.stderr`.
- The Webpack diagnostic artifacts keep `pg` and `@prisma/client/runtime/library` as Node server externals. `@prisma/adapter-pg` is bundled and reaches `pg` through the external import. No `serverExternalPackages` change was required.

These source findings narrow the test design but do not prove the Hostinger cause. In particular, the generated client's `node:process` namespace import is a candidate boundary because of the observed ESM-facade stack, not a proven defect.

### Isolation matrix

Every diagnostic route uses the existing `COMPATIBILITY_PROBE_SECRET`, runs in the Node.js runtime, disables caching, returns only fixed markers, logs only a fixed failure label and catches errors without returning messages or stacks.

| Stage | Independent operation | Local Node `22.22.0` | Hostinger |
| --- | --- | --- | --- |
| A | Node/Next Route Handler baseline; no database import | `200 NODE_BASELINE_OK` | Pending deployment |
| B | Dynamic `pg` import only | `200 PG_IMPORT_OK` | Pending deployment |
| C | Construct and close a `pg.Pool`; no query | `200 PG_POOL_OK` | Pending deployment |
| D | Raw `pg` fixed `SELECT 1` | `200 PG_QUERY_OK` | Pending deployment |
| E1 | Dynamic `@prisma/client/runtime/library` import only | `200 PRISMA_RUNTIME_IMPORT_OK` | Pending deployment |
| E2 | Dynamic generated Prisma client import only | `200 PRISMA_CLIENT_IMPORT_OK` | Pending deployment |
| F | Construct and disconnect generated Prisma client without adapter; no query | `200 PRISMA_DIRECT_CONSTRUCT_OK` | Pending deployment |
| G | Generated Prisma client without adapter; fixed `SELECT 1` | `200 PRISMA_DIRECT_QUERY_OK` | Pending deployment |
| H1 | Dynamic `@prisma/adapter-pg` import only | `200 PRISMA_ADAPTER_IMPORT_OK` | Pending deployment |
| H2 | Construct `PrismaPg`; no Prisma client and no query | `200 PRISMA_ADAPTER_CONSTRUCT_OK` | Pending deployment |
| H3 | Construct `PrismaPg` and `PrismaClient`; no query | `200 PRISMA_ADAPTER_PRISMA_CONSTRUCT_OK` | Pending deployment |
| H4 | Adapter-backed Prisma client; fixed `SELECT 1` | `200 PRISMA_ADAPTER_QUERY_OK` | Pending deployment |

For every local route, missing and incorrect bearer credentials returned `401 UNAUTHORIZED` before the diagnostic import or operation. The raw `pg` and both Prisma query paths used only the fixed statement `SELECT 1 AS value`; they did not accept SQL or identifiers from the request.

### Local interpretation and deployment gate

Local results establish only that Node `22.22.0`, raw `pg`, direct Prisma and adapter-backed Prisma all work against the existing controlled Supabase database from the local production server. No Outcome A/B/C/D is selected because those outcomes depend on Hostinger results.

After the diagnostic commit is deployed, run `npm run probe:phase2a:node-isolation` against the isolated Hostinger Web App. Preserve each HTTP status and fixed response code, review logs for `EEXIST`, and identify the earliest failing independent stage. Safe later stages should still be invoked when they distinguish raw `pg`, direct Prisma and adapter-backed Prisma paths. Do not change production DNS and do not begin Phase 2B.

**Phase 2A-NI recommendation: REQUIRES HOSTINGER DIAGNOSTIC DEPLOYMENT.**

## Hostinger Node Isolation Runtime Matrix

**Date:** 2026-09-03

**Phase 2A-NIR status: PASS WITH ISSUES.** Hostinger ran commit `a27ad5011579afa62d076b831351220e740314a3` on Node.js `22.x`. The completed deployment log recorded Next.js `16.3.3`, `next build --webpack`, a successful optimized production build and every Phase 2A node-isolation route in the emitted route manifest.

Every route returned `401 UNAUTHORIZED` for both missing and incorrect compatibility secrets before its diagnostic operation. Authorized results were:

| Stage | Result | EEXIST | Conclusion |
| --- | --- | --- | --- |
| A | `200 NODE_BASELINE_OK` | No | Ordinary Next.js Route Handler execution works. |
| B | `200 PG_IMPORT_OK` | No | Importing `pg` does not trigger the Hostinger failure. |
| C | `200 PG_POOL_OK` | No | Constructing and closing `pg.Pool` works without a query. |
| D | `200 PG_QUERY_OK` | No | Hostinger-to-Supabase network, TLS and raw PostgreSQL access pass with the fixed `SELECT 1`. |
| E1 | `503 PRISMA_RUNTIME_IMPORT_FAILED` | No | First failing boundary: importing `@prisma/client/runtime/library`. |
| E2 | `503 PRISMA_CLIENT_IMPORT_FAILED` | No | Generated-client import fails after the shared Prisma runtime boundary. |
| F | `503 PRISMA_DIRECT_CONSTRUCT_FAILED` | No | Direct Prisma construction cannot pass the earlier runtime-import boundary. |
| G | `503 PRISMA_DIRECT_QUERY_FAILED` | No | Direct Prisma query path cannot pass the earlier runtime-import boundary; this is not a Hostinger-to-Supabase network failure. |
| H1 | `200 PRISMA_ADAPTER_IMPORT_OK` | No | Importing `@prisma/adapter-pg` works independently. |
| H2 | `200 PRISMA_ADAPTER_CONSTRUCT_OK` | No | Constructing the adapter works independently. |
| H3 | `503 PRISMA_ADAPTER_PRISMA_CONSTRUCT_FAILED` | No | The adapter path fails only when the Prisma client is added. |
| H4 | `503 PRISMA_ADAPTER_QUERY_FAILED` | No | Adapter-backed Prisma query cannot pass the shared Prisma client/runtime boundary. |

`EEXIST: No` means the current safe Hostinger runtime log did not contain `EEXIST`; it does not assert that the caught internal exception had a different operating-system code. The log exposed only the fixed failure markers for E1, E2, F, G, H3 and H4. It did not expose a database URL, secret, environment value, SQL statement or sensitive stack context.

### First failing boundary

Stage E1 is the first failed expected marker. Node/Next, `pg` import, `pg.Pool` construction and raw `pg` database access all pass before the independent Prisma runtime import returns the fixed failure response.

### Raw pg result

**HOSTINGER -> SUPABASE: PROVEN VIA RAW PG.**

**HOSTINGER -> SUPABASE NETWORK/TLS: PASS.**

**RAW PG DATABASE ACCESS: PASS.**

Stage D returned `200 PG_QUERY_OK` for the fixed `SELECT 1`. Hostinger-to-Supabase compatibility must no longer be described as unproven for the raw `pg` path.

### Prisma direct and adapter result

Direct Prisma construction and query both fail after the shared E1 Prisma runtime-import boundary. The adapter package itself imports and constructs successfully, but adding the Prisma client fails. The evidence therefore does not support an adapter-specific classification or removing only `@prisma/adapter-pg`.

### Architecture outcome

**OUTCOME B — raw `pg` works; Prisma fails.** Hostinger networking, TLS, Supabase Session Pooler access and raw PostgreSQL queries are compatible. The remaining incompatibility is within the Prisma client/runtime path on this Hostinger managed Node.js runtime.

The recommended next step is a separate architecture decision evaluating direct `pg` for the Hostinger runtime while retaining Prisma for schema and migrations, with another thin typed database layer considered only if it proves necessary. Do not begin that architecture change automatically.

**Phase 2A-NIR recommendation: REQUIRES PRISMA RUNTIME ARCHITECTURE CHANGE.**

**PHASE 2B HAS NOT STARTED.**

## Phase 2A-RA Runtime Database Architecture Correction

**Date:** 2026-09-03

### Supportability research

Official Prisma, node-postgres, Next.js and Supabase guidance was reviewed before implementation. Prisma's production migration workflow applies committed migration history with `prisma migrate deploy`; that command does not generate Prisma Client artifacts. node-postgres provides the required pool, parameterized-query and same-client transaction primitives directly. Next.js Route Handlers run on the server and the database routes explicitly remain on the Node.js runtime. Supabase Session Pooler remains the approved `DATABASE_URL` path for this persistent IPv4 Hostinger process. The current Supabase changelog contained no breaking change affecting this fixed PostgreSQL runtime path.

Sources:

- Prisma production migration deployment: <https://www.prisma.io/docs/orm/prisma-client/deployment/deploy-database-changes-with-prisma-migrate>
- Prisma CLI `migrate deploy`: <https://www.prisma.io/docs/orm/reference/prisma-cli-reference#migrate-deploy>
- node-postgres queries, pooling and transactions: <https://node-postgres.com/features/queries>, <https://node-postgres.com/features/pooling>, <https://node-postgres.com/features/transactions>
- Next.js Route Handlers and server-only boundaries: <https://nextjs.org/docs/app/api-reference/file-conventions/route>, <https://nextjs.org/docs/app/getting-started/server-and-client-components#preventing-environment-poisoning>
- Supabase database connections and changelog: <https://supabase.com/docs/guides/database/connecting-to-postgres>, <https://supabase.com/changelog.md>

### Architecture decision and runtime layer

ADR 0014, `docs/architecture/decisions/0014-runtime-postgresql-with-pg.md`, is accepted. The Hostinger application runtime now uses `pg`; Prisma is retained only for schema definition and migration tooling.

`src/lib/server/database.ts` is server-only and owns one lazily created `pg.Pool` per process/global module lifetime. It exposes only an explicit parameterized query helper, a same-client transaction helper and an explicit pool-close helper for controlled tests or shutdown. Idle-client and rollback failures emit fixed safe markers without database details.

Pool settings are fixed at maximum `3` connections, `10,000 ms` idle timeout, `10,000 ms` connection timeout and application name `pyramid-designs`. This is deliberately small for initial traffic and the Supabase Session Pooler. No environment tuning knobs were added without measured need.

`src/lib/server/compatibility-probe.ts` is the temporary repository boundary. It contains the only current application SQL, uses placeholders for every value, supplies UUIDs from Node, maps timestamps/counts to plain application values and does not expose `pg` results to route responses.

The transaction helper uses `BEGIN`, invokes the callback with one checked-out client, then `COMMIT`. Failure attempts `ROLLBACK`, throws a fixed `DatabaseTransactionError` and always releases the client.

### Migration and dependency architecture

`prisma/schema.prisma`, both Phase 2A migrations and the migration ledger convention remain unchanged. The Prisma client generator was removed because neither the application runtime nor `prisma migrate deploy` needs generated client output.

The controlled migration flow is: edit the Prisma schema; generate a development migration with `prisma migrate dev --create-only`; inspect its SQL/security effects; apply and verify it in development; commit schema and migrations together; then run `prisma migrate deploy` through a controlled CI/administrator path. Production `db push` is prohibited.

Runtime dependency: `pg`. Development/tooling dependency: `prisma`. Removed runtime dependencies: `@prisma/client` and `@prisma/adapter-pg`. The postinstall generation hook, generated Prisma Client output and `prisma:generate` script were removed. `prisma:migrate:deploy` was added.

### Route conversion and diagnostic cleanup

The protected database and cron probes now use the shared `pg` repository. Bearer authorization, fixed synthetic labels, safe response codes, idempotency and the absence of request-controlled SQL are preserved. The database route commits the upsert and count through the transaction helper; the cron route performs the same fixed idempotent upsert through the pooled query helper.

All twelve node-isolation routes, their shared helper and the isolation runner were removed after their Hostinger evidence was preserved in the Phase 2A-NIR matrix above. The general server, outbound, revalidation and bounded upload compatibility probes remain because final Hostinger platform closure is still pending.

`CompatibilityProbe` and its forward security migration remain temporary. RLS stays enabled with zero policies and no `PUBLIC`, `anon` or `authenticated` grants. The table is not dropped in this architecture-correction commit.

### Verification and Hostinger gate

Local verification on Node.js `22.22.0` passed raw `SELECT 1`, a parameterized integer query, transaction commit, transaction rollback with the fixed safe error, compatibility upsert/count and repeated database/cron idempotency. Cleanup left exactly one row for each approved fixed probe label and no transaction-test rows.

The Node.js `22.22.0` production server passed the complete compatibility runner. Missing and incorrect bearer credentials returned `401 UNAUTHORIZED`; correct credentials returned `200 DATABASE_PROBE_OK` with one matching row and `200 CRON_PROBE_OK`; repeated calls retained their original timestamps. The server, outbound HTTPS, cache revalidation and bounded upload probes also passed.

Live security regression confirmed RLS enabled and not forced, zero policies, zero `PUBLIC`/`anon`/`authenticated` table grants and only the two fixed synthetic rows. The browser static bundle contained no database URL, secret variable name or PostgreSQL URL. The production server artifact contained no Prisma Client, generated-client or adapter runtime reference.

`prisma validate` passed and `prisma migrate deploy` found both committed migrations with no pending migration. Lint, typecheck, the Next.js `16.3.3` Webpack production build, `npm audit --omit=dev` and `git diff --check` passed. The build emitted the database and cron routes but none of the removed isolation routes.

Representative frozen public routes returned `200`; `/dev/design-system` and the removed isolation URL returned `404`. No Phase 1 frontend component, style, content asset or approved brand source changed. The approved logo SHA-256 remained `2C5D2042EF020AA7AD37FF92E6FD9C3407EF305102EE49DA3B6900FF99FFE60C`.

Hostinger has not yet deployed this architecture-correction commit. After owner redeployment, the required final proof is missing/wrong bearer `401` and correct bearer `200 DATABASE_PROBE_OK` / `200 CRON_PROBE_OK`, repeated idempotency, then same-commit redeploy/restart and successful pool reconnection. No Hostinger scheduler assumption is made.

**Phase 2A-RA recommendation: READY FOR FINAL HOSTINGER PG RETEST.**

**PHASE 2B HAS NOT STARTED.**

## 20. Phase 2B recommendation

**Do not begin Phase 2B.**

The Supabase portion remains approved after the Phase 2A-SC correction. Outcome B proves Hostinger-to-Supabase raw PostgreSQL access, and Phase 2A-RA replaces the incompatible Prisma Client runtime path with `pg`. Overall Phase 2A remains **PASS WITH ISSUES** until the architecture-correction commit is deployed and the protected database/cron routes plus same-commit reconnection pass on Hostinger. Do not begin Phase 2B without that proof and a separate owner/reviewer gate.

## Verification record

Local verification on 2026-09-02:

- `npm run prisma:validate` — PASS;
- `npm run prisma:generate` — PASS;
- `npm run lint` — PASS;
- `npm run typecheck` — PASS;
- `npm run build` — PASS;
- `npm audit --omit=dev` — PASS; zero vulnerabilities;
- `git diff --check` — PASS; line-ending notices only;
- protected server execution — PASS;
- unauthorized server probe — PASS (`401`);
- outbound HTTPS probe — PASS;
- cache stability and explicit revalidation — PASS;
- 1 KiB, 5 MiB and 5 MiB + 1 byte request transport — PASS;
- 6 MiB + 1 byte diagnostic cap — PASS (`413`);
- database probe without invented credentials — expected safe `503`;
- Home production route — PASS (`200`);
- `/dev/design-system` production route — PASS (`404`).
- approved logo SHA-256 remained `2C5D2042EF020AA7AD37FF92E6FD9C3407EF305102EE49DA3B6900FF99FFE60C`.

Local clean-install caveat: an additional `npm ci` attempt could not remove the existing Lightning CSS native binary because a pre-existing repository `next dev` process held the Windows file lock (`EPERM`). The process was not stopped because it was outside this execution's ownership. `npm install` restored the declared tree, `prisma generate` passed, and all requested quality gates above passed. This is not Hostinger runtime evidence.

Final quality, audit, logo hash and repository-scope checks are recorded in the Phase 2A handoff response after the complete diff is reviewed.

### Live closure attempt on 2026-09-03

- required variable presence — PASS; values were not displayed;
- `.env.local` ignored/untracked and no secret-bearing file staged or tracked — PASS;
- initial `npm run prisma:validate` — FAIL because Prisma did not load `.env.local`;
- `prisma.config.ts` corrected to load the ignored local environment and retain the schema-only fallback;
- `npm run prisma:validate` — PASS after correction;
- `npm run prisma:generate` — PASS;
- `DATABASE_URL` connection — FAIL, PostgreSQL authentication rejected;
- `DIRECT_URL` connection — FAIL, PostgreSQL authentication rejected;
- migration safety review — PASS; the SQL only creates `CompatibilityProbe` and its unique index, with no reset, deletion, candidate schema or data statement;
- migration deployment — NOT RUN because the control connection did not authenticate;
- live schema inspection and synthetic upsert/count/idempotency — NOT PROVEN;
- protected database endpoint: missing/incorrect secret — PASS (`401`); correct secret — safe `503 DATABASE_UNAVAILABLE`;
- protected cron endpoint: missing/incorrect secret — PASS (`401`); correct secret — safe `503 CRON_PROBE_FAILED`;
- protected server execution with correct secret — PASS (`200 SERVER_EXECUTION_OK`);
- `npm run probe:phase2a` against the local production server — FAIL at the live database step (`503 DATABASE_UNAVAILABLE`), as expected from the rejected credential;
- error responses and production-server logs — PASS; fixed safe codes only, with no credential or connection detail;
- `npm run lint` — PASS;
- `npm run typecheck` — PASS;
- `npm run build` — PASS; 17 static pages generated and Phase 2A routes compiled dynamically;
- `npm audit --omit=dev` — PASS; zero vulnerabilities;
- representative production routes `/`, `/work`, `/culture`, `/company`, `/careers`, `/join`, `/contact` — PASS (`200`);
- `/dev/design-system` — PASS (`404` in production);
- approved logo SHA-256 remained `2C5D2042EF020AA7AD37FF92E6FD9C3407EF305102EE49DA3B6900FF99FFE60C`;
- frozen frontend source diff — NONE;
- probe retention — REQUIRED for the Supabase retry and deferred Hostinger verification;
- commit/push — NOT PERFORMED because the live Supabase gate failed.

**PHASE 2B HAS NOT STARTED.**

### Phase 2A-SC compatibility table security correction on 2026-09-03

Root cause: the original table migration created `CompatibilityProbe` in Supabase's exposed `public` schema without explicit privilege revocation or RLS enablement. Supabase's database defaults therefore left direct table privileges for `anon` and `authenticated` while RLS was disabled.

- forward migration `20260903000000_phase_2a_compatibility_probe_security` — PASS;
- migration scope — only `CompatibilityProbe`; no reset, drop, data deletion, Auth, Storage, candidate/business table or unrelated-schema operation;
- `PUBLIC`, `anon` and `authenticated` privileges — revoked;
- RLS — enabled, not forced;
- RLS policies — zero; no permissive public policy exists;
- metadata privilege checks for `anon` — SELECT/INSERT/UPDATE/DELETE denied;
- metadata privilege checks for `authenticated` — SELECT/INSERT/UPDATE/DELETE denied;
- current server path — server-only Session Pooler database role; table owner with database-level RLS bypass;
- Prisma/server read/write — PASS after hardening;
- protected database probe — PASS (`200 DATABASE_PROBE_OK`), one matching row, repeated-call idempotency PASS;
- protected cron probe — PASS (`200 CRON_PROBE_OK`), repeated-call idempotency PASS;
- complete `npm run probe:phase2a` — PASS;
- responses and production-server logs — no credential or provider detail;
- Supabase Auth, Storage, API configuration and unrelated schemas — unchanged;
- `.env.local` — ignored, untracked and unchanged;
- representative public routes — PASS; `/dev/design-system` remained `404` in production;
- approved logo SHA-256 — unchanged;
- frontend redesign/source change — none;
- commit/push — not performed; all Phase 2A work remains uncommitted.

**PHASE 2A-SC: PASS.**

**SUPABASE PORTION: APPROVED.**

**HOSTINGER RUNTIME STILL DEFERRED.**

**PHASE 2B HAS NOT STARTED.**

### Phase 2A-H Hostinger runtime verification on 2026-09-03

| Test | Result | Evidence |
| --- | --- | --- |
| Isolated deployment and production-DNS boundary | PASS | Temporary Hostinger domain is running; no production DNS change was made. |
| Deployment source | FAIL | hPanel shows branch `main`, commit `cf2dd2a7`; `origin/main` matches. The Phase 2A compatibility infrastructure is only in the uncommitted working tree. |
| Hostinger Node configuration | PASS | hPanel shows Node `22.x`; the completed build and runtime logs show Next.js 16.3.3 starting successfully. Exact Node minor/patch remains unreported because the protected server route is absent. |
| Public routes | PASS | `/`, `/work`, `/culture`, `/company`, `/careers`, `/join`, `/contact`, `/privacy`, `/candidate-privacy`, `/terms` and `/accessibility` returned `200`; `/dev/design-system` returned `404`. |
| Static assets and logo | PASS | Referenced JS/CSS assets loaded; all seven Culture WebP source assets returned `200`; the live derived SVG hash matches the repository. The canonical approved SVG SHA-256 remains `2C5D2042EF020AA7AD37FF92E6FD9C3407EF305102EE49DA3B6900FF99FFE60C`. |
| Public secret scan | PASS | Sampled public HTML and referenced JS/CSS contained no PostgreSQL URL or Phase 2A secret-variable names. hPanel has no configured variables to expose. |
| Hostinger environment variables | FAIL | hPanel reports zero variables. Required runtime names are `DATABASE_URL`, `COMPATIBILITY_PROBE_SECRET` and `CRON_SECRET`. `DIRECT_URL` remains operator-only. |
| Protected route authentication | DEFERRED | All compatibility and cron paths return `404`, not the required `401`, because the deployed commit predates the routes. |
| Hostinger to Supabase through Prisma | DEFERRED | Cannot be tested without the deployed route and `DATABASE_URL`. |
| Repeated database idempotency | DEFERRED | Cannot be tested on Hostinger. Local operator production-server proof remains PASS with one fixed row. |
| Outbound HTTPS | DEFERRED | Compatibility route absent from the deployed commit. |
| Upload/request limits | DEFERRED | Compatibility route absent, so Hostinger/proxy, Next.js/runtime and application `413` boundaries cannot be distinguished. |
| Hostinger cron execution | DEFERRED | Cron route and `CRON_SECRET` are absent. No website cron control appeared in the inspected Web App navigation or hPanel search; local cron proof is not Hostinger cron proof. |
| Environment persistence | DEFERRED | No variables are configured; restart and same-commit redeploy persistence cannot be measured. |
| Restart/redeploy database recovery | DEFERRED | Restart/redeploy controls were not exercised against the wrong commit. hPanel exposes redeploy, environment management and runtime logs. |
| Cache/revalidation | DEFERRED | Compatibility route absent. |
| Logs and operational controls | PASS | Deployment logs, runtime logs, environment management, resource inspection and redeploy are available. Runtime logs showed the application ready with zero logged issues/errors and no secret-bearing content. |
| Performance sanity | PASS | Desktop rendered the optional WebGL canvas; the 390 px mobile rendering used the static fallback with zero canvases. Both had equal client and scroll widths, no obvious crash or asset failure. Existing Three.js `Clock` deprecation warnings remain non-blocking. |
| Supabase security regression | PASS | Live operator query reconfirmed RLS enabled, zero policies, no `PUBLIC`/`anon`/`authenticated` grants and one row for each fixed synthetic label. Local production Prisma route returned `200 DATABASE_PROBE_OK` and retained idempotency. This is not Hostinger connectivity proof. |
| Repository gates | PASS | `prisma:validate`, `prisma:generate`, lint, typecheck, build, production audit and `git diff --check` passed; audit found zero vulnerabilities. |
| Frozen frontend source | PASS | No frozen Phase 1 frontend source changed during Phase 2A-H verification. |

Owner actions required before the Phase 2A-H retry:

1. Review and explicitly authorise a Phase 2A closure commit; this verification did not commit or push.
2. Commit and push only the reviewed Phase 2A compatibility and security-correction changes, then confirm `origin/main` contains the compatibility routes and migrations.
3. In Hostinger hPanel, add `DATABASE_URL`, `COMPATIBILITY_PROBE_SECRET` and `CRON_SECRET` using the already controlled values. Do not place `DIRECT_URL` in the web runtime unless a separate migration-execution decision requires it.
4. Redeploy `main` and confirm hPanel shows the new Phase 2A commit.
5. Rerun protected authentication, Hostinger-to-Supabase, outbound HTTPS, upload limits, cache/revalidation, cron, restart, environment-persistence and same-commit redeploy tests.

**PHASE 2A-H: FAIL.**

**PHASE 2A-H RETRY REQUIRED AFTER THE APPROVED COMMIT AND OWNER-OPERATED REDEPLOY.**

**OVERALL PHASE 2A: PASS WITH ISSUES.**

**PHASE 2B HAS NOT STARTED.**

### Phase 2A-SR first authentication retry on 2026-09-03

- `.env.local` remained ignored, untracked and unchanged by the verification;
- `DATABASE_URL`, `DIRECT_URL`, `COMPATIBILITY_PROBE_SECRET` and `CRON_SECRET` — PRESENT; values were not displayed;
- `DATABASE_URL` Session Pooler connection — FAIL, PostgreSQL authentication rejected;
- `DIRECT_URL` Session Pooler connection — FAIL, PostgreSQL authentication rejected;
- migration inspection/deployment — NOT RUN because authentication did not succeed;
- live schema inspection — NOT RUN;
- protected database endpoint: missing/incorrect secret — PASS (`401`); correct secret — safe `503 DATABASE_UNAVAILABLE`;
- protected cron endpoint: missing/incorrect secret — PASS (`401`); correct secret — safe `503 CRON_PROBE_FAILED`;
- database upsert, count/read and idempotency — NOT PROVEN;
- cron database write and idempotency — NOT PROVEN;
- responses and logs — PASS; fixed safe codes only, with no credential or detailed provider error;
- `npm run prisma:validate` — PASS;
- `npm run prisma:generate` — PASS;
- `npm run lint` — PASS;
- `npm run typecheck` — PASS;
- `npm run build` — PASS; 17 static pages generated;
- `npm audit --omit=dev` — PASS; zero vulnerabilities;
- migration, Supabase Auth, Storage, RLS, API configuration and unrelated schemas — UNCHANGED;
- commit/push — NOT PERFORMED.

**FIRST RETRY LIVE SUPABASE VERIFIED: NO — AUTHENTICATION FAILED.**

**HOSTINGER RUNTIME STILL DEFERRED.**

**PHASE 2B HAS NOT STARTED.**

### Phase 2A-SR second authentication retry on 2026-09-03

- `.env.local` remained ignored, untracked and unchanged by the verification;
- `DATABASE_URL`, `DIRECT_URL`, `COMPATIBILITY_PROBE_SECRET` and `CRON_SECRET` — PRESENT; values were not displayed;
- `DATABASE_URL` Session Pooler connection — PASS;
- `DIRECT_URL` Session Pooler connection — PASS;
- pre-migration `public` schema — empty;
- migration safety review — PASS; only `CompatibilityProbe` and its unique label index;
- `prisma migrate deploy` — PASS; migration ledger confirmed;
- resulting schema — `CompatibilityProbe` plus Prisma's migration ledger only;
- protected database endpoint: missing/incorrect secret — PASS (`401`); correct secret — PASS (`200 DATABASE_PROBE_OK`);
- database upsert, count/read and repeated-call idempotency — PASS; one matching fixed synthetic row;
- protected cron endpoint: missing/incorrect secret — PASS (`401`); correct secret — PASS (`200 CRON_PROBE_OK`);
- cron repeated-call idempotency — PASS;
- complete `npm run probe:phase2a` runner — PASS;
- responses and logs — PASS; no credential or detailed provider error;
- schema security review — FAIL; RLS is disabled and `anon`/`authenticated` have table privileges on `CompatibilityProbe`;
- Supabase Auth, Storage, RLS, API configuration and unrelated schemas — UNCHANGED;
- `npm run prisma:validate` — PASS;
- `npm run prisma:generate` — PASS;
- `npm run lint` — PASS;
- `npm run typecheck` — PASS;
- `npm run build` — PASS; 17 static pages generated;
- `npm audit --omit=dev` — PASS; zero vulnerabilities;
- commit/push — NOT PERFORMED.

**LIVE SUPABASE VERIFIED: YES — CONNECTIVITY, MIGRATION AND PROTECTED PROBES PASS.**

**PHASE 2A SECURITY CLOSURE: OUTSTANDING — PUBLIC-ROLE TABLE ACCESS.**

**HOSTINGER RUNTIME STILL DEFERRED.**

**PHASE 2B HAS NOT STARTED.**

# Production environment contract

Phase B4B1-S1, 2026-10-01; [ADR 0019](../architecture/decisions/0019-supabase-production-database-rebaseline.md). Authoritative inventory based on current source. Historical phase examples remain historical. S1 inspected only configuration names/provider/project/mode projections; no secret values were printed or copied into evidence. [.env.example](../../.env.example) has blank placeholders, public sender identities and false gates only.

Classes: **A** public build time; **B** private runtime; **C** operator/migration only; **D** worker/scheduler only (the web handler also consumes its bearer); **E** optional development/test; **F** obsolete/remove.

## Application variables

| Variable | Class / sensitivity | Consumer / purpose | Environment / requirement | Rotation or change | Production source |
| --- | --- | --- | --- | --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | A; public | env/public + Supabase server/browser Auth URL | Build/runtime; required before staff | Rebuild; reverify issuer/sessions | Supabase production Auth project |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | A; public | env/public + Supabase publishable Auth key | Build/runtime; required before staff | Rebuild and verify browser/server together | Same Supabase project |
| DATABASE_URL | B; secret | database pool, public content/staff/worker/readiness | Runtime; required for DB-backed rehearsal; Supabase restricted login, session 5432 or verified direct | Verify new login, restart pools, drain/revoke old | Existing Supabase project + secret manager |
| DIRECT_URL | C; secret | Prisma directUrl, operator readiness | Operator only; direct or session 5432; absent from web/build/scheduler | Verify new operator/target separately | Supabase operator + secret manager |
| CRON_SECRET | D; secret | worker bearer and authenticated readiness | Runtime + protected scheduler header; >=32 random chars; required for worker/ready | Coordinate web, monitor and scheduler; reject old bearer | Company secret manager |
| PRODUCTION_STAFF_ENABLED | B; internal gate | proxy + server Auth config | Runtime; closed by default; only exact true after acceptance | Owner activation/closure, restart, route/action smoke | Approved release manifest; false in B4 |
| PRODUCTION_WORKER_ENABLED | D; internal gate | worker trigger + direct worker entry | Runtime; closed by default; exact true only after operational acceptance | Quiesce, drain bounded invocation/lease, inspect backlog | Approved release manifest; false in B4 |
| PRODUCTION_EMAIL_ENABLED | B; internal gate | Resend configuration/fingerprint/send | Runtime; closed by default; exact true + fixed identity | Pause worker; reconcile old send intents before changing key | Approved release manifest; false in B4 |
| PRODUCTION_DRIVE_ENABLED | B; internal gate | Drive construction + every transport | Runtime; OAuth/read/write closed by default; exact true | Pause uploads/worker; validate scope/root; reconcile reservations | Approved release manifest; false in B4 |
| GOOGLE_CLIENT_ID | B; internal identifier | Drive OAuth refresh client | Runtime; required only after Drive activation | Coordinate OAuth client/token/root access | Company Google web OAuth client |
| GOOGLE_CLIENT_SECRET | B; secret | Drive OAuth refresh | Runtime; required after Drive activation | Rotate/restart, validate exact scope before revocation | Google OAuth + secret manager |
| GOOGLE_REFRESH_TOKEN | B; secret | Drive OAuth refresh | Runtime; required after Drive activation | Reauthorize exact drive.file; verify root, restart | Company Google account + secret manager |
| GOOGLE_DRIVE_ROOT_ID | B; private identifier | Drive ownership/root checks | Runtime; required after Drive activation | Do not repoint existing metadata; reconcile old root | Private app-created Drive root |
| EMAIL_PROVIDER | B; internal config | Resend explicit selection | Runtime; resend only when activated; blank in rehearsal | Pause worker; inspect provider/send-intent identities | Approved release manifest |
| RESEND_API_KEY | B; secret | Resend transport + HMAC request commitment | Runtime; sending-only domain-restricted key before email | Key rotation changes fingerprint; old intents require manual review | Resend + secret manager |
| EMAIL_FROM_ADDRESS | B; public identity | fixed sender validation | Runtime; applications@mail.pyramiddesigns.co for email | Reviewed identity/code change + deliverability acceptance | Owner-approved mail.pyramiddesigns.co |
| EMAIL_FROM_NAME | B; public identity | fixed display name | Runtime; Pyramid Designs for email | Reviewed identity/code change | Owner decision |
| EMAIL_REPLY_TO_MODE | B; internal config | fixed Reply-To selection | Runtime; fixed for email | Reviewed mode/code change | Owner decision |
| EMAIL_REPLY_TO_ADDRESS | B; public identity | fixed Reply-To validation | Runtime; contact@pyramiddesigns.co for email | Reviewed mailbox/code change + mailbox acceptance | Owner decision |
| PUBLIC_INTAKE_ORIGIN | B; public config | challenge canonical hostname | Runtime; https://pyramiddesigns.co for later challenge acceptance; blank rehearsal | Domain changes require code/provider review | Approved production domain |
| PUBLIC_INTAKE_CHALLENGE_PROVIDER | B; internal config | challenge selector | Runtime; turnstile before later acceptance | Verify fail-closed behavior; cannot open intake | Approved release manifest |
| TURNSTILE_SECRET_KEY | B; secret | server Siteverify | Runtime; later challenge acceptance only; absent in rehearsal | Coordinate widget/secret; fresh failure/replay/hostname checks | Cloudflare widget + secret manager |
| TURNSTILE_SITE_KEY | B; public identifier, server-selected | challenge to approved widget client | Runtime; later challenge acceptance only; no NEXT_PUBLIC alias | Coordinate widget/secret/CSP | Same Cloudflare widget |
| PUBLIC_INTAKE_MODE | E; test config | synthetic intake/publication predicates | Optional synthetic, loopback development/test; omit production | No production activation semantics | Disposable harness |
| COMPATIBILITY_PROBE_SECRET | E; test secret | temporary compatibility endpoints | Optional development; remove from production | Production returns 404 even with a value | Local synthetic environment |
| NODE_EXTRA_CA_CERTS | B/C; CA file path, not a credential | Node TLS trust for provider-authenticated Supabase CA | Set before Node starts when platform trust needs it; available after redeploy; never disable verification | Verify certificate source/fingerprint/expiry; restart | Supabase dashboard certificate and controlled host file |
| NODE_ENV | B; platform config | Next, adapters, gates, retention | Must be production on managed start; tests use test/development | Never override mode to enable synthetic intake | Hostinger/Next process environment |
| PORT | B; platform config | installed Next start CLI | Platform-supplied listener; not a custom application secret | Verify private listener/proxy mapping | Hostinger managed Web App |

There is no additional SITE_URL or NEXT_PUBLIC_SITE_URL consumer. Canonical metadata/mutation origin already use https://pyramiddesigns.co. Supabase Site URL and redirect URLs are provider settings. No variable activates real intake, production retention, content scheduling or malware scanning.

## Optional tooling and obsolete configuration

All following E values belong only to explicitly selected local/operator tooling, never Hostinger runtime. Local fixture credentials are discarded with their disposable identity; tool paths/selection need no credential rotation. Source is the operator's local harness configuration. They are optional for application operation; B4 harness paths/admin are required only for that harness.

| Variable | Class / sensitivity | Consumer / purpose |
| --- | --- | --- |
| B1_DISPOSABLE_ADMIN_URL | E; local secret | B1 disposable admin harness; loopback only |
| B1_EVIDENCE_DIRECTORY | E; local path | B1 external evidence |
| B1_TEST_OWNER_URL | E; rehearsal secret | restricted B1/B2 setup/fault injection on synthetic local fixtures; no production use |
| B1_TEST_PUBLIC_ROLE | E; local role name | browser-role negative checks |
| B2_DISPOSABLE_ADMIN_URL | E; local secret | B2 harness; loopback PostgreSQL 17:55442 |
| B2_EVIDENCE_DIRECTORY | E; local path | B2/browser external evidence |
| B2_PLAYWRIGHT_MODULE | E; local path | B2 browser installed tool |
| B4_DISPOSABLE_ADMIN_URL | E; local secret | B4 dump/restore harness; loopback PostgreSQL 17:55442 |
| B4_EVIDENCE_DIRECTORY | E; local path | B4 local rehearsal/build evidence |
| PHASE2IB_TEST_DATABASE_URL | E; local secret | historical integration/replay fixtures |
| PHASE2IE_BROWSER_FILES | E; test config | challenge browser multipart selection |
| PHASE2IE_BROWSER_ORIGIN | E; local origin | challenge browser endpoint |
| PHASE2IE_PLAYWRIGHT_MODULE | E; local path | historical browser installed tool |
| PHASE2IC2B_LIVE_RECIPIENT | E; private contact if real | isolated live CLI only; forbidden in B4, not a production override |
| COMPATIBILITY_BASE_URL | E; test origin | historical probe CLI target; never invoked in B4 |
| P3_PROJECT_ID | F; retired historical tooling only | No production, deployment, readiness or recovery requirement; see historical B4B1 record |
| P3_BRANCH_ID | F; retired historical tooling only | No production, deployment, readiness or recovery requirement; see historical B4B1 record |
| P3_RUN_ID | F; retired historical tooling only | No production, deployment, readiness or recovery requirement; see historical B4B1 record |
| P3_REHEARSAL_AUTHORIZATION | F; retired historical tooling only | No production, deployment, readiness or recovery requirement; see historical B4B1 record |
| P3_NEON_API_KEY | F; retired historical tooling only | No production, deployment, readiness or recovery requirement; see historical B4B1 record |
| P3_LEDGER_PATH | F; retired historical tooling only | No production, deployment, readiness or recovery requirement; see historical B4B1 record |
| P3_EVIDENCE_DIRECTORY | F; retired historical tooling only | No production, deployment, readiness or recovery requirement; see historical B4B1 record |
| P3_B1_OPERATOR_URL | F; retired historical tooling only | No production, deployment, readiness or recovery requirement; see historical B4B1 record |
| P3_B2_OPERATOR_URL | F; retired historical tooling only | No production, deployment, readiness or recovery requirement; see historical B4B1 record |
| P3_B1_RUNTIME_URL | F; retired historical tooling only | No production, deployment, readiness or recovery requirement; see historical B4B1 record |
| P3_B2_RUNTIME_URL | F; retired historical tooling only | No production, deployment, readiness or recovery requirement; see historical B4B1 record |
| P3_B1_PUBLIC_ROLE | F; retired historical tooling only | No production, deployment, readiness or recovery requirement; see historical B4B1 record |
| P3_B2_PUBLIC_ROLE | F; retired historical tooling only | No production, deployment, readiness or recovery requirement; see historical B4B1 record |
| P3_LOCAL_ADMIN_URL | F; retired historical tooling only | No production, deployment, readiness or recovery requirement; see historical B4B1 record |
| NODE_TLS_REJECT_UNAUTHORIZED | F; unsafe platform override | Never disable certificate verification; Supabase readiness rejects value 0 |
| SUPABASE_SERVICE_ROLE_KEY | F; secret | No current app consumer; remove/do not provision; owner revokes if historically exposed |
| SUPABASE_SECRET_KEY | F; secret | No current app consumer; remove/do not provision; same revocation treatment |

Private values enter protected provider environment storage or operator secret management, never Git, shell arguments/history, browser configuration, public aliases, chat, screenshots or logs. Build runs do not load production database/provider credentials. DIRECT_URL is absent from deploy builds and runtime. Changes to A keys require rebuild; private adapters read B values at runtime.

**Neon retirement:** ABANDONED BY OWNER ARCHITECTURE DECISION — 2026-10-01. All P3 variables above are listed only so retained historical tools remain inventoried; do not provision or execute them for production. P3_NEON_API_KEY is not an application requirement. Historical provider/lifecycle instructions remain in the [B4B1 evidence record](../implementation/phase-b4b1-neon-live-acceptance.md), not this production procedure.

Supabase uses PostgreSQL roles for server access and its public URL/key for Auth. Do not copy the primary checkout's currently Neon-based DATABASE_URL/DIRECT_URL into Hostinger. Do not overwrite the existing live deployment or private environment files in S1. The rollback configuration is identification evidence, not an accepted least-privilege runtime credential. Retain the current Auth project; no service-role credential is required. The existing Prisma configuration requires DIRECT_URL for migrate commands, even when the operator uses session mode.

CRON_SECRET requires a protected scheduler Authorization header mechanism with output redaction. If the platform exposes it in commands/URLs/job output, scheduling is NOT READY. Rotation affects worker and readiness monitors together. Gates select operations; they are not proof of release approval or B3 closure.

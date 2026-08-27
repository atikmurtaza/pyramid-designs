# Phase 0D1 and Phase 0D2: Production Provider Evaluation

**Status:** Phase 0D1 historical research; its paid-provider recommendation is **SUPERSEDED BY OWNER COST/HOSTING CONSTRAINT — PHASE 0D2**. The Phase 0D2 Hostinger/Supabase/Google Drive direction and manual-quarantine policy were **APPROVED by the owner/reviewer on 2026-08-27**. Remaining legal, operational, backup/restore, and implementation-verification items are production-intake gates, not approval to create resources.
**Research date:** 2026-08-27
**Price basis:** Public list prices checked on the research date; USD, excluding tax, exchange-rate effects, domain fees, and staff productivity-suite licences.
**Scope:** Architecture decision support only. No provider account, resource, secret, environment, deployment, DNS record, package, or application code was created.

## 1. Research methodology and confidence

This record applies the accepted Phase 0C architecture rather than redesigning it. It evaluates managed services for the existing server-first modular monolith, PostgreSQL system of record, separate public and candidate storage, private quarantine-to-clean file path, durable asynchronous work, server-side authorization, and isolated environments.

Research used current first-party product, documentation, region, security, and pricing pages where practical. Prices and vendor capabilities change; every production purchase must be rechecked at Phase 0D2 and again before production candidate intake.

Confidence labels:

- **VERIFIED:** supported by an official product or documentation page reviewed on 2026-08-27.
- **UNVERIFIED:** vendor-specific behaviour was not sufficiently established from current first-party documentation. It must not be treated as a production guarantee.
- **REQUIRES TEST:** compatibility or Pakistan latency must be measured with a representative preview before lock-in.

No synthetic latency number is used. Region proximity is only a selection heuristic.

## 2. Assumptions

### Development

- Local development and temporary isolated test resources.
- No real candidate data, production credentials, live email recipients, or production identity directory.
- Shared preview is created only when reviewers need it; all preview data is synthetic.

### Initial production

- Up to 30,000 public visits per month.
- Fewer than 100 staff identities and normally fewer than 20 active staff users.
- Up to 1,000 candidate submissions per month.
- Average candidate document size of 2 MB; PDF/DOCX limits remain an owner/HR/security decision.
- Up to 100 GB public portfolio storage and 250 GB monthly public media delivery.
- Up to 10,000 transactional emails per month.
- Low-volume operational logs with strict PII exclusion.
- One production application region, one primary database region, and global CDN delivery for public static/media assets.

### Moderate growth

- About 250,000 public visits per month.
- Up to 5,000 candidate submissions per month.
- Up to 500 GB public storage, 2 TB monthly public media delivery, and 50 GB live candidate-document storage before lifecycle deletion.
- Up to 50,000 transactional emails per month.
- More database compute, longer observability retention, and stronger support may be needed; enterprise identity remains unjustified unless staff count or compliance needs materially change.

## 3. Non-negotiable architecture fit

The chosen providers must preserve these Phase 0C controls:

1. Candidate files never use public media storage.
2. The browser receives only a short-lived, single-object upload permission to a private quarantine location.
3. A file is unavailable to staff until its object version/checksum is validated and a successful malware result is durably recorded.
4. Failed, timed-out, unsupported, encrypted, suspicious, or indeterminate scans fail closed and remain quarantined.
5. Application authorization remains server-side in Pyramid Designs. Authentication-provider roles or UI visibility are not business authorization.
6. Preview and development cannot access production candidate data, private buckets, queues, email delivery, or production staff credentials.
7. PostgreSQL, S3 APIs, standard email APIs/webhooks, and small adapter boundaries are preferred over provider-specific data models.
8. Candidate names, contact details, filenames, document content, free text, signed URLs, session tokens, and secrets are excluded from logs, errors, queue payloads, analytics, and email.

## 4. Hosting

### Comparison

| Provider | Next.js fit | Pakistan/region fit | Security and operations | Current cost indication | Main limitation |
| --- | --- | --- | --- | --- | --- |
| **Vercel Pro** | First-party Next.js platform; lowest framework-integration burden; image optimization, previews, functions, cron, WAF, logs and deployment controls are integrated. | Functions support Mumbai (`bom1`) and Singapore (`sin1`); CDN delivery is global. Region must be explicitly aligned with the database. **REQUIRES TEST** from Pakistan. | Pro is the minimum credible commercial production plan. Security headers/CSP remain application-controlled. Runtime log retention is short, so it is not the sole operational log store. | About **$20/month** for one developer seat, with included usage credit; additional seats and excess function, image, bandwidth, log, and firewall usage vary. | Framework convenience creates moderate deployment lock-in; preview controls and some security features have plan limits. Background work must not depend on request duration. |
| **Cloudflare Workers + OpenNext** | Current adapter supports substantial Next.js functionality and deploys to Workers; strong global edge and integrated R2, Queues and Turnstile. | Excellent global edge reach; dynamic placement is platform-controlled rather than a simple colocated Mumbai application/database pair. | Low base cost and good DDoS/network controls. Requires explicit compatibility testing for every Next.js feature, image path, server action and deployment upgrade. | Workers Paid starts around **$5/month** plus usage; Queues and R2 are separately metered. | More adapter/compatibility risk than Vercel for a feature-rich App Router application. It encourages a Cloudflare-centric design that is not required by the accepted architecture. |
| **AWS Amplify Hosting / AWS serverless deployment** | Amplify supports Next.js SSR deployments; AWS-native alternatives can be assembled with CloudFront, Lambda and related services. | AWS has Mumbai and Singapore regions and global CloudFront. | Mature IAM, audit and regional services. The web deployment, image optimization, previews, logs and incident path require more AWS knowledge and configuration. | Usage-based; low traffic may be inexpensive, but total cost is less predictable once build, SSR, data transfer, logs and supporting services are included. | Highest operational and implementation burden of the compared hosting choices; no need for a bespoke AWS platform at expected scale. |
| **Netlify** | Credible managed Next.js support and previews. | Global CDN; function-region and database colocation must be verified for the selected plan. | Managed developer experience comparable in category to Vercel. | Paid production plan is in the same broad tens-of-dollars-per-member range. **UNVERIFIED** exact applicable total until a current quote/plan checkout is reviewed. | No decisive security, region, cost or portability advantage over Vercel for this plan. |

### Hosting conclusion

Use **Vercel Pro provisionally**, with dynamic server execution colocated with the selected database. Vercel best fits the approved Next.js architecture with the least platform work. Cloudflare Workers is the strongest lower-cost alternative but requires an explicit compatibility prototype; AWS is the strongest control-oriented alternative but is operationally excessive for the web tier.

Do not use Vercel Cron as the only durable job system. Do not rely on one-day hosting logs for incident investigation. Preview deployments must connect only to isolated synthetic resources.

Official references: [Vercel Pro plan](https://vercel.com/docs/plans/pro-plan), [Vercel regions](https://vercel.com/docs/regions), [Vercel runtime logs](https://vercel.com/docs/runtime-logs), [Vercel image optimization pricing](https://vercel.com/docs/image-optimization/limits-and-pricing), [Cloudflare Next.js/OpenNext](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/), [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [AWS Amplify Next.js support](https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html).

## 5. PostgreSQL

### Comparison

| Provider | Prisma/pooling and workflow | Region | Backups and recovery | Current production cost indication | Assessment |
| --- | --- | --- | --- | --- | --- |
| **Neon** | Standard PostgreSQL, pooled and direct connection strings, serverless-friendly pooling, Prisma-compatible. Branching is useful for synthetic development/schema testing but production candidate data must never be copied into preview branches. | Singapore is the closest practical listed region for this stack. Region inventory must be rechecked. **REQUIRES TEST** from Pakistan. | Launch offers short restore history; Scale offers a longer restore window, higher limits, support/SLA features and is the safer production candidate. Restore history and retained branches/storage are usage-billed. | Launch is usage-based and can be low tens of dollars; **Scale has an approximately $69/month minimum** before material excess usage. | Best balance of PostgreSQL portability, serverless pooling, preview workflow and PITR cost. Singapore rather than Mumbai is the main trade-off. |
| **Supabase PostgreSQL** | Standard PostgreSQL with direct and Supavisor pooled connections; Prisma-compatible. Bundled Auth/Storage are optional and are not reasons by themselves to choose the database. | Mumbai and Singapore are practical options. Mumbai is attractive for Pakistan and can align with Vercel/AWS. | Pro includes daily backups. PITR is a separate paid add-on and requires an eligible compute tier. | Pro is **$25/month** plus compute above its included credit; a Small instance produces roughly **$30/month total** before extras. Seven-day PITR is currently about **$100/month additional**, creating a roughly **$130/month** database floor. | Strong Mumbai-region and operational-console fit. PITR is the largest cost cliff. |
| **AWS RDS for PostgreSQL** | Standard PostgreSQL and Prisma-compatible. Serverless request concurrency needs careful connection pooling; RDS Proxy adds cost, while a fixed small application pool may suffice initially. | Mumbai and Singapore. | Mature automated backups/PITR; Multi-AZ and longer retention are optional paid upgrades. | A small single-AZ instance plus storage/backups is normally tens of dollars per month; RDS Proxy, Multi-AZ, I/O and cross-region recovery increase cost. Exact Mumbai estimate requires the AWS calculator. | Strongest conventional operations and regional control, but more tuning, network and cost administration than Neon/Supabase. |

### PostgreSQL conclusion

Use **Neon Scale in Singapore provisionally** for production candidate intake. It supplies standard PostgreSQL, pooled serverless connections, meaningful restore history and a production SLA/support tier without Supabase's approximately $100/month PITR add-on. Use Neon Free or Launch only for isolated development and early preview.

This choice is conditional on a Pakistan-to-Singapore preview benchmark and legal/privacy confirmation that candidate records may be processed in Singapore. If either condition fails, use **Supabase Pro + Small compute + PITR in Mumbai**. AWS RDS remains the conservative migration target when scale, compliance or network-control needs justify more operations.

Production database rules:

- Use pooled connections for runtime and a direct connection for migrations.
- Use a separate production project/database and credentials; never branch production candidate data into preview.
- Require TLS, least-privilege application and migration roles, protected production access and tested restore procedures.
- PITR availability is not backup proof. Phase 6 must restore into quarantine, replay retention/deletion state, and validate application access before release.

Official references: [Neon plans](https://neon.com/docs/introduction/plans), [Neon regions](https://neon.com/docs/introduction/regions), [Neon Prisma guide](https://neon.com/docs/guides/prisma), [Supabase pricing](https://supabase.com/pricing), [Supabase regions](https://supabase.com/docs/guides/platform/regions), [Supabase backups/PITR](https://supabase.com/docs/guides/platform/backups), [Supabase Prisma guide](https://supabase.com/partners/integrations/prisma), [Amazon RDS PostgreSQL](https://aws.amazon.com/rds/postgresql/), [RDS automated backups](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.html).

## 6. Staff authentication

Candidate accounts remain out of MVP. Fewer than 100 staff identities do not justify enterprise workforce identity infrastructure unless the company already owns it.

| Option | MFA and lifecycle | Integration and authorization boundary | Cost for small staff | Assessment |
| --- | --- | --- | --- | --- |
| **Clerk Pro** | TOTP/SMS MFA options, session management/revocation, user disable/ban controls, Next.js SDK. Production policy must require MFA for all staff, not merely offer it. | Clerk authenticates. Pyramid Designs stores the effective staff record/role and evaluates every authorization decision server-side. | Pro is approximately **$20/month on annual billing** or about **$25 month-to-month**, including the first 10,000 monthly active users. | Recommended default when no approved company IdP exists. Simple and appropriately sized. |
| **Auth.js / Better Auth with an existing workforce IdP** | The library supplies application sessions; MFA, account disablement and identity assurance depend on Google Workspace, Microsoft Entra ID or another approved IdP. Auth.js now directs new projects toward Better Auth. | Lowest external auth lock-in, but the team owns more session, callback, account-linking and operational policy code. Roles still belong in the application database. | Library cost is $0; the existing IdP licence is outside this website budget. | Best option only if the owner confirms an existing managed workforce directory with enforced MFA, timely offboarding and named administrators. Do not build local password/MFA management merely to avoid Clerk fees. |
| **Supabase Auth** | Supports TOTP MFA and session controls; production account disablement and assurance workflows require implementation validation. | Natural fit with Supabase PostgreSQL but should not be selected just for bundling. Application authorization remains separate. | Included in Supabase plans for this staff volume; paid MFA/SMS factors can add usage cost. | Credible consolidation option if Supabase PostgreSQL is selected, but more authentication UI/policy ownership than Clerk. |

### Authentication conclusion

Use **Clerk Pro provisionally**, restricted to owner-approved staff addresses/domains, with mandatory TOTP MFA, short secure sessions, revocation on disablement, separate development/production instances, and step-up or recent-auth checks for destructive candidate actions where supported. Store only the external identity ID on the local staff record; do not copy Clerk authorization metadata into a trusted role decision without a current database policy check.

**Phase 0D2 alternative:** if Pyramid Designs already has Google Workspace or Microsoft Entra ID with enforced MFA and reliable offboarding, approve Better Auth/Auth.js-style OIDC integration instead and remove Clerk. This is a prerequisite question, not an assumed fact.

Official references: [Clerk pricing](https://clerk.com/pricing), [Clerk MFA](https://clerk.com/docs/guides/secure/best-practices/multi-factor-authentication), [Clerk session management](https://clerk.com/docs/guides/secure/session-options), [Auth.js](https://authjs.dev/), [Supabase MFA](https://supabase.com/docs/guides/auth/auth-mfa).

## 7. Object storage

### Public portfolio media

**Cloudflare R2** is the provisional public-media store.

- S3-compatible API and SDK portability.
- Public delivery through a custom domain and Cloudflare cache, with no R2 egress charge.
- Presigned URLs, object lifecycle rules and event notifications are available.
- Standard storage is **$0.015/GB-month** after a 10 GB free allowance; request classes are metered. Low initial use should be approximately $0–5/month.
- Public storage is never referenced by candidate-file records and has no credential capable of reading candidate buckets.
- R2 location hints are preferences, not hard residency guarantees. Public approved assets are suitable; do not place candidate data in R2 under this proposal.

### Private candidate documents

Use **AWS S3 in Singapore (`ap-southeast-1`)** with separate private quarantine and clean buckets, or equivalently separate access-control boundaries approved during implementation.

Required controls:

- Block Public Access at account and bucket level; Object Ownership bucket-owner-enforced; no ACL-based design.
- Short-lived presigned `PUT` to one random quarantine key after server-side upload-intent validation.
- Server revalidation of expected object version/checksum, size, extension, declared MIME, detected MIME and magic bytes.
- Default encryption in transit and at rest. SSE-S3 is mandatory; customer-managed KMS is an optional upgrade only if legal/security owners require separate key control and accept KMS cost/administration.
- Versioning only where the approved deletion/retention design accounts for old versions. Lifecycle incomplete uploads, rejected/quarantined objects, clean objects and non-current versions separately.
- Very short-lived, attachment-disposition staff download after a fresh role, scope, clean-state and retention-state check; audit every grant and denial.
- No active inline rendering of candidate documents.
- AWS CloudTrail data events for candidate-object access should be evaluated because they add cost but materially improve investigation evidence.

S3 storage and request cost is expected to be low single-digit dollars initially. Security configuration, deletion correctness and recovery evidence matter more than storage-price differences.

### Storage alternatives

- **AWS S3 for public and private:** strongest consolidation and event integration, but public egress and image-delivery cost can exceed R2; still a sound single-provider option.
- **Cloudflare R2 for private candidate files:** technically supports private S3-compatible objects and notifications, but the proposed managed GuardDuty scanner is native to S3. Cross-provider scanning would add a custom worker or external scanning API and weaken the boring quarantine flow.
- **Supabase Storage:** useful if Supabase is the adopted database platform, but adds product-specific policy/API coupling and has no decisive managed-malware advantage for this use case.

Official references: [R2 pricing](https://developers.cloudflare.com/r2/pricing/), [R2 S3 compatibility](https://developers.cloudflare.com/r2/api/s3/api/), [R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/), [R2 lifecycle rules](https://developers.cloudflare.com/r2/buckets/object-lifecycles/), [R2 location hints](https://developers.cloudflare.com/r2/reference/data-location/), [S3 presigned uploads](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html), [S3 Block Public Access](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html), [S3 lifecycle](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html), [S3 pricing](https://aws.amazon.com/s3/pricing/).

## 8. Malware scanning

### Compared approaches

| Approach | Security/reliability | Privacy and operations | Cost/limits | Decision |
| --- | --- | --- | --- | --- |
| **Amazon GuardDuty Malware Protection for S3** | Managed signature/detection updates; scans newly uploaded S3 objects; emits EventBridge scan status and can tag objects. Current documented limit is 5 GB per object and up to five nested archive levels. Password-protected files and unsupported/failed scans must fail closed. | Candidate document stays inside the selected AWS regional boundary during the managed scan, subject to AWS processor/subprocessor terms. No antivirus server to patch. | Region-specific. Example pricing is roughly **$0.09/GB scanned plus $0.215 per 1,000 objects**; first 1,000 objects and 1 GB per month currently have a free allowance. | **Recommended.** Boring, maintainable and directly aligned with S3 quarantine. |
| **Managed third-party scanning API** | Can be reliable when backed by credible SLA, engine updates and webhook authentication. | Uploading CV bytes to another processor creates a larger privacy boundary and another deletion/retention contract. Vendor maximum sizes and retention vary. | Often per file/GB/API tier and can become a material recurring cost. | Do not add unless GuardDuty proves technically unsuitable. No obscure scanner is accepted without security, DPA, region, deletion and uptime evidence. |
| **ClamAV in a container/serverless worker** | Open, well understood engine; complete control of flow. | Team owns image rebuilds, signature freshness, memory/ephemeral storage, cold starts, timeouts, concurrency, retries and scanner health. Large definition sets are a poor fit for short serverless requests. | Compute may be cheap at low volume, but operations are not free. | Rejected initially. Use only if managed scanning fails a documented requirement and a continuously maintained worker owner is approved. |
| **Other cloud-provider malware protection** | Potentially strong when storage and scanner are native to the same provider. | Moving private storage to match the scanner can be reasonable; cross-cloud file movement is not. | Provider-specific. | Re-evaluate only with a storage-provider change. |

### Required scan event flow

1. Upload is written only to the private quarantine bucket.
2. S3/GuardDuty produces an authenticated scan-result event.
3. EventBridge delivers only opaque object/version identifiers and scan state to an authenticated, idempotent server endpoint. Configure retries and a dead-letter destination.
4. The application re-reads authoritative object metadata and application state; it does not trust an unbound callback.
5. Only a `NO_THREATS_FOUND` result for the expected object version, plus application validation, permits server-side copy into the separate clean bucket and a durable clean-state transition.
6. `THREATS_FOUND`, access denied, unsupported, timeout, missing, malformed or duplicate events never expose a file. They remain quarantined for policy-driven retry/escalation/deletion.
7. Clean-copy completion and application eligibility are committed idempotently. Email is a later side effect, never the source of truth.

**UNVERIFIED before purchase:** confirm Malware Protection for S3 is orderable for the selected Singapore account/region, its applicable regional price, event schema, tagging permissions, file-type behaviour and service quota. The generic GuardDuty regional page shows Mumbai and Singapore availability, but the exact feature/region combination must be verified in the owner-controlled account before production commitment.

Official references: [GuardDuty Malware Protection for S3](https://docs.aws.amazon.com/guardduty/latest/ug/malware-protection-s3.html), [scan status and results](https://docs.aws.amazon.com/guardduty/latest/ug/monitor-with-eventbridge-s3-malware-protection.html), [quotas](https://docs.aws.amazon.com/guardduty/latest/ug/malware-protection-s3-quotas-guardduty.html), [GuardDuty pricing](https://aws.amazon.com/guardduty/pricing/), [GuardDuty regions](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_regions.html).

## 9. Background jobs and queues

The initial application needs durable delivery, retries, idempotency and scheduling; it does not need a general workflow platform, Redis worker fleet, Kafka, or a permanently administered server.

| Service | Fit | Cost and region/privacy | Main limitation |
| --- | --- | --- | --- |
| **Upstash QStash** | HTTP queue/scheduler works directly with Vercel endpoints; signed delivery, retries, delay/schedule, URL groups and deduplication cover email retry, retention/deletion triggers and small orchestration tasks. | Free allowance for development; pay-as-you-go is approximately **$1 per 100,000 messages**, with message and egress usage. Payloads must contain opaque IDs only. | Not a compute runtime; long work must be split into idempotent server steps. Exact data-processing location/retention requires privacy review. |
| **Inngest** | Strong event/function model, retries, concurrency, observability and Vercel integration. | Free tier is useful; paid production plan starts around **$75/month**. Execution/data-region details must be reviewed for candidate-related events. | A larger workflow product and fixed cost than initial requirements justify. |
| **Trigger.dev** | Durable tasks, retries, schedules and dedicated background compute; useful for genuinely long media/processing jobs. | Usage/concurrency pricing; deployment and telemetry region implications require review. | More platform than needed when GuardDuty performs scanning and media processing is modest. |
| **Cloudflare Queues** | At-least-once durable queue with batching/retries/DLQ and low cost; natural if the application already runs on Workers. | Included allowance on Workers Paid, then operations-based pricing. | Requires a Cloudflare Worker consumer and creates a second application runtime when Vercel is selected. |
| **AWS SQS/EventBridge** | Mature, regional, durable and naturally integrates S3/GuardDuty. | Very low usage cost. | General application consumers need Lambda/container workers or a polling design. It is excellent for scan events but unnecessarily moves all application jobs into AWS. |

### Queue conclusion

Use **QStash Pay-as-you-go** for application-owned jobs and schedules. Use **AWS EventBridge only for the native S3/GuardDuty scan-result path**. This is two delivery mechanisms, but each is the smallest native fit: QStash avoids operating workers, while EventBridge avoids exporting candidate files or building a scanner bridge.

Queue rules:

- Queue only opaque database/object IDs and operation versions, never candidate content or signed URLs.
- Verify QStash signatures and AWS event authentication; reject stale/replayed requests.
- Make every handler idempotent through database unique constraints/state transitions. Queue deduplication is an optimization, not the source of truth.
- Configure finite retries, explicit terminal state, dead-letter/failed-delivery alert and owner-run replay procedure.
- Do not send email or mark an application accepted until authoritative database/file state allows it.

Official references: [QStash pricing](https://upstash.com/docs/qstash/overall/pricing), [QStash retries](https://upstash.com/docs/qstash/features/retry), [QStash deduplication](https://upstash.com/docs/qstash/features/deduplication), [Inngest pricing](https://www.inngest.com/pricing), [Trigger.dev pricing](https://trigger.dev/pricing), [Cloudflare Queues guarantees](https://developers.cloudflare.com/queues/reference/delivery-guarantees/), [Cloudflare Queues pricing](https://developers.cloudflare.com/queues/platform/pricing/), [Amazon EventBridge](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-what-is.html).

## 10. Rate limiting and idempotency

Use **Upstash Redis Pay-as-you-go** as the provisional distributed rate-limit store, colocated as closely as the service permits with the application/database region.

- REST access is suitable for serverless functions and removes persistent connection management.
- Atomic Redis operations and TTLs support per-IP, per-form, per-upload-intent and short-window abuse controls.
- Current pay-as-you-go pricing is approximately **$0.20 per 100,000 commands** plus storage/network charges; initial cost should be $0–5/month.
- Global Redis replication can have eventual-consistency trade-offs. Strict idempotency must therefore use a PostgreSQL unique key and transaction, not Redis alone.
- Store hashes or short opaque keys rather than raw email, phone, filename or document data. Use short TTLs and documented abuse-data retention.
- Apply layered controls with Turnstile, a honeypot, origin checks, upload-intent limits and safe generic responses. Shared/mobile IPs must not receive permanent blocks.

Provider-native Vercel WAF rate limiting is useful at the network/path layer but is not a replacement for application-key idempotency and form-specific policy. Cloudflare rate limiting is attractive only if Cloudflare proxies the relevant application paths and the selected plan/features are approved.

Official references: [Upstash Redis pricing](https://upstash.com/docs/redis/overall/pricing), [Upstash global database consistency](https://upstash.com/docs/redis/features/globaldatabase), [Vercel WAF rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting).

## 11. Transactional email

| Provider | Reliability/operations | Privacy and cost | Assessment |
| --- | --- | --- | --- |
| **Postmark** | Transactional focus, message streams, delivery/bounce/suppression visibility, webhooks and established domain-authentication guidance. | Basic is **$15/month for 10,000 emails** with fixed 45-day message retention. Pro is **$16.50/month** and allows custom retention from 7 to 365 days. | **Recommended Pro.** The small price difference buys shorter message retention, which is more important than saving $1.50. |
| **Resend** | Simple Next.js integration, domains, webhooks, bounces/complaints and suppression handling. | Free: 3,000/month and 100/day. Pro: **$20/month for 50,000 emails** with 3-day data retention. | Strong alternative, especially when volume grows. Initial included volume exceeds needs, but Postmark's transactional operations are the preferred fit. |
| **Amazon SES** | Mature, cheap, scalable and integrates with AWS. | Very low per-message cost; requires more DNS, reputation, suppression, webhook and operational setup. | Cost-optimal at volume, but unnecessary operational burden initially. |

Use **Postmark Pro** in production and a non-delivering sink/test mode in development and preview. Configure SPF, DKIM and DMARC alignment before public release. Store only the provider message ID and safe delivery state locally; webhooks are authenticated and idempotent.

Candidate rules:

- Never attach or link a CV/document.
- Do not include application answers, accommodation requests or detailed hiring notes.
- Use the candidate's opaque reference and minimal next-step/support wording.
- Do not treat email delivery as submission truth.
- Confirm Postmark's processor/subprocessor, transfer, deletion and 7-day-retention configuration with legal/privacy review.

Official references: [Postmark pricing](https://postmarkapp.com/pricing), [Postmark webhooks](https://postmarkapp.com/developer/webhooks/webhooks-overview), [Postmark domain authentication](https://postmarkapp.com/support/article/1207-how-do-i-verify-a-domain), [Resend pricing](https://resend.com/pricing), [Resend webhooks](https://resend.com/docs/dashboard/webhooks/introduction).

## 12. Bot protection

Use **Cloudflare Turnstile Free** for public recruitment/contact forms, with server-side Siteverify validation.

- Free plan supports up to 20 widgets and unlimited challenges; sufficient for the site.
- Turnstile is designed as a CAPTCHA alternative and can be used without routing the whole site through Cloudflare.
- Tokens are single-use and expire after five minutes. Verification must occur on the server and must check the expected action/hostname where configured.
- Never place candidate identifiers or PII in `cData`, action labels or analytics dimensions.
- Accessibility must be manually tested with keyboard, screen reader, reduced motion, network failure and challenge-failure cases. Provide a recoverable retry/support route; a challenge failure must not silently discard an upload.
- Turnstile is one signal, not the only abuse control. Pair it with the honeypot, timing, rate-limit and idempotency design.

Do not introduce invasive behavioural/fingerprinting analytics for a low-volume form. If legal/privacy review rejects Turnstile's data processing, retain the server controls and evaluate a simple alternative before production; do not weaken abuse protection without replacement.

Official references: [Turnstile plans](https://developers.cloudflare.com/turnstile/plans/), [server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [Turnstile privacy/security](https://developers.cloudflare.com/turnstile/reference/privacy/).

## 13. Error monitoring

Use **Sentry Team** for production error monitoring.

- Current Team plan is approximately **$26/month** and includes 50,000 errors, 5 GB logs and team alerting/integrations.
- Next.js integration covers server and client failures, release identifiers and source maps.
- Performance monitoring is enabled only at a deliberately low sample rate after payload/PII review; session replay is disabled on candidate forms and staff admin by default.
- Configure `sendDefaultPii: false`, request-body/header/cookie filtering, `beforeSend`/event processors, allowlisted tags and safe opaque IDs.
- Do not send candidate names, email, phone, application answers, filenames, signed URLs, document content, auth tokens or database query parameters.
- Separate development, preview and production environments/releases; preview uses synthetic data.
- Alerts must route to a named operational owner and be tested before launch.

Sentry Developer is acceptable while implementation is local/preview-only. Upgrade to Team before production-like candidate-flow testing so retention, alert routing and team access are exercised.

Official references: [Sentry pricing](https://sentry.io/pricing/), [Sentry Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/), [data scrubbing](https://docs.sentry.io/security-legal-pii/scrubbing/), [Sentry logs](https://docs.sentry.io/product/explore/logs/).

## 14. Structured operational logging

Vercel runtime logs are useful for live diagnosis but Pro retains them for only about one day. That is insufficient as the only investigation record. Do not add Axiom or another log vendor initially; use **Sentry Team Logs** as the smallest sufficient searchable structured-log destination and retain Vercel logs as the immediate platform view.

Log only:

- timestamp, environment, release and service/component;
- safe request/correlation ID;
- opaque application, upload, job and object IDs;
- event type, state transition, duration bucket and safe outcome/error class;
- actor's opaque staff ID for security audit correlation, never email/name;
- provider request ID when safe and useful.

Security/audit events remain an append-only application/database record, not merely an observability log. Candidate-file view/download, authorization denial, staff role changes, deletion and retention actions require the Phase 0C audit model even if Sentry is unavailable.

Upgrade to a dedicated log platform such as Axiom or Better Stack only when one of these is measured:

- Sentry log allowance/retention is insufficient for incident or compliance needs;
- cross-service querying/archival is required;
- log volume materially distorts Sentry error-monitoring cost;
- legal/security requires a separately administered immutable export.

Current alternatives: Axiom's cloud plan starts around **$25/month** with longer retention; Better Stack's free and paid log tiers are credible. They are deferred because Sentry already supplies the necessary low-volume capability.

Official references: [Vercel log duration](https://vercel.com/docs/runtime-logs), [Sentry logs](https://docs.sentry.io/product/explore/logs/), [Axiom pricing](https://axiom.co/pricing), [Better Stack pricing](https://betterstack.com/pricing).

## 15. Uptime monitoring

Use the **separate Sentry Uptime monitor included with Sentry Team** initially for an external public-home or minimal application-health endpoint check. Availability checks, alert rules and ownership remain separate from exception alerts even though the provider is shared. This removes a ninth mandatory account at low initial scale.

- Current Sentry plans include one uptime monitor, sufficient for the first public/health check.
- Monitor the public home route from multiple locations and a safe health endpoint that reports only coarse application/dependency readiness.
- Do not make a public health endpoint reveal database names, regions, versions, credentials, queue depth, candidate counts or internal exception text.
- A deep candidate-system check should run synthetically in a private production-like environment, not write real candidate data through a public uptime probe.
- Route alerts to a named owner and test the route. A monitor without owned response is not a control.

**Better Stack** is the preferred independent-monitor upgrade when more than one check, job heartbeats, multi-channel escalation or protection against a correlated Sentry outage is required. Its free tier currently includes 10 monitors and 10 heartbeats. **UptimeRobot** is an acceptable simpler alternative; its free plan currently has 50 monitors but five-minute checks, while paid plans provide faster checks and additional status/alert features.

The initial correlated-provider risk is accepted provisionally because the application remains low volume and the monitor is functionally separate. Add Better Stack before launch if the owner requires independent monitoring or when background-job heartbeats are implemented.

Official references: [Better Stack pricing](https://betterstack.com/pricing), [UptimeRobot pricing](https://uptimerobot.com/pricing/), [Sentry uptime monitoring](https://docs.sentry.io/product/uptime-monitoring/).

## 16. Media delivery

Initial media delivery uses **Cloudflare R2 through a custom public media domain**, browser-native responsive media, and `next/image` where its transformations and layout protection add value.

- Images: store approved originals/controlled derivatives in R2; use responsive sizes, AVIF/WebP where supported, immutable hashed keys and long cache headers. `next/image` may proxy/optimize remote R2 images, but Vercel image transformations and cache reads are metered. Pre-generate obvious portfolio derivatives during content publication if repeated transformation cost becomes measurable.
- Video: start with deliberately compressed MP4/WebM poster-and-video assets on R2/CDN for short, non-autoplay or user-initiated clips. Do not adopt a dedicated video SaaS until adaptive streaming, upload processing, analytics or bandwidth measurements justify it.
- 3D: deliver compressed GLB, KTX2/Basis textures and poster fallbacks from R2/CDN. Respect the plan's 700 KB hero-model target, save-data and non-WebGL fallbacks.
- Security: public-media processing has no access path to candidate storage. Upload/publish is staff-authorized and uses content-type allowlists; public assets are not trusted HTML/script.
- Portability: retain source assets and derivative recipes so R2 can be migrated to S3 or another S3-compatible/CDN provider.

Cloudflare Images, Mux, Cloudinary and similar services are deferred. Add one only after actual source-format, adaptive-video, transformation-volume or delivery analytics requirements exceed the native path.

Official references: [Next.js Image component](https://nextjs.org/docs/app/api-reference/components/image), [Vercel image pricing](https://vercel.com/docs/image-optimization/limits-and-pricing), [R2 public buckets/custom domains](https://developers.cloudflare.com/r2/buckets/public-buckets/).

## 17. Consolidation analysis

### Vercel-centric

Vercel is the right application host, preview plane and immediate runtime-log source. Vercel-native blob, image, firewall, cron/workflow and observability products could reduce dashboards, but using all of them would create unnecessary platform coupling and does not improve the private S3/GuardDuty quarantine path. Use Vercel where it is strongest; do not force database, queue, candidate storage or durable operational records into it.

### Cloudflare-centric

Workers, R2, Queues, Turnstile and CDN can form a low-cost coherent stack. The main cost is technical: the accepted application is Next.js App Router, and OpenNext compatibility becomes a release dependency. Cloudflare also lacks the selected native S3 malware-scanning path. This option is credible after a focused compatibility prototype, not a lower-risk default.

### Supabase-centric

Supabase can consolidate PostgreSQL, Auth and public/private object storage in Mumbai. It remains a credible minimum-dashboard choice, but PITR is a material cost cliff and private candidate scanning still needs an external scanner or AWS path. Using Supabase Auth/Storage merely because the database is there would couple more application surfaces without eliminating the highest-risk vendor boundary.

### AWS-centric

AWS can supply Amplify/CloudFront/Lambda, RDS, S3, GuardDuty, SQS/EventBridge, SES, CloudWatch and WAF. It offers strong regional control and conventional portability but requires substantially more IAM, network, deployment, observability and incident administration. It is appropriate when compliance, scale or existing MAD Alpha AWS operations justify it; none is currently confirmed.

### Best-of-breed managed

The preferred stack uses eight service vendors/operating consoles after consolidation by vendor:

- Vercel: hosting/previews;
- Neon: PostgreSQL;
- Clerk: staff authentication;
- Cloudflare: R2 and Turnstile;
- AWS: private S3, GuardDuty and EventBridge;
- Upstash: QStash and Redis;
- Postmark: email;
- Sentry: errors, searchable logs and an initially separate uptime monitor.

Eight accounts is not ideal. It is accepted provisionally because each service is small, managed and replaces a materially riskier custom subsystem. The first consolidation target is authentication: an existing approved workforce IdP could remove Clerk. Independent Better Stack monitoring is an upgrade, not a mandatory ninth account. Do not consolidate private candidate files into a less suitable provider merely to reduce a dashboard count.

## 18. Candidate stacks

All three options preserve private quarantine, successful-scan-only clean state, application authorization, isolated environments and encrypted managed backups. None is intentionally insecure.

### Option A — Reliability/security and Mumbai alignment

| Category | Service |
| --- | --- |
| Hosting | Vercel Pro, Mumbai |
| PostgreSQL | Supabase Pro + Small compute + seven-day PITR, Mumbai |
| Authentication | Clerk Pro, or existing approved workforce IdP |
| Public media/bot | Cloudflare R2 + Turnstile |
| Private files/scanning | AWS S3 + GuardDuty Malware Protection, Mumbai |
| Jobs/rate limits | QStash + Upstash Redis; EventBridge for scan events |
| Email | Postmark Pro |
| Errors/logs/uptime | Sentry Team, with Better Stack as the independent-monitor upgrade |

Best regional colocation and a mature managed scan boundary. Highest predictable initial database cost because Supabase PITR is approximately $100/month beyond base database/compute. Choose if Pakistan benchmark materially favours Mumbai or legal/privacy review prefers the regional arrangement.

### Option B — Minimum operational complexity

| Category | Service |
| --- | --- |
| Hosting | Vercel Pro, Mumbai |
| PostgreSQL + staff auth | Supabase Pro + Small compute + PITR + Supabase Auth, Mumbai |
| Public media/bot | Cloudflare R2 + Turnstile |
| Private files/scanning | AWS S3 + GuardDuty Malware Protection, Mumbai |
| Jobs/rate limits | QStash + Upstash Redis; EventBridge for scan events |
| Email | Postmark Pro |
| Errors/logs/uptime | Sentry Team, with Better Stack as the independent-monitor upgrade |

Removes a separate authentication vendor and keeps database/auth administration together. It still has multiple providers because no single service safely replaces the private scanner, public CDN/media and operational tools. Requires more application-owned MFA/session/admin workflow than Clerk and retains the PITR cost cliff.

### Option C — Cost-conscious production baseline

| Category | Service |
| --- | --- |
| Hosting | Vercel Pro, Singapore |
| PostgreSQL | Neon Launch, Singapore, seven-day restore history |
| Authentication | Clerk Pro or existing workforce IdP |
| Public media/bot | Cloudflare R2 + Turnstile |
| Private files/scanning | AWS S3 + GuardDuty Malware Protection, Singapore |
| Jobs/rate limits | QStash + Upstash Redis; EventBridge for scan events |
| Email | Postmark Pro |
| Errors/logs/uptime | Sentry Team, with Better Stack as the independent-monitor upgrade |

Lowest reasonable paid stack while retaining scanning, private storage, MFA, backups, external error/log and uptime controls. The trade-off is Neon Launch's lower support/SLA and shorter recovery window. Upgrade to Neon Scale before production candidate intake unless the owner explicitly accepts the documented availability/recovery risk after a restore test.

## 19. Comparative matrix

Cost ranges are directional list-price estimates under the initial assumptions, not quotes. Usage, taxes, exchange rates, support, seats, logs and media can move them.

| Criterion | Option A — security/Mumbai | Option B — fewer auth vendors | Option C — cost-conscious |
| --- | --- | --- | --- |
| Estimated initial monthly cost | **$210–330** | **$190–305** | **$90–160** |
| Expected moderate-growth cost | **$350–925** | **$330–875** | **$250–700** after likely Neon Scale upgrade |
| Pakistan-region suitability | Strongest on paper: application, DB and private storage in Mumbai; **REQUIRES TEST** | Same strong regional alignment; **REQUIRES TEST** | Singapore colocation; likely practical but **REQUIRES TEST** |
| Security | High; paid PITR, managed MFA and S3 scanning | High; same data controls, with more app-owned auth policy | Baseline high; lower database SLA/recovery depth until upgrade |
| Candidate-file security | High | High | High |
| Backup/recovery | Daily backup + paid PITR; restore test still mandatory | Same | Seven-day Neon restore history; Scale improves SLA/history |
| Operational complexity | Medium-high | Medium | Medium |
| Portability | High for PostgreSQL/S3/email; moderate auth/queue adapters | High data portability; moderate Supabase Auth coupling | High data portability; moderate Clerk/QStash coupling |
| Vendor count | 8 named vendors | 7 named vendors | 8 named vendors |
| Implementation complexity | Medium | Medium; auth UI/policy work slightly higher | Medium |
| Major limitation | Database PITR cost | Supabase auth ownership plus PITR cost | Singapore latency and lower Launch reliability |

### Preferred option

The provisional preferred stack is a controlled variant of **Option C using Neon Scale, not Launch**. It costs more than the cost-conscious baseline but retains the lower-cost Neon recovery model while adding the production tier's stronger SLA/support/history. This is the best balance pending Pakistan benchmarking and data-location approval.

Expected initial total: **approximately $155–250/month**.

## 20. Proposed preferred stack

This proposal is not adopted until Phase 0D2 approval.

| Category | Recommended provider/service | Exact reason | Expected initial cost | Required production plan | Region | Critical caveat | Exit/migration path |
| --- | --- | --- | ---: | --- | --- | --- | --- |
| Hosting | **Vercel** | Best first-party Next.js support, previews, global CDN and smallest deployment burden. | ~$20+ | Pro | Singapore (`sin1`) | Usage/seats/image/log costs; short native log retention. | Standard Next.js can move to Cloudflare OpenNext, Netlify or AWS after compatibility work. |
| PostgreSQL | **Neon** | Standard PostgreSQL, Prisma pooling, serverless fit and lower PITR cost than Supabase. | ~$69–120 | Scale | Singapore | Pakistan latency and Singapore candidate-data processing require approval; preview must never branch production PII. | `pg_dump`/logical migration to Supabase/RDS/another PostgreSQL; keep standard SQL/Prisma migrations. |
| Authentication | **Clerk** | Managed staff MFA/session lifecycle without building workforce identity for <100 users. | ~$20–25 | Pro | Vendor managed; **UNVERIFIED** exact processing locations | Existing corporate IdP could be better; roles remain local/server-side. | Store stable local staff IDs and external subject; migrate to workforce OIDC/Auth.js/Supabase Auth with controlled account relink. |
| Public media | **Cloudflare R2** | S3 API, global public delivery and no R2 egress fees. | $0–5 | Standard pay-as-you-go | Automatic/public CDN; location hint only | Location hint is not hard residency; transformations are not a full media CMS. | Copy with S3 tools to S3-compatible storage; preserve originals and derivative recipes. |
| Private candidate storage | **AWS S3** | Mature private buckets, presigned uploads, lifecycle/versioning, audit and native GuardDuty scanning. | $1–5 | Standard S3 | Singapore (`ap-southeast-1`) | IAM/lifecycle/version deletion must be proven; CloudTrail data events add cost. | S3 API/export to another object store; keep storage adapter and random keys. |
| Queue/background jobs | **Upstash QStash** plus AWS EventBridge for scan events | Smallest durable HTTP retry/schedule layer for Vercel; native AWS events stay native. | $0–5 | Pay-as-you-go | Provider managed; app/DB execution Singapore | Queue payload location/retention needs privacy review; two mechanisms need clear runbooks. | Persist job intent/state in PostgreSQL; replace delivery adapter with SQS, Inngest, Trigger.dev or Cloudflare Queues. |
| Malware scanning | **GuardDuty Malware Protection for S3** | Managed updates/scanning inside the S3 workflow; no ClamAV server. | <$1–5 at initial volume | Usage-based | Singapore, subject to feature verification | Scan is not perfect; unsupported/failed results fail closed; verify feature/price in account. | Replace scanner event adapter or move storage/scanner together; quarantine/clean state model remains. |
| Rate limiting/idempotency | **Upstash Redis** + PostgreSQL unique constraints | Serverless REST/TTL for distributed limits; DB remains authoritative for idempotency. | $0–5 | Pay-as-you-go | Closest available/global | Global consistency is not strict enough for business idempotency alone. | Replace rate-limit adapter with managed Redis/provider WAF; database idempotency survives. |
| Transactional email | **Postmark** | Transactional operations, webhooks/suppressions and configurable short retention. | $16.50 | Pro 10k | Vendor managed | Candidate address/message crosses provider boundary; DPA/subprocessors and 7-day retention need confirmation. | Standard email adapter, DNS records and local delivery state allow migration to Resend/SES. |
| Bot protection | **Cloudflare Turnstile** | Free, privacy-conscious CAPTCHA alternative with server verification. | $0 | Free | Global | Accessibility/privacy testing and legal review still required. | Small server verification adapter; replace while retaining honeypot/rate-limit controls. |
| Error monitoring | **Sentry** | Mature Next.js errors/releases/alerts; Team also supplies low-volume logs. | $26 | Team | Vendor managed | Aggressive PII scrubbing; no replay/request bodies on candidate/admin routes. | Standard structured errors/logs can move to another OTEL-compatible/log platform; remove SDK wrapper. |
| Structured logging | **Sentry Logs** + Vercel live logs | Avoids a separate log vendor while supplying searchable structured operations beyond one-day Vercel retention. | Included in Sentry Team | Team | Vendor managed | 14-day log query/allowance may become insufficient. | Emit consistent JSON through a thin server logger; drain to Axiom/Better Stack/OTEL later. |
| Uptime monitoring | **Sentry Uptime** | Uses the paid monitoring account's separate external check without a ninth provider. | Included | Team | External/global checks | Correlated Sentry outage and one-monitor limit; must have named alert owner. | Add Better Stack/UptimeRobot or another external service; health endpoint remains portable. |

## 21. Development, preview and production tiers

| Service | Development | Preview | Production | Upgrade trigger |
| --- | --- | --- | --- | --- |
| Vercel | Local only; $0 | Vercel Pro only when shared review is needed; synthetic data | Pro | Before first company preview if Hobby terms are not appropriate; definitely before production deployment |
| Neon | Free isolated project/database | Free/Launch separate synthetic project; never a production-data branch | Scale separate project | Before production-like candidate testing or any real candidate intake |
| Clerk | Development instance/test users | Separate development instance, synthetic staff | Pro production instance, MFA required | Before real staff identities or production auth testing |
| R2 public | Free allowance/dev bucket | Separate preview bucket/domain with synthetic assets | Production bucket/custom domain | Before content QA requiring CDN behaviour |
| S3 private | Local emulator or isolated AWS dev bucket with synthetic test files | Separate AWS preview buckets/account boundary; EICAR and synthetic docs only | Separate production quarantine/clean buckets | Before end-to-end malware testing; no real candidate file before full production gate |
| GuardDuty | No cloud scan needed for routine unit work | Enable only for isolated security integration test | Enabled and monitored | Before malware-path integration gate |
| QStash | Free/dev topic and signing key | Separate preview topic/key | Pay-as-you-go production topic/key | Before asynchronous integration testing |
| Upstash Redis | Free separate database | Separate preview database | Pay-as-you-go production database | Before distributed form testing |
| Postmark | Test server/token or local sink; no real recipients | Non-delivering/safe approved recipients only | Pro, authenticated production domain/stream | Before notification integration; live delivery only after owner approval |
| Turnstile | Test keys | Preview widget/hostname | Production widget/hostname | Before public-form abuse testing |
| Sentry | Developer/free, scrubbed synthetic events | Separate preview environment/project | Team | Before production-like alert and retention testing |
| Sentry Uptime | Optional development monitor | Preview monitor if stable | One separate production uptime monitor included | Before launch-readiness rehearsal |
| Better Stack (optional) | Not needed | Not needed | Add Free plan only if independent checks or job heartbeats are approved | Before launch when independent monitoring is required, or when recurring-job heartbeat coverage is implemented |

Development does not need paid production infrastructure. The expected early development cost is **$0–25/month**, rising to roughly **$20–60/month** when a persistent shared preview is needed. Production plans are purchased only after Phase 0D2 approval and immediately before the relevant integration gate, not all at once.

## 22. Region strategy

### Provisional primary strategy: Singapore

- Vercel server functions: Singapore (`sin1`).
- Neon production PostgreSQL: Singapore.
- AWS S3 quarantine/clean and GuardDuty: Singapore (`ap-southeast-1`).
- Public R2 media: global custom domain/CDN; location hints are not treated as residency guarantees.
- Clerk, Postmark, Upstash and Sentry: external processors; exact storage/processing and subprocessors require contract/privacy review. Better Stack joins this list only if the optional independent monitor is enabled.

This keeps the request/response application and primary database colocated. Private file writes/scans also stay in Singapore, avoiding routine Mumbai–Singapore transfers for the high-risk flow. Public static/media delivery remains global.

### Mumbai fallback

If empirical Pakistan testing or privacy requirements reject Singapore, use:

- Vercel Mumbai (`bom1`);
- Supabase PostgreSQL Pro + Small + PITR in Mumbai, or AWS RDS PostgreSQL Mumbai if the operational cost is accepted;
- AWS S3/GuardDuty Mumbai;
- the same global public-media and external managed services.

### Required benchmark

Before Phase 0D2 locks the region, test from representative Pakistani networks/devices:

- Karachi and at least one other major user location where practical;
- public SSR/TTFB and form round trips;
- admin reads/writes;
- direct private upload initiation and upload;
- scan-result-to-clean-state completion;
- database transaction and connection cold/warm behaviour.

Use measured p50/p95/p99 and failure rates; do not choose a region from geography alone.

## 23. Data-residency and privacy caveat

No legal conclusion is made here. A provider region does not prove every support, telemetry, backup, abuse-prevention, identity, email or subprocessor operation stays in that geography.

Before any real candidate intake, qualified legal/privacy review must confirm:

- Pyramid Designs' legal entity, controller role, operating jurisdiction and approved privacy contact;
- whether candidate records/documents may be processed and backed up in Singapore or Mumbai;
- cross-border transfer mechanism and required notice/consent wording;
- every processor/subprocessor list, DPA, breach terms and deletion/return provisions;
- provider support-access and telemetry locations;
- Postmark message/body retention, Clerk identity data, Upstash queue/cache payload data and Sentry logs/errors/uptime data; Better Stack monitor data if that optional service is enabled;
- R2 public asset location behaviour (public assets only under this proposal);
- backup retention after candidate deletion and the restore/replay process;
- approved candidate retention periods, legal holds, correction/deletion request verification and audit retention.

The architecture remains movable before production candidate intake: PostgreSQL is standard, candidate files use S3 APIs, provider events are behind small adapters, and no provider account has yet been created.

## 24. Cost model

### Development

Assumptions: local development, no real candidate data, free isolated tiers, no persistent shared preview.

| Cost group | Approximate monthly range |
| --- | ---: |
| Local/framework/database/auth/storage/queue/test email/monitoring | $0 |
| Optional temporary shared preview and paid hosting | $0–25 |
| **Development total** | **$0–25** |

### Initial production

Assumptions are in section 2. This estimate uses the preferred Neon Scale stack.

| Service group | Approximate monthly range |
| --- | ---: |
| Vercel Pro, one developer, low usage | $20–40 |
| Neon Scale database/PITR/compute/storage | $69–120 |
| Clerk Pro | $20–25 |
| R2 public media | $0–5 |
| S3 private storage + GuardDuty + EventBridge | $1–8 |
| QStash + Upstash Redis | $0–10 |
| Postmark Pro | $16.50 |
| Turnstile | $0 |
| Sentry Team errors + logs | $26 |
| Sentry uptime | Included in Sentry Team |
| Optional Better Stack independent monitoring | $0 initially |
| **Initial production total** | **about $155–250/month** |

### Moderate growth

Assumptions: 250,000 public visits, 5,000 candidate submissions, 2 TB public media delivery, 50 GB current candidate files, 50,000 email messages, higher compute/log use.

| Service group | Approximate monthly range |
| --- | ---: |
| Hosting/functions/images/bandwidth | $40–160 |
| PostgreSQL compute/storage/PITR | $100–300 |
| Authentication | $20–50 while staff remains small |
| Public media | $10–60, depending storage/requests and video pattern |
| Candidate S3/scanning/events/audit | $10–75 |
| Queue/Redis | $5–40 |
| Email | $20–80 |
| Error/log/uptime | $30–150 |
| **Moderate-growth total** | **about $250–925/month** |

### Cost cliffs

1. **Supabase PITR:** approximately $100/month add-on, making the Mumbai database option materially more expensive.
2. **Neon Scale:** approximately $69/month minimum, justified for production SLA/recovery rather than raw low-volume compute.
3. **Observability retention/volume:** Sentry included logs are sufficient initially; dedicated logs or higher retention can add $25–100+.
4. **Media/video:** repeated image transforms and high-bandwidth video can dominate hosting/CDN cost. Measure before adopting video SaaS.
5. **Enterprise authentication:** SSO/SAML, advanced audit or identity governance can move auth from tens to hundreds of dollars; not justified for current staff count absent a requirement.
6. **Redis enterprise HA:** not required initially because PostgreSQL owns idempotency and rate limiting can degrade conservatively. Add only after availability/error evidence or a stricter SLA.
7. **AWS audit/KMS/network:** CloudTrail data events, KMS requests, cross-region replication and egress can exceed raw S3 storage cost.
8. **Scanning volume:** GuardDuty is cheap for small CVs but large files/archives and repeated uploads increase scanned GB/object charges.

## 25. Lock-in analysis

| Provider | Lock-in | Why | Practical exit |
| --- | --- | --- | --- |
| Vercel | **MODERATE** | Deployment configuration, image optimization, previews and function behaviour are platform-specific. | Keep application on standard Next.js/server APIs and isolate platform config; validate Cloudflare/Netlify/AWS before migration. |
| Neon | **LOW** | Data is standard PostgreSQL; branching/autoscaling operations are vendor-specific. | Logical dump/replication to Supabase, RDS or managed PostgreSQL; retain tested migrations. |
| Clerk | **MODERATE** | Identity IDs, sessions, UI and MFA workflows are provider-specific. | Keep local staff/role records independent, map external subject, export identities where feasible, require controlled relink/re-enrolment. |
| Cloudflare R2 | **LOW** for objects, **MODERATE** for delivery | S3 API and portable objects; custom CDN/cache rules are specific. | Copy with S3 tools, repoint media domain, retain derivative/source records. |
| AWS S3/GuardDuty | **LOW** for storage, **MODERATE** for scanner events | S3 is the portability baseline; GuardDuty event/result semantics are specific. | Copy objects/metadata to another S3 provider and replace the scanner adapter without changing quarantine/clean states. |
| QStash | **MODERATE** | HTTP signatures, schedules, retries and deduplication are provider-specific. | Store job intent/state in PostgreSQL and implement a delivery adapter for SQS/Inngest/Cloudflare Queues. |
| Upstash Redis | **LOW** | Redis commands/data model are standard; REST/global behaviour is specific. | Move rate-limit adapter to another managed Redis or provider WAF; DB idempotency is unchanged. |
| Postmark | **LOW** | API/webhook formats are specific but email and DNS standards are portable. | Swap email adapter/webhook handlers to Resend/SES; retain local message/delivery state. |
| Turnstile | **LOW** | One browser widget and server verification endpoint. | Replace adapter; retain server-side abuse layers. |
| Sentry | **MODERATE** | SDK event shape, performance traces and issue workflow are specific. | Keep structured application logger/error boundary; export/replace with OTEL or another error/log platform. |
| Sentry Uptime | **LOW** | External HTTP monitor has little application coupling. | Recreate checks in Better Stack/UptimeRobot/another monitor. |

## 26. Risk register

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Provider outage | Public site, admin, submissions or a side effect may become unavailable. | Candidate operations fail closed; durable state/retries; independent monitoring; status/runbook; export/restore paths; no email-as-truth. |
| Pricing change | Preferred low-volume economics may deteriorate. | Record usage/cost monthly; budget alerts; adapter boundaries; re-evaluate at Phase 6 and annually. |
| Regional latency | Singapore may underperform Mumbai for Pakistani users. | Mandatory representative benchmark before lock-in; colocate compute/database; documented Mumbai fallback. |
| Data-residency/privacy mismatch | Candidate intake may violate approved policy/notice or processor expectations. | Legal/privacy validation before resources/real data; DPA/subprocessor review; no production collection until approved. |
| Provider account suspension/compromise | Loss of service or unauthorized access across critical systems. | Company-owned accounts, MFA, least privilege, two accountable admins, billing alerts, recovery contacts, audit logs, exports, no shared personal accounts. |
| Scan integration failure | Malicious/unknown file could be exposed or legitimate file stuck. | Object-version binding; fail closed; EventBridge retry/DLQ; reconciliation job; alert; clean copy only after explicit successful result. |
| Queue duplicate/loss | Duplicate email/state action or missed retention work. | PostgreSQL idempotency keys/state transitions; finite retry/DLQ; reconciliation; queue not source of truth. |
| Authentication-provider failure | Staff cannot access admin, or account disablement is delayed. | Short sessions, revocation tests, break-glass procedure without weakening authorization, local role record, existing-IdP fallback analysis. |
| Vendor lock-in | Migration cost or outage dependency. | Standard PostgreSQL/S3/email; small provider adapters; export drills; avoid provider-specific business data models. |
| Operational complexity | Eight vendor accounts create missed alerts/config drift. | Named owner, password manager, MFA, inventory/runbook, quarterly access review, consolidate only where risk-neutral. |
| Telemetry PII leak | Candidate confidentiality breach through logs/errors/email/queue. | Allowlist fields, opaque IDs, SDK scrubbing, payload tests, no request bodies/replay, short provider retention, incident purge procedure. |
| Backup/deletion conflict | Deleted candidate data reappears after restore. | Policy-versioned deletion ledger, backup expiry disclosure, restore into quarantine, replay deletion before access, periodic recovery exercise. |
| Media cost/performance growth | Video/images degrade performance or exceed budget. | R2 CDN, budgets, responsive derivatives, no automatic video SaaS, measure transformations/egress. |

## 27. Outstanding decisions

The following are not provider facts and remain owner/legal/HR/operations decisions:

1. Approved monthly development, initial-production and growth budgets.
2. Singapore versus Mumbai after empirical Pakistan testing.
3. Whether candidate data may be processed/backed up in the proposed regions and external providers.
4. Required database RPO/RTO and whether Neon Scale history/SLA is sufficient.
5. Whether an existing Google Workspace/Microsoft Entra workforce directory can replace Clerk.
6. Staff MFA factors, recovery, offboarding, step-up and break-glass policy.
7. Candidate file allowlist, maximum size, archives/encrypted documents, scan retry SLA and failed-scan owner.
8. Candidate retention/deletion periods, backup expiry, legal holds and deletion-request process.
9. Whether S3 SSE-S3 is sufficient or customer-managed KMS is required.
10. Whether CloudTrail candidate-object data events are mandatory despite added cost.
11. Named owners for provider billing, access, alerts, incidents, backups and restore tests.
12. Approved production email domain/subdomain, sender identities and DMARC policy.
13. Whether Sentry's proposed log retention is sufficient or a dedicated log platform is required.
14. Whether Sentry's included uptime monitor is sufficient initially or independent Better Stack monitoring is required before launch.

## 28. Phase 0D2 approval questions

Phase 0D2 should explicitly approve, reject or replace each item:

1. Preferred Singapore stack and Mumbai fallback.
2. Vercel Pro as the production Next.js host.
3. Neon Scale as PostgreSQL, including recovery window and budget.
4. Clerk Pro unless an existing workforce IdP is confirmed.
5. R2 for public assets and S3 for private quarantine/clean candidate objects.
6. GuardDuty Malware Protection for S3, including unsupported/failed-scan policy.
7. QStash for application jobs and EventBridge for scan events.
8. Upstash Redis for rate limits, with PostgreSQL as the idempotency authority.
9. Postmark Pro and seven-day message retention.
10. Turnstile Free plus layered non-invasive abuse controls.
11. Sentry Team for errors and initial structured logs.
12. Sentry's included uptime monitor initially, and the trigger for optional independent Better Stack monitoring.
13. Monthly budget range and cost-alert threshold.
14. Legal/privacy validation owner and deadline before candidate implementation.
15. Pakistan benchmark acceptance criteria and test owner.

No provider resource should be created until these decisions are approved at the relevant phase gate.

## 29. Verification

- Research date and changing-price caveat are recorded.
- Current first-party provider documentation/pricing was used where practical; unsupported vendor details are marked **UNVERIFIED** or **REQUIRES TEST**.
- No provider account, cloud resource, database, bucket, deployment, API key, environment variable, DNS record or irreversible commitment was created.
- No application code or package manifest exists; no package was installed.
- The proposal preserves Phase 0B requirements and Phase 0C trust boundaries.
- Candidate storage remains private and separate from public media, with quarantine and clean boundaries.
- Candidate files remain unavailable unless validation and malware scanning succeed.
- Authentication is distinct from server-side business authorization.
- Preview/development isolation and synthetic-data-only rules remain explicit.
- PostgreSQL PITR/restore, object lifecycle/deletion, queue retry/idempotency, PII-safe telemetry and owned alerts remain production gates.
- Security was not traded away for a trivial monthly saving; the preferred stack uses Neon Scale, Clerk Pro, managed S3 scanning, paid transactional email retention controls and paid error/log monitoring.
- The architecture remains one modular monolith with managed capabilities; Kubernetes, service mesh, Kafka, unnecessary microservices and self-administered ClamAV infrastructure were not introduced.
- This record proposes provider decisions; it does not create ADRs or adopt providers.

---

# Phase 0D2: Zero-Incremental-Cost Hostinger Revision

**Research date:** 2026-08-27
**Scope:** Replaces only the concrete provider strategy. The accepted server-first, default-deny, private-candidate-data, environment-isolation, state-separation and fail-closed principles remain unchanged. No account, credential, database, Google Cloud project, Drive folder, deployment, DNS setting, environment variable or application code was created.

## 30. Decision summary

Use the owner's existing **Hostinger Business Web or Cloud** hosting as the normal Node.js host, subject to confirming that the actual hPanel subscription exposes **Deploy Web App**. Use **Supabase Free** for the initial low-volume PostgreSQL system of record and staff authentication, and a dedicated existing company Google Drive account for private candidate documents. Use the application server, not browsers, to send candidate files to Drive. Use Hostinger storage/CDN for initial public media; Hostinger SMTP only when an already-paid mailbox exists, otherwise a reputable free transactional tier; Turnstile Free; Hostinger logs plus free Sentry and one free uptime check.

The resulting recurring incremental infrastructure cost is **£0/month** at the stated modest scale. It is a constrained MVP architecture, not a claim that free tiers offer paid-tier backup, support, uptime or recovery guarantees.

## 31. Hostinger-first findings

Hostinger's current support documentation states that managed Node.js web apps are available on **Business Web Hosting and every Cloud plan**. It lists Next.js as a supported backend framework, supports Node 18, 20, 22 and 24, GitHub deployments with automatic builds on push, uploaded source archives, hPanel environment variables, deployment logs/resource graphs and restart controls for server-side applications. Hostinger cron supports custom commands on UTC schedules; Premium and higher plans have unlimited cron jobs, but CPU and memory limits still apply.

Hostinger's public web-hosting page also advertises included CDN, SSL, backups and security controls, but plan names/features shown publicly and the Node.js eligibility page do not perfectly use the same plan labels. The actual owner subscription and hPanel capabilities are therefore the authority. Do not assume that a lower existing plan can run this application at no extra cost.

| Requirement | Phase 0D2 position |
| --- | --- |
| Next.js App Router, React Server Components, SSR, route handlers and server actions | Normal Node.js Next.js deployment is the intended portable mode. Hostinger confirms Next.js server-side support, but an implementation spike must prove the selected exact Next.js release, App Router build, Server Actions and route handlers on the owner's plan. |
| ISR/revalidation | Do not promise it from generic framework support. Test cache persistence, on-demand revalidation and deploy invalidation before relying on ISR for mutable public pages. Safe fallback: short server-rendered cache headers or explicit rebuild/publish. |
| GitHub deployment/environment variables/logs/health | Supported through hPanel web-app controls. Expose a coarse health endpoint; never put candidate or database details in it. |
| Scheduled work | Use one Hostinger UTC cron to invoke a protected, idempotent application worker route. Confirm the exact authenticated invocation mechanism before implementation; do not put database credentials in a cron command. |
| Background processes | No separate continuously running worker is assumed. Keep work bounded and claimed from PostgreSQL by the cron-triggered application route. |
| Uploads | Browser uploads terminate at the application server, which validates and streams to Drive. This is deliberate: Drive credentials never reach a browser. |
| CDN, SSL, WAF, backups | Use included SSL and public-media CDN only after plan verification. Treat Hostinger network protections as supplemental; server authorization, validation and Turnstile remain mandatory. Hostinger website backups do not back up the external PostgreSQL database or Drive files. |

Avoid Vercel-only APIs and operational assumptions: no Vercel Edge Functions, Blob, KV, Cron, runtime-specific middleware behaviour or proprietary image pipeline. The application must run via ordinary `next build`/`next start` semantics.

Official references: [Hostinger Node.js options](https://www.hostinger.com/support/node-js-hosting-options-at-hostinger/), [Hostinger Node.js web-app deployment](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/), [Hostinger cron](https://www.hostinger.com/support/1583465-how-to-set-up-a-cron-job-at-hostinger/), [Hostinger cron limits](https://www.hostinger.com/support/1583765-how-many-cron-jobs-can-you-set-up-in-hostinger/), [Hostinger web-hosting plans](https://www.hostinger.com/web-hosting).

## 32. Phase 0D1 services reassessed

| Phase 0D1 service | Classification | Phase 0D2 reasoning |
| --- | --- | --- |
| Vercel Pro | **REMOVE** | Existing Hostinger is the required host and now supports the portable Node.js deployment needed here. |
| Neon Scale | **PAID FALLBACK ONLY** | Neon Free is credible for a small prototype but has 0.5 GB storage, 100 CU-hours/project/month, five-minute scale-to-zero and only six-hour restore history. Use a paid PostgreSQL tier only when the free recovery/availability limits become unacceptable. |
| Clerk Pro | **REMOVE** | Clerk Hobby lacks MFA. Supabase Free includes basic TOTP MFA and avoids a separate identity vendor; an existing managed workforce IdP with Auth.js/OIDC remains an alternative. |
| Cloudflare R2 | **FREE-TIER ONLY** | Optional future public-media offload; it is not required while Hostinger storage/CDN meets the modest portfolio requirement. Do not store candidate files in R2. |
| AWS S3 | **PAID FALLBACK ONLY** | Replaced initially by the existing private Drive arrangement. Reconsider with a managed scanner or stronger object lifecycle/audit requirement. |
| GuardDuty Malware Protection | **PAID FALLBACK ONLY** | Credible managed scanner, but not adopted silently. Its absence means documents remain unavailable under the current fail-closed policy. |
| QStash | **REMOVE** | A PostgreSQL job table and a single Hostinger cron are sufficient at this volume. |
| Upstash Redis | **REMOVE** | PostgreSQL is authoritative for idempotency and low-rate persistent submission limits; an in-process prefilter is only supplemental. |
| Postmark Pro | **PAID FALLBACK ONLY** | Use an already-paid Hostinger mailbox SMTP if available, otherwise a sustainable free transactional tier. Escalate only when its delivery, volume or audit needs require it. |
| Cloudflare Turnstile | **FREE-TIER ONLY** | Retain the production Free plan with server-side Siteverify, action/hostname checks and layered server controls. |
| Sentry Team | **FREE-TIER ONLY** | Use the free tier only for scrubbed errors at low volume; Hostinger logs and database audit records remain authoritative. |
| Better Stack | **FREE-TIER ONLY** | Use one free external health/uptime check only if its current free allowance fits. It is not a log store or source of truth. |

## 33. Zero-cost database and staff identity

### Compared free PostgreSQL choices

| Provider | Current free capacity and behaviour | Suitability |
| --- | --- | --- |
| Neon Free | 0.5 GB/project, 100 CU-hours/project/month, 5 GB public transfer, five-minute mandatory scale-to-zero, one manual snapshot and six-hour instant-restore history. Singapore is available; the project region cannot later be changed. Standard PostgreSQL and Prisma are supported. | Portable and viable for synthetic/low-risk use, but a cold start and six-hour recovery window make it the weaker initial choice when staff authentication must share the same operational database. |
| Supabase Free | 500 MB PostgreSQL, shared CPU/500 MB RAM, 5 GB egress, two active projects, one-week inactivity pausing, no automatic backups/PITR, basic MFA, 1 GB Storage and community support. Prisma can connect through the normal PostgreSQL connection options. Singapore and Mumbai (`ap-south-1`) are available regions. | **Preferred at £0.** It consolidates standard PostgreSQL and TOTP-capable staff authentication without placing candidate files in Supabase Storage. The pause and backup limits are real operational constraints. |

No third free PostgreSQL provider adds a material advantage for this low-volume, Hostinger-first design, so none is adopted.

### Recommendation and limitations

Choose **Supabase Free in Mumbai** for the initial database/auth project, subject to an owner-approved privacy/legal assessment of the selected region and a measured Hostinger-to-Supabase connection test. Mumbai is selected for likely Pakistan latency; it is not a legal-residency conclusion. Use Prisma with a pooled runtime connection and a direct migration connection where the selected Supabase connection configuration requires it.

The free plan is genuinely £0 rather than a temporary trial, but it is explicitly marketed for simple sites and pauses after one week of inactivity. It has no automatic backups or point-in-time recovery. A daily application/health cron should not be used to disguise an unavailable system as a production guarantee. Candidate/admin operations fail closed during a pause or outage and display no ambiguous success.

Before production candidate intake, the owner must accept: (1) the one-week-pause risk, (2) no provider-managed backup/PITR, and (3) a named operator for encrypted logical exports and restore testing. If any is unacceptable, use a paid PostgreSQL plan as the first paid escalation.

Official references: [Neon plans](https://neon.com/docs/introduction/plans), [Neon regions](https://neon.com/docs/introduction/regions), [Supabase pricing](https://supabase.com/pricing), [Supabase regions](https://supabase.com/docs/guides/platform/regions), [Supabase Prisma integration](https://supabase.com/partners/integrations/prisma).

## 34. Google Drive candidate-document architecture

### Selected flow

```text
Candidate browser
  -> validated PDF form submission to Hostinger application
  -> bounded server-side validation and streaming upload
  -> private Google Drive recruitment folder
  -> PostgreSQL CandidateFile record: Drive file ID, checksum, byte size,
     technical state, hiring state and retention state
  -> server-authorized attachment download only when a future approved
     clean/review state allows it
```

Applicants need no Google account. No candidate receives a Drive URL. The browser never receives a Drive access token, OAuth client secret, refresh token or service-account key. The application uses a confidential OAuth web-server client with **offline access** authorized once by a dedicated company-owned Google account. Store the refresh token only as a server-side environment secret, restrict hPanel access and scope the integration to the smallest practical Drive scope, initially `drive.file`, with folders/files created by the application.

Use a purpose-limited existing company account, not a personal staff account. Create the conceptual private hierarchy under `Pyramid Designs Recruitment/`:

```text
quarantine-pending/
reviewable-clean/       (empty until a scanner process is approved)
rejected-invalid/
archived/
```

Folder placement is operational organisation only. PostgreSQL is authoritative for technical validation/scan state, candidate identity, hiring state, retention/deletion and audit state. Names on Drive use generated opaque IDs plus a `.pdf` extension; no name, email, phone or job title belongs in an object name.

### OAuth versus service account

| Approach | Result |
| --- | --- |
| Dedicated company account + OAuth refresh token | **Preferred.** Works with ordinary existing My Drive storage, makes that account the owner and keeps general staff out of Drive. Requires secure refresh-token storage, owner MFA/recovery and a documented transfer/exit procedure. |
| Service account + Shared Drive | Use only if the owner already has suitable Workspace Shared Drive capacity. Google states service accounts have no Drive storage quota and cannot own files; they must upload to a Shared Drive or act through OAuth on behalf of a human user. Members of a Shared Drive can access all its content at their role level, so do not add hiring staff merely for convenience. |

Drive API standard use is currently no additional cost. As of the current Google documentation, API calls are quota-limited and Google plans potential charges for usage over a future daily threshold with at least 90 days' notice. The stated candidate volume is far below the published per-minute and daily limits, but Drive storage itself must fit the owner's existing account; exceeding that storage is a paid escalation, not an invisible architectural assumption.

### Staff access options

| Option | Security and operations | Decision |
| --- | --- | --- |
| A. Application server streams/downloads after fresh authorization | The app checks active identity, role, state, retention and scope; records every grant/denial; responds as attachment and never reveals a permanent Drive URL. General staff have no Drive membership. | **Preferred.** One authorization model and no Drive permission drift. |
| B. Grant Drive access to authorised staff | Creates a second, broad access-control surface. Shared Drive membership can bypass application role/state checks and exported links are harder to audit/revoke. | Do not use for MVP. Consider only when a separately approved operational requirement outweighs the weaker application control. |

Drive risks and recovery: OAuth credential compromise, accidental link sharing, staff Drive membership drift, owner-account loss, API quota/failure, Drive trash/deletion behaviour and application/Drive deletion mismatch are all recorded in the threat model. The account must disable public/`anyoneWithLink` sharing; the application must periodically reconcile Drive IDs/state and never treat Drive folder names or links as the authority.

Official references: [Drive API authentication/scopes](https://developers.google.com/workspace/drive/api/guides/about-auth), [OAuth web-server flow](https://developers.google.com/identity/protocols/oauth2/web-server), [Shared Drives and service accounts](https://developers.google.com/workspace/drive/api/guides/about-shareddrives), [Drive usage limits and pricing](https://developers.google.com/workspace/drive/api/guides/limits).

## 35. File policy and malware residual risk

The MVP file allowlist is **one PDF up to 5 MB** per application. The limit and allowlist remain policy/configuration values, not hard-coded business assumptions. The application must enforce all of the following before a Drive upload:

- extension exactly `.pdf`;
- declared MIME exactly `application/pdf`, treated only as a hint;
- PDF magic header (`%PDF-`) from the received bytes;
- bounded stream/known content length at or below 5 MB;
- generated opaque filename; and
- rejection of empty files, archives, executables, scripts, macro-enabled documents and every non-PDF format.

DOCX is deferred: it adds macro/container parsing and scanning obligations without an MVP need. A PDF may still contain malicious or exploit-bearing content. MIME, extension and magic-byte validation are **not malware scanning**.

No credible £0 automated malware scanner is evidenced for Hostinger's managed Node.js runtime. Hostinger's dependency-vulnerability feature is not a candidate-file scanner, and its managed environment does not establish a supported ClamAV installation/definition-update/health model. Candidate documents must therefore remain `QUARANTINED_UNSCANNED` and unavailable under the accepted fail-closed rule. The public CV-upload feature stays disabled until one of these is explicitly approved:

1. a paid managed scanner such as GuardDuty Malware Protection with private object storage; or
2. a documented, owner-approved manual scanning procedure on a managed endpoint, including who may retrieve a quarantined attachment, which trusted endpoint protection scans it, how a clean result is independently recorded, and how the residual risk is accepted.

This is the central Phase 0D2 issue. It preserves the security control rather than quietly claiming that £0 validation removes malware risk.

## 36. Authentication and authorization

Use **Supabase Auth Free** for staff-only identity with basic TOTP MFA required for every privileged staff member. No candidate account is created. Store the external authentication subject on a local staff record and retain all Pyramid roles and scope decisions in PostgreSQL: `CONTENT_EDITOR`, `HIRING_REVIEWER`, `HIRING_MANAGER`, `ADMIN`, `AUDITOR`; default deny continues.

Clerk Hobby is not selected because current pricing puts MFA on Pro. Auth.js/OIDC is the preferred alternative only if the owner already operates a Google Workspace or Microsoft Entra workforce identity with enforced MFA, prompt offboarding and named administrators. Do not add local password storage, custom MFA or custom cryptography to avoid a provider fee.

Free identity-tier limits, recovery, session revocation and offboarding must be tested before real staff access. The application still verifies identity and authorization server-side on each sensitive read, mutation and candidate-document action.

Official references: [Supabase pricing and basic MFA](https://supabase.com/pricing), [Supabase MFA](https://supabase.com/docs/guides/auth/auth-mfa), [Clerk pricing](https://clerk.com/pricing), [Auth.js](https://authjs.dev/).

## 37. Jobs, abuse protection and idempotency

Use one PostgreSQL `Job` table with opaque payload IDs, `runAt`, attempt count, bounded retry metadata, terminal state and claim/lock fields. A single Hostinger cron invokes a protected worker route; each invocation claims a small batch transactionally, uses `SKIP LOCKED`-style semantics or an equivalent atomic lease, executes idempotently and releases/records the outcome. It covers email retry, retention/deletion, stale-submission cleanup and Drive reconciliation. The queue is not the source of truth and no Redis is required.

Future managed-queue trigger: sustained cron overlap, jobs repeatedly exceeding the Hostinger request/resource limits, more than one worker instance, a strict delivery-latency SLA, or a measured retry/backlog problem.

Abuse controls remain layered:

- Turnstile Free is verified server-side with expected action/hostname;
- honeypot, minimum completion time, origin checks and generic failures run before expensive work;
- small in-process short-window counters reduce single-instance floods but are never the distributed authority;
- PostgreSQL records persistent limits only for submission/upload-intent attempts after cheap controls, using a short-lived keyed hash rather than raw PII; and
- unique constraints, transactions and a server-issued opaque idempotency key prevent duplicate durable submissions.

Hostinger/WAF controls, where the confirmed plan exposes them, are supplemental only. If the application later runs multiple instances, in-memory limits become weaker; PostgreSQL limits and Turnstile remain effective, and a managed rate store becomes a paid-fallback trigger.

## 38. Email, monitoring, media and recovery

| Area | Initial zero-cost position | Escalation trigger |
| --- | --- | --- |
| Transactional email | Use existing Hostinger business-mailbox SMTP only when the owner already has an active mailbox and authenticated domain. Otherwise use a reputable free transactional tier such as Resend Free within its current 3,000/month and 100/day allowance. Send only a reference and operational text—never CVs, answers or Drive links. Configure SPF, DKIM and DMARC. | Existing mailbox unavailable, sustained delivery/bounce issue, volume beyond free allowance, or required retention/audit controls. |
| Errors/logs | Hostinger deployment/runtime logs and resource graphs; Sentry Free for aggressively scrubbed errors only. Application/database audit records remain separate and append-only. | Free event/retention limits, need team alerting/log search, or privacy/compliance needs exceed its controls. |
| Uptime | One free external health check plus a coarse `/api/health` endpoint. It exposes no dependency names, regions, credentials or candidate data. | Need multiple monitors, incident escalation/on-call integration or independent durable job heartbeat monitoring. |
| Portfolio media | Optimized approved assets on Hostinger storage/CDN initially. Keep source/derivative recipes in the CMS/application records. | Storage/bandwidth/performance measurement shows Hostinger is insufficient; first offload is R2 Free within its allowance, then paid R2 or a media service only when measured. |
| PostgreSQL recovery | Named operator makes encrypted logical exports before migrations and at an owner-approved cadence; store them privately, retain a restoration ledger and rehearse restore into a non-production environment. | Owner requires automated backups/PITR, free-tier pause/recovery becomes unacceptable, or data volume/cadence makes manual exports unsafe. |
| Drive recovery | PostgreSQL remains authoritative; use Drive's private trash/version behaviours only as a convenience, not the retention policy. Reconcile file IDs, record deletion requests, and test restore/deletion replay before exposure. | Drive storage, account ownership, retention/legal hold or recovery requirements exceed an existing account's capabilities. |

Free tiers are not trials in this plan. Existing Hostinger/domain/mailbox costs are excluded from the incremental calculation. Some services may require account/identity verification; no automatic paid overage is assumed, and any plan that enables overage billing must have a zero/strict spend control where available.

## 39. Simplified stack options

| Option | Stack | Incremental cost | Strengths | Material limitation |
| --- | --- | ---: | --- | --- |
| A | Hostinger + **Supabase Free** (PostgreSQL/Auth/TOTP) + private Google Drive + Turnstile + Hostinger SMTP/Resend Free | **£0** | Fewest new providers; Mumbai option; standard PostgreSQL; MFA at no extra charge. | One-week pause, no automatic database backup/PITR; scanner remains unresolved. |
| B | Hostinger + Neon Free + Auth.js with an already-owned workforce IdP + private Google Drive + Turnstile | **£0** | Strong PostgreSQL portability and low application lock-in if an MFA-enforced workforce IdP already exists. | 0.5 GB/100 CU-hours/mandatory cold sleep/six-hour history; requires a confirmed existing IdP. |
| C | Hostinger + Supabase Free PostgreSQL + Clerk Hobby + private Google Drive + Turnstile | **£0** | Familiar identity UX and PostgreSQL portability. | Clerk Hobby has no MFA, so it fails the privileged-staff security requirement. Not recommended. |

**Preferred: Option A.** It best uses existing Hostinger investment, keeps new recurring spend at £0, avoids unnecessary infrastructure, preserves standard PostgreSQL portability and offers a free TOTP MFA route. It is accepted only as a low-volume architecture with explicit database-recovery and malware-scanning gates; it does not authorise real candidate CV intake by itself.

## 40. Cost ceiling and future triggers

| Component | Initial recurring incremental cost | Cost type |
| --- | ---: | --- |
| Existing Hostinger Node.js hosting, SSL, CDN, cron and logs | £0 incremental | Existing paid service; exact qualifying plan must be confirmed. |
| Supabase Free PostgreSQL/Auth | £0 | Genuine free tier; not a trial; pauses after one inactive week and has no automatic backups. |
| Google Drive API and existing Drive storage | £0 incremental | Standard API use currently has no extra cost; existing account storage must be sufficient. |
| Candidate malware scanner | £0 | **Not adopted.** Candidate CV intake remains fail-closed pending an approved scanner/manual process. |
| Turnstile Free | £0 | Free tier. |
| Email | £0 incremental | Existing mailbox if already paid; otherwise a free tier within its published allowance. |
| Error/uptime monitoring | £0 | Free tiers only; scrubbed telemetry. |
| Public portfolio media | £0 incremental | Existing Hostinger allocation; R2 Free is optional future offload. |
| Jobs/rate limiting/idempotency | £0 | PostgreSQL plus Hostinger cron; no managed queue/Redis. |
| **Expected incremental monthly infrastructure** | **£0** | Excludes existing Hostinger/domain/productivity-suite charges and any owner-approved escalation. |

Reconsider the free architecture only on evidence: database approaches 400 MB; provider pauses/cold starts cause an operational failure; monthly applications exceed roughly 100–300 or cron work starts overlapping; candidate/public media exhausts existing Drive/Hostinger allocation; delivery exceeds a free email allowance; persistent abuse makes PostgreSQL limits costly; free monitoring retention/alerts are insufficient; more staff need concurrency/audit controls; a legal/security requirement mandates managed backups/PITR or automated malware scanning.

## 41. Owner, legal and implementation gates

1. Confirm the owner's Hostinger subscription is Business Web or Cloud and exposes the Node.js Web App facility without an incremental upgrade.
2. Confirm the legal entity, candidate-data jurisdiction/cross-border notice, Drive account ownership/recovery contacts, retention/deletion/legal-hold policy and approved privacy contact.
3. Accept or reject the Supabase Free pause/no-PITR recovery risk and name the encrypted-export/restore-test owner.
4. Decide whether candidate document intake remains disabled until a paid scanner, or approve a detailed manual scanning procedure and its residual risk. No document may be treated as clean without one.
5. Confirm an existing Hostinger business mailbox or select a free transactional-email account; approve sender domain/SPF/DKIM/DMARC and alert ownership.
6. Before implementation, prove Hostinger's exact Next.js App Router/SSR/route-handler/Server Action/ISR behaviour, cron authentication path, Supabase connection behaviour, non-public Drive permissions and server-only credentials with synthetic data.

## 42. Phase 0D2 verification

- The adopted MVP services show £0 incremental recurring cost; paid products are recorded solely as fallbacks.
- Hostinger is the production direction subject to the verified plan gate, not Vercel.
- Applicants need no Google account; Drive credentials remain server-only; candidate files have no public links and staff do not receive Drive membership in the preferred access model.
- Default-deny server authorization, environment isolation, PostgreSQL state/idempotency, private candidate data and fail-closed processing remain mandatory.
- The absence of a free credible malware scanner is stated as residual risk; it is not hidden behind MIME/magic-byte checks.
- Scaling and paid escalation triggers are explicit, and no provider account/resource was created.

Phase 0E data modelling may proceed under the owner/reviewer approval recorded on 2026-08-27. Candidate-document implementation remains separately gated until the named manual-review operator, managed endpoint/tool, detailed procedure, residual-risk acceptance, and logical-backup/restore procedure are documented and verified.

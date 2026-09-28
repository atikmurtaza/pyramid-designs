# Phase 2I-C2B: Resend adapter and bounded synthetic verification

## Status and isolation

**Implementation and bounded live provider verification passed. EMAIL PROVIDER FOUNDATION READY; production deployment and intake remain unauthorized.**

Authorized baseline: `b6d0460eb1267603f87a5e65b78e7610e43d08fb`, `feat: add transactional email foundation`.
Work is isolated on `phase/2ic2b-resend` in the Codex-managed worktree outside the primary checkout.
The primary `feat/frontend-redesign` checkout at `108200b3ea981957ba2683a8c050db7adba2ef42` and its unrelated frontend/Neon work are preserved. No files or environment configuration were imported from that work.

MIGRATION REQUIRED: NO

NEW DEPENDENCY REQUIRED: NO

The nine committed migrations, Prisma schema, dependencies and lockfile remain unchanged. Native server-side `fetch` implements the transport. No Resend SDK, webhook route, webhook secret, staff email, abuse controls, scheduler configuration, production migration, deployment, DNS or intake activation is included.

## Provider decision and external readiness

The owner approved Resend with verified sending domain `mail.pyramiddesigns.co`, sender `Pyramid Designs <applications@mail.pyramiddesigns.co>`, fixed Reply-To `contact@pyramiddesigns.co`, and one live synthetic recipient `contact@pyramiddesigns.co`. The private runtime key must have Sending access only, restricted to that domain. Do not broaden its permissions for dashboard retrieval.

Receiving, open tracking and click tracking are owner-confirmed OFF. Dashboard/domain state, domain ownership, key scope and tracking remain external owner-controlled configuration; code validation cannot independently establish those facts. The adapter contains no HTML, images, tracking parameters, URLs, tags, attachments, CC/BCC, scheduling or candidate interpolation.

Current provider documentation reviewed 2026-09-28:

- [Send email](https://resend.com/docs/api-reference/emails/send-email): fixed POST endpoint, plain text and Reply-To, successful response containing an email ID (documented example is UUID-shaped).
- [Errors](https://resend.com/docs/api-reference/errors): named errors and corresponding HTTP statuses.
- [Idempotency keys](https://resend.com/docs/dashboard/emails/idempotency-keys): exact same request/key returns the original result without another send, for 24 hours; payload and concurrent-request conflicts are distinct 409 errors.
- [Usage limits](https://resend.com/docs/api-reference/rate-limit): `retry-after` and `ratelimit-reset` are integer seconds until retry/reset; quotas are separate from request rate limits.

Provider acceptance does not establish inbox delivery, reading, opening or exactly-once delivery. The live rehearsal returned a validated UUIDv7 receipt, recorded below.

## Configuration contract

Create `.env.local` directly in the isolated worktree. Do not copy the primary environment file or paste credentials into chat.

| Variable | Required value |
| --- | --- |
| `EMAIL_PROVIDER` | `resend` |
| `RESEND_API_KEY` | Private Sending-only key, restricted to `mail.pyramiddesigns.co` |
| `EMAIL_FROM_ADDRESS` | `applications@mail.pyramiddesigns.co` |
| `EMAIL_FROM_NAME` | `Pyramid Designs` |
| `EMAIL_REPLY_TO_MODE` | `fixed` |
| `EMAIL_REPLY_TO_ADDRESS` | `contact@pyramiddesigns.co` |
| `PHASE2IC2B_LIVE_RECIPIENT` | `contact@pyramiddesigns.co` (local rehearsal only) |

Provider selection is explicit. Missing/unknown provider, missing or malformed key, unknown NODE_ENV, incorrect sender/name, missing Reply-To mode or incorrect Reply-To fails closed. Key presence alone never selects Resend. Sender and Reply-To configuration must match the exact approved identities; they cannot be changed through an envelope or candidate input.

`EMAIL_PROVIDER_CONFIGURED` means local configuration passed validation, not provider authentication, delivery, or production readiness. Invalid configuration reports `EMAIL_CONFIGURATION_UNAVAILABLE` and selects the unavailable adapter. Normal test workers require explicit adapter injection even when private local provider configuration exists. The synthetic adapter remains test-only, separately injected, and unavailable in production.

## Request, response and provider-neutral result

Only `https://api.resend.com/emails` is callable, using POST, rejected redirects, JSON Content-Type, explicit User-Agent, Bearer authorization, the original 64-character lowercase hexadecimal identity as `Idempotency-Key`, and the caller's bounded AbortSignal. There is one fetch call and no adapter retry. Normal worker deadlines, lease fencing, attempt bounds and no database connection over external I/O remain intact.

The body contains exactly fixed `from`, one authoritative `to`, fixed `subject`, fixed plain `text`, and fixed `reply_to`. Existing event/version templates remain unchanged. The adapter revalidates the entire envelope shape and rendered content before transmitting. It never receives an application UUID, candidate name, answers, CV, Drive metadata, security-review data or staff data.

The domain accepts existing synthetic outcome strings or a narrow provider-neutral `{ outcome, receipt?, retryAfterSeconds? }` result. Only bounded JSON with HTTP 200 and exactly one valid UUID-shaped `id` establishes provider acceptance. This conservative UUID allowlist follows the documented example and was confirmed against the actual UUIDv7 live receipt. Unexpected formats, contradictory fields, duplicate JSON keys (including escaped spellings), invalid UTF-8, malformed JSON and unknown responses remain ambiguous. Response bodies are streamed with a 16 KiB application limit; both declared size and actual bytes are checked. No raw provider errors or response bodies are logged or stored.

## Failure and retry behavior

| Evidence | Outcome and treatment |
| --- | --- |
| Aborted before fetch invocation | Known no transmission; `RETRYABLE_FAILURE` |
| DNS/connect-looking exception without portable proof of transmission state | Ambiguous; native fetch cause strings are not a sufficient guarantee |
| Generic network exception, in-flight abort, timeout, malformed/unrecognized response, provider 5xx | `AMBIGUOUS_ACCEPTANCE`; unresolved/manual |
| Exact recognized invalid-recipient validation message | `DEFINITE_REJECTION` / `EMAIL_RECIPIENT` |
| Named malformed request, sender/domain validation or quota rejection | `CONFIG_FAILURE`; terminal operator handling |
| Named authentication/permission/key rejection | `AUTH_FAILURE` / `EMAIL_AUTH`; terminal |
| `concurrent_idempotent_requests` or `invalid_idempotent_request` | Ambiguous earlier/current effect; no automatic retry, new key or replacement message |
| Named 429 `rate_limit_exceeded` | `RATE_LIMIT`, only with valid bounded delay metadata |
| Valid receipt | `ACCEPTED`; atomic real-provider acceptance audit and fenced job completion |

The normalized configuration outcome deliberately groups request, sender/domain and quota failures; raw error text is never persisted to distinguish them. HTTP status alone never establishes rejection. Known named error responses must have consistent status/schema and no extra fields.

Both delay headers accept only non-negative integer seconds up to 3,600. When both exist, use the larger delay. Missing headers retain existing backoff. Invalid or longer delays require operator handling instead of truncation. Scheduling uses the maximum of the provider delay and existing exponential backoff, with unchanged maxAttempts. Every definitely unaccepted attempt records matching resolution evidence atomically with its retry/terminal transition.

## Identity, request seal and audit

Logical identity remains SHA-256 over the existing environment/domain, application identity, semantic event and candidate slot. It excludes email address, candidate name and template version. No new key is minted after conflict or ambiguity.

Each real send intent includes attempt, fixed provider identifier and a keyed SHA-256 request commitment. The commitment binds the existing identity, environment, endpoint and exact serialized request using the private key as the HMAC key. This avoids retaining the recipient/body or an unkeyed contact hash. Changed key/account context, sender/configuration, recipient or template fails closed. All prior intents must match, including resolved attempts; legacy C1 intents without a provider request commitment cannot be replayed as a real provider request.

`NOTIFICATION_PROVIDER_ACCEPTED` is distinct from `NOTIFICATION_SYNTHETIC_ACCEPTED`. Its safe metadata contains only provider, validated opaque receipt, event, template version and attempt, with existing job/identity correlation. Provider acceptance and fenced completion commit in one transaction. A failed acknowledgement leaves the durable intent unresolved. No receipt is returned through the public intake or worker response.

## Minimum controlled reconciliation

There is no public endpoint, arbitrary resend API, job-ID replay CLI, scheduled ambiguous retry or cross-process recovery mechanism.

The bounded local rehearsal explicitly requests an opaque, in-memory, one-use permit after a provider call has settled with validated ACCEPTED but its acknowledgement transaction fails. Normal worker execution never requests or consumes a permit. The permit binds the original job, adapter, receipt and request commitment. It stores no recipient or message body. It is consumed synchronously before acquiring a new claim, so concurrent use cannot dispatch another replay. No permit is issued for a pending/timed-out call, generic ambiguity, or process crash. Those cases remain manual. This narrow same-process restriction proves the original invocation cannot initiate another transmission; an expired lease by itself does not prove that.

Replay can transfer only the settled invocation's own claim or an ambiguous terminal projection, never another active worker's claim. It consumes an ordinary attempt and never increases maxAttempts. The handler again checks the immutable schedule, durable unresolved intent, logical identity, application eligibility, authoritative recipient, deletion/retention state, provider/key/request commitment and receipt. No caller supplies the recipient, body or key.

Replay is forbidden at or after 23 hours from the earliest intent (conservatively including resolved attempts). A further ten-second reserve plus a monotonic pre-transmission cutoff prevents database/query delays from extending the window. A key rotation or lost process invalidates replay authority. Any later rejection cannot resolve the earlier accepted/unknown effect. A replay must return the exact original validated receipt before atomic acceptance/completion; another receipt or ambiguous outcome remains unresolved.

This deliberately does not provide general operational crash recovery. Production handling of those manual cases remains an operational gate. Do not reset jobs, delete audit evidence, reconstruct erased contact or change the idempotency key to work around it.

## Retention interaction

Existing application locks, active-claim checks and unresolved-intent guards remain authoritative. Retention cannot erase contact while a send/replay is active or a possible effect is unresolved. If expiry or deletion wins admission, replay is suppressed. Completed legitimate tombstones cannot recover contact from history. Receipt/audit evidence contains no recipient or body. Legal handling of delayed erasure and retained opaque evidence remains separately owner-gated.

## Offline verification

Verification uses fresh empty loopback-only `phase2ib_...` databases with all nine committed migrations. No configured development/production database or primary environment is used. The focused adapter suite replaces global fetch before importing the implementation and reports zero live requests.

Observed on 2026-09-28:

| Gate | Result |
| --- | --- |
| Disposable migration replay/security | 9 migrations; 28/28 RLS tables; zero policies, prohibited effective table grants and callable public application functions |
| Phase 2B / 2C / 2D / 2E / 2F | Existing success markers passed under Node 22.22.0 |
| Phase 2G / 2H | 83 / 291 checks, rollback verified |
| Phase 2I-B / C1 | 431 / 230 checks |
| C2B focused suite | 250 checks; zero live requests; transport/schema limits, injection, errors/delays, duplicate fields, ambiguity, acknowledgement rollback, exact replay, changed context, cutoff, concurrency, stale claims, attempt exhaustion and actual retention/tombstone races |
| Prisma validation, lint, typecheck, production build, post-build typecheck | Passed locally |
| Full and production dependency audits | Zero vulnerabilities; no dependency change |
| Synthetic-key canary production build | 92 client files; zero key-canary occurrences in client files or build logs; post-build typecheck passed |
| Local production smoke | 31 checks; 92 client files scanned; public intake remains closed |
| Canonical logo | Baseline and LF-normalized SHA-256 `2c5d2042ef020aa7ad37ff92e6fd9c3407ef305102ee49da3b6900ff99ffe60c`; working-copy CRLF conversion explains the different raw filesystem hash |

The first regression runner used the machine's Node 24 and was rejected by the existing Node 22 guard. It was rerun under Node 22.22.0. A fresh Phase 2G database initially lacked its required baseline synthetic fixtures; seeding that disposable database corrected the setup. The smoke harness previously assumed `.env.local` and a probe secret; it now supports a missing file, uses synthetic probe credentials and explicitly disables live provider configuration in the spawned production process. No failed assertion was suppressed.

## Live rehearsal and release gate

`npm run test:phase2ic2b:live` is an explicitly invoked local tool, after owner configuration and offline gates. It requires a fresh disposable database through `PHASE2IB_TEST_DATABASE_URL` and reads only the email configuration contract from this worktree's `.env.local`. Runtime/database setup is controlled separately by the agent; do not add production database credentials.

The tool reserves an exclusive durable `tmp/phase2ic2b-live.json` marker before any provider send. An existing marker forbids reruns, including after a crash or uncertainty. It creates one clearly synthetic disposable application, sends one existing talent-network confirmation to the exact approved address, deliberately rolls back acknowledgement, proves ordinary recovery does not resend, and consumes its one-use permit for one same-key replay. The replay must return the same ID. It records safe receipt/timestamp/job/count evidence locally and in audit, never the key, contact, body or raw response. Two provider request attempts are the absolute budget. Do not remove the marker or create another context to retry an ambiguous rehearsal.

LIVE LOGICAL EMAILS AUTHORIZED: 1

LIVE LOGICAL EMAILS SENT: 1

IDEMPOTENT REPLAYS PERFORMED: 1

Owner configuration was confirmed privately in the isolated worktree. On 2026-09-28 at approximately 19:58:33 UTC (20:58:33 BST), Resend accepted the one authorized logical email and its identical replay returned the same receipt: `01a0e998-ff81-73fe-a7b4-85c6efb23698`. The safe job correlation is `3ed7b3b1-a9be-4dc0-94e1-a461396d5d34`. Authentication and the configured sender succeeded; the fixture and transport wrapper enforced the exact approved recipient and C1 talent-network template. No other recipient or logical message was sent.

The first accepted response was followed by intentional database acknowledgement rollback. The job stayed unresolved, and ordinary recovery made no second provider call. Controlled reconciliation then consumed the one-use permit, returned the same validated receipt, and atomically completed the job with one `NOTIFICATION_PROVIDER_ACCEPTED` audit event. The durable local marker records `PROVIDER_ACCEPTANCE_VERIFIED`, one logical email and one replay. It remains in place and prohibits another rehearsal run. No runtime key permissions were broadened and no provider dashboard was scraped.

OWNER MAILBOX CHECK REQUIRED. Expected From: `Pyramid Designs <applications@mail.pyramiddesigns.co>`; subject: `Your Pyramid Designs talent network submission`; approximately 20:58 BST on 2026-09-28; receipt above. Provider acceptance does not prove inbox delivery. Owner mailbox observation is separate from the automated release gate.

Pre-configuration checks scanned 13 changed/new C2B files with zero sensitive-pattern findings and proved all 236 primary tracked/non-ignored untracked file hashes unchanged. On resumption, the isolated private `.env.local` was present, ignored and untracked; staging was empty; primary branch/HEAD/status and file hashes remained unchanged; C2B HEAD, origin/main and actual remote main still equalled the approved baseline. No primary secrets were read or copied. The final release records scans of the private key against staged content, build outputs, logs and safe live audit evidence without printing the key.

The separate final review pass covered secret and provider isolation, hidden retries, ambiguity, key reuse, request drift, response bounds, audit atomicity, replay expiry/ownership and retention. It found one test-isolation issue: the C1 readiness assertion would inherit newly configured local email selection. C1 now explicitly clears provider selection/key before loading fixtures and was rerun offline. No runtime or live-request change was needed. The review confirmed no schema/dependency, webhook, staff-email, abuse-control, deployment or intake scope expansion. General crashed-worker reconciliation remains deliberately manual, as described above.

Release verification after private configuration and the live rehearsal: lint, typecheck, production build with the isolated `.env.local`, post-build typecheck and production smoke passed. C1 passed 230 checks and C2B passed 250 offline checks. Exact private-key scanning covered 326 changed/build/log/evidence files with zero occurrences outside the private configuration; safe live audit/job evidence contained no key, recipient, body or candidate name. Live database inspection confirmed SUCCEEDED, three job claims (initial attempt, suppressed ordinary recovery, controlled replay), one real-provider acceptance event and zero synthetic-acceptance events for the live job. Only two provider calls occurred. Both full and production dependency audits reported zero vulnerabilities.

## Remaining programme gates

Phase 2I-D abuse controls; trusted Hostinger proxy/IP decision; scheduler/deployed-runtime verification; live Google deletion/reconciliation/retention rehearsal; malware-review rehearsal; legal/privacy/retention approval; least-privilege production DB identity; production Auth/MFA/recovery/ownership; physical browser/device acceptance; diagnostic/synthetic cleanup; separately approved production migration/configuration, deployment and intake activation. Staff email and webhooks remain outside C2B.

Commit only after all blocking gates pass, exactly `feat: add Resend email provider`. Fetch and require remote main still at the approved baseline before a normal fast-forward `HEAD:main` push. If remote main moves, stop without automatic merge/rebase. Preserve both worktrees; no automatic cleanup or primary-branch synchronization.

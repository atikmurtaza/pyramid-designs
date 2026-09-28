import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { notificationFixtureDatabase } from "./phase-2ic2b-fixture.mjs";

process.env.NODE_ENV = "test";
// No real credential or network access: all fetches are replaced before imports.
const nativeFetch = globalThis.fetch;
let calls = 0, inspect = () => {}, response = () => Response.json({ id: receipt });
const receipt = "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794";
globalThis.fetch = async (url, init) => { calls++; inspect(url, init); return response(); };
const { configuredEmailAdapter, emailReadiness } = await import("../src/lib/server/resend-email.ts");
const mail = await import("../src/lib/server/candidate-notifications.ts");
const configuration = { EMAIL_PROVIDER: "resend", RESEND_API_KEY: `re_${"synthetic_not_a_credential".repeat(2)}`,
  EMAIL_FROM_ADDRESS: "applications@mail.pyramiddesigns.co", EMAIL_FROM_NAME: "Pyramid Designs",
  EMAIL_REPLY_TO_MODE: "fixed", EMAIL_REPLY_TO_ADDRESS: "contact@pyramiddesigns.co" };
Object.assign(process.env, configuration);
let checks = 0, context;
function check(actual, expected = true) { assert.deepEqual(actual, expected); checks++; }
async function rejects(work) { await assert.rejects(work); checks++; }
const envelope = Object.freeze({ recipient: "synthetic.c2b@example.invalid", event: "TALENT_NETWORK_SUBMITTED",
  templateVersion: 1, identity: "a".repeat(64), ...mail.renderNotification("TALENT_NETWORK_SUBMITTED", 1) });
const invoke = (adapter = configuredEmailAdapter(), e = envelope, signal = AbortSignal.timeout(1000)) => adapter.send(e, signal);
try {
  for (const name of Object.keys(configuration)) {
    delete process.env[name]; check(emailReadiness(), "EMAIL_CONFIGURATION_UNAVAILABLE"); check(configuredEmailAdapter().mode, "unavailable");
    process.env[name] = configuration[name];
  }
  for (const [name, value] of [["EMAIL_PROVIDER", "synthetic"], ["EMAIL_PROVIDER", "other"], ["EMAIL_FROM_ADDRESS", "x@example.invalid"],
    ["EMAIL_FROM_NAME", "Pyramid Designs\r\nBcc:x"], ["EMAIL_REPLY_TO_MODE", "none"], ["EMAIL_REPLY_TO_ADDRESS", "invalid"],
    ["RESEND_API_KEY", "re_invalid\r\nvalue"], ["NODE_ENV", "unknown"]]) {
    const old = process.env[name]; process.env[name] = value; check(emailReadiness(), "EMAIL_CONFIGURATION_UNAVAILABLE"); process.env[name] = old;
  }
  process.env.NODE_ENV = "production"; check(emailReadiness(), "EMAIL_PROVIDER_CONFIGURED"); process.env.NODE_ENV = "test";
  const adapter = configuredEmailAdapter();
  inspect = (url, init) => {
    check(url, "https://api.resend.com/emails"); check(init.method, "POST"); check(init.redirect, "error");
    check(init.headers["Idempotency-Key"], envelope.identity); check(init.signal instanceof AbortSignal);
    check(init.headers["Content-Type"], "application/json"); check(typeof init.headers["User-Agent"], "string");
    const body = JSON.parse(init.body);
    check(Object.keys(body).sort(), ["from", "reply_to", "subject", "text", "to"]);
    check(body.to, [envelope.recipient]); check(body.text, envelope.text); check(body.subject, envelope.subject);
    check(body.from, "Pyramid Designs <applications@mail.pyramiddesigns.co>"); check(body.reply_to, "contact@pyramiddesigns.co");
  };
  check(await invoke(adapter), { outcome: "ACCEPTED", receipt }); inspect = () => {};
  const fingerprint = adapter.requestFingerprint(envelope); check(/^[a-f0-9]{64}$/.test(fingerprint));
  check(adapter.requestFingerprint(envelope), fingerprint);
  check(adapter.requestFingerprint({ ...envelope, recipient: "changed@example.invalid" }) !== fingerprint);
  process.env.RESEND_API_KEY += "a"; check(adapter.requestFingerprint(envelope) !== fingerprint); Object.assign(process.env, configuration);
  for (const extra of [{ recipient: "x@example.invalid\r\nBcc:y@example.invalid" }, { recipient: "a@example.invalid,b@example.invalid" },
    { subject: "changed" }, { text: "changed" }, { identity: "raw-uuid" }, { templateVersion: 2 }, { html: "<p>no</p>" }, { reply_to: "x@example.invalid" }]) {
    const before = calls; check((await invoke(adapter, { ...envelope, ...extra })).outcome, "CONFIG_FAILURE"); check(calls, before);
  }
  const cancelled = AbortSignal.abort(); const beforeAbort = calls;
  check((await invoke(adapter, envelope, cancelled)).outcome, "RETRYABLE_FAILURE"); check(calls, beforeAbort);
  for (const [status, name, outcome] of [
    [400, "validation_error", "CONFIG_FAILURE"], [400, "invalid_idempotency_key", "CONFIG_FAILURE"],
    [401, "missing_api_key", "AUTH_FAILURE"], [401, "restricted_api_key", "AUTH_FAILURE"],
    [403, "invalid_permission", "AUTH_FAILURE"], [403, "restricted_api_key", "AUTH_FAILURE"],
    [403, "suspended_api_key", "AUTH_FAILURE"], [403, "validation_error", "CONFIG_FAILURE"],
    [409, "invalid_idempotent_request", "AMBIGUOUS_ACCEPTANCE"], [409, "concurrent_idempotent_requests", "AMBIGUOUS_ACCEPTANCE"],
    [422, "invalid_parameter", "CONFIG_FAILURE"], [422, "missing_required_field", "CONFIG_FAILURE"],
    [429, "daily_quota_exceeded", "CONFIG_FAILURE"], [429, "monthly_quota_exceeded", "CONFIG_FAILURE"],
    [429, "rate_limit_exceeded", "RATE_LIMIT"], [500, "application_error", "AMBIGUOUS_ACCEPTANCE"], [503, "service_unavailable", "AMBIGUOUS_ACCEPTANCE"],
    ...[400, 401, 403, 409, 422, 429, 500].map(s => [s, "unknown", "AMBIGUOUS_ACCEPTANCE"]),
  ]) {
    response = () => Response.json({ name, message: "synthetic raw error must not persist", statusCode: status }, { status });
    const before = calls; check((await invoke()).outcome, outcome); check(calls, before + 1);
  }
  response = () => Response.json({ name: "validation_error", message: "Invalid `to` field. The email address needs to follow the `email@example.com` or `Name <email@example.com>` format." }, { status: 400 });
  check((await invoke()).outcome, "DEFINITE_REJECTION");
  for (const [headers, expected] of [[{}, 0], [{ "retry-after": "300", "ratelimit-reset": "500" }, 500], [{ "retry-after": "3600" }, 3600],
    ...["3601", "-1", "1.5", "1e3", "Infinity", "Mon, 28 Sep 2026 10:00:00 GMT", "999999999999"].map(v => [{ "retry-after": v }, null])]) {
    response = () => Response.json({ name: "rate_limit_exceeded", message: "bounded" }, { status: 429, headers });
    const result = await invoke(); check(result.outcome, expected === null ? "CONFIG_FAILURE" : "RATE_LIMIT");
    if (expected !== null) check(result.retryAfterSeconds, expected);
  }
  for (const make of [() => Response.json({}), () => Response.json({ id: "x" }), () => Response.json({ id: "x".repeat(1024) }),
    () => Response.json({ id: receipt, error: "contradiction" }), () => Response.json({ id: receipt }, { status: 201 }),
    () => new Response(`{"id":"bad","id":"${receipt}"}`, { headers: { "content-type": "application/json" } }),
    () => new Response('{"name":"application_error","name":"rate_limit_exceeded","message":"duplicate"}', { status: 429, headers: { "content-type": "application/json" } }),
    () => Response.json([receipt]), () => new Response("not-json", { headers: { "content-type": "application/json" } }),
    () => new Response(" ".repeat(16385), { headers: { "content-type": "application/json" } }),
    () => Response.json({ id: receipt }, { headers: { "content-length": "16385" } }),
    () => new Response(new Uint8Array([0xff]), { headers: { "content-type": "application/json" } }),
    () => Response.json({ id: receipt }, { headers: { "content-type": "text/html" } }),
    () => Response.json({ name: "rate_limit_exceeded", message: "bad", statusCode: 400 }, { status: 429 }),
    () => { throw new TypeError("Synthetic network uncertainty"); },
    () => { throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ENOTFOUND" } }); },
    () => { throw new DOMException("Synthetic abort", "AbortError"); },
  ]) { response = make; check((await invoke()).outcome, "AMBIGUOUS_ACCEPTANCE"); }
  const timeout = new AbortController();
  response = () => new Promise((_, reject) => timeout.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true }));
  const pendingTimeout = invoke(adapter, envelope, timeout.signal); timeout.abort();
  check((await pendingTimeout).outcome, "AMBIGUOUS_ACCEPTANCE");
  response = () => Response.json({ id: receipt });
  context = await notificationFixtureDatabase();
  const { db, jobs, worker, fixture, claim, row, send, acknowledgementFault, expire } = context;
  let x = await fixture(), j = await claim(x.j.id);
  check(await send(j, adapter), "SUCCEEDED");
  const audit = (await db.query(`SELECT "safeMetadata" FROM public."AuditEvent" WHERE "targetId"=$1 AND "actionCode"='NOTIFICATION_PROVIDER_ACCEPTED'`, [j.id])).rows;
  check(audit.length, 1); check(audit[0].safeMetadata.receipt, receipt); check(audit[0].safeMetadata.provider, "resend");
  check((await db.query(`SELECT 1 FROM public."AuditEvent" WHERE "targetId"=$1 AND "actionCode"='NOTIFICATION_SYNTHETIC_ACCEPTED'`, [j.id])).rowCount, 0);
  // Definite rejection + later configuration/recipient drift cannot reuse the key.
  x = await fixture(); j = await claim(x.j.id);
  response = () => Response.json({ name: "rate_limit_exceeded", message: "bounded" }, { status: 429, headers: { "retry-after": "300" } });
  check(await send(j, adapter), "QUEUED");
  check((await row(j.id)).availableAt.getTime() - Date.now() > 295000);
  await db.query('UPDATE public."Application" SET "email"=$2 WHERE "id"=$1', [x.a.id, "changed@example.invalid"]);
  let before = calls; check(await send(await claim(j.id), adapter), "DEAD"); check(calls, before);
  response = () => Response.json({ id: receipt });
  // Acknowledgement rollback leaves no acceptance evidence. Ordinary recovery never sends.
  async function unresolved() {
    const x = await fixture(), j = await claim(x.j.id); let permit;
    await rejects(() => send(j, adapter, acknowledgementFault, p => { permit = p; }));
    check(Boolean(permit)); check((await row(j.id)).state, "RUNNING");
    check((await db.query(`SELECT 1 FROM public."AuditEvent" WHERE "targetId"=$1 AND "actionCode"='NOTIFICATION_PROVIDER_ACCEPTED'`, [j.id])).rowCount, 0);
    return { ...x, j, permit };
  }
  x = await unresolved(); await expire(x.j); before = calls;
  check(await send(await claim(x.j.id), adapter), "DEAD"); check(calls, before);
  check(await mail.reconcileCandidateConfirmation(x.permit, AbortSignal.timeout(1000), worker.workerTransaction), "SUCCEEDED");
  check(calls, before + 1);
  await rejects(() => mail.reconcileCandidateConfirmation(x.permit, AbortSignal.timeout(1000), worker.workerTransaction));
  // One-use capability prevents concurrent replay, even before claim acquisition.
  x = await unresolved(); before = calls;
  const outcomes = await Promise.allSettled([1, 2].map(() => mail.reconcileCandidateConfirmation(x.permit, AbortSignal.timeout(1000), worker.workerTransaction)));
  check(outcomes.filter(o => o.status === "fulfilled").length, 1); check(calls, before + 1);
  // Still inside the conservative window, exact request/key replays successfully.
  x = await unresolved(); before = calls;
  await db.query(`INSERT INTO public."AuditEvent"
    ("id","occurredAt","actorType","actionCode","targetType","targetId","outcome","correlationId","safeMetadata")
    SELECT $2,clock_timestamp()-interval '22 hours 59 minutes','SYSTEM',"actionCode","targetType","targetId","outcome","correlationId","safeMetadata"
    FROM public."AuditEvent" WHERE "targetId"=$1 AND "actionCode"='NOTIFICATION_SEND_INTENT' LIMIT 1`, [x.j.id, randomUUID()]);
  check(await mail.reconcileCandidateConfirmation(x.permit, AbortSignal.timeout(1000), worker.workerTransaction), "SUCCEEDED"); check(calls, before + 1);
  // Cutoff and drift failures preserve unresolved truth. Insert old synthetic audit
  // evidence rather than modifying append-only audit rows.
  for (const scenario of ["boundary", "expired", "key", "recipient", "due", "different-receipt", "rejected-replay"]) {
    x = await unresolved(); before = calls;
    if (["boundary", "expired"].includes(scenario)) await db.query(`INSERT INTO public."AuditEvent"
      ("id","occurredAt","actorType","actionCode","targetType","targetId","outcome","correlationId","safeMetadata")
      SELECT $2,clock_timestamp()-make_interval(secs=>$3),'SYSTEM',"actionCode","targetType","targetId","outcome","correlationId","safeMetadata"
      FROM public."AuditEvent" WHERE "targetId"=$1 AND "actionCode"='NOTIFICATION_SEND_INTENT' LIMIT 1`, [x.j.id, randomUUID(), scenario === "boundary" ? 82800 : 90000]);
    if (scenario === "key") process.env.RESEND_API_KEY += "a";
    if (scenario === "recipient") await db.query('UPDATE public."Application" SET "email"=$2 WHERE "id"=$1', [x.a.id, "changed@example.invalid"]);
    if (scenario === "due") await db.query(`UPDATE public."Application" SET "expiresAt"=clock_timestamp()-interval '1 day' WHERE "id"=$1`, [x.a.id]);
    if (scenario === "different-receipt") response = () => Response.json({ id: randomUUID() });
    if (scenario === "rejected-replay") response = () => Response.json({ name: "missing_api_key", message: "reject" }, { status: 401 });
    check(await mail.reconcileCandidateConfirmation(x.permit, AbortSignal.timeout(1000), worker.workerTransaction), "DEAD");
    check(calls, before + (["different-receipt", "rejected-replay"].includes(scenario) ? 1 : 0));
    Object.assign(process.env, configuration); response = () => Response.json({ id: receipt });
  }
  // No forged permit, no old active claim takeover, and no maxAttempts bypass.
  await rejects(() => mail.reconcileCandidateConfirmation({ kind: "notification-acknowledgement" }, AbortSignal.timeout(1000), worker.workerTransaction));
  x = await unresolved(); await expire(x.j); await claim(x.j.id); before = calls;
  await rejects(() => mail.reconcileCandidateConfirmation(x.permit, AbortSignal.timeout(1000), worker.workerTransaction)); check(calls, before);
  x = await unresolved(); await db.query('UPDATE public."BackgroundJob" SET "maxAttempts"="attemptCount" WHERE "id"=$1', [x.j.id]);
  before = calls; await rejects(() => mail.reconcileCandidateConfirmation(x.permit, AbortSignal.timeout(1000), worker.workerTransaction)); check(calls, before);
  // Retention cannot erase recipient while unresolved or while replay is admitted.
  x = await unresolved(); await db.query(`UPDATE public."Application" SET "expiresAt"=clock_timestamp()-interval '1 day' WHERE "id"=$1`, [x.a.id]);
  const retentionId = await jobs.enqueueBackgroundJob({ jobType: "APPLICATION_RETENTION_DELETE", applicationId: x.a.id,
    safePayload: { version: 1 }, dedupeKey: `application-retention:${x.a.id}` });
  await expire(x.j); await send(await claim(x.j.id), adapter);
  const retention = await claim(retentionId);
  await rejects(() => worker.deleteRetainedApplication(retention, {}));
  check((await db.query('SELECT "email" FROM public."Application" WHERE "id"=$1', [x.a.id])).rows[0].email, "synthetic.c2b@example.invalid");
  // Replay admission races retention: no erasure while the bounded replay is active.
  x = await unresolved();
  let entered, release;
  const started = new Promise(resolve => { entered = resolve; });
  const paused = new Promise(resolve => { release = resolve; });
  response = async () => { entered(); await paused; return Response.json({ id: receipt }); };
  const replaying = mail.reconcileCandidateConfirmation(x.permit, AbortSignal.timeout(10_000), worker.workerTransaction);
  await started;
  await db.query(`UPDATE public."Application" SET "expiresAt"=clock_timestamp()-interval '1 day' WHERE "id"=$1`, [x.a.id]);
  const raceRetentionId = await jobs.enqueueBackgroundJob({ jobType: "APPLICATION_RETENTION_DELETE", applicationId: x.a.id,
    safePayload: { version: 1 }, dedupeKey: `application-retention:${x.a.id}` });
  const raceRetention = await claim(raceRetentionId);
  await rejects(() => worker.deleteRetainedApplication(raceRetention, {}));
  release(); check(await replaying, "SUCCEEDED");
  await worker.deleteRetainedApplication(raceRetention, {});
  check((await db.query('SELECT "email" FROM public."Application" WHERE "id"=$1', [x.a.id])).rows[0].email, null);
  before = calls; await rejects(() => mail.reconcileCandidateConfirmation(x.permit, AbortSignal.timeout(1000), worker.workerTransaction)); check(calls, before);
  response = () => Response.json({ id: receipt });
  // An actual tombstone with no unresolved intent also suppresses the real adapter.
  x = await fixture(); await db.query(`UPDATE public."Application" SET "expiresAt"=clock_timestamp()-interval '1 day' WHERE "id"=$1`, [x.a.id]);
  const erasedRetentionId = await jobs.enqueueBackgroundJob({ jobType: "APPLICATION_RETENTION_DELETE", applicationId: x.a.id,
    safePayload: { version: 1 }, dedupeKey: `application-retention:${x.a.id}` });
  await worker.deleteRetainedApplication(await claim(erasedRetentionId), {});
  before = calls; check(await send(await claim(x.j.id), adapter), "DEAD"); check(calls, before);
  // Ordinary test dispatcher cannot select a real provider from ambient config.
  await db.query(`UPDATE public."BackgroundJob" SET "availableAt"='2099-01-01' WHERE "state"='QUEUED'`);
  x = await fixture(); before = calls;
  const dispatched = await worker.runBackgroundWorker();
  check(dispatched.admitted); check(calls, before); check((await row(x.j.id)).failureClass, "CONFIGURATION");
  const evidence = JSON.stringify((await db.query(`SELECT "safeMetadata", "reasonCode" FROM public."AuditEvent" WHERE "actionCode" LIKE 'NOTIFICATION_%'`)).rows);
  for (const forbidden of [configuration.RESEND_API_KEY, "@example.invalid", envelope.text, "synthetic raw error", "Authorization", "claimToken"]) check(!evidence.includes(forbidden));
  const source = await readFile(new URL("../src/lib/server/resend-email.ts", import.meta.url), "utf8");
  check(source.startsWith('import "server-only";')); check(!source.includes("NEXT_PUBLIC"));
  console.log(`PHASE_2IC2B_RESEND_OK checks=${checks} live_requests=0`);
} finally {
  globalThis.fetch = nativeFetch;
  if (context) await context.db.closeDatabasePool();
  for (const name of Object.keys(configuration)) delete process.env[name];
}

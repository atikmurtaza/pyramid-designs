import assert from "node:assert/strict";
import { installChallengeFixture, challengedFields } from "./phase-2ie-challenge-fixture.mjs";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import pg from "pg";
import { syntheticPdf } from "./phase-2h-synthetic-pdf.mjs";

const url = new URL(process.env.PHASE2IB_TEST_DATABASE_URL ?? "invalid:");
assert(["localhost", "127.0.0.1"].includes(url.hostname) && /^\/phase2ib_[a-z0-9_]+$/.test(url.pathname));
assert.equal(Number(process.versions.node.split(".")[0]), 22);
process.env.DATABASE_URL = url.href;
process.env.NODE_ENV = "test";
process.env.PUBLIC_INTAKE_MODE = "synthetic";
process.env.EMAIL_PROVIDER = "";
process.env.RESEND_API_KEY = "";
// Every HTTP request in this suite is intercepted before runtime imports.
const nativeFetch = globalThis.fetch;
installChallengeFixture();
const db = await import("../src/lib/server/database.ts");
const intake = await import("../src/lib/server/public-intake.ts");
const abuse = await import("../src/lib/server/intake-abuse.ts");
const policy = await import("../src/lib/server/candidate-file-policy.ts");
const files = await import("../src/lib/server/candidate-files.ts");
const challenge = await import("../src/lib/server/intake-challenge.ts");
const { phase2BFixtures: f } = await import("./seed-phase-2b-synthetic.mjs");
const { seedPhase2CSynthetic } = await import("./seed-phase-2c-synthetic.mjs");
const pool = new pg.Pool({ connectionString: url.href, max: 30 });
let checks = 0;
const check = (actual, expected = true) => { assert.deepEqual(actual, expected); checks++; };
const rejects = async fn => { await assert.rejects(fn); checks++; };
const fields = (extra = {}) => new URLSearchParams({ applicationType: "TALENT_NETWORK", departmentId: f.departmentId,
  engagementType: "PERMANENT_INTEREST", fullName: "Synthetic Abuse Verification", email: "synthetic.abuse@example.invalid",
  city: "Synthetic City", experienceLevel: "SYNTHETIC_LEVEL", consentDefinitionId: f.consentDefinitionId,
  consent: "accepted", idempotencyKey: randomUUID(), ...extra });
const request = (body = fields(), headers = {}, path = "/api/applications") => new Request(`http://localhost${path}`, {
  method: "POST", body: String(body instanceof URLSearchParams ? challengedFields(body) : body), headers: { origin: "http://localhost", "content-type": "application/x-www-form-urlencoded", ...headers },
});
const pdf = syntheticPdf();
function multipart(data = fields(), bytes = pdf, name = "Synthetic.pdf", mime = "application/pdf") {
  const form = new FormData();
  for (const [key, value] of data) form.append(key, value);
  form.append("cf-turnstile-response", challengedFields("").get("cf-turnstile-response"));
  form.append("cv", new File([bytes], name, { type: mime }));
  return new Request("http://localhost/api/applications", { method: "POST", headers: { origin: "http://localhost" }, body: form });
}
const reset = () => db.query(`DELETE FROM public."RateLimitBucket" WHERE "scope" = 'PUBLIC_INTAKE_GLOBAL'`);
const bucket = async () => (await db.query(`SELECT "count", "expiresAt" FROM public."RateLimitBucket" WHERE "scope" = 'PUBLIC_INTAKE_GLOBAL'`)).rows[0];
class Storage {
  allocations = 0; writes = 0;
  async allocateId() { this.allocations++; return `synthetic${randomUUID().replaceAll("-", "")}`; }
  async put() { this.writes++; }
}

try {
  await seedPhase2CSynthetic();
  await reset();
  const now = Date.now();
  // Independent sessions contend on the actual durable unique bucket.
  const race = await Promise.all(Array.from({ length: 45 }, () => intake.consumeIntakeLimit(pool, now)));
  check(race.filter(Boolean).length, 20); check((await bucket()).count, 21);
  check(await intake.consumeIntakeLimit(pool, now + 59_999), false);
  check(await intake.consumeIntakeLimit(pool, now + 60_000)); check((await bucket()).count, 1);
  check((await bucket()).expiresAt.getTime(), now + 120_000);
  check((await db.query(`SELECT count(*)::int AS n FROM public."RateLimitBucket" WHERE "scope" = 'PUBLIC_INTAKE_GLOBAL'`)).rows[0].n, 1);
  for (let i = 0; i < 50; i++) await intake.consumeIntakeLimit(pool, now + 60_001);
  check((await bucket()).count, 21);
  await reset();
  await rejects(() => db.transaction(async executor => { check(await intake.consumeIntakeLimit(executor)); throw new Error("Synthetic rollback."); }));
  check((await bucket()) === undefined);
  check(await intake.consumeIntakeLimit());
  const locked = await pool.connect();
  await locked.query("BEGIN");
  await locked.query(`SELECT "id" FROM public."RateLimitBucket" WHERE "scope"='PUBLIC_INTAKE_GLOBAL' FOR UPDATE`);
  const lockStarted = performance.now();
  try { await rejects(() => intake.consumeIntakeLimit()); check(performance.now() - lockStarted < 4500); }
  finally { await locked.query("ROLLBACK"); locked.release(); }
  check((await bucket()).count, 1);
  await rejects(() => db.transaction(async () => { throw new Error("Synthetic domain failure."); }));
  check((await bucket()).count, 1);
  for (const count of [undefined, 0, -1, 22, "1", NaN]) await rejects(() => intake.consumeIntakeLimit({ query: async () => ({ rows: count === undefined ? [] : [{ count }] }) }));
  process.env.NODE_ENV = "production";
  await rejects(() => intake.consumeIntakeLimit(pool, now));
  process.env.NODE_ENV = "test";

  let admissions = 0, transactions = 0;
  const dependencies = { consumeLimit: async () => { admissions++; return true; }, transaction: async () => { transactions++; } };
  check((await intake.handleIntakeRequest(request(), dependencies)).status, 200);
  check(admissions, 1); check(transactions, 1);
  for (const [headers, path, status] of [
    [{ "content-type": "application/json" }, "/api/applications", 415],
    [{ "content-type": "text/plain" }, "/api/applications", 415],
    [{ "content-encoding": "gzip" }, "/api/applications", 415],
    [{ "content-length": "24577" }, "/api/applications", 413],
    [{ "content-length": "1, 2" }, "/api/applications", 413],
    [{ "content-length": "" }, "/api/applications", 413],
    [{}, "/api/applications?payload=synthetic", 400],
    [{}, "/api/applications/extra", 400],
    [{}, "/api/applications?x=" + "a".repeat(2050), 403],
    [{ origin: "http://other.invalid" }, "/api/applications", 403],
    [{ origin: "http://localhost,http://localhost" }, "/api/applications", 403],
    [{ origin: "null" }, "/api/applications", 403],
    [{ origin: "http://localhost/path" }, "/api/applications", 403],
    [{ host: "malformed/host" }, "/api/applications", 403],
    [{ host: "localhost/path", origin: "http://localhost/path" }, "/api/applications", 403],
    [{ "sec-fetch-site": "cross-site" }, "/api/applications", 403],
    [{ "sec-fetch-site": "same-origin, cross-site" }, "/api/applications", 403],
  ]) {
    const before = admissions;
    check((await intake.handleIntakeRequest(request(fields(), headers, path), dependencies)).status, status);
    check(admissions, before);
  }
  check((await intake.handleIntakeRequest(new Request("http://localhost/api/applications", { headers: { origin: "http://localhost" } }), dependencies)).status, 405);
  for (const body of ["", "fullName=%GG", "fullName=%C0%AF", "fullName=%", fields().toString() + "&city=duplicate", fields({ internalStatus: "SUBMITTED" }), fields({ consent: "" }), fields({ shortIntroduction: "x".repeat(2001) })]) {
    check((await intake.handleIntakeRequest(request(body), dependencies)).status, 400);
  }
  check((await intake.handleIntakeRequest(request("x".repeat(24577)), dependencies)).status, 413);
  check((await intake.handleIntakeRequest(request(fields(), { "content-length": "1" }), dependencies)).status, 400);
  const invalidUtf8 = new Request("http://localhost/api/applications", { method: "POST", headers: { origin: "http://localhost", "content-type": "application/x-www-form-urlencoded" }, body: new Uint8Array([255]) });
  check((await intake.handleIntakeRequest(invalidUtf8, dependencies)).status, 400);
  const tooManyAnswers = fields({ applicationType: "JOB_APPLICATION", jobId: f.jobId });
  tooManyAnswers.delete("departmentId"); tooManyAnswers.delete("engagementType");
  for (let i = 0; i < 51; i++) tooManyAnswers.set(`answer.${randomUUID()}`, "x");
  check((await intake.handleIntakeRequest(request(tooManyAnswers), dependencies)).status, 400);
  const oversizedAnswer = new URLSearchParams(tooManyAnswers);
  for (const key of [...oversizedAnswer.keys()]) if (key.startsWith("answer.")) oversizedAnswer.delete(key);
  oversizedAnswer.set(`answer.${f.jobQuestionId}`, "x".repeat(4001));
  check((await intake.handleIntakeRequest(request(oversizedAnswer), dependencies)).status, 400);
  const denied = await intake.handleIntakeRequest(request(), { ...dependencies, consumeLimit: async () => false });
  check(denied.status, 429); check(denied.headers.get("retry-after"), "60");
  const unavailable = await intake.handleIntakeRequest(request(), { ...dependencies, consumeLimit: async () => { throw new Error("SYNTHETIC_PRIVATE_ERROR"); } });
  check(unavailable.status, 503); check((await unavailable.text()).includes("SYNTHETIC_PRIVATE_ERROR"), false);
  check(unavailable.headers.get("cache-control"), "private, no-store, max-age=0");
  const release1 = abuse.acquireIntakeSlot(), release2 = abuse.acquireIntakeSlot();
  check(typeof release1, "function"); check(typeof release2, "function"); check(abuse.acquireIntakeSlot(), null);
  const beforeBusy = admissions;
  check((await intake.handleIntakeRequest(request(), dependencies)).status, 429); check(admissions, beforeBusy);
  check((await files.handleCandidateFileIntakeRequest(multipart(), { consumeLimit: dependencies.consumeLimit })).status, 429);
  release1(); release1(); release2();
  check((await intake.handleIntakeRequest(request(), dependencies)).status, 200);

  // No forwarding-header spelling, syntax or address family has identity authority.
  const spoofed = [ {}, ...["192.0.2.1", "2001:db8::1", "::ffff:192.0.2.1", "192.0.2.1, 198.51.100.2", " bad-IP ", "", "unknown, 2001:db8::1"].map(v => ({ "X-Forwarded-For": v })),
    { "x-forwarded-for": "192.0.2.1, 192.0.2.2" }, { "X-Real-IP": "192.0.2.1" }, { Forwarded: 'for="[2001:db8::1]";proto=https' },
    { "CF-Connecting-IP": "192.0.2.1" }, { "X-Forwarded-Host": "localhost", "X-Forwarded-Proto": "http" } ];
  for (const headers of spoofed) {
    const before = admissions;
    check((await intake.handleIntakeRequest(request(fields(), headers), dependencies)).status, 200); check(admissions, before + 1);
    process.env.NODE_ENV = "production";
    check((await intake.handleIntakeRequest(request(fields(), headers), dependencies)).status, 403);
    check((await files.handleCandidateFileIntakeRequest(multipart(), { consumeLimit: dependencies.consumeLimit })).status, 403);
    check(admissions, before + 1); process.env.NODE_ENV = "test";
  }
  check(abuse.intakeAbuseReadiness().trustedClientIp, "UNAVAILABLE_UNTIL_TRUSTED_PROXY_PROVEN");
  check(abuse.intakeAbuseReadiness().realCandidateIntake, false);

  const parsed = await policy.parseCandidateUpload(multipart(), async fields => { await challenge.requireIntakeChallenge(fields); intake.validateIntake(fields); });
  check((await files.handleCandidateFileIntakeRequest(multipart(fields({ consent: "" })), { consumeLimit: async () => true })).status, 400);
  check(parsed.contentHash, policy.sha256(pdf));
  check(JSON.stringify(parsed).includes("Synthetic.pdf"), false);
  const badForms = [];
  for (const kind of ["duplicate", "extra", "unknown", "empty", "tiny", "fields"]) {
    const form = new FormData(); for (const [key, value] of fields()) form.append(key, value);
    form.append("cv", new File([kind === "empty" ? new Uint8Array() : pdf], "Synthetic.pdf", { type: "application/pdf" }));
    if (kind === "duplicate" || kind === "extra") form.append(kind === "duplicate" ? "cv" : "other", new File([pdf], "Synthetic.pdf", { type: "application/pdf" }));
    if (kind === "unknown") form.append("unrecognized", "x");
    if (kind === "tiny") for (let i = 0; i < 1000; i++) form.append(`tiny${i}`, "");
    if (kind === "fields") form.append("city", "duplicate");
    badForms.push(new Request("http://localhost/api/applications", { method: "POST", body: form }));
  }
  for (const req of badForms) await rejects(() => policy.parseCandidateUpload(req, intake.validateIntake));
  for (const [bytes, name, mime] of [[pdf, "../Synthetic.pdf", "application/pdf"], [pdf, "Synthetic.pdf.exe", "application/pdf"],
    [pdf, "Synthetic.pdf", "text/plain"], [Buffer.alloc(policy.MAX_CV_BYTES + 1), "Synthetic.pdf", "application/pdf"], [Buffer.from("invalid"), "Synthetic.pdf", "application/pdf"]]) {
    await rejects(() => policy.parseCandidateUpload(multipart(fields(), bytes, name, mime), intake.validateIntake));
  }
  const wire = multipart(); const wireBody = Buffer.from(await wire.arrayBuffer()); const wireType = wire.headers.get("content-type");
  const rawRequest = (bytes, type = wireType) => new Request("http://localhost/api/applications", { method: "POST", headers: { "content-type": type }, body: bytes });
  const nativeFormData = Response.prototype.formData;
  let nativeParses = 0;
  Response.prototype.formData = function (...args) { nativeParses++; return nativeFormData.apply(this, args); };
  try {
    for (const bytes of [wireBody.subarray(0, wireBody.length - 10), Buffer.concat([wireBody, Buffer.from("epilogue")]),
      Buffer.from(wireBody.toString().replace('name="applicationType"', `name="${"x".repeat(1500)}"`)), Buffer.alloc(policy.MAX_UPLOAD_BYTES + 1)]) {
      const before = nativeParses; await rejects(() => policy.parseCandidateUpload(rawRequest(bytes))); check(nativeParses, before);
    }
    await rejects(() => policy.parseCandidateUpload(rawRequest(wireBody, "multipart/form-data; boundary=bad boundary")));
  } finally { Response.prototype.formData = nativeFormData; }
  const slow = new ReadableStream({ pull: () => new Promise(() => {}), cancel: () => {} });
  const started = performance.now(); await rejects(() => policy.readBoundedStream(slow, 100, 20)); check(performance.now() - started < 1000);
  await rejects(() => policy.readBoundedStream(new Blob(["abc"]).stream(), 100, 100, "4"));
  await rejects(() => policy.readBoundedStream(new Blob(["abc"]).stream(), 100, 100, "3", AbortSignal.abort()));
  await rejects(() => policy.readBoundedStream(new ReadableStream({ pull(controller) { controller.enqueue(new Uint8Array()); } }), 100, 100));
  // An uncooperative cancel promise must not hold the request or its admission slot.
  const stalledCancel = new ReadableStream({ pull() {}, cancel: () => new Promise(() => {}) });
  const cancelStarted = performance.now(); await rejects(() => policy.readBoundedStream(stalledCancel, 100, 20));
  check(performance.now() - cancelStarted < 1000);

  await reset();
  const validFields = fields();
  const first = await intake.handleIntakeRequest(request(validFields)); check(first.status, 200);
  check((await intake.handleIntakeRequest(request(validFields))).status, 200);
  const conflict = new URLSearchParams(validFields); conflict.set("city", "Synthetic Changed City");
  check((await intake.handleIntakeRequest(request(conflict))).status, 400); check((await bucket()).count, 3);
  for (let i = 0; i < 17; i++) check((await intake.handleIntakeRequest(request(fields({ consent: "" })))).status, 400);
  check((await intake.handleIntakeRequest(request(validFields))).status, 429);
  check((await files.handleCandidateFileIntakeRequest(multipart(), { storage: () => new Storage() })).status, 429);
  check((await bucket()).count, 21);
  await reset();
  const storage = new Storage();
  const uploadFields = fields();
  const uploaded = await files.handleCandidateFileIntakeRequest(multipart(uploadFields), { storage: () => storage }); check(uploaded.status, 200);
  const application = (await db.query(`SELECT "id", "technicalStatus" FROM public."Application" WHERE "email"='synthetic.abuse@example.invalid' AND "requiresClearedFile"=true ORDER BY "createdAt" DESC LIMIT 1`)).rows[0];
  check(application.technicalStatus, "SECURITY_PENDING");
  check((await db.query(`SELECT count(*)::int AS n FROM public."BackgroundJob" WHERE "applicationId"=$1 AND "jobType"='CANDIDATE_SUBMISSION_NOTIFICATION'`, [application.id])).rows[0].n, 0);
  check((await files.handleCandidateFileIntakeRequest(multipart(uploadFields), { storage: () => storage })).status, 200);
  check(storage.allocations, 1); check(storage.writes, 1);
  const invalidJob = fields({ applicationType: "JOB_APPLICATION", jobId: randomUUID() }); invalidJob.delete("departmentId"); invalidJob.delete("engagementType");
  check((await files.handleCandidateFileIntakeRequest(multipart(invalidJob), { storage: () => storage })).status, 503);
  check(storage.allocations, 1);
  const failedStorage = new Storage(); failedStorage.allocateId = async () => { throw new Error("Synthetic allocation failure."); };
  const recoverFields = fields();
  check((await files.handleCandidateFileIntakeRequest(multipart(recoverFields), { storage: () => failedStorage })).status, 503);
  check((await files.handleCandidateFileIntakeRequest(multipart(recoverFields), { storage: () => storage })).status, 200);

  // Offline actual Turnstile adapter: no production fake verifier injection API.
  const config = { PUBLIC_INTAKE_CHALLENGE_PROVIDER: "turnstile", PUBLIC_INTAKE_ORIGIN: "https://pyramiddesigns.co",
    TURNSTILE_SECRET_KEY: "synthetic_private_test_value_no_credential", TURNSTILE_SITE_KEY: "synthetic_public_widget_identifier" };
  Object.assign(process.env, config);
  let calls = 0;
  const accepted = () => ({ success: true, hostname: "pyramiddesigns.co", action: "candidate_intake", challenge_ts: new Date().toISOString(), "error-codes": [] });
  let respond = () => Response.json(accepted());
  globalThis.fetch = async (endpoint, init) => {
    calls++; check(endpoint, "https://challenges.cloudflare.com/turnstile/v0/siteverify"); check(init.redirect, "error");
    check(init.method, "POST"); check(init.signal instanceof AbortSignal);
    check(Object.keys(JSON.parse(init.body)).sort(), ["response", "secret"]);
    return respond(init);
  };
  check(challenge.intakeChallengeConfiguration(), "CONFIGURED_UNVERIFIED");
  process.env.NODE_ENV = "production";
  check(challenge.intakeChallengeConfiguration(), "CONFIGURED_UNVERIFIED");
  check((await intake.handleIntakeRequest(request(fields(), { "cf-turnstile-response": "synthetic-token" }), dependencies)).status, 403);
  process.env.NODE_ENV = "test";
  for (const token of [undefined, null, {}, "", "a".repeat(2049), "bad token", "bad\nvalue"]) check(await challenge.verifyIntakeChallenge(token), "REJECTED");
  check(calls, 0);
  check(await challenge.verifyIntakeChallenge("synthetic-token"), "VERIFIED");
  for (const name of Object.keys(config)) { delete process.env[name]; check(await challenge.verifyIntakeChallenge("synthetic-token"), "UNAVAILABLE"); process.env[name] = config[name]; }
  for (const [key, value] of [["PUBLIC_INTAKE_CHALLENGE_PROVIDER", "synthetic"], ["PUBLIC_INTAKE_ORIGIN", "http://challenge.example.invalid"],
    ["PUBLIC_INTAKE_ORIGIN", "https://challenge.example.invalid/"], ["TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA"], ["TURNSTILE_SITE_KEY", "1x00000000000000000000AA"]]) {
    process.env[key] = value; process.env.NODE_ENV = "production";
    check(await challenge.verifyIntakeChallenge("synthetic-token"), "UNAVAILABLE"); Object.assign(process.env, config); process.env.NODE_ENV = "test";
  }
  for (const [value, expected] of [[{ success: false, "error-codes": ["timeout-or-duplicate"] }, "REJECTED"],
    [{ ...accepted(), hostname: "attacker.invalid" }, "REJECTED"], [{ ...accepted(), action: "other" }, "REJECTED"],
    [{ ...accepted(), challenge_ts: new Date(Date.now() - 300_001).toISOString() }, "REJECTED"],
    [{ ...accepted(), challenge_ts: new Date(Date.now() + 60000).toISOString() }, "REJECTED"],
    [{ ...accepted(), success: "true" }, "UNAVAILABLE"], [{ ...accepted(), unexpected: true }, "UNAVAILABLE"],
    [{ ...accepted(), "error-codes": "bad" }, "UNAVAILABLE"], [{ ...accepted(), cdata: "candidate-data" }, "REJECTED"], [[], "UNAVAILABLE"], [null, "UNAVAILABLE"]]) {
    respond = () => Response.json(value); check(await challenge.verifyIntakeChallenge("synthetic-token"), expected);
  }
  for (const status of [400, 401, 403, 429, 500, 503]) { respond = () => Response.json(accepted(), { status }); check(await challenge.verifyIntakeChallenge("synthetic-token"), "UNAVAILABLE"); }
  for (const raw of ["invalid", '{"success":false,"success":true}', '{"success":false,"\\u0073uccess":true}', "x".repeat(8193)]) {
    respond = () => new Response(raw, { headers: { "content-type": "application/json" } }); check(await challenge.verifyIntakeChallenge("synthetic-token"), "UNAVAILABLE");
  }
  respond = () => Response.json(accepted(), { headers: { "content-length": "999999" } }); check(await challenge.verifyIntakeChallenge("synthetic-token"), "UNAVAILABLE");
  respond = () => new Response("{}", { headers: { "content-type": "text/html" } }); check(await challenge.verifyIntakeChallenge("synthetic-token"), "UNAVAILABLE");
  respond = () => new Response(new Uint8Array([255]), { headers: { "content-type": "application/json" } }); check(await challenge.verifyIntakeChallenge("synthetic-token"), "UNAVAILABLE");
  const beforeAbort = calls; check(await challenge.verifyIntakeChallenge("synthetic-token", AbortSignal.abort()), "UNAVAILABLE"); check(calls, beforeAbort);
  respond = () => { throw new Error("SYNTHETIC_PROVIDER_PRIVATE_ERROR"); }; check(await challenge.verifyIntakeChallenge("synthetic-token"), "UNAVAILABLE");
  respond = () => new Promise(() => {}); const timeoutStarted = performance.now();
  check(await challenge.verifyIntakeChallenge("synthetic-token"), "UNAVAILABLE"); check(performance.now() - timeoutStarted < 4000);
  respond = () => new Response(new ReadableStream({ pull() {}, cancel() {} }), { headers: { "content-type": "application/json" } });
  check(await challenge.verifyIntakeChallenge("synthetic-token"), "UNAVAILABLE");
  let used = false; respond = () => { const value = used ? { success: false, "error-codes": ["timeout-or-duplicate"] } : accepted(); used = true; return Response.json(value); };
  check(await challenge.verifyIntakeChallenge("same-synthetic-token"), "VERIFIED"); check(await challenge.verifyIntakeChallenge("same-synthetic-token"), "REJECTED");
  const runtime = await readFile("src/lib/server/intake-challenge.ts", "utf8"); check(/console\.|remoteip\s*:|NEXT_PUBLIC|mode:\s*["']synthetic/.test(runtime), false);
  console.log(`PHASE_2ID_ABUSE_OK checks=${checks} live_requests=0 limiter_parallel_admitted=20 migrations_unchanged=true`);
} finally {
  globalThis.fetch = nativeFetch;
  await reset(); await pool.end(); await db.closeDatabasePool();
}

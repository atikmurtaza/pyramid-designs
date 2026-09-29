import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { installChallengeFixture } from "./phase-2ie-challenge-fixture.mjs";
import { syntheticPdf } from "./phase-2h-synthetic-pdf.mjs";

const url = new URL(process.env.PHASE2IB_TEST_DATABASE_URL ?? "invalid:");
assert(["localhost", "127.0.0.1"].includes(url.hostname) && /^\/phase2ib_[a-z0-9_]+$/.test(url.pathname));
process.env.DATABASE_URL = url.href;
process.env.NODE_ENV = "test";
process.env.PUBLIC_INTAKE_MODE = "synthetic";
process.env.EMAIL_PROVIDER = "";
process.env.RESEND_API_KEY = "";
installChallengeFixture();
const db = await import("../src/lib/server/database.ts");
const intake = await import("../src/lib/server/public-intake.ts");
const files = await import("../src/lib/server/candidate-files.ts");
const challenge = await import("../src/lib/server/intake-challenge.ts");
const { phase2BFixtures: f } = await import("./seed-phase-2b-synthetic.mjs");
const { seedPhase2CSynthetic } = await import("./seed-phase-2c-synthetic.mjs");
let checks = 0, calls = 0, effects = 0;
const check = (actual, expected = true) => { assert.deepEqual(actual, expected); checks++; };
const token = () => `synthetic-token-${randomUUID()}`;
const fields = (type = "TALENT_NETWORK", value = token(), key = randomUUID()) => new URLSearchParams({
  applicationType: type, ...(type === "JOB_APPLICATION" ? { jobId: f.jobId, [`answer.${f.jobQuestionId}`]: f.jobQuestionOptionId }
    : { departmentId: f.departmentId, engagementType: "PERMANENT_INTEREST" }),
  fullName: "Synthetic Challenge Verification", email: "synthetic.challenge@example.invalid", city: "Synthetic City",
  experienceLevel: "SYNTHETIC_LEVEL", consentDefinitionId: f.consentDefinitionId, consent: "accepted", idempotencyKey: key,
  "cf-turnstile-response": value,
});
function request(data, multipart, path = "/api/applications", origin = "http://localhost") {
  let body = data;
  if (multipart) {
    body = new FormData(); for (const [key, value] of data) body.append(key, value);
    body.append("cv", new File([syntheticPdf()], "Synthetic.pdf", { type: "application/pdf" }));
  }
  return new Request(`http://localhost${path}`, { method: "POST", headers: { origin }, body });
}
const reset = () => db.query(`DELETE FROM public."RateLimitBucket" WHERE "scope"='PUBLIC_INTAKE_GLOBAL'`);
const snapshot = async () => {
  const result = {};
  for (const table of ["Application", "CandidateFile", "IdempotencyRecord", "AuditEvent", "BackgroundJob"])
    result[table] = (await db.query(`SELECT count(*)::int AS n FROM public."${table}"`)).rows[0].n;
  return result;
};
const storage = { allocations: 0, writes: 0,
  async allocateId() { this.allocations++; return `synthetic${randomUUID().replaceAll("-", "")}`; },
  async put() { this.writes++; },
};
const invoke = (data, multipart, options = {}) => multipart
  ? files.handleCandidateFileIntakeRequest(request(data, true), { storage: () => storage, ...options })
  : intake.handleIntakeRequest(request(data, false), { transaction: db.transaction, consumeLimit: intake.consumeIntakeLimit, ...options });
const accepted = (extra = {}) => ({ success: true, hostname: "pyramiddesigns.co", action: "candidate_intake",
  challenge_ts: new Date().toISOString(), "error-codes": [], ...extra });
const used = new Set();
const redeem = init => {
  const value = JSON.parse(init.body).response;
  if (used.has(value)) return Response.json({ success: false, "error-codes": ["timeout-or-duplicate"] });
  used.add(value); return Response.json(accepted());
};
let respond = redeem;
globalThis.fetch = async (endpoint, init) => {
  calls++;
  check(endpoint, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
  check(init.redirect, "error"); check(init.cache, "no-store");
  check(Object.keys(JSON.parse(init.body)).sort(), ["response", "secret"]);
  return respond(init);
};

try {
  await seedPhase2CSynthetic();
  check(challenge.intakeChallengeSiteKey(), "synthetic_public_widget_identifier");
  for (const type of ["JOB_APPLICATION", "TALENT_NETWORK"]) for (const multipart of [false, true]) {
    for (const value of [undefined, "", "bad token", "a".repeat(2049)]) {
      await reset(); const data = fields(type, value); if (value === undefined) data.delete("cf-turnstile-response");
      const before = await snapshot(), count = calls;
      const result = await invoke(data, multipart); check(result.status, 400); check(calls, count);
      check(await snapshot(), before); check(storage.allocations, 0);
      check((await db.query(`SELECT "count" FROM public."RateLimitBucket" WHERE "scope"='PUBLIC_INTAKE_GLOBAL'`)).rows[0].count, 1);
    }
    await reset(); const duplicate = fields(type); duplicate.append("cf-turnstile-response", token());
    const count = calls; check((await invoke(duplicate, multipart)).status, 400); check(calls, count);
  }
  for (const outcome of [
    () => Response.json({ success: false, "error-codes": ["invalid-input-response"] }),
    () => Response.json({ success: false, "error-codes": ["timeout-or-duplicate"] }),
    () => Response.json(accepted({ action: "other" })),
    () => Response.json(accepted({ hostname: "localhost" })),
    () => Response.json(accepted({ challenge_ts: new Date(Date.now() - 301_000).toISOString() })),
    () => Response.json(accepted({ challenge_ts: new Date(Date.now() + 60_000).toISOString() })),
    () => Response.json({ success: true }),
    () => Response.json(accepted({ cdata: "unexpected" })),
    () => new Response('{"success":true,"success":false}', { headers: { "content-type": "application/json" } }),
    () => new Response("not json", { headers: { "content-type": "application/json" } }),
    () => new Response("x".repeat(8193), { headers: { "content-type": "application/json" } }),
    () => new Response("{}", { status: 302, headers: { location: "https://other.invalid" } }),
    () => new Response("{}", { status: 400 }), () => new Response("{}", { status: 500 }),
    () => { throw new Error("Synthetic DNS failure"); },
    () => { throw new Error("Synthetic ambiguous network failure"); },
  ]) for (const multipart of [false, true]) {
    await reset(); respond = outcome; const before = await snapshot(), count = calls;
    const result = await invoke(fields(), multipart);
    check(result.status, 400); check((await result.json()).field, "intake-challenge");
    check(calls, count + 1); check(await snapshot(), before); check(storage.allocations, 0);
  }
  for (const multipart of [false, true]) {
    await reset(); respond = () => new Promise(() => {}); const count = calls, started = performance.now();
    check((await invoke(fields(), multipart)).status, 400); check(calls, count + 1); check(performance.now() - started < 4000);
  }
  respond = redeem;
  // Same application key, fresh credential: one application and at most one Drive write.
  for (const type of ["JOB_APPLICATION", "TALENT_NETWORK"]) for (const multipart of [false, true]) {
    await reset(); const data = fields(type), credential = data.get("cf-turnstile-response");
    const before = await snapshot(), writes = storage.writes;
    check((await invoke(data, multipart)).status, 200);
    const after = await snapshot(); check(after.Application, before.Application + 1);
    check((await invoke(data, multipart)).status, 400); check(await snapshot(), after);
    data.set("cf-turnstile-response", token()); check((await invoke(data, multipart)).status, 200);
    check(await snapshot(), after); check(storage.writes, writes + (multipart ? 1 : 0));
    for (const table of ["Application", "CandidateFile", "IdempotencyRecord", "AuditEvent", "BackgroundJob"]) {
      const rows = await db.query(`SELECT row_to_json(t)::text AS value FROM public."${table}" t`);
      check(rows.rows.some(row => row.value.includes(credential) || row.value.includes(data.get("cf-turnstile-response"))), false);
    }
    data.set("fullName", "Synthetic Changed Application"); data.set("cf-turnstile-response", token());
    check((await invoke(data, multipart)).status, multipart ? 503 : 400); check(await snapshot(), after);
  }
  await reset(); respond = () => Response.json({ success: false }); const beforeFlood = calls;
  for (let i = 0; i < 25; i++) check((await invoke(fields(), i % 2 === 0)).status, i < 20 ? 400 : 429);
  check(calls, beforeFlood + 20);
  for (const multipart of [false, true]) {
    const before = calls; check((await invoke(fields(), multipart, { consumeLimit: async () => { throw new Error("Synthetic DB failure"); } })).status, 503); check(calls, before);
    const handler = multipart ? files.handleCandidateFileIntakeRequest : intake.handleIntakeRequest;
    check((await handler(request(fields(), multipart, "/api/applications/alternate"))).status, 400);
    check((await handler(request(fields(), multipart, "/api/applications", "http://other.invalid"))).status, 403);
  }
  const beforeJson = calls;
  check((await intake.handleIntakeRequest(new Request("http://localhost/api/applications", { method: "POST",
    headers: { origin: "http://localhost", "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(fields())) }))).status, 415);
  check(calls, beforeJson);
  // Both active slots are held at Siteverify; third request cannot amplify calls.
  const pending = []; respond = () => new Promise(resolve => pending.push(resolve));
  const deps = { consumeLimit: async () => true, transaction: async () => { effects++; } };
  const first = invoke(fields(), false, deps), second = invoke(fields(), false, deps);
  while (pending.length < 2) await new Promise(resolve => setTimeout(resolve, 5));
  const beforeThird = calls; check((await invoke(fields(), false, deps)).status, 429); check(calls, beforeThird);
  for (const resolve of pending) resolve(Response.json({ success: false }));
  check((await first).status, 400); check((await second).status, 400); check(effects, 0);
  process.env.NODE_ENV = "production";
  const beforeProduction = calls;
  for (const multipart of [false, true]) check((await invoke(fields(), multipart)).status, 403);
  check(calls, beforeProduction);
  process.env.PUBLIC_INTAKE_ORIGIN = "https://other.invalid";
  check(challenge.intakeChallengeConfiguration(), "UNAVAILABLE");
  process.env.PUBLIC_INTAKE_ORIGIN = "https://pyramiddesigns.co";
  for (const value of ["1x0000000000000000000000000000000AA", "2x0000000000000000000000000000000AA", "3x0000000000000000000000000000000AA"]) {
    process.env.TURNSTILE_SECRET_KEY = value; check(challenge.intakeChallengeConfiguration(), "UNAVAILABLE");
  }
  const runtime = await readFile("src/lib/server/intake-challenge.ts", "utf8");
  check(/console\.|remoteip\s*:|NEXT_PUBLIC|mode:\s*["']synthetic/.test(runtime), false);
  console.log(`PHASE_2IE_CHALLENGE_OK checks=${checks} live_requests=0 json=denied provider_amplification=bounded`);
} finally { await db.closeDatabasePool(); }

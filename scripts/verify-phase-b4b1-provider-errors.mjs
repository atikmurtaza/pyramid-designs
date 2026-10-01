import assert from "node:assert/strict";
import { inspect } from "node:util";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createNeonProvider, safeProviderDiagnostic } from "./neon-rehearsal-provider.mjs";
import { REHEARSAL } from "./neon-rehearsal-manifest.mjs";

// Fully mocked transport. No PostgreSQL client, real credential or live request.
const key = "synthetic-h3-api-key-canary", secret = "synthetic-h3-secret-canary";
const manifest = JSON.parse(await readFile("scripts/neon-rehearsal-mutation-manifest.json", "utf8"));
const realFetch = globalThis.fetch, stdout = process.stdout.write, stderr = process.stderr.write;
let checks = 0, output = "";
const check = (condition, label) => { assert(condition, label); checks++; };
const json = (code, message, extra = {}) => JSON.stringify({ code, message, ...extra });
const cases = [
  [400, json("BAD_REQUEST", "Bad request"), "BAD_REQUEST", "Bad request"],
  [401, json("UNAUTHORIZED", "Unauthorized"), "UNAUTHORIZED", "Unauthorized"],
  [403, json("FORBIDDEN", "Forbidden"), "FORBIDDEN", "Forbidden"],
  [409, json("CONFLICT", "Conflict"), "CONFLICT", "Conflict"],
  [412, json("", "Precondition failed"), undefined, "Precondition failed"],
  [412, json("PRECONDITION_FAILED", "Schema-only branching is not enabled for this project"), "PRECONDITION_FAILED", "Schema-only branching is not enabled for this project"],
  ...[key, `Authorization: Bearer ${secret}`, `postgresql://owner:${secret}@db.invalid/db`,
    `https://owner:${secret}@db.invalid`, `password=${secret}`, `token=${secret}`, `api_key=${secret}`,
    `Cookie: session=${secret}`, `DSN=${secret}`, `host=db.invalid password=${secret}`,
    `Precondition failed\n${secret}`, "Precondition failed\u0000", "Precondition failed\u001b[31m", secret,
    "Unreviewed harmless-looking text", "Precondition failed".repeat(100)]
    .map(message => [412, json("PRECONDITION_FAILED", message), "PRECONDITION_FAILED", undefined]),
  [412, "{broken", undefined, undefined, "OMITTED_INVALID"],
  [412, `<html>${secret}</html>`, undefined, undefined, "OMITTED_INVALID"],
  [412, "x".repeat(8193), undefined, undefined, "OMITTED_TOO_LARGE"],
  [412, json("PRECONDITION_FAILED", { nested: secret }), undefined, undefined, "OMITTED_INVALID"],
  [412, json("PRECONDITION_FAILED", "Precondition failed", { nested: { password: secret }, request_id: secret }), "PRECONDITION_FAILED", "Precondition failed"],
  [412, json(secret, "Precondition failed"), undefined, "Precondition failed"],
  [412, JSON.stringify([secret]), undefined, undefined, "OMITTED_INVALID"],
  [412, json("PRECONDITION_FAILED", "  Precondition   failed  "), "PRECONDITION_FAILED", "Precondition failed"],
  [423, json("LOCKED", "Resource is locked"), "LOCKED", "Resource is locked"],
  [503, json("SERVICE_UNAVAILABLE", "Service unavailable"), "SERVICE_UNAVAILABLE", "Service unavailable"],
  [null, secret],
];
try {
  process.stdout.write = process.stderr.write = function(chunk, ...args) {
    output += String(chunk); const callback = args.find(value => typeof value === "function"); callback?.(); return true;
  };
  for (const [status, body, code, message, bodyClass = "STRUCTURED"] of cases) {
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      if (status === null) throw new Error(body);
      return new Response(body, { status, headers: { "X-Request-ID": secret, "Set-Cookie": secret } });
    };
    const provider = createNeonProvider({ project: REHEARSAL.project, apiKey: key });
    let error;
    try { await provider.getProjectMetadata(); } catch (caught) { error = caught; }
    finally { provider.close(); }
    const diagnostic = safeProviderDiagnostic(error);
    check(diagnostic?.status === status, "status retained");
    check(diagnostic?.providerCode === code, "code vocabulary");
    check(diagnostic?.providerMessage === message, "message vocabulary");
    check(status === null || diagnostic.errorBody === bodyClass, "body classification");
    check(diagnostic.retryPolicy === "NO_AUTOMATIC_RETRY", "read retry policy");
    check(diagnostic.providerRetryClassification === ([423, 503].includes(status) ? "DOCUMENTED_RETRYABLE" : "IDEMPOTENT_READ"), "provider retry distinction");
    check(calls === 1, "no automatic retry");
    check(Object.isFrozen(diagnostic), "immutable projection");
    const rendered = String(error) + inspect(error) + JSON.stringify(error) + JSON.stringify({ providerDiagnostic: diagnostic });
    check(![key, secret, "postgresql://", "Authorization:", "Cookie:", "db.invalid", "Unreviewed"].some(value => rendered.includes(value)), "error and evidence secret exclusion");
    check(!Object.hasOwn(diagnostic, "request_id") && !Object.hasOwn(diagnostic, "nested") && !Object.hasOwn(error, "cause"), "no arbitrary metadata");
  }
  // Streaming size bound rejects before a complete body is accumulated/parsed.
  let cancelled = false;
  globalThis.fetch = async () => new Response(new ReadableStream({
    pull(controller) { controller.enqueue(new Uint8Array(4096)); }, cancel() { cancelled = true; },
  }), { status: 412 });
  let provider = createNeonProvider({ project: REHEARSAL.project, apiKey: key });
  try { await provider.getProjectMetadata(); } catch (error) {
    check(error.diagnostic.errorBody === "OMITTED_TOO_LARGE", "stream byte bound");
  } finally { provider.close(); }
  check(cancelled, "oversize stream cancelled");
  // A credential that collides with the vocabulary must still be suppressed.
  globalThis.fetch = async () => new Response(json("PRECONDITION_FAILED", "Precondition failed"), { status: 412 });
  provider = createNeonProvider({ project: REHEARSAL.project, apiKey: "PRECONDITION_FAILED" });
  try { await provider.getProjectMetadata(); } catch (error) { check(error.diagnostic.providerCode === undefined, "credential collision denied"); }
  finally { provider.close(); }
  check(safeProviderDiagnostic({ diagnostic: { providerCode: secret } }) === undefined, "forged projection denied");
  // Exercise every error through the real creation latch/reconciliation path.
  for (const [status, body, code, message] of cases) {
    const calls = [];
    const stamp = "2026-10-01T00:00:00Z";
    globalThis.fetch = async (_url, init) => {
      calls.push(init.method);
      if (init.method === "POST") {
        if (status === null) throw new Error(body);
        return new Response(body, { status });
      }
      if (_url.endsWith("/branches")) return new Response(JSON.stringify({ branches: REHEARSAL.deniedBranches.map((id, i) => ({
        id, project_id: REHEARSAL.project, name: REHEARSAL.deniedNames[i], default: i === 0, protected: false,
        init_source: "parent-data", current_state: "ready", created_at: stamp,
      })) }), { status: 200 });
      return new Response(JSON.stringify({ project: { id: REHEARSAL.project, pg_version: 17, region_id: REHEARSAL.region } }), { status: 200 });
    };
    provider = createNeonProvider({ project: REHEARSAL.project, apiKey: key });
    try {
      const session = await provider.beginRehearsal({ manifest, runId: randomUUID(), authorization: REHEARSAL.authorization });
      let failure;
      try { await session.createDisposableBranch(); } catch (error) { failure = error; }
      check(failure?.diagnostic.status === status && failure.diagnostic.providerCode === code && failure.diagnostic.providerMessage === message, "creation diagnostics survive reconciliation");
      check(failure.diagnostic.retryPolicy === "NO_RETRY_RECONCILE_ONLY", "mutation no retry policy");
      try { await session.createDisposableBranch(); } catch (error) { check(error.message === "CREATE_RETRY_DENIED", "creation latch"); }
      check(calls.filter(method => method === "POST").length === 1 && !calls.includes("DELETE"), "one mocked post no delete");
      check(session.status().reconciliation === "CREATE_NAME_ABSENT_NO_RETRY" && session.getCreationReceipt() === undefined, "no receipt authority");
      check(!JSON.stringify(failure).includes(secret) && !JSON.stringify(failure).includes(key), "mutation evidence secret exclusion");
    } finally { provider.close(); }
  }
  check(!output.includes(key) && !output.includes(secret), "stdout and stderr secret exclusion");
  check(output === "", "provider emits no output");
  const acceptance = await readFile("docs/implementation/phase-b4b1-neon-live-acceptance.md", "utf8");
  check(!acceptance.includes(key) && !acceptance.includes(secret), "canonical acceptance secret exclusion");
} finally {
  globalThis.fetch = realFetch; process.stdout.write = stdout; process.stderr.write = stderr;
}
console.log(`P3_PROVIDER_ERRORS_OFFLINE_OK checks=${checks} cases=${cases.length} live_provider_calls=0 database_connections=0`);

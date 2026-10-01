import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createNeonProvider, PROVIDER_OPERATIONS, validateReviewedManifest } from "./neon-rehearsal-provider.mjs";
import { REHEARSAL } from "./neon-rehearsal-manifest.mjs";
import { lifecycle } from "./run-phase-b4b1-neon-lifecycle.mjs";

// Offline only. The real fetch is never invoked; no pg client is instantiated.
const manifest = JSON.parse(await readFile("scripts/neon-rehearsal-mutation-manifest.json", "utf8"));
const realFetch = globalThis.fetch;
const key = "synthetic-api-key-canary", password = "synthetic-uri-password-canary";
const project = REHEARSAL.project, id = "br-offline-h2-fixture", endpointId = "ep-offline-h2-fixture";
const host = `${endpointId}.ap-southeast-1.aws.neon.tech`, base = `https://console.neon.tech/api/v2/projects/${project}`;
const clone = value => structuredClone(value);
let checks = 0;
const check = (actual, ...expected) => { assert.deepEqual(actual, expected.length ? expected[0] : true); checks++; };
async function denied(fn, pattern = /^[A-Z][A-Z0-9_]+$/) {
  await assert.rejects(fn, error => {
    const rendered = String(error) + JSON.stringify(error);
    assert(!rendered.includes(key) && !rendered.includes(password) && !rendered.includes("provider-body-canary"));
    return pattern.test(error.message);
  }); checks++;
}
function fixture(options = {}) {
  const stamp = new Date().toISOString();
  const branch = { id, project_id: project, name: REHEARSAL.branchName, default: false, protected: false,
    init_source: "schema-only", current_state: "ready", created_at: stamp };
  const endpoint = { id: endpointId, host, branch_id: id, project_id: project, region_id: REHEARSAL.region,
    type: "read_write", disabled: false, passwordless_access: true, current_state: "active", created_at: stamp };
  const protectedBranches = REHEARSAL.deniedBranches.map((value, i) => ({ ...branch, id: value,
    name: REHEARSAL.deniedNames[i], default: i === 0, init_source: "parent-data" }));
  const state = { calls: [], branch, endpoint, created: false, deleted: false, options };
  globalThis.fetch = async (url, init) => {
    state.calls.push({ url, method: init.method, body: init.body && JSON.parse(init.body) });
    assert.equal(init.redirect, "error"); assert.equal(init.headers.Authorization, `Bearer ${key}`);
    assert.equal(new URL(url).origin, "https://console.neon.tech"); assert(init.signal instanceof AbortSignal);
    if (options.readError && init.method === "GET") throw new Error(`${key} ${password} provider-body-canary`);
    const reply = (status, data) => ({ status, url, redirected: false, json: async () => {
      if (options.malformed && init.method === "POST") throw new Error(password);
      return clone(data);
    } });
    if (options.redirect) return { ...reply(200, {}), redirected: true, url: "https://evil.invalid" };
    if (options.httpError) return reply(options.httpError, { error: `provider-body-canary ${key} ${password}` });
    if (url === base) return reply(200, { project: { id: project, pg_version: 17, region_id: REHEARSAL.region, api_key: key } });
    if (url === `${base}/branches` && init.method === "GET") return reply(200, {
      branches: [...protectedBranches, ...(state.created || options.collision ? [branch] : [])],
      ...(options.paginated ? { pagination: { cursor: "opaque" } } : {}),
    });
    if (url === `${base}/branches` && init.method === "POST") {
      state.created = true;
      if (options.postAmbiguous) throw new Error(`${key} provider-body-canary`);
      return reply(201, { branch: options.createdBranch ?? branch, endpoints: options.badCompute ? [] : [endpoint], connection_uris: [password] });
    }
    if (url === `${base}/branches/${id}` && init.method === "DELETE") {
      state.deleted = !options.keepAfterDelete;
      if (options.deleteAmbiguous) throw new Error(password);
      return reply(options.deleteStatus ?? 204, { password });
    }
    if (url === `${base}/branches/${id}`) return reply(state.deleted ? 404 : 200, { branch });
    if (url === `${base}/branches/${id}/endpoints`) return reply(200, { endpoints: [endpoint] });
    if (url === `${base}/branches/${id}/databases`) return reply(200, { databases: options.databases ?? [
      { branch_id: id, name: "pyramid_design", owner_name: "pyramid_owner", password },
    ] });
    if (url.startsWith(`${base}/connection_uri?`)) {
      assert.deepEqual(Object.fromEntries(new URL(url).searchParams), { branch_id: id, endpoint_id: endpointId,
        database_name: "pyramid_design", role_name: "pyramid_owner", pooled: "false" });
      return reply(200, { uri: options.uri ?? `postgresql://pyramid_owner:${password}@${host}/pyramid_design?sslmode=require` });
    }
    throw new Error("UNEXPECTED_OFFLINE_REQUEST");
  };
  state.provider = createNeonProvider({ project, apiKey: key });
  state.start = async () => {
    state.runId = randomUUID();
    state.session = await state.provider.beginRehearsal({ manifest: clone(manifest), authorization: REHEARSAL.authorization, runId: state.runId });
    return state;
  };
  state.create = async () => { await state.start(); state.receipt = await state.session.createDisposableBranch(); return state; };
  state.cleanup = () => ({ executionId: state.runId, receipt: state.receipt, ledger: clone(state.receipt), cleanupState: "EVIDENCE_SAVED_CONNECTIONS_CLOSED" });
  return state;
}
try {
  let f = fixture();
  check((await f.provider.getProjectMetadata()).id, project); // 1
  check((await f.provider.listBranches()).length, 2); // 2
  check((await f.provider.getBranch(id)).id, id); // 3
  check((await f.provider.listBranchEndpoints(id))[0].id, endpointId); // 4
  check((await f.provider.listBranchDatabases(id))[0].name, "pyramid_design"); // 5
  await f.create();
  let retained;
  await f.session.withBootstrapConnection(f.receipt, async url => { retained = url;
    check(url.password, password); check(url.search, "?sslmode=verify-full"); }); // 6
  check(retained.password, "");
  const post = f.calls.find(c => c.method === "POST");
  check(post, { url: `${base}/branches`, method: "POST", body: { branch: { name: REHEARSAL.branchName,
    parent_id: REHEARSAL.deniedBranches[0], init_source: "schema-only", protected: false }, endpoints: [{ type: "read_write" }] } }); // 7
  check((await f.session.deleteSameRunDisposableBranch(f.cleanup())).absenceConfirmed); // 8
  check(f.calls.filter(c => c.method === "DELETE").length, 1);
  await denied(() => f.session.deleteSameRunDisposableBranch(f.cleanup()));
  for (const foreign of ["other-project", project + "/branches", `https://evil.invalid/${project}`])
    await denied(async () => createNeonProvider({ project: foreign, apiKey: key })); // 9
  f = fixture();
  // 10-14, 37: no generic request API or configurable method/resource.
  for (const [method, path] of [["POST", "/api/v2/projects"], ["DELETE", base], ["PATCH", base], ["PUT", `${base}/branches`],
    ["HEAD", `${base}/branches`], ["GET", "/organizations"], ["POST", "/api_keys"], ["POST", "/data-api"], ["POST", "/auth"],
    ["POST", "/roles"], ["POST", "/databases"], ["PATCH", "/endpoints"], ["POST", "/billing"], ["POST", "/recover"]]) {
    await denied(() => f.provider.getProjectMetadata({ method, path }));
    await denied(() => f.provider.getBranch(id, { method, path }));
  }
  check(f.calls.length, 0);
  check(f.provider.request, undefined); check(f.provider.deleteBranch, undefined);
  check(Object.keys(PROVIDER_OPERATIONS).length, 8);
  await f.create();
  // 15-20, 42: protected, unrecorded, forged, stale, mismatched receipts.
  for (const target of [...REHEARSAL.deniedBranches, "br-unrecorded"]) {
    const context = f.cleanup(); context.ledger.branchId = target;
    await denied(() => f.session.deleteSameRunDisposableBranch(context));
  }
  await denied(() => f.session.deleteSameRunDisposableBranch({ ...f.cleanup(), receipt: clone(f.receipt) }));
  await denied(() => f.session.deleteSameRunDisposableBranch({ ...f.cleanup(), executionId: randomUUID() }));
  await denied(() => f.session.deleteSameRunDisposableBranch({ ...f.cleanup(), cleanupState: "cleanup" }));
  for (const mutation of [l => l.runId = randomUUID(), l => l.resources[0].id = "br-unrecorded",
    l => l.resources[0].createdAt = "2026-01-01T00:00:00Z", l => l.resources[0].name = REHEARSAL.branchName,
    l => l.startedAt = "2026-01-01T00:00:00Z", l => l.project = "other-project"]) {
    const context = f.cleanup(); mutation(context.ledger); await denied(() => f.session.deleteSameRunDisposableBranch(context));
  }
  check(f.calls.filter(c => c.method === "DELETE").length, 0);
  // 21-36: no origin override; every path-bearing argument is strict ASCII ID only.
  const attacks = ["https://evil.invalid", "http://console.neon.tech", `${base}/branches/${id}`, "//console.neon.tech/anything",
    "https://user:pass@console.neon.tech", "https://console.neon.tech@evil.invalid", "br-x/../y", "br-x/%2e%2e/y", "br-x%2fy",
    "br-x%5cy", "br-x\\y", "br-x//y", "br-x?method=DELETE", "br-x#fragment", "br-x%QQ", "br-x\0", "br-x\n", "br-x\r",
    "br-x\t", "br-x/roles", "br-x/", "br-x\u2215y", "br-x\uff0fy", "br-\u2028x", "../", "", "%", "br-x%252fsecret"];
  for (const value of attacks) {
    const before = f.calls.length;
    for (const operation of ["getBranch", "listBranchEndpoints", "listBranchDatabases"])
      await denied(() => f.provider[operation](value));
    check(f.calls.length, before);
    await denied(async () => createNeonProvider({ project, apiKey: key, origin: value }));
  }
  // 38-41: create accepts no arbitrary JSON; every reviewed field is bound to disk/hash.
  for (const body of [{}, { name: "wrong" }, { parent_id: "br-wrong" }, { endpoints: [{ type: "read_only" }] },
    { region_id: "aws-us-east-1" }, { protected: true }, { init_source: "parent-data" }, { expires_at: "2030-01-01" }])
    await denied(() => f.session.createDisposableBranch(body));
  for (const field of ["name", "sourceBranch", "parent_id", "init_source", "protected", "default", "project", "region", "endpoints", "compute", "expires_at"]) {
    const altered = clone(manifest); altered.operations[0].expectedTarget[field] = "unapproved";
    const g = fixture(); await denied(() => g.provider.beginRehearsal({ manifest: altered, authorization: REHEARSAL.authorization, runId: randomUUID() }));
    check(g.calls.length, 0);
  }
  // 43: ambiguous POST is reconciled read-only and cannot mint authority or retry.
  for (const option of ["postAmbiguous", "malformed"]) {
    f = fixture({ [option]: true }); await f.start();
    await denied(() => f.session.createDisposableBranch()); await denied(() => f.session.createDisposableBranch());
    check(f.calls.filter(c => c.method === "POST").length, 1);
    check(f.session.getCreationReceipt(), undefined);
    check(await f.session.reconcileMutation(), "CREATE_NAME_PRESENT_NO_RECEIPT_AUTHORITY");
  }
  // 44: ambiguous DELETE is read-only reconciled, never repeated even after 404.
  for (const keepAfterDelete of [false, true]) {
    f = fixture({ deleteAmbiguous: true, keepAfterDelete }); await f.create();
    await denied(() => f.session.deleteSameRunDisposableBranch(f.cleanup()));
    await denied(() => f.session.deleteSameRunDisposableBranch(f.cleanup()));
    check(f.calls.filter(c => c.method === "DELETE").length, 1);
    check(f.session.status().reconciliation, keepAfterDelete ? "DELETE_TARGET_STILL_PRESENT_NO_RETRY" : "DELETE_ABSENCE_CONFIRMED");
  }
  // 45-48: synthetic URI/header/key/error body never reaches diagnostics/evidence.
  for (const options of [{ readError: true }, { httpError: 401 }, { httpError: 429 }, { httpError: 503 }, { redirect: true }]) {
    f = fixture(options); await denied(() => f.provider.getProjectMetadata()); check(f.calls.length, 1);
  }
  for (const uri of [password, `postgresql://pyramid_owner:${password}@evil.invalid/pyramid_design`,
    `postgresql://pyramid_owner:${password}@${host}/pyramid_design?options=secret`,
    `postgresql://pyramid_owner:${password}@${host}/pyramid_design?sslmode=require&sslmode=disable`]) {
    f = fixture({ uri }); await f.create(); await denied(() => f.session.withBootstrapConnection(f.receipt, async () => assert.fail()));
  }
  f = fixture(); await f.create();
  await denied(() => f.session.withBootstrapConnection(f.receipt, async url => { throw new Error(url.href); }));
  await f.session.withBootstrapConnection(f.receipt, async () => {
    await denied(() => f.session.deleteSameRunDisposableBranch(f.cleanup()), /CLEANUP_CONNECTIONS_NOT_CLOSED/);
    await denied(() => f.session.withBootstrapConnection(f.receipt, async () => {}), /BOOTSTRAP_CONTEXT_DENIED/);
  });
  check(f.calls.filter(c => c.method === "DELETE").length, 0);
  check(!JSON.stringify(f.receipt).includes(password) && !JSON.stringify(f.receipt).includes(key));
  check(Object.isFrozen(f.receipt) && Object.isFrozen(f.receipt.resources) && Object.isFrozen(f.receipt.resources[0]));
  // Fresh metadata, partial cleanup, closed credentials, collision and pagination.
  for (const [field, value] of [["id", REHEARSAL.deniedBranches[0]], ["name", REHEARSAL.deniedNames[0]], ["name", "wrong-name"],
    ["default", true], ["protected", true], ["parent_id", "br-other"], ["created_at", "2026-01-01T00:00:00Z"], ["project_id", "other"]]) {
    f = fixture(); await f.create(); f.branch[field] = value;
    await denied(() => f.session.deleteSameRunDisposableBranch(f.cleanup())); check(f.calls.filter(c => c.method === "DELETE").length, 0);
  }
  f = fixture({ badCompute: true }); await f.start(); await denied(() => f.session.createDisposableBranch());
  f.receipt = f.session.getCreationReceipt(); check(f.receipt.resources.length, 1);
  check((await f.session.deleteSameRunDisposableBranch(f.cleanup())).absenceConfirmed);
  for (const options of [{ collision: true }, { paginated: true }]) {
    f = fixture(options); await f.start(); await denied(() => f.session.createDisposableBranch());
    check(f.calls.filter(c => c.method === "POST").length, 0); check(f.session.status().creationAttempted, false);
  }
  f = fixture(); f.provider.close(); await denied(() => f.provider.getProjectMetadata()); check(f.calls.length, 0);
  for (const deleteStatus of [200, 204]) {
    f = fixture({ deleteStatus }); await f.create(); check((await f.session.deleteSameRunDisposableBranch(f.cleanup())).absenceConfirmed);
  }
  f = fixture({ keepAfterDelete: true }); await f.create();
  await denied(() => f.session.deleteSameRunDisposableBranch(f.cleanup()), /CLEANUP_ABSENCE_NOT_PROVEN/);
  await denied(() => f.session.deleteSameRunDisposableBranch(f.cleanup()), /DELETE_RETRY_DENIED/);
  check(f.calls.filter(c => c.method === "DELETE").length, 1);
  for (const target of REHEARSAL.deniedBranches) {
    f = fixture({ createdBranch: { id: target, project_id: project, name: REHEARSAL.branchName } }); await f.start();
    await denied(() => f.session.createDisposableBranch()); check(f.session.getCreationReceipt(), undefined);
  }
  f = fixture(); await f.create();
  const foreignSession = await fixture().start();
  await denied(() => foreignSession.session.deleteSameRunDisposableBranch(f.cleanup()), /SAME_RUN_CREATION_RECEIPT_REQUIRED/);
  for (const corrupt of [value => value.endpoint.id = "ep-other", value => value.endpoint.project_id = "other",
    value => value.endpoint.created_at = "2026-01-01T00:00:00Z", value => value.branch.name = "wrong-name"]) {
    f = fixture(); await f.create(); corrupt(f);
    await denied(() => f.session.withBootstrapConnection(f.receipt, async () => {}));
    check(f.calls.filter(c => c.url.includes("connection_uri")).length, 0);
  }
  for (const action of ["create", "delete"]) {
    f = fixture(); await f.start();
    if (action === "delete") f.receipt = await f.session.createDisposableBranch();
    const results = await Promise.allSettled(Array.from({ length: 2 }, () => action === "create" ? f.session.createDisposableBranch() :
      f.session.deleteSameRunDisposableBranch(f.cleanup())));
    check(results.filter(r => r.status === "fulfilled").length, 1);
    check(f.calls.filter(c => c.method === (action === "create" ? "POST" : "DELETE")).length, 1);
  }
  f = fixture(); const runId = randomUUID();
  const starts = await Promise.allSettled(Array.from({ length: 2 }, () => f.provider.beginRehearsal({ manifest, runId, authorization: REHEARSAL.authorization })));
  check(starts.filter(r => r.status === "fulfilled").length, 1);
  f = fixture(); const tls = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  try { process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; await denied(() => f.provider.getProjectMetadata()); check(f.calls.length, 0); }
  finally { if (tls === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED; else process.env.NODE_TLS_REJECT_UNAUTHORIZED = tls; }
  await validateReviewedManifest(manifest); checks++;
  f = fixture(); check((await lifecycle(["--dry-run"], {})).providerCalls, 0);
  await denied(() => lifecycle(["--execute-rehearsal"], {}));
  await denied(() => lifecycle(["--execute-rehearsal", "--force"], {})); check(f.calls.length, 0);
  console.log(`P3_PROVIDER_BOUNDARY_OFFLINE_OK checks=${checks} live_provider_calls=0 database_connections=0`);
} finally { globalThis.fetch = realFetch; }

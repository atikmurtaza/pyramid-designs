import assert from "node:assert/strict";
import { mock } from "node:test";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { REHEARSAL } from "./neon-rehearsal-manifest.mjs";
import * as target from "./neon-rehearsal-target.mjs";
import { childEnvironment } from "./run-phase-b4b1-neon.mjs";

// Node's test-only module mocks substitute every SQL, child-process and suite
// effect. Production code has no injectable authorization bypass/test CLI flag.
let checks = 0, state;
const check = (actual, expected = true) => { assert.deepEqual(actual, expected); checks++; };
const project = REHEARSAL.project, branchId = "br-offline-lifecycle", endpointId = "ep-offline-lifecycle";
const apiKey = "synthetic-lifecycle-key-canary", password = "synthetic-lifecycle-uri-canary";
const origin = `https://console.neon.tech/api/v2/projects/${project}`;
class OfflineClient {
  constructor(options) {
    const url = new URL(options.connectionString);
    assert.equal(url.hostname, `${endpointId}.ap-southeast-1.aws.neon.tech`);
    assert.equal(url.username, "pyramid_owner"); assert.equal(url.search, "?sslmode=verify-full");
    this.connection = { stream: { encrypted: true, authorized: true } };
  }
  on() {}
  async connect() { state.connections++; state.open++; }
  async end() { state.open--; }
  async query(sql) {
    assert.equal(state.open, 1); assert(state.created && !state.deleted);
    if (sql.startsWith("SELECT current_database()")) return { rows: [{ database: "pyramid_design", current_user: "pyramid_owner",
      session_user: "pyramid_owner", version: "170011", ssl: true }] };
    assert(/^(CREATE ROLE|CREATE DATABASE|GRANT |REVOKE )/.test(sql));
    state.sql.push(sql.replace(/PASSWORD '[^']+'/g, "PASSWORD '[synthetic credential omitted]'"));
    if (state.fail === "sql") throw new Error(password);
    return { rows: [] };
  }
}
mock.module("pg", { defaultExport: { Client: OfflineClient } });
mock.module("node:child_process", { namedExports: { execFileSync(command, args) {
  assert.equal(command, "git"); assert.deepEqual(args, ["status", "--porcelain"]); return "";
} } });
mock.module("./neon-rehearsal-target.mjs", { namedExports: { ...target,
  roleFacts: async () => ({ roles: ["anon", "authenticated"].map(rolname => ({ rolname, rolcanlogin: false,
    rolinherit: false, rolconfig: null, rolsuper: false, rolcreatedb: false, rolcreaterole: false, rolreplication: false, rolbypassrls: false })),
  memberships: [], ownership: [] }),
  remoteContext: async (_env, suite, stage) => { assert.equal(stage, "current"); state.stages.push(`${suite}-runtime-acceptance`); },
} });
mock.module("./run-phase-b4b1-neon.mjs", { namedExports: { childEnvironment,
  main: async (args, env) => {
    state.stages.push(args[0]);
    assert.equal(env.P3_BRANCH_ID, branchId);
    for (const suite of ["B1", "B2"]) {
      const url = new URL(env[`P3_${suite}_OPERATOR_URL`]);
      assert.equal(url.hostname, `${endpointId}.ap-southeast-1.aws.neon.tech`);
      assert.equal(url.username, REHEARSAL.suites[suite.toLowerCase()].owner);
    }
    if (args[0] === "--verify") {
      assert.equal(state.open, 0);
      for (const suite of ["B1", "B2"]) assert.equal(new URL(env[`P3_${suite}_RUNTIME_URL`]).hostname,
        `${endpointId}-pooler.ap-southeast-1.aws.neon.tech`);
    }
    if (state.fail === args[0]) throw new Error(password);
  },
} });
const { lifecycle } = await import("./run-phase-b4b1-neon-lifecycle.mjs");
const realFetch = globalThis.fetch;
const directory = await mkdtemp(join(tmpdir(), "pyramid-h2-offline-lifecycle-"));
try {
  for (const fail of [undefined, "sql", "--migrate", "--verify", "post", "delete", "compute"]) {
    state = { fail, calls: [], sql: [], stages: [], connections: 0, open: 0, created: false, deleted: false };
    const stamp = new Date().toISOString();
    const branch = { id: branchId, project_id: project, name: REHEARSAL.branchName, default: false, protected: false,
      init_source: "schema-only", created_at: stamp, current_state: "ready" };
    const endpoint = { id: endpointId, branch_id: branchId, project_id: project, host: `${endpointId}.ap-southeast-1.aws.neon.tech`,
      region_id: REHEARSAL.region, type: "read_write", disabled: false, passwordless_access: true, current_state: "active", created_at: stamp };
    globalThis.fetch = async (url, options) => {
      assert.equal(options.redirect, "error"); assert.equal(options.headers.Authorization, `Bearer ${apiKey}`);
      state.calls.push({ url, method: options.method });
      const reply = (status, data) => ({ status, url, json: async () => structuredClone(data) });
      if (url === origin) return reply(200, { project: { id: project, pg_version: 17, region_id: REHEARSAL.region } });
      if (url === `${origin}/branches` && options.method === "GET") return reply(200, { branches: [
        ...REHEARSAL.deniedBranches.map((id, index) => ({ ...branch, id, name: REHEARSAL.deniedNames[index], default: index === 0 })),
        ...(state.created && !state.deleted ? [branch] : []),
      ] });
      if (url === `${origin}/branches` && options.method === "POST") {
        assert.equal(state.calls.filter(c => c.method === "POST").length, 1);
        state.created = true;
        if (fail === "post") throw new Error(apiKey);
        return reply(201, { branch, endpoints: fail === "compute" ? [] : [endpoint] });
      }
      if (url === `${origin}/branches/${branchId}` && options.method === "DELETE") {
        assert.equal(state.open, 0);
        // Successful evidence write must precede the destructive call.
        const run = (await readdir(directory)).at(-1);
        assert(run); // Individual result/ledger contents verified below.
        state.deleted = true;
        if (fail === "delete") throw new Error(password);
        return reply(204, {});
      }
      if (url === `${origin}/branches/${branchId}`) return reply(state.deleted ? 404 : 200, { branch });
      if (url.endsWith("/endpoints")) return reply(200, { endpoints: [endpoint] });
      if (url.endsWith("/databases")) return reply(200, { databases: [{ name: "pyramid_design", owner_name: "pyramid_owner", branch_id: branchId }] });
      if (url.startsWith(`${origin}/connection_uri?`)) return reply(200, {
        uri: `postgresql://pyramid_owner:${password}@${endpoint.host}/pyramid_design?sslmode=require`,
      });
      throw new Error("UNEXPECTED_OFFLINE_PROVIDER_REQUEST");
    };
    const result = await lifecycle(["--execute-rehearsal"], { P3_REHEARSAL_AUTHORIZATION: REHEARSAL.authorization,
      P3_PROJECT_ID: project, P3_NEON_API_KEY: apiKey, P3_EVIDENCE_DIRECTORY: directory });
    check(result.status, fail === "post" || fail === "delete" ? "OWNER ACTION REQUIRED" : fail ? "FAIL" : "PASS");
    check(state.open, 0); check(state.calls.filter(c => c.method === "POST").length, 1);
    check(state.calls.filter(c => c.method === "DELETE").length, fail === "post" ? 0 : 1);
    for (const file of await readdir(result.evidenceDirectory)) {
      const text = await readFile(join(result.evidenceDirectory, file), "utf8");
      check(!text.includes(apiKey) && !text.includes(password) && !text.includes("postgresql://"));
    }
    if (!fail) {
      check(state.stages, ["--preflight", "--migrate", "b1-runtime-acceptance", "b2-runtime-acceptance", "--verify", "--final-check"]);
      check(state.sql.filter(s => s.startsWith("CREATE DATABASE")).length, 2);
      check(state.sql.filter(s => s.startsWith("CREATE ROLE")).length, 8);
      check(state.connections, 2);
      const ledger = JSON.parse(await readFile(join(result.evidenceDirectory, "ledger.json"), "utf8"));
      check(ledger.resources.length, 12);
      check(ledger.resources.filter(r => r.kind === "role").length, 8);
    } else if (fail === "sql" || fail === "--migrate") check(!state.stages.includes("--verify"));
  }
  console.log(`P3_LIFECYCLE_OFFLINE_OK checks=${checks} scenarios=7 live_provider_calls=0 database_connections=0 sql_executed=0`);
} finally {
  globalThis.fetch = realFetch; mock.restoreAll();
  // Only the freshly generated test directory under OS temp is removed.
  await rm(directory, { recursive: true });
}

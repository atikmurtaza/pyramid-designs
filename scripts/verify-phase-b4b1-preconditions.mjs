import assert from "node:assert/strict";
import { inspect } from "node:util";
import { createNeonProvider, PROVIDER_OPERATIONS } from "./neon-rehearsal-provider.mjs";
import { REHEARSAL } from "./neon-rehearsal-manifest.mjs";

// Offline only: real transport is never called and no SQL client is used.
const originalFetch = globalThis.fetch;
const key = "synthetic-h4-api-key-canary", secret = "synthetic-h4-secret-canary";
const root = `https://console.neon.tech/api/v2/projects/${REHEARSAL.project}`;
const source = REHEARSAL.deniedBranches[0], endpointId = "ep-offline-h4";
const operations = ["getProjectPreconditions", "getSourceBranchPreconditions", "getSourceEndpointPreconditions"];
let checks = 0, calls = [];
const check = (condition, label) => { assert(condition, label); checks++; };
function fixture() {
  return {
    project: { id: REHEARSAL.project, pg_version: 17, region_id: REHEARSAL.region,
      owner: { subscription_type: "free_v3", branches_limit: 10, email: secret, name: key },
      org_id: secret, effective_project_permission: "EDITOR", maintenance_scheduled_for: "2026-10-02T00:00:00Z",
      settings: { quota: { compute_time_seconds: 360000, logical_size_bytes: 1073741824 }, allowed_ips: secret },
      compute_time_seconds: 123, synthetic_storage_size: 1024, api_key: key },
    branch: { id: source, project_id: REHEARSAL.project, name: REHEARSAL.deniedNames[0], default: true,
      protected: false, init_source: "parent-data", current_state: "ready", created_at: "2026-09-10T16:22:21Z",
      restricted_actions: [{ name: "restore", reason: secret }, { name: key, reason: secret }], password: secret },
    endpoints: [{ id: endpointId, branch_id: source, project_id: REHEARSAL.project, region_id: REHEARSAL.region,
      host: `${endpointId}.ap-southeast-1.aws.neon.tech`, type: "read_write", current_state: "idle", disabled: false,
      passwordless_access: true, created_at: "2026-09-10T16:22:21Z", connection_uri: secret }],
    connection_uris: [secret],
  };
}
function setup(data = fixture(), options = {}, credential = key) {
  calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, method: init.method });
    check(init.method === "GET" && !init.body, "GET only");
    check(init.redirect === "error" && init.signal instanceof AbortSignal, "transport guards");
    check(init.headers.Authorization === `Bearer ${credential}`, "header authentication");
    check([root, `${root}/branches/${source}`, `${root}/branches/${source}/endpoints`].includes(url), "exact approved paths");
    return { status: 200, redirected: options.redirect ?? false,
      url: options.foreignUrl ? "https://evil.invalid/" : url, json: async () => structuredClone(data) };
  };
  return createNeonProvider({ project: REHEARSAL.project, apiKey: credential });
}
async function denied(fn) {
  let error;
  try { await fn(); } catch (caught) { error = caught; }
  check(error instanceof Error && /^[A-Z][A-Z0-9_]+$/.test(error.message), "fixed refusal");
  check(![key, secret].some(value => (String(error) + JSON.stringify(error) + inspect(error)).includes(value)), "secret-free refusal");
}
try {
  let provider = setup();
  const project = await provider.getProjectPreconditions();
  const branch = await provider.getSourceBranchPreconditions();
  const endpoints = await provider.getSourceEndpointPreconditions();
  check(project.subscription_type === "free_v3" && project.effective_project_permission === "EDITOR", "documented plan and permission");
  check(project.owner_branches_limit === 10 && project.quota.compute_time_seconds === 360000, "documented numeric quotas");
  check(branch.restricted_actions.total === 2 && branch.restricted_actions.unprojected_count === 1 &&
    branch.restricted_actions.documented_names.join() === "restore", "unrestricted reasons and names omitted");
  check(endpoints[0].rehearsal_host_binding_matches === true && endpoints[0].current_state === "idle", "source comparison");
  check(![key, secret].some(value => JSON.stringify({ project, branch, endpoints }).includes(value)), "secret canaries excluded");
  check(!Object.hasOwn(project, "org_id") && !Object.hasOwn(project, "owner") && !Object.hasOwn(endpoints[0], "host"), "minimal output");
  check(calls.length === 3 && calls.every(call => call.method === "GET"), "no mutation transport");
  check(Object.keys(await provider.getProjectMetadata()).sort().join() === "id,pg_version,region_id", "existing project projection unchanged");
  provider.close();

  for (const operation of operations) {
    check(PROVIDER_OPERATIONS[operation][0] === "GET", "operation method binding");
    for (const input of [source, REHEARSAL.deniedBranches[1], "br-foreign", "../", "https://evil.invalid", { method: "POST" }, { path: "/organizations/x" }, undefined]) {
      provider = setup(); await denied(() => provider[operation](input));
      check(calls.length === 0, "caller arguments denied before transport"); provider.close();
    }
    provider = setup(); provider.close(); await denied(() => provider[operation]()); check(calls.length === 0, "closed credential denied");
    for (const option of [{ redirect: true }, { foreignUrl: true }]) {
      provider = setup(fixture(), option); await denied(() => provider[operation]()); provider.close();
    }
  }
  const bad = [
    ["getProjectPreconditions", d => { d.project.id = "foreign"; }],
    ["getProjectPreconditions", d => { d.project.pg_version = 16; }],
    ["getProjectPreconditions", d => { d.project.region_id = "aws-us-east-1"; }],
    ["getProjectPreconditions", d => { d.project.owner.subscription_type = secret; }],
    ["getProjectPreconditions", d => { d.project.owner.branches_limit = -1; }],
    ["getProjectPreconditions", d => { d.project.effective_project_permission = secret; }],
    ["getProjectPreconditions", d => { d.project.settings.quota.compute_time_seconds = secret; }],
    ["getProjectPreconditions", d => { d.project.synthetic_storage_size = Number.MAX_SAFE_INTEGER + 1; }],
    ["getProjectPreconditions", d => { d.project.maintenance_starts_at = secret; }],
    ["getSourceBranchPreconditions", d => { d.branch.id = REHEARSAL.deniedBranches[1]; }],
    ["getSourceBranchPreconditions", d => { d.branch.project_id = "foreign"; }],
    ["getSourceBranchPreconditions", d => { d.branch.name = REHEARSAL.deniedNames[1]; }],
    ["getSourceBranchPreconditions", d => { d.branch.pending_state = secret; }],
    ["getSourceBranchPreconditions", d => { d.branch.restricted_actions = [{ name: "restore", reason: {} }]; }],
    ["getSourceBranchPreconditions", d => { d.branch.restricted_actions = Array(65).fill({ name: "restore", reason: secret }); }],
    ["getSourceEndpointPreconditions", d => { d.endpoints[0].branch_id = REHEARSAL.deniedBranches[1]; }],
    ["getSourceEndpointPreconditions", d => { d.endpoints[0].project_id = "foreign"; }],
    ["getSourceEndpointPreconditions", d => { d.endpoints[0].region_id = "aws-us-east-1"; }],
    ["getSourceEndpointPreconditions", d => { d.endpoints[0].id = secret; }],
    ["getSourceEndpointPreconditions", d => { d.endpoints[0].type = secret; }],
    ["getSourceEndpointPreconditions", d => { d.endpoints[0].disabled = secret; }],
    ["getSourceEndpointPreconditions", d => { d.endpoints[0].passwordless_access = secret; }],
    ["getSourceEndpointPreconditions", d => { d.endpoints[0].current_state = secret; }],
    ["getSourceEndpointPreconditions", d => { d.endpoints = {}; }],
  ];
  for (const [operation, change] of bad) {
    const data = fixture(); change(data); provider = setup(data);
    await denied(() => provider[operation]()); provider.close();
  }
  const missing = fixture(); delete missing.project.owner; delete missing.project.settings;
  delete missing.project.effective_project_permission; delete missing.branch.restricted_actions;
  provider = setup(missing);
  check(!Object.hasOwn(await provider.getProjectPreconditions(), "subscription_type"), "missing plan remains unknown");
  check(!Object.hasOwn(await provider.getSourceBranchPreconditions(), "restricted_actions"), "absent restrictions remain unexposed"); provider.close();
  for (const [operation, credential] of [["getProjectPreconditions", "free_v3"], ["getSourceBranchPreconditions", "parent-data"], ["getSourceEndpointPreconditions", "read_write"]]) {
    provider = setup(fixture(), {}, credential); await denied(() => provider[operation]()); provider.close();
  }
  const mismatch = fixture(); mismatch.endpoints[0].host = secret; mismatch.endpoints[0].disabled = true;
  provider = setup(mismatch);
  check((await provider.getSourceEndpointPreconditions())[0].rehearsal_host_binding_matches === false, "host mismatch comparison only");
  await denied(() => provider.listBranchEndpoints(source)); provider.close();
  const routed = fixture(); routed.endpoints[0].host = `${endpointId}.c-2.ap-southeast-1.aws.neon.tech`;
  provider = setup(routed);
  const routing = (await provider.getSourceEndpointPreconditions())[0];
  check(routing.documented_c2_host_binding_matches && !routing.rehearsal_host_binding_matches, "documented routing comparison");
  await denied(() => provider.listBranchEndpoints(source)); provider.close();
  const priorTls = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    for (const operation of operations) { provider = setup(); await denied(() => provider[operation]()); check(calls.length === 0, "TLS refusal before transport"); provider.close(); }
  } finally {
    if (priorTls === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED; else process.env.NODE_TLS_REJECT_UNAUTHORIZED = priorTls;
  }
  console.log(`B4B1_PRECONDITIONS_OFFLINE_OK checks=${checks} provider_mutations=0 database_connections=0`);
} finally { globalThis.fetch = originalFetch; }

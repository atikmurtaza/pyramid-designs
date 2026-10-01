import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import { REHEARSAL, requireSafe, mutationManifest, validateLedger } from "./neon-rehearsal-manifest.mjs";

export const MANIFEST_SHA256 = "28ae551e32af7f8f009d23b7521b93706d93d03529e15e0d6059b49163ba2eb8";
const ORIGIN = "https://console.neon.tech";
const PROJECT = "withered-feather-01662312";
const ROOT = `/api/v2/projects/${PROJECT}`;
// No caller can supply a method, URL, path, query, body or transport options.
export const PROVIDER_OPERATIONS = Object.freeze(Object.fromEntries(Object.entries({
  getProjectMetadata: ["GET", "project"], listBranches: ["GET", "branches"],
  getBranch: ["GET", "branch"], listBranchEndpoints: ["GET", "endpoints"],
  listBranchDatabases: ["GET", "databases"], getConnectionUri: ["GET", "connection_uri"],
  createDisposableBranch: ["POST", "branches"], deleteSameRunDisposableBranch: ["DELETE", "branch"],
}).map(([key, value]) => [key, Object.freeze(value)])));

function exactKeys(value, keys) {
  requireSafe(value && Object.getPrototypeOf(value) === Object.prototype &&
    Reflect.ownKeys(value).length === keys.length && Object.keys(value).sort().join() === [...keys].sort().join() &&
    keys.every(key => Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), "value")), "PROVIDER_INPUT_DENIED");
}
function noArgs(args) { requireSafe(args.length === 0, "PROVIDER_INPUT_DENIED"); }
function branchId(value) {
  requireSafe(typeof value === "string" && /^br-[a-z0-9-]{1,57}$/.test(value), "PROVIDER_BRANCH_ID_DENIED");
  return value;
}
function disposableId(value) {
  branchId(value);
  requireSafe(!REHEARSAL.deniedBranches.includes(value), "PROTECTED_BRANCH_DENIED");
  return value;
}
const pick = (object, fields) => Object.fromEntries(fields.filter(key => object?.[key] !== undefined).map(key => [key, object[key]]));
const projectFields = ["id", "pg_version", "region_id"];
const branchFields = ["id", "project_id", "name", "default", "protected", "init_source", "parent_id", "current_state", "created_at"];
const endpointFields = ["id", "host", "branch_id", "project_id", "region_id", "type", "disabled", "passwordless_access", "current_state", "created_at"];
function createdAt(value) {
  requireSafe(typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(value) &&
    Number.isFinite(Date.parse(value)), "PROVIDER_TIMESTAMP_DENIED");
  return new Date(value).toISOString();
}
function projectProjection(value) {
  requireSafe(value?.id === PROJECT && value.pg_version === 17 && value.region_id === REHEARSAL.region, "PROVIDER_PROJECT_MISMATCH");
  return pick(value, projectFields);
}
function branchProjection(value) {
  branchId(value?.id);
  requireSafe(value.project_id === PROJECT && typeof value.name === "string" &&
    /^[a-zA-Z0-9_-]{1,256}$/.test(value.name) && typeof value.default === "boolean" && typeof value.protected === "boolean" &&
    ["schema-only", "parent-data", "parent-schema", "import"].includes(value.init_source) &&
    ["init", "initializing", "creating", "ready", "archived", "deleting"].includes(value.current_state) &&
    (!value.parent_id || /^br-[a-z0-9-]{1,57}$/.test(value.parent_id)), "PROVIDER_BRANCH_MISMATCH");
  return { ...pick(value, branchFields), created_at: createdAt(value.created_at) };
}
function endpointProjection(value, id) {
  requireSafe(value?.branch_id === id && value.project_id === PROJECT && /^ep-[a-z0-9-]{1,57}$/.test(value.id) &&
    value.host === `${value.id}.ap-southeast-1.aws.neon.tech` && value.region_id === REHEARSAL.region &&
    value.type === "read_write" && value.disabled === false && typeof value.passwordless_access === "boolean",
  "PROVIDER_COMPUTE_MISMATCH");
  requireSafe(["init", "active", "idle"].includes(value.current_state), "PROVIDER_COMPUTE_MISMATCH");
  return { ...pick(value, endpointFields), created_at: createdAt(value.created_at) };
}
function identity(branch, ledger, ready = false) {
  disposableId(branch?.id);
  validateLedger(ledger, ledger.runId, branch.id, false);
  requireSafe(branch.project_id === PROJECT && branch.id === ledger.branchId && branch.name === REHEARSAL.branchName &&
    !REHEARSAL.deniedNames.includes(branch.name) && branch.default === false && branch.protected === false &&
    branch.init_source === "schema-only" && !branch.parent_id && (!ready || branch.current_state === "ready") &&
    Date.parse(branch.created_at) === Date.parse(ledger.resources.find(r => r.kind === "branch").createdAt),
  "PROVIDER_CREATION_IDENTITY_MISMATCH");
}

export async function validateReviewedManifest(manifest) {
  const bytes = await readFile(new URL("./neon-rehearsal-mutation-manifest.json", import.meta.url));
  requireSafe(createHash("sha256").update(bytes).digest("hex") === MANIFEST_SHA256, "MANIFEST_HASH_CHANGED");
  const reviewed = JSON.parse(bytes);
  requireSafe(isDeepStrictEqual(manifest, reviewed) && isDeepStrictEqual(await mutationManifest(), reviewed) &&
    reviewed.project === PROJECT && reviewed.operations.length === 55 && reviewed.authorization === "REQUEST_ONLY_NOT_EXECUTED",
  "REVIEWED_MANIFEST_SOURCE_CHANGED");
  return reviewed;
}

// Errors contain only local classifications and an allowlisted operation/method/status.
// Never retain a transport error, response text, headers, URI or `cause`.
function failure(operation, status, classification) {
  const error = new Error(`PROVIDER_${classification}`);
  error.diagnostic = Object.freeze({ operation, method: PROVIDER_OPERATIONS[operation][0],
    status: Number.isInteger(status) ? status : null, classification });
  return error;
}

export function createNeonProvider(config) {
  exactKeys(config, ["project", "apiKey"]);
  requireSafe(config.project === PROJECT && REHEARSAL.project === PROJECT, "PROJECT_DENIED");
  requireSafe(typeof config.apiKey === "string" && config.apiKey.trim().length > 0 &&
    !/[\x00-\x20\x7f]/.test(config.apiKey), "PROVIDER_METADATA_CREDENTIAL_REQUIRED");
  let apiKey = config.apiKey, sessionStarted = false;
  const transport = globalThis.fetch;

  async function request(operation, id, body, query) {
    requireSafe(apiKey && Object.hasOwn(PROVIDER_OPERATIONS, operation), "PROVIDER_OPERATION_DENIED");
    requireSafe(process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0", "TLS_CONFIGURATION_DENIED");
    const [method, resource] = PROVIDER_OPERATIONS[operation];
    const path = resource === "project" ? ROOT : resource === "branches" ? `${ROOT}/branches` :
      resource === "connection_uri" ? `${ROOT}/connection_uri` :
        `${ROOT}/branches/${branchId(id)}${resource === "branch" ? "" : `/${resource}`}`;
    const url = new URL(path, ORIGIN);
    requireSafe(url.origin === ORIGIN && url.protocol === "https:" && !url.username && !url.password &&
      url.pathname === path && !url.search && !url.hash && path.startsWith(ROOT + (path === ROOT ? "" : "/")), "PROVIDER_URL_DENIED");
    if (query) url.search = new URLSearchParams(query).toString();
    let status = null;
    const mutation = method !== "GET";
    try {
      const response = await transport(url.href, { method, redirect: "error",
        headers: { Authorization: `Bearer ${apiKey}`, ...(body ? { "Content-Type": "application/json" } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30_000) });
      status = response.status;
      requireSafe(!response.redirected && (!response.url || response.url === url.href), "PROVIDER_REDIRECT_DENIED");
      const accepted = operation === "createDisposableBranch" ? [201] : operation === "deleteSameRunDisposableBranch" ? [200, 204] : [200];
      if (!accepted.includes(status)) throw failure(operation, status, mutation ? "MUTATION_RECONCILIATION_REQUIRED" : "READ_FAILED");
      // DELETE payloads are unnecessary and may contain sensitive provider fields.
      if (operation === "deleteSameRunDisposableBranch") return undefined;
      const data = await response.json();
      requireSafe(data && typeof data === "object" && !Array.isArray(data), "PROVIDER_RESPONSE_DENIED");
      return data;
    } catch {
      throw failure(operation, status, mutation ? "MUTATION_RECONCILIATION_REQUIRED" : "READ_FAILED");
    }
  }

  const reads = {
    async getProjectMetadata(...args) { noArgs(args); return projectProjection((await request("getProjectMetadata")).project); },
    async listBranches(...args) {
      noArgs(args);
      const data = await request("listBranches");
      // Never use a truncated inventory to authorize creation or prove absence.
      requireSafe(Array.isArray(data.branches) && !data.pagination?.cursor && !data.next_cursor, "PROVIDER_INVENTORY_INCOMPLETE");
      return data.branches.map(branchProjection);
    },
    async getBranch(id, ...args) {
      noArgs(args); branchId(id);
      const branch = branchProjection((await request("getBranch", id)).branch);
      requireSafe(branch.id === id, "PROVIDER_BRANCH_MISMATCH"); return branch;
    },
    async listBranchEndpoints(id, ...args) {
      noArgs(args); branchId(id);
      const data = await request("listBranchEndpoints", id);
      requireSafe(Array.isArray(data.endpoints), "PROVIDER_COMPUTE_MISMATCH");
      return data.endpoints.map(value => endpointProjection(value, id));
    },
    async listBranchDatabases(id, ...args) {
      noArgs(args); branchId(id);
      const data = await request("listBranchDatabases", id);
      requireSafe(Array.isArray(data.databases) && data.databases.every(value => value.branch_id === id &&
        /^[a-z][a-z0-9_]{0,62}$/.test(value.name) && /^[a-z][a-z0-9_]{0,62}$/.test(value.owner_name)), "PROVIDER_DATABASE_METADATA_MISMATCH");
      return data.databases.map(value => pick(value, ["name", "owner_name", "branch_id"]));
    },
  };

  async function beginRehearsal(input, ...args) {
    noArgs(args); exactKeys(input, ["manifest", "authorization", "runId"]);
    requireSafe(!sessionStarted, "PROVIDER_SESSION_ALREADY_STARTED");
    requireSafe(input.authorization === REHEARSAL.authorization, "REHEARSAL_AUTHORIZATION_REQUIRED");
    requireSafe(typeof input.runId === "string" && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(input.runId), "RUN_ID_REQUIRED");
    const runId = input.runId;
    sessionStarted = true;
    const manifest = await validateReviewedManifest(input.manifest);
    let createStarted = false, deleteStarted = false, bootstrapBusy = false, creationAttempted = false, deletionAttempted = false, receipt, reconciliation = "NOT_REQUIRED";
    const creation = manifest.operations.find(op => op.id === "branch-create").expectedTarget;
    // The reviewed source ID becomes parent_id on the wire; schema-only returns a root.
    // Optional Early Access expiration is intentionally omitted, as in retained R1.
    const body = { branch: { name: creation.name, parent_id: creation.sourceBranch,
      init_source: creation.init_source, protected: creation.protected }, endpoints: [{ type: "read_write" }] };
    function requireReceipt(candidate) {
      requireSafe(receipt && candidate === receipt && candidate.runId === runId, "SAME_RUN_CREATION_RECEIPT_REQUIRED");
      disposableId(receipt.branchId);
      validateLedger(receipt, runId, receipt.branchId, false);
    }
    async function reconcile() {
      // Observations never mint a receipt or re-enable POST/DELETE.
      if (deletionAttempted && receipt) {
        try { identity(await reads.getBranch(receipt.branchId), receipt); reconciliation = "DELETE_TARGET_STILL_PRESENT_NO_RETRY"; }
        catch (error) {
          reconciliation = error.diagnostic?.status === 404 ? "DELETE_ABSENCE_CONFIRMED" : "DELETE_OUTCOME_UNKNOWN";
        }
      } else if (creationAttempted) {
        try { reconciliation = (await reads.listBranches()).some(b => b.name === creation.name) ?
          "CREATE_NAME_PRESENT_NO_RECEIPT_AUTHORITY" : "CREATE_NAME_ABSENT_NO_RETRY"; }
        catch { reconciliation = "CREATE_OUTCOME_UNKNOWN"; }
      }
      return reconciliation;
    }
    return Object.freeze({
      async createDisposableBranch(...args) {
        noArgs(args); requireSafe(!createStarted, "CREATE_RETRY_DENIED");
        createStarted = true; // Latch synchronously, including concurrent callers.
        await validateReviewedManifest(manifest);
        await reads.getProjectMetadata();
        const branches = await reads.listBranches();
        requireSafe(!branches.some(b => b.name === creation.name) && REHEARSAL.deniedBranches.every((id, index) =>
          branches.some(b => b.id === id && b.name === REHEARSAL.deniedNames[index])) &&
          branches.some(b => b.id === creation.sourceBranch && b.default === true && b.current_state === "ready"),
        "BRANCH_COLLISION_OR_SOURCE_MISMATCH");
        const startedAt = new Date(Date.now() - 1000).toISOString();
        creationAttempted = true;
        try {
          const response = await request("createDisposableBranch", undefined, body);
          const branch = branchProjection(response.branch);
          disposableId(branch.id);
          const entry = (kind, id, source, createdAt) => Object.freeze({ kind, id, source, createdAt, runId, branchId: branch.id });
          const initial = { runId, project: PROJECT, branchId: branch.id, startedAt,
            resources: [entry("branch", branch.id, "neon-create-schema-only", branch.created_at)] };
          identity(branch, initial);
          // Retain the authentic branch receipt even if compute validation fails.
          receipt = Object.freeze({ ...initial, resources: Object.freeze([...initial.resources]) });
          requireSafe(Array.isArray(response.endpoints) && response.endpoints.length === 1, "PROVIDER_COMPUTE_MISMATCH");
          const endpoint = endpointProjection(response.endpoints[0], branch.id);
          initial.resources.push(entry("compute", endpoint.id, "neon-create-compute", endpoint.created_at));
          validateLedger(initial, runId, branch.id, false);
          receipt = Object.freeze({ ...initial, resources: Object.freeze(initial.resources) });
          return receipt;
        } catch (error) {
          await reconcile();
          throw failure("createDisposableBranch", error.diagnostic?.status, "MUTATION_RECONCILIATION_REQUIRED");
        }
      },
      getCreationReceipt(...args) { noArgs(args); return receipt; },
      async withBootstrapConnection(candidate, consume, ...args) {
        noArgs(args); requireReceipt(candidate);
        requireSafe(!deleteStarted && !bootstrapBusy && typeof consume === "function", "BOOTSTRAP_CONTEXT_DENIED");
        bootstrapBusy = true;
        try {
          identity(await reads.getBranch(receipt.branchId), receipt, true);
          const endpoints = await reads.listBranchEndpoints(receipt.branchId);
          const expected = receipt.resources.find(r => r.kind === "compute");
          requireSafe(endpoints.length === 1 && expected && endpoints[0].id === expected.id &&
            Date.parse(endpoints[0].created_at) === Date.parse(expected.createdAt) &&
            ["active", "idle"].includes(endpoints[0].current_state), "PROVIDER_COMPUTE_MISMATCH");
          const databases = await reads.listBranchDatabases(receipt.branchId);
          requireSafe(databases.some(db => db.name === "pyramid_design" && db.owner_name === "pyramid_owner") &&
            !databases.some(db => Object.values(REHEARSAL.suites).some(t => t.database === db.name)), "BOOTSTRAP_DATABASE_MISMATCH");
          let result = await request("getConnectionUri", undefined, undefined, { branch_id: receipt.branchId,
            endpoint_id: expected.id, database_name: "pyramid_design", role_name: "pyramid_owner", pooled: "false" });
          let url;
          try {
            url = new URL(result.uri);
            requireSafe(["postgres:", "postgresql:"].includes(url.protocol) && url.hostname === endpoints[0].host &&
              ["", "5432"].includes(url.port) && url.username === "pyramid_owner" && url.pathname === "/pyramid_design" &&
              url.password && !url.hash && [...url.searchParams.keys()].every(k => ["sslmode", "channel_binding"].includes(k)) &&
              new Set(url.searchParams.keys()).size === [...url.searchParams.keys()].length, "BOOTSTRAP_URI_DENIED");
            url.search = "?sslmode=verify-full";
          } catch { result = undefined; throw failure("getConnectionUri", 200, "CONNECTION_MATERIAL_DENIED"); }
          result = undefined;
          try { await consume(url); }
          catch { throw failure("getConnectionUri", 200, "BOOTSTRAP_CONSUMER_FAILED"); }
          finally { url.password = ""; url = undefined; }
        } finally { bootstrapBusy = false; }
      },
      async deleteSameRunDisposableBranch(context, ...args) {
        noArgs(args); exactKeys(context, ["executionId", "receipt", "ledger", "cleanupState"]);
        // Protected IDs are independently rejected even in forged/foreign contexts.
        disposableId(context.ledger?.branchId);
        requireReceipt(context.receipt);
        requireSafe(context.executionId === runId && context.cleanupState === "EVIDENCE_SAVED_CONNECTIONS_CLOSED",
          "CLEANUP_STATE_DENIED");
        requireSafe(!bootstrapBusy, "CLEANUP_CONNECTIONS_NOT_CLOSED");
        validateLedger(context.ledger, runId, receipt.branchId, false);
        requireSafe(context.ledger.startedAt === receipt.startedAt && receipt.resources.every(resource =>
          context.ledger.resources.some(value => isDeepStrictEqual(value, resource))), "CLEANUP_RECEIPT_MISMATCH");
        requireSafe(!deleteStarted, "DELETE_RETRY_DENIED");
        deleteStarted = true; // Latch before asynchronous preflight as well as transport.
        await validateReviewedManifest(manifest);
        identity(await reads.getBranch(receipt.branchId), receipt);
        deletionAttempted = true;
        try { await request("deleteSameRunDisposableBranch", receipt.branchId); }
        catch (error) { await reconcile(); throw failure("deleteSameRunDisposableBranch", error.diagnostic?.status, "MUTATION_RECONCILIATION_REQUIRED"); }
        await reconcile();
        requireSafe(reconciliation === "DELETE_ABSENCE_CONFIRMED", "CLEANUP_ABSENCE_NOT_PROVEN");
        return Object.freeze({ status: "PASS", branchId: receipt.branchId, absenceConfirmed: true });
      },
      async reconcileMutation(...args) { noArgs(args); return reconcile(); },
      status(...args) { noArgs(args); return Object.freeze({ creationAttempted, deletionAttempted, reconciliation }); },
    });
  }
  return Object.freeze({ ...reads, beginRehearsal, close(...args) { noArgs(args); apiKey = undefined; } });
}

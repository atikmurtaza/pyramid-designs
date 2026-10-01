import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";

export const REHEARSAL = Object.freeze({
  project: "withered-feather-01662312",
  branchName: "b4b1-p3-schema-only-20261001",
  deniedBranches: ["br-still-lab-b3q03yuz", "br-square-resonance-b3ew5c59"],
  deniedNames: ["migration-baseline", "migration-synthetic-verification"],
  deniedDatabase: "pyramid_design",
  region: "aws-ap-southeast-1",
  authorization: "AUTHORIZE_B4B1_P3B_DISPOSABLE_ONLY",
  suites: {
    b1: { database: "phase2ib_b1r1_neon_b4b1_p3_b1_20261001", owner: "b4b1_p3_b1_owner", runtime: "b4b1_p3_b1_runtime" },
    b2: { database: "phase2ib_b1r1_b2_neon_b4b1_p3_20261001", owner: "b4b1_p3_b2_owner", runtime: "b4b1_p3_b2_runtime" },
  },
});

// Fixed codes only: never reflect URL input, SQL errors, provider payloads or assertions.
export function requireSafe(condition, code) {
  if (!condition) throw new Error(code);
}

export async function migrationInventory() {
  const names = (await readdir("prisma/migrations", { withFileTypes: true }))
    .filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
  requireSafe(names.length === 11 && names.at(-1) === "20260930010000_phase_b2_admin_workflows", "MIGRATION_INVENTORY_MISMATCH");
  return Promise.all(names.map(async name => {
    const bytes = await readFile(`prisma/migrations/${name}/migration.sql`);
    const lf = bytes.toString().replaceAll("\r\n", "\n");
    return { name, sha256: createHash("sha256").update(bytes).digest("hex"),
      transportChecksums: [...new Set([bytes, lf, lf.replaceAll("\n", "\r\n")]
        .map(value => createHash("sha256").update(value).digest("hex")))] };
  }));
}

export async function mutationManifest() {
  const operations = [];
  const add = (id, targetType, expectedTarget, purpose, prerequisite, reversibility = "Dispose recorded branch", optional = false) => {
    operations.push({ id, targetType, expectedTarget, purpose, prerequisite,
      productionImpact: "ZERO database/schema/role/data mutations; disposable quota consumption only",
      reversibility, cleanupIdentifierRequirement: "Same-run creation receipt and exact branch ID; never prefix discovery", optional });
  };
  add("branch-create", "branch-and-primary-compute", { project: REHEARSAL.project, name: REHEARSAL.branchName,
    init_source: "schema-only", sourceBranch: REHEARSAL.deniedBranches[0], parent_id: null, default: false, protected: false },
  "Exclude all source rows; one schema-only root and primary compute, current Free defaults", "Owner authorizes this complete manifest; collision/quota checks; accept copied credential residual authority");
  add("expiration", "branch", { hoursFromCreation: 24 }, "Optional cleanup backstop", "Supported authenticated creation workflow", "Explicit branch disposal remains mandatory", true);
  for (const [suite, target] of Object.entries(REHEARSAL.suites)) {
    add(`${suite}-owner`, "role", { name: target.owner, login: true, inherit: true, privilegedFlags: false, parents: [] },
      "Independent restricted migration owner; random in-memory credential", "Recorded branch; SQL bootstrap only; name absent");
    add(`${suite}-bootstrap-grant`, "membership", { role: target.owner, member: "pyramid_owner", admin: true, inherit: false, set: true },
      "Permit database owner assignment; inspect creator-generated membership", `${suite}-owner`, "Exact new-role REVOKE; branch disposal");
    add(`${suite}-database`, "database", { name: target.database, owner: target.owner, template: "template0" },
      "Genuinely fresh migration-empty target", `${suite}-bootstrap-grant; name absent; never reuse copied pyramid_design`);
    add(`${suite}-bootstrap-revoke`, "membership", { role: target.owner, member: "pyramid_owner" },
      "Remove temporary bootstrap operator SET/INHERIT/ADMIN authority", `${suite}-database`, "Exact REVOKE; branch disposal");
  }
  for (const name of ["pyramid_runtime", "pyramid_reference_locker"]) add(`capability-${name}`, "role",
    { name, login: false, inherit: true, privilegedFlags: false, parents: [], initialOwnership: false },
    "Required missing capability; SQL only; stop on collision", "Recorded branch; copied sentinels must be compatible; no copied role alterations");
  for (const [suite, target] of Object.entries(REHEARSAL.suites)) {
    add(`${suite}-locker`, "membership", { role: "pyramid_reference_locker", member: target.owner, admin: false, inherit: true, set: true },
      "Migration-derived default privileges/function ownership", `capability-pyramid_reference_locker; ${suite}-owner`, "Exact REVOKE; retain through final checks");
    add(`${suite}-public-role`, "role", { nameFrom: `${suite} same-run generated name`, pattern: "^b1_public_[a-f0-9]{12}$", login: false, inherit: true, privilegedFlags: false, parents: [] },
      "Otherwise ungranted PUBLIC negative principal", "Generate and record distinct exact name before SQL; stop on collision");
    add(`${suite}-test-memberships`, "membership", { roles: ["anon", "authenticated", `${suite} recorded public-test role`], member: target.owner, admin: false, inherit: false, set: true },
      "Synthetic sentinel/PUBLIC denials", `${suite}-public-role; read-only sentinel validation`, "Exact REVOKE after tests");
  }
  const migrations = await migrationInventory();
  // Two complete ordered deploys, not interleaved executions or manual ledger writes.
  for (const [suite, target] of Object.entries(REHEARSAL.suites)) for (const [index, migration] of migrations.entries()) {
    add(`${suite}-migration-${index + 1}`, "migration", { database: target.database, operator: target.owner,
      ...migration, endpoint: "direct", tls: "verify-full", node: "22.x", prisma: "6.12.0" },
    "Unchanged repository migration and native Prisma ledger application", index ? `${suite}-migration-${index}` : "Live provider + SQL identity; migration-empty; exact role prerequisites",
    "No down-migration/reset/db push/resolve; dispose branch");
  }
  for (const [suite, target] of Object.entries(REHEARSAL.suites)) {
    add(`${suite}-runtime`, "role", { name: target.runtime, login: true, inherit: true, privilegedFlags: false, ownership: false },
      "Independent restricted pooled runtime", `${suite}-migration-11; 11 checksummed finished ledger entries; zero drift; operator contract`);
    add(`${suite}-runtime-membership`, "membership", { role: "pyramid_runtime", member: target.runtime, admin: false, inherit: true, set: true },
      "Only approved runtime parent", `${suite}-runtime`, "Exact REVOKE; branch disposal");
    add(`${suite}-connect`, "database-grant", { database: target.database, role: target.runtime, privilege: "CONNECT" },
      "Restricted authentication; no CREATE/TEMP/ownership", `${suite}-runtime`, "Exact REVOKE; branch disposal");
    add(`${suite}-creator-revoke`, "membership", { member: "pyramid_owner", role: target.runtime, observedNewRoleRelationshipsOnly: true },
      "Remove unintended new-runtime creator authority before acceptance", "Read-only inspect exact memberships; no copied/provider role repair", "Exact REVOKE; branch disposal", true);
  }
  for (const [suite, target] of Object.entries(REHEARSAL.suites)) {
    add(`${suite}-seed`, "synthetic-fixture", { database: target.database, fixture: "seed-phase-2c-synthetic.mjs", operator: target.owner },
      "Committed synthetic fixtures; example.invalid recipients; no real provider calls", "Full operator/runtime acceptance; empty application rows; separate database binding");
    add(`${suite}-probes`, "synthetic-probes", { database: target.database, runtime: target.runtime,
      verifier: suite === "b1" ? "verify-phase-b1-permissions.mjs" : "verify-phase-b2-workflows.mjs", pooledChecks: true },
      "Existing security/workflow assertions, rollback DDL/denials, durable synthetic/concurrency workflows, isolated pool/context/reconnect", `${suite}-seed; reviewed source-bound probe inventory; failure aborts`);
  }
  for (const [suite, target] of Object.entries(REHEARSAL.suites)) {
    add(`${suite}-test-revoke`, "membership", { member: target.owner, roles: ["anon", "authenticated", `${suite} recorded public-test role`], remainingBootstrapNewRoleMemberships: true },
      "Close test authority; retain contractual locker; final runtime contract", `${suite}-probes; connections closed`, "Exact REVOKE; branch disposal");
  }
  add("branch-delete", "branch", { idFrom: "same P3B creation receipt", name: REHEARSAL.branchName,
    includes: "only its compute/databases/roles" }, "Explicit final cleanup; remove copied credential exposure", "Evidence captured; pools/processes closed; same-run ledger; live ID/project/root/name/default/protection recheck", "IRREVERSIBLE");
  return { phase: "B4B1-P3B", authorization: "REQUEST_ONLY_NOT_EXECUTED", project: REHEARSAL.project,
    disposableBranchId: null, branchIdSource: "Real authenticated P3B creation receipt; no invented ID",
    forbiddenBranches: REHEARSAL.deniedBranches, forbiddenDatabase: REHEARSAL.deniedDatabase,
    migrationApplications: 22, orderedDeployments: 2, probeInventory: await mutatingProbeInventory(), operations };
}

// Every source line is covered by a source-hashed containment range. Literal
// mutating SQL and workflow/worker calls are listed individually within ranges;
// dynamic loops execute only the same reviewed source, never caller SQL.
export async function mutatingProbeInventory() {
  const definitions = [
    ["scripts/seed-phase-2b-synthetic.mjs", [[1, Infinity, "durable synthetic fixture"]]],
    ["scripts/seed-phase-2c-synthetic.mjs", [[1, Infinity, "durable synthetic fixture"]]],
    ["scripts/verify-phase-b1-permissions.mjs", null],
    ["scripts/verify-phase-b2-workflows.mjs", null],
  ];
  const inventory = [];
  for (const [file, initialRanges] of definitions) {
    const source = (await readFile(file, "utf8")).replaceAll("\r\n", "\n");
    const lines = source.split("\n");
    const lineAt = marker => {
      const number = lines.findIndex(line => line.includes(marker)) + 1;
      requireSafe(number > 0, "PROBE_CONTAINMENT_MARKER_MISSING"); return number;
    };
    const ranges = initialRanges ?? (file.includes("b1-permissions") ? [
      [1, lineAt('await runtime.query("BEGIN");') - 1, "durable synthetic fixture (helper definitions); catalog assertions"],
      [lineAt('await runtime.query("BEGIN");'), lineAt("const claims =") - 1, "transaction rolled back"],
      [lineAt("const claims ="), lineAt("// Definer locks") - 1, "durable synthetic fixture / concurrency test"],
      [lineAt("// Definer locks"), Infinity, "concurrency test / transaction rolled back / durable synthetic fixture"],
    ] : [
      [1, lineAt("try {") - 1, "transaction rolled back (denial helper)"],
      [lineAt("try {"), lineAt("// Deterministic") - 1, "durable synthetic fixture / concurrency test; denial helper rolls back"],
      [lineAt("// Deterministic"), lineAt("// Positive public") - 1, "concurrency test; temporary inactive fixture restored; lock transactions rolled back"],
      [lineAt("// Positive public"), Infinity, "durable synthetic fixture; denial helper rolls back"],
    ]);
    inventory.push({ file, sha256LF: createHash("sha256").update(source).digest("hex"),
      coverage: ranges.map(([start,end,classification]) => ({ start, end: Math.min(end, lines.length), classification })),
      operations: lines.flatMap((line,index) => /\b(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|GRANT|REVOKE|SET (?:LOCAL )?ROLE|COMMIT)\b|(?:await|=>)\s*(?:mutate|submit|application|createJob)\(|(?:files|worker|jobs)\.[a-zA-Z]+\(|\.query\(sql|consumeIntakeLimit\(/.test(line)
        ? [{ line: index + 1, classification: ranges.find(([start,end]) => index + 1 >= start && index + 1 <= end)[2],
          cleanup: "Rollback where transactional; otherwise exact recorded disposable branch deletion; unexpected denial success aborts" }] : []) });
  }
  return inventory;
}

// Receipt projections must be captured by P3B immediately after successful creation.
// This module does not call any provider mutation or issue SQL provisioning/deletion.
export function validateLedger(ledger, runId, branchId, complete = true) {
  requireSafe(ledger && Object.keys(ledger).sort().join() === "branchId,project,resources,runId,startedAt", "CLEANUP_LEDGER_SHAPE");
  requireSafe(ledger?.runId === runId && /^[0-9a-f-]{36}$/.test(runId ?? ""), "CLEANUP_RUN_MISMATCH");
  requireSafe(ledger.project === REHEARSAL.project && ledger.branchId === branchId && /^br-[a-z0-9-]+$/.test(branchId ?? "") &&
    !REHEARSAL.deniedBranches.includes(branchId), "CLEANUP_BRANCH_DENIED");
  requireSafe(Number.isFinite(Date.parse(ledger.startedAt)) && Array.isArray(ledger.resources), "CLEANUP_RECEIPT_REQUIRED");
  const keys = new Set();
  const allowedRoles = [...Object.values(REHEARSAL.suites).flatMap(t => [t.owner, t.runtime]), "pyramid_runtime", "pyramid_reference_locker"];
  for (const resource of ledger.resources) {
    requireSafe(Object.keys(resource).sort().join() === "branchId,createdAt,id,kind,runId,source", "CLEANUP_RECEIPT_SHAPE");
    requireSafe(resource.runId === runId && resource.branchId === branchId &&
      Date.parse(resource.createdAt) >= Date.parse(ledger.startedAt) && Date.parse(resource.createdAt) <= Date.now(), "CLEANUP_RECEIPT_REQUIRED");
    const key = `${resource.kind}:${resource.id}`;
    requireSafe(!keys.has(key), "CLEANUP_DUPLICATE_RECEIPT"); keys.add(key);
    requireSafe((resource.kind === "branch" && resource.id === branchId && resource.source === "neon-create-schema-only") ||
      (resource.kind === "compute" && /^ep-[a-z0-9-]+$/.test(resource.id) && resource.source === "neon-create-compute") ||
      (resource.kind === "database" && Object.values(REHEARSAL.suites).some(t => t.database === resource.id) && resource.source === "sql-create-template0") ||
      (resource.kind === "role" && (allowedRoles.includes(resource.id) || /^b1_public_[a-f0-9]{12}$/.test(resource.id)) && resource.source === "sql-create-role"), "CLEANUP_UNRECORDED_TARGET");
  }
  requireSafe(keys.has(`branch:${branchId}`) && ledger.resources.filter(r => r.kind === "compute").length <= 1, "CLEANUP_CREATION_RECEIPTS_REQUIRED");
  if (complete) {
    requireSafe(ledger.resources.filter(r => r.kind === "compute").length === 1 && Object.values(REHEARSAL.suites).every(t => keys.has(`database:${t.database}`)) &&
      allowedRoles.every(role => keys.has(`role:${role}`)) && ledger.resources.filter(r => r.kind === "role").length === 8,
    "CLEANUP_RESOURCE_INVENTORY_INCOMPLETE");
  }
  return ledger;
}

export function cleanupPlan(ledger, runId, branchId) {
  validateLedger(ledger, runId, branchId, false);
  return { runId, project: REHEARSAL.project, branchId, method: "DELETE",
    target: "Recorded branch only; provider cascades only that branch's resources",
    prerequisite: "Owner cleanup approval; secret-free evidence captured; connections closed; live metadata revalidated",
    status: "PLAN_ONLY_NOT_EXECUTED" };
}

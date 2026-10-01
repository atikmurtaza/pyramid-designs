import pg from "pg";
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { isAbsolute, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { REHEARSAL, requireSafe, validateLedger } from "./neon-rehearsal-manifest.mjs";
import { createNeonProvider, validateReviewedManifest, MANIFEST_SHA256 } from "./neon-rehearsal-provider.mjs";
import { validateBranch, remoteContext, roleFacts, connectionTarget } from "./neon-rehearsal-target.mjs";
import { main as rehearsal, childEnvironment } from "./run-phase-b4b1-neon.mjs";

// Future, separately authorized P3B execution only. Importing this file does nothing.
// H2 tests use the dry run/refusals and mocked transports; never this live command.
export async function lifecycle(args = process.argv.slice(2), input = process.env) {
  requireSafe(args.length === 1 && ["--dry-run", "--execute-rehearsal"].includes(args[0]), "COMMAND_DENIED");
  const manifest = JSON.parse(await readFile("scripts/neon-rehearsal-mutation-manifest.json", "utf8"));
  await validateReviewedManifest(manifest);
  if (args[0] === "--dry-run") return { status: "PLAN_ONLY_NOT_EXECUTED", operations: 55, providerCalls: 0, databaseConnections: 0 };
  requireSafe(input.P3_REHEARSAL_AUTHORIZATION === REHEARSAL.authorization, "REHEARSAL_AUTHORIZATION_REQUIRED");
  requireSafe(input.P3_PROJECT_ID === REHEARSAL.project, "PROJECT_DENIED");
  requireSafe(Number(process.versions.node.split(".")[0]) === 22, "NODE_22_REQUIRED");
  requireSafe(!existsSync(".env") && !existsSync(".env.local"), "PRIVATE_ENV_FILES_DENIED");
  requireSafe(!Object.keys(input).some(key => /^(PG|NODE_OPTIONS$)/.test(key) && input[key]) &&
    input.NODE_TLS_REJECT_UNAUTHORIZED !== "0", "AMBIENT_CONNECTION_OVERRIDES_DENIED");
  requireSafe(execFileSync("git", ["status", "--porcelain"], { encoding: "utf8", windowsHide: true }).trim() === "", "WORKTREE_NOT_CLEAN");
  requireSafe(JSON.parse(await readFile("node_modules/prisma/package.json", "utf8")).version === "6.12.0", "PINNED_PRISMA_REQUIRED");
  const root = input.P3_EVIDENCE_DIRECTORY;
  requireSafe(typeof root === "string" && isAbsolute(root) && relative(process.cwd(), resolve(root)).startsWith(".."), "EXTERNAL_EVIDENCE_DIRECTORY_REQUIRED");
  const provider = createNeonProvider({ project: input.P3_PROJECT_ID, apiKey: input.P3_NEON_API_KEY });
  const runId = randomUUID(); // No caller-selected old execution/receipt can resume mutation.
  const directory = resolve(root, `b4b1-p3b-${runId}`);
  await mkdir(directory); // Exclusive run directory, never overwrite old evidence.
  const e = childEnvironment(input, { P3_PROJECT_ID: REHEARSAL.project, P3_RUN_ID: runId,
    P3_REHEARSAL_AUTHORIZATION: input.P3_REHEARSAL_AUTHORIZATION, P3_NEON_API_KEY: input.P3_NEON_API_KEY,
    P3_LEDGER_PATH: resolve(directory, "ledger.json"), P3_EVIDENCE_DIRECTORY: directory });
  const session = await provider.beginRehearsal({ manifest, authorization: e.P3_REHEARSAL_AUTHORIZATION, runId });
  let ledger, receipt, bootstrap, bootstrapUrl, stage = "branch-create", failed = false, cleanup = "NOT_REQUIRED";
  const result = { phase: "B4B1-P3B", runId, manifestSha256: MANIFEST_SHA256, events: [], rawOutputPersisted: false };
  const save = () => writeFile(resolve(directory, "result.json"), JSON.stringify({ ...result, stage, cleanup }, null, 2) + "\n");
  const event = async operation => { result.events.push({ operation, status: "PASS" }); await save(); };
  async function persistReceipt() { validateLedger(ledger, runId, ledger.branchId, false);
    await writeFile(e.P3_LEDGER_PATH, JSON.stringify(ledger, null, 2) + "\n"); }
  async function record(kind, id, source) {
    ledger.resources.push({ kind, id, source, createdAt: new Date().toISOString(), runId, branchId: ledger.branchId });
    await persistReceipt();
  }
  const qid = name => { requireSafe(/^[a-z][a-z0-9_]+$/.test(name), "SQL_IDENTIFIER_DENIED"); return `"${name}"`; };
  async function sql(text) { requireSafe(bootstrap && receipt && ledger.branchId === receipt.branchId, "DISPOSABLE_BOOTSTRAP_REQUIRED"); return bootstrap.query(text); }
  async function createRole(name, login) {
    const password = login ? randomBytes(32).toString("hex") : undefined;
    await sql(`CREATE ROLE ${qid(name)} ${login ? "LOGIN" : "NOLOGIN"} INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS${login ? ` PASSWORD '${password}'` : ""}`);
    await record("role", name, "sql-create-role"); return password;
  }
  function rehearsalUrl(suite, kind, password) {
    const target = REHEARSAL.suites[suite], url = new URL(bootstrapUrl.href);
    url.username = target[kind === "operator" ? "owner" : "runtime"]; url.password = password; url.pathname = "/" + target.database;
    if (kind === "runtime") url.hostname = url.hostname.replace(".ap-southeast-1.", "-pooler.ap-southeast-1.");
    return connectionTarget(url.href, suite, kind).url.href;
  }
  async function connectBootstrap() {
    // Fresh authenticated branch identity before each privileged connection.
    validateBranch({ project: REHEARSAL.project, branchId: ledger.branchId, runId }, await provider.getBranch(ledger.branchId), ledger);
    bootstrap = new pg.Client({ connectionString: bootstrapUrl.href, connectionTimeoutMillis: 10_000,
      query_timeout: 10_000, statement_timeout: 7_000, application_name: "pyramid-p3-disposable-bootstrap" });
    bootstrap.on("error", () => {});
    await bootstrap.connect();
    requireSafe(bootstrap.connection.stream.encrypted === true && bootstrap.connection.stream.authorized === true, "BOOTSTRAP_TLS_FAILED");
    const facts = (await sql(`SELECT current_database() AS database,current_user,session_user,
      current_setting('server_version_num') AS version,(SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()) AS ssl`)).rows[0];
    requireSafe(facts.database === "pyramid_design" && facts.current_user === "pyramid_owner" && facts.session_user === "pyramid_owner" &&
      Number(facts.version) >= 170000 && Number(facts.version) < 180000 && facts.ssl === true, "DISPOSABLE_BOOTSTRAP_SQL_IDENTITY_FAILED");
  }
  async function closeBootstrap() { if (bootstrap) { await bootstrap.end(); bootstrap = undefined; } }
  try {
    receipt = await session.createDisposableBranch(); ledger = structuredClone(receipt);
    e.P3_BRANCH_ID = receipt.branchId; await persistReceipt(); await event("branch-create");
    result.expiration = "SKIPPED_OPTIONAL_EARLY_ACCESS_NOT_ESTABLISHED";
    stage = "branch-readiness";
    for (let index = 0; index < 60; index++) {
      const branch = await provider.getBranch(receipt.branchId);
      validateBranch({ project: REHEARSAL.project, branchId: receipt.branchId, runId }, branch, ledger, false);
      if (branch.current_state === "ready") break;
      requireSafe(["init", "initializing", "creating"].includes(branch.current_state), "UNEXPECTED_BRANCH_STATE");
      await new Promise(done => setTimeout(done, 2000));
    }
    // The sole copied-database connection is on the authenticated same-run root.
    // It performs catalog checks and manifest SQL provisioning, never application reads/writes.
    await session.withBootstrapConnection(receipt, async url => {
      bootstrapUrl = url;
      stage = "bootstrap-catalog-preflight"; await connectBootstrap();
      const facts = await roleFacts(bootstrap);
      for (const name of ["anon", "authenticated"]) {
        const role = facts.roles.find(r => r.rolname === name);
        requireSafe(role && role.rolcanlogin === false && role.rolinherit === false && role.rolconfig === null &&
          ["rolsuper", "rolcreatedb", "rolcreaterole", "rolreplication", "rolbypassrls"].every(k => role[k] === false) &&
          !facts.memberships.some(m => m.member === name) && !facts.ownership.some(o => o.role === name && o.n > 0), "COPIED_SENTINEL_INCOMPATIBLE");
      }
      const roleNames = [...Object.values(REHEARSAL.suites).flatMap(t => [t.owner, t.runtime]), "pyramid_runtime", "pyramid_reference_locker"];
      requireSafe(!facts.roles.some(r => roleNames.includes(r.rolname)), "COPIED_ROLE_COLLISION");
      for (const [suite, target] of Object.entries(REHEARSAL.suites)) {
        stage = `${suite}-owner`; const password = await createRole(target.owner, true);
        e[`P3_${suite.toUpperCase()}_OPERATOR_URL`] = rehearsalUrl(suite, "operator", password); await event(stage);
        stage = `${suite}-bootstrap-grant`;
        await sql(`GRANT ${qid(target.owner)} TO pyramid_owner WITH ADMIN TRUE, INHERIT FALSE, SET TRUE`); await event(stage);
        stage = `${suite}-database`;
        await sql(`CREATE DATABASE ${qid(target.database)} OWNER ${qid(target.owner)} TEMPLATE template0`);
        await record("database", target.database, "sql-create-template0"); await event(stage);
        stage = `${suite}-bootstrap-revoke`; await sql(`REVOKE ${qid(target.owner)} FROM pyramid_owner`); await event(stage);
      }
      for (const name of ["pyramid_runtime", "pyramid_reference_locker"]) {
        stage = `capability-${name}`; await createRole(name, false); await event(stage);
      }
      for (const [suite, target] of Object.entries(REHEARSAL.suites)) {
        stage = `${suite}-locker`;
        await sql(`GRANT pyramid_reference_locker TO ${qid(target.owner)} WITH ADMIN FALSE, INHERIT TRUE, SET TRUE`); await event(stage);
        const publicRole = "b1_public_" + randomBytes(6).toString("hex");
        requireSafe(!facts.roles.some(r => r.rolname === publicRole) && !ledger.resources.some(r => r.id === publicRole), "PUBLIC_ROLE_COLLISION");
        e[`P3_${suite.toUpperCase()}_PUBLIC_ROLE`] = publicRole;
        stage = `${suite}-public-role`; await createRole(publicRole, false); await event(stage);
        stage = `${suite}-test-memberships`;
        await sql(`GRANT anon, authenticated, ${qid(publicRole)} TO ${qid(target.owner)} WITH ADMIN FALSE, INHERIT FALSE, SET TRUE`); await event(stage);
      }
      stage = "empty-preflight"; await rehearsal(["--preflight"], e); await event(stage);
      stage = "migrations"; await rehearsal(["--migrate"], e); await event(stage);
      for (const [suite, target] of Object.entries(REHEARSAL.suites)) {
        stage = `${suite}-runtime`; const password = await createRole(target.runtime, true);
        e[`P3_${suite.toUpperCase()}_RUNTIME_URL`] = rehearsalUrl(suite, "runtime", password); await event(stage);
        stage = `${suite}-runtime-membership`;
        await sql(`GRANT pyramid_runtime TO ${qid(target.runtime)} WITH ADMIN FALSE, INHERIT TRUE, SET TRUE`); await event(stage);
        stage = `${suite}-connect`; await sql(`GRANT CONNECT ON DATABASE ${qid(target.database)} TO ${qid(target.runtime)}`); await event(stage);
        stage = `${suite}-creator-revoke`;
        if ((await roleFacts(bootstrap)).memberships.some(m => m.member === "pyramid_owner" && m.role === target.runtime))
          await sql(`REVOKE ${qid(target.runtime)} FROM pyramid_owner`);
        await event(stage);
      }
      stage = "runtime-acceptance";
      await remoteContext(e, "b1", "current"); await remoteContext(e, "b2", "current"); await event(stage);
      await closeBootstrap();
      stage = "synthetic-verification"; await rehearsal(["--verify"], e); await event(stage);
      await connectBootstrap();
      for (const [suite, target] of Object.entries(REHEARSAL.suites)) {
        stage = `${suite}-test-revoke`;
        await sql(`REVOKE anon, authenticated, ${qid(e[`P3_${suite.toUpperCase()}_PUBLIC_ROLE`])} FROM ${qid(target.owner)}`);
        const memberships = (await roleFacts(bootstrap)).memberships.filter(m => m.member === "pyramid_owner" &&
          ledger.resources.some(r => r.kind === "role" && r.id === m.role));
        for (const m of memberships) await sql(`REVOKE ${qid(m.role)} FROM pyramid_owner`);
        await event(stage);
      }
      await closeBootstrap();
      stage = "final-contract"; await rehearsal(["--final-check"], e); await event(stage);
    });
  } catch {
    failed = true; result.failure = { stage, code: "LIFECYCLE_STOPPED", forwardExecutionStopped: true };
  } finally {
    // Only a receipt minted by this session can reach DELETE, including partial creation.
    receipt ??= session.getCreationReceipt();
    ledger ??= receipt ? structuredClone(receipt) : undefined;
    let closed = false;
    try { await closeBootstrap(); closed = true; } catch { failed = true; }
    bootstrapUrl = undefined;
    try {
      if (receipt) {
        cleanup = "REQUIRED"; await persistReceipt(); await save();
        requireSafe(closed && !globalThis.pyramidDatabasePool, "CLEANUP_CONNECTIONS_NOT_CLOSED");
        stage = "branch-delete";
        result.cleanupResult = await session.deleteSameRunDisposableBranch({ executionId: runId, receipt, ledger,
          cleanupState: "EVIDENCE_SAVED_CONNECTIONS_CLOSED" });
        cleanup = "PASS";
      } else if (session.status().creationAttempted) cleanup = "OWNER_RECONCILIATION_REQUIRED";
    } catch { cleanup = "OWNER_RECONCILIATION_REQUIRED"; failed = true; }
    result.providerState = session.status();
    result.status = cleanup === "OWNER_RECONCILIATION_REQUIRED" ? "OWNER ACTION REQUIRED" : failed ? "FAIL" : "PASS";
    result.branchId = receipt?.branchId ?? null;
    result.disposableResourcesRemaining = cleanup === "PASS" || !session.status().creationAttempted ? 0 : "UNKNOWN";
    provider.close();
    for (const key of Object.keys(e)) if (/URL$|API_KEY$/.test(key)) delete e[key];
    stage = "finished"; await save();
  }
  return { status: result.status, runId, branchId: result.branchId, cleanup,
    disposableResourcesRemaining: result.disposableResourcesRemaining, evidenceDirectory: directory };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { const result = await lifecycle(); console.log(JSON.stringify(result));
    if (!["PASS", "PLAN_ONLY_NOT_EXECUTED"].includes(result.status)) process.exitCode = 1;
  } catch { console.error("P3_LIFECYCLE_FAILED details_suppressed=true"); process.exitCode = 1; }
}

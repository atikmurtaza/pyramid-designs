import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { isAbsolute, resolve, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { REHEARSAL, requireSafe, mutationManifest, cleanupPlan } from "./neon-rehearsal-manifest.mjs";
import { authorization, remoteContext, readOnlyTarget, validateMigrations, roleFacts, assertRolePrerequisites, cleanupMetadata } from "./neon-rehearsal-target.mjs";
import { inspectDatabase } from "./production-database-readiness.mjs";

// Child processes get only required platform variables and this rehearsal's
// credentials. Ambient PG*, NODE_OPTIONS, provider/Auth/live adapter secrets
// and production flags cannot override the selected target or reach adapters.
export function childEnvironment(e, extra = {}) {
  const env = {};
  for (const key of ["PATH", "Path", "SystemRoot", "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "HOME", "USERPROFILE", "APPDATA", "LOCALAPPDATA"])
    if (e[key]) env[key] = e[key];
  return { ...env, NODE_ENV: "test", PUBLIC_INTAKE_MODE: "synthetic", DIRECT_URL: "", ...extra };
}

export function safeEvidence(context, result) {
  requireSafe(["PASS", "FAIL"].includes(result.status) && /^[a-z0-9-]+$/.test(result.operation) &&
    (result.exitCode === null || Number.isInteger(result.exitCode)) && Number.isInteger(result.assertions) && result.assertions >= 0,
  "EVIDENCE_SHAPE_INVALID");
  // Projection, not a blacklist: caught text, provider objects and URLs are never copied.
  return { phase: "B4B1-P3B", project: REHEARSAL.project, branchId: context.auth.branchId, runId: context.auth.runId,
    database: context.operator.database, operator: context.operator.login, runtime: REHEARSAL.suites[context.operator.suite].runtime,
    postgresMajor: 17, tls: "verify-full", operation: result.operation, status: result.status,
    exitCode: result.exitCode, assertions: result.assertions, rawOutputPersisted: false };
}

export async function runChild(args, env, marker, timeoutMs = 600_000) {
  // Fixed internal argv only; no --from-url, credentials, arbitrary commands or SQL.
  return new Promise(resolveChild => {
    let assertions = 0, carry = "", timedOut = false;
    const child = spawn(process.execPath, args, { env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, timeoutMs);
    let found = false;
    child.stdout.on("data", data => {
      // Keep at most one bounded line in memory. Match only fixed success markers
      // and decimal assertion counts; discard all other output (including stderr).
      const lines = (carry + data.toString()).split(/\r?\n/); carry = lines.pop().slice(-512);
      for (const line of lines) if (line.startsWith(marker)) {
        found = true; assertions = Number(line.match(/\bchecks=(\d+)\b/)?.[1] ?? 0);
      }
    });
    child.stderr.on("data", () => {});
    child.on("error", () => { clearTimeout(timer); resolveChild({ status: "FAIL", exitCode: null, assertions: 0 }); });
    child.on("close", code => { clearTimeout(timer); carry = "";
      resolveChild({ status: code === 0 && !timedOut && (!marker || found) ? "PASS" : "FAIL", exitCode: code, assertions }); });
  });
}

async function evidenceDirectory(e) {
  const path = e.P3_EVIDENCE_DIRECTORY;
  requireSafe(path && isAbsolute(path) && relative(process.cwd(), resolve(path)).startsWith(".."), "EXTERNAL_EVIDENCE_DIRECTORY_REQUIRED");
  await mkdir(path, { recursive: true }); return path;
}

async function reviewedManifest(e) {
  const reviewed = JSON.parse(await readFile("scripts/neon-rehearsal-mutation-manifest.json", "utf8"));
  requireSafe(JSON.stringify(reviewed) === JSON.stringify(await mutationManifest()), "REVIEWED_MANIFEST_SOURCE_CHANGED");
  requireSafe(!existsSync(".env") && !existsSync(".env.local"), "PRIVATE_ENV_FILES_DENIED");
  requireSafe(Number(process.versions.node.split(".")[0]) === 22, "NODE_22_REQUIRED");
  const prisma = JSON.parse(await readFile("node_modules/prisma/package.json", "utf8"));
  requireSafe(prisma.version === "6.12.0", "PINNED_PRISMA_REQUIRED");
  authorization(e);
}

async function migrated(context) {
  await readOnlyTarget(context.operator, validateMigrations);
  const expected = JSON.parse(await readFile("scripts/production-database-contract.json", "utf8"));
  await inspectDatabase(context.operator.url.href, "operator", expected);
}

// Uses the actual application pool. No pg_terminate_backend on a pooled
// provider: destroy only this process's checked-out client, then reconnect.
export async function pooledVerification(context) {
  requireSafe(!globalThis.pyramidDatabasePool, "EXISTING_DATABASE_POOL_DENIED");
  const db = await import("../src/lib/server/database.ts");
  const saved = process.env.DATABASE_URL;
  process.env.DATABASE_URL = context.runtime.url.href;
  let checks = 0;
  try {
    const identity = (await db.query("SELECT current_database() AS d,current_user AS u")).rows[0];
    requireSafe(identity.u === context.runtime.login && identity.d === context.runtime.database, "POOL_LOGIN_MISMATCH"); checks++;
    const pool = globalThis.pyramidDatabasePool;
    requireSafe(pool.options.max === 3 && pool.options.idleTimeoutMillis === 10_000 && pool.options.connectionTimeoutMillis === 10_000, "POOL_BUDGET_MISMATCH"); checks++;
    await Promise.all(Array.from({ length: 12 }, () => db.transaction(async client => {
      const before = (await client.query("SELECT pg_backend_pid() AS p,current_setting('pyramid.p3_context',true) AS c")).rows[0];
      requireSafe(!before.c, "POOL_CONTEXT_LEAK");
      await client.query("SELECT set_config('pyramid.p3_context',$1,true)", [context.auth.runId]);
      const after = (await client.query("SELECT pg_backend_pid() AS p,current_setting('pyramid.p3_context',true) AS c")).rows[0];
      requireSafe(before.p === after.p && after.c === context.auth.runId, "POOL_TRANSACTION_ISOLATION_FAILED"); checks++;
    })));
    requireSafe(pool.totalCount <= 3, "POOL_BUDGET_MISMATCH"); checks++;
    const held = [];
    try {
      for (let index = 0; index < 3; index++) held.push(await pool.connect());
      let rejected = false;
      const started = performance.now();
      try { await db.query("SELECT 1"); } catch { rejected = true; }
      requireSafe(rejected && performance.now() - started >= 9_000 && performance.now() - started < 15_000, "POOL_QUEUE_TIMEOUT_FAILED"); checks++;
    } finally { for (const client of held) client.release(); }
    try { await db.transaction(async client => {
      await client.query("SELECT set_config('pyramid.p3_context',$1,true)", [context.auth.runId]);
      throw new Error("P3_ROLLBACK_PROBE");
    }); } catch (error) { requireSafe(error.name === "DatabaseTransactionError", "POOL_ROLLBACK_FAILED"); checks++; }
    requireSafe(!(await db.query("SELECT current_setting('pyramid.p3_context',true) AS c")).rows[0].c, "POOL_CONTEXT_LEAK"); checks++;
    const disconnected = await pool.connect(); disconnected.release(true);
    requireSafe((await db.query("SELECT 1 AS n")).rows[0].n === 1, "POOL_RECONNECT_FAILED"); checks++;
    // Tests runtime idle eviction, not provider suspension or account configuration.
    await new Promise(resolveWait => setTimeout(resolveWait, 10_250));
    requireSafe(pool.totalCount === 0, "POOL_IDLE_EVICTION_FAILED"); checks++;
    requireSafe((await db.query("SELECT 1 AS n")).rows[0].n === 1, "POOL_IDLE_RECONNECT_FAILED"); checks++;
    return checks;
  } finally { await db.closeDatabasePool(); if (saved === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = saved; }
}

export async function main(args = process.argv.slice(2), e = process.env) {
  requireSafe(args.length === 1 && ["--manifest", "--dry-run", "--preflight", "--migrate", "--verify", "--final-check", "--cleanup-plan"].includes(args[0]), "COMMAND_DENIED");
  if (args[0] === "--manifest") { console.log(JSON.stringify(await mutationManifest(), null, 2)); return; }
  if (args[0] === "--dry-run") {
    const branch = e.P3_BRANCH_ID;
    if (!branch) { console.log("BLOCKED_DISPOSABLE_BRANCH_REQUIRED provider_calls=0 database_connections=0 mutations=0"); return; }
    authorization(e);
    console.log("BLOCKED_LIVE_PREFLIGHT_REQUIRED offline_configuration_is_not_provider_evidence mutations=0"); return;
  }
  await reviewedManifest(e);
  if (args[0] === "--cleanup-plan") {
    const auth = authorization(e);
    const ledger = JSON.parse(await readFile(e.P3_LEDGER_PATH, "utf8"));
    const plan = cleanupPlan(ledger, auth.runId, auth.branchId);
    await cleanupMetadata(e, auth, ledger);
    console.log(JSON.stringify(plan)); return;
  }
  const contexts = [];
  for (const suite of ["b1", "b2"]) contexts.push(await remoteContext(e, suite, ["--preflight", "--migrate"].includes(args[0]) ? "empty" : args[0] === "--final-check" ? "final" : "current"));
  requireSafe(contexts[0].endpoint.id === contexts[1].endpoint.id && contexts[0].publicRole !== contexts[1].publicRole, "TWO_DATABASE_ISOLATION_MISMATCH");
  if (args[0] === "--preflight") { console.log("P3B_EMPTY_PREFLIGHT_READY databases=2 mutations=0"); return; }
  if (args[0] === "--final-check") { console.log("P3B_FINAL_CONTRACT_OK databases=2 mutations=0 test_memberships=revoked"); return; }
  const output = await evidenceDirectory(e);
  for (let context of contexts) {
    const suite = context.operator.suite;
    const run = async (operation, argv, extra, marker = "") => {
      const result = await runChild(argv, childEnvironment(e, extra), marker);
      await writeFile(`${output}/${context.auth.runId}-${operation}.json`, JSON.stringify(safeEvidence(context, { ...result, operation }), null, 2) + "\n", { flag: "wx" });
      requireSafe(result.status === "PASS", "REHEARSAL_CHILD_FAILED");
    };
    if (args[0] === "--migrate") {
      // Recheck immediately before each deploy. Both databases were preflighted
      // above; existing/partial ledgers abort instead of being resumed or cleaned.
      context = await remoteContext(e, suite, "empty");
      await run(`${suite}-deploy`, ["node_modules/prisma/build/index.js", "migrate", "deploy"],
        { DATABASE_URL: context.operator.url.href, DIRECT_URL: context.operator.url.href });
      await migrated(context);
    } else {
      context = await remoteContext(e, suite, "current");
      const tables = (await readOnlyTarget(context.operator, async client => (await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename<>'_prisma_migrations' ORDER BY tablename")).rows));
      await readOnlyTarget(context.operator, async client => {
        for (const { tablename } of tables) requireSafe(Number((await client.query(`SELECT count(*) AS n FROM public."${tablename.replaceAll('"','""')}"`)).rows[0].n) === 0, "SYNTHETIC_SEED_TARGET_NOT_EMPTY");
      });
      // Seed in this already-attested process; avoid granting remote authority to
      // the historical standalone seed entry point or loading private env files.
      const previous = { ...process.env };
      requireSafe(!globalThis.pyramidDatabasePool, "EXISTING_DATABASE_POOL_DENIED");
      try {
        for (const key of Object.keys(process.env)) delete process.env[key];
        Object.assign(process.env, childEnvironment(e, { DATABASE_URL: context.operator.url.href }));
        const { seedPhase2CSynthetic } = await import("./seed-phase-2c-synthetic.mjs");
        await seedPhase2CSynthetic();
        const db = await import("../src/lib/server/database.ts"); await db.closeDatabasePool();
      } finally { const db = await import("../src/lib/server/database.ts"); await db.closeDatabasePool();
        for (const key of Object.keys(process.env)) delete process.env[key]; Object.assign(process.env, previous); }
      const required = ["P3_PROJECT_ID", "P3_BRANCH_ID", "P3_RUN_ID", "P3_REHEARSAL_AUTHORIZATION", "P3_NEON_API_KEY", "P3_LEDGER_PATH",
        `P3_${suite.toUpperCase()}_OPERATOR_URL`, `P3_${suite.toUpperCase()}_RUNTIME_URL`, `P3_${suite.toUpperCase()}_PUBLIC_ROLE`];
      const rehearsalEnv = Object.fromEntries(required.map(key => [key, e[key]]));
      await run(`${suite}-suite`, ["--conditions=react-server", "--experimental-strip-types",
        suite === "b1" ? "scripts/verify-phase-b1-permissions.mjs" : "scripts/verify-phase-b2-workflows.mjs", "--neon-disposable"],
      { ...rehearsalEnv, DATABASE_URL: context.runtime.url.href, B1_TEST_OWNER_URL: context.operator.url.href,
        B1_TEST_PUBLIC_ROLE: context.publicRole, DIRECT_URL: "" }, suite === "b1" ? "B1_PERMISSION_BOUNDARY_OK " : "PHASE_B2_WORKFLOWS_OK ");
      const assertions = await pooledVerification(context);
      await writeFile(`${output}/${context.auth.runId}-${suite}-pool.json`, JSON.stringify(safeEvidence(context,
        { operation: `${suite}-pool`, status: "PASS", exitCode: 0, assertions }), null, 2) + "\n", { flag: "wx" });
      await readOnlyTarget(context.operator, async client => assertRolePrerequisites(await roleFacts(client), suite, context.publicRole, "current"));
    }
  }
  console.log(`P3B_${args[0].slice(2).toUpperCase()}_OK databases=2 production_mutations=0`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await main(); } catch { console.error("P3B_PREFLIGHT_OR_REHEARSAL_FAILED details_suppressed=true"); process.exitCode = 1; }
}

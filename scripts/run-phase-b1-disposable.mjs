import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import pg from "pg";

// Explicit local administration only. Fresh databases/identities are retained
// for review; this harness never resets, drops or reads private configuration.
const adminUrl = new URL(process.env.B1_DISPOSABLE_ADMIN_URL ?? "invalid:");
assert(["127.0.0.1", "localhost"].includes(adminUrl.hostname));
assert.equal(adminUrl.pathname, "/postgres");
assert(!existsSync(".env.local"));
assert.equal(Number(process.versions.node.split(".")[0]), 22);
const output = process.env.B1_EVIDENCE_DIRECTORY;
assert(output, "An external evidence directory is required.");
await mkdir(output, { recursive: true });
const secrets = adminUrl.password ? [decodeURIComponent(adminUrl.password)] : [];
const safe = text => {
  for (const secret of secrets) text = text.replaceAll(secret, "[disposable credential]");
  return text.replace(/postgres(?:ql)?:\/\/[^\s"'<>]+/g, "[disposable DB URL]");
};
const env = { ...process.env, NODE_ENV: "test", PUBLIC_INTAKE_MODE: "synthetic" };
delete env.B1_DISPOSABLE_ADMIN_URL;
delete env.B1_TEST_OWNER_URL;
for (const key of Object.keys(env)) if (/^(GOOGLE_|RESEND_|TURNSTILE_|NEXT_PUBLIC_SUPABASE_|SUPABASE_|CRON_SECRET|EMAIL_PROVIDER)/.test(key)) env[key] = "";
async function run(name, args, identity, accepted = [0]) {
  const result = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { env: { ...env, ...identity }, windowsHide: true });
    let log = "";
    child.stdout.on("data", data => { log += data; });
    child.stderr.on("data", data => { log += data; });
    child.on("error", reject);
    child.on("close", code => resolve({ code, log: safe(log) }));
  });
  await writeFile(`${output}/${name}.log`, result.log);
  console.log(`${name} exit=${result.code} ${result.log.split(/\r?\n/).filter(l => /(?:_OK|checks=|admitted=|vulnerabilities)/.test(l)).join(" | ")}`);
  if (!accepted.includes(result.code)) {
    console.error(result.log.slice(-5000));
    throw new Error(`${name} failed`);
  }
  return result;
}
const scriptArgs = file => ["--conditions=react-server", "--experimental-strip-types", `scripts/${file}`];
const admin = new pg.Client({ connectionString: adminUrl.href });
await admin.connect();
try {
  for (const role of ["anon", "authenticated", "pyramid_runtime", "pyramid_reference_locker"]) {
    const found = (await admin.query("SELECT * FROM pg_roles WHERE rolname=$1", [role])).rows[0];
    if (!found) await admin.query(`CREATE ROLE ${role} NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);
    else assert(!found.rolsuper && !found.rolbypassrls && !found.rolcanlogin && !found.rolcreaterole && !found.rolcreatedb);
  }
  async function fresh(label, deploy = false) {
    const suffix = randomBytes(6).toString("hex"), database = `phase2ib_b1r1_${label}_${suffix}`;
    const owner = `b1_owner_${suffix}`, runtime = `b1_runtime_${suffix}`, publicRole = `b1_public_${suffix}`;
    for (const role of [owner, runtime]) {
      const password = randomBytes(32).toString("hex"); secrets.push(password);
      await admin.query(`CREATE ROLE ${role} LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);
    }
    await admin.query(`GRANT pyramid_reference_locker TO ${owner} WITH INHERIT TRUE, SET TRUE`);
    await admin.query(`GRANT pyramid_runtime TO ${runtime}`);
    await admin.query(`CREATE ROLE ${publicRole} NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);
    await admin.query(`GRANT anon, authenticated, ${publicRole} TO ${owner} WITH INHERIT FALSE, SET TRUE`);
    await admin.query(`CREATE DATABASE ${database} OWNER ${owner}`);
    const ownerUrl = new URL(adminUrl.href), runtimeUrl = new URL(adminUrl.href);
    ownerUrl.username = owner; ownerUrl.password = secrets.at(-2); ownerUrl.pathname = `/${database}`;
    runtimeUrl.username = runtime; runtimeUrl.password = secrets.at(-1); runtimeUrl.pathname = `/${database}`;
    const identity = { DATABASE_URL: ownerUrl.href, DIRECT_URL: ownerUrl.href, PHASE2IB_TEST_DATABASE_URL: ownerUrl.href };
    await run(`${label}-${deploy ? "deploy" : "replay"}`, deploy
      ? ["node_modules/prisma/build/index.js", "migrate", "deploy"] : ["scripts/replay-phase-2ib-migrations.mjs"], identity);
    return { database, identity, restricted: { DATABASE_URL: runtimeUrl.href, DIRECT_URL: "", PHASE2IB_TEST_DATABASE_URL: runtimeUrl.href,
      B1_TEST_PUBLIC_ROLE: publicRole }, ownerUrl: ownerUrl.href };
  }
  const mode = process.argv[2] ?? "permissions";
  if (mode === "permissions") {
    for (let n = 1; n <= 3; n++) {
      const fixture = await fresh(`permissions${n}`, n === 3);
      await run(`permissions${n}-seed`, scriptArgs("seed-phase-2c-synthetic.mjs"), fixture.identity);
      // Owner is available only to the test process for explicit setup/fault injection;
      // DATABASE_URL and the application singleton always use restricted runtime.
      await run(`permissions${n}`, scriptArgs("verify-phase-b1-permissions.mjs"), { ...fixture.restricted, B1_TEST_OWNER_URL: fixture.ownerUrl });
      await run(`permissions${n}-status`, ["node_modules/prisma/build/index.js", "migrate", "status"],
        { ...fixture.identity, DATABASE_URL: "postgresql://synthetic@127.0.0.1:1/phase2ib_unavailable" });
      const missing = await run(`permissions${n}-missing-direct`, ["node_modules/prisma/build/index.js", "migrate", "status"], fixture.restricted, [1]);
      assert(missing.log.includes("DIRECT_URL is required for migration commands."));
      await run(`permissions${n}-drift`, ["node_modules/prisma/build/index.js", "migrate", "diff", "--from-url", fixture.ownerUrl,
        "--to-schema-datamodel", "prisma/schema.prisma", "--exit-code"], fixture.identity);
    }
  } else if (mode === "quality") {
    const synthetic = { DATABASE_URL: "postgresql://synthetic@127.0.0.1:1/phase2ib_schema_only", DIRECT_URL: "postgresql://synthetic@127.0.0.1:1/phase2ib_schema_only" };
    await run("prisma-validate", ["node_modules/prisma/build/index.js", "validate"], synthetic);
    await run("lint", ["node_modules/eslint/bin/eslint.js", "src"], synthetic);
    await run("typecheck", ["node_modules/typescript/bin/tsc", "--noEmit"], synthetic);
    await run("production-build", ["node_modules/next/dist/bin/next", "build", "--webpack"], { DATABASE_URL: "", DIRECT_URL: "", NODE_ENV: "production", PUBLIC_INTAKE_MODE: "" });
    await run("post-build-typecheck", ["node_modules/typescript/bin/tsc", "--noEmit"], synthetic);
    const fixture = await fresh("smoke");
    await mkdir("tmp", { recursive: true });
    await run("production-smoke", ["scripts/verify-phase-2ib-production-smoke.cjs"], fixture.restricted);
  } else if (mode === "regression") {
    for (const [label, file] of [
      ["2a", "verify-phase-2a-pg-runtime.mjs"], ["2b", "verify-phase-2b-domain.mjs"],
      ["2c", "verify-phase-2c-authorization.mjs"], ["2d", "verify-phase-2d-staff-reads.mjs"],
      ["2e", "verify-phase-2e-staff-portal.mjs"], ["2f", "verify-phase-2f-staff-mutations.mjs"],
      ["2g", "verify-phase-2g-public-intake.mjs"], ["2h", "verify-phase-2h-candidate-files.mjs"],
      ["2ib", "verify-phase-2ib-worker.mjs"], ["2ic1", "verify-phase-2ic1-notifications.mjs"],
      ["2ic2b", "verify-phase-2ic2b-resend.mjs"], ["2id", "verify-phase-2id-abuse.mjs"],
      ["2ie", "verify-phase-2ie-challenge.mjs"], ["pg", "verify-phase-b1-pg-runtime.mjs"],
    ]) {
      const fixture = await fresh(label);
      if (label === "2g") await run(`${label}-seed`, scriptArgs("seed-phase-2c-synthetic.mjs"), fixture.identity);
      await run(label, scriptArgs(file), fixture.identity);
    }
  } else throw new Error("Unknown disposable verification mode.");
  console.log(`B1_DISPOSABLE_${mode.toUpperCase()}_OK`);
} finally { await admin.end(); }

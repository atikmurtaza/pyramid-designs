import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import pg from "pg";

// Negative baseline proof only. Never load private configuration or create policies.
const url = new URL(process.env.PHASE2IB_TEST_DATABASE_URL ?? "invalid:");
assert(["127.0.0.1", "localhost"].includes(url.hostname));
assert(/^\/phase2ib_[a-z0-9_]+$/.test(url.pathname));
assert(!existsSync(".env.local"), "Run in an isolated checkout without private configuration.");
const client = new pg.Client({ connectionString: url.href });
let checks = 0;
const check = (actual, expected) => { assert.equal(actual, expected); checks++; };
await client.connect();
try {
  check((await client.query('SELECT count(*)::int AS n FROM public._prisma_migrations WHERE finished_at IS NOT NULL')).rows[0].n, 9);
  check((await client.query("SELECT count(*)::int AS n FROM pg_policies WHERE schemaname='public'")).rows[0].n, 0);
  await client.query("BEGIN");
  await client.query(`CREATE ROLE pyramid_b1_runtime_probe NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION`);
  await client.query(`GRANT USAGE ON SCHEMA public TO pyramid_b1_runtime_probe;
    GRANT SELECT, INSERT ON public."CompatibilityProbe" TO pyramid_b1_runtime_probe;
    GRANT SELECT ON public."StaffUser", public."UserRole", public."ConsentDefinition", public."RetentionPolicy",
      public."Department", public."JobQuestion", public."JobQuestionOption", public."FileSecurityReview" TO pyramid_b1_runtime_probe`);
  await client.query(`INSERT INTO public."CompatibilityProbe" ("id", "label") VALUES ('00000000-0000-4000-8000-00000000b101', 'synthetic-b1-rls-proof')`);
  const flags = (await client.query(`SELECT rolsuper OR rolbypassrls OR rolcreatedb OR rolcreaterole OR rolreplication AS unsafe
    FROM pg_roles WHERE rolname='pyramid_b1_runtime_probe'`)).rows[0];
  check(flags.unsafe, false);
  check((await client.query(`SELECT count(*)::int AS n FROM pg_auth_members WHERE member='pyramid_b1_runtime_probe'::regrole`)).rows[0].n, 0);
  await client.query("SET LOCAL ROLE pyramid_b1_runtime_probe");
  check((await client.query('SELECT count(*)::int AS n FROM public."CompatibilityProbe"')).rows[0].n, 0);
  async function denied(sql, code = "42501") {
    await client.query("SAVEPOINT negative_probe");
    let failure;
    try { await client.query(sql); } catch (error) { failure = error; }
    await client.query("ROLLBACK TO SAVEPOINT negative_probe");
    await client.query("RELEASE SAVEPOINT negative_probe");
    check(failure?.code, code);
  }
  await denied(`INSERT INTO public."CompatibilityProbe" ("id", "label") VALUES ('00000000-0000-4000-8000-00000000b102', 'synthetic-b1-denied')`);
  for (const table of ["StaffUser", "UserRole", "ConsentDefinition", "RetentionPolicy", "Department", "JobQuestion", "JobQuestionOption", "FileSecurityReview"]) {
    await denied(`SELECT "id" FROM public."${table}" FOR SHARE`);
  }
  await denied('SELECT "id" FROM public."FileSecurityReview" FOR UPDATE');
  await denied('UPDATE public."FileSecurityReview" SET "outcomeCode" = \'synthetic-denied\'');
  await denied('ALTER TABLE public."CompatibilityProbe" DISABLE ROW LEVEL SECURITY');
  await denied('CREATE TABLE public.synthetic_b1_denied (id integer)');
  await denied('CREATE ROLE synthetic_b1_denied');
  await denied('DROP TABLE public."CompatibilityProbe"');
  await denied('ALTER ROLE pyramid_b1_runtime_probe BYPASSRLS');
  await denied('GRANT anon TO pyramid_b1_runtime_probe');
  await client.query("ROLLBACK");
  check((await client.query("SELECT count(*)::int AS n FROM pg_roles WHERE rolname='pyramid_b1_runtime_probe'")).rows[0].n, 0);
  check((await client.query(`SELECT count(*)::int AS n FROM public."CompatibilityProbe" WHERE "label"='synthetic-b1-rls-proof'`)).rows[0].n, 0);
  // A broken runtime URL must not affect migration status; a missing direct URL
  // must stop before any attempt to connect, even when runtime access is valid.
  const status = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "status"], {
    encoding: "utf8", timeout: 30_000, windowsHide: true,
    env: { ...process.env, DATABASE_URL: "postgresql://schema-only@127.0.0.1:1/schema-only", DIRECT_URL: url.href },
  });
  // This historical nine-migration fixture now correctly has migration 10 pending.
  check(status.status, 1);
  check((status.stdout + status.stderr).includes("20260930000000_phase_b1_runtime_permissions"), true);
  const missing = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "status"], {
    encoding: "utf8", timeout: 30_000, windowsHide: true,
    env: { ...process.env, DATABASE_URL: url.href, DIRECT_URL: "" },
  });
  check(missing.status === 0, false);
  check((missing.stdout + missing.stderr).includes("DIRECT_URL is required for migration commands."), true);
  console.log(`B1_MIGRATION_REVIEW_REQUIRED_PROVEN checks=${checks} migrations=9 policies=0 lock_privilege_conflicts=8 runtime_workflows=BLOCKED`);
} finally {
  await client.query("ROLLBACK").catch(() => {});
  await client.end();
}

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import pg from "pg";
import { databaseMaintenanceEnabled, maintenanceBlocksRequest, DatabaseMaintenanceError } from "../src/lib/server/database-maintenance.ts";
import { query, transaction, closeDatabasePool } from "../src/lib/server/database.ts";

// Run only against a fresh, schema-only synthetic database; never a restored backup.
const target = new URL(process.env.DATABASE_URL);
assert.equal(target.hostname, "127.0.0.1");
assert.equal(target.pathname, "/pyramid_s2f_synthetic");
const operator = new pg.Client({ connectionString: process.env.DATABASE_URL });
let server;
try {
  await operator.connect();
  await operator.query('CREATE TABLE public.maintenance_check (n integer); CREATE FUNCTION public.maintenance_write() RETURNS integer LANGUAGE plpgsql AS $$ BEGIN INSERT INTO public.maintenance_check VALUES (99); RETURN 99; END $$');
  for (const value of [undefined, "", "false", "FALSE"]) {
    if (value === undefined) delete process.env.DATABASE_MAINTENANCE;
    else process.env.DATABASE_MAINTENANCE = value;
    assert.equal(databaseMaintenanceEnabled(), false);
  }
  await query("INSERT INTO public.maintenance_check VALUES ($1)", [1]);
  await transaction(db => db.query("INSERT INTO public.maintenance_check VALUES (2)"));
  await assert.rejects(transaction(async db => {
    process.env.DATABASE_MAINTENANCE = "true";
    await db.query("INSERT INTO public.maintenance_check VALUES (3)");
  }));
  for (const value of ["true", "TRUE", "1", "invalid"]) {
    process.env.DATABASE_MAINTENANCE = value;
    assert.equal(databaseMaintenanceEnabled(), true);
  }
  process.env.DATABASE_MAINTENANCE = "true";
  assert.equal((await query("SELECT count(*)::integer AS n FROM public.maintenance_check")).rows[0].n, 2);
  assert.equal((await query("SELECT current_setting('transaction_read_only') AS mode")).rows[0].mode, "on");
  for (const sql of [
    "INSERT INTO public.maintenance_check VALUES (4)",
    "UPDATE public.maintenance_check SET n=4", "DELETE FROM public.maintenance_check",
    "TRUNCATE public.maintenance_check", "ALTER TABLE public.maintenance_check ADD COLUMN x int",
    "WITH changed AS (INSERT INTO public.maintenance_check VALUES (4) RETURNING n) SELECT * FROM changed",
    "SELECT public.maintenance_write()",
    "SELECT set_config('transaction_read_only','off',true)",
    "SET TRANSACTION READ WRITE", "COMMIT; INSERT INTO public.maintenance_check VALUES (4)",
  ]) await assert.rejects(query(sql), DatabaseMaintenanceError);
  let called = false;
  await assert.rejects(transaction(async () => { called = true; }), DatabaseMaintenanceError);
  assert.equal(called, false);
  assert.equal((await operator.query('SELECT count(*)::integer AS n FROM public.maintenance_check')).rows[0].n, 2);
  await closeDatabasePool();
  const tableNames = (await operator.query("SELECT relname FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r' ORDER BY relname")).rows.map(row => row.relname);
  const counts = async () => Promise.all(tableNames.map(async name => (await operator.query(`SELECT count(*)::integer AS n FROM public."${name.replaceAll('"', '""')}"`)).rows[0].n));
  const beforeHttp = await counts();

  const apiRoutes = ["/api/applications", "/api/internal/worker", "/api/internal/cron-probe",
    "/api/internal/compatibility/database", "/api/internal/compatibility/outbound", "/api/internal/compatibility/upload",
    "/api/internal/compatibility/revalidation", "/api/internal/compatibility/server", "/api/internal/staff-auth/read",
    "/api/internal/staff-auth/verify", "/api/staff/candidate-files/synthetic/download", "/api/staff/candidate-files/synthetic/quarantine",
    "/api/staff/candidate-files/synthetic/review/initiate", "/api/staff/candidate-files/synthetic/review"];
  const publicRoutes = ["/", "/company", "/culture", "/accessibility", "/careers", "/work", "/join"];
  const port = Number(process.env.MAINTENANCE_TEST_PORT || 3317);
  const base = `http://127.0.0.1:${port}`;
  for (const enabled of ["false", "true"]) {
    process.env.DATABASE_MAINTENANCE = enabled;
    for (const route of publicRoutes) assert.equal(maintenanceBlocksRequest("GET", route), false);
    for (const route of apiRoutes) assert.equal(maintenanceBlocksRequest("POST", route), enabled === "true");
    await assert.rejects(fetch(base));
    server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
      env: { ...process.env, NODE_ENV: "production" }, stdio: "ignore", windowsHide: true,
    });
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      assert.equal(server.exitCode, null);
      try { if ((await fetch(base, { signal: AbortSignal.timeout(1000) })).status === 200) { ready = true; break; } } catch { /* startup */ }
      await delay(250);
    }
    assert(ready);
    for (const route of publicRoutes) assert.equal((await fetch(base + route)).status, 200, route);
    if (enabled === "true") {
      for (const route of [...apiRoutes, "/staff", "/staff/content", "/internal/staff-auth"]) {
        for (const method of ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
          const r = await fetch(base + route, { method });
          assert.equal(r.status, 503, `${method} ${route}`);
          assert.match(r.headers.get("cache-control"), /no-store/);
          if (method !== "HEAD") assert.equal((await r.json()).code, "DATABASE_MAINTENANCE");
        }
      }
      assert.equal((await fetch(base, { method: "POST", headers: { "Next-Action": "synthetic" } })).status, 503);
      assert.equal((await fetch(base + "/join")).headers.get("content-security-policy").includes("nonce-"), true);
    } else {
      assert.equal((await fetch(base + "/api/applications", { method: "POST" })).status, 403);
      assert.equal((await fetch(base + "/api/internal/worker", { method: "POST" })).status, 503);
    }
    server.kill(); await new Promise(resolve => server.once("exit", resolve)); server = undefined;
  }
  assert.deepEqual(await counts(), beforeHttp);
  console.log(JSON.stringify({ status: "PASS", syntheticOnly: true, databaseReadOnlyEscapeChecks: 10, apiRoutes: apiRoutes.length, publicRoutes: publicRoutes.length, defaultOff: true, invalidValuesFreeze: true, allHttpTableCountsUnchanged: true }));
} finally {
  server?.kill();
  delete process.env.DATABASE_MAINTENANCE;
  await closeDatabasePool();
  await operator.end();
}

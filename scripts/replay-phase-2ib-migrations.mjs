import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import pg from "pg";

// Explicit disposable URL only; never load .env.local or reset an existing database.
const url = new URL(process.env.PHASE2IB_TEST_DATABASE_URL ?? "invalid:");
assert(["127.0.0.1", "localhost"].includes(url.hostname));
assert(/^\/phase2ib_[a-z0-9_]+$/.test(url.pathname));
const client = new pg.Client({ connectionString: url.href });
await client.connect();
try {
  assert.equal((await client.query("SELECT count(*)::int AS n FROM pg_tables WHERE schemaname = 'public'")).rows[0].n, 0,
    "Replay requires a completely empty disposable database.");
  await client.query(`CREATE TABLE public._prisma_migrations (id varchar(36) PRIMARY KEY, checksum varchar(64) NOT NULL,
    finished_at timestamptz, migration_name varchar(255) NOT NULL, logs text, rolled_back_at timestamptz,
    started_at timestamptz NOT NULL DEFAULT now(), applied_steps_count integer NOT NULL DEFAULT 0)`);
  const migrations = (await readdir("prisma/migrations", { withFileTypes: true })).filter(e => e.isDirectory()).map(e => e.name).sort();
  for (const name of migrations) {
    const sql = await readFile(`prisma/migrations/${name}/migration.sql`, "utf8");
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query(`INSERT INTO public._prisma_migrations (id,checksum,migration_name,finished_at,applied_steps_count)
        VALUES ($1,$2,$3,clock_timestamp(),1)`, [randomUUID(), createHash("sha256").update(sql).digest("hex"), name]);
      await client.query("COMMIT");
      console.log(`REPLAY_OK ${name}`);
    } catch (error) { await client.query("ROLLBACK"); throw error; }
  }
  const security = await client.query(`SELECT count(*)::int AS tables, count(*) FILTER (WHERE relrowsecurity)::int AS rls
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'`);
  assert.equal(security.rows[0].tables, security.rows[0].rls);
  const policies = (await client.query("SELECT roles::text[] AS roles FROM pg_policies WHERE schemaname='public'")).rows;
  assert.equal(policies.length, 54);
  assert(policies.every(p => p.roles.length === 1 && ["pyramid_runtime", "pyramid_reference_locker"].includes(p.roles[0])));
  const grants = await client.query(`SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    CROSS JOIN (VALUES ('anon'),('authenticated')) r(name)
    CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) p(name)
    WHERE n.nspname='public' AND c.relkind='r' AND has_table_privilege(r.name,c.oid,p.name)`);
  assert.equal(grants.rows[0].n, 0);
  const functions = await client.query(`SELECT count(*)::int AS n FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    CROSS JOIN (VALUES ('anon'),('authenticated')) r(name) WHERE n.nspname='public' AND has_function_privilege(r.name,p.oid,'EXECUTE')`);
  assert.equal(functions.rows[0].n, 0);
  console.log(`PHASE_2IB_REPLAY_OK migrations=${migrations.length} rls=${security.rows[0].rls} prohibited_grants=0 public_functions=0`);
} finally { await client.end(); }

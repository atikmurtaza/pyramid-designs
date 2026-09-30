import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import pg from "pg";

// Direct local PostgreSQL checks, not proof of Neon TLS, pooling or cold starts.
const url = new URL(process.env.PHASE2IB_TEST_DATABASE_URL ?? "invalid:");
assert(["127.0.0.1", "localhost"].includes(url.hostname));
assert(/^\/phase2ib_[a-z0-9_]+$/.test(url.pathname));
assert(!existsSync(".env.local"));
assert.equal(Number(process.versions.node.split(".")[0]), 22);
process.env.DATABASE_URL = url.href;
const db = await import("../src/lib/server/database.ts");
const worker = await import("../src/lib/server/background-worker.ts");
let checks = 0;
const check = (actual, expected) => { assert.deepEqual(actual, expected); checks++; };
const admin = new pg.Client({ connectionString: url.href });
await admin.connect();
try {
  check((await db.query("SELECT $1::int AS n", [42])).rows[0].n, 42);
  const results = await Promise.all(Array.from({ length: 24 }, () => db.query("SELECT pg_backend_pid() AS pid, pg_sleep(0.02)")));
  check(new Set(results.map(result => result.rows[0].pid)).size <= 3, true);
  const pool = globalThis.pyramidDatabasePool;
  check([pool.options.max, pool.options.idleTimeoutMillis, pool.options.connectionTimeoutMillis, pool.options.application_name],
    [3, 10_000, 10_000, "pyramid-designs"]);
  await db.transaction(async executor => {
    const first = (await executor.query("SELECT pg_backend_pid() AS pid, current_setting('transaction_isolation') AS isolation")).rows[0];
    check(first.isolation, "read committed");
    check((await executor.query("SELECT pg_backend_pid() AS pid")).rows[0].pid, first.pid);
  });
  await db.transaction(async executor => {
    await executor.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
    check((await executor.query("SHOW transaction_isolation")).rows[0].transaction_isolation, "repeatable read");
  });
  await worker.workerTransaction(async executor => {
    check((await executor.query(`SELECT current_setting('statement_timeout') AS statement,
      current_setting('lock_timeout') AS lock, current_setting('idle_in_transaction_session_timeout') AS idle`)).rows[0],
      { statement: "2s", lock: "1s", idle: "3s" });
  });
  let release, occupied = 0, ready;
  const gate = new Promise(resolve => { release = resolve; });
  const allOccupied = new Promise(resolve => { ready = resolve; });
  const held = Array.from({ length: 3 }, () => db.transaction(async () => {
    if (++occupied === 3) ready();
    await gate;
  }));
  await allOccupied;
  try { await assert.rejects(db.query("SELECT 1")); checks++; }
  finally { release(); await Promise.all(held); }
  check((await db.query("SELECT 1 AS n")).rows[0].n, 1);
  // Terminate only this test database's own runtime connections, then prove a
  // later invocation reconnects without retrying an uncertain transaction.
  await admin.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity
    WHERE datname=current_database() AND application_name='pyramid-designs' AND pid<>pg_backend_pid()`);
  await delay(100);
  check((await db.query("SELECT 2 AS n")).rows[0].n, 2);
  await delay(10_250);
  check(pool.totalCount, 0);
  check((await db.query("SELECT 3 AS n")).rows[0].n, 3);
  const tls = new pg.Client({ connectionString: "postgresql://synthetic@ep-synthetic-pooler.region.neon.tech/synthetic?sslmode=verify-full" }).connectionParameters.ssl;
  check(tls !== false && tls.rejectUnauthorized !== false && tls.checkServerIdentity === undefined, true);
  await db.closeDatabasePool();
  process.env.DATABASE_URL = "postgresql://synthetic@127.0.0.1:1/phase2ib_b1_unavailable";
  await assert.rejects(db.query("SELECT 1")); checks++;
  await assert.rejects(db.transaction(executor => executor.query("SELECT 1")),
    { name: "DatabaseTransactionError", message: "Database transaction failed." }); checks++;
  console.log(`B1_PG_RUNTIME_OK checks=${checks} peak_connections=3 queued_timeout=verified idle_eviction=verified reconnect=verified live_neon=false`);
} finally {
  await db.closeDatabasePool();
  await admin.end();
  process.env.DATABASE_URL = url.href;
}

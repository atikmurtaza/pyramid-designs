import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

assert.equal(
  Number(process.versions.node.split(".")[0]),
  22,
  "Phase 2A pg verification must run under Node.js 22.",
);

const databaseModule = await import("../src/lib/server/database.ts");
const probeModule = await import("../src/lib/server/compatibility-probe.ts");

const commitLabel = "phase-2a-transaction-commit";
const rollbackLabel = "phase-2a-transaction-rollback";

try {
  const raw = await databaseModule.query("SELECT 1 AS value");
  assert.equal(raw.rows[0]?.value, 1);

  const parameterized = await databaseModule.query("SELECT $1::integer AS value", [42]);
  assert.equal(parameterized.rows[0]?.value, 42);

  await databaseModule.transaction((db) =>
    db.query(
      `INSERT INTO public."CompatibilityProbe" ("id", "label")
       VALUES ($1, $2)
       ON CONFLICT ("label") DO UPDATE SET "label" = EXCLUDED."label"`,
      [randomUUID(), commitLabel],
    ),
  );
  const committed = await databaseModule.query(
    `SELECT COUNT(*)::integer AS count
     FROM public."CompatibilityProbe"
     WHERE "label" = $1`,
    [commitLabel],
  );
  assert.equal(committed.rows[0]?.count, 1);

  await assert.rejects(
    databaseModule.transaction(async (db) => {
      await db.query(
        `INSERT INTO public."CompatibilityProbe" ("id", "label")
         VALUES ($1, $2)
         ON CONFLICT ("label") DO UPDATE SET "label" = EXCLUDED."label"`,
        [randomUUID(), rollbackLabel],
      );
      throw new Error("synthetic rollback request");
    }),
    { name: "DatabaseTransactionError", message: "Database transaction failed." },
  );
  const rolledBack = await databaseModule.query(
    `SELECT COUNT(*)::integer AS count
     FROM public."CompatibilityProbe"
     WHERE "label" = $1`,
    [rollbackLabel],
  );
  assert.equal(rolledBack.rows[0]?.count, 0);

  const firstDatabaseProbe = await probeModule.recordAndCountCompatibilityProbe(
    "phase-2a-database-probe",
  );
  const secondDatabaseProbe = await probeModule.recordAndCountCompatibilityProbe(
    "phase-2a-database-probe",
  );
  assert.equal(firstDatabaseProbe.matchingRows, 1);
  assert.deepEqual(secondDatabaseProbe, firstDatabaseProbe);

  const firstCronProbe = await probeModule.recordCompatibilityProbe(
    "phase-2a-cron-probe",
  );
  const secondCronProbe = await probeModule.recordCompatibilityProbe(
    "phase-2a-cron-probe",
  );
  assert.equal(secondCronProbe, firstCronProbe);

  console.log("PHASE_2A_PG_RUNTIME_OK");
} finally {
  await databaseModule.query(
    `DELETE FROM public."CompatibilityProbe" WHERE "label" = ANY($1::text[])`,
    [[commitLabel, rollbackLabel]],
  );
  await databaseModule.closeDatabasePool();
}

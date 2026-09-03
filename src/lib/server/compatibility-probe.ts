import "server-only";

import { randomUUID } from "node:crypto";

import {
  database,
  transaction,
  type DatabaseExecutor,
} from "./database.ts";

export type CompatibilityProbeLabel =
  | "phase-2a-database-probe"
  | "phase-2a-cron-probe";

type TimestampRow = { createdAt: Date | string };
type CountRow = { matchingRows: number };

function mapTimestamp(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) {
    throw new Error("Unexpected compatibility probe timestamp.");
  }
  return date.toISOString();
}

async function upsertProbe(label: CompatibilityProbeLabel, db: DatabaseExecutor) {
  const result = await db.query<TimestampRow>(
    `INSERT INTO public."CompatibilityProbe" ("id", "label")
     VALUES ($1, $2)
     ON CONFLICT ("label") DO UPDATE SET "label" = EXCLUDED."label"
     RETURNING "createdAt"`,
    [randomUUID(), label],
  );
  const row = result.rows[0];
  if (!row) throw new Error("Compatibility probe upsert returned no row.");
  return mapTimestamp(row.createdAt);
}

async function countProbes(label: CompatibilityProbeLabel, db: DatabaseExecutor) {
  const result = await db.query<CountRow>(
    `SELECT COUNT(*)::integer AS "matchingRows"
     FROM public."CompatibilityProbe"
     WHERE "label" = $1`,
    [label],
  );
  const matchingRows = result.rows[0]?.matchingRows;
  if (!Number.isInteger(matchingRows)) {
    throw new Error("Compatibility probe count returned an unexpected value.");
  }
  return matchingRows;
}

export function recordCompatibilityProbe(label: CompatibilityProbeLabel) {
  return upsertProbe(label, database);
}

export function recordAndCountCompatibilityProbe(label: CompatibilityProbeLabel) {
  return transaction(async (db) => ({
    createdAt: await upsertProbe(label, db),
    matchingRows: await countProbes(label, db),
  }));
}

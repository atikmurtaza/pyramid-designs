import "server-only";

import { randomUUID } from "node:crypto";

import { database, type DatabaseExecutor } from "../database.ts";

export async function incrementRateLimitBucket(
  input: {
    scope: string;
    keyDigest: string;
    windowStartedAt: Date;
    expiresAt: Date;
  },
  executor: DatabaseExecutor = database,
) {
  const result = await executor.query<{ count: number }>(
    `INSERT INTO public."RateLimitBucket" (
       "id", "scope", "keyDigest", "windowStartedAt", "count", "expiresAt"
     ) VALUES ($1, $2, $3, $4, 1, $5)
     ON CONFLICT ("scope", "keyDigest", "windowStartedAt")
     DO UPDATE SET "count" = public."RateLimitBucket"."count" + 1
     RETURNING "count"`,
    [randomUUID(), input.scope, input.keyDigest, input.windowStartedAt, input.expiresAt],
  );
  return result.rows[0]?.count ?? 0;
}

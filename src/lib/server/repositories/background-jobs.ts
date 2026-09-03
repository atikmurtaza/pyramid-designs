import "server-only";

import { randomUUID } from "node:crypto";

import { database, transaction, type DatabaseExecutor } from "../database.ts";

export interface ClaimedBackgroundJob {
  id: string;
  jobType: string;
  applicationId: string | null;
  candidateFileId: string | null;
  payloadReference: string | null;
  safePayload: Record<string, string | number | boolean | null> | null;
  attemptCount: number;
  maxAttempts: number;
  claimToken: string;
  leaseUntil: Date;
}
interface ClaimCandidateRow {
  id: string;
}

interface ClaimedBackgroundJobRow extends Omit<ClaimedBackgroundJob, "safePayload"> {
  safePayload: ClaimedBackgroundJob["safePayload"];
}

export async function enqueueBackgroundJob(
  input: {
    jobType: string;
    applicationId?: string;
    candidateFileId?: string;
    payloadReference?: string;
    safePayload?: Record<string, string | number | boolean | null>;
    dedupeKey?: string;
    maxAttempts?: number;
    availableAt?: Date;
  },
  executor: DatabaseExecutor = database,
) {
  const id = randomUUID();
  const result = await executor.query<{ id: string }>(
    `INSERT INTO public."BackgroundJob" (
       "id", "jobType", "applicationId", "candidateFileId", "payloadReference",
       "safePayload", "dedupeKey", "maxAttempts", "availableAt", "updatedAt"
     ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, CURRENT_TIMESTAMP)
     ON CONFLICT ("dedupeKey") DO NOTHING
     RETURNING "id"`,
    [
      id,
      input.jobType,
      input.applicationId ?? null,
      input.candidateFileId ?? null,
      input.payloadReference ?? null,
      input.safePayload ? JSON.stringify(input.safePayload) : null,
      input.dedupeKey ?? null,
      input.maxAttempts ?? 5,
      input.availableAt ?? new Date(),
    ],
  );
  if (result.rows[0]) return result.rows[0].id;

  const existing = await executor.query<{ id: string }>(
    `SELECT "id" FROM public."BackgroundJob" WHERE "dedupeKey" = $1`,
    [input.dedupeKey],
  );
  if (!existing.rows[0]) throw new Error("Background job could not be enqueued.");
  return existing.rows[0].id;
}

export async function claimBackgroundJobs(limit: number, leaseSeconds: number) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 25) {
    throw new Error("Background job claim limit is invalid.");
  }
  if (!Number.isInteger(leaseSeconds) || leaseSeconds < 1 || leaseSeconds > 3600) {
    throw new Error("Background job lease is invalid.");
  }

  return transaction(async (executor) => {
    const candidates = await executor.query<ClaimCandidateRow>(
      `SELECT "id"
       FROM public."BackgroundJob"
       WHERE (
         ("state" = 'QUEUED' AND "availableAt" <= CURRENT_TIMESTAMP)
         OR ("state" = 'RUNNING' AND "leaseUntil" <= CURRENT_TIMESTAMP)
       )
         AND "attemptCount" < "maxAttempts"
       ORDER BY "availableAt", "createdAt", "id"
       FOR UPDATE SKIP LOCKED
       LIMIT $1`,
      [limit],
    );

    const claimed: ClaimedBackgroundJob[] = [];
    for (const candidate of candidates.rows) {
      const claimToken = randomUUID();
      const result = await executor.query<ClaimedBackgroundJobRow>(
        `UPDATE public."BackgroundJob"
         SET "state" = 'RUNNING',
             "attemptCount" = "attemptCount" + 1,
             "claimedAt" = CURRENT_TIMESTAMP,
             "leaseUntil" = CURRENT_TIMESTAMP + make_interval(secs => $2),
             "claimToken" = $3,
             "failureClass" = NULL,
             "errorSummary" = NULL,
             "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = $1
         RETURNING "id", "jobType", "applicationId", "candidateFileId",
                   "payloadReference", "safePayload", "attemptCount", "maxAttempts",
                   "claimToken", "leaseUntil"`,
        [candidate.id, leaseSeconds, claimToken],
      );
      if (result.rows[0]) claimed.push({ ...result.rows[0] });
    }
    return claimed;
  });
}

export async function completeBackgroundJob(id: string, claimToken: string) {
  const result = await database.query<{ id: string }>(
    `UPDATE public."BackgroundJob"
     SET "state" = 'SUCCEEDED', "completedAt" = CURRENT_TIMESTAMP,
         "leaseUntil" = NULL, "claimToken" = NULL, "updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = $1 AND "state" = 'RUNNING' AND "claimToken" = $2
     RETURNING "id"`,
    [id, claimToken],
  );
  return result.rowCount === 1;
}

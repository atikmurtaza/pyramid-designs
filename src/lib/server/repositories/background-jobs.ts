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
  if (input.maxAttempts !== undefined && (!Number.isInteger(input.maxAttempts) || input.maxAttempts < 1 || input.maxAttempts > 10)) {
    throw new Error("Background job attempts are invalid.");
  }
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
    `SELECT "id" FROM public."BackgroundJob" WHERE "dedupeKey" = $1
       AND "jobType" = $2 AND "applicationId" IS NOT DISTINCT FROM $3::uuid
       AND "candidateFileId" IS NOT DISTINCT FROM $4::uuid
       AND "payloadReference" IS NOT DISTINCT FROM $5::text
       AND "safePayload" IS NOT DISTINCT FROM $6::jsonb`,
    [input.dedupeKey, input.jobType, input.applicationId ?? null, input.candidateFileId ?? null,
      input.payloadReference ?? null, input.safePayload ? JSON.stringify(input.safePayload) : null],
  );
  if (!existing.rows[0]) throw new Error("Background job could not be enqueued.");
  return existing.rows[0].id;
}

export async function claimBackgroundJobs(limit: number, leaseSeconds: number, executor?: DatabaseExecutor) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 25) {
    throw new Error("Background job claim limit is invalid.");
  }
  if (!Number.isInteger(leaseSeconds) || leaseSeconds < 1 || leaseSeconds > 3600) {
    throw new Error("Background job lease is invalid.");
  }

  const claim = async (executor: DatabaseExecutor) => {
    const candidates = await executor.query<ClaimCandidateRow>(
      `SELECT "id"
       FROM public."BackgroundJob"
       WHERE (
         ("state" = 'QUEUED' AND "availableAt" <= clock_timestamp())
         OR ("state" = 'RUNNING' AND "leaseUntil" <= clock_timestamp())
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
             "claimedAt" = clock_timestamp(),
             "leaseUntil" = clock_timestamp() + make_interval(secs => $2),
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
      if (result.rowCount !== 1) throw new Error("Background job claim failed.");
      claimed.push({ ...result.rows[0] });
    }
    return claimed;
  };
  return executor ? claim(executor) : transaction(claim);
}

export async function completeBackgroundJob(id: string, claimToken: string, executor?: DatabaseExecutor): Promise<boolean> {
  if (!executor) return transaction(e => completeBackgroundJob(id, claimToken, e));
  await executor.query('SELECT "id" FROM public."BackgroundJob" WHERE "id" = $1 FOR UPDATE', [id]);
  const result = await executor.query<{ id: string }>(
    `UPDATE public."BackgroundJob"
     SET "state" = 'SUCCEEDED', "completedAt" = clock_timestamp(),
         "leaseUntil" = NULL, "claimToken" = NULL, "claimedAt" = NULL, "updatedAt" = clock_timestamp()
     WHERE "id" = $1 AND "state" = 'RUNNING' AND "claimToken" = $2
       AND "leaseUntil" > clock_timestamp()
     RETURNING "id"`,
    [id, claimToken],
  );
  return result.rowCount === 1;
}

// Only fixed classifications reach persistence; never persist Error.message.
export const JOB_FAILURES = Object.freeze({
  TRANSIENT: "Temporary operation failure.",
  DOMAIN: "Domain state does not permit this operation.",
  CONFIGURATION: "Required configuration or policy is unavailable.",
  SECURITY: "Object identity or security verification failed.",
  PAYLOAD: "Job type or payload is unsupported.",
  EXHAUSTED: "The permitted attempts were exhausted.",
  EMAIL_AMBIGUOUS: "Acceptance is unknown; manual reconciliation is required before any resend.",
  EMAIL_SUPPRESSED: "Candidate confirmation is no longer applicable.",
  EMAIL_RECIPIENT: "The recipient was invalid or definitely rejected.",
  EMAIL_AUTH: "Email authentication is unavailable.",
});
export type JobFailure = keyof typeof JOB_FAILURES;

export async function failBackgroundJob(id: string, claimToken: string, failure: JobFailure,
  executor?: DatabaseExecutor): Promise<"QUEUED" | "DEAD" | null> {
  if (!Object.hasOwn(JOB_FAILURES, failure)) throw new Error("Invalid job failure classification.");
  if (!executor) return transaction(e => failBackgroundJob(id, claimToken, failure, e));
  await executor.query('SELECT "id" FROM public."BackgroundJob" WHERE "id" = $1 FOR UPDATE', [id]);
  const result = await executor.query<{ state: "QUEUED" | "DEAD" }>(`UPDATE public."BackgroundJob"
    SET "state" = CASE WHEN $3 = 'TRANSIENT' AND "attemptCount" < "maxAttempts"
          THEN 'QUEUED'::"BackgroundJobState" ELSE 'DEAD'::"BackgroundJobState" END,
        "availableAt" = CASE WHEN $3 = 'TRANSIENT' AND "attemptCount" < "maxAttempts"
          THEN clock_timestamp() + make_interval(secs => least(3600, 60 * power(2, least("attemptCount" - 1, 6)))::int)
          ELSE "availableAt" END,
        "completedAt" = CASE WHEN $3 = 'TRANSIENT' AND "attemptCount" < "maxAttempts" THEN NULL ELSE clock_timestamp() END,
        "failureClass" = CASE WHEN $3 = 'TRANSIENT' AND "attemptCount" >= "maxAttempts" THEN 'EXHAUSTED' ELSE $3 END,
        "errorSummary" = CASE WHEN $3 = 'TRANSIENT' AND "attemptCount" >= "maxAttempts" THEN $5 ELSE $4 END,
        "claimedAt" = NULL, "leaseUntil" = NULL, "claimToken" = NULL, "updatedAt" = clock_timestamp()
    WHERE "id" = $1 AND "state" = 'RUNNING' AND "claimToken" = $2 AND "leaseUntil" > clock_timestamp()
    RETURNING "state"`, [id, claimToken, failure, JOB_FAILURES[failure], JOB_FAILURES.EXHAUSTED]);
  return result.rowCount === 1 ? result.rows[0].state : null;
}

export async function recoverExhaustedJobs(executor: DatabaseExecutor = database) {
  const result = await executor.query<{ id: string }>(`WITH exhausted AS (
    SELECT "id" FROM public."BackgroundJob" WHERE "state" = 'RUNNING'
      AND "leaseUntil" <= clock_timestamp() AND "attemptCount" >= "maxAttempts"
    ORDER BY "leaseUntil", "id" FOR UPDATE SKIP LOCKED LIMIT 5
  ) UPDATE public."BackgroundJob" job SET "state" = 'DEAD', "completedAt" = clock_timestamp(),
      "claimedAt" = NULL, "leaseUntil" = NULL, "claimToken" = NULL, "failureClass" = 'EXHAUSTED',
      "errorSummary" = 'Final attempt lease expired.', "updatedAt" = clock_timestamp()
    FROM exhausted WHERE job."id" = exhausted."id" RETURNING job."id"`);
  return result.rows;
}

export async function requireJobOwnership(job: Pick<ClaimedBackgroundJob, "id" | "claimToken">,
  executor: DatabaseExecutor) {
  await executor.query('SELECT "id" FROM public."BackgroundJob" WHERE "id" = $1 FOR UPDATE', [job.id]);
  const result = await executor.query(`SELECT "id" FROM public."BackgroundJob"
    WHERE "id" = $1 AND "state" = 'RUNNING' AND "claimToken" = $2 AND "leaseUntil" > clock_timestamp()`, [job.id, job.claimToken]);
  if (result.rowCount !== 1) throw new Error("Background job ownership lost.");
}

// The uploader uses the same ownership row as recovery; no dedupe-key acknowledgement.
export async function claimUploadJob(id: string, executor: DatabaseExecutor) {
  await executor.query('SELECT "id" FROM public."BackgroundJob" WHERE "id" = $1 FOR UPDATE', [id]);
  const result = await executor.query<ClaimedBackgroundJob>(`UPDATE public."BackgroundJob"
    SET "state" = 'RUNNING', "attemptCount" = "attemptCount" + 1, "claimToken" = $2,
      "claimedAt" = clock_timestamp(), "leaseUntil" = clock_timestamp() + interval '60 seconds', "updatedAt" = clock_timestamp()
    WHERE "id" = $1 AND "jobType" = 'CANDIDATE_FILE_STORAGE_RECONCILE' AND "attemptCount" < "maxAttempts"
      AND (("state" = 'QUEUED' AND "availableAt" <= clock_timestamp()) OR ("state" = 'RUNNING' AND "leaseUntil" <= clock_timestamp()))
    RETURNING "id", "jobType", "applicationId", "candidateFileId", "payloadReference", "safePayload",
      "attemptCount", "maxAttempts", "claimToken", "leaseUntil"`, [id, randomUUID()]);
  if (result.rowCount !== 1) throw new Error("Upload reconciliation ownership unavailable.");
  return result.rows[0];
}

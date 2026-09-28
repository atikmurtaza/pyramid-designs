import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import type { QueryResultRow } from "pg";
import { transaction, type DatabaseExecutor } from "./database.ts";
import { finalizeCandidateFile } from "./candidate-files.ts";
import { googleDriveStorage, googleStorageConfigured, StorageOperationError, type WorkerStorage, type ExpectedStoredFile } from "./google-drive.ts";
import { CandidateFileUnavailable } from "./candidate-file-policy.ts";
import { NOTIFICATION_JOB, validateNotificationJob, sendCandidateConfirmation, unavailableEmailAdapter,
  type EmailAdapter } from "./candidate-notifications.ts";
import { configuredEmailAdapter, emailReadiness } from "./resend-email.ts";
import { appendAuditEvent } from "./repositories/audit.ts";
import { claimBackgroundJobs, completeBackgroundJob, enqueueBackgroundJob, failBackgroundJob,
  recoverExhaustedJobs, requireJobOwnership, type ClaimedBackgroundJob, type JobFailure } from "./repositories/background-jobs.ts";

export const WORKER_BOUNDS = Object.freeze({ jobs: 5, invocationMs: 20_000, externalMs: 10_000,
  finalizationMs: 3_000, leaseSeconds: 60, admissionSeconds: 60, recoveryJobs: 5 });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const admissionScope = "PHASE_2IB_WORKER";
const admissionKey = createHash("sha256").update(admissionScope).digest("hex");
type RunTransaction = typeof transaction;
export class WorkerFailure extends Error {
  classification: JobFailure;
  constructor(classification: JobFailure) { super("Worker operation unavailable."); this.classification = classification; }
}
function fail(classification: JobFailure): never { throw new WorkerFailure(classification); }

// Every worker transaction has bounded lock and statement waits; external calls use no executor.
export async function workerTransaction<T>(work: (executor: DatabaseExecutor) => Promise<T>) {
  let classification: JobFailure | undefined;
  try { return await transaction(async (executor) => {
    await executor.query("SET LOCAL statement_timeout = '2000ms'");
    await executor.query("SET LOCAL lock_timeout = '1000ms'");
    await executor.query("SET LOCAL idle_in_transaction_session_timeout = '3000ms'");
    try { return await work(executor); }
    catch (error) { if (error instanceof WorkerFailure) classification = error.classification; throw error; }
  }); } catch (error) { if (classification) throw new WorkerFailure(classification); throw error; }
}

export function validateWorkerJob(job: ClaimedBackgroundJob) {
  if (!uuid.test(job.id) || job.payloadReference !== null || !Number.isInteger(job.maxAttempts)
    || job.maxAttempts < 1 || job.maxAttempts > 10) fail("PAYLOAD");
  const payload = job.safePayload;
  if (job.jobType === NOTIFICATION_JOB) {
    try { validateNotificationJob(job); } catch { fail("PAYLOAD"); }
    return "notification";
  }
  if (!payload || Array.isArray(payload) || Object.keys(payload).length !== 1) fail("PAYLOAD");
  if (job.jobType === "CANDIDATE_FILE_STORAGE_RECONCILE") {
    if (!job.candidateFileId || !uuid.test(job.candidateFileId) || job.applicationId !== null
      || payload.operation !== "VERIFY_OR_DELETE") fail("PAYLOAD");
    return "reconciliation";
  }
  if (job.jobType === "APPLICATION_RETENTION_DELETE") {
    if (!job.applicationId || !uuid.test(job.applicationId) || job.candidateFileId !== null || payload.version !== 1) fail("PAYLOAD");
    return "retention";
  }
  return fail("PAYLOAD");
}

type FileSnapshot = { id: string; applicationId: string; driveFileId: string | null; storedFilename: string;
  sizeBytes: number; contentHash: string | null; technicalStatus: string; securityStatus: string; version: number;
  deletionRequestedAt: Date | null; deletionCompletedAt: Date | null; due: boolean; applicationStatus: string };
async function loadFile(id: string, executor: DatabaseExecutor) {
  const result = await executor.query<FileSnapshot>(`SELECT f."id", f."applicationId", f."driveFileId", f."storedFilename",
    f."sizeBytes", f."contentHash", f."technicalStatus", f."securityStatus", f."version",
    a."deletionRequestedAt", a."deletionCompletedAt", a."expiresAt" <= clock_timestamp() AS due,
    a."technicalStatus" AS "applicationStatus" FROM public."CandidateFile" f
    JOIN public."Application" a ON a."id" = f."applicationId" WHERE f."id" = $1 FOR UPDATE OF a, f`, [id]);
  return result.rows[0] ?? fail("DOMAIN");
}
function expectedFile(file: FileSnapshot): ExpectedStoredFile {
  if (!file.driveFileId || !file.contentHash || !/^[a-f0-9]{64}$/.test(file.contentHash)) fail("SECURITY");
  return { id: file.driveFileId, name: file.storedFilename, size: file.sizeBytes, digest: file.contentHash };
}

export async function reconcileCandidateFile(job: ClaimedBackgroundJob, storage: WorkerStorage,
  run: RunTransaction = workerTransaction) {
  if (validateWorkerJob(job) !== "reconciliation") fail("PAYLOAD");
  const before = await run(async (executor) => {
    await requireJobOwnership(job, executor);
    const file = await loadFile(job.candidateFileId!, executor);
    if (file.deletionRequestedAt || file.deletionCompletedAt || file.due
      || !["UPLOAD_PENDING", "QUARANTINED"].includes(file.technicalStatus)
      || !["SUBMISSION_PENDING", "SECURITY_PENDING"].includes(file.applicationStatus)
      || file.securityStatus !== "UNREVIEWED") fail("DOMAIN");
    return file;
  });
  // Reconciliation never deletes; missing or late uploads retain their reserved identity.
  if (!await storage.verify(expectedFile(before))) fail("TRANSIENT");
  await run(async (executor) => {
    await requireJobOwnership(job, executor);
    const current = await loadFile(before.id, executor);
    if (current.version !== before.version || current.driveFileId !== before.driveFileId || current.contentHash !== before.contentHash) fail("DOMAIN");
    await finalizeCandidateFile(executor, current.id, before.contentHash!, job);
  });
}

// Legal production erasure policy is unresolved. Only the existing explicit test policy
// is executable in non-production. A new policy requires a reviewed code change.
function approvedRetentionPolicy(a: { category: string; policyVersion: string; source: string }) {
  return ["development", "test"].includes(process.env.NODE_ENV ?? "")
    && a.category === "SYNTHETIC_JOB_APPLICATION" && a.policyVersion === "phase-2b-fixture-v1"
    && ["SYNTHETIC_PUBLIC_INTAKE", "SYNTHETIC_TEST", "SYNTHETIC_SEED"].includes(a.source);
}

export async function enqueueDueRetention(executor: DatabaseExecutor) {
  // Production work is not silently erased under an unapproved policy.
  if (!["development", "test"].includes(process.env.NODE_ENV ?? "")) return 0;
  const due = await executor.query<{ id: string }>(`SELECT a."id" FROM public."Application" a
    JOIN public."RetentionPolicy" p ON p."id" = a."retentionPolicyId"
    WHERE a."expiresAt" <= clock_timestamp() AND a."deletionCompletedAt" IS NULL
      AND p."category" = 'SYNTHETIC_JOB_APPLICATION' AND p."version" = 'phase-2b-fixture-v1'
      AND a."source" IN ('SYNTHETIC_PUBLIC_INTAKE', 'SYNTHETIC_TEST', 'SYNTHETIC_SEED')
      AND NOT EXISTS (SELECT 1 FROM public."BackgroundJob" j WHERE j."dedupeKey" = 'application-retention:' || a."id"::text)
    ORDER BY a."expiresAt", a."id" FOR UPDATE OF a SKIP LOCKED LIMIT 5`);
  for (const a of due.rows) await enqueueBackgroundJob({ jobType: "APPLICATION_RETENTION_DELETE", applicationId: a.id,
    dedupeKey: `application-retention:${a.id}`, safePayload: { version: 1 } }, executor);
  return due.rowCount ?? 0;
}

async function fileDeletionIntent(executor: DatabaseExecutor, job: ClaimedBackgroundJob, fileId: string) {
  const r = await executor.query(`SELECT "id" FROM public."AuditEvent" WHERE "targetId" = $1
    AND "targetType" = 'CANDIDATE_FILE' AND "actionCode" = 'RETENTION_STORAGE_VERIFIED'
    AND "actorType" = 'SYSTEM' AND "outcome" = 'SUCCEEDED' AND "correlationId" = $2 LIMIT 1`, [fileId, job.id]);
  return r.rowCount === 1;
}

export async function deleteRetainedApplication(job: ClaimedBackgroundJob, storage: WorkerStorage,
  run: RunTransaction = workerTransaction) {
  if (validateWorkerJob(job) !== "retention") fail("PAYLOAD");
  const before = await run(async (executor) => {
    await requireJobOwnership(job, executor);
    const result = await executor.query<{ id: string; due: boolean; deletionRequestedAt: Date | null;
      deletionCompletedAt: Date | null; category: string; policyVersion: string; source: string;
      technicalStatus: string; hiringStatus: string | null }>(`SELECT a."id", a."expiresAt" <= clock_timestamp() AS due,
      a."deletionRequestedAt", a."deletionCompletedAt", a."source", a."technicalStatus", a."hiringStatus",
      p."category", p."version" AS "policyVersion" FROM public."Application" a
      JOIN public."RetentionPolicy" p ON p."id" = a."retentionPolicyId" WHERE a."id" = $1 FOR UPDATE OF a`, [job.applicationId]);
    const a = result.rows[0] ?? fail("DOMAIN");
    if (!approvedRetentionPolicy(a)) fail("CONFIGURATION");
    if (!a.due || a.deletionCompletedAt) fail("DOMAIN");
    // Serialize send admission with erasure responsibility on the application lock.
    // A claimed notification can hold recipient data until its bounded call finishes.
    const sending = await executor.query(`SELECT "id" FROM public."BackgroundJob"
      WHERE "applicationId" = $1 AND "jobType" = 'CANDIDATE_SUBMISSION_NOTIFICATION'
        AND "state" = 'RUNNING' AND "leaseUntil" > clock_timestamp() LIMIT 1`, [a.id]);
    if (sending.rowCount) fail("TRANSIENT");
    // Timeout/lease expiry does not cancel an external effect. Unresolved send intent
    // requires manual reconciliation before erasure can overtake a possible late send.
    const uncertainSend = await executor.query(`SELECT j."id" FROM public."BackgroundJob" j
      JOIN public."AuditEvent" i ON i."targetType" = 'BACKGROUND_JOB' AND i."targetId" = j."id"
      WHERE j."applicationId" = $1 AND j."jobType" = 'CANDIDATE_SUBMISSION_NOTIFICATION' AND j."state" <> 'SUCCEEDED'
        AND i."actorType" = 'SYSTEM' AND i."actionCode" = 'NOTIFICATION_SEND_INTENT'
        AND NOT EXISTS (SELECT 1 FROM public."AuditEvent" r WHERE r."targetType" = i."targetType"
          AND r."targetId" = i."targetId" AND r."actorType" = 'SYSTEM' AND r."correlationId" = i."correlationId"
          AND r."actionCode" = 'NOTIFICATION_NOT_ACCEPTED' AND r."safeMetadata" = i."safeMetadata") LIMIT 1`, [a.id]);
    if (uncertainSend.rowCount) fail("EMAIL_AMBIGUOUS");
    const ids = await executor.query<{ id: string }>('SELECT "id" FROM public."CandidateFile" WHERE "applicationId" = $1 AND "technicalStatus" <> \'DELETED\' ORDER BY "id" LIMIT 2 FOR UPDATE', [a.id]);
    if (ids.rows.length > 1) fail("DOMAIN");
    const file = ids.rows[0] ? await loadFile(ids.rows[0].id, executor) : null;
    if (file) {
      // An unfinished upload may still complete externally after timeout. Never infer
      // absence/deletion authority from UPLOAD_PENDING or an expired uploader alone.
      if (file.technicalStatus !== "QUARANTINED") fail("TRANSIENT");
      expectedFile(file);
      const reconciliation = await executor.query<{ state: string }>(`SELECT "state" FROM public."BackgroundJob"
        WHERE "candidateFileId" = $1 AND "jobType" = 'CANDIDATE_FILE_STORAGE_RECONCILE'
          AND "dedupeKey" = $2 FOR UPDATE`, [file.id, `candidate-file-reconcile:${file.id}`]);
      if (reconciliation.rows[0]?.state !== "SUCCEEDED") fail("TRANSIENT");
    }
    if (!a.deletionRequestedAt) {
      await appendAuditEvent({ actorType: "SYSTEM", actionCode: "RETENTION_STARTED", targetType: "APPLICATION",
        targetId: a.id, outcome: "SUCCEEDED", correlationId: job.id,
        safeMetadata: { technicalStatus: a.technicalStatus, hiringStatus: a.hiringStatus } }, executor);
      const updated = await executor.query(`UPDATE public."Application" SET "deletionRequestedAt" = clock_timestamp(),
        "updatedAt" = clock_timestamp() WHERE "id" = $1 AND "deletionRequestedAt" IS NULL`, [a.id]);
      if (updated.rowCount !== 1) fail("DOMAIN");
    }
    return { file, intent: file ? await fileDeletionIntent(executor, job, file.id) : false };
  });
  if (before.file) {
    const expected = expectedFile(before.file);
    if (!before.intent) {
      if (!await storage.verify(expected)) fail("TRANSIENT");
      await run(async (executor) => {
        await requireJobOwnership(job, executor);
        const current = await loadFile(before.file!.id, executor);
        if (!current.deletionRequestedAt || current.version !== before.file!.version
          || current.driveFileId !== expected.id || current.contentHash !== expected.digest) fail("DOMAIN");
        await appendAuditEvent({ actorType: "SYSTEM", actionCode: "RETENTION_STORAGE_VERIFIED", targetType: "CANDIDATE_FILE",
          targetId: current.id, outcome: "SUCCEEDED", correlationId: job.id }, executor);
      });
    }
    // Exact identity is frozen in DB; persisted pre-delete verification permits an
    // already-absent retry after external success and failed database finalization.
    await storage.erase(expected);
  }
  await run(async (executor) => {
    await requireJobOwnership(job, executor);
    await executor.query('SELECT "id" FROM public."Application" WHERE "id" = $1 FOR UPDATE', [job.applicationId]);
    // Final-state evidence spans Application/File/Job and commits as one unit.
    await executor.query("SET CONSTRAINTS ALL DEFERRED");
    if (before.file) {
      const current = await loadFile(before.file.id, executor);
      if (!current.deletionRequestedAt || current.version !== before.file.version
        || current.driveFileId !== before.file.driveFileId || current.contentHash !== before.file.contentHash
        || !await fileDeletionIntent(executor, job, current.id)) fail("DOMAIN");
      await appendAuditEvent({ actorType: "SYSTEM", actionCode: "RETENTION_FILE_DELETED", targetType: "CANDIDATE_FILE",
        targetId: current.id, outcome: "SUCCEEDED", correlationId: job.id }, executor);
      const erased = await executor.query(`UPDATE public."CandidateFile" SET "technicalStatus" = 'DELETED',
        "deletedAt" = clock_timestamp(), "driveFileId" = NULL, "driveZoneCode" = NULL, "contentHash" = NULL,
        "version" = "version" + 1, "updatedAt" = clock_timestamp() WHERE "id" = $1 AND "version" = $2`, [current.id, current.version]);
      if (erased.rowCount !== 1) fail("DOMAIN");
    }
    await executor.query('DELETE FROM public."ApplicationAnswer" WHERE "applicationId" = $1', [job.applicationId]);
    await appendAuditEvent({ actorType: "SYSTEM", actionCode: "RETENTION_COMPLETED", targetType: "APPLICATION",
      targetId: job.applicationId!, outcome: "SUCCEEDED", correlationId: job.id }, executor);
    const updated = await executor.query(`UPDATE public."Application" SET "fullName" = NULL, "email" = NULL, "city" = NULL,
      "phoneOrWhatsApp" = NULL, "specialism" = NULL, "portfolioUrl" = NULL, "professionalUrl" = NULL,
      "availabilityText" = NULL, "remoteAvailable" = NULL, "shortIntroduction" = NULL, "preferredEngagement" = NULL,
      "freelancerRateMinMinor" = NULL, "freelancerRateMaxMinor" = NULL, "rateCurrency" = NULL,
      "accommodationContactRequested" = false, "safeCampaignCode" = NULL, "experienceLevel" = '', "source" = '',
      "deletionCompletedAt" = clock_timestamp(), "updatedAt" = clock_timestamp()
      WHERE "id" = $1 AND "deletionRequestedAt" IS NOT NULL AND "deletionCompletedAt" IS NULL`, [job.applicationId]);
    if (updated.rowCount !== 1 || !await completeBackgroundJob(job.id, job.claimToken, executor)) fail("DOMAIN");
    await executor.query("SET CONSTRAINTS ALL IMMEDIATE");
  });
}

function classify(error: unknown): JobFailure {
  if (error instanceof WorkerFailure || error instanceof StorageOperationError) return error.classification;
  if (error instanceof CandidateFileUnavailable) return "SECURITY";
  return "TRANSIENT";
}

export async function runBackgroundWorker(dependencies: { run?: RunTransaction; storage?: (signal: AbortSignal) => WorkerStorage;
  email?: EmailAdapter } = {}) {
  const rawRun = dependencies.run ?? workerTransaction;
  const started = performance.now();
  const invocationId = randomUUID();
  const admissionToken = createHash("sha256").update(invocationId).digest("hex");
  const remaining = () => WORKER_BOUNDS.invocationMs - (performance.now() - started);
  // Includes pool waits and every statement, rather than restarting a timeout per phase.
  // A stalled acquire may return after the deadline; it performs no domain/effect work.
  const run: RunTransaction = work => rawRun(async executor => {
    if (remaining() <= 0) fail("TRANSIENT");
    const bounded: DatabaseExecutor = { query: async <Row extends QueryResultRow>(sql: string, values?: unknown[]) => {
      const ms = Math.floor(Math.min(2000, remaining()));
      if (ms <= 0) fail("TRANSIENT");
      await executor.query("SELECT set_config('statement_timeout', $1, true)", [`${ms}ms`]);
      const result = await executor.query<Row>(sql, values);
      if (remaining() <= 0) fail("TRANSIENT");
      return result;
    } };
    if (result.admitted) {
      // Admission is durable across processes and checked after locking, just like jobs.
      await bounded.query('SELECT "id" FROM public."IdempotencyRecord" WHERE "scope"=$1 AND "keyHash"=$2 FOR UPDATE', [admissionScope, admissionKey]);
      const ownership = await bounded.query(`SELECT "id" FROM public."IdempotencyRecord" WHERE "scope"=$1 AND "keyHash"=$2
        AND "requestHash"=$3 AND "expiresAt">clock_timestamp()`, [admissionScope, admissionKey, admissionToken]);
      if (ownership.rowCount !== 1) fail("DOMAIN");
    }
    return work(bounded);
  });
  const result = { invocationId, admitted: false, claimed: 0, succeeded: 0, retried: 0, dead: 0, recovered: 0,
    reconciled: 0, deleted: 0, unresolved: 0, due: 0, oldestDueSeconds: 0, emailReadiness: emailReadiness() };
  const admitted = await run(async (executor) => {
    const admission = await executor.query(`INSERT INTO public."IdempotencyRecord"
      ("id", "scope", "keyHash", "requestHash", "state", "expiresAt") VALUES ($1, $2, $3, $4, 'IN_PROGRESS', clock_timestamp() + interval '60 seconds')
      ON CONFLICT ("scope", "keyHash") DO UPDATE SET "requestHash" = EXCLUDED."requestHash", "expiresAt" = EXCLUDED."expiresAt"
      WHERE public."IdempotencyRecord"."expiresAt" <= clock_timestamp() RETURNING "id"`,
    [randomUUID(), admissionScope, admissionKey, admissionToken]);
    if (admission.rowCount !== 1) return false;
    await appendAuditEvent({ actorType: "SYSTEM", actionCode: "WORKER_STARTED", targetType: "WORKER_INVOCATION",
      targetId: invocationId, outcome: "SUCCEEDED", correlationId: invocationId }, executor);
    return true;
  });
  if (!admitted) return result;
  result.admitted = true;
  console.info("background_worker_started", JSON.stringify({ invocationId }));
  try {
    result.recovered = await run(async (executor) => {
      const recovered = await recoverExhaustedJobs(executor);
      for (const job of recovered) await appendAuditEvent({ actorType: "SYSTEM", actionCode: "WORKER_JOB_DEAD",
        targetType: "BACKGROUND_JOB", targetId: job.id, outcome: "FAILED", reasonCode: "EXHAUSTED", correlationId: invocationId }, executor);
      await enqueueDueRetention(executor);
      return recovered.length;
    });
    while (result.claimed < WORKER_BOUNDS.jobs
      && performance.now() - started < WORKER_BOUNDS.invocationMs - WORKER_BOUNDS.externalMs - WORKER_BOUNDS.finalizationMs) {
      const job = await run(async (executor) => {
        const [claimed] = await claimBackgroundJobs(1, WORKER_BOUNDS.leaseSeconds, executor);
        if (claimed) await appendAuditEvent({ actorType: "SYSTEM", actionCode: "WORKER_JOB_CLAIMED", targetType: "BACKGROUND_JOB",
          targetId: claimed.id, outcome: "SUCCEEDED", correlationId: invocationId, safeMetadata: { attempt: claimed.attemptCount } }, executor);
        return claimed;
      });
      if (!job) break;
      result.claimed++;
      try {
        const kind = validateWorkerJob(job);
        if (remaining() <= WORKER_BOUNDS.finalizationMs) fail("TRANSIENT");
        const signal = AbortSignal.timeout(Math.floor(Math.min(WORKER_BOUNDS.externalMs, remaining() - WORKER_BOUNDS.finalizationMs)));
        if (kind === "notification") {
          // Test workers require deliberate adapter injection, even when a local
          // provider key exists. The bounded live CLI injects its own adapter.
          const email = dependencies.email ?? (process.env.NODE_ENV === "test" ? unavailableEmailAdapter : configuredEmailAdapter());
          const state = await sendCandidateConfirmation(job, email, signal, run);
          if (state === "SUCCEEDED") result.succeeded++;
          else if (state === "QUEUED") result.retried++;
          else result.dead++;
          continue;
        }
        if (!dependencies.storage && !googleStorageConfigured()) fail("CONFIGURATION");
        const adapter = (dependencies.storage ?? googleDriveStorage)(signal);
        const storage: WorkerStorage = { ...adapter,
          allocateId: () => adapter.allocateId(), put: (...args) => adapter.put(...args), get: id => adapter.get(id), delete: id => adapter.delete(id),
          verify: async expected => { signal.throwIfAborted(); const value = await adapter.verify(expected); signal.throwIfAborted(); return value; },
          erase: async expected => { signal.throwIfAborted(); await adapter.erase(expected); signal.throwIfAborted(); },
        };
        if (kind === "reconciliation") { await reconcileCandidateFile(job, storage, run); result.reconciled++; }
        else { await deleteRetainedApplication(job, storage, run); result.deleted++; }
        result.succeeded++;
      } catch (error) {
        const classification = classify(error);
        const state = await run(async (executor) => {
          const state = await failBackgroundJob(job.id, job.claimToken, classification, executor);
          if (state) await appendAuditEvent({ actorType: "SYSTEM", actionCode: "WORKER_JOB_FAILED", targetType: "BACKGROUND_JOB",
            targetId: job.id, outcome: "FAILED", reasonCode: classification, correlationId: invocationId, safeMetadata: { state } }, executor);
          return state;
        });
        if (state === "QUEUED") result.retried++;
        else if (state === "DEAD") result.dead++;
        else result.unresolved++;
      }
    }
    await run(async (executor) => {
      const backlog = await executor.query<{ due: number; oldest: number }>(`SELECT count(*)::int AS due,
        least(2147483647, coalesce(extract(epoch FROM clock_timestamp() - min("availableAt")), 0))::int AS oldest
        FROM public."BackgroundJob" WHERE "state" = 'QUEUED' AND "availableAt" <= clock_timestamp()`);
      result.due = backlog.rows[0].due; result.oldestDueSeconds = backlog.rows[0].oldest;
      await appendAuditEvent({ actorType: "SYSTEM", actionCode: "WORKER_COMPLETED", targetType: "WORKER_INVOCATION",
        targetId: invocationId, outcome: "SUCCEEDED", correlationId: invocationId, safeMetadata: { ...result } }, executor);
    });
    console.info("background_worker_completed", JSON.stringify(result));
    return result;
  } catch {
    console.error("background_worker_failed", JSON.stringify({ invocationId }));
    throw new Error("Background worker unavailable.");
  }
}

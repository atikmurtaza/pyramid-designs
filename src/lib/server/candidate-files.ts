import "server-only";

import { randomUUID } from "node:crypto";

import { authorizeBeforeTargetStateLookup, requireAuthorization, type AuthorizationOperation } from "./auth/authorization.ts";
import { resolveAuthenticatedStaff, type StaffPrincipal } from "./auth/session.ts";
import { hasSameOriginMutation } from "./auth/csrf.ts";
import { CandidateFileUnavailable, fileUnavailable, parseCandidateUpload, readBoundedStream, sha256 } from "./candidate-file-policy.ts";
import { database, transaction, type DatabaseExecutor } from "./database.ts";
import { googleDriveStorage, type CandidateStorage } from "./google-drive.ts";
import { consumeIntakeLimit, intakeRequestAllowed, submitIntake } from "./public-intake.ts";
import { appendAuditEvent } from "./repositories/audit.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type TransactionRunner = <T>(work: (executor: DatabaseExecutor) => Promise<T>) => Promise<T>;
type FileRow = {
  id: string; applicationId: string; driveFileId: string | null; storedFilename: string;
  sizeBytes: number; contentHash: string | null; validationStatus: string; fileTechnicalStatus: string;
  securityStatus: string; clearanceMethod: string | null; clearedAt: Date | null; version: number;
  applicationTechnicalStatus: string; retentionPermitsAccess: boolean; deletionCompleted: boolean;
  hashMatchesReview: boolean; createdAt: Date;
};

function requireUuid(value: string) { if (!UUID.test(value)) fileUnavailable(); return value; }

async function loadFile(executor: DatabaseExecutor, candidateFileId: string, lock = false) {
  const result = await executor.query<FileRow>(`SELECT file."id", file."applicationId", file."driveFileId", file."storedFilename",
      file."sizeBytes", file."contentHash", file."validationStatus", file."technicalStatus" AS "fileTechnicalStatus",
      file."securityStatus", file."clearanceMethod", file."clearedAt", file."version", file."createdAt",
      application."technicalStatus" AS "applicationTechnicalStatus",
      application."expiresAt" > clock_timestamp() AS "retentionPermitsAccess",
      application."deletionCompletedAt" IS NOT NULL AS "deletionCompleted",
      EXISTS (SELECT 1 FROM public."FileSecurityReview" review WHERE review."candidateFileId" = file."id"
        AND review."outcome" = 'CLEARED' AND review."method" = file."clearanceMethod"
        AND review."fileHashSnapshot" = file."contentHash" AND review."completedAt" <= file."clearedAt") AS "hashMatchesReview"
    FROM public."CandidateFile" file JOIN public."Application" application ON application."id" = file."applicationId"
    WHERE file."id" = $1 ${lock ? "FOR UPDATE OF file, application" : ""}`, [requireUuid(candidateFileId)]);
  return result.rows[0] ?? fileUnavailable();
}

function fileState(row: FileRow, hashMatchesReview = row.hashMatchesReview) {
  return {
    technicalStatus: row.applicationTechnicalStatus,
    validationStatus: row.validationStatus,
    fileTechnicalStatus: row.fileTechnicalStatus,
    securityStatus: row.securityStatus,
    retentionPermitsAccess: row.retentionPermitsAccess,
    deletionCompleted: row.deletionCompleted,
    hashMatchesReview,
    inRecruitmentScope: ["SECURITY_PENDING", "SUBMITTED"].includes(row.applicationTechnicalStatus),
  };
}

async function reserveCandidateFile(
  executor: DatabaseExecutor,
  applicationId: string,
  allocatedDriveId: string,
  contentHash: string,
  sizeBytes: number,
) {
  const application = await executor.query<{ id: string }>(`SELECT "id" FROM public."Application"
    WHERE "id" = $1 AND "requiresClearedFile" = true AND "technicalStatus" IN ('SUBMISSION_PENDING', 'SECURITY_PENDING')
      AND "expiresAt" > clock_timestamp() AND "deletionCompletedAt" IS NULL FOR UPDATE`, [applicationId]);
  if (!application.rows[0]) fileUnavailable();
  const existing = await executor.query<{ id: string; driveFileId: string | null; storedFilename: string; contentHash: string | null; sizeBytes: number }>(
    `SELECT "id", "driveFileId", "storedFilename", "contentHash", "sizeBytes" FROM public."CandidateFile"
     WHERE "applicationId" = $1 AND "technicalStatus" <> 'DELETED' FOR UPDATE`, [applicationId]);
  if (existing.rows[0]) {
    const row = existing.rows[0];
    if (row.contentHash !== contentHash || row.sizeBytes !== sizeBytes || !row.driveFileId
      || !/^[a-f0-9-]+\.pdf$/.test(row.storedFilename)) fileUnavailable();
    return row;
  }
  const id = randomUUID();
  const storedFilename = `${id}.pdf`;
  const inserted = await executor.query<{ id: string; driveFileId: string; storedFilename: string; contentHash: string; sizeBytes: number }>(
    `INSERT INTO public."CandidateFile" ("id", "applicationId", "driveFileId", "driveZoneCode", "storedFilename",
      "extension", "declaredMime", "detectedMime", "sizeBytes", "contentHash", "validationStatus", "updatedAt")
     VALUES ($1, $2, $3, 'CANDIDATE_QUARANTINE', $4, 'pdf', 'application/pdf', 'application/pdf', $5, $6, 'PASSED', clock_timestamp())
     RETURNING "id", "driveFileId", "storedFilename", "contentHash", "sizeBytes"`,
    [id, applicationId, allocatedDriveId, storedFilename, sizeBytes, contentHash]);
  await executor.query(`INSERT INTO public."BackgroundJob" ("id", "jobType", "candidateFileId", "dedupeKey", "safePayload", "updatedAt")
    VALUES ($1, 'CANDIDATE_FILE_STORAGE_RECONCILE', $2, $3, '{"operation":"VERIFY_OR_DELETE"}'::jsonb, clock_timestamp())
    ON CONFLICT ("dedupeKey") DO NOTHING`, [randomUUID(), id, `candidate-file-reconcile:${id}`]);
  return inserted.rows[0];
}

async function finalizeCandidateFile(executor: DatabaseExecutor, candidateFileId: string, contentHash: string) {
  const row = await loadFile(executor, candidateFileId, true);
  if (!row.driveFileId || row.contentHash !== contentHash || row.validationStatus !== "PASSED"
    || !["UPLOAD_PENDING", "QUARANTINED"].includes(row.fileTechnicalStatus)
    || !["SUBMISSION_PENDING", "SECURITY_PENDING"].includes(row.applicationTechnicalStatus)
    || row.securityStatus !== "UNREVIEWED" || !row.retentionPermitsAccess || row.deletionCompleted) fileUnavailable();
  if (row.fileTechnicalStatus === "UPLOAD_PENDING") {
    const updated = await executor.query(`UPDATE public."CandidateFile" SET "technicalStatus" = 'QUARANTINED', "version" = "version" + 1,
      "updatedAt" = clock_timestamp() WHERE "id" = $1 AND "version" = $2`, [row.id, row.version]);
    if (updated.rowCount !== 1) fileUnavailable();
  }
  const applicationUpdated = await executor.query(`UPDATE public."Application" SET "technicalStatus" = 'SECURITY_PENDING', "updatedAt" = clock_timestamp()
    WHERE "id" = $1 AND "technicalStatus" = 'SUBMISSION_PENDING'`, [row.applicationId]);
  if (applicationUpdated.rowCount !== (row.applicationTechnicalStatus === "SUBMISSION_PENDING" ? 1 : 0)) fileUnavailable();
  const jobUpdated = await executor.query(`UPDATE public."BackgroundJob" SET "state" = 'SUCCEEDED', "completedAt" = clock_timestamp(),
    "updatedAt" = clock_timestamp() WHERE "dedupeKey" = $1`, [`candidate-file-reconcile:${row.id}`]);
  if (jobUpdated.rowCount !== 1) fileUnavailable();
}

export async function storeCandidateApplication(
  fields: URLSearchParams,
  bytes: Buffer,
  contentHash: string,
  sizeBytes: number,
  storage: CandidateStorage,
  runTransaction: TransactionRunner = transaction,
) {
  const allocatedDriveId = await storage.allocateId();
  const reservation = await runTransaction(async (executor) => {
    const application = await submitIntake(fields, executor, contentHash);
    const file = await reserveCandidateFile(executor, application.id, allocatedDriveId, contentHash, sizeBytes);
    return { application, file };
  });
  await storage.put(reservation.file.driveFileId!, reservation.file.storedFilename, bytes, contentHash);
  await runTransaction((executor) => finalizeCandidateFile(executor, reservation.file.id, contentHash));
  return reservation.application;
}

export async function handleCandidateFileIntakeRequest(request: Request, dependencies: {
  consumeLimit?: typeof consumeIntakeLimit;
  storage?: () => CandidateStorage;
  runTransaction?: TransactionRunner;
} = {}) {
  const response = (status: number, body: object) => Response.json(body, { status, headers: {
    "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff",
  } });
  if (!intakeRequestAllowed(request)) return response(403, { ok: false, message: "Submission is unavailable." });
  try {
    if (!(await (dependencies.consumeLimit ?? consumeIntakeLimit)())) return response(429, { ok: false, message: "Please wait a minute before retrying." });
    let upload: Awaited<ReturnType<typeof parseCandidateUpload>>;
    try { upload = await parseCandidateUpload(request); }
    catch (error) {
      if (error instanceof CandidateFileUnavailable) return response(400, { ok: false, field: "cv", message: "Choose one valid PDF no larger than 5 MiB." });
      throw error;
    }
    await storeCandidateApplication(upload.fields, upload.bytes, upload.contentHash, upload.sizeBytes,
      (dependencies.storage ?? googleDriveStorage)(), dependencies.runTransaction);
    return response(200, { ok: true, message: "Synthetic application and CV stored in private quarantine. The CV is not cleared or trusted." });
  } catch {
    return response(503, { ok: false, message: "Submission could not be completed. Retry the same form without changing the selected file." });
  }
}

function requireFileBoundary(principal: StaffPrincipal | null, operation: AuthorizationOperation, candidateFileId: string) {
  const target = { type: "CANDIDATE_FILE", id: requireUuid(candidateFileId) } as const;
  if (!authorizeBeforeTargetStateLookup(principal, { operation, target }).allowed) fileUnavailable();
  return { principal: principal!, target };
}

async function requireCurrentPrincipal(executor: DatabaseExecutor, principal: StaffPrincipal, lock = false) {
  if (lock) {
    // Keep active status and existing role grants stable through the authorized
    // transaction, including time spent waiting for the exact file lock.
    await executor.query(`SELECT "id" FROM public."StaffUser" WHERE "id" = $1 FOR SHARE`, [principal.staffUserId]);
    await executor.query(`SELECT "id" FROM public."UserRole" WHERE "staffUserId" = $1 ORDER BY "id" FOR SHARE`, [principal.staffUserId]);
  }
  const currentPrincipal = await executor.query<{ status: string; supabaseUserId: string; roles: string[] }>(
    `SELECT staff."status", staff."supabaseUserId", COALESCE(jsonb_agg(role."roleCode"::text ORDER BY role."roleCode")
      FILTER (WHERE role."revokedAt" IS NULL), '[]'::jsonb) AS roles
     FROM public."StaffUser" staff LEFT JOIN public."UserRole" role ON role."staffUserId" = staff."id"
     WHERE staff."id" = $1 GROUP BY staff."id"`, [principal.staffUserId]);
  const current = currentPrincipal.rows[0];
  if (!current || current.status !== "ACTIVE" || current.supabaseUserId !== principal.authSubjectId
    || JSON.stringify([...current.roles].sort()) !== JSON.stringify([...principal.roles].sort())) fileUnavailable();
}

async function authorizedFile(
  principal: StaffPrincipal | null,
  operation: AuthorizationOperation,
  candidateFileId: string,
  executor: DatabaseExecutor,
  lock = false,
) {
  const boundary = requireFileBoundary(principal, operation, candidateFileId);
  await requireCurrentPrincipal(executor, boundary.principal, lock);
  const row = await loadFile(executor, candidateFileId, lock);
  requireAuthorization(boundary.principal, { operation, target: { ...boundary.target, state: fileState(row) } });
  return { principal: boundary.principal, row };
}

export async function retrieveCandidateFile(
  principal: StaffPrincipal | null,
  candidateFileId: string,
  operation: "candidate_file.cleared.download" | "candidate_file.security_review.retrieve_quarantine",
  storage: CandidateStorage = googleDriveStorage(),
  executor: DatabaseExecutor = database,
  runTransaction: TransactionRunner = transaction,
) {
  const first = await authorizedFile(principal, operation, candidateFileId, executor);
  if (!first.row.driveFileId || !first.row.contentHash) fileUnavailable();
  const bytes = await storage.get(first.row.driveFileId);
  if (bytes.length !== first.row.sizeBytes || sha256(bytes) !== first.row.contentHash) fileUnavailable();
  await runTransaction(async (transactionExecutor) => {
    const current = await authorizedFile(principal, operation, candidateFileId, transactionExecutor, true);
    if (current.row.version !== first.row.version || current.row.driveFileId !== first.row.driveFileId
      || current.row.contentHash !== first.row.contentHash) fileUnavailable();
    await appendAuditEvent({ actorType: "STAFF", actorStaffUserId: current.principal.staffUserId,
      actionCode: operation === "candidate_file.cleared.download" ? "CANDIDATE_FILE_DOWNLOADED" : "CANDIDATE_FILE_QUARANTINE_RETRIEVED",
      targetType: "CANDIDATE_FILE", targetId: current.row.id, outcome: "SUCCEEDED",
      reasonCode: "AUTHORIZED_CURRENT_STATE", correlationId: randomUUID() }, transactionExecutor);
  });
  return bytes;
}

export async function initiateCandidateFileReview(
  principal: StaffPrincipal | null,
  candidateFileId: string,
  runTransaction: TransactionRunner = transaction,
) {
  return runTransaction(async (executor) => {
    const current = await authorizedFile(principal, "candidate_file.security_review.initiate", candidateFileId, executor, true);
    const updated = await executor.query(`UPDATE public."CandidateFile" SET "securityStatus" = 'IN_REVIEW',
      "version" = "version" + 1, "updatedAt" = clock_timestamp() WHERE "id" = $1 AND "version" = $2`,
    [current.row.id, current.row.version]);
    if (updated.rowCount !== 1) fileUnavailable();
    await appendAuditEvent({ actorType: "STAFF", actorStaffUserId: current.principal.staffUserId,
      actionCode: "CANDIDATE_FILE_REVIEW_INITIATED", targetType: "CANDIDATE_FILE", targetId: current.row.id,
      outcome: "SUCCEEDED", reasonCode: "MANUAL_DEFENDER_REVIEW", correlationId: randomUUID() }, executor);
  });
}

export type ManualReviewInput = {
  observedSha256: string; outcome: "CLEAN" | "REJECTED" | "FAILED";
  toolVersion?: string; startedAt: string; idempotencyKey: string;
};

export async function recordCandidateFileReview(
  principal: StaffPrincipal | null,
  candidateFileId: string,
  input: ManualReviewInput,
  runTransaction: TransactionRunner = transaction,
) {
  const keys = Object.keys(input).sort();
  const expected = ["idempotencyKey", "observedSha256", "outcome", "startedAt", ...(input.toolVersion === undefined ? [] : ["toolVersion"])].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])
    || !/^[a-f0-9]{64}$/.test(input.observedSha256) || !["CLEAN", "REJECTED", "FAILED"].includes(input.outcome)
    || !UUID.test(input.idempotencyKey) || (input.toolVersion !== undefined && (!input.toolVersion.trim() || input.toolVersion.length > 80))) fileUnavailable();
  const startedAt = new Date(input.startedAt);
  if (!Number.isFinite(startedAt.getTime()) || startedAt.getTime() > Date.now()) fileUnavailable();
  return runTransaction(async (executor) => {
    const boundary = requireFileBoundary(principal, "candidate_file.security_review.record_outcome", candidateFileId);
    await requireCurrentPrincipal(executor, boundary.principal, true);
    const row = await loadFile(executor, candidateFileId, true);
    if (startedAt < row.createdAt) fileUnavailable();
    const duplicate = await executor.query<{ candidateFileId: string; fileHashSnapshot: string; outcomeCode: string }>(
      `SELECT "candidateFileId", "fileHashSnapshot", "outcomeCode" FROM public."FileSecurityReview" WHERE "idempotencyKey" = $1 FOR UPDATE`,
      [input.idempotencyKey]);
    const outcomeCode = input.outcome === "CLEAN" ? "DEFENDER_CLEAN" : input.outcome === "REJECTED" ? "DEFENDER_REJECTED" : "DEFENDER_FAILED";
    if (duplicate.rows[0]) {
      if (duplicate.rows[0].candidateFileId !== row.id || duplicate.rows[0].fileHashSnapshot !== input.observedSha256
        || duplicate.rows[0].outcomeCode !== outcomeCode) fileUnavailable();
      return;
    }
    requireAuthorization(boundary.principal, { operation: "candidate_file.security_review.record_outcome",
      target: { ...boundary.target, state: fileState(row, input.observedSha256 === row.contentHash) } });
    const reviewOutcome = input.outcome === "CLEAN" ? "CLEARED" : input.outcome === "REJECTED" ? "REJECTED" : "FAILED";
    const securityStatus = input.outcome === "CLEAN" ? "CLEARED" : input.outcome === "REJECTED" ? "REJECTED" : "REVIEW_FAILED";
    const completedAt = new Date();
    await executor.query(`INSERT INTO public."FileSecurityReview" ("id", "candidateFileId", "method", "reviewerStaffUserId",
      "toolDescription", "toolVersion", "fileHashSnapshot", "outcome", "outcomeCode", "idempotencyKey", "startedAt", "completedAt")
      VALUES ($1, $2, 'MANUAL', $3, 'Microsoft Defender Antivirus', $4, $5, $6::"SecurityReviewOutcome", $7, $8, $9, $10)`,
    [randomUUID(), row.id, boundary.principal.staffUserId, input.toolVersion?.trim() ?? null, input.observedSha256,
      reviewOutcome, outcomeCode, input.idempotencyKey, startedAt, completedAt]);
    const fileUpdated = await executor.query(`UPDATE public."CandidateFile" SET "securityStatus" = $2::"FileSecurityStatus",
      "clearanceMethod" = CASE WHEN $2 = 'CLEARED' THEN 'MANUAL'::"SecurityReviewMethod" ELSE NULL END,
      "clearedAt" = CASE WHEN $2 = 'CLEARED' THEN $3::timestamptz ELSE NULL END, "version" = "version" + 1,
      "updatedAt" = clock_timestamp() WHERE "id" = $1 AND "version" = $4`, [row.id, securityStatus, completedAt, row.version]);
    if (fileUpdated.rowCount !== 1) fileUnavailable();
    if (securityStatus === "CLEARED") {
      const applicationUpdated = await executor.query(`UPDATE public."Application" SET "technicalStatus" = 'SUBMITTED', "hiringStatus" = 'NEW',
        "submittedAt" = clock_timestamp(), "updatedAt" = clock_timestamp() WHERE "id" = $1 AND "technicalStatus" = 'SECURITY_PENDING'`, [row.applicationId]);
      if (applicationUpdated.rowCount !== 1) fileUnavailable();
      await executor.query(`INSERT INTO public."ApplicationStatusEvent" ("id", "applicationId", "toStatus", "actorType",
        "actorStaffUserId", "reasonCode") VALUES ($1, $2, 'NEW', 'STAFF', $3, 'CLEARED_FILE_SUBMISSION_COMPLETED')`,
      [randomUUID(), row.applicationId, boundary.principal.staffUserId]);
    }
    await appendAuditEvent({ actorType: "STAFF", actorStaffUserId: boundary.principal.staffUserId,
      actionCode: "CANDIDATE_FILE_REVIEW_RECORDED", targetType: "CANDIDATE_FILE", targetId: row.id,
      outcome: "SUCCEEDED", reasonCode: outcomeCode, correlationId: randomUUID(), safeMetadata: { outcome: reviewOutcome } }, executor);
  });
}

export async function handleReviewRequest(request: Request, candidateFileId: string, action: "initiate" | "record") {
  const response = (status: number, body: object) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  try {
    const principal = await resolveAuthenticatedStaff();
    if (!principal || !hasSameOriginMutation(request) || request.headers.get("sec-fetch-site") === "cross-site") fileUnavailable();
    if (action === "initiate") await initiateCandidateFileReview(principal, candidateFileId);
    else {
      if (!/^application\/json(?:;\s*charset=utf-8)?$/i.test(request.headers.get("content-type") ?? "")) fileUnavailable();
      const bytes = await readBoundedStream(request.body, 4096, 5000, request.headers.get("content-length"), request.signal);
      await recordCandidateFileReview(principal, candidateFileId, JSON.parse(bytes.toString()));
    }
    return response(200, { ok: true });
  } catch { return response(404, { ok: false, message: "Not available." }); }
}

export function candidateFileResponse(bytes: Buffer, quarantine = false) {
  return new Response(new Uint8Array(bytes), { headers: {
    "Cache-Control": "private, no-store, max-age=0", "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${quarantine ? "candidate-cv-quarantine.pdf" : "candidate-cv.pdf"}"`,
    "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox",
  } });
}

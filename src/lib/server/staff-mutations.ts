import "server-only";

import { createHash, randomUUID } from "node:crypto";

import {
  authorize,
  authorizeBeforeTargetStateLookup,
  type AuthorizationOperation,
} from "./auth/authorization.ts";
import {
  resolveAuthenticatedStaff,
  type StaffPrincipal,
} from "./auth/session.ts";
import {
  database,
  transaction as databaseTransaction,
  type DatabaseExecutor,
} from "./database.ts";
import { appendAuditEvent } from "./repositories/audit.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HIRING_STATUSES = [
  "NEW",
  "UNDER_REVIEW",
  "SHORTLISTED",
  "INTERVIEW",
  "OFFER",
  "HIRED",
  "REJECTED",
  "WITHDRAWN",
] as const;
const JOB_TRANSITIONS = ["CLOSED", "ARCHIVED"] as const;

export type HiringStatus = (typeof HIRING_STATUSES)[number];
export type JobTransition = (typeof JOB_TRANSITIONS)[number];

export type StaffMutation =
  | Readonly<{
      type: "content.create";
      idempotencyKey: string;
      slug: string;
      title: string;
      summary: string;
    }>
  | Readonly<{
      type: "content.edit";
      idempotencyKey: string;
      contentId: string;
      expectedVersion: number;
      title: string;
      summary: string;
    }>
  | Readonly<{
      type: "application.hiring_status.change";
      idempotencyKey: string;
      applicationId: string;
      expectedHiringStatus: HiringStatus;
      requestedHiringStatus: HiringStatus;
    }>
  | Readonly<{
      type: "job.transition";
      idempotencyKey: string;
      jobId: string;
      expectedVersion: number;
      requestedLifecycleState: JobTransition;
    }>;

export type StaffMutationResult = Readonly<{
  outcome: "APPLIED" | "ALREADY_APPLIED";
  targetId: string;
}>;

export class StaffMutationInputError extends Error {
  constructor() {
    super("Invalid input.");
    this.name = "StaffMutationInputError";
  }
}

export class StaffMutationUnavailableError extends Error {
  constructor() {
    super("Not available.");
    this.name = "StaffMutationUnavailableError";
  }
}

type TransactionRunner = <T>(work: (executor: DatabaseExecutor) => Promise<T>) => Promise<T>;

type MutationDependencies = Readonly<{
  resolvePrincipal?: () => Promise<StaffPrincipal | null>;
  transaction?: TransactionRunner;
}>;

function invalid(): never {
  throw new StaffMutationInputError();
}

function unavailable(): never {
  throw new StaffMutationUnavailableError();
}

function requireExactKeys(value: object, keys: readonly string[]) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) invalid();
}

function requireUuid(value: unknown) {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) invalid();
  return value;
}

function requireIdempotencyKey(value: unknown) {
  return requireUuid(value);
}

function requireText(value: unknown, maximum: number, minimum = 1) {
  if (typeof value !== "string") invalid();
  const normalized = value.trim();
  if (normalized.length < minimum || normalized.length > maximum) invalid();
  return normalized;
}

function requirePositiveInteger(value: unknown) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) invalid();
  return value;
}

function requireEnum<T extends string>(value: unknown, values: readonly T[]) {
  if (typeof value !== "string" || !values.includes(value as T)) invalid();
  return value as T;
}

function validateMutation(input: StaffMutation): StaffMutation {
  switch (input.type) {
    case "content.create": {
      requireExactKeys(input, ["type", "idempotencyKey", "slug", "title", "summary"]);
      const slug = requireText(input.slug, 100);
      if (!SLUG_PATTERN.test(slug)) invalid();
      return {
        type: input.type,
        idempotencyKey: requireIdempotencyKey(input.idempotencyKey),
        slug,
        title: requireText(input.title, 160),
        summary: requireText(input.summary, 600),
      };
    }
    case "content.edit":
      requireExactKeys(input, ["type", "idempotencyKey", "contentId", "expectedVersion", "title", "summary"]);
      return {
        type: input.type,
        idempotencyKey: requireIdempotencyKey(input.idempotencyKey),
        contentId: requireUuid(input.contentId),
        expectedVersion: requirePositiveInteger(input.expectedVersion),
        title: requireText(input.title, 160),
        summary: requireText(input.summary, 600),
      };
    case "application.hiring_status.change":
      requireExactKeys(input, [
        "type",
        "idempotencyKey",
        "applicationId",
        "expectedHiringStatus",
        "requestedHiringStatus",
      ]);
      return {
        type: input.type,
        idempotencyKey: requireIdempotencyKey(input.idempotencyKey),
        applicationId: requireUuid(input.applicationId),
        expectedHiringStatus: requireEnum(input.expectedHiringStatus, HIRING_STATUSES),
        requestedHiringStatus: requireEnum(input.requestedHiringStatus, HIRING_STATUSES),
      };
    case "job.transition":
      requireExactKeys(input, ["type", "idempotencyKey", "jobId", "expectedVersion", "requestedLifecycleState"]);
      return {
        type: input.type,
        idempotencyKey: requireIdempotencyKey(input.idempotencyKey),
        jobId: requireUuid(input.jobId),
        expectedVersion: requirePositiveInteger(input.expectedVersion),
        requestedLifecycleState: requireEnum(input.requestedLifecycleState, JOB_TRANSITIONS),
      };
    default:
      invalid();
  }
}

function mutationBoundary(input: StaffMutation) {
  switch (input.type) {
    case "content.create":
      return { operation: "content.create", target: { type: "CONTENT" } } as const;
    case "content.edit":
      return { operation: "content.edit", target: { type: "CONTENT", id: input.contentId } } as const;
    case "application.hiring_status.change":
      return {
        operation: "application.hiring_status.change",
        target: { type: "APPLICATION", id: input.applicationId },
      } as const;
    case "job.transition":
      return {
        operation: input.requestedLifecycleState === "CLOSED" ? "job.close" : "job.archive",
        target: { type: "JOB", id: input.jobId },
      } as const;
    default:
      unavailable();
  }
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function mutationRequestHash(input: StaffMutation) {
  const { idempotencyKey: _, ...request } = input;
  return hash(JSON.stringify(request));
}

async function claimIdempotency(
  principal: StaffPrincipal,
  input: StaffMutation,
  executor: DatabaseExecutor,
) {
  const scope = `staff:${input.type}`;
  const keyHash = hash(`${principal.staffUserId}:${input.idempotencyKey}`);
  const requestHash = mutationRequestHash(input);

  await executor.query(
    `DELETE FROM public."IdempotencyRecord"
     WHERE "scope" = $1 AND "keyHash" = $2 AND "expiresAt" <= CURRENT_TIMESTAMP`,
    [scope, keyHash],
  );
  const inserted = await executor.query<{ id: string }>(
    `INSERT INTO public."IdempotencyRecord" (
       "id", "scope", "keyHash", "requestHash", "state", "expiresAt"
     ) VALUES ($1, $2, $3, $4, 'IN_PROGRESS', CURRENT_TIMESTAMP + INTERVAL '24 hours')
     ON CONFLICT ("scope", "keyHash") DO NOTHING
     RETURNING "id"`,
    [randomUUID(), scope, keyHash, requestHash],
  );
  if (inserted.rows[0]) return { duplicateTargetId: null, recordId: inserted.rows[0].id };

  const existing = await executor.query<{
    id: string;
    requestHash: string;
    state: string;
    resultReference: string | null;
  }>(
    `SELECT "id", "requestHash", "state", "resultReference"
     FROM public."IdempotencyRecord"
     WHERE "scope" = $1 AND "keyHash" = $2
     FOR UPDATE`,
    [scope, keyHash],
  );
  const row = existing.rows[0];
  if (!row || row.requestHash !== requestHash || row.state !== "COMPLETED" || !row.resultReference) unavailable();
  return { duplicateTargetId: row.resultReference, recordId: row.id };
}

async function completeIdempotency(recordId: string, targetId: string, executor: DatabaseExecutor) {
  const result = await executor.query<{ id: string }>(
    `UPDATE public."IdempotencyRecord"
     SET "state" = 'COMPLETED', "resultReference" = $2
     WHERE "id" = $1 AND "state" = 'IN_PROGRESS'
     RETURNING "id"`,
    [recordId, targetId],
  );
  if (!result.rows[0]) unavailable();
}

function requireStateAuthorization(
  principal: StaffPrincipal,
  operation: AuthorizationOperation,
  target: { type: string; id: string; state: Record<string, unknown> },
) {
  if (!authorize(principal, { operation, target }).allowed) unavailable();
}

async function createDraftContent(
  principal: StaffPrincipal,
  input: Extract<StaffMutation, { type: "content.create" }>,
  executor: DatabaseExecutor,
) {
  const id = randomUUID();
  const created = await executor.query<{ id: string; version: number }>(
    `INSERT INTO public."Project" (
       "id", "slug", "title", "summary", "publicationState", "version", "updatedAt"
     ) VALUES ($1, $2, $3, $4, 'DRAFT', 1, CURRENT_TIMESTAMP)
     RETURNING "id", "version"`,
    [id, input.slug, input.title, input.summary],
  );
  if (created.rows[0]?.id !== id) unavailable();
  await appendAuditEvent({
    actorType: "STAFF",
    actorStaffUserId: principal.staffUserId,
    actionCode: "CONTENT_DRAFT_CREATED",
    targetType: "CONTENT",
    targetId: id,
    outcome: "SUCCEEDED",
    correlationId: input.idempotencyKey,
    safeMetadata: { publicationState: "DRAFT", version: created.rows[0].version },
  }, executor);
  return id;
}

async function editDraftContent(
  principal: StaffPrincipal,
  input: Extract<StaffMutation, { type: "content.edit" }>,
  executor: DatabaseExecutor,
) {
  const stateResult = await executor.query<{ publicationState: string; version: number }>(
    `SELECT "publicationState", "version"
     FROM public."Project"
     WHERE "id" = $1
     FOR UPDATE`,
    [input.contentId],
  );
  const state = stateResult.rows[0];
  if (!state) unavailable();
  requireStateAuthorization(principal, "content.edit", {
    type: "CONTENT",
    id: input.contentId,
    state,
  });
  if (state.publicationState !== "DRAFT" || state.version !== input.expectedVersion) unavailable();

  const updated = await executor.query<{ version: number }>(
    `UPDATE public."Project"
     SET "title" = $3, "summary" = $4, "version" = "version" + 1,
         "updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = $1 AND "version" = $2 AND "publicationState" = 'DRAFT'
     RETURNING "version"`,
    [input.contentId, input.expectedVersion, input.title, input.summary],
  );
  const row = updated.rows[0];
  if (!row) unavailable();
  await appendAuditEvent({
    actorType: "STAFF",
    actorStaffUserId: principal.staffUserId,
    actionCode: "CONTENT_DRAFT_EDITED",
    targetType: "CONTENT",
    targetId: input.contentId,
    outcome: "SUCCEEDED",
    correlationId: input.idempotencyKey,
    safeMetadata: {
      publicationState: "DRAFT",
      fromVersion: input.expectedVersion,
      toVersion: row.version,
    },
  }, executor);
  return input.contentId;
}

async function changeHiringStatus(
  principal: StaffPrincipal,
  input: Extract<StaffMutation, { type: "application.hiring_status.change" }>,
  executor: DatabaseExecutor,
) {
  const stateResult = await executor.query<{
    technicalStatus: string;
    hiringStatus: HiringStatus | null;
    retentionPermitsAccess: boolean;
    deletionCompleted: boolean;
  }>(
    `SELECT "technicalStatus", "hiringStatus",
            "expiresAt" > CURRENT_TIMESTAMP AS "retentionPermitsAccess",
            "deletionCompletedAt" IS NOT NULL AS "deletionCompleted"
     FROM public."Application"
     WHERE "id" = $1
     FOR UPDATE`,
    [input.applicationId],
  );
  const state = stateResult.rows[0];
  if (!state || state.hiringStatus !== input.expectedHiringStatus) unavailable();
  requireStateAuthorization(principal, "application.hiring_status.change", {
    type: "APPLICATION",
    id: input.applicationId,
    state: {
      ...state,
      requestedHiringStatus: input.requestedHiringStatus,
      inRecruitmentScope: true,
    },
  });

  const updated = await executor.query<{ id: string }>(
    `UPDATE public."Application"
     SET "hiringStatus" = $3::public."HiringStatus", "updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = $1 AND "hiringStatus" = $2::public."HiringStatus"
     RETURNING "id"`,
    [input.applicationId, input.expectedHiringStatus, input.requestedHiringStatus],
  );
  if (updated.rows[0]?.id !== input.applicationId) unavailable();
  await executor.query(
    `INSERT INTO public."ApplicationStatusEvent" (
       "id", "applicationId", "fromStatus", "toStatus", "actorType",
       "actorStaffUserId", "reasonCode"
     ) VALUES ($1, $2, $3::public."HiringStatus", $4::public."HiringStatus", 'STAFF', $5,
       'STAFF_WORKFLOW_TRANSITION')`,
    [randomUUID(), input.applicationId, input.expectedHiringStatus, input.requestedHiringStatus, principal.staffUserId],
  );
  await appendAuditEvent({
    actorType: "STAFF",
    actorStaffUserId: principal.staffUserId,
    actionCode: "APPLICATION_HIRING_STATUS_CHANGED",
    targetType: "APPLICATION",
    targetId: input.applicationId,
    outcome: "SUCCEEDED",
    correlationId: input.idempotencyKey,
    safeMetadata: {
      fromStatus: input.expectedHiringStatus,
      toStatus: input.requestedHiringStatus,
    },
  }, executor);
  return input.applicationId;
}

async function transitionJob(
  principal: StaffPrincipal,
  input: Extract<StaffMutation, { type: "job.transition" }>,
  executor: DatabaseExecutor,
) {
  const operation = input.requestedLifecycleState === "CLOSED" ? "job.close" : "job.archive";
  const stateResult = await executor.query<{ lifecycleState: string; version: number }>(
    `SELECT "lifecycleState", "version"
     FROM public."Job"
     WHERE "id" = $1
     FOR UPDATE`,
    [input.jobId],
  );
  const state = stateResult.rows[0];
  if (!state || state.version !== input.expectedVersion) unavailable();
  requireStateAuthorization(principal, operation, {
    type: "JOB",
    id: input.jobId,
    state,
  });

  const updated = await executor.query<{ version: number }>(
    `UPDATE public."Job"
     SET "lifecycleState" = $3::public."JobLifecycleState",
         "version" = "version" + 1,
         "closedAt" = CASE WHEN $3 = 'CLOSED' THEN CURRENT_TIMESTAMP ELSE "closedAt" END,
         "archivedAt" = CASE WHEN $3 = 'ARCHIVED' THEN CURRENT_TIMESTAMP ELSE "archivedAt" END,
         "updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = $1 AND "version" = $2 AND "lifecycleState" = $4::public."JobLifecycleState"
     RETURNING "version"`,
    [input.jobId, input.expectedVersion, input.requestedLifecycleState, state.lifecycleState],
  );
  const row = updated.rows[0];
  if (!row) unavailable();
  await appendAuditEvent({
    actorType: "STAFF",
    actorStaffUserId: principal.staffUserId,
    actionCode: input.requestedLifecycleState === "CLOSED" ? "JOB_CLOSED" : "JOB_ARCHIVED",
    targetType: "JOB",
    targetId: input.jobId,
    outcome: "SUCCEEDED",
    correlationId: input.idempotencyKey,
    safeMetadata: {
      fromState: state.lifecycleState,
      toState: input.requestedLifecycleState,
      fromVersion: input.expectedVersion,
      toVersion: row.version,
    },
  }, executor);
  return input.jobId;
}

async function applyMutation(
  principal: StaffPrincipal,
  input: StaffMutation,
  executor: DatabaseExecutor,
) {
  switch (input.type) {
    case "content.create":
      return createDraftContent(principal, input, executor);
    case "content.edit":
      return editDraftContent(principal, input, executor);
    case "application.hiring_status.change":
      return changeHiringStatus(principal, input, executor);
    case "job.transition":
      return transitionJob(principal, input, executor);
  }
}

export async function performStaffMutation(
  rawInput: StaffMutation,
  dependencies: MutationDependencies = {},
): Promise<StaffMutationResult> {
  const principal = await (dependencies.resolvePrincipal ?? resolveAuthenticatedStaff)();
  if (!principal) unavailable();

  const boundary = mutationBoundary(rawInput);
  if (!authorizeBeforeTargetStateLookup(principal, boundary).allowed) unavailable();
  const input = validateMutation(rawInput);
  const runTransaction = dependencies.transaction ?? databaseTransaction;

  return runTransaction(async (executor) => {
    const idempotency = await claimIdempotency(principal, input, executor);
    if (idempotency.duplicateTargetId) {
      return { outcome: "ALREADY_APPLIED", targetId: idempotency.duplicateTargetId };
    }

    const targetId = await applyMutation(principal, input, executor);
    await completeIdempotency(idempotency.recordId, targetId, executor);
    return { outcome: "APPLIED", targetId };
  });
}

export function allowedHiringStatusTransitions(
  principal: StaffPrincipal,
  applicationId: string,
  currentStatus: string | null,
) {
  if (!currentStatus || !UUID_PATTERN.test(applicationId)) return [];
  return HIRING_STATUSES.filter((requestedHiringStatus) =>
    authorize(principal, {
      operation: "application.hiring_status.change",
      target: {
        type: "APPLICATION",
        id: applicationId,
        state: {
          technicalStatus: "SUBMITTED",
          hiringStatus: currentStatus,
          requestedHiringStatus,
          retentionPermitsAccess: true,
          deletionCompleted: false,
          inRecruitmentScope: true,
        },
      },
    }).allowed,
  );
}

export function allowedJobTransitions(
  principal: StaffPrincipal,
  jobId: string,
  lifecycleState: string,
) {
  if (!UUID_PATTERN.test(jobId)) return [];
  return JOB_TRANSITIONS.filter((requestedLifecycleState) => {
    const operation = requestedLifecycleState === "CLOSED" ? "job.close" : "job.archive";
    return authorize(principal, {
      operation,
      target: { type: "JOB", id: jobId, state: { lifecycleState } },
    }).allowed;
  });
}

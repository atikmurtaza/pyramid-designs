import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import type { transaction, DatabaseExecutor } from "./database.ts";
import { appendAuditEvent } from "./repositories/audit.ts";
import { enqueueBackgroundJob, requireJobOwnership, completeBackgroundJob, failBackgroundJob,
  type ClaimedBackgroundJob, type JobFailure } from "./repositories/background-jobs.ts";

export const NOTIFICATION_JOB = "CANDIDATE_SUBMISSION_NOTIFICATION";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type NotificationEvent = "JOB_APPLICATION_SUBMITTED" | "TALENT_NETWORK_SUBMITTED";
const templates = Object.freeze({
  JOB_APPLICATION_SUBMITTED: Object.freeze({ subject: "Your application to Pyramid Designs",
    text: "Pyramid Designs has received your job application. We may contact you if appropriate. Receipt of your application does not guarantee an interview or employment." }),
  TALENT_NETWORK_SUBMITTED: Object.freeze({ subject: "Your Pyramid Designs talent network submission",
    text: "Pyramid Designs has received your talent network submission. We may contact you about a suitable opportunity if appropriate. Joining the talent network does not guarantee an interview or employment." }),
});
export function renderNotification(event: NotificationEvent, version: number) {
  if (version !== 1 || !Object.hasOwn(templates, event)) throw new Error("Notification template unavailable.");
  return templates[event];
}
export function validNotificationRecipient(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 254 || /[^\x21-\x7e]/.test(value)) return false;
  const parts = value.split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  return local.length >= 1 && local.length <= 64 && /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*$/.test(local)
    && domain.length <= 253 && domain.includes(".") && domain.split(".").every(label =>
      label.length >= 1 && label.length <= 63 && /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(label));
}
function domain() {
  const env = process.env.NODE_ENV;
  if (!["production", "development", "test"].includes(env ?? "")) throw new Error("Notification environment unavailable.");
  return `pyramid-designs:${env}`;
}
export function notificationIdentity(applicationId: string, event: NotificationEvent) {
  if (!uuid.test(applicationId) || !Object.hasOwn(templates, event)) throw new Error("Notification identity invalid.");
  return createHash("sha256").update(`${domain()}:${applicationId.toLowerCase()}:${event}:candidate`).digest("hex");
}
export async function enqueueCandidateConfirmation(applicationId: string, executor: DatabaseExecutor) {
  const r = await executor.query<{ applicationType: string; technicalStatus: string }>(
    'SELECT "applicationType", "technicalStatus" FROM public."Application" WHERE "id" = $1 FOR UPDATE', [applicationId]);
  const a = r.rows[0];
  if (!a || a.technicalStatus !== "SUBMITTED") throw new Error("Notification transition invalid.");
  const event = `${a.applicationType}_SUBMITTED` as NotificationEvent;
  const identity = notificationIdentity(applicationId, event);
  const payload = { event, templateVersion: 1, identity };
  const id = await enqueueBackgroundJob({ jobType: NOTIFICATION_JOB, applicationId,
    dedupeKey: `candidate-confirmation:${identity}`, safePayload: payload }, executor);
  // The application lock serializes same-event enqueue; preserve one immutable schedule seal.
  const existing = await executor.query(`SELECT "id" FROM public."AuditEvent" WHERE "targetType" = 'BACKGROUND_JOB'
    AND "targetId" = $1 AND "actionCode" = 'NOTIFICATION_SCHEDULED' LIMIT 1`, [id]);
  if (!existing.rowCount) await appendAuditEvent({ actorType: "SYSTEM", actionCode: "NOTIFICATION_SCHEDULED",
    targetType: "BACKGROUND_JOB", targetId: id, outcome: "SUCCEEDED", correlationId: identity, safeMetadata: payload }, executor);
  return id;
}

export function validateNotificationJob(job: ClaimedBackgroundJob) {
  const p = job.safePayload;
  if (job.jobType !== NOTIFICATION_JOB || !job.applicationId || !uuid.test(job.applicationId)
    || job.candidateFileId !== null || job.payloadReference !== null || !p || Array.isArray(p)
    || Object.keys(p).sort().join(",") !== "event,identity,templateVersion"
    || typeof p.event !== "string" || !Object.hasOwn(templates, p.event) || p.templateVersion !== 1
    || p.identity !== notificationIdentity(job.applicationId, p.event as NotificationEvent)) {
    throw new Error("Notification payload invalid.");
  }
  return { event: p.event as NotificationEvent, templateVersion: 1, identity: p.identity as string };
}

export type EmailEnvelope = Readonly<{ recipient: string; event: NotificationEvent; templateVersion: number;
  identity: string; subject: string; text: string }>;
// RETRYABLE/RATE_LIMIT certify non-acceptance. An HTTP status alone is insufficient.
export type EmailOutcome = "ACCEPTED" | "DEFINITE_REJECTION" | "RETRYABLE_FAILURE" | "RATE_LIMIT"
  | "AUTH_FAILURE" | "CONFIG_FAILURE" | "AMBIGUOUS_ACCEPTANCE";
export type EmailResult = Readonly<{ outcome: EmailOutcome; receipt?: string; retryAfterSeconds?: number }>;
export interface EmailAdapter {
  readonly mode: "unavailable" | "synthetic" | "provider";
  readonly provider?: string;
  requestFingerprint?(envelope: EmailEnvelope): string;
  // Observe cancellation before transmission and after every asynchronous preparation.
  // Abort cannot retract a transmitted message; any such uncertainty is AMBIGUOUS.
  // The worker deadline bounds waiting, not the lifetime of a remote effect.
  send(envelope: EmailEnvelope, signal: AbortSignal): Promise<EmailOutcome | EmailResult>;
}
export const unavailableEmailAdapter: EmailAdapter = Object.freeze({ mode: "unavailable",
  async send(): Promise<EmailOutcome> { return "CONFIG_FAILURE"; } });

// An in-memory, unforgeable, one-use permit is issued only AFTER a settled
// ACCEPTED call and failed DB acknowledgement. Process loss needs manual review.
// This intentionally does not claim to recover arbitrary crashed/paused workers.
export type NotificationReplayPermit = Readonly<{ kind: "notification-acknowledgement" }>;
type ReplayEvidence = Readonly<{ jobId: string; claimToken: string; identity: string;
  adapter: EmailAdapter; receipt: string; fingerprint: string }>;
const replayPermits = new WeakMap<NotificationReplayPermit, ReplayEvidence>();
const replayClaims = new WeakMap<ClaimedBackgroundJob, ReplayEvidence>();
const replayWindowMs = 23 * 60 * 60 * 1000;

export async function reconcileCandidateConfirmation(permit: NotificationReplayPermit, signal: AbortSignal,
  run: typeof transaction): Promise<"SUCCEEDED" | "QUEUED" | "DEAD"> {
  const proof = replayPermits.get(permit);
  replayPermits.delete(permit); // Concurrent/second use cannot acquire another claim.
  if (!proof) throw new Error("Notification reconciliation unavailable.");
  signal.throwIfAborted();
  const job = await run(async executor => {
    await executor.query('SELECT "id" FROM public."BackgroundJob" WHERE "id"=$1 FOR UPDATE', [proof.jobId]);
    // Transfer only the settled invocation's own claim, or an ambiguous terminal
    // projection. Never steal a different active claim or increase maxAttempts.
    const result = await executor.query<ClaimedBackgroundJob>(`UPDATE public."BackgroundJob"
      SET "state"='RUNNING', "attemptCount"="attemptCount"+1, "claimToken"=$3,
        "claimedAt"=clock_timestamp(), "leaseUntil"=clock_timestamp()+interval '60 seconds',
        "completedAt"=NULL, "failureClass"=NULL, "errorSummary"=NULL, "updatedAt"=clock_timestamp()
      WHERE "id"=$1 AND "attemptCount" < "maxAttempts"
        AND (("state"='RUNNING' AND "claimToken"=$2) OR ("state"='DEAD' AND "failureClass"='EMAIL_AMBIGUOUS'))
      RETURNING "id", "jobType", "applicationId", "candidateFileId", "payloadReference", "safePayload",
        "attemptCount", "maxAttempts", "claimToken", "leaseUntil"`, [proof.jobId, proof.claimToken, randomUUID()]);
    if (result.rowCount !== 1) throw new Error("Notification reconciliation unavailable.");
    return result.rows[0];
  });
  replayClaims.set(job, proof);
  try { return await sendCandidateConfirmation(job, proof.adapter, signal, run); }
  finally { replayClaims.delete(job); }
}

export async function sendCandidateConfirmation(job: ClaimedBackgroundJob, adapter: EmailAdapter,
  signal: AbortSignal, run: typeof transaction,
  onAcknowledgementFailure?: (permit: NotificationReplayPermit) => void): Promise<"SUCCEEDED" | "QUEUED" | "DEAD"> {
  const p = validateNotificationJob(job);
  const replay = replayClaims.get(job);
  let intent: Record<string, string | number> = { attempt: job.attemptCount };
  let result: EmailResult | undefined;
  const finish = async (failure?: JobFailure, resolved = false) => run(async executor => {
    await requireJobOwnership(job, executor);
    if (resolved) await appendAuditEvent({ actorType: "SYSTEM", actionCode: "NOTIFICATION_NOT_ACCEPTED",
      targetType: "BACKGROUND_JOB", targetId: job.id, outcome: "FAILED", correlationId: p.identity,
      safeMetadata: intent }, executor);
    const state = failure ? await failBackgroundJob(job.id, job.claimToken, failure, executor, result?.retryAfterSeconds)
      : await completeBackgroundJob(job.id, job.claimToken, executor) ? "SUCCEEDED" as const : null;
    if (!state) throw new Error("Notification ownership lost.");
    if (state !== "QUEUED") await appendAuditEvent({ actorType: "SYSTEM",
      actionCode: failure ? "NOTIFICATION_TERMINAL" : adapter.mode === "provider" ? "NOTIFICATION_PROVIDER_ACCEPTED" : "NOTIFICATION_SYNTHETIC_ACCEPTED",
      targetType: "BACKGROUND_JOB", targetId: job.id, outcome: failure ? "FAILED" : "SUCCEEDED",
      reasonCode: failure, correlationId: p.identity, safeMetadata: { event: p.event, templateVersion: 1,
        attempt: job.attemptCount, ...(adapter.mode === "provider" && !failure ? { provider: adapter.provider!, receipt: result!.receipt! } : {}) } }, executor);
    return state;
  });
  // One last authoritative read and durable intent under application + job locks.
  // An unresolved intent survives reclaim, process crash and acknowledgement rollback.
  const prepared = await run(async executor => {
    await requireJobOwnership(job, executor);
    const seal = await executor.query(`SELECT "id" FROM public."AuditEvent" WHERE "targetType" = 'BACKGROUND_JOB'
      AND "targetId" = $1 AND "actorType" = 'SYSTEM' AND "actionCode" = 'NOTIFICATION_SCHEDULED'
      AND "outcome" = 'SUCCEEDED' AND "correlationId" = $2 AND "safeMetadata" = $3::jsonb`, [job.id, p.identity, JSON.stringify(p)]);
    if (seal.rowCount !== 1) return { failure: "PAYLOAD" as const };
    const uncertain = await executor.query(`SELECT i."id" FROM public."AuditEvent" i
      WHERE i."targetType" = 'BACKGROUND_JOB' AND i."targetId" = $1 AND i."actionCode" = 'NOTIFICATION_SEND_INTENT'
        AND i."actorType" = 'SYSTEM' AND i."correlationId" = $2
        AND NOT EXISTS (SELECT 1 FROM public."AuditEvent" r WHERE r."targetType" = i."targetType"
          AND r."targetId" = i."targetId" AND r."actorType" = 'SYSTEM' AND r."correlationId" = i."correlationId"
          AND r."actionCode" = 'NOTIFICATION_NOT_ACCEPTED' AND r."safeMetadata" = i."safeMetadata") LIMIT 1`, [job.id, p.identity]);
    if (uncertain.rowCount && !replay) return { failure: "EMAIL_AMBIGUOUS" as const };
    if (replay && !uncertain.rowCount) return { failure: "EMAIL_AMBIGUOUS" as const };
    const r = await executor.query<{ email: string | null; applicationType: string; technicalStatus: string;
      deletionRequestedAt: Date | null; deletionCompletedAt: Date | null; due: boolean }>(`SELECT "email", "applicationType", "technicalStatus",
      "deletionRequestedAt", "deletionCompletedAt", "expiresAt" <= clock_timestamp() AS due
      FROM public."Application" WHERE "id" = $1 FOR UPDATE`, [job.applicationId]);
    const a = r.rows[0];
    if (!a || a.deletionRequestedAt || a.deletionCompletedAt || a.due || a.technicalStatus !== "SUBMITTED" || !a.email)
      return { failure: "EMAIL_SUPPRESSED" as const };
    if (`${a.applicationType}_SUBMITTED` !== p.event) return { failure: "PAYLOAD" as const };
    if (!validNotificationRecipient(a.email)) return { failure: "EMAIL_RECIPIENT" as const };
    if (adapter.mode === "unavailable" || (adapter.mode === "synthetic" && process.env.NODE_ENV !== "test")
      || (adapter.mode === "provider" && (!adapter.requestFingerprint || !/^[a-z][a-z0-9_-]{0,31}$/.test(adapter.provider ?? ""))))
      return { failure: "CONFIGURATION" as const };
    const envelope: EmailEnvelope = Object.freeze({ recipient: a.email, ...p, ...renderNotification(p.event, 1) });
    let cutoff: number | undefined;
    if (adapter.mode === "provider") {
      let fingerprint: string;
      try { fingerprint = adapter.requestFingerprint!(envelope); }
      catch { return { failure: "CONFIGURATION" as const }; }
      if (!/^[a-f0-9]{64}$/.test(fingerprint)) return { failure: "CONFIGURATION" as const };
      intent = { attempt: job.attemptCount, provider: adapter.provider!, requestFingerprint: fingerprint };
      const historyStarted = performance.now();
      const history = await executor.query<{ matches: boolean; remaining: number | null }>(`SELECT
        bool_and(coalesce("safeMetadata"->>'provider'=$3 AND "safeMetadata"->>'requestFingerprint'=$4, false)) IS TRUE AS matches,
        extract(epoch FROM (min("occurredAt") + interval '23 hours' - clock_timestamp())) * 1000 AS remaining
        FROM public."AuditEvent" WHERE "targetType"='BACKGROUND_JOB' AND "targetId"=$1
          AND "actorType"='SYSTEM' AND "actionCode"='NOTIFICATION_SEND_INTENT' AND "correlationId"=$2`,
      [job.id, p.identity, adapter.provider, fingerprint]);
      const previous = history.rows[0];
      if (previous.remaining !== null) {
        if (!previous.matches || Number(previous.remaining) <= 10_000 || Number(previous.remaining) > replayWindowMs)
          return { failure: "EMAIL_AMBIGUOUS" as const };
        cutoff = historyStarted + Number(previous.remaining) - 10_000;
      } else if (replay) return { failure: "EMAIL_AMBIGUOUS" as const };
      if (replay && (replay.fingerprint !== fingerprint || replay.identity !== p.identity))
        return { failure: "EMAIL_AMBIGUOUS" as const };
    }
    signal.throwIfAborted();
    await requireJobOwnership(job, executor);
    await appendAuditEvent({ actorType: "SYSTEM", actionCode: "NOTIFICATION_SEND_INTENT", targetType: "BACKGROUND_JOB",
      targetId: job.id, outcome: "SUCCEEDED", correlationId: p.identity, safeMetadata: intent }, executor);
    return { envelope, cutoff };
  });
  if (prepared.failure) return finish(prepared.failure);
  let outcome: EmailOutcome | EmailResult;
  let abort: (() => void) | undefined;
  try {
    signal.throwIfAborted();
    if (Date.now() >= job.leaseUntil.getTime()) throw new Error("Notification lease expired.");
    if (prepared.cutoff !== undefined && performance.now() >= prepared.cutoff) throw new Error("Notification reconciliation expired.");
    if (adapter.mode === "provider" && adapter.requestFingerprint!(prepared.envelope!) !== intent.requestFingerprint)
      return finish("EMAIL_AMBIGUOUS");
    // No database connection is held here. Never infer rejection from an exception/timeout.
    outcome = await Promise.race([adapter.send(prepared.envelope!, signal), new Promise<never>((_, reject) => {
      abort = () => reject(new Error("Notification deadline exceeded."));
      if (signal.aborted) abort();
      else signal.addEventListener("abort", abort, { once: true });
    })]);
    signal.throwIfAborted();
  } catch { return finish("EMAIL_AMBIGUOUS"); }
  finally { if (abort) signal.removeEventListener("abort", abort); }
  result = typeof outcome === "string" ? { outcome } : outcome;
  if (!result || (result.retryAfterSeconds !== undefined && (!Number.isInteger(result.retryAfterSeconds)
    || result.retryAfterSeconds < 0 || result.retryAfterSeconds > 3600))) return finish("EMAIL_AMBIGUOUS");
  // A later rejection can never resolve an earlier provider effect during replay.
  if (replay && (result.outcome !== "ACCEPTED" || result.receipt !== replay.receipt)) return finish("EMAIL_AMBIGUOUS");
  switch (result.outcome) {
    case "ACCEPTED": {
      if (adapter.mode === "provider" && (typeof result.receipt !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(result.receipt)))
        return finish("EMAIL_AMBIGUOUS");
      try { return await finish(); }
      catch (error) {
        if (adapter.mode === "provider" && !replay && onAcknowledgementFailure) {
          const permit = Object.freeze({ kind: "notification-acknowledgement" as const });
          replayPermits.set(permit, Object.freeze({ jobId: job.id, claimToken: job.claimToken, identity: p.identity,
            adapter, receipt: result.receipt!, fingerprint: intent.requestFingerprint as string }));
          onAcknowledgementFailure(permit);
        }
        throw error;
      }
    }
    case "RETRYABLE_FAILURE": case "RATE_LIMIT": return finish("TRANSIENT", true);
    case "DEFINITE_REJECTION": return finish("EMAIL_RECIPIENT", true);
    case "AUTH_FAILURE": return finish("EMAIL_AUTH", true);
    case "CONFIG_FAILURE": return finish("CONFIGURATION", true);
    default: return finish("EMAIL_AMBIGUOUS");
  }
}

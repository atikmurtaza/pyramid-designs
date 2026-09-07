import "server-only";

import { createHash } from "node:crypto";
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
export interface EmailAdapter {
  readonly mode: "unavailable" | "synthetic";
  // Observe cancellation before transmission and after every asynchronous preparation.
  // Abort cannot retract a transmitted message; any such uncertainty is AMBIGUOUS.
  // The worker deadline bounds waiting, not the lifetime of a remote effect.
  send(envelope: EmailEnvelope, signal: AbortSignal): Promise<EmailOutcome>;
}
export const unavailableEmailAdapter: EmailAdapter = Object.freeze({ mode: "unavailable",
  async send(): Promise<EmailOutcome> { return "CONFIG_FAILURE"; } });
export function emailReadiness() { return "UNAVAILABLE_UNTIL_PHASE_2IC2" as const; }

export async function sendCandidateConfirmation(job: ClaimedBackgroundJob, adapter: EmailAdapter,
  signal: AbortSignal, run: typeof transaction): Promise<"SUCCEEDED" | "QUEUED" | "DEAD"> {
  const p = validateNotificationJob(job);
  const finish = async (failure?: JobFailure, resolved = false) => run(async executor => {
    await requireJobOwnership(job, executor);
    if (resolved) await appendAuditEvent({ actorType: "SYSTEM", actionCode: "NOTIFICATION_NOT_ACCEPTED",
      targetType: "BACKGROUND_JOB", targetId: job.id, outcome: "FAILED", correlationId: p.identity,
      safeMetadata: { attempt: job.attemptCount } }, executor);
    const state = failure ? await failBackgroundJob(job.id, job.claimToken, failure, executor)
      : await completeBackgroundJob(job.id, job.claimToken, executor) ? "SUCCEEDED" as const : null;
    if (!state) throw new Error("Notification ownership lost.");
    if (state !== "QUEUED") await appendAuditEvent({ actorType: "SYSTEM",
      actionCode: failure ? "NOTIFICATION_TERMINAL" : "NOTIFICATION_SYNTHETIC_ACCEPTED",
      targetType: "BACKGROUND_JOB", targetId: job.id, outcome: failure ? "FAILED" : "SUCCEEDED",
      reasonCode: failure, correlationId: p.identity, safeMetadata: { event: p.event, templateVersion: 1 } }, executor);
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
    if (uncertain.rowCount) return { failure: "EMAIL_AMBIGUOUS" as const };
    const r = await executor.query<{ email: string | null; applicationType: string; technicalStatus: string;
      deletionRequestedAt: Date | null; deletionCompletedAt: Date | null; due: boolean }>(`SELECT "email", "applicationType", "technicalStatus",
      "deletionRequestedAt", "deletionCompletedAt", "expiresAt" <= clock_timestamp() AS due
      FROM public."Application" WHERE "id" = $1 FOR UPDATE`, [job.applicationId]);
    const a = r.rows[0];
    if (!a || a.deletionRequestedAt || a.deletionCompletedAt || a.due || a.technicalStatus !== "SUBMITTED" || !a.email)
      return { failure: "EMAIL_SUPPRESSED" as const };
    if (`${a.applicationType}_SUBMITTED` !== p.event) return { failure: "PAYLOAD" as const };
    if (!validNotificationRecipient(a.email)) return { failure: "EMAIL_RECIPIENT" as const };
    // The only executable adapter in C1 is offline test code, explicitly injected in NODE_ENV=test.
    if (adapter.mode !== "synthetic" || process.env.NODE_ENV !== "test") return { failure: "CONFIGURATION" as const };
    const envelope: EmailEnvelope = Object.freeze({ recipient: a.email, ...p, ...renderNotification(p.event, 1) });
    signal.throwIfAborted();
    await requireJobOwnership(job, executor);
    await appendAuditEvent({ actorType: "SYSTEM", actionCode: "NOTIFICATION_SEND_INTENT", targetType: "BACKGROUND_JOB",
      targetId: job.id, outcome: "SUCCEEDED", correlationId: p.identity, safeMetadata: { attempt: job.attemptCount } }, executor);
    return { envelope };
  });
  if (prepared.failure) return finish(prepared.failure);
  let outcome: EmailOutcome;
  let abort: (() => void) | undefined;
  try {
    signal.throwIfAborted();
    if (Date.now() >= job.leaseUntil.getTime()) throw new Error("Notification lease expired.");
    // No database connection is held here. Never infer rejection from an exception/timeout.
    outcome = await Promise.race([adapter.send(prepared.envelope!, signal), new Promise<never>((_, reject) => {
      abort = () => reject(new Error("Notification deadline exceeded."));
      if (signal.aborted) abort();
      else signal.addEventListener("abort", abort, { once: true });
    })]);
    signal.throwIfAborted();
  } catch { return finish("EMAIL_AMBIGUOUS"); }
  finally { if (abort) signal.removeEventListener("abort", abort); }
  switch (outcome) {
    case "ACCEPTED": return finish();
    case "RETRYABLE_FAILURE": case "RATE_LIMIT": return finish("TRANSIENT", true);
    case "DEFINITE_REJECTION": return finish("EMAIL_RECIPIENT", true);
    case "AUTH_FAILURE": return finish("EMAIL_AUTH", true);
    case "CONFIG_FAILURE": return finish("CONFIGURATION", true);
    default: return finish("EMAIL_AMBIGUOUS");
  }
}

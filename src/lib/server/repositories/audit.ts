import "server-only";

import { randomUUID } from "node:crypto";

import { database, type DatabaseExecutor } from "../database.ts";

export type AuditActor =
  | { actorType: "STAFF"; actorStaffUserId: string }
  | { actorType: "SYSTEM" | "ANONYMOUS"; actorStaffUserId?: never };

export type AppendAuditEventInput = AuditActor & {
  actionCode: string;
  targetType: string;
  targetId: string;
  outcome: "SUCCEEDED" | "DENIED" | "FAILED";
  reasonCode?: string;
  correlationId: string;
  safeMetadata?: Record<string, string | number | boolean | null>;
};

export async function appendAuditEvent(
  input: AppendAuditEventInput,
  executor: DatabaseExecutor = database,
) {
  const id = randomUUID();
  await executor.query(
    `INSERT INTO public."AuditEvent" (
       "id", "actorType", "actorStaffUserId", "actionCode", "targetType",
       "targetId", "outcome", "reasonCode", "correlationId", "safeMetadata"
     ) VALUES ($1, $2::"AuditActorType", $3, $4, $5, $6, $7::"AuditOutcome", $8, $9, $10::jsonb)`,
    [
      id,
      input.actorType,
      input.actorStaffUserId ?? null,
      input.actionCode,
      input.targetType,
      input.targetId,
      input.outcome,
      input.reasonCode ?? null,
      input.correlationId,
      input.safeMetadata ? JSON.stringify(input.safeMetadata) : null,
    ],
  );
  return id;
}

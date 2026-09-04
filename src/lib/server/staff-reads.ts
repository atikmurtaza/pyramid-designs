import "server-only";

import {
  authorizeBeforeTargetStateLookup,
  requireAuthorization,
  type AuthorizationOperation,
  type AuthorizationRequest,
} from "./auth/authorization.ts";
import type { StaffPrincipal } from "./auth/session.ts";
import { database, type DatabaseExecutor } from "./database.ts";
import type { StaffRole } from "./repositories/staff.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class StaffReadUnavailableError extends Error {
  constructor() {
    super("Not available.");
    this.name = "StaffReadUnavailableError";
  }
}

export type StaffSessionSummary = Readonly<{
  staffUserId: string;
  roles: readonly StaffRole[];
  assuranceLevel: "aal2";
  authorizationState: "AUTHORIZED";
}>;

export type StaffJobRead = Readonly<{
  id: string;
  title: string;
  departmentName: string;
  lifecycleState: string;
  detailLevel: "APPLICATION_CONTEXT" | "MANAGEMENT";
  slug?: string;
  locationLabel?: string;
  workArrangement?: string;
  employmentType?: string;
  experienceLevel?: string;
  shiftSchedule?: string;
  summary?: string;
  applicationDeadline?: Date | null;
  version?: number;
}>;

export type StaffApplicationContactRead = Readonly<{
  id: string;
  publicReference: string;
  applicationType: string;
  jobId: string | null;
  fullName: string | null;
  email: string | null;
  city: string | null;
  phoneOrWhatsApp: string | null;
  technicalStatus: string;
  hiringStatus: string | null;
  expiresAt: Date;
  createdAt: Date;
}>;

export type StaffAuditEventRead = Readonly<{
  id: string;
  occurredAt: Date;
  actorType: string;
  actionCode: string;
  targetType: string;
  targetId: string;
  outcome: string;
  reasonCode: string | null;
  correlationId: string;
}>;

function unavailable(): never {
  throw new StaffReadUnavailableError();
}

function requireUuid(value: string) {
  if (!UUID_PATTERN.test(value)) unavailable();
  return value;
}

function requireReadBoundary(
  principal: StaffPrincipal | null | undefined,
  operation: AuthorizationOperation,
  target: AuthorizationRequest["target"],
): asserts principal is StaffPrincipal {
  const decision = authorizeBeforeTargetStateLookup(principal, { operation, target });
  if (!decision.allowed) unavailable();
}

function hasRole(principal: StaffPrincipal, roles: readonly StaffRole[]) {
  return principal.roles.some((role) => roles.includes(role));
}

export function staffSessionSummary(principal: StaffPrincipal): StaffSessionSummary {
  if (principal.assuranceLevel !== "aal2") unavailable();
  return {
    staffUserId: principal.staffUserId,
    roles: [...principal.roles],
    assuranceLevel: "aal2",
    authorizationState: "AUTHORIZED",
  };
}

export async function readStaffJob(
  principal: StaffPrincipal | null | undefined,
  jobId: string,
  executor: DatabaseExecutor = database,
): Promise<StaffJobRead> {
  const id = requireUuid(jobId);
  const target = { type: "JOB", id } as const;
  requireReadBoundary(principal, "job.draft.read", target);

  const stateResult = await executor.query<{
    lifecycleState: string;
    assignedApplicationContext: boolean;
  }>(
    `SELECT job."lifecycleState",
            EXISTS (
              SELECT 1
              FROM public."Application" application
              WHERE application."jobId" = job."id"
                AND application."technicalStatus" = 'SUBMITTED'
                AND application."expiresAt" > CURRENT_TIMESTAMP
                AND application."deletionCompletedAt" IS NULL
            ) AS "assignedApplicationContext"
     FROM public."Job" job
     WHERE job."id" = $1
     LIMIT 1`,
    [id],
  );
  const state = stateResult.rows[0];
  if (!state) unavailable();

  requireAuthorization(principal, {
    operation: "job.draft.read",
    target: {
      ...target,
      state: {
        lifecycleState: state.lifecycleState,
        assignedApplicationContext: state.assignedApplicationContext,
      },
    },
  });

  if (!hasRole(principal, ["HIRING_MANAGER", "ADMIN"])) {
    const result = await executor.query<{
      id: string;
      title: string;
      departmentName: string;
      lifecycleState: string;
    }>(
      `SELECT job."id", job."title", department."name" AS "departmentName",
              job."lifecycleState"
       FROM public."Job" job
       JOIN public."Department" department ON department."id" = job."departmentId"
       WHERE job."id" = $1
       LIMIT 1`,
      [id],
    );
    const row = result.rows[0];
    if (!row) unavailable();
    return { ...row, detailLevel: "APPLICATION_CONTEXT" };
  }

  const result = await executor.query<{
    id: string;
    slug: string;
    title: string;
    departmentName: string;
    locationLabel: string;
    workArrangement: string;
    employmentType: string;
    experienceLevel: string;
    shiftSchedule: string;
    summary: string;
    applicationDeadline: Date | null;
    lifecycleState: string;
    version: number;
  }>(
    `SELECT job."id", job."slug", job."title", department."name" AS "departmentName",
            location."label" AS "locationLabel", job."workArrangement",
            job."employmentType", job."experienceLevel", job."shiftSchedule",
            job."summary", job."applicationDeadline", job."lifecycleState", job."version"
     FROM public."Job" job
     JOIN public."Department" department ON department."id" = job."departmentId"
     JOIN public."JobLocation" location ON location."id" = job."jobLocationId"
     WHERE job."id" = $1
     LIMIT 1`,
    [id],
  );
  const row = result.rows[0];
  if (!row) unavailable();
  return { ...row, detailLevel: "MANAGEMENT" };
}

export async function readStaffApplicationContact(
  principal: StaffPrincipal | null | undefined,
  applicationId: string,
  executor: DatabaseExecutor = database,
): Promise<StaffApplicationContactRead> {
  const id = requireUuid(applicationId);
  const target = { type: "APPLICATION", id } as const;
  requireReadBoundary(principal, "application.contact.read", target);

  const stateResult = await executor.query<{
    technicalStatus: string;
    hiringStatus: string | null;
    retentionPermitsAccess: boolean;
    deletionCompleted: boolean;
  }>(
    `SELECT "technicalStatus", "hiringStatus",
            "expiresAt" > CURRENT_TIMESTAMP AS "retentionPermitsAccess",
            "deletionCompletedAt" IS NOT NULL AS "deletionCompleted"
     FROM public."Application"
     WHERE "id" = $1
     LIMIT 1`,
    [id],
  );
  const state = stateResult.rows[0];
  if (!state) unavailable();

  requireAuthorization(principal, {
    operation: "application.contact.read",
    target: {
      ...target,
      state: {
        ...state,
        inRecruitmentScope: true,
      },
    },
  });

  const result = await executor.query<StaffApplicationContactRead>(
    `SELECT "id", "publicReference", "applicationType", "jobId", "fullName", "email",
            "city", "phoneOrWhatsApp", "technicalStatus", "hiringStatus", "expiresAt", "createdAt"
     FROM public."Application"
     WHERE "id" = $1
     LIMIT 1`,
    [id],
  );
  const row = result.rows[0];
  if (!row) unavailable();
  return { ...row };
}

export async function readStaffAuditEvents(
  principal: StaffPrincipal | null | undefined,
  executor: DatabaseExecutor = database,
): Promise<StaffAuditEventRead[]> {
  const target = { type: "AUDIT" } as const;
  requireReadBoundary(principal, "audit.events.read", target);
  const recruitmentOnly = !hasRole(principal, ["ADMIN", "AUDITOR"]);

  requireAuthorization(principal, {
    operation: "audit.events.read",
    target: {
      ...target,
      state: { inRecruitmentScope: recruitmentOnly },
    },
  });

  const result = await executor.query<StaffAuditEventRead>(
    `SELECT "id", "occurredAt", "actorType", "actionCode", "targetType", "targetId",
            "outcome", "reasonCode", "correlationId"
     FROM public."AuditEvent"
     WHERE ($1::boolean = false OR "targetType" IN ('APPLICATION', 'CANDIDATE_FILE', 'JOB'))
     ORDER BY "occurredAt" DESC, "id" DESC
     LIMIT 20`,
    [recruitmentOnly],
  );
  return result.rows.map((row) => ({ ...row }));
}

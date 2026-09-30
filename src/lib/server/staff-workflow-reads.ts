import "server-only";
import { authorize, authorizeBeforeTargetStateLookup, AuthorizationDeniedError, type AuthorizationOperation } from "./auth/authorization.ts";
import type { StaffPrincipal } from "./auth/session.ts";
import { database, transaction, type DatabaseExecutor } from "./database.ts";
import { requireCurrentStaffPrincipal, StaffPrincipalUnavailableError } from "./repositories/staff.ts";
import { readStaffApplicationContact, readStaffJob, StaffReadUnavailableError, type StaffAuditEventRead, type StaffJobRead, type StaffApplicationContactRead } from "./staff-reads.ts";
import type { ContentFields, JobFields } from "./staff-workflows.ts";
import { narrativeParagraphs } from "./narrative.ts";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type QuestionRead = { id: string; questionType: "SHORT_TEXT" | "LONG_TEXT" | "SELECT" | "YES_NO"; prompt: string; required: boolean; active: boolean; used: boolean; options: string[] };
type ApplicationWorkflowRead = {
  id: string; publicReference: string; technicalStatus: string; application: StaffApplicationContactRead | null;
  files: { id: string; validationStatus: string; technicalStatus: string; securityStatus: string; contentHash: string | null; version: number; createdAt: Date }[];
  answers: { questionTextSnapshot: string; questionTypeSnapshot: string; answerText: string | null; answerBoolean: boolean | null; selectedOptionLabelSnapshot: string | null }[];
  notes: { id: string; authorStaffUserId: string; body: string; createdAt: Date }[];
  history: { fromStatus: string | null; toStatus: string; reasonCode: string; occurredAt: Date }[];
  consents: { consentType: string; version: string; decision: string; source: string; recordedAt: Date }[];
  profile: { experienceLevel: string; specialism: string | null; portfolioUrl: string | null; professionalUrl: string | null; availabilityText: string | null; remoteAvailable: boolean | null; shortIntroduction: string | null; engagementType: string | null; preferredEngagement: string | null; freelancerRateMinMinor: string | null; freelancerRateMaxMinor: string | null; rateCurrency: string | null } | null;
  accommodationContactRequested?: boolean;
};
function unavailable(): never { throw new StaffReadUnavailableError(); }
async function readTransaction<T>(work: (executor: DatabaseExecutor) => Promise<T>): Promise<T> {
  const result = await transaction(async (executor) => {
    try { return { value: await work(executor) }; }
    catch (error) {
      if (error instanceof StaffReadUnavailableError) return { denied: true };
      throw error;
    }
  });
  if (!("value" in result)) unavailable();
  return result.value as T;
}
async function boundary(principal: StaffPrincipal, operation: AuthorizationOperation, type: string, executor: DatabaseExecutor, id?: string) {
  if ((id !== undefined && !uuid.test(id)) || !authorizeBeforeTargetStateLookup(principal, { operation, target: { type, id } }).allowed) unavailable();
  try { await requireCurrentStaffPrincipal(principal, executor); }
  catch (error) { if (error instanceof StaffPrincipalUnavailableError) unavailable(); throw error; }
}
function paragraphs(value: unknown): string[] { return narrativeParagraphs(value) ?? []; }
export async function readContentWorkflow(principal: StaffPrincipal, id: string, executor: DatabaseExecutor = database): Promise<{ id: string; slug: string; publicationState: string; version: number; updatedAt: Date; fields: ContentFields }> {
  if (executor === database) return readTransaction((e) => readContentWorkflow(principal, id, e));
  await boundary(principal, "content.list_metadata", "CONTENT", executor, id);
  const row = (await executor.query<{ id: string; slug: string; title: string; summary: string; clientDescriptor: string | null;
    year: number | null; brief: string | null; challenge: unknown; approach: unknown; outcome: unknown; featured: boolean; publicationState: string; version: number; updatedAt: Date }>(
    `SELECT "id", "slug", "title", "summary", "clientDescriptor", "year", "brief", "challenge", "approach", "outcome", "featured", "publicationState", "version", "updatedAt"
     FROM public."Project" WHERE "id"=$1 AND "publicationState" IN ('DRAFT','SCHEDULED','PUBLISHED') FOR SHARE`, [id])).rows[0];
  if (!row) unavailable();
  const disciplineIds = (await executor.query<{ id: string }>(`SELECT "disciplineId" AS "id" FROM public."ProjectDiscipline" WHERE "projectId"=$1`, [id])).rows.map((r) => r.id);
  const sectorIds = (await executor.query<{ id: string }>(`SELECT "sectorId" AS "id" FROM public."ProjectSector" WHERE "projectId"=$1`, [id])).rows.map((r) => r.id);
  const credits = (await executor.query<{ displayName: string; role: string; approvedUrl: string | null }>(`SELECT "displayName", "role", "approvedUrl" FROM public."ProjectCredit" WHERE "projectId"=$1 ORDER BY "sortOrder" LIMIT 30`, [id])).rows.map((r) => ({ ...r, approvedUrl: r.approvedUrl ?? "" }));
  const media = (await executor.query<{ id: string; altText: string | null; caption: string | null; accessibilityDescription: string | null }>(`SELECT "id", "altText", "caption", "accessibilityDescription" FROM public."ProjectMedia" WHERE "projectId"=$1 ORDER BY "sortOrder" LIMIT 30`, [id])).rows.map((r) => ({ id: r.id, altText: r.altText ?? "", caption: r.caption ?? "", accessibilityDescription: r.accessibilityDescription ?? "" }));
  const fields: ContentFields = { title: row.title, summary: row.summary, clientDescriptor: row.clientDescriptor ?? "", year: row.year,
    brief: row.brief ?? "", challenge: paragraphs(row.challenge), approach: paragraphs(row.approach), outcome: paragraphs(row.outcome), featured: row.featured, disciplineIds, sectorIds, credits, media };
  return { id: row.id, slug: row.slug, publicationState: row.publicationState, version: row.version, updatedAt: row.updatedAt, fields };
}
export async function readContentReferences(principal: StaffPrincipal, executor: DatabaseExecutor = database): Promise<{ disciplines: { id: string; name: string }[]; sectors: { id: string; name: string }[] }> {
  if (executor === database) return readTransaction((e) => readContentReferences(principal, e));
  await boundary(principal, "content.create", "CONTENT", executor);
  const disciplines = (await executor.query<{ id: string; name: string }>(`SELECT "id", "name" FROM public."Discipline" WHERE "active"=true ORDER BY "sortOrder", "id" LIMIT 100`)).rows;
  const sectors = (await executor.query<{ id: string; name: string }>(`SELECT "id", "name" FROM public."Sector" WHERE "active"=true ORDER BY "sortOrder", "id" LIMIT 100`)).rows;
  return { disciplines, sectors };
}
export async function readJobReferences(principal: StaffPrincipal, executor: DatabaseExecutor = database): Promise<{ departments: { id: string; name: string }[]; locations: { id: string; label: string }[] }> {
  if (executor === database) return readTransaction((e) => readJobReferences(principal, e));
  await boundary(principal, "job.create", "JOB", executor);
  return {
    departments: (await executor.query<{ id: string; name: string }>(`SELECT "id", "name" FROM public."Department" WHERE "active"=true ORDER BY "sortOrder", "id" LIMIT 100`)).rows,
    locations: (await executor.query<{ id: string; label: string }>(`SELECT "id", "label" FROM public."JobLocation" WHERE "active"=true ORDER BY "id" LIMIT 100`)).rows,
  };
}
export async function readJobWorkflow(principal: StaffPrincipal, id: string, executor: DatabaseExecutor = database): Promise<{ job: StaffJobRead; fields: JobFields | null; questions: QuestionRead[] }> {
  if (executor === database) return readTransaction((e) => readJobWorkflow(principal, id, e));
  await boundary(principal, "job.draft.read", "JOB", executor, id);
  await executor.query(`SELECT "id" FROM public."Job" WHERE "id"=$1 FOR SHARE`, [id]);
  const job = await readStaffJob(principal, id, executor);
  if (job.detailLevel !== "MANAGEMENT") return { job, fields: null, questions: [] };
  const row = (await executor.query<Omit<JobFields, "compensationMinMinor" | "compensationMaxMinor" | "applicationDeadline"> & { compensationMinMinor: string | null; compensationMaxMinor: string | null; applicationDeadline: Date | null }>(
    `SELECT "title", "departmentId", "jobLocationId", "workArrangement", "employmentType", "experienceLevel", "shiftSchedule", "summary",
     "compensationMode", "compensationMinMinor"::text, "compensationMaxMinor"::text, "compensationCurrency", "compensationPeriod", "compensationText",
     "responsibilities", "requiredQualifications", "preferredQualifications", "hiringProcessCopy", "applicationDeadline"
     FROM public."Job" WHERE "id"=$1`, [id])).rows[0];
  if (!row) unavailable();
  const fields: JobFields = { ...row,
    compensationMinMinor: row.compensationMinMinor === null ? null : Number(row.compensationMinMinor),
    compensationMaxMinor: row.compensationMaxMinor === null ? null : Number(row.compensationMaxMinor),
    compensationCurrency: row.compensationCurrency ?? "", compensationPeriod: row.compensationPeriod ?? "", compensationText: row.compensationText ?? "",
    responsibilities: paragraphs(row.responsibilities), requiredQualifications: paragraphs(row.requiredQualifications), preferredQualifications: paragraphs(row.preferredQualifications), hiringProcessCopy: paragraphs(row.hiringProcessCopy),
    applicationDeadline: row.applicationDeadline?.toISOString() ?? null };
  const questions = (await executor.query<{ id: string; questionType: "SHORT_TEXT" | "LONG_TEXT" | "SELECT" | "YES_NO"; prompt: string; required: boolean; active: boolean; used: boolean; options: string[] }>(
    `SELECT q."id", q."questionType", q."prompt", q."required", q."active",
     EXISTS(SELECT 1 FROM public."ApplicationAnswer" a WHERE a."jobQuestionId"=q."id") AS "used",
     COALESCE((SELECT jsonb_agg(o."label" ORDER BY o."sortOrder") FROM public."JobQuestionOption" o WHERE o."jobQuestionId"=q."id"),'[]'::jsonb) AS "options"
     FROM public."JobQuestion" q WHERE q."jobId"=$1 ORDER BY q."sortOrder" LIMIT 50`, [id])).rows;
  return { job, fields, questions };
}
export async function listSecurityPendingApplications(principal: StaffPrincipal, executor: DatabaseExecutor = database): Promise<{ id: string; publicReference: string; technicalStatus: string }[]> {
  if (executor === database) return readTransaction((e) => listSecurityPendingApplications(principal, e));
  if (!authorizeBeforeTargetStateLookup(principal, { operation: "candidate_file.security_review.initiate", target: { type: "CANDIDATE_FILE", id: "queue" } }).allowed) return [];
  await boundary(principal, "application.withdraw.record", "APPLICATION", executor, "00000000-0000-4000-8000-000000000000");
  return (await executor.query<{ id: string; publicReference: string; technicalStatus: string }>(
    `SELECT "id", "publicReference", "technicalStatus" FROM public."Application" WHERE "technicalStatus"='SECURITY_PENDING'
     AND "expiresAt">CURRENT_TIMESTAMP AND "deletionRequestedAt" IS NULL AND "deletionCompletedAt" IS NULL ORDER BY "createdAt" DESC LIMIT 50`)).rows;
}
export async function readApplicationWorkflow(principal: StaffPrincipal, id: string, executor: DatabaseExecutor = database): Promise<ApplicationWorkflowRead> {
  if (executor === database) return readTransaction((e) => readApplicationWorkflow(principal, id, e));
  await boundary(principal, "application.contact.read", "APPLICATION", executor, id);
  const state = (await executor.query<{ publicReference: string; technicalStatus: string; hiringStatus: string | null; retentionPermitsAccess: boolean; deletionRequested: boolean; deletionCompleted: boolean }>(
    `SELECT "publicReference", "technicalStatus", "hiringStatus", "expiresAt">CURRENT_TIMESTAMP AS "retentionPermitsAccess",
     "deletionRequestedAt" IS NOT NULL AS "deletionRequested", "deletionCompletedAt" IS NOT NULL AS "deletionCompleted"
     FROM public."Application" WHERE "id"=$1 FOR SHARE`, [id])).rows[0];
  if (!state || !state.retentionPermitsAccess || state.deletionRequested || state.deletionCompleted) unavailable();
  const submitted = state.technicalStatus === "SUBMITTED";
  if (!submitted && !(state.technicalStatus === "SECURITY_PENDING" && principal.roles.some((r) => r === "HIRING_MANAGER" || r === "ADMIN"))) unavailable();
  const application = submitted ? await readStaffApplicationContact(principal, id, executor) : null;
  if (submitted) for (const operation of ["application.answers.read", "application.note.read"] as const) {
    if (!authorize(principal, { operation, target: { type: "APPLICATION", id, state: { ...state, inRecruitmentScope: true } } }).allowed) unavailable();
  }
  const files = (await executor.query<{ id: string; validationStatus: string; technicalStatus: string; securityStatus: string; contentHash: string | null; version: number; createdAt: Date }>(
    `SELECT "id", "validationStatus", "technicalStatus", "securityStatus", "contentHash", "version", "createdAt" FROM public."CandidateFile" WHERE "applicationId"=$1 AND "technicalStatus"<>'DELETED' ORDER BY "createdAt" LIMIT 20`, [id])).rows;
  for (const file of files) if (!authorize(principal, { operation: "candidate_file.state.read", target: { type: "CANDIDATE_FILE", id: file.id,
    state: { technicalStatus: state.technicalStatus, fileTechnicalStatus: file.technicalStatus, retentionPermitsAccess: true, deletionCompleted: false, inRecruitmentScope: true } } }).allowed) unavailable();
  const answers = submitted ? (await executor.query<{ questionTextSnapshot: string; questionTypeSnapshot: string; answerText: string | null; answerBoolean: boolean | null; selectedOptionLabelSnapshot: string | null }>(
    `SELECT "questionTextSnapshot", "questionTypeSnapshot", "answerText", "answerBoolean", "selectedOptionLabelSnapshot" FROM public."ApplicationAnswer" WHERE "applicationId"=$1 ORDER BY "createdAt", "id" LIMIT 50`, [id])).rows : [];
  const notes = submitted ? (await executor.query<{ id: string; authorStaffUserId: string; body: string; createdAt: Date }>(
    `SELECT "id", "authorStaffUserId", "body", "createdAt" FROM public."InternalNote" WHERE "applicationId"=$1 ORDER BY "createdAt" DESC, "id" DESC LIMIT 50`, [id])).rows : [];
  const history = submitted ? (await executor.query<{ fromStatus: string | null; toStatus: string; reasonCode: string; occurredAt: Date }>(
    `SELECT "fromStatus", "toStatus", "reasonCode", "occurredAt" FROM public."ApplicationStatusEvent" WHERE "applicationId"=$1 ORDER BY "occurredAt" DESC, "id" LIMIT 50`, [id])).rows : [];
  const consents = submitted ? (await executor.query<{ consentType: string; version: string; decision: string; source: string; recordedAt: Date }>(
    `SELECT d."consentType", d."version", c."decision", c."source", c."recordedAt" FROM public."CandidateConsent" c
     JOIN public."ConsentDefinition" d ON d."id"=c."consentDefinitionId" WHERE c."applicationId"=$1 ORDER BY c."recordedAt" LIMIT 20`, [id])).rows : [];
  const profile = submitted ? (await executor.query<NonNullable<ApplicationWorkflowRead["profile"]>>(`SELECT "experienceLevel", "specialism", "portfolioUrl", "professionalUrl", "availabilityText", "remoteAvailable", "shortIntroduction", "engagementType", "preferredEngagement", "freelancerRateMinMinor"::text, "freelancerRateMaxMinor"::text, "rateCurrency" FROM public."Application" WHERE "id"=$1`, [id])).rows[0] : null;
  let accommodation: { accommodationContactRequested?: boolean } = {};
  if (submitted && authorize(principal, { operation: "application.accommodation.read", target: { type: "APPLICATION", id, state: { ...state, inRecruitmentScope: true } } }).allowed) {
    accommodation = (await executor.query<{ accommodationContactRequested: boolean }>(`SELECT "accommodationContactRequested" FROM public."Application" WHERE "id"=$1`, [id])).rows[0];
  }
  return { id, publicReference: state.publicReference, technicalStatus: state.technicalStatus, application, files, answers, notes, history, consents, profile, ...accommodation };
}
export type AuditFilters = { targetType?: string; targetId?: string; before?: string; eventId?: string };
export async function readAuditWorkflow(principal: StaffPrincipal, filters: AuditFilters = {}, executor: DatabaseExecutor = database): Promise<{ events: StaffAuditEventRead[]; next: string | null }> {
  if (executor === database) return readTransaction((e) => readAuditWorkflow(principal, filters, e));
  await boundary(principal, "audit.events.read", "AUDIT", executor);
  if (Object.keys(filters).some((key) => !["targetType", "targetId", "before", "eventId"].includes(key))) unavailable();
  if (Object.values(filters).some((value) => typeof value !== "string" || value.length > 80)) unavailable();
  if (filters.targetType && !["CONTENT", "JOB", "APPLICATION", "CANDIDATE_FILE", "STAFF", "RETENTION", "BACKGROUND_JOB"].includes(filters.targetType)) unavailable();
  if (filters.targetId && (!uuid.test(filters.targetId) || !filters.targetType)) unavailable();
  if (filters.eventId && !uuid.test(filters.eventId)) unavailable();
  const recruitmentOnly = !principal.roles.some((r) => r === "ADMIN" || r === "AUDITOR");
  let beforeTime: Date | null = null, beforeId: string | null = null;
  if (filters.before) {
    const parts = filters.before.split("~");
    if (parts.length !== 2 || !uuid.test(parts[1]) || !Number.isFinite(Date.parse(parts[0]))) unavailable();
    beforeTime = new Date(parts[0]); beforeId = parts[1];
  }
  const rows = (await executor.query<StaffAuditEventRead>(
    `SELECT "id", "occurredAt", "actorType", "actionCode", "targetType", "targetId", "outcome", "reasonCode", "correlationId"
     FROM public."AuditEvent" WHERE ($1::boolean=false OR "targetType" IN ('JOB','APPLICATION','CANDIDATE_FILE'))
       AND ($2::text IS NULL OR "targetType"=$2) AND ($3::uuid IS NULL OR "targetId"=$3)
       AND ($4::timestamptz IS NULL OR ("occurredAt","id")<($4,$5::uuid)) AND ($6::uuid IS NULL OR "id"=$6)
     ORDER BY "occurredAt" DESC, "id" DESC LIMIT 21`, [recruitmentOnly, filters.targetType || null, filters.targetId || null, beforeTime, beforeId, filters.eventId || null])).rows;
  if (filters.eventId && rows.length !== 1) unavailable();
  const events = rows.slice(0, 20); const last = events.at(-1);
  return { events, next: rows.length > 20 && last ? `${last.occurredAt.toISOString()}~${last.id}` : null };
}
export async function auditTargetHref(principal: StaffPrincipal, event: StaffAuditEventRead, executor: DatabaseExecutor = database): Promise<string | null> {
  try {
    if (event.targetType === "CONTENT") { await readContentWorkflow(principal, event.targetId, executor); return `/staff/content/${event.targetId}`; }
    if (event.targetType === "JOB") { await readStaffJob(principal, event.targetId, executor); return `/staff/jobs/${event.targetId}`; }
    if (event.targetType === "APPLICATION") { await readApplicationWorkflow(principal, event.targetId, executor); return `/staff/applications/${event.targetId}`; }
    if (event.targetType === "CANDIDATE_FILE" && authorizeBeforeTargetStateLookup(principal, { operation: "candidate_file.state.read", target: { type: "CANDIDATE_FILE", id: event.targetId } }).allowed) {
      const row = (await executor.query<{ applicationId: string }>(`SELECT "applicationId" FROM public."CandidateFile" WHERE "id"=$1`, [event.targetId])).rows[0];
      if (!row) return null;
      const detail = await readApplicationWorkflow(principal, row.applicationId, executor);
      if (detail.files.some((f) => f.id === event.targetId)) return `/staff/applications/${row.applicationId}`;
    }
  } catch (error) {
    if (error instanceof StaffReadUnavailableError || error instanceof AuthorizationDeniedError) return null;
    throw error;
  }
  return null;
}

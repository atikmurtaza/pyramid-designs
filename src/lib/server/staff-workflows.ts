import "server-only";

import { randomUUID } from "node:crypto";
import { authorize, type AuthorizationOperation, type AuthorizationState } from "./auth/authorization.ts";
import type { StaffPrincipal } from "./auth/session.ts";
import type { DatabaseExecutor } from "./database.ts";
import { appendAuditEvent } from "./repositories/audit.ts";
import { StaffMutationInputError, StaffMutationUnavailableError } from "./staff-mutations.ts";
import { containsFixtureContent, narrativeDocument, narrativeParagraphs } from "./narrative.ts";

type Versioned = { idempotencyKey: string; expectedVersion: number };
export type ContentFields = {
  title: string; summary: string; clientDescriptor: string; year: number | null;
  brief: string; challenge: string[]; approach: string[]; outcome: string[]; featured: boolean;
  disciplineIds: string[]; sectorIds: string[];
  credits: { displayName: string; role: string; approvedUrl: string }[];
  media: { id: string; altText: string; caption: string; accessibilityDescription: string }[];
};
export type JobFields = {
  title: string; departmentId: string; jobLocationId: string; workArrangement: string;
  employmentType: string; experienceLevel: string; shiftSchedule: string; summary: string;
  compensationMode: "HIDDEN" | "NUMERIC_RANGE" | "APPROVED_TEXT";
  compensationMinMinor: number | null; compensationMaxMinor: number | null;
  compensationCurrency: string; compensationPeriod: string; compensationText: string;
  responsibilities: string[]; requiredQualifications: string[]; preferredQualifications: string[];
  hiringProcessCopy: string[]; applicationDeadline: string | null;
};
export type StaffWorkflowMutation =
  | (Versioned & { type: "content.save"; contentId: string; fields: ContentFields })
  | (Versioned & { type: "content.publish" | "content.archive"; contentId: string; confirmed: true })
  | { type: "job.create"; idempotencyKey: string; slug: string; fields: JobFields }
  | (Versioned & { type: "job.save"; jobId: string; fields: JobFields })
  | (Versioned & { type: "job.publish"; jobId: string; confirmed: true })
  | (Versioned & { type: "job.question.save"; jobId: string; questionId: string | null;
      questionType: "SHORT_TEXT" | "LONG_TEXT" | "SELECT" | "YES_NO"; prompt: string;
      required: boolean; active: boolean; options: string[] })
  | (Versioned & { type: "job.questions.order"; jobId: string; questionIds: string[] })
  | { type: "application.note.create"; idempotencyKey: string; applicationId: string; body: string }
  | { type: "application.withdraw.record"; idempotencyKey: string; applicationId: string;
      expectedTechnicalStatus: string; confirmed: true };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function invalid(): never { throw new StaffMutationInputError(); }
function unavailable(): never { throw new StaffMutationUnavailableError(); }
function exact(value: object, keys: readonly string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid();
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, i) => key !== expected[i])) invalid();
}
function text(value: unknown, max: number, min = 0): string {
  if (typeof value !== "string") invalid();
  const result = value.trim();
  if (result.length < min || result.length > max || /\u0000/.test(result)) invalid();
  return result;
}
function uuid(value: unknown) {
  if (typeof value !== "string" || !uuidPattern.test(value)) invalid();
  return value.toLowerCase();
}
function integer(value: unknown, min: number, max: number) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) invalid();
  return value;
}
function bool(value: unknown) { if (typeof value !== "boolean") invalid(); return value; }
function list<T>(value: unknown, max: number, parse: (item: unknown) => T): T[] {
  if (!Array.isArray(value) || value.length > max) invalid();
  return value.map(parse);
}
function ids(value: unknown, max = 30) {
  const result = list(value, max, uuid);
  if (new Set(result).size !== result.length) invalid();
  return result;
}
function lines(value: unknown) { return list(value, 30, (item) => text(item, 2000, 1)); }
function https(value: unknown) {
  const result = text(value, 500);
  if (result) {
    let parsed: URL; try { parsed = new URL(result); } catch { invalid(); }
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) invalid();
  }
  return result;
}
function slug(value: unknown) {
  const result = text(value, 100, 1);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result)) invalid();
  return result;
}
function contentFields(f: ContentFields): ContentFields {
  exact(f, ["title", "summary", "clientDescriptor", "year", "brief", "challenge", "approach", "outcome", "featured", "disciplineIds", "sectorIds", "credits", "media"]);
  const media = list(f.media, 30, (item) => {
    const m = item as ContentFields["media"][number];
    exact(m, ["id", "altText", "caption", "accessibilityDescription"]);
    return { id: uuid(m.id), altText: text(m.altText, 500), caption: text(m.caption, 1000), accessibilityDescription: text(m.accessibilityDescription, 2000) };
  });
  if (new Set(media.map((m) => m.id)).size !== media.length) invalid();
  return { title: text(f.title, 160, 1), summary: text(f.summary, 600, 1), clientDescriptor: text(f.clientDescriptor, 160),
    year: f.year === null ? null : integer(f.year, 1900, 2200), brief: text(f.brief, 10000),
    challenge: lines(f.challenge), approach: lines(f.approach), outcome: lines(f.outcome), featured: bool(f.featured),
    disciplineIds: ids(f.disciplineIds), sectorIds: ids(f.sectorIds), media,
    credits: list(f.credits, 30, (item) => {
      const c = item as ContentFields["credits"][number]; exact(c, ["displayName", "role", "approvedUrl"]);
      return { displayName: text(c.displayName, 160, 1), role: text(c.role, 120, 1), approvedUrl: https(c.approvedUrl) };
    }) };
}
function jobFields(f: JobFields): JobFields {
  exact(f, ["title", "departmentId", "jobLocationId", "workArrangement", "employmentType", "experienceLevel", "shiftSchedule", "summary", "compensationMode", "compensationMinMinor", "compensationMaxMinor", "compensationCurrency", "compensationPeriod", "compensationText", "responsibilities", "requiredQualifications", "preferredQualifications", "hiringProcessCopy", "applicationDeadline"]);
  if (!["HIDDEN", "NUMERIC_RANGE", "APPROVED_TEXT"].includes(f.compensationMode)) invalid();
  const minimum = f.compensationMinMinor === null ? null : integer(f.compensationMinMinor, 0, Number.MAX_SAFE_INTEGER);
  const maximum = f.compensationMaxMinor === null ? null : integer(f.compensationMaxMinor, 0, Number.MAX_SAFE_INTEGER);
  const currency = text(f.compensationCurrency, 3); const period = text(f.compensationPeriod, 30); const copy = text(f.compensationText, 300);
  if (f.compensationMode === "NUMERIC_RANGE" && (minimum === null || maximum === null || maximum < minimum || !/^[A-Z]{3}$/.test(currency) || !period || copy)) invalid();
  if (f.compensationMode === "APPROVED_TEXT" && (!copy || minimum !== null || maximum !== null || currency || period)) invalid();
  if (f.compensationMode === "HIDDEN" && (minimum !== null || maximum !== null || currency || period || copy)) invalid();
  let deadline: string | null = null;
  if (f.applicationDeadline !== null) {
    const raw = text(f.applicationDeadline, 32, 1);
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{3})?)?Z$/.test(raw) || !Number.isFinite(Date.parse(raw))) invalid();
    deadline = new Date(raw).toISOString();
    if (!deadline.startsWith(raw.slice(0, -1))) invalid();
  }
  return { title: text(f.title, 160, 1), departmentId: uuid(f.departmentId), jobLocationId: uuid(f.jobLocationId),
    workArrangement: text(f.workArrangement, 40, 1), employmentType: text(f.employmentType, 40, 1), experienceLevel: text(f.experienceLevel, 40, 1),
    shiftSchedule: text(f.shiftSchedule, 80, 1), summary: text(f.summary, 600, 1), compensationMode: f.compensationMode,
    compensationMinMinor: minimum, compensationMaxMinor: maximum, compensationCurrency: currency, compensationPeriod: period, compensationText: copy,
    responsibilities: lines(f.responsibilities), requiredQualifications: lines(f.requiredQualifications), preferredQualifications: lines(f.preferredQualifications),
    hiringProcessCopy: lines(f.hiringProcessCopy), applicationDeadline: deadline };
}

export function validateWorkflowMutation(input: StaffWorkflowMutation): StaffWorkflowMutation {
  const idempotencyKey = uuid(input.idempotencyKey);
  switch (input.type) {
    case "application.note.create":
      exact(input, ["type", "idempotencyKey", "applicationId", "body"]);
      return { ...input, idempotencyKey, applicationId: uuid(input.applicationId), body: text(input.body, 2000, 1) };
    case "application.withdraw.record":
      exact(input, ["type", "idempotencyKey", "applicationId", "expectedTechnicalStatus", "confirmed"]);
      if (input.confirmed !== true || !["SUBMISSION_PENDING", "SECURITY_PENDING", "SUBMITTED", "FAILED"].includes(input.expectedTechnicalStatus)) invalid();
      return { ...input, idempotencyKey, applicationId: uuid(input.applicationId) };
    case "job.create":
      exact(input, ["type", "idempotencyKey", "slug", "fields"]);
      return { ...input, idempotencyKey, slug: slug(input.slug), fields: jobFields(input.fields) };
    case "content.save":
      exact(input, ["type", "idempotencyKey", "contentId", "expectedVersion", "fields"]);
      return { ...input, idempotencyKey, contentId: uuid(input.contentId), expectedVersion: integer(input.expectedVersion, 1, 2147483646), fields: contentFields(input.fields) };
    case "content.publish": case "content.archive":
      exact(input, ["type", "idempotencyKey", "contentId", "expectedVersion", "confirmed"]);
      if (input.confirmed !== true) invalid();
      return { ...input, idempotencyKey, contentId: uuid(input.contentId), expectedVersion: integer(input.expectedVersion, 1, 2147483646) };
    case "job.save":
      exact(input, ["type", "idempotencyKey", "jobId", "expectedVersion", "fields"]);
      return { ...input, idempotencyKey, jobId: uuid(input.jobId), expectedVersion: integer(input.expectedVersion, 1, 2147483646), fields: jobFields(input.fields) };
    case "job.publish":
      exact(input, ["type", "idempotencyKey", "jobId", "expectedVersion", "confirmed"]);
      if (input.confirmed !== true) invalid();
      return { ...input, idempotencyKey, jobId: uuid(input.jobId), expectedVersion: integer(input.expectedVersion, 1, 2147483646) };
    case "job.question.save": {
      exact(input, ["type", "idempotencyKey", "jobId", "expectedVersion", "questionId", "questionType", "prompt", "required", "active", "options"]);
      if (!["SHORT_TEXT", "LONG_TEXT", "SELECT", "YES_NO"].includes(input.questionType)) invalid();
      const options = list(input.options, 20, (item) => text(item, 200, 1));
      if (new Set(options).size !== options.length || (input.questionType === "SELECT" ? options.length < 2 : options.length !== 0)) invalid();
      return { ...input, idempotencyKey, jobId: uuid(input.jobId), expectedVersion: integer(input.expectedVersion, 1, 2147483646), questionId: input.questionId === null ? null : uuid(input.questionId),
        prompt: text(input.prompt, 500, 1), required: bool(input.required), active: bool(input.active), options };
    }
    case "job.questions.order":
      exact(input, ["type", "idempotencyKey", "jobId", "expectedVersion", "questionIds"]);
      return { ...input, idempotencyKey, jobId: uuid(input.jobId), expectedVersion: integer(input.expectedVersion, 1, 2147483646), questionIds: ids(input.questionIds, 50) };
    default: invalid();
  }
}

export function workflowBoundary(input: StaffWorkflowMutation) {
  switch (input.type) {
    case "content.save": return { operation: "content.edit", target: { type: "CONTENT", id: input.contentId } } as const;
    case "content.publish": case "content.archive": return { operation: input.type, target: { type: "CONTENT", id: input.contentId } } as const;
    case "job.create": return { operation: input.type, target: { type: "JOB" } } as const;
    case "job.save": return { operation: "job.edit", target: { type: "JOB", id: input.jobId } } as const;
    case "job.publish": return { operation: input.type, target: { type: "JOB", id: input.jobId } } as const;
    case "job.question.save": case "job.questions.order": return { operation: "job.question.manage", target: { type: "JOB", id: input.jobId } } as const;
    case "application.note.create": case "application.withdraw.record": return { operation: input.type, target: { type: "APPLICATION", id: input.applicationId } } as const;
    default: unavailable();
  }
}

function permit(principal: StaffPrincipal, operation: AuthorizationOperation, type: string, id: string, state: AuthorizationState) {
  if (!authorize(principal, { operation, target: { type, id, state } }).allowed) unavailable();
}
async function audit(principal: StaffPrincipal, input: StaffWorkflowMutation, targetType: string, targetId: string, metadata: Record<string, string | number | boolean | null>, executor: DatabaseExecutor) {
  await appendAuditEvent({ actorType: "STAFF", actorStaffUserId: principal.staffUserId,
    actionCode: input.type.replaceAll(".", "_").toUpperCase(), targetType, targetId,
    outcome: "SUCCEEDED", correlationId: input.idempotencyKey, safeMetadata: metadata }, executor);
}
async function reference(executor: DatabaseExecutor, kind: "DEPARTMENT" | "LOCATION" | "DISCIPLINE" | "SECTOR", id: string) {
  await executor.query("SELECT pyramid_private.lock_reference($1, $2)", [kind, id]);
  const table = { DEPARTMENT: "Department", LOCATION: "JobLocation", DISCIPLINE: "Discipline", SECTOR: "Sector" }[kind];
  const row = (await executor.query<{ label: string }>(`SELECT "${kind === "LOCATION" ? "label" : "name"}" AS label FROM public."${table}" WHERE "id"=$1 AND "active"=true`, [id])).rows[0];
  if (!row) unavailable();
  return row.label;
}
function syntheticPublicationAllowed(value: unknown) {
  return !containsFixtureContent(value)
    || (process.env.NODE_ENV !== "production" && process.env.PUBLIC_INTAKE_MODE === "synthetic");
}
export function safeProjectMediaPath(path: string | null) {
  // Fixed local delivery namespace; binary ingestion and remote/provider URLs are unavailable.
  return typeof path === "string" && /^\/media\/projects\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\.(?:png|jpg|jpeg|webp|avif)$/.test(path);
}
async function saveContent(principal: StaffPrincipal, input: Extract<StaffWorkflowMutation, { type: "content.save" }>, executor: DatabaseExecutor) {
  const state = (await executor.query<{ publicationState: string; version: number }>(
    `SELECT "publicationState", "version" FROM public."Project" WHERE "id"=$1 FOR UPDATE`, [input.contentId])).rows[0];
  if (!state || state.version !== input.expectedVersion || state.publicationState !== "DRAFT") unavailable();
  permit(principal, "content.edit", "CONTENT", input.contentId, state);
  const f = input.fields;
  for (const id of [...f.disciplineIds].sort()) await reference(executor, "DISCIPLINE", id);
  for (const id of [...f.sectorIds].sort()) await reference(executor, "SECTOR", id);
  const media = (await executor.query<{ id: string }>(`SELECT "id" FROM public."ProjectMedia" WHERE "projectId"=$1 ORDER BY "id"`, [input.contentId])).rows;
  if (media.length !== f.media.length || media.some((m) => !f.media.some((submitted) => submitted.id === m.id))) unavailable();
  await executor.query(`UPDATE public."Project" SET "title"=$2, "summary"=$3, "clientDescriptor"=$4, "year"=$5,
    "brief"=$6, "challenge"=$7::jsonb, "approach"=$8::jsonb, "outcome"=$9::jsonb, "featured"=$10,
    "version"="version"+1, "updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1`,
  [input.contentId, f.title, f.summary, f.clientDescriptor || null, f.year, f.brief || null,
    JSON.stringify(narrativeDocument(f.challenge)), JSON.stringify(narrativeDocument(f.approach)), JSON.stringify(narrativeDocument(f.outcome)), f.featured]);
  for (const [table, column, values] of [["ProjectDiscipline", "disciplineId", f.disciplineIds], ["ProjectSector", "sectorId", f.sectorIds]] as const) {
    await executor.query(`DELETE FROM public."${table}" WHERE "projectId"=$1`, [input.contentId]);
    for (const id of values) await executor.query(`INSERT INTO public."${table}" ("projectId", "${column}") VALUES ($1,$2)`, [input.contentId, id]);
  }
  await executor.query(`DELETE FROM public."ProjectCredit" WHERE "projectId"=$1`, [input.contentId]);
  for (const [order, credit] of f.credits.entries()) await executor.query(
    `INSERT INTO public."ProjectCredit" ("id", "projectId", "displayName", "role", "approvedUrl", "sortOrder") VALUES ($1,$2,$3,$4,$5,$6)`,
    [randomUUID(), input.contentId, credit.displayName, credit.role, credit.approvedUrl || null, order]);
  // Two-pass ordering avoids immediate unique constraints during swaps.
  await executor.query(`UPDATE public."ProjectMedia" SET "sortOrder"=-"sortOrder"-1 WHERE "projectId"=$1`, [input.contentId]);
  for (const [order, m] of f.media.entries()) await executor.query(
    `UPDATE public."ProjectMedia" SET "altText"=$3, "caption"=$4, "accessibilityDescription"=$5, "sortOrder"=$6,
    "updatedAt"=CURRENT_TIMESTAMP WHERE "projectId"=$1 AND "id"=$2`,
    [input.contentId, m.id, m.altText || null, m.caption || null, m.accessibilityDescription || null, order]);
  await audit(principal, input, "CONTENT", input.contentId, { version: state.version + 1 }, executor);
  return input.contentId;
}
async function transitionContent(principal: StaffPrincipal, input: Extract<StaffWorkflowMutation, { type: "content.publish" | "content.archive" }>, executor: DatabaseExecutor) {
  const row = (await executor.query<{ publicationState: string; version: number; slug: string; title: string;
    summary: string; brief: string | null; challenge: unknown; approach: unknown; outcome: unknown }>(
    `SELECT "publicationState", "version", "slug", "title", "summary", "clientDescriptor", "brief", "challenge", "approach", "outcome"
     FROM public."Project" WHERE "id"=$1 FOR UPDATE`, [input.contentId])).rows[0];
  if (!row || row.version !== input.expectedVersion) unavailable();
  if (input.type === "content.publish") {
    const paragraphs = (value: unknown) => Boolean(narrativeParagraphs(value)?.length);
    if (row.publicationState !== "DRAFT" || !row.title.trim() || !row.summary.trim() || !row.brief?.trim()
      || !paragraphs(row.challenge) || !paragraphs(row.approach) || !paragraphs(row.outcome)
      || !syntheticPublicationAllowed(row)) unavailable();
    const classifications = (await executor.query<{ id: string; kind: "DISCIPLINE" | "SECTOR" }>(
      `SELECT "disciplineId" AS "id", 'DISCIPLINE' AS "kind" FROM public."ProjectDiscipline" WHERE "projectId"=$1
       UNION ALL SELECT "sectorId", 'SECTOR' FROM public."ProjectSector" WHERE "projectId"=$1 ORDER BY "kind", "id"`, [input.contentId])).rows;
    if (!classifications.some((r) => r.kind === "DISCIPLINE") || !classifications.some((r) => r.kind === "SECTOR")) unavailable();
    for (const r of classifications) if (!syntheticPublicationAllowed(await reference(executor, r.kind, r.id))) unavailable();
    const media = (await executor.query<{ mediaType: string; publicDeliveryPath: string | null; altText: string | null }>(
      `SELECT "mediaType", "publicDeliveryPath", "altText", "caption", "accessibilityDescription" FROM public."ProjectMedia" WHERE "projectId"=$1`, [input.contentId])).rows;
    if (!media.length || media.some((m) => m.mediaType !== "IMAGE" || !safeProjectMediaPath(m.publicDeliveryPath) || !m.altText?.trim())) unavailable();
    const credits = (await executor.query(`SELECT "displayName", "role", "approvedUrl" FROM public."ProjectCredit" WHERE "projectId"=$1`, [input.contentId])).rows;
    if (!syntheticPublicationAllowed([media, credits])) unavailable();
    permit(principal, "content.publish", "CONTENT", input.contentId, { publicationState: row.publicationState, approvedContent: true });
    await executor.query(`UPDATE public."Project" SET "publicationState"='PUBLISHED', "publishedAt"=CURRENT_TIMESTAMP,
      "publishAt"=NULL, "version"="version"+1, "updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1`, [input.contentId]);
  } else {
    permit(principal, "content.archive", "CONTENT", input.contentId, row);
    await executor.query(`UPDATE public."Project" SET "publicationState"='ARCHIVED', "archivedAt"=CURRENT_TIMESTAMP,
      "publishAt"=NULL, "version"="version"+1, "updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1`, [input.contentId]);
  }
  await audit(principal, input, "CONTENT", input.contentId, { version: row.version + 1 }, executor);
  return input.contentId;
}
const jobColumns = ["title", "departmentId", "jobLocationId", "workArrangement", "employmentType", "experienceLevel", "shiftSchedule", "summary",
  "compensationMode", "compensationMinMinor", "compensationMaxMinor", "compensationCurrency", "compensationPeriod", "compensationText",
  "responsibilities", "requiredQualifications", "preferredQualifications", "hiringProcessCopy", "applicationDeadline"] as const;
function jobValues(f: JobFields) {
  return jobColumns.map((key) => {
    const value = f[key];
    return Array.isArray(value) ? JSON.stringify(narrativeDocument(value)) : value === "" ? null : value;
  });
}
async function saveJob(principal: StaffPrincipal, input: Extract<StaffWorkflowMutation, { type: "job.create" | "job.save" }>, executor: DatabaseExecutor) {
  const f = input.fields;
  const id = input.type === "job.create" ? randomUUID() : input.jobId;
  if (input.type === "job.save") {
    const row = (await executor.query<{ lifecycleState: string; version: number }>(
      `SELECT "lifecycleState", "version" FROM public."Job" WHERE "id"=$1 FOR UPDATE`, [id])).rows[0];
    if (!row || row.version !== input.expectedVersion || row.lifecycleState !== "DRAFT") unavailable();
    permit(principal, "job.edit", "JOB", id, row);
  }
  await reference(executor, "DEPARTMENT", f.departmentId);
  await reference(executor, "LOCATION", f.jobLocationId);
  if (input.type === "job.create") {
    await executor.query(`INSERT INTO public."Job" ("id", "slug", ${jobColumns.map((c) => `"${c}"`).join(",")}, "lifecycleState", "version", "updatedAt")
      VALUES ($1,$2,${jobColumns.map((_, i) => `$${i + 3}`).join(",")},'DRAFT',1,CURRENT_TIMESTAMP)`, [id, input.slug, ...jobValues(f)]);
  } else {
    await executor.query(`UPDATE public."Job" SET ${jobColumns.map((c, i) => `"${c}"=$${i + 2}`).join(",")},
      "version"="version"+1, "updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1`, [id, ...jobValues(f)]);
  }
  await audit(principal, input, "JOB", id, { version: input.type === "job.create" ? 1 : input.expectedVersion + 1 }, executor);
  return id;
}
async function lockDraftJob(principal: StaffPrincipal, jobId: string, expectedVersion: number, executor: DatabaseExecutor) {
  const row = (await executor.query<{ lifecycleState: string; version: number }>(
    `SELECT "lifecycleState", "version" FROM public."Job" WHERE "id"=$1 FOR UPDATE`, [jobId])).rows[0];
  if (!row || row.lifecycleState !== "DRAFT" || row.version !== expectedVersion) unavailable();
  permit(principal, "job.question.manage", "JOB", jobId, row);
}
async function saveQuestion(principal: StaffPrincipal, input: Extract<StaffWorkflowMutation, { type: "job.question.save" }>, executor: DatabaseExecutor) {
  await lockDraftJob(principal, input.jobId, input.expectedVersion, executor);
  const questionId = input.questionId ?? randomUUID();
  if (input.questionId) {
    const existing = (await executor.query<{ id: string; used: boolean }>(
      `SELECT q."id", EXISTS(SELECT 1 FROM public."ApplicationAnswer" a WHERE a."jobQuestionId"=q."id") AS "used"
       FROM public."JobQuestion" q WHERE q."id"=$1 AND q."jobId"=$2`, [questionId, input.jobId])).rows[0];
    if (!existing || existing.used) unavailable();
    await executor.query(`UPDATE public."JobQuestion" SET "questionType"=$3, "prompt"=$4, "required"=$5, "active"=$6
      WHERE "id"=$1 AND "jobId"=$2`, [questionId, input.jobId, input.questionType, input.prompt, input.required, input.active]);
    await executor.query(`DELETE FROM public."JobQuestionOption" WHERE "jobQuestionId"=$1`, [questionId]);
  } else {
    const count = (await executor.query<{ count: number }>(`SELECT count(*)::int AS "count" FROM public."JobQuestion" WHERE "jobId"=$1`, [input.jobId])).rows[0].count;
    if (count >= 50) unavailable();
    await executor.query(`INSERT INTO public."JobQuestion" ("id", "jobId", "questionType", "prompt", "required", "sortOrder", "active")
      SELECT $1,$2,$3,$4,$5,COALESCE(max("sortOrder")+1,0),$6 FROM public."JobQuestion" WHERE "jobId"=$2`,
      [questionId, input.jobId, input.questionType, input.prompt, input.required, input.active]);
  }
  for (const [order, label] of input.options.entries()) await executor.query(
    `INSERT INTO public."JobQuestionOption" ("id", "jobQuestionId", "label", "sortOrder") VALUES ($1,$2,$3,$4)`, [randomUUID(), questionId, label, order]);
  await executor.query(`UPDATE public."Job" SET "version"="version"+1, "updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1`, [input.jobId]);
  await audit(principal, input, "JOB", input.jobId, { questionId, version: input.expectedVersion + 1 }, executor);
  return input.jobId;
}
async function orderQuestions(principal: StaffPrincipal, input: Extract<StaffWorkflowMutation, { type: "job.questions.order" }>, executor: DatabaseExecutor) {
  await lockDraftJob(principal, input.jobId, input.expectedVersion, executor);
  const rows = (await executor.query<{ id: string; used: boolean }>(`SELECT q."id",
    EXISTS(SELECT 1 FROM public."ApplicationAnswer" a WHERE a."jobQuestionId"=q."id") AS "used"
    FROM public."JobQuestion" q WHERE q."jobId"=$1`, [input.jobId])).rows;
  if (rows.length !== input.questionIds.length || rows.some((r) => r.used || !input.questionIds.includes(r.id))) unavailable();
  await executor.query(`UPDATE public."JobQuestion" SET "sortOrder"="sortOrder"+(SELECT COALESCE(max("sortOrder"),0)+51 FROM public."JobQuestion" WHERE "jobId"=$1) WHERE "jobId"=$1`, [input.jobId]);
  for (const [order, id] of input.questionIds.entries()) await executor.query(`UPDATE public."JobQuestion" SET "sortOrder"=$3 WHERE "jobId"=$1 AND "id"=$2`, [input.jobId, id, order]);
  await executor.query(`UPDATE public."Job" SET "version"="version"+1, "updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1`, [input.jobId]);
  await audit(principal, input, "JOB", input.jobId, { version: input.expectedVersion + 1 }, executor);
  return input.jobId;
}
async function publishJob(principal: StaffPrincipal, input: Extract<StaffWorkflowMutation, { type: "job.publish" }>, executor: DatabaseExecutor) {
  const row = (await executor.query<{ lifecycleState: string; version: number; slug: string; title: string;
    departmentId: string; jobLocationId: string; summary: string; responsibilities: unknown; requiredQualifications: unknown;
    hiringProcessCopy: unknown; deadlineValid: boolean }>(
    `SELECT "lifecycleState", "version", "slug", "title", "departmentId", "jobLocationId", "summary",
     "responsibilities", "requiredQualifications", "preferredQualifications", "hiringProcessCopy", "workArrangement", "employmentType", "experienceLevel", "shiftSchedule", "compensationText",
     ("applicationDeadline" IS NULL OR "applicationDeadline">CURRENT_TIMESTAMP) AS "deadlineValid"
     FROM public."Job" WHERE "id"=$1 FOR UPDATE`, [input.jobId])).rows[0];
  if (!row || row.lifecycleState !== "DRAFT" || row.version !== input.expectedVersion || !row.deadlineValid
    || !row.title.trim() || !row.summary.trim() || !syntheticPublicationAllowed(row)) unavailable();
  for (const value of [row.responsibilities, row.requiredQualifications, row.hiringProcessCopy]) {
    if (!narrativeParagraphs(value)?.length) unavailable();
  }
  if (!syntheticPublicationAllowed([await reference(executor, "DEPARTMENT", row.departmentId), await reference(executor, "LOCATION", row.jobLocationId)])) unavailable();
  const questions = (await executor.query<{ questionType: string; prompt: string; options: number }>(
    `SELECT q."questionType", q."prompt", count(o."id")::int AS "options", jsonb_agg(o."label") AS "labels" FROM public."JobQuestion" q
     LEFT JOIN public."JobQuestionOption" o ON o."jobQuestionId"=q."id"
     WHERE q."jobId"=$1 AND q."active"=true GROUP BY q."id"`, [input.jobId])).rows;
  if (questions.length > 50 || questions.some((q) => !q.prompt.trim() || (q.questionType === "SELECT" ? q.options < 2 || q.options > 20 : q.options !== 0))) unavailable();
  if (!syntheticPublicationAllowed(questions)) unavailable();
  permit(principal, "job.publish", "JOB", input.jobId, { lifecycleState: row.lifecycleState, publishable: true });
  await executor.query(`UPDATE public."Job" SET "lifecycleState"='PUBLISHED', "publishedAt"=CURRENT_TIMESTAMP,
    "publishAt"=NULL, "version"="version"+1, "updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1`, [input.jobId]);
  await audit(principal, input, "JOB", input.jobId, { version: row.version + 1 }, executor);
  return input.jobId;
}
async function applicationWorkflow(principal: StaffPrincipal, input: Extract<StaffWorkflowMutation, { type: "application.note.create" | "application.withdraw.record" }>, executor: DatabaseExecutor) {
  const row = (await executor.query<{ technicalStatus: string; hiringStatus: string | null; retentionPermitsAccess: boolean; deletionCompleted: boolean; deletionRequested: boolean }>(
    `SELECT "technicalStatus", "hiringStatus", "expiresAt">CURRENT_TIMESTAMP AS "retentionPermitsAccess",
      "deletionCompletedAt" IS NOT NULL AS "deletionCompleted", "deletionRequestedAt" IS NOT NULL AS "deletionRequested"
     FROM public."Application" WHERE "id"=$1 FOR ${input.type === "application.note.create" ? "SHARE" : "UPDATE"}`, [input.applicationId])).rows[0];
  if (!row || !row.retentionPermitsAccess || row.deletionRequested || row.deletionCompleted) unavailable();
  permit(principal, input.type, "APPLICATION", input.applicationId, { ...row, inRecruitmentScope: true });
  if (input.type === "application.note.create") {
    const id = randomUUID();
    await executor.query(`INSERT INTO public."InternalNote" ("id", "applicationId", "authorStaffUserId", "body") VALUES ($1,$2,$3,$4)`, [id, input.applicationId, principal.staffUserId, input.body]);
    await audit(principal, input, "APPLICATION", input.applicationId, { noteId: id }, executor);
  } else {
    if (row.technicalStatus !== input.expectedTechnicalStatus) unavailable();
    await executor.query(`UPDATE public."Application" SET "technicalStatus"='WITHDRAWN', "withdrawnAt"=CURRENT_TIMESTAMP,
      "hiringStatus"=CASE WHEN "hiringStatus" IS NULL THEN NULL ELSE 'WITHDRAWN'::public."HiringStatus" END,
      "updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1`, [input.applicationId]);
    if (row.hiringStatus !== null && row.hiringStatus !== "WITHDRAWN") await executor.query(
      `INSERT INTO public."ApplicationStatusEvent" ("id", "applicationId", "fromStatus", "toStatus", "actorType", "actorStaffUserId", "reasonCode")
       VALUES ($1,$2,$3,'WITHDRAWN','STAFF',$4,'VERIFIED_CANDIDATE_WITHDRAWAL')`, [randomUUID(), input.applicationId, row.hiringStatus, principal.staffUserId]);
    await audit(principal, input, "APPLICATION", input.applicationId, { verifiedRequestAttested: true }, executor);
  }
  return input.applicationId;
}
export async function applyStaffWorkflow(principal: StaffPrincipal, input: StaffWorkflowMutation, executor: DatabaseExecutor) {
  switch (input.type) {
    case "content.save": return saveContent(principal, input, executor);
    case "content.publish": case "content.archive": return transitionContent(principal, input, executor);
    case "job.create": case "job.save": return saveJob(principal, input, executor);
    case "job.question.save": return saveQuestion(principal, input, executor);
    case "job.questions.order": return orderQuestions(principal, input, executor);
    case "job.publish": return publishJob(principal, input, executor);
    case "application.note.create": case "application.withdraw.record": return applicationWorkflow(principal, input, executor);
  }
}

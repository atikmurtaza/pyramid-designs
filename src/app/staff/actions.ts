"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { hasSameOriginMutationHeaders } from "@/lib/server/auth/csrf";
import { safeStaffRedirectPath } from "@/lib/server/auth/redirects";
import { createServerSupabaseClient } from "@/lib/server/auth/supabase";
import {
  performStaffMutation,
  StaffMutationInputError,
  type HiringStatus,
  type JobTransition,
  type StaffMutation,
} from "@/lib/server/staff-mutations";
import type { ContentFields, JobFields, StaffWorkflowMutation } from "@/lib/server/staff-workflows";
import { resolveAuthenticatedStaff } from "@/lib/server/auth/session";
import { readApplicationWorkflow } from "@/lib/server/staff-workflow-reads";
import { initiateCandidateFileReview, recordCandidateFileReview } from "@/lib/server/candidate-files";

function staffStatusPath(status: string, destination: string) {
  return `/staff?status=${status}&next=${encodeURIComponent(destination)}`;
}

export async function signInStaff(formData: FormData) {
  const destination = safeStaffRedirectPath(String(formData.get("next") ?? ""));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const passwordEntry = formData.get("password");
  const password = typeof passwordEntry === "string" ? passwordEntry : "";
  let failed = !hasSameOriginMutationHeaders(await headers())
    || !email.includes("@")
    || email.length > 320
    || !password;

  if (!failed) {
    try {
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      failed = Boolean(error);
    } catch {
      failed = true;
    }
  }

  redirect(failed ? staffStatusPath("login_failed", destination) : destination);
}

export async function signOutStaff() {
  let failed = !hasSameOriginMutationHeaders(await headers());
  if (!failed) {
    try {
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase.auth.signOut({ scope: "global" });
      failed = Boolean(error);
    } catch {
      failed = true;
    }
  }
  redirect(failed ? "/staff?status=signout_failed" : "/staff?status=signed_out");
}

function mutationStatusPath(destination: string, status: string) {
  const separator = destination.includes("?") ? "&" : "?";
  return `${destination}${separator}mutation=${status}`;
}

function formValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function requireMutationFields(formData: FormData, allowed: readonly string[], multiple: readonly string[] = []) {
  const entries = [...formData.entries()].filter(([key]) => !key.startsWith("$ACTION_"));
  if (entries.some(([key, value]) => !allowed.includes(key) || typeof value !== "string")) throw new StaffMutationInputError();
  for (const key of allowed) {
    const values = formData.getAll(key);
    if (multiple.includes(key) ? values.length > 30 || new Set(values).size !== values.length : values.length !== 1) throw new StaffMutationInputError();
  }
}

async function runStaffMutation(
  input: StaffMutation,
  destination: string,
  revalidate: readonly string[],
) {
  if (!hasSameOriginMutationHeaders(await headers())) {
    redirect(mutationStatusPath(destination, "unavailable"));
  }

  let outcome: "applied" | "already_applied" = "applied";
  try {
    const result = await performStaffMutation(input);
    outcome = result.outcome === "ALREADY_APPLIED" ? "already_applied" : "applied";
  } catch (error) {
    redirect(mutationStatusPath(
      destination,
      error instanceof StaffMutationInputError ? "validation_failed" : "unavailable",
    ));
  }

  for (const path of revalidate) revalidatePath(path);
  redirect(mutationStatusPath(destination, outcome));
}

export async function createContentDraft(formData: FormData) {
  const destination = "/staff/content";
  try {
    requireMutationFields(formData, ["idempotencyKey", "slug", "title", "summary"]);
  } catch {
    redirect(mutationStatusPath(destination, "validation_failed"));
  }
  return runStaffMutation({
    type: "content.create",
    idempotencyKey: formValue(formData, "idempotencyKey"),
    slug: formValue(formData, "slug"),
    title: formValue(formData, "title"),
    summary: formValue(formData, "summary"),
  }, destination, [destination]);
}

export async function editContentDraft(formData: FormData) {
  const contentId = formValue(formData, "contentId");
  const destination = /^[0-9a-f-]{36}$/i.test(contentId) ? `/staff/content/${contentId}` : "/staff/content";
  try {
    requireMutationFields(formData, ["idempotencyKey", "contentId", "expectedVersion", "title", "summary"]);
  } catch {
    redirect(mutationStatusPath(destination, "validation_failed"));
  }
  return runStaffMutation({
    type: "content.edit",
    idempotencyKey: formValue(formData, "idempotencyKey"),
    contentId,
    expectedVersion: Number(formValue(formData, "expectedVersion")),
    title: formValue(formData, "title"),
    summary: formValue(formData, "summary"),
  }, destination, [destination, "/staff/content"]);
}

export async function changeApplicationHiringStatus(formData: FormData) {
  const applicationId = formValue(formData, "applicationId");
  const destination = /^[0-9a-f-]{36}$/i.test(applicationId)
    ? `/staff/applications/${applicationId}`
    : "/staff/applications";
  try {
    requireMutationFields(formData, [
      "idempotencyKey",
      "applicationId",
      "expectedHiringStatus",
      "requestedHiringStatus",
      "confirmation",
    ]);
    if (formValue(formData, "confirmation") !== "confirmed") throw new StaffMutationInputError();
  } catch {
    redirect(mutationStatusPath(destination, "validation_failed"));
  }
  return runStaffMutation({
    type: "application.hiring_status.change",
    idempotencyKey: formValue(formData, "idempotencyKey"),
    applicationId,
    expectedHiringStatus: formValue(formData, "expectedHiringStatus") as HiringStatus,
    requestedHiringStatus: formValue(formData, "requestedHiringStatus") as HiringStatus,
  }, destination, [destination, "/staff/applications", "/staff/audit"]);
}

export async function transitionJob(formData: FormData) {
  const jobId = formValue(formData, "jobId");
  const destination = /^[0-9a-f-]{36}$/i.test(jobId) ? `/staff/jobs/${jobId}` : "/staff/jobs";
  try {
    requireMutationFields(formData, [
      "idempotencyKey",
      "jobId",
      "expectedVersion",
      "requestedLifecycleState",
      "confirmation",
    ]);
    if (formValue(formData, "confirmation") !== "confirmed") throw new StaffMutationInputError();
  } catch {
    redirect(mutationStatusPath(destination, "validation_failed"));
  }
  return runStaffMutation({
    type: "job.transition",
    idempotencyKey: formValue(formData, "idempotencyKey"),
    jobId,
    expectedVersion: Number(formValue(formData, "expectedVersion")),
    requestedLifecycleState: formValue(formData, "requestedLifecycleState") as JobTransition,
  }, destination, [destination, "/staff/jobs", "/staff/audit"]);
}

function lines(value: string) { return value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean); }
function csv(value: string) { return value.split(",").map((s) => s.trim()).filter(Boolean); }
const contentKeys = ["title", "summary", "clientDescriptor", "year", "brief", "challenge", "approach", "outcome", "featured", "disciplineIds", "sectorIds", "credits", "mediaIds"];
const jobKeys = ["title", "summary", "departmentId", "jobLocationId", "workArrangement", "employmentType", "experienceLevel", "shiftSchedule", "compensationMode", "compensationMinMinor", "compensationMaxMinor", "compensationCurrency", "compensationPeriod", "compensationText", "responsibilities", "requiredQualifications", "preferredQualifications", "hiringProcessCopy", "applicationDeadline"];
function parseContent(form: FormData): ContentFields {
  const get = (key: string) => formValue(form, key);
  const mediaIds = csv(get("mediaIds"));
  return { title: get("title"), summary: get("summary"), clientDescriptor: get("clientDescriptor"), year: get("year") ? Number(get("year")) : null,
    brief: get("brief"), challenge: lines(get("challenge")), approach: lines(get("approach")), outcome: lines(get("outcome")),
    featured: get("featured") === "true", disciplineIds: form.getAll("disciplineIds") as string[], sectorIds: form.getAll("sectorIds") as string[],
    credits: lines(get("credits")).map((line) => {
      const parts = line.split("|").map((s) => s.trim());
      if (parts.length !== 3) throw new StaffMutationInputError();
      return { displayName: parts[0], role: parts[1], approvedUrl: parts[2] };
    }),
    media: orderedIds(mediaIds, (id) => get(`media.${id}.order`)).map((id) => ({ id, altText: get(`media.${id}.altText`), caption: get(`media.${id}.caption`), accessibilityDescription: get(`media.${id}.accessibilityDescription`) })) };
}
function orderedIds(ids: string[], order: (id: string) => string) {
  const rows = ids.map((id) => ({ id, order: Number(order(id)) }));
  if (rows.some((r) => !Number.isSafeInteger(r.order) || r.order < 1 || r.order > ids.length) || new Set(rows.map((r) => r.order)).size !== ids.length) throw new StaffMutationInputError();
  return rows.sort((a, b) => a.order - b.order).map((r) => r.id);
}
function parseJob(form: FormData): JobFields {
  const get = (key: string) => formValue(form, key);
  return { title: get("title"), summary: get("summary"), departmentId: get("departmentId"), jobLocationId: get("jobLocationId"),
    workArrangement: get("workArrangement"), employmentType: get("employmentType"), experienceLevel: get("experienceLevel"), shiftSchedule: get("shiftSchedule"),
    compensationMode: get("compensationMode") as JobFields["compensationMode"], compensationMinMinor: get("compensationMinMinor") ? Number(get("compensationMinMinor")) : null,
    compensationMaxMinor: get("compensationMaxMinor") ? Number(get("compensationMaxMinor")) : null, compensationCurrency: get("compensationCurrency"), compensationPeriod: get("compensationPeriod"), compensationText: get("compensationText"),
    responsibilities: lines(get("responsibilities")), requiredQualifications: lines(get("requiredQualifications")), preferredQualifications: lines(get("preferredQualifications")), hiringProcessCopy: lines(get("hiringProcessCopy")),
    applicationDeadline: get("applicationDeadline") ? `${get("applicationDeadline")}T23:59:59Z` : null };
}
export async function submitStaffWorkflow(form: FormData) {
  const type = formValue(form, "workflow") as StaffWorkflowMutation["type"];
  const area = type.startsWith("content.") ? "content" : type.startsWith("job.") ? "jobs" : "applications";
  const id = formValue(form, area === "content" ? "contentId" : area === "jobs" ? "jobId" : "applicationId");
  const destination = /^[0-9a-f-]{36}$/i.test(id) ? `/staff/${area}/${id}` : `/staff/${area}`;
  const common = { idempotencyKey: formValue(form, "idempotencyKey") };
  const version = Number(formValue(form, "expectedVersion"));
  let input: StaffWorkflowMutation;
  try {
    switch (type) {
      case "content.save": {
        const mediaIds = csv(formValue(form, "mediaIds"));
        if (mediaIds.length > 30 || mediaIds.some((m) => !/^[0-9a-f-]{36}$/i.test(m)) || !["true", "false"].includes(formValue(form, "featured"))) throw new StaffMutationInputError();
        requireMutationFields(form, ["workflow", "idempotencyKey", "contentId", "expectedVersion", ...contentKeys, ...mediaIds.flatMap((m) => [`media.${m}.altText`, `media.${m}.caption`, `media.${m}.accessibilityDescription`, `media.${m}.order`])], ["disciplineIds", "sectorIds"]);
        input = { type, ...common, contentId: id, expectedVersion: version, fields: parseContent(form) }; break;
      }
      case "content.publish": case "content.archive":
        requireMutationFields(form, ["workflow", "idempotencyKey", "contentId", "expectedVersion", "confirmation"]);
        if (formValue(form, "confirmation") !== "confirmed") throw new StaffMutationInputError();
        input = { type, ...common, contentId: id, expectedVersion: version, confirmed: true }; break;
      case "job.create": case "job.save":
        requireMutationFields(form, ["workflow", "idempotencyKey", ...(type === "job.create" ? ["slug"] : ["jobId", "expectedVersion"]), ...jobKeys]);
        input = type === "job.create" ? { type, ...common, slug: formValue(form, "slug"), fields: parseJob(form) } : { type, ...common, jobId: id, expectedVersion: version, fields: parseJob(form) }; break;
      case "job.publish":
        requireMutationFields(form, ["workflow", "idempotencyKey", "jobId", "expectedVersion", "confirmation"]);
        if (formValue(form, "confirmation") !== "confirmed") throw new StaffMutationInputError();
        input = { type, ...common, jobId: id, expectedVersion: version, confirmed: true }; break;
      case "job.question.save":
        requireMutationFields(form, ["workflow", "idempotencyKey", "jobId", "expectedVersion", "questionId", "questionType", "prompt", "required", "active", "options"]);
        if (!["true", "false"].includes(formValue(form, "required")) || !["true", "false"].includes(formValue(form, "active"))) throw new StaffMutationInputError();
        input = { type, ...common, jobId: id, expectedVersion: version, questionId: formValue(form, "questionId") || null,
          questionType: formValue(form, "questionType") as "SELECT", prompt: formValue(form, "prompt"), required: formValue(form, "required") === "true", active: formValue(form, "active") === "true", options: lines(formValue(form, "options")) }; break;
      case "job.questions.order": {
        const questionIds = csv(formValue(form, "questionIds"));
        if (questionIds.length > 50 || questionIds.some((q) => !/^[0-9a-f-]{36}$/i.test(q))) throw new StaffMutationInputError();
        requireMutationFields(form, ["workflow", "idempotencyKey", "jobId", "expectedVersion", "questionIds", ...questionIds.map((q) => `order.${q}`)]);
        input = { type, ...common, jobId: id, expectedVersion: version, questionIds: orderedIds(questionIds, (q) => formValue(form, `order.${q}`)) }; break;
      }
      case "application.note.create":
        requireMutationFields(form, ["workflow", "idempotencyKey", "applicationId", "body"]);
        input = { type, ...common, applicationId: id, body: formValue(form, "body") }; break;
      case "application.withdraw.record":
        requireMutationFields(form, ["workflow", "idempotencyKey", "applicationId", "expectedTechnicalStatus", "confirmation"]);
        if (formValue(form, "confirmation") !== "confirmed") throw new StaffMutationInputError();
        input = { type, ...common, applicationId: id, expectedTechnicalStatus: formValue(form, "expectedTechnicalStatus"), confirmed: true }; break;
      default: throw new StaffMutationInputError();
    }
  } catch { redirect(mutationStatusPath(destination, "validation_failed")); }
  return runStaffMutation(input, destination, [destination, `/staff/${area}`, "/staff/audit", "/work", "/careers"]);
}
export async function submitFileReview(form: FormData) {
  const applicationId = formValue(form, "applicationId"), fileId = formValue(form, "fileId"), action = formValue(form, "action");
  const destination = /^[0-9a-f-]{36}$/i.test(applicationId) ? `/staff/applications/${applicationId}` : "/staff/applications";
  let failed = false;
  try {
    if (!hasSameOriginMutationHeaders(await headers())) throw new StaffMutationInputError();
    requireMutationFields(form, action === "initiate" ? ["action", "applicationId", "fileId", "confirmation"] : ["action", "applicationId", "fileId", "confirmation", "idempotencyKey", "observedSha256", "outcome", "startedAt", "toolVersion"]);
    if (formValue(form, "confirmation") !== "confirmed") throw new StaffMutationInputError();
    const principal = await resolveAuthenticatedStaff();
    if (!principal) throw new StaffMutationInputError();
    const detail = await readApplicationWorkflow(principal, applicationId);
    if (!detail.files.some((f) => f.id === fileId)) throw new StaffMutationInputError();
    if (action === "initiate") await initiateCandidateFileReview(principal, fileId);
    else if (action === "record") await recordCandidateFileReview(principal, fileId, {
      idempotencyKey: formValue(form, "idempotencyKey"), observedSha256: formValue(form, "observedSha256"),
      outcome: formValue(form, "outcome") as "CLEAN", startedAt: formValue(form, "startedAt"), toolVersion: formValue(form, "toolVersion"),
    }); else throw new StaffMutationInputError();
  } catch { failed = true; }
  if (!failed) { revalidatePath(destination); revalidatePath("/staff/applications"); revalidatePath("/staff/audit"); }
  redirect(mutationStatusPath(destination, failed ? "unavailable" : "applied"));
}

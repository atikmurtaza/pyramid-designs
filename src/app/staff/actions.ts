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

function requireMutationFields(formData: FormData, allowed: readonly string[]) {
  const submitted = [...formData.keys()].filter((key) => !key.startsWith("$ACTION_"));
  const keys = [...new Set(submitted)].sort();
  const expected = [...allowed].sort();
  if (
    submitted.length !== expected.length
    || keys.length !== expected.length
    || keys.some((key, index) => key !== expected[index])
  ) {
    throw new StaffMutationInputError();
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

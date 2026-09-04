"use server";

import { redirect } from "next/navigation";

import { safeStaffRedirectPath } from "@/lib/server/auth/redirects";
import { createServerSupabaseClient } from "@/lib/server/auth/supabase";

function staffStatusPath(status: string, destination: string) {
  return `/staff?status=${status}&next=${encodeURIComponent(destination)}`;
}

export async function signInStaff(formData: FormData) {
  const destination = safeStaffRedirectPath(String(formData.get("next") ?? ""));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const passwordEntry = formData.get("password");
  const password = typeof passwordEntry === "string" ? passwordEntry : "";
  let failed = !email.includes("@") || email.length > 320 || !password;

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
  let failed = true;
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signOut({ scope: "global" });
    failed = Boolean(error);
  } catch {
    failed = true;
  }
  redirect(failed ? "/staff?status=signout_failed" : "/staff?status=signed_out");
}

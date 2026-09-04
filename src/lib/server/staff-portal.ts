import "server-only";

import { redirect } from "next/navigation";

import { resolveAuthenticatedStaff } from "./auth/session.ts";

export async function requireStaffPortalPrincipal(destination: string) {
  const principal = await resolveAuthenticatedStaff();
  if (!principal) redirect(`/staff?status=authentication_required&next=${encodeURIComponent(destination)}`);
  if (principal.assuranceLevel !== "aal2") {
    redirect(`/staff?status=mfa_required&next=${encodeURIComponent(destination)}`);
  }
  return principal;
}

import "server-only";

import {
  findStaffAuthorizationProfile,
  type StaffRole,
} from "../repositories/staff.ts";

export type AuthAssuranceLevel = "aal1" | "aal2";

export type StaffPrincipal = Readonly<{
  authSubjectId: string;
  staffUserId: string;
  assuranceLevel: AuthAssuranceLevel;
  roles: readonly StaffRole[];
}>;

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication required.");
    this.name = "AuthenticationRequiredError";
  }
}

type VerifiedClaimsReader = () => Promise<{
  subjectId: string;
  assuranceLevel: AuthAssuranceLevel;
} | null>;

type StaffProfileReader = typeof findStaffAuthorizationProfile;

async function readProviderClaims() {
  const { readVerifiedSupabaseClaims } = await import("./supabase.ts");
  return readVerifiedSupabaseClaims();
}

export async function resolveAuthenticatedStaff(
  readClaims: VerifiedClaimsReader = readProviderClaims,
  readProfile: StaffProfileReader = findStaffAuthorizationProfile,
): Promise<StaffPrincipal | null> {
  const subject = await readClaims();
  if (!subject?.subjectId) return null;

  const profile = await readProfile(subject.subjectId);
  if (!profile || profile.status !== "ACTIVE" || profile.roles.length === 0) return null;

  return {
    authSubjectId: subject.subjectId,
    staffUserId: profile.staffUserId,
    assuranceLevel: subject.assuranceLevel,
    roles: profile.roles,
  };
}

export async function requireAuthenticatedStaff() {
  const principal = await resolveAuthenticatedStaff();
  if (!principal) throw new AuthenticationRequiredError();
  return principal;
}

import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { authorize } from "@/lib/server/auth/authorization";
import { resolveAuthenticatedStaff } from "@/lib/server/auth/session";
import {
  createServerSupabaseClient,
  readVerifiedSupabaseClaims,
} from "@/lib/server/auth/supabase";
import { findStaffAuthorizationProfile } from "@/lib/server/repositories/staff";

import { MfaExistingFactorChallenge } from "./MfaEnrollment";

const SYNTHETIC_EMAIL = "test@example.com";
const SYNTHETIC_CONTENT_ID = "00000000-0000-4000-8000-00000000002f";
const SYNTHETIC_STAFF_ID = "00000000-0000-4000-8000-000000000020";
const SYNTHETIC_JOB_ID = "00000000-0000-4000-8000-000000000008";
const SYNTHETIC_APPLICATION_ID = "00000000-0000-4000-8000-000000000011";

async function signIn(formData: FormData) {
  "use server";

  if (process.env.NODE_ENV === "production") notFound();
  const password = formData.get("password");
  if (typeof password !== "string" || password.length === 0) {
    redirect("/internal/staff-auth?status=login_failed");
  }

  let failed = true;
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: SYNTHETIC_EMAIL,
      password,
    });
    failed = Boolean(error);
  } catch {
    failed = true;
  }

  redirect(failed ? "/internal/staff-auth?status=login_failed" : "/internal/staff-auth");
}

async function signOut() {
  "use server";

  if (process.env.NODE_ENV === "production") notFound();
  let failed = true;
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signOut({ scope: "global" });
    failed = Boolean(error);
  } catch {
    failed = true;
  }
  redirect(failed ? "/internal/staff-auth?status=signout_failed" : "/internal/staff-auth");
}

export default async function StaffAuthTestPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();

  const [{ status }, principal, providerClaims] = await Promise.all([
    searchParams,
    resolveAuthenticatedStaff(),
    readVerifiedSupabaseClaims(),
  ]);
  const staffProfile = providerClaims
    ? await findStaffAuthorizationProfile(providerClaims.subjectId)
    : null;
  const decision = authorize(principal, {
    operation: "content.draft.read",
    target: {
      type: "CONTENT",
      id: SYNTHETIC_CONTENT_ID,
      state: { publicationState: "DRAFT" },
    },
  });
  const deniedDecision = authorize(principal, {
    operation: "staff.manage",
    target: { type: "STAFF", id: SYNTHETIC_STAFF_ID },
  });

  return (
    <main style={{ margin: "4rem auto", maxWidth: "36rem", padding: "0 1rem" }}>
      <h1>Phase 2C synthetic staff authentication</h1>
      {principal ? (
        <>
          <dl>
            <dt>Authentication</dt>
            <dd>VERIFIED</dd>
            <dt>Staff mapping</dt>
            <dd>ACTIVE</dd>
            <dt>Role</dt>
            <dd>{principal.roles.join(", ")}</dd>
            <dt>Assurance</dt>
            <dd>{principal.assuranceLevel.toUpperCase()}</dd>
            <dt>Authorization</dt>
            <dd>{decision.allowed ? "ALLOWED" : "DENIED"}</dd>
            <dt>Reason</dt>
            <dd>{decision.reasonCode}</dd>
            <dt>Staff management</dt>
            <dd>{deniedDecision.allowed ? "ALLOWED" : "DENIED"}</dd>
            <dt>Staff management reason</dt>
            <dd>{deniedDecision.reasonCode}</dd>
          </dl>
          {principal.assuranceLevel === "aal1" ? <MfaExistingFactorChallenge /> : null}
          {principal.assuranceLevel === "aal2" ? (
            <section aria-labelledby="phase-2d-read-heading">
              <h2 id="phase-2d-read-heading">Phase 2D synthetic staff reads</h2>
              <p>Each link performs a fresh server session, role, state and target check.</p>
              <ul>
                <li>
                  <Link href={`/api/internal/staff-auth/read?resource=job&id=${SYNTHETIC_JOB_ID}`}>
                    Read synthetic job
                  </Link>
                </li>
                <li>
                  <Link href={`/api/internal/staff-auth/read?resource=application&id=${SYNTHETIC_APPLICATION_ID}`}>
                    Read synthetic application contact
                  </Link>
                </li>
                <li>
                  <Link href="/api/internal/staff-auth/read?resource=audit">
                    Read synthetic audit evidence
                  </Link>
                </li>
              </ul>
            </section>
          ) : null}
        </>
      ) : providerClaims ? (
        <dl>
          <dt>Authentication</dt>
          <dd>VERIFIED</dd>
          <dt>Staff mapping</dt>
          <dd>{staffProfile?.status ?? "NOT_MAPPED"}</dd>
          <dt>Assurance</dt>
          <dd>{providerClaims.assuranceLevel.toUpperCase()}</dd>
          <dt>Application principal</dt>
          <dd>DENIED</dd>
        </dl>
      ) : (
        <form action={signIn}>
          <p>Sign in only with the approved synthetic test identity.</p>
          <label htmlFor="email">Email</label>
          <input id="email" value={SYNTHETIC_EMAIL} readOnly />
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
          <button type="submit">Sign in</button>
          {status === "login_failed" ? <p role="alert">Sign-in failed.</p> : null}
        </form>
      )}
      {providerClaims ? (
        <form action={signOut}>
          <button type="submit">Sign out synthetic session</button>
          {status === "signout_failed" ? <p role="alert">Sign-out failed.</p> : null}
        </form>
      ) : null}
    </main>
  );
}

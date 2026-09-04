import Link from "next/link";

import { MfaExistingFactorChallenge } from "@/components/staff/MfaExistingFactorChallenge";
import { resolveAuthenticatedStaff } from "@/lib/server/auth/session";
import { readVerifiedSupabaseClaims } from "@/lib/server/auth/supabase";
import { staffPortalNavigation } from "@/lib/server/staff-navigation";

import { StaffPageHeading } from "./_components";
import { signInStaff, signOutStaff } from "./actions";

const STATUS_MESSAGES: Readonly<Record<string, string>> = {
  authentication_required: "Sign in to continue to the requested staff area.",
  login_failed: "Sign-in failed. Check your details and try again.",
  mfa_required: "Complete TOTP verification to continue.",
  signout_failed: "Sign-out could not be confirmed. Try again before leaving the device.",
  signed_out: "You have signed out.",
};

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; next?: string }>;
}) {
  const [{ status, next }, principal, providerClaims] = await Promise.all([
    searchParams,
    resolveAuthenticatedStaff(),
    readVerifiedSupabaseClaims(),
  ]);
  const destination = next?.startsWith("/staff") ? next : "/staff";
  const message = status ? STATUS_MESSAGES[status] : undefined;

  if (principal?.assuranceLevel === "aal2") {
    const navigation = staffPortalNavigation(principal);
    return (
      <>
        <StaffPageHeading
          eyebrow="Authorized workspace"
          title="Staff portal"
          summary="Read-only access is resolved from the current server session, staff status, roles and database state on every request."
        />
        {message ? <p className="staff-notice" role="status">{message}</p> : null}
        <div className="staff-card-grid">
          {navigation.map((item) => (
            <Link className="staff-card" href={item.href} key={item.href}>
              <span>{item.label}</span>
              <span aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      </>
    );
  }

  if (principal?.assuranceLevel === "aal1") {
    return (
      <>
        <StaffPageHeading
          eyebrow="Additional verification required"
          title="Complete multi-factor authentication"
          summary="Protected staff reads require the account's existing verified TOTP factor."
        />
        {message ? <p className="staff-notice" role="status">{message}</p> : null}
        <MfaExistingFactorChallenge />
        <form action={signOutStaff}>
          <button className="button button-secondary" type="submit">Sign out</button>
        </form>
      </>
    );
  }

  if (providerClaims) {
    return (
      <>
        <StaffPageHeading
          eyebrow="Access unavailable"
          title="This account cannot access the staff portal"
          summary="The current authenticated account is not mapped to an active staff profile with an approved role."
        />
        <form action={signOutStaff}>
          <button className="button button-secondary" type="submit">Sign out</button>
        </form>
      </>
    );
  }

  return (
    <>
      <StaffPageHeading
        eyebrow="Restricted access"
        title="Sign in to the staff portal"
        summary="Use an approved staff account. Authentication details are handled by the configured provider and are never displayed here."
      />
      {message ? <p className="staff-notice" role="status">{message}</p> : null}
      <form className="staff-form staff-panel" action={signInStaff}>
        <input name="next" type="hidden" value={destination} />
        <label htmlFor="staff-email">Email</label>
        <input id="staff-email" name="email" type="email" autoComplete="username" maxLength={320} required />
        <label htmlFor="staff-password">Password</label>
        <input id="staff-password" name="password" type="password" autoComplete="current-password" required />
        <button className="button button-primary" type="submit">Sign in</button>
      </form>
    </>
  );
}

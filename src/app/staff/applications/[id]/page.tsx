import { randomUUID } from "node:crypto";

import { notFound } from "next/navigation";

import { AuthorizationDeniedError } from "@/lib/server/auth/authorization";
import { readStaffApplicationContact, StaffReadUnavailableError } from "@/lib/server/staff-reads";
import { allowedHiringStatusTransitions } from "@/lib/server/staff-mutations";
import { requireStaffPortalPrincipal } from "@/lib/server/staff-portal";

import { formatStaffDate, StaffBackLink, StaffMutationNotice, StaffPageHeading } from "../../_components";
import { PendingSubmitButton } from "../../_pending-submit-button";
import { changeApplicationHiringStatus } from "../../actions";

export default async function StaffApplicationPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mutation?: string }>;
}) {
  const [{ id }, { mutation }] = await Promise.all([params, searchParams]);
  const destination = `/staff/applications/${encodeURIComponent(id)}`;
  const principal = await requireStaffPortalPrincipal(destination);
  let application;
  try {
    application = await readStaffApplicationContact(principal, id);
  } catch (error) {
    if (error instanceof StaffReadUnavailableError || error instanceof AuthorizationDeniedError) notFound();
    throw error;
  }
  const transitions = allowedHiringStatusTransitions(principal, application.id, application.hiringStatus);

  return (
    <>
      <StaffBackLink href="/staff/applications">← Back to applications</StaffBackLink>
      <StaffPageHeading eyebrow="Application" title={application.publicReference} summary="Authorized contact snapshot only." />
      <StaffMutationNotice status={mutation} />
      <dl className="staff-details">
        <div><dt>Name</dt><dd>{application.fullName ?? "Unavailable"}</dd></div>
        <div><dt>Email</dt><dd>{application.email ?? "Unavailable"}</dd></div>
        <div><dt>City</dt><dd>{application.city ?? "Unavailable"}</dd></div>
        <div><dt>Phone or WhatsApp</dt><dd>{application.phoneOrWhatsApp ?? "Unavailable"}</dd></div>
        <div><dt>Application type</dt><dd>{application.applicationType}</dd></div>
        <div><dt>Hiring status</dt><dd>{application.hiringStatus ?? application.technicalStatus}</dd></div>
        <div><dt>Submitted</dt><dd>{formatStaffDate(application.createdAt)}</dd></div>
        <div><dt>Available until</dt><dd>{formatStaffDate(application.expiresAt)}</dd></div>
      </dl>
      {transitions.length > 0 && application.hiringStatus ? (
        <form className="staff-form staff-panel staff-mutation-panel" action={changeApplicationHiringStatus}>
          <h2>Change hiring status</h2>
          <input name="idempotencyKey" type="hidden" value={randomUUID()} />
          <input name="applicationId" type="hidden" value={application.id} />
          <input name="expectedHiringStatus" type="hidden" value={application.hiringStatus} />
          <label htmlFor="requested-hiring-status">Next status</label>
          <select id="requested-hiring-status" name="requestedHiringStatus" required>
            <option value="">Select a permitted transition</option>
            {transitions.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
          </select>
          <label className="staff-confirmation">
            <input name="confirmation" type="checkbox" value="confirmed" required />
            <span>I confirm this hiring workflow change.</span>
          </label>
          <PendingSubmitButton>Update status</PendingSubmitButton>
        </form>
      ) : null}
    </>
  );
}

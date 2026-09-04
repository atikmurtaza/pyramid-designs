import { notFound } from "next/navigation";

import { AuthorizationDeniedError } from "@/lib/server/auth/authorization";
import { readStaffApplicationContact, StaffReadUnavailableError } from "@/lib/server/staff-reads";
import { requireStaffPortalPrincipal } from "@/lib/server/staff-portal";

import { formatStaffDate, StaffBackLink, StaffPageHeading } from "../../_components";

export default async function StaffApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const destination = `/staff/applications/${encodeURIComponent(id)}`;
  const principal = await requireStaffPortalPrincipal(destination);
  let application;
  try {
    application = await readStaffApplicationContact(principal, id);
  } catch (error) {
    if (error instanceof StaffReadUnavailableError || error instanceof AuthorizationDeniedError) notFound();
    throw error;
  }

  return (
    <>
      <StaffBackLink href="/staff/applications">← Back to applications</StaffBackLink>
      <StaffPageHeading eyebrow="Application" title={application.publicReference} summary="Authorized contact snapshot only." />
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
    </>
  );
}

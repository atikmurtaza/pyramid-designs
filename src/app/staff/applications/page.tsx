import Link from "next/link";

import { listStaffApplications } from "@/lib/server/staff-reads";
import { requireStaffPortalPrincipal } from "@/lib/server/staff-portal";
import { listSecurityPendingApplications } from "@/lib/server/staff-workflow-reads";

import { formatStaffDate, StaffEmptyState, StaffPageHeading } from "../_components";

export default async function StaffApplicationsPage() {
  const principal = await requireStaffPortalPrincipal("/staff/applications");
  const applications = await listStaffApplications(principal);
  const pending = await listSecurityPendingApplications(principal);

  return (
    <>
      {pending.length > 0 && <section className="staff-panel"><h2>Security review queue</h2><ul>{pending.map((a) => <li key={a.id}><Link className="text-link" href={`/staff/applications/${a.id}`}>{a.publicReference}</Link> · {a.technicalStatus}</li>)}</ul></section>}
      <StaffPageHeading eyebrow="Applications" title="Application records" summary="This list excludes candidate contact, answers, files, consent and retention internals." />
      {applications.length ? (
        <ul className="staff-list">
          {applications.map((application) => (
            <li className="staff-list__item" key={application.id}>
              <div>
                <Link className="text-link" href={`/staff/applications/${application.id}`}>{application.publicReference}</Link>
                <span>{application.jobTitle ?? application.applicationType} · {application.hiringStatus ?? application.technicalStatus}</span>
              </div>
              <time dateTime={application.createdAt.toISOString()}>{formatStaffDate(application.createdAt)}</time>
            </li>
          ))}
        </ul>
      ) : <StaffEmptyState>No authorized application records are available.</StaffEmptyState>}
    </>
  );
}

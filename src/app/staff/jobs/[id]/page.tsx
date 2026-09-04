import { notFound } from "next/navigation";

import { AuthorizationDeniedError } from "@/lib/server/auth/authorization";
import { readStaffJob, StaffReadUnavailableError } from "@/lib/server/staff-reads";
import { requireStaffPortalPrincipal } from "@/lib/server/staff-portal";

import { formatStaffDate, StaffBackLink, StaffPageHeading } from "../../_components";

export default async function StaffJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const destination = `/staff/jobs/${encodeURIComponent(id)}`;
  const principal = await requireStaffPortalPrincipal(destination);
  let job;
  try {
    job = await readStaffJob(principal, id);
  } catch (error) {
    if (error instanceof StaffReadUnavailableError || error instanceof AuthorizationDeniedError) notFound();
    throw error;
  }

  return (
    <>
      <StaffBackLink href="/staff/jobs">← Back to jobs</StaffBackLink>
      <StaffPageHeading eyebrow="Job record" title={job.title} summary={`${job.departmentName} · ${job.lifecycleState}`} />
      <dl className="staff-details">
        <div><dt>View level</dt><dd>{job.detailLevel === "MANAGEMENT" ? "Management" : "Application context"}</dd></div>
        {job.locationLabel ? <div><dt>Location</dt><dd>{job.locationLabel}</dd></div> : null}
        {job.workArrangement ? <div><dt>Work arrangement</dt><dd>{job.workArrangement}</dd></div> : null}
        {job.employmentType ? <div><dt>Employment type</dt><dd>{job.employmentType}</dd></div> : null}
        {job.experienceLevel ? <div><dt>Experience level</dt><dd>{job.experienceLevel}</dd></div> : null}
        {job.applicationDeadline !== undefined ? <div><dt>Application deadline</dt><dd>{formatStaffDate(job.applicationDeadline)}</dd></div> : null}
        {job.summary ? <div className="staff-details__wide"><dt>Summary</dt><dd>{job.summary}</dd></div> : null}
      </dl>
    </>
  );
}

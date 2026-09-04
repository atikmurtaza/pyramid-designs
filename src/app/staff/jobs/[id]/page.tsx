import { randomUUID } from "node:crypto";

import { notFound } from "next/navigation";

import { AuthorizationDeniedError } from "@/lib/server/auth/authorization";
import { readStaffJob, StaffReadUnavailableError } from "@/lib/server/staff-reads";
import { allowedJobTransitions } from "@/lib/server/staff-mutations";
import { requireStaffPortalPrincipal } from "@/lib/server/staff-portal";

import { formatStaffDate, StaffBackLink, StaffMutationNotice, StaffPageHeading } from "../../_components";
import { PendingSubmitButton } from "../../_pending-submit-button";
import { transitionJob } from "../../actions";

export default async function StaffJobPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mutation?: string }>;
}) {
  const [{ id }, { mutation }] = await Promise.all([params, searchParams]);
  const destination = `/staff/jobs/${encodeURIComponent(id)}`;
  const principal = await requireStaffPortalPrincipal(destination);
  let job;
  try {
    job = await readStaffJob(principal, id);
  } catch (error) {
    if (error instanceof StaffReadUnavailableError || error instanceof AuthorizationDeniedError) notFound();
    throw error;
  }
  const transitions = job.version === undefined ? [] : allowedJobTransitions(principal, job.id, job.lifecycleState);

  return (
    <>
      <StaffBackLink href="/staff/jobs">← Back to jobs</StaffBackLink>
      <StaffPageHeading eyebrow="Job record" title={job.title} summary={`${job.departmentName} · ${job.lifecycleState}`} />
      <StaffMutationNotice status={mutation} />
      <dl className="staff-details">
        <div><dt>View level</dt><dd>{job.detailLevel === "MANAGEMENT" ? "Management" : "Application context"}</dd></div>
        {job.locationLabel ? <div><dt>Location</dt><dd>{job.locationLabel}</dd></div> : null}
        {job.workArrangement ? <div><dt>Work arrangement</dt><dd>{job.workArrangement}</dd></div> : null}
        {job.employmentType ? <div><dt>Employment type</dt><dd>{job.employmentType}</dd></div> : null}
        {job.experienceLevel ? <div><dt>Experience level</dt><dd>{job.experienceLevel}</dd></div> : null}
        {job.applicationDeadline !== undefined ? <div><dt>Application deadline</dt><dd>{formatStaffDate(job.applicationDeadline)}</dd></div> : null}
        {job.summary ? <div className="staff-details__wide"><dt>Summary</dt><dd>{job.summary}</dd></div> : null}
      </dl>
      {transitions.length > 0 && job.version !== undefined ? (
        <div className="staff-actions">
          {transitions.map((state) => (
            <form className="staff-form staff-panel staff-mutation-panel" action={transitionJob} key={state}>
              <h2>{state === "CLOSED" ? "Close job" : "Archive job"}</h2>
              <p>{state === "CLOSED" ? "Stop the published hiring lifecycle." : "Move this non-published job out of the active workflow."}</p>
              <input name="idempotencyKey" type="hidden" value={randomUUID()} />
              <input name="jobId" type="hidden" value={job.id} />
              <input name="expectedVersion" type="hidden" value={job.version} />
              <input name="requestedLifecycleState" type="hidden" value={state} />
              <label className="staff-confirmation">
                <input name="confirmation" type="checkbox" value="confirmed" required />
                <span>I confirm this job state change.</span>
              </label>
              <PendingSubmitButton>{state === "CLOSED" ? "Close job" : "Archive job"}</PendingSubmitButton>
            </form>
          ))}
        </div>
      ) : null}
    </>
  );
}

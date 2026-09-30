import Link from "next/link";

import { listStaffJobs } from "@/lib/server/staff-reads";
import { requireStaffPortalPrincipal } from "@/lib/server/staff-portal";

import { formatStaffDate, StaffEmptyState, StaffPageHeading } from "../_components";
import { readJobReferences } from "@/lib/server/staff-workflow-reads";
import { JobEditor } from "../_workflow-forms";

export default async function StaffJobsPage() {
  const principal = await requireStaffPortalPrincipal("/staff/jobs");
  const jobs = await listStaffJobs(principal);
  const references = principal.roles.some((r) => r === "ADMIN" || r === "HIRING_MANAGER") ? await readJobReferences(principal) : null;

  return (
    <>
      <StaffPageHeading eyebrow="Jobs" title="Job records" summary="Visible records are limited by current role and recruitment context." />
      {references && <JobEditor references={references} />}
      {jobs.length ? (
        <ul className="staff-list">
          {jobs.map((job) => (
            <li className="staff-list__item" key={job.id}>
              <div>
                <Link className="text-link" href={`/staff/jobs/${job.id}`}>{job.title}</Link>
                <span>{job.departmentName} · {job.lifecycleState}</span>
              </div>
              <span>{formatStaffDate(job.applicationDeadline)}</span>
            </li>
          ))}
        </ul>
      ) : <StaffEmptyState>No authorized job records are available.</StaffEmptyState>}
    </>
  );
}

import Link from "next/link";

import { listStaffJobs } from "@/lib/server/staff-reads";
import { requireStaffPortalPrincipal } from "@/lib/server/staff-portal";

import { formatStaffDate, StaffEmptyState, StaffPageHeading } from "../_components";

export default async function StaffJobsPage() {
  const principal = await requireStaffPortalPrincipal("/staff/jobs");
  const jobs = await listStaffJobs(principal);

  return (
    <>
      <StaffPageHeading eyebrow="Jobs" title="Job records" summary="Visible records are limited by current role and recruitment context." />
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

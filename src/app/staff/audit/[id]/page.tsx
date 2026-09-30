import Link from "next/link";
import { notFound } from "next/navigation";
import { readAuditWorkflow, auditTargetHref } from "@/lib/server/staff-workflow-reads";
import { StaffReadUnavailableError } from "@/lib/server/staff-reads";
import { requireStaffPortalPrincipal } from "@/lib/server/staff-portal";
import { StaffBackLink, StaffPageHeading, formatStaffDate } from "../../_components";

export default async function AuditDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const principal = await requireStaffPortalPrincipal(`/staff/audit/${id}`);
  let result;
  try { result = await readAuditWorkflow(principal, { eventId: id }); }
  catch (error) { if (error instanceof StaffReadUnavailableError) notFound(); throw error; }
  const e = result.events[0]; const href = await auditTargetHref(principal, e);
  return <><StaffBackLink href="/staff/audit">← Back to audit</StaffBackLink><StaffPageHeading eyebrow="Audit event" title={e.actionCode} summary={formatStaffDate(e.occurredAt)} />
    <dl className="staff-details">{Object.entries({ Outcome: e.outcome, Actor: e.actorType, "Target type": e.targetType, "Target ID": e.targetId, Reason: e.reasonCode ?? "Not recorded", "Correlation ID": e.correlationId }).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>
    {href && <Link className="text-link" href={href}>Open authorized target</Link>}
  </>;
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { readAuditWorkflow } from "@/lib/server/staff-workflow-reads";
import { StaffReadUnavailableError } from "@/lib/server/staff-reads";
import { requireStaffPortalPrincipal } from "@/lib/server/staff-portal";
import { formatStaffDate, StaffEmptyState, StaffPageHeading } from "../_components";

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ targetType?: string; targetId?: string; before?: string }> }) {
  const filters = await searchParams;
  const principal = await requireStaffPortalPrincipal("/staff/audit");
  let result;
  try { result = await readAuditWorkflow(principal, filters); }
  catch (error) { if (error instanceof StaffReadUnavailableError) notFound(); throw error; }
  const query = new URLSearchParams();
  if (filters.targetType) query.set("targetType", filters.targetType);
  if (filters.targetId) query.set("targetId", filters.targetId);
  if (result.next) query.set("before", result.next);
  return <><StaffPageHeading eyebrow="Audit" title="Operational history" summary="Immutable event evidence; note bodies, contact details and provider payloads are excluded." />
    <form method="get" className="staff-form staff-panel"><label>Resource type<select name="targetType" defaultValue={filters.targetType ?? ""}><option value="">All authorized types</option>{["CONTENT", "JOB", "APPLICATION", "CANDIDATE_FILE", "STAFF", "RETENTION", "BACKGROUND_JOB"].map((t) => <option key={t}>{t}</option>)}</select></label><label>Exact target ID, optional<input name="targetId" defaultValue={filters.targetId ?? ""} maxLength={36} /></label><button className="button button-primary">Apply filters</button><Link className="text-link" href="/staff/audit">Clear filters</Link></form>
    {result.events.length ? <ol className="staff-list">{result.events.map((e) => <li className="staff-list__item" key={e.id}><div><Link className="text-link" href={`/staff/audit/${e.id}`}>{e.actionCode}</Link><span>{e.targetType} · {e.outcome}</span></div><time dateTime={e.occurredAt.toISOString()}>{formatStaffDate(e.occurredAt)}</time></li>)}</ol> : <StaffEmptyState>No authorized events match these filters.</StaffEmptyState>}
    {result.next && <nav aria-label="Audit pagination"><Link className="text-link" href={`/staff/audit?${query}`}>Older events</Link></nav>}
  </>;
}

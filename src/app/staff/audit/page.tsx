import { readStaffAuditEvents } from "@/lib/server/staff-reads";
import { requireStaffPortalPrincipal } from "@/lib/server/staff-portal";

import { formatStaffDate, StaffEmptyState, StaffPageHeading } from "../_components";

export default async function StaffAuditPage() {
  const principal = await requireStaffPortalPrincipal("/staff/audit");
  const events = await readStaffAuditEvents(principal);

  return (
    <>
      <StaffPageHeading eyebrow="Audit" title="Recent history" summary="Only approved event fields are shown; payloads and provider internals are excluded." />
      {events.length ? (
        <ol className="staff-list">
          {events.map((event) => (
            <li className="staff-list__item" key={event.id}>
              <div><strong>{event.actionCode}</strong><span>{event.targetType} · {event.outcome}</span></div>
              <time dateTime={event.occurredAt.toISOString()}>{formatStaffDate(event.occurredAt)}</time>
            </li>
          ))}
        </ol>
      ) : <StaffEmptyState>No authorized audit history is available.</StaffEmptyState>}
    </>
  );
}

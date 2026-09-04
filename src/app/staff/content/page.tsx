import { listStaffContent } from "@/lib/server/staff-reads";
import { requireStaffPortalPrincipal } from "@/lib/server/staff-portal";

import { formatStaffDate, StaffEmptyState, StaffPageHeading } from "../_components";

export default async function StaffContentPage() {
  const principal = await requireStaffPortalPrincipal("/staff/content");
  const items = await listStaffContent(principal);

  return (
    <>
      <StaffPageHeading eyebrow="Content" title="Draft content" summary="Only draft and scheduled project metadata is included." />
      {items.length ? (
        <ul className="staff-list">
          {items.map((item) => (
            <li className="staff-list__item" key={item.id}>
              <div><strong>{item.title}</strong><span>{item.publicationState}</span></div>
              <time dateTime={item.updatedAt.toISOString()}>Updated {formatStaffDate(item.updatedAt)}</time>
            </li>
          ))}
        </ul>
      ) : <StaffEmptyState>No draft or scheduled content is available.</StaffEmptyState>}
    </>
  );
}

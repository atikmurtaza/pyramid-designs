import { randomUUID } from "node:crypto";

import Link from "next/link";

import { authorizeBeforeTargetStateLookup } from "@/lib/server/auth/authorization";
import { listStaffContent } from "@/lib/server/staff-reads";
import { requireStaffPortalPrincipal } from "@/lib/server/staff-portal";

import { createContentDraft } from "../actions";
import { formatStaffDate, StaffEmptyState, StaffMutationNotice, StaffPageHeading } from "../_components";
import { PendingSubmitButton } from "../_pending-submit-button";

export default async function StaffContentPage({
  searchParams,
}: {
  searchParams: Promise<{ mutation?: string }>;
}) {
  const { mutation } = await searchParams;
  const principal = await requireStaffPortalPrincipal("/staff/content");
  const items = await listStaffContent(principal);
  const canCreate = authorizeBeforeTargetStateLookup(principal, {
    operation: "content.create",
    target: { type: "CONTENT" },
  }).allowed;

  return (
    <>
      <StaffPageHeading eyebrow="Content" title="Draft content" summary="Only draft and scheduled project metadata is included." />
      <StaffMutationNotice status={mutation} />
      {canCreate ? (
        <form className="staff-form staff-panel staff-mutation-panel" action={createContentDraft}>
          <h2>Create a draft project</h2>
          <p>Creates a private draft only. Publication remains a separate controlled workflow.</p>
          <input name="idempotencyKey" type="hidden" value={randomUUID()} />
          <label htmlFor="content-slug">Slug</label>
          <input id="content-slug" name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={100} required />
          <label htmlFor="content-title">Title</label>
          <input id="content-title" name="title" maxLength={160} required />
          <label htmlFor="content-summary">Summary</label>
          <textarea id="content-summary" name="summary" maxLength={600} rows={5} required />
          <PendingSubmitButton>Create draft</PendingSubmitButton>
        </form>
      ) : null}
      {items.length ? (
        <ul className="staff-list">
          {items.map((item) => (
            <li className="staff-list__item" key={item.id}>
              <div><Link className="text-link" href={`/staff/content/${item.id}`}>{item.title}</Link><span>{item.publicationState}</span></div>
              <time dateTime={item.updatedAt.toISOString()}>Updated {formatStaffDate(item.updatedAt)}</time>
            </li>
          ))}
        </ul>
      ) : <StaffEmptyState>No draft or scheduled content is available.</StaffEmptyState>}
    </>
  );
}

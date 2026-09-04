import { randomUUID } from "node:crypto";

import { notFound } from "next/navigation";

import { authorize } from "@/lib/server/auth/authorization";
import { readStaffContent, StaffReadUnavailableError } from "@/lib/server/staff-reads";
import { requireStaffPortalPrincipal } from "@/lib/server/staff-portal";

import { formatStaffDate, StaffBackLink, StaffMutationNotice, StaffPageHeading } from "../../_components";
import { PendingSubmitButton } from "../../_pending-submit-button";
import { editContentDraft } from "../../actions";

export default async function StaffContentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mutation?: string }>;
}) {
  const [{ id }, { mutation }] = await Promise.all([params, searchParams]);
  const destination = `/staff/content/${encodeURIComponent(id)}`;
  const principal = await requireStaffPortalPrincipal(destination);
  let content;
  try {
    content = await readStaffContent(principal, id);
  } catch (error) {
    if (error instanceof StaffReadUnavailableError) notFound();
    throw error;
  }
  const canEdit = content.publicationState === "DRAFT" && authorize(principal, {
    operation: "content.edit",
    target: {
      type: "CONTENT",
      id: content.id,
      state: { publicationState: content.publicationState },
    },
  }).allowed;

  return (
    <>
      <StaffBackLink href="/staff/content">← Back to content</StaffBackLink>
      <StaffPageHeading eyebrow="Content draft" title={content.title} summary={`${content.publicationState} · Version ${content.version}`} />
      <StaffMutationNotice status={mutation} />
      {canEdit ? (
        <form className="staff-form staff-panel staff-mutation-panel" action={editContentDraft}>
          <h2>Edit draft</h2>
          <input name="idempotencyKey" type="hidden" value={randomUUID()} />
          <input name="contentId" type="hidden" value={content.id} />
          <input name="expectedVersion" type="hidden" value={content.version} />
          <label htmlFor="content-title">Title</label>
          <input id="content-title" name="title" defaultValue={content.title} maxLength={160} required />
          <label htmlFor="content-summary">Summary</label>
          <textarea id="content-summary" name="summary" defaultValue={content.summary} maxLength={600} rows={6} required />
          <PendingSubmitButton>Save draft</PendingSubmitButton>
          <p>Last updated {formatStaffDate(content.updatedAt)}. A stale version is rejected.</p>
        </form>
      ) : <p className="staff-empty">This record is visible but not editable in its current state.</p>}
    </>
  );
}

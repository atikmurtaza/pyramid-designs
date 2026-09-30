import { randomUUID } from "node:crypto";

import { notFound } from "next/navigation";

import { AuthorizationDeniedError } from "@/lib/server/auth/authorization";
import { StaffReadUnavailableError } from "@/lib/server/staff-reads";
import { allowedHiringStatusTransitions } from "@/lib/server/staff-mutations";
import { requireStaffPortalPrincipal } from "@/lib/server/staff-portal";

import { formatStaffDate, StaffBackLink, StaffMutationNotice, StaffPageHeading } from "../../_components";
import { PendingSubmitButton } from "../../_pending-submit-button";
import { changeApplicationHiringStatus } from "../../actions";
import { submitStaffWorkflow } from "../../actions";
import { readApplicationWorkflow } from "@/lib/server/staff-workflow-reads";
import { WorkflowIdentity } from "../../_workflow-forms";
import { FileReview } from "../../_file-review";

export default async function StaffApplicationPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mutation?: string }>;
}) {
  const [{ id }, { mutation }] = await Promise.all([params, searchParams]);
  const destination = `/staff/applications/${encodeURIComponent(id)}`;
  const principal = await requireStaffPortalPrincipal(destination);
  let application, detail;
  try {
    detail = await readApplicationWorkflow(principal, id);
    application = detail.application;
  } catch (error) {
    if (error instanceof StaffReadUnavailableError || error instanceof AuthorizationDeniedError) notFound();
    throw error;
  }
  const transitions = application ? allowedHiringStatusTransitions(principal, application.id, application.hiringStatus).filter((s) => s !== "WITHDRAWN") : [];

  return (
    <>
      <StaffBackLink href="/staff/applications">← Back to applications</StaffBackLink>
      <StaffPageHeading eyebrow="Application" title={detail.publicReference} summary={`Authorized review · ${detail.technicalStatus}`} />
      <StaffMutationNotice status={mutation} />
      {application && <dl className="staff-details">
        <div><dt>Name</dt><dd>{application.fullName ?? "Unavailable"}</dd></div>
        <div><dt>Email</dt><dd>{application.email ?? "Unavailable"}</dd></div>
        <div><dt>City</dt><dd>{application.city ?? "Unavailable"}</dd></div>
        <div><dt>Phone or WhatsApp</dt><dd>{application.phoneOrWhatsApp ?? "Unavailable"}</dd></div>
        <div><dt>Application type</dt><dd>{application.applicationType}</dd></div>
        <div><dt>Hiring status</dt><dd>{application.hiringStatus ?? application.technicalStatus}</dd></div>
        <div><dt>Submitted</dt><dd>{formatStaffDate(application.createdAt)}</dd></div>
        <div><dt>Available until</dt><dd>{formatStaffDate(application.expiresAt)}</dd></div>
      </dl>}
      <p>The recorded expiry is an access cutoff, not proof of the final six-month retention anchor. Talent-network and employment retention are unresolved. Production erasure remains disabled.</p>
      {transitions.length > 0 && application?.hiringStatus ? (
        <form className="staff-form staff-panel staff-mutation-panel" action={changeApplicationHiringStatus}>
          <h2>Change hiring status</h2>
          <input name="idempotencyKey" type="hidden" value={randomUUID()} />
          <input name="applicationId" type="hidden" value={application.id} />
          <input name="expectedHiringStatus" type="hidden" value={application.hiringStatus} />
          <label htmlFor="requested-hiring-status">Next status</label>
          <select id="requested-hiring-status" name="requestedHiringStatus" required>
            <option value="">Select a permitted transition</option>
            {transitions.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
          </select>
          <label className="staff-confirmation">
            <input name="confirmation" type="checkbox" value="confirmed" required />
            <span>I confirm this hiring workflow change.</span>
          </label>
          <PendingSubmitButton>Update status</PendingSubmitButton>
        </form>
      ) : null}
      {application && <>
        {detail.profile && <section className="staff-panel"><h2>Professional context</h2><dl>{Object.entries(detail.profile).filter(([, value]) => value !== null && value !== "").map(([key, value]) => <div key={key}><dt>{key.replace(/([A-Z])/g, " $1")}</dt><dd>{typeof value === "boolean" ? value ? "Yes" : "No" : value}</dd></div>)}</dl></section>}
        {detail.accommodationContactRequested !== undefined && <p>Accommodation contact requested: {detail.accommodationContactRequested ? "Yes" : "No"}</p>}
        <section className="staff-panel"><h2>Answers</h2>{detail.answers.length ? <dl>{detail.answers.map((a, i) => <div key={i}><dt>{a.questionTextSnapshot}</dt><dd>{a.answerText ?? a.selectedOptionLabelSnapshot ?? (a.answerBoolean === null ? "Unavailable" : a.answerBoolean ? "Yes" : "No")}</dd></div>)}</dl> : <p>No recorded answers.</p>}</section>
        <section className="staff-panel"><h2>Hiring history</h2><ol>{detail.history.map((h, i) => <li key={i}>{h.fromStatus ?? "Entry"} → {h.toStatus} · {h.reasonCode} · {formatStaffDate(h.occurredAt)}</li>)}</ol></section>
        <section className="staff-panel"><h2>Consent context</h2><ul>{detail.consents.map((c, i) => <li key={i}>{c.consentType} · version {c.version} · {c.decision} · {c.source} · {formatStaffDate(c.recordedAt)}</li>)}</ul></section>
        <section className="staff-panel"><h2>Internal notes</h2><p>Candidate-related personal data. Append-only; corrections use a new note. Only the latest 50 notes are displayed.</p><ol>{detail.notes.map((n) => <li key={n.id}><p>{n.body}</p><small>{formatStaffDate(n.createdAt)} · Author {n.authorStaffUserId}</small></li>)}</ol>
          <form className="staff-form staff-mutation-panel" action={submitStaffWorkflow}><WorkflowIdentity type="application.note.create" id={id} /><label>New internal note<textarea name="body" required maxLength={2000} rows={4} /></label><PendingSubmitButton>Append note</PendingSubmitButton></form>
        </section>
      </>}
      {principal.roles.some((r) => r === "HIRING_MANAGER" || r === "ADMIN") && <form className="staff-form staff-panel staff-mutation-panel" action={submitStaffWorkflow}>
        <h2>Record verified withdrawal</h2><WorkflowIdentity type="application.withdraw.record" id={id} /><input type="hidden" name="expectedTechnicalStatus" value={detail.technicalStatus} />
        <label className="staff-confirmation"><input type="checkbox" name="confirmation" value="confirmed" required /><span>I have verified the candidate&apos;s withdrawal request and confirm recording it.</span></label><PendingSubmitButton>Record withdrawal</PendingSubmitButton>
      </form>}
      <section><h2>Files and security</h2>{detail.files.length ? detail.files.map((f) => <FileReview key={f.id} principal={principal} applicationId={id} applicationTechnicalStatus={detail.technicalStatus} file={f} />) : <p>No candidate file is attached.</p>}</section>
    </>
  );
}

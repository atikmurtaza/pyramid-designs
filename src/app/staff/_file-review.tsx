import { randomUUID } from "node:crypto";
import type { StaffPrincipal } from "@/lib/server/auth/session";
import { authorize } from "@/lib/server/auth/authorization";
import { PendingSubmitButton } from "./_pending-submit-button";
import { submitFileReview } from "./actions";

type File = { id: string; validationStatus: string; technicalStatus: string; securityStatus: string; contentHash: string | null; createdAt: Date };
export function FileReview({ principal, applicationId, applicationTechnicalStatus, file }: { principal: StaffPrincipal; applicationId: string; applicationTechnicalStatus: string; file: File }) {
  const can = (operation: "candidate_file.security_review.initiate" | "candidate_file.security_review.retrieve_quarantine" | "candidate_file.security_review.record_outcome") => authorize(principal, {
    operation, target: { type: "CANDIDATE_FILE", id: file.id, state: { technicalStatus: applicationTechnicalStatus, validationStatus: file.validationStatus,
      fileTechnicalStatus: file.technicalStatus, securityStatus: file.securityStatus, retentionPermitsAccess: true, deletionCompleted: false, inRecruitmentScope: true, hashMatchesReview: true } },
  }).allowed;
  return <section className="staff-panel"><h3>Candidate file {file.id}</h3><p>{file.validationStatus} · {file.technicalStatus} · {file.securityStatus}</p>
    {applicationTechnicalStatus === "SUBMITTED" && file.securityStatus === "CLEARED" && <a className="text-link" href={`/api/staff/candidate-files/${file.id}/download`}>Download cleared PDF</a>}
    {can("candidate_file.security_review.retrieve_quarantine") && <>
      <p>Quarantined PDF: do not open it in a browser or ordinary workspace. Retrieve it only on the approved security-review endpoint and scan externally with Microsoft Defender Antivirus.</p>
      <a className="text-link" href={`/api/staff/candidate-files/${file.id}/quarantine`}>Retrieve quarantined PDF attachment</a>
    </>}
    {can("candidate_file.security_review.initiate") && <form className="staff-form staff-mutation-panel" action={submitFileReview}>
      <input type="hidden" name="applicationId" value={applicationId} /><input type="hidden" name="fileId" value={file.id} /><input type="hidden" name="action" value="initiate" />
      <label className="staff-confirmation"><input name="confirmation" type="checkbox" value="confirmed" required /><span>I am starting a manual security review on the approved endpoint.</span></label><PendingSubmitButton>Start manual review</PendingSubmitButton>
    </form>}
    {can("candidate_file.security_review.record_outcome") && <form className="staff-form staff-mutation-panel" action={submitFileReview}>
      <h4>Reviewer attestation</h4><p>The application records your attestation. It does not observe Defender running. Verify the downloaded file SHA-256 equals the current digest below.</p>
      <p>Current SHA-256: <code>{file.contentHash}</code></p>
      <input type="hidden" name="applicationId" value={applicationId} /><input type="hidden" name="fileId" value={file.id} /><input type="hidden" name="action" value="record" /><input type="hidden" name="idempotencyKey" value={randomUUID()} />
      <label>Observed file SHA-256<input name="observedSha256" pattern="[a-f0-9]{64}" maxLength={64} required autoComplete="off" /></label>
      <label>Scan start time, ISO UTC<input name="startedAt" placeholder="YYYY-MM-DDTHH:mm:ssZ" required maxLength={32} /></label>
      <label>Microsoft Defender Antivirus version<input name="toolVersion" required maxLength={80} /></label>
      <label>Observed outcome<select name="outcome" required defaultValue=""><option value="">Select outcome</option><option value="CLEAN">CLEAN</option><option value="REJECTED">REJECTED: malicious or suspicious</option><option value="FAILED">FAILED: scan failed or indeterminate</option></select></label>
      <label className="staff-confirmation"><input name="confirmation" type="checkbox" value="confirmed" required /><span>I attest that the stated outcome, tool/version, time and digest describe my actual review of this PDF. CLEAN means a completed successful Defender scan.</span></label>
      <PendingSubmitButton>Record reviewer attestation</PendingSubmitButton>
    </form>}
  </section>;
}

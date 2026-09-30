import { randomUUID } from "node:crypto";
import type { ContentFields, JobFields } from "@/lib/server/staff-workflows";
import { submitStaffWorkflow } from "./actions";
import { PendingSubmitButton } from "./_pending-submit-button";

function Field({ name, label, value = "", max = 160, type = "text", required = false }: { name: string; label: string; value?: string | number; max?: number; type?: string; required?: boolean }) {
  return <label>{label}<input name={name} type={type} defaultValue={value} maxLength={max} required={required} /></label>;
}
function Copy({ name, label, value, max = 600, required = false }: { name: string; label: string; value: string; max?: number; required?: boolean }) {
  return <label>{label}<textarea name={name} defaultValue={value} maxLength={max} rows={4} required={required} /></label>;
}
function YesNo({ name, label, value }: { name: string; label: string; value: boolean }) {
  return <label>{label}<select name={name} defaultValue={String(value)}><option value="false">No</option><option value="true">Yes</option></select></label>;
}
export function WorkflowIdentity({ type, id, version }: { type: string; id?: string; version?: number }) {
  return <><input type="hidden" name="workflow" value={type} /><input type="hidden" name="idempotencyKey" value={randomUUID()} />
    {id && <input type="hidden" name={type.startsWith("content.") ? "contentId" : type.startsWith("job.") ? "jobId" : "applicationId"} value={id} />}
    {version !== undefined && <input type="hidden" name="expectedVersion" value={version} />}</>;
}
export function LifecycleForm({ type, id, version, label, description }: { type: "content.publish" | "content.archive" | "job.publish"; id: string; version: number; label: string; description: string }) {
  return <form className="staff-form staff-panel staff-mutation-panel" action={submitStaffWorkflow}>
    <h2>{label}</h2><p>{description}</p><WorkflowIdentity type={type} id={id} version={version} />
    <label className="staff-confirmation"><input name="confirmation" type="checkbox" value="confirmed" required /><span>I confirm {label.toLowerCase()} and have reviewed the current record.</span></label>
    <PendingSubmitButton>{label}</PendingSubmitButton>
  </form>;
}
export function ContentEditor({ id, version, fields: f, references }: { id: string; version: number; fields: ContentFields; references: { disciplines: { id: string; name: string }[]; sectors: { id: string; name: string }[] } }) {
  return <form className="staff-form staff-panel staff-mutation-panel" action={submitStaffWorkflow}>
    <h2>Edit draft</h2><WorkflowIdentity type="content.save" id={id} version={version} />
    <Field name="title" label="Title" value={f.title} required /><Copy name="summary" label="Summary" value={f.summary} required />
    <Field name="clientDescriptor" label="Approved client descriptor" value={f.clientDescriptor} /><Field name="year" label="Year" type="number" value={f.year ?? ""} />
    <Copy name="brief" label="Brief" value={f.brief} max={10000} />
    <p>For challenge, approach and outcome, enter one paragraph per line. Publishing requires all three sections.</p>
    {(["challenge", "approach", "outcome"] as const).map((key) => <Copy key={key} name={key} label={key[0].toUpperCase() + key.slice(1)} value={f[key].join("\n")} max={60030} />)}
    <YesNo name="featured" label="Featured project" value={f.featured} />
    <fieldset><legend>Classification relationships</legend><p>Choose active references. Use Control or Command to select multiple items.</p>
      <label>Disciplines<select name="disciplineIds" multiple defaultValue={f.disciplineIds}>{references.disciplines.map((r) => <option value={r.id} key={r.id}>{r.name}</option>)}</select></label>
      <label>Sectors<select name="sectorIds" multiple defaultValue={f.sectorIds}>{references.sectors.map((r) => <option value={r.id} key={r.id}>{r.name}</option>)}</select></label>
    </fieldset>
    <Copy name="credits" label="Credits: one Name | Role | HTTPS URL per line; leave URL blank when absent" value={f.credits.map((c) => `${c.displayName} | ${c.role} | ${c.approvedUrl}`).join("\n")} max={24000} />
    <fieldset><legend>Existing curated media</legend><p>Binary ingestion is unavailable. Metadata and order can be changed for existing records only.</p>
      <input type="hidden" name="mediaIds" value={f.media.map((m) => m.id).join(",")} />
      {f.media.map((m, i) => <fieldset key={m.id}><legend>Media {i + 1}</legend><Field name={`media.${m.id}.order`} label={`Display position from 1 to ${f.media.length}`} value={i + 1} type="number" required /><Field name={`media.${m.id}.altText`} label="Alternative text" value={m.altText} max={500} /><Copy name={`media.${m.id}.caption`} label="Caption" value={m.caption} max={1000} /><Copy name={`media.${m.id}.accessibilityDescription`} label="Accessibility description" value={m.accessibilityDescription} max={2000} /></fieldset>)}
    </fieldset><PendingSubmitButton>Save draft and relationships</PendingSubmitButton><p>A stale version is rejected. Refresh after saving.</p>
  </form>;
}
export const emptyJobFields: JobFields = { title: "", summary: "", departmentId: "", jobLocationId: "", workArrangement: "", employmentType: "", experienceLevel: "", shiftSchedule: "",
  compensationMode: "HIDDEN", compensationMinMinor: null, compensationMaxMinor: null, compensationCurrency: "", compensationPeriod: "", compensationText: "",
  responsibilities: [], requiredQualifications: [], preferredQualifications: [], hiringProcessCopy: [], applicationDeadline: null };
export function JobEditor({ id, version, fields: f = emptyJobFields, references }: { id?: string; version?: number; fields?: JobFields; references: { departments: { id: string; name: string }[]; locations: { id: string; label: string }[] } }) {
  return <form className="staff-form staff-panel staff-mutation-panel" action={submitStaffWorkflow}>
    <h2>{id ? "Edit job draft" : "Create job draft"}</h2><WorkflowIdentity type={id ? "job.save" : "job.create"} id={id} version={version} />
    {!id && <Field name="slug" label="Permanent slug" max={100} required />}
    <Field name="title" label="Title" value={f.title} required /><Copy name="summary" label="Summary" value={f.summary} required />
    <label>Department<select name="departmentId" defaultValue={f.departmentId} required><option value="">Select department</option>{references.departments.map((r) => <option value={r.id} key={r.id}>{r.name}</option>)}</select></label>
    <label>Location<select name="jobLocationId" defaultValue={f.jobLocationId} required><option value="">Select location</option>{references.locations.map((r) => <option value={r.id} key={r.id}>{r.label}</option>)}</select></label>
    <Field name="workArrangement" label="Work arrangement" value={f.workArrangement} max={40} required /><Field name="employmentType" label="Employment type" value={f.employmentType} max={40} required />
    <Field name="experienceLevel" label="Experience level" value={f.experienceLevel} max={40} required /><Field name="shiftSchedule" label="Shift or schedule" value={f.shiftSchedule} max={80} required />
    <fieldset><legend>Compensation</legend><p>Hidden requires all compensation details blank. Range requires both amounts, currency and period. Approved text requires text only.</p>
      <label>Publication mode<select name="compensationMode" defaultValue={f.compensationMode}><option value="HIDDEN">Hidden</option><option value="NUMERIC_RANGE">Numeric range</option><option value="APPROVED_TEXT">Approved text</option></select></label>
      <Field name="compensationMinMinor" label="Minimum in minor currency units" value={f.compensationMinMinor ?? ""} type="number" /><Field name="compensationMaxMinor" label="Maximum in minor currency units" value={f.compensationMaxMinor ?? ""} type="number" />
      <Field name="compensationCurrency" label="Currency code, for example GBP" value={f.compensationCurrency} max={3} /><Field name="compensationPeriod" label="Payment period" value={f.compensationPeriod} max={30} /><Copy name="compensationText" label="Approved compensation text" value={f.compensationText} max={300} />
    </fieldset><p>Enter one paragraph per line in the following sections.</p>
    {(["responsibilities", "requiredQualifications", "preferredQualifications", "hiringProcessCopy"] as const).map((key) => <Copy key={key} name={key} label={({ responsibilities: "Responsibilities", requiredQualifications: "Required qualifications", preferredQualifications: "Preferred qualifications", hiringProcessCopy: "Approved hiring process" })[key]} value={f[key].join("\n")} max={60030} />)}
    <Field name="applicationDeadline" label="Application deadline, end of day UTC; blank means no deadline" type="date" value={f.applicationDeadline?.slice(0, 10) ?? ""} />
    <PendingSubmitButton>{id ? "Save job draft" : "Create draft"}</PendingSubmitButton>
  </form>;
}
type Question = { id: string; questionType: string; prompt: string; required: boolean; active: boolean; options: string[]; used: boolean };
export function QuestionEditor({ jobId, version, question }: { jobId: string; version: number; question?: Question }) {
  return <form className="staff-form staff-panel staff-mutation-panel" action={submitStaffWorkflow}>
    <h3>{question ? "Edit unused question" : "Add question"}</h3><WorkflowIdentity type="job.question.save" id={jobId} version={version} />
    <input type="hidden" name="questionId" value={question?.id ?? ""} />
    <label>Question type<select name="questionType" defaultValue={question?.questionType ?? "SHORT_TEXT"}><option value="SHORT_TEXT">Short text</option><option value="LONG_TEXT">Long text</option><option value="SELECT">Select one option</option><option value="YES_NO">Yes or no</option></select></label>
    <Copy name="prompt" label="Question prompt" value={question?.prompt ?? ""} max={500} required />
    <YesNo name="required" label="Answer required" value={question?.required ?? false} /><YesNo name="active" label="Active" value={question?.active ?? true} />
    <Copy name="options" label="Select options, one per line; 2–20 unique options for Select, blank for other types" value={question?.options.join("\n") ?? ""} max={4020} />
    <PendingSubmitButton>Save question</PendingSubmitButton>
  </form>;
}
export function QuestionOrder({ jobId, version, questions }: { jobId: string; version: number; questions: Question[] }) {
  return <form className="staff-form staff-panel staff-mutation-panel" action={submitStaffWorkflow}>
    <h3>Order unused questions</h3><WorkflowIdentity type="job.questions.order" id={jobId} version={version} />
    <input type="hidden" name="questionIds" value={questions.map((q) => q.id).join(",")} />
    {questions.map((q, i) => <Field key={q.id} name={`order.${q.id}`} label={`${q.prompt}: position from 1 to ${questions.length}`} value={i + 1} type="number" required />)}
    <PendingSubmitButton>Save question order</PendingSubmitButton>
  </form>;
}

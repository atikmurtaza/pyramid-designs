import { notFound } from "next/navigation";
import { readContentWorkflow, readContentReferences } from "@/lib/server/staff-workflow-reads";
import { StaffReadUnavailableError } from "@/lib/server/staff-reads";
import { requireStaffPortalPrincipal } from "@/lib/server/staff-portal";
import { StaffBackLink, StaffMutationNotice, StaffPageHeading } from "../../_components";
import { ContentEditor, LifecycleForm } from "../../_workflow-forms";

export default async function ContentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ mutation?: string }> }) {
  const [{ id }, { mutation }] = await Promise.all([params, searchParams]);
  const principal = await requireStaffPortalPrincipal(`/staff/content/${id}`);
  let content, references;
  try { content = await readContentWorkflow(principal, id); references = await readContentReferences(principal); }
  catch (error) { if (error instanceof StaffReadUnavailableError) notFound(); throw error; }
  const f = content.fields;
  return <><StaffBackLink href="/staff/content">← Back to content</StaffBackLink><StaffPageHeading eyebrow="Content" title={f.title} summary={`${content.publicationState} · Version ${content.version}`} /><StaffMutationNotice status={mutation} />
    <section className="staff-panel"><h2>Private preview</h2><p>{f.summary}</p><h3>Brief</h3><p>{f.brief || "Not supplied"}</p>{(["challenge", "approach", "outcome"] as const).map((key) => <section key={key}><h3>{key[0].toUpperCase() + key.slice(1)}</h3>{f[key].map((line, i) => <p key={i}>{line}</p>)}</section>)}<p>This preview is private. Publication requires all narrative sections, active discipline/sector references and curated image media with alternative text.</p></section>
    {content.publicationState === "DRAFT" && <><ContentEditor id={id} version={content.version} fields={f} references={references} /><LifecycleForm type="content.publish" id={id} version={content.version} label="Publish project" description="Confirm owner-approved content and media. Synthetic content cannot be published in production." /></>}
    <LifecycleForm type="content.archive" id={id} version={content.version} label="Archive project" description="Remove this project from public consumption while preserving its record and audit evidence." />
  </>;
}

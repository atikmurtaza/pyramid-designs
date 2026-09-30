import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listPublicJobs } from "@/lib/server/public-content";
import "../careers.css";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ "job-slug": string }> };
async function find(slug: string) { return (await listPublicJobs()).find((j) => j.slug === slug); }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const job = await find((await params)["job-slug"]);
  return { title: job?.title ?? "Career role", description: job?.summary };
}
function DetailList({ title, items }: { title: string; items: string[] }) {
  return items?.length ? <section className="career-detail__list"><h2>{title}</h2><ul>{items.map((item, i) => <li key={i}>{item}</li>)}</ul></section> : null;
}
export default async function CareerDetailPage({ params }: Props) {
  const job = await find((await params)["job-slug"]); if (!job) notFound();
  return <main id="main-content" className="careers-page"><article className="career-detail">
    <header className="career-detail__hero"><div className="container"><p><Link href="/careers">Careers</Link> / {job.department}</p><h1>{job.title}</h1><p className="career-detail__summary">{job.summary}</p><ul className="career-detail__meta"><li>{job.location}</li><li>{job.workArrangement}</li><li>{job.employmentType}</li><li>{job.experienceLevel}</li><li>{job.shiftSchedule}</li>{job.applicationDeadline && <li>Closes {job.applicationDeadline.toISOString().slice(0, 10)} UTC</li>}</ul></div></header>
    <div className="container career-detail__grid"><div className="career-detail__main"><DetailList title="What you would do" items={job.responsibilities} /><DetailList title="What you would bring" items={job.requiredQualifications} /><DetailList title="Useful, but not required" items={job.preferredQualifications} /></div><aside className="career-detail__aside">
      {job.compensationMode !== "HIDDEN" && <section><h2>Compensation</h2><p>{job.compensationMode === "APPROVED_TEXT" ? job.compensationText : `${Number(job.compensationMinMinor) / 100}–${Number(job.compensationMaxMinor) / 100} ${job.compensationCurrency} / ${job.compensationPeriod}`}</p></section>}
      <DetailList title="Hiring process" items={job.hiringProcessCopy} /><p>Candidate intake is currently closed.</p><Link className="text-link" href="/careers">Back to opportunities</Link>
    </aside></div>
  </article></main>;
}

import type { Metadata } from "next";
import Link from "next/link";
import { careerJobs, findCareerJob } from "@/content/careers";
import "../careers.css";

type PageProperties = { params: Promise<{ "job-slug": string }> };

export function generateStaticParams() { return careerJobs.map((job) => ({ "job-slug": job.slug })); }

export async function generateMetadata({ params }: PageProperties): Promise<Metadata> {
  const { "job-slug": slug } = await params;
  const job = findCareerJob(slug);
  return { title: job ? job.title : "Career role", description: "A synthetic job-detail prototype for Pyramid Designs." };
}

function DetailList({ title, items }: { title: string; items: readonly string[] }) { return <section className="career-detail__list"><h2>{title}</h2><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></section>; }

export default async function CareerDetailPage({ params }: PageProperties) {
  const { "job-slug": slug } = await params;
  const job = findCareerJob(slug);
  if (!job) return <main id="main-content" className="careers-page"><section className="career-detail container"><p>Prototype role unavailable.</p><h1>That role cannot be found.</h1><Link className="text-link" href="/careers">Return to Careers</Link></section></main>;

  return <main id="main-content" className="careers-page"><article className="career-detail">
    <header className="career-detail__hero"><div className="container"><p><Link href="/careers">Careers</Link><span aria-hidden="true"> / </span>{job.department}</p><h1>{job.title}</h1><p className="career-detail__summary">{job.summary}</p><ul className="career-detail__meta"><li>{job.location}</li><li>{job.arrangement}</li><li>{job.employmentType}</li><li>{job.experienceLevel}</li><li>{job.schedule}</li><li>Closes {job.closingDate}</li></ul></div></header>
    <div className="container career-detail__grid"><div className="career-detail__main"><section><h2>Role purpose</h2><p>{job.purpose}</p></section><DetailList title="What you would do" items={job.responsibilities} /><DetailList title="What you would bring" items={job.requiredQualifications} /><DetailList title="Useful, but not required" items={job.preferredQualifications} /></div><aside className="career-detail__aside"><p className="career-detail__notice">Synthetic vacancy. Replace every job fact before production publishing.</p><h2>Compensation</h2><p>Not published in this prototype. Future policy and role-specific information are required before any production listing.</p><h2>Hiring process</h2><ol><li>Application review</li><li>Short conversation</li><li>Role-specific review or interview</li></ol><Link className="button button-primary" href={`/join?job=${job.slug}`}>Apply for this prototype role</Link><p><Link className="text-link" href="/careers">Back to opportunities</Link></p></aside></div>
  </article></main>;
}

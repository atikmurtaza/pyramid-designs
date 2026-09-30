import type { Metadata } from "next";
import Link from "next/link";
import { listPublicJobs } from "@/lib/server/public-content";
import "./careers.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Careers", description: "Current published opportunities at Pyramid Designs." };
export default async function CareersPage({ searchParams }: { searchParams: Promise<{ department?: string; arrangement?: string }> }) {
  const [query, jobs] = await Promise.all([searchParams, listPublicJobs()]);
  const departments = [...new Set(jobs.map((j) => j.department))];
  const arrangements = [...new Set(jobs.map((j) => j.workArrangement))];
  const department = departments.includes(query.department ?? "") ? query.department : "";
  const arrangement = arrangements.includes(query.arrangement ?? "") ? query.arrangement : "";
  const filtered = jobs.filter((j) => (!department || j.department === department) && (!arrangement || j.workArrangement === arrangement));
  return <main id="main-content" className="careers-page">
    <section className="careers-hero" aria-labelledby="careers-title"><div className="container careers-hero__layout"><div><p className="careers-hero__notice">Careers at Pyramid Designs</p><h1 id="careers-title">Make work that holds together.</h1></div><p className="careers-hero__support">Find current published roles and learn about our work.</p></div></section>
    <section className="careers-openings container" aria-labelledby="openings-title">
      <div className="careers-openings__header"><div><h2 id="openings-title">Current opportunities</h2><p>{jobs.length} open {jobs.length === 1 ? "role" : "roles"}</p></div></div>
      {jobs.length > 0 && <details className="careers-filters" open><summary>Filter opportunities</summary><form method="get" className="careers-filters__form">
        <div className="careers-filters__field"><label htmlFor="department">Department</label><select id="department" name="department" defaultValue={department}><option value="">All departments</option>{departments.map((d) => <option key={d}>{d}</option>)}</select></div>
        <div className="careers-filters__field"><label htmlFor="arrangement">Work arrangement</label><select id="arrangement" name="arrangement" defaultValue={arrangement}><option value="">All arrangements</option>{arrangements.map((a) => <option key={a}>{a}</option>)}</select></div>
        <div className="careers-filters__actions"><button className="button button-primary">Apply filters</button><Link className="text-link" href="/careers">Clear filters</Link></div>
      </form></details>}
      {filtered.length ? <ol className="careers-jobs">{filtered.map((j, i) => <li className={`careers-job careers-job--${i + 1}`} key={j.slug}><article><div className="careers-job__number" aria-hidden="true">{String(i + 1).padStart(2, "0")}</div><div className="careers-job__content"><h3><Link href={`/careers/${j.slug}`}>{j.title}</Link></h3><p>{j.summary}</p><ul className="careers-job__meta" aria-label={`Details for ${j.title}`}><li>{j.department}</li><li>{j.location}</li><li>{j.workArrangement}</li><li>{j.employmentType}</li><li>{j.experienceLevel}</li></ul></div><Link className="careers-job__action" href={`/careers/${j.slug}`}>View role<span aria-hidden="true">↗</span></Link></article></li>)}</ol>
      : <section className="careers-empty-state" aria-labelledby="empty-title"><p>Opportunity update</p><h2 id="empty-title">{jobs.length ? "No current roles match those filters." : "No current openings are published."}</h2><p>{jobs.length ? "Try another department or work arrangement." : "Please check back for future opportunities. Candidate intake is currently closed."}</p><div>{jobs.length ? <Link className="text-link" href="/careers">Clear filters</Link> : <Link className="button button-primary" href="/culture">See how we work</Link>}</div></section>}
    </section>
    <section className="careers-bridge container" aria-labelledby="bridge-title"><div><h2 id="bridge-title">Get to know Pyramid Designs</h2><p>Explore our company and the work we do across disciplines.</p></div><div className="careers-bridge__actions"><Link className="text-link" href="/company">About the company</Link><Link className="text-link" href="/work">Explore work</Link></div></section>
  </main>;
}

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { listPublicProjects } from "@/lib/server/public-content";
import "./work.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Work", description: "Published work from Pyramid Designs." };
export default async function WorkPage() {
  const projects = await listPublicProjects();
  return <main id="main-content" className="work-page">
    <header className="work-intro container"><p className="work-intro__status">Pyramid Designs</p><h1>Work built across disciplines.</h1><p className="work-intro__support">Explore our published projects and their approach.</p></header>
    <section className="work-index container" id="project-index" aria-label="Published project index">
      {projects.length ? projects.map((p, i) => <article className={`work-project work-project--${i === 0 ? "feature" : "wide-a"}`} key={p.slug}>
        <Image src={p.media[0].path} alt={p.media[0].altText} loading="lazy" width={1200} height={800} style={{ width: "100%", height: "auto" }} />
        <div className="work-project__content"><div className="work-project__meta"><span>{p.disciplines.join(" · ")}</span><span>{p.sectors.join(" · ")}</span>{p.year && <span>{p.year}</span>}</div><h2><Link href={`/work/${p.slug}`}>{p.title}</Link></h2><p>{p.summary}</p><Link className="work-project__action" href={`/work/${p.slug}`}>Read case study</Link></div>
      </article>) : <p>No projects are currently published. Please check back for approved case studies.</p>}
    </section>
  </main>;
}

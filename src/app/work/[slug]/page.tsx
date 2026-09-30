import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listPublicProjects } from "@/lib/server/public-content";
import "../work.css";

export const dynamic = "force-dynamic";
export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = (await listPublicProjects()).find((project) => project.slug === slug); if (!p) notFound();
  return <main id="main-content" className="work-page"><article className="container">
    <header className="work-intro"><Link className="text-link" href="/work">Back to work</Link><h1>{p.title}</h1><p>{p.summary}</p><p>{p.clientDescriptor} {p.year}</p></header>
    <section><h2>Brief</h2><p>{p.brief}</p></section>
    {(["challenge", "approach", "outcome"] as const).map((key) => <section key={key}><h2>{key[0].toUpperCase() + key.slice(1)}</h2>{p[key]?.map((line, i) => <p key={i}>{line}</p>)}</section>)}
    {p.media.map((m) => <figure key={m.path}><Image src={m.path} alt={m.altText} width={1200} height={800} style={{ width: "100%", height: "auto" }} />{m.caption && <figcaption>{m.caption}</figcaption>}</figure>)}
    {p.credits.length > 0 && <section><h2>Credits</h2><ul>{p.credits.map((c, i) => <li key={i}>{c.displayName} · {c.role}</li>)}</ul></section>}
  </article></main>;
}

import type { Metadata } from "next";
import "./work.css";

export const metadata: Metadata = {
  title: "Work",
  description: "A synthetic visual prototype for the future Pyramid Designs multidisciplinary work index.",
};

const projects = [
  {
    id: "synthetic-identity-system",
    title: "Synthetic identity system",
    discipline: "Design",
    sector: "Sector pending",
    year: "Year pending",
    summary: "A dominant editorial study for future approved identity work, process evidence and final applications.",
    art: "identity",
    layout: "feature",
  },
  {
    id: "synthetic-digital-service",
    title: "Synthetic digital service",
    discipline: "Development",
    sector: "Sector pending",
    year: "Year pending",
    summary: "A compact media system for future public websites, platforms or software case studies.",
    art: "digital",
    layout: "compact-a",
  },
  {
    id: "synthetic-engineering-study",
    title: "Synthetic engineering study",
    discipline: "Engineering",
    sector: "Sector pending",
    year: "Year pending",
    summary: "A technical project proportion reserved for approved systems, prototypes and build documentation.",
    art: "engineering",
    layout: "compact-b",
  },
  {
    id: "synthetic-campaign-series",
    title: "Synthetic campaign series",
    discipline: "Marketing and content",
    sector: "Sector pending",
    year: "Year pending",
    summary: "A wide sequence for future approved campaign thinking, content systems and production media.",
    art: "campaign",
    layout: "wide-a",
  },
  {
    id: "synthetic-integrated-project",
    title: "Synthetic integrated project",
    discipline: "Multidisciplinary",
    sector: "Sector pending",
    year: "Year pending",
    summary: "A flexible closing study showing how several disciplines can share one coherent project narrative.",
    art: "integrated",
    layout: "wide-b",
  },
] as const;

function SyntheticProjectMedia({ variant }: { variant: (typeof projects)[number]["art"] }) {
  return (
    <div className={`work-art work-art--${variant}`} aria-hidden="true">
      <span className="work-art__shape work-art__shape--one" />
      <span className="work-art__shape work-art__shape--two" />
      <span className="work-art__shape work-art__shape--three" />
      <span className="work-art__shape work-art__shape--four" />
    </div>
  );
}

export default function WorkPage() {
  return (
    <main id="main-content" className="work-page">
      <header className="work-intro container">
        <p className="work-intro__status">Visual prototype. Synthetic content only.</p>
        <h1>Work built across disciplines.</h1>
        <p className="work-intro__support">A synthetic index testing how varied projects can read before approved case studies and media arrive.</p>
      </header>

      <nav className="work-disciplines container" aria-label="Prototype discipline index">
        <a href="#project-index">All work</a>
        {projects.slice(0, 4).map((project) => <a href={`#${project.id}`} key={project.discipline}>{project.discipline}</a>)}
      </nav>

      <section className="work-index container" id="project-index" aria-label="Synthetic project index">
        {projects.map((project) => (
          <article className={`work-project work-project--${project.layout}`} id={project.id} key={project.id} data-content-status="synthetic">
            <SyntheticProjectMedia variant={project.art} />
            <div className="work-project__content">
              <div className="work-project__meta" aria-label="Synthetic project metadata">
                <span>Synthetic study</span>
                <span>{project.discipline}</span>
                <span>{project.sector}</span>
                <span>{project.year}</span>
              </div>
              <h2>{project.title}</h2>
              <p>{project.summary}</p>
              <span className="work-project__action">Case study route planned</span>
            </div>
          </article>
        ))}
      </section>

      <section className="work-readiness container" aria-labelledby="work-readiness-title">
        <div className="work-readiness__rule" aria-hidden="true" />
        <div>
          <h2 id="work-readiness-title">Structured for real work later.</h2>
          <p>Approved titles, media, sectors, years, services, credits and case-study routes can replace this synthetic layer without changing the reading order.</p>
        </div>
      </section>
    </main>
  );
}

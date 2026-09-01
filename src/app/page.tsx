import type { Metadata } from "next";
import Link from "next/link";
import { HomeHeroVisual } from "@/components/home/HomeHeroVisual";
import "./home.css";

export const metadata: Metadata = {
  title: "Pyramid Designs | Creative and technical work in Pakistan",
  description: "Pyramid Designs is a multidisciplinary creative and technical company focused on Pakistan's local market.",
};

const projects = [
  {
    title: "Prototype identity system",
    discipline: "Design",
    descriptor: "Synthetic composition showing how an approved brand project could lead the portfolio narrative.",
    art: "identity",
    featured: true,
  },
  {
    title: "Prototype digital platform",
    discipline: "Development",
    descriptor: "Synthetic composition reserved for future approved product, web or software work.",
    art: "digital",
    featured: false,
  },
  {
    title: "Prototype campaign direction",
    discipline: "Marketing and content",
    descriptor: "Synthetic composition demonstrating a second editorial media proportion without client attribution.",
    art: "campaign",
    featured: false,
  },
] as const;

const capabilities = [
  ["Design", "Brand, graphic, motion and interface disciplines."],
  ["Development", "Web design and development for usable public experiences."],
  ["Engineering", "Software and technical work where project scope requires it."],
  ["Marketing and content", "Campaign and content work, subject to approved service detail."],
] as const;

function PrototypeArtwork({ variant }: { variant: (typeof projects)[number]["art"] }) {
  return (
    <div className={`home-project-art home-project-art--${variant}`} aria-hidden="true">
      <span className="home-project-art__shape home-project-art__shape--one" />
      <span className="home-project-art__shape home-project-art__shape--two" />
      <span className="home-project-art__shape home-project-art__shape--three" />
    </div>
  );
}

export default function HomePage() {
  return (
    <main id="main-content" className="home-page">
      <section className="home-hero container" aria-labelledby="home-title">
        <div className="home-hero__copy">
          <h1 id="home-title" className="home-hero__title" data-content-status="proposed-copy">
            Creative work, technical depth.
          </h1>
          <p className="home-hero__support" data-content-status="proposed-copy">
            One multidisciplinary company for substantial projects and talented people in Pakistan.
          </p>
          <div className="home-hero__actions">
            <Link className="button button-primary" href="/work">View work</Link>
            <Link className="button button-secondary" href="/join">Join us</Link>
          </div>
        </div>
        <HomeHeroVisual />
      </section>

      <section className="home-section home-work" aria-labelledby="selected-work-title">
        <div className="container">
          <div className="home-section__intro">
            <h2 id="selected-work-title" data-content-status="proposed-copy">Selected work, shown with context.</h2>
            <p data-content-status="prototype-explanation">
              This prototype uses unmistakably synthetic media until approved projects, credits and outcomes are supplied.
            </p>
          </div>
          <div className="home-work__grid">
            {projects.map((project) => (
              <article
                className={`home-project${project.featured ? " home-project--featured" : ""}`}
                data-content-status="synthetic"
                key={project.title}
              >
                <Link className="home-project__link" href="/work">
                  <PrototypeArtwork variant={project.art} />
                  <div className="home-project__content">
                    <div className="home-project__meta" aria-label="Prototype project metadata">
                      <span>Synthetic project</span>
                      <span>{project.discipline}</span>
                      <span>Sector pending</span>
                      <span>Year pending</span>
                    </div>
                    <h3>{project.title}</h3>
                    <p>{project.descriptor}</p>
                    <span className="home-project__action">View planned case study</span>
                  </div>
                </Link>
              </article>
            ))}
          </div>
          <Link className="text-link home-work__all" href="/work">View all work</Link>
        </div>
      </section>

      <section className="home-section home-capabilities" aria-labelledby="capabilities-title">
        <div className="container home-capabilities__layout">
          <div className="home-section__intro home-capabilities__intro">
            <h2 id="capabilities-title">Disciplines connected by the work.</h2>
            <p data-content-status="proposed-copy">
              Pyramid Designs brings creative and technical disciplines into one project conversation.
            </p>
          </div>
          <div className="home-capabilities__list">
            {capabilities.map(([title, description]) => (
              <article data-content-status="proposed-copy" key={title}>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section home-culture" aria-labelledby="culture-title">
        <div className="container home-culture__layout">
          <div className="home-culture__media" aria-label="Culture media placeholders">
            <figure className="home-culture__figure home-culture__figure--large">
              <div className="home-culture__placeholder home-culture__placeholder--people" aria-hidden="true" />
              <figcaption>Approved workplace photography required.</figcaption>
            </figure>
            <figure className="home-culture__figure home-culture__figure--small">
              <div className="home-culture__placeholder home-culture__placeholder--events" aria-hidden="true" />
              <figcaption>Approved people and events media required.</figcaption>
            </figure>
          </div>
          <div className="home-culture__copy">
            <h2 id="culture-title" data-content-status="proposed-copy">The people behind the work matter.</h2>
            <p data-content-status="prototype-explanation">
              The final story must use approved team photography, workplace details and employee voices. This prototype defines how that evidence can carry real visual weight.
            </p>
            <Link className="text-link" href="/culture">Explore culture</Link>
          </div>
        </div>
      </section>

      <section className="home-section home-join" aria-labelledby="join-title">
        <div className="container home-join__layout">
          <div className="home-section__intro home-join__intro">
            <h2 id="join-title" data-content-status="proposed-copy">There is more than one way to work with us.</h2>
            <p data-content-status="proposed-copy">
              Pyramid Designs may engage people through permanent opportunities, freelance work and project relationships. Live availability is not connected in this prototype.
            </p>
          </div>
          <div className="home-join__paths">
            <Link href="/careers">
              <span className="home-join__path-title">View open roles</span>
              <span>For approved permanent or contract vacancies when they are published.</span>
            </Link>
            <Link href="/join">
              <span className="home-join__path-title">Introduce yourself</span>
              <span>For freelance, project, portfolio and future permanent interest.</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="home-parent" aria-labelledby="parent-title">
        <div className="container home-parent__layout">
          <div className="home-parent__accent" aria-hidden="true" />
          <div>
            <h2 id="parent-title">Pyramid Designs, MAD Alpha Designers company.</h2>
            <p data-content-status="proposed-copy">Pyramid Designs keeps its own local identity while acknowledging the verified parent-company relationship.</p>
          </div>
          <a className="text-link" href="https://madalphadesigners.com" target="_blank" rel="noreferrer">
            Visit MAD Alpha Designers
          </a>
        </div>
      </section>
    </main>
  );
}

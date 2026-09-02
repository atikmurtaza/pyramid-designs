import type { Metadata } from "next";
import Image, { type StaticImageData } from "next/image";
import collaborationHero from "@/assets/culture/culture-collaboration-hero.webp";
import digitalReview from "@/assets/culture/culture-digital-review.webp";
import projectCritique from "@/assets/culture/culture-project-critique.webp";
import prototypeReview from "@/assets/culture/culture-prototype-review.webp";
import hamzaPortrait from "@/assets/culture/fictional-hamza-ilyas.webp";
import mariamPortrait from "@/assets/culture/fictional-mariam-raza.webp";
import sanaPortrait from "@/assets/culture/fictional-sana-qureshi.webp";
import "./culture.css";

export const metadata: Metadata = {
  title: "Culture",
  description: "A synthetic visual prototype for the future Pyramid Designs Culture page.",
};

const stories: Array<{
  name: string;
  role: string;
  discipline: string;
  story: string;
  image: StaticImageData;
  imagePosition: string;
}> = [
  {
    name: "Sana Qureshi",
    role: "Visual designer",
    discipline: "Design",
    story: "Sana moves between rough layout studies, material references and critique sessions, keeping visual decisions connected to the wider project.",
    image: sanaPortrait,
    imagePosition: "50% 42%",
  },
  {
    name: "Hamza Ilyas",
    role: "Web developer",
    discipline: "Development",
    story: "Hamza turns shared sketches into working interfaces, then brings what he learns back to the team before details become expensive.",
    image: hamzaPortrait,
    imagePosition: "50% 38%",
  },
  {
    name: "Mariam Raza",
    role: "Project coordinator",
    discipline: "Project operations",
    story: "Mariam keeps questions, decisions and handovers visible so creative and technical work can move at the same pace.",
    image: mariamPortrait,
    imagePosition: "50% 40%",
  },
];

const stages = [
  ["Starting a practice", "Future approved content can show how early-career contributors encounter critique, real project constraints and several disciplines."],
  ["Building depth", "Future stories can explain how people strengthen a craft while learning to work clearly with adjacent teams."],
  ["Leading the work", "Future profiles can describe how experienced specialists guide decisions, support others and stay close to delivery."],
] as const;

function PrototypeCaption() {
  return <figcaption>Synthetic prototype image. Replace with approved Pyramid Designs photography.</figcaption>;
}

export default function CulturePage() {
  return (
    <main id="main-content" className="culture-page">
      <section className="culture-hero" aria-labelledby="culture-title">
        <Image
          className="culture-hero__image"
          src={collaborationHero}
          alt="Synthetic image of four South Asian collaborators reviewing design and technical work around a studio table."
          fill
          priority
          sizes="100vw"
        />
        <div className="culture-hero__shade" aria-hidden="true" />
        <div className="culture-hero__content container">
          <p className="culture-hero__status">Visual prototype. Synthetic people and stories.</p>
          <h1 id="culture-title">Culture lives in the work.</h1>
          <p className="culture-hero__support">A future view of multidisciplinary people solving practical problems together.</p>
        </div>
      </section>

      <section className="culture-collaboration container" aria-labelledby="culture-collaboration-title">
        <div className="culture-collaboration__copy">
          <h2 id="culture-collaboration-title">Different disciplines, one working rhythm.</h2>
          <p>Design, development, engineering, content and project operations need room to question the same brief from different angles.</p>
          <p>This prototype treats collaboration as practical work: reviewing, making, testing, documenting and deciding together.</p>
        </div>
        <figure className="culture-figure culture-figure--portrait">
          <Image
            src={prototypeReview}
            alt="Synthetic image of a South Asian designer and engineer reviewing a physical prototype and printed layouts."
            sizes="(max-width: 768px) 100vw, 52vw"
          />
          <PrototypeCaption />
        </figure>
      </section>

      <section className="culture-critique" aria-labelledby="culture-critique-title">
        <div className="culture-critique__layout media-container">
          <figure className="culture-figure culture-figure--wide">
            <Image
              src={projectCritique}
              alt="Synthetic overhead image of several collaborators annotating architectural, interface and material studies."
              sizes="(max-width: 768px) 100vw, 62vw"
            />
            <PrototypeCaption />
          </figure>
          <div className="culture-critique__copy">
            <h2 id="culture-critique-title">Review is part of making.</h2>
            <p>Work becomes clearer when unfinished thinking can be shared early, challenged respectfully and improved before delivery.</p>
            <p className="culture-critique__note">Production copy must be confirmed against the real Pyramid Designs review process.</p>
          </div>
        </div>
      </section>

      <section className="culture-stages container" aria-labelledby="culture-stages-title">
        <div className="culture-stages__intro">
          <h2 id="culture-stages-title">Room for different career stages.</h2>
          <p>The final page can explain real development paths once programmes, policies and examples are approved.</p>
        </div>
        <div className="culture-stages__list">
          {stages.map(([title, description], index) => (
            <article key={title}>
              <span aria-hidden="true">0{index + 1}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="culture-stories container" id="culture-stories" aria-labelledby="culture-stories-title">
        <div className="culture-stories__intro">
          <h2 id="culture-stories-title">Three fictional working perspectives.</h2>
          <p>These editorial profiles test the story format only. The people, roles and accounts are not Pyramid Designs staff information.</p>
        </div>
        <div className="culture-stories__grid">
          {stories.map((story, index) => (
            <article className={`culture-story culture-story--${index + 1}`} key={story.name} data-content-status="synthetic">
              <figure className="culture-story__portrait">
                <Image
                  src={story.image}
                  alt={`Synthetic portrait representing ${story.name}, a fictional ${story.role.toLowerCase()}.`}
                  sizes="(max-width: 768px) 100vw, 46vw"
                  style={{ objectPosition: story.imagePosition }}
                />
              </figure>
              <div className="culture-story__content">
                <p className="culture-story__status">Fictional profile</p>
                <h3>{story.name}</h3>
                <p className="culture-story__role">{story.role} / {story.discipline}</p>
                <p>{story.story}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="culture-digital container" aria-labelledby="culture-digital-title">
        <figure className="culture-figure culture-figure--portrait culture-digital__figure">
          <Image
            src={digitalReview}
            alt="Synthetic image of two South Asian colleagues discussing work on a laptop in a studio."
            sizes="(max-width: 768px) 100vw, 42vw"
          />
          <PrototypeCaption />
        </figure>
        <div className="culture-digital__copy">
          <h2 id="culture-digital-title">The handover stays human.</h2>
          <p>Creative and technical decisions are easier to carry forward when context travels with the work, not only through files and task lists.</p>
        </div>
      </section>

      <section className="culture-transition" aria-labelledby="culture-transition-title">
        <div className="culture-transition__layout container">
          <div>
            <h2 id="culture-transition-title">Interested in working here?</h2>
            <p>Culture introduces the working environment. Careers will hold approved opportunities, routes and application guidance.</p>
          </div>
          <p className="culture-transition__status">Careers prototype follows in Phase 1F.</p>
        </div>
      </section>
    </main>
  );
}

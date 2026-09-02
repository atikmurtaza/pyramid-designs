import type { Metadata } from "next";
import Link from "next/link";
import "./company.css";

export const metadata: Metadata = {
  title: "Company",
  description: "A provisional introduction to Pyramid Designs, its multidisciplinary model and MAD Alpha Designers context.",
};

const deliveryDisciplines = ["Design", "Development", "Engineering", "Marketing and content"];
const operatingDisciplines = ["Sales", "Operations and project functions"];
const workflow = [
  ["Context and strategy", "Define the question, practical context and direction before making decisions."],
  ["Design", "Shape ideas into visual, spatial, content or interface directions."],
  ["Technical development", "Test, build and refine the parts that need technical care."],
  ["Delivery and refinement", "Bring work together, review it and improve what the project reveals."],
] as const;

export default function CompanyPage() {
  return (
    <main id="main-content" className="company-page">
      <section className="company-hero container" aria-labelledby="company-title">
        <div className="company-hero__copy">
          <p className="company-hero__notice">Company prototype. Production wording requires approval.</p>
          <h1 id="company-title">A multidisciplinary practice for work that needs more than one view.</h1>
          <p>Pyramid Designs is a Pakistan-focused practice bringing creative, technical and operating disciplines into a shared project conversation.</p>
        </div>
        <div className="company-hero__geometry" aria-hidden="true"><span className="company-hero__plane company-hero__plane--one" /><span className="company-hero__plane company-hero__plane--two" /><span className="company-hero__plane company-hero__plane--three" /></div>
      </section>
      <section className="company-introduction container" aria-labelledby="company-introduction-title">
        <h2 id="company-introduction-title">Work is clearer when disciplines stay connected.</h2>
        <div className="company-introduction__copy"><p>This prototype describes a working model, not a fixed service list. The aim is to make room for the right perspectives as a brief moves from an early question to delivery.</p><p>The eventual public page should replace this provisional language with approved capabilities, examples and accurate company information.</p></div>
      </section>
      <section className="company-model" aria-labelledby="company-model-title"><div className="container company-model__layout">
        <div className="company-model__intro"><h2 id="company-model-title">A connected way of working.</h2><p>This illustrative flow shows how creative and technical work may move together. It is not a contractual project process.</p></div>
        <ol className="company-workflow">{workflow.map(([title, description], index) => <li key={title}><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{description}</p></li>)}</ol>
      </div></section>
      <section className="company-disciplines container" aria-labelledby="company-disciplines-title">
        <div className="company-disciplines__intro"><h2 id="company-disciplines-title">Different responsibilities, shared context.</h2><p>The categories below are a provisional taxonomy. They describe broad areas of work and still need owner approval before production use.</p></div>
        <div className="company-disciplines__groups">
          <section aria-labelledby="delivery-disciplines-title"><h3 id="delivery-disciplines-title">Delivery disciplines</h3><ul>{deliveryDisciplines.map((discipline) => <li key={discipline}>{discipline}</li>)}</ul></section>
          <section aria-labelledby="operating-disciplines-title"><h3 id="operating-disciplines-title">Commercial and operating disciplines</h3><ul>{operatingDisciplines.map((discipline) => <li key={discipline}>{discipline}</li>)}</ul></section>
        </div>
      </section>
      <section className="company-parent" aria-labelledby="company-parent-title"><div className="container company-parent__layout"><div className="company-parent__accent" aria-hidden="true" /><div><h2 id="company-parent-title">Part of the MAD Alpha Designers company context.</h2><p>Pyramid Designs is presented here as the Pakistan-focused practice. MAD Alpha Designers provides the parent-company context. Final public wording must confirm the exact relationship.</p></div><a className="text-link" href="https://madalphadesigners.com">Visit MAD Alpha Designers</a></div></section>
      <section className="company-next container" aria-labelledby="company-next-title"><div><h2 id="company-next-title">Continue through the work.</h2><p>Explore the parts of the site that will carry approved examples, working culture and future opportunities.</p></div><nav aria-label="Continue through Pyramid Designs"><Link href="/work">See work</Link><Link href="/culture">Explore culture</Link><Link href="/careers">View careers</Link><Link href="/join">Introduce yourself</Link></nav></section>
    </main>
  );
}

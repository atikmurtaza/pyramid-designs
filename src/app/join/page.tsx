import type { Metadata } from "next";
import Link from "next/link";
import { findCareerJob } from "@/content/careers";
import { JoinFormPrototype } from "@/components/join/JoinFormPrototype";
import "./join.css";

export const metadata: Metadata = { title: "Join", description: "A synthetic visual prototype for a future Pyramid Designs application experience." };

type JoinSearchParameters = Promise<{ job?: string; demo?: string }>;

export default async function JoinPage({ searchParams }: { searchParams: JoinSearchParameters }) {
  const query = await searchParams;
  const job = query.job ? findCareerJob(query.job) : undefined;
  const unavailableJob = Boolean(query.job && !job);
  const initialState = query.demo === "errors" || query.demo === "success" ? query.demo : undefined;

  return <main id="main-content" className="join-page"><section className="join-hero" aria-labelledby="join-title"><div className="container join-hero__layout"><div><p>Join visual prototype. Candidate information is synthetic and local to this browser.</p><h1 id="join-title">Bring your work forward.</h1></div><p>For permanent opportunities, freelance or project collaboration, internships, early-career routes and portfolio introductions.</p></div></section>
    <section className="join-introduction container" aria-labelledby="join-introduction-title"><div><h2 id="join-introduction-title">A considered introduction, not a generic contact form.</h2><p>Choose a current role when there is one, or introduce the work you want to do. This prototype does not create a candidate profile or send information anywhere.</p></div><div className="join-introduction__links"><Link className="text-link" href="/careers">View current opportunities</Link><Link className="text-link" href="/culture">See how we work</Link></div></section>
    {unavailableJob && <section className="join-unavailable container" aria-labelledby="unavailable-title"><p>Job context unavailable</p><h2 id="unavailable-title">That prototype role is not available.</h2><p>The form remains a general introduction. Future production applications must resolve an approved immutable job identifier before a submission can be associated with a role.</p><Link className="text-link" href="/careers">Return to Careers</Link></section>}
    <section className="join-application container" aria-labelledby="application-title"><div className="join-application__heading"><h2 id="application-title">{job ? "Your role context" : "Your introduction"}</h2><p>Required fields are marked with an asterisk. The validation and file states below are local prototype behaviour only.</p></div><JoinFormPrototype job={job} initialState={initialState} /></section>
  </main>;
}

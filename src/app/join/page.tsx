import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { JoinFormPrototype } from "@/components/join/JoinFormPrototype";
import { getIntakeContext, syntheticIntakeEnabled, type IntakeContext } from "@/lib/server/public-intake";
import "./join.css";

export const metadata: Metadata = { title: "Join", description: "Pyramid Designs application intake foundation. Real candidate intake is not open." };
export const dynamic = "force-dynamic";

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const query = await searchParams;
  const requestHeaders = await headers();
  const origin = `http://${requestHeaders.get("host") ?? ""}`;
  let context: IntakeContext | undefined;
  let jobId: string | undefined;
  let unavailable = false;
  if (syntheticIntakeEnabled(origin)) {
    try {
      context = await getIntakeContext();
      if (query.job) {
        const job = context.jobs.find((item) => item.slug === query.job || item.id === query.job);
        if (!job) { unavailable = true; context = undefined; }
        else { jobId = job.id; context = await getIntakeContext(job.id); }
      }
    } catch { context = undefined; unavailable = true; }
  }
  return <main id="main-content" className="join-page">
    <section className="join-hero" aria-labelledby="join-title"><div className="container join-hero__layout"><div><p>Controlled application foundation. Real candidate intake is not open.</p><h1 id="join-title">Bring your work forward.</h1></div><p>For permanent opportunities, freelance or project collaboration, internships, early-career routes and portfolio introductions.</p></div></section>
    <section className="join-introduction container" aria-labelledby="join-introduction-title"><div><h2 id="join-introduction-title">A considered introduction, not a generic contact form.</h2><p>Each application keeps its own information. There are no candidate accounts or reusable profiles. CV and document submission remains unavailable.</p></div><div className="join-introduction__links"><Link className="text-link" href="/careers">View opportunities</Link><Link className="text-link" href="/culture">See how we work</Link></div></section>
    <section className="join-application container" aria-labelledby="application-title"><div className="join-application__heading"><h2 id="application-title">{jobId ? "Your role context" : "Your introduction"}</h2><p>Required fields are marked with an asterisk.</p><Link className="text-link" href="/candidate-privacy">Read the candidate privacy prototype</Link></div>
      {context ? <><nav className="join-intake-opportunities" aria-label="Synthetic application context"><Link className="text-link" href="/join">Talent network test</Link>{context.jobs.map((job) => <Link className="text-link" key={job.id} href={`/join?job=${encodeURIComponent(job.slug)}`}>{job.title}</Link>)}</nav><JoinFormPrototype key={`${jobId ?? "talent"}:${context.consent.id}`} context={context} jobId={jobId} /></>
        : <div className="join-unavailable"><h2>{unavailable ? "This application form is unavailable." : "Applications are not open yet."}</h2><p>No information has been submitted. Controlled synthetic review must be enabled locally before this form can accept test information.</p><Link className="text-link" href="/join">Return to Join</Link></div>}
    </section>
  </main>;
}

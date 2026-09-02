import type { Metadata } from "next";
import Link from "next/link";
import { ContactFormPrototype } from "@/components/contact/ContactFormPrototype";
import "./contact.css";

export const metadata: Metadata = { title: "Contact", description: "Contact Pyramid Designs through a browser-local visual prototype." };
type ContactSearchParameters = Promise<{ demo?: string }>;

export default async function ContactPage({ searchParams }: { searchParams: ContactSearchParameters }) {
  const { demo } = await searchParams;
  const initialState = demo === "errors" || demo === "failure" || demo === "success" ? demo : undefined;
  return <main id="main-content" className="contact-page"><section className="contact-hero"><div className="container contact-hero__layout"><div><p>Contact prototype. Operational contact details require owner approval.</p><h1>Start the right conversation.</h1></div><p>Use this prototype for project, partnership or general company inquiries. It is not a route for job applications.</p></div></section><section className="contact-content container" aria-labelledby="contact-title"><div className="contact-content__heading"><h2 id="contact-title">How can we help?</h2><p>Choose the inquiry type that best fits your message. Contact details, response expectations and the production delivery channel remain unapproved and are intentionally not represented as facts here.</p><aside><h3>Looking to join us?</h3><p>Applications and introductions belong on the candidate route, not this contact form.</p><Link className="text-link" href="/careers">Explore Careers</Link><Link className="text-link" href="/join">Go to Join</Link></aside></div><ContactFormPrototype initialState={initialState} /></section></main>;
}

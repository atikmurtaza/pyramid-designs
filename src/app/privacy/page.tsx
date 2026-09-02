import type { Metadata } from "next";
import { TrustPage, type TrustSection } from "@/components/trust/TrustPage";
import "../trust.css";

export const metadata: Metadata = { title: "Privacy", description: "Provisional Pyramid Designs privacy notice prototype." };
const sections: readonly TrustSection[] = [
  { title: "Scope", paragraphs: ["This is PROVISIONAL COPY for the public-site prototype, not a final privacy notice. It will be replaced after the responsible legal entity, controller wording, jurisdiction and operational contact channel are approved."] },
  { title: "Information categories", paragraphs: ["A future public website may process information that people choose to provide through approved contact or candidate routes, along with limited technical information needed to operate those routes. The exact categories and collection points require owner and legal approval before launch."] },
  { title: "Purposes", paragraphs: ["Any final notice must explain the specific, approved purposes for collecting and using information. This prototype does not state a legal basis, controller role or purpose as settled fact."] },
  { title: "Cookies and analytics", paragraphs: ["The current prototype does not add analytics, marketing technology or a consent banner. Essential cookies may be used only where technically required by a future approved service. A consent mechanism must be assessed before any non-essential analytics or marketing cookies are introduced."] },
  { title: "Service providers", paragraphs: ["The final notice must identify or appropriately describe approved processors and service providers. Provider, subprocessor and international-handling wording remains REQUIRES LEGAL / OWNER APPROVAL."] },
  { title: "Retention", paragraphs: ["Retention periods and deletion practices have not been approved. The production notice must state approved retention information before any route persists personal information."] },
  { title: "Rights and contact", paragraphs: ["Rights wording and the route for privacy requests depend on approved jurisdiction, controller details and contact channels. Do not rely on this prototype for a legal request."] },
  { title: "Changes to this notice", paragraphs: ["A production notice needs approved revision and effective-date treatment. No revision or effective date is asserted by this prototype."] },
];
export default function PrivacyPage() { return <TrustPage title="Privacy" label="Privacy notice prototype — provisional copy" summary="A readable public privacy-notice shell. It deliberately avoids unsupported legal, jurisdictional and controller claims." sections={sections} />; }

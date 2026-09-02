import type { Metadata } from "next";
import { TrustPage, type TrustSection } from "@/components/trust/TrustPage";
import "../trust.css";

export const metadata: Metadata = { title: "Candidate Privacy", description: "Provisional Pyramid Designs candidate privacy notice prototype." };
const sections: readonly TrustSection[] = [
  { title: "Purpose", paragraphs: ["This is PROVISIONAL COPY for a future candidate privacy notice. It describes the boundaries a production recruitment route must address, but it is not a final legal notice or consent record."] },
  { title: "Candidate information", paragraphs: ["A future approved candidate route may receive name, contact information, application responses, CV or document data, and portfolio or professional links. Exact collection must remain limited to the approved recruitment purpose."] },
  { title: "Document handling", paragraphs: ["The production process must explain approved handling for candidate documents without disclosing operational security detail. This prototype does not accept, upload, transmit or store documents."] },
  { title: "Retention", paragraphs: ["Candidate retention periods, deletion process and any legal-hold treatment are unresolved. No duration is stated here and no candidate information is retained by this prototype."] },
  { title: "Review, access and correction", paragraphs: ["The final notice must provide an approved route for candidate privacy requests, including access, correction or deletion where applicable. Contact details and rights wording remain REQUIRES LEGAL / OWNER APPROVAL."] },
  { title: "Processors and international handling", paragraphs: ["The final notice must address approved processors, service-provider roles and any relevant international handling. This prototype intentionally makes no final transfer, subprocessor or jurisdiction claim."] },
  { title: "Security and operational contact", paragraphs: ["Production systems must use proportionate safeguards and an approved contact channel. This public prototype does not describe internal security procedures or provide an unverified contact detail."] },
];
export default function CandidatePrivacyPage() { return <TrustPage title="Candidate Privacy" label="Candidate privacy notice prototype — provisional copy" summary="A future-facing candidate-data notice shell that names the decisions still required before recruitment data can be collected." sections={sections} />; }

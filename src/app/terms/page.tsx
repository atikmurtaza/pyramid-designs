import type { Metadata } from "next";
import { TrustPage, type TrustSection } from "@/components/trust/TrustPage";
import "../trust.css";

export const metadata: Metadata = { title: "Terms", description: "Provisional Pyramid Designs website terms prototype." };
const sections: readonly TrustSection[] = [
  { title: "Website use", paragraphs: ["This is PROVISIONAL COPY for a future website terms page. It is an editorial shell, not a final agreement or jurisdiction-specific legal document."] },
  { title: "Intellectual property", paragraphs: ["The final terms must set out approved wording for Pyramid Designs content, marks, portfolio material and any third-party rights. This prototype does not create or assert a complete rights position."] },
  { title: "Portfolio and content", paragraphs: ["Portfolio and website content require approved publication rights and accurate project context. Future terms must be aligned with those rights and any relevant client or contributor permissions."] },
  { title: "Acceptable use", paragraphs: ["A final terms page may explain acceptable use of the website and its services. Specific restrictions remain subject to legal and owner approval."] },
  { title: "External links", paragraphs: ["The website may link to external services or social platforms. Final wording must be reviewed before describing responsibility for third-party sites or content."] },
  { title: "Disclaimers and limitation", paragraphs: ["Disclaimer and limitation language is REQUIRES LEGAL / OWNER APPROVAL. This prototype does not state a legal limitation or warranty position."] },
  { title: "Governing law and contact", paragraphs: ["Jurisdiction, governing law and operational contact details are unresolved. They must not be inferred from this prototype."] },
];
export default function TermsPage() { return <TrustPage title="Terms" label="Website terms prototype — provisional copy" summary="A restrained terms-page structure that holds space for approved wording without fabricating jurisdiction-specific clauses." sections={sections} />; }

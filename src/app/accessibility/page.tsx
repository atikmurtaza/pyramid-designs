import type { Metadata } from "next";
import { TrustPage, type TrustSection } from "@/components/trust/TrustPage";
import "../trust.css";

export const metadata: Metadata = { title: "Accessibility", description: "Pyramid Designs accessibility statement prototype." };
const sections: readonly TrustSection[] = [
  { title: "Our approach", paragraphs: ["Pyramid Designs aims to make this website usable by as many people as possible. This is a PROVISIONAL accessibility-statement prototype and does not claim perfect compliance or certification."] },
  { title: "Accessibility commitments", paragraphs: ["The current website foundation is designed against WCAG 2.2 AA requirements. It uses semantic page structure, visible focus treatment, responsive layouts and accessible form patterns as implementation targets."], items: ["Clear labels and field-level error messaging for forms.", "Captions or transcripts for production media where relevant.", "Keyboard-operable navigation and readable content measures."] },
  { title: "Known limits and ongoing work", paragraphs: ["Accessibility should be checked as content, media and services are added. The production site must not treat automated checks or a prototype review as proof of complete accessibility."] },
  { title: "Accessibility feedback", paragraphs: ["An approved accessibility contact route has not yet been supplied. This prototype intentionally does not invent one. The production statement must provide a verified way to report accessibility barriers."] },
  { title: "Statement status", paragraphs: ["Revision and effective dates require owner approval. This prototype does not publish a final status, date or certification claim."] },
];
export default function AccessibilityPage() { return <TrustPage title="Accessibility" label="Accessibility statement prototype — provisional copy" summary="A factual, limited statement of the accessibility commitments already guiding the website foundation." sections={sections} />; }

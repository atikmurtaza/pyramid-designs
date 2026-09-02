export type CareerJob = {
  slug: string;
  title: string;
  department: string;
  location: string;
  arrangement: "On-site" | "Hybrid" | "Remote";
  employmentType: string;
  experienceLevel: string;
  schedule: string;
  closingDate: string;
  summary: string;
  purpose: string;
  responsibilities: readonly string[];
  requiredQualifications: readonly string[];
  preferredQualifications: readonly string[];
};

// Synthetic prototype content only. Replace every value before any production publishing.
export const careerJobs = [
  {
    slug: "senior-brand-systems-designer",
    title: "Senior Brand Systems Designer",
    department: "Design",
    location: "Studio location to confirm",
    arrangement: "Hybrid",
    employmentType: "Full-time placeholder",
    experienceLevel: "Senior",
    schedule: "Weekday schedule placeholder",
    closingDate: "30 September 2026",
    summary: "Shape identity systems that can hold up across print, digital and the small decisions in between.",
    purpose: "This synthetic role tests a senior design brief with a broad remit across identity, visual systems and cross-discipline review.",
    responsibilities: [
      "Turn early briefs into clear visual directions, then make the choices legible to people outside the design discipline.",
      "Develop identity systems with practical rules for digital, print and future campaign work.",
      "Bring work into critique early, document key decisions and refine the system with adjacent disciplines.",
      "Support more junior contributors through constructive review and specific craft feedback.",
    ],
    requiredQualifications: [
      "A portfolio showing identity and visual-system work with enough process to explain the decisions.",
      "Comfort moving between exploratory thinking and the production details that make a system usable.",
      "Clear written and verbal communication in a multidisciplinary working setting.",
    ],
    preferredQualifications: [
      "Experience collaborating with developers, engineers or content specialists.",
      "Experience preparing work for more than one channel or format.",
    ],
  },
  {
    slug: "front-end-developer-design-systems",
    title: "Front-end Developer, Design Systems and Interfaces",
    department: "Development",
    location: "Studio location to confirm",
    arrangement: "Hybrid",
    employmentType: "Full-time placeholder",
    experienceLevel: "Mid-level",
    schedule: "Weekday schedule placeholder",
    closingDate: "7 October 2026",
    summary: "Build accessible, resilient interfaces from shared design decisions and useful technical constraints.",
    purpose: "This synthetic role tests a long technical title, detailed responsibilities and a front-end route through the careers prototype.",
    responsibilities: [
      "Translate approved interface directions into responsive, accessible front-end work.",
      "Contribute to small reusable patterns where repetition is genuine, not speculative.",
      "Raise technical constraints early and work through trade-offs with design and project colleagues.",
      "Review interface quality across browsers and common viewport sizes before handover.",
    ],
    requiredQualifications: [
      "Examples of shipped responsive interface work with accessible semantics and clear interaction states.",
      "Working knowledge of modern HTML, CSS and JavaScript or TypeScript.",
      "Ability to explain implementation choices without treating technical language as a barrier.",
    ],
    preferredQualifications: [
      "Experience with a server-rendered React framework.",
      "Interest in performance, inclusive design and maintainable interface systems.",
    ],
  },
  {
    slug: "project-engineering-coordinator",
    title: "Project Engineering Coordinator",
    department: "Engineering",
    location: "Location to confirm",
    arrangement: "On-site",
    employmentType: "Full-time placeholder",
    experienceLevel: "Early career",
    schedule: "Shift pattern to confirm",
    closingDate: "14 October 2026",
    summary: "Help practical questions, dependencies and technical decisions stay visible as projects move forward.",
    purpose: "This synthetic role tests an early-career engineering path without making claims about a real programme or vacancy.",
    responsibilities: [
      "Keep project information organised so technical questions reach the right people at the right time.",
      "Support meeting preparation, decision records and follow-up actions for active project work.",
      "Learn the constraints around materials, delivery and technical review through supervised project exposure.",
    ],
    requiredQualifications: [
      "Care with detail, follow-through and communicating questions before they become blockers.",
      "Interest in applied problem-solving and working alongside different disciplines.",
    ],
    preferredQualifications: [
      "Relevant study, placement or project experience.",
      "Confidence working with structured documents and practical checklists.",
    ],
  },
  {
    slug: "content-and-campaign-associate",
    title: "Content and Campaign Associate",
    department: "Marketing and content",
    location: "Remote location to confirm",
    arrangement: "Remote",
    employmentType: "Project-based placeholder",
    experienceLevel: "Mid-level",
    schedule: "Project schedule placeholder",
    closingDate: "21 October 2026",
    summary: "Bring clarity and useful structure to campaign content, project stories and the work around them.",
    purpose: "This synthetic role tests a project-based content position and a compensation-not-published presentation.",
    responsibilities: [
      "Develop content directions from project material, with accuracy and audience needs held together.",
      "Work with design and delivery colleagues to turn approved information into useful campaign assets.",
      "Maintain a clear review trail so copy changes and approvals can be understood later.",
    ],
    requiredQualifications: [
      "Examples of concise, audience-aware content work.",
      "Ability to ask useful questions when source information is incomplete.",
      "Confidence collaborating through drafts, review and revision.",
    ],
    preferredQualifications: [
      "Experience working with creative or technical project teams.",
      "Familiarity with content planning for more than one channel.",
    ],
  },
] as const satisfies readonly CareerJob[];

export const careerDepartments = [...new Set(careerJobs.map((job) => job.department))];
export const careerArrangements = [...new Set(careerJobs.map((job) => job.arrangement))];

export function findCareerJob(slug: string) {
  return careerJobs.find((job) => job.slug === slug);
}

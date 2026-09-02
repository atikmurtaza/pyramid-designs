import type { Metadata } from "next";
import Link from "next/link";
import { careerArrangements, careerDepartments, careerJobs } from "@/content/careers";
import "./careers.css";

export const metadata: Metadata = {
  title: "Careers",
  description: "A synthetic visual prototype for future Pyramid Designs Careers content.",
};

type SearchParameters = Promise<{ department?: string; arrangement?: string; view?: string }>;

function JobMeta({ job }: { job: (typeof careerJobs)[number] }) {
  return <ul className="careers-job__meta" aria-label={`Details for ${job.title}`}>
    <li>{job.department}</li><li>{job.location}</li><li>{job.arrangement}</li><li>{job.employmentType}</li><li>{job.experienceLevel}</li><li>Closes {job.closingDate}</li>
  </ul>;
}

export default async function CareersPage({ searchParams }: { searchParams: SearchParameters }) {
  const query = await searchParams;
  const selectedDepartment = careerDepartments.includes(query.department as (typeof careerDepartments)[number]) ? query.department : "";
  const selectedArrangement = careerArrangements.includes(query.arrangement as (typeof careerArrangements)[number]) ? query.arrangement : "";
  const showNoVacancies = query.view === "none";
  const filteredJobs = showNoVacancies ? [] : careerJobs.filter((job) => (!selectedDepartment || job.department === selectedDepartment) && (!selectedArrangement || job.arrangement === selectedArrangement));
  const hasFilters = Boolean(selectedDepartment || selectedArrangement);

  return <main id="main-content" className="careers-page">
    <section className="careers-hero" aria-labelledby="careers-title">
      <div className="container careers-hero__layout">
        <div>
          <p className="careers-hero__notice">Careers visual prototype. All vacancy content is synthetic.</p>
          <h1 id="careers-title">Make work that holds together.</h1>
        </div>
        <p className="careers-hero__support">A future space for current roles, early-career routes and project collaborations.</p>
      </div>
    </section>

    <section className="careers-openings container" aria-labelledby="openings-title">
      <div className="careers-openings__header">
        <div><h2 id="openings-title">Current opportunities</h2><p>These roles test the presentation only. They are not published Pyramid Designs vacancies.</p></div>
        <Link className="careers-openings__empty-link" href="/careers?view=none">View no-vacancy state</Link>
      </div>

      <details className="careers-filters" open>
        <summary>Filter opportunities</summary>
        <form method="get" className="careers-filters__form">
          <div className="careers-filters__field"><label htmlFor="department">Department</label><select id="department" name="department" defaultValue={selectedDepartment}><option value="">All departments</option>{careerDepartments.map((department) => <option value={department} key={department}>{department}</option>)}</select></div>
          <div className="careers-filters__field"><label htmlFor="arrangement">Work arrangement</label><select id="arrangement" name="arrangement" defaultValue={selectedArrangement}><option value="">All arrangements</option>{careerArrangements.map((arrangement) => <option value={arrangement} key={arrangement}>{arrangement}</option>)}</select></div>
          <div className="careers-filters__actions"><button className="button button-primary" type="submit">Apply filters</button>{hasFilters && <Link className="text-link" href="/careers">Clear filters</Link>}</div>
        </form>
      </details>

      {filteredJobs.length > 0 ? <ol className="careers-jobs">{filteredJobs.map((job, index) => <li className={`careers-job careers-job--${index + 1}`} key={job.slug}><article><div className="careers-job__number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</div><div className="careers-job__content"><h3><Link href={`/careers/${job.slug}`}>{job.title}</Link></h3><p>{job.summary}</p><JobMeta job={job} /></div><Link className="careers-job__action" href={`/careers/${job.slug}`}>View role<span aria-hidden="true">↗</span></Link></article></li>)}</ol> : <section className="careers-empty-state" aria-labelledby="empty-title"><p>Opportunity update</p><h2 id="empty-title">{showNoVacancies ? "No current openings are published." : "No prototype roles match those filters."}</h2><p>{showNoVacancies ? "The production Careers page should remain useful here: introduce yourself for future permanent, freelance, project and early-career conversations." : "Try a different department or work arrangement, or clear the filters to view all synthetic roles."}</p><div><Link className="button button-primary" href="/join">Introduce yourself</Link>{hasFilters && <Link className="text-link" href="/careers">Clear filters</Link>}</div></section>}
    </section>

    <section className="careers-process" aria-labelledby="process-title"><div className="container careers-process__layout"><div><h2 id="process-title">A clear, provisional process.</h2><p>Future production copy should explain the real sequence with no promises of response, outcome or timing.</p></div><ol><li><strong>Application review</strong><span>We check the information against the role or general introduction route.</span></li><li><strong>Short conversation</strong><span>A practical conversation about fit, context and questions.</span></li><li><strong>Role-specific review</strong><span>A focused review or interview, shaped by the work.</span></li></ol></div></section>

    <section className="careers-bridge container" aria-labelledby="bridge-title"><div><h2 id="bridge-title">Not ready for a listed role?</h2><p>A general introduction route can later support permanent interest, freelance or project collaboration, internships and early-career portfolios. It is not an application form in this prototype.</p></div><div className="careers-bridge__actions"><Link className="button button-primary" href="/join">Introduce yourself</Link><Link className="text-link" href="/culture">See how we work</Link></div></section>
  </main>;
}

"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import type { CareerJob } from "@/content/careers";

type FieldName = "fullName" | "email" | "professionalFocus" | "discipline" | "introduction" | "portfolioUrl" | "document" | "acknowledgement";
type Errors = Partial<Record<FieldName, string>>;

type JoinFormPrototypeProps = {
  job?: CareerJob;
  initialState?: "errors" | "success";
};

const initialErrors: Errors = {
  fullName: "Enter your full name.",
  email: "Enter an email address in the correct format.",
  portfolioUrl: "Enter a complete portfolio URL, including https://.",
  document: "Choose a PDF no larger than 5 MB.",
};

function isValidUrl(value: string) {
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}

export function JoinFormPrototype({ job, initialState }: JoinFormPrototypeProps) {
  const [errors, setErrors] = useState<Errors>(initialState === "errors" ? initialErrors : {});
  const [submitted, setSubmitted] = useState(initialState === "success");
  const [fileMessage, setFileMessage] = useState("No file selected. PDF only, maximum 5 MB.");
  const errorSummary = useRef<HTMLDivElement>(null);

  useEffect(() => { if (Object.keys(errors).length) errorSummary.current?.focus(); }, [errors]);

  function validate(form: HTMLFormElement) {
    const data = new FormData(form);
    const next: Errors = {};
    const requiredFields: Array<[FieldName, string]> = [["fullName", "Enter your full name."], ["email", "Enter an email address."], ["professionalFocus", "Describe your current or most recent professional focus."], ["discipline", "Choose a relevant discipline."], ["introduction", "Add a short introduction."]];
    for (const [field, message] of requiredFields) if (!String(data.get(field) ?? "").trim()) next[field] = message;
    const email = String(data.get("email") ?? "").trim();
    if (email && !/^\S+@\S+\.\S+$/.test(email)) next.email = "Enter an email address in the correct format.";
    const portfolioUrl = String(data.get("portfolioUrl") ?? "").trim();
    if (portfolioUrl && !isValidUrl(portfolioUrl)) next.portfolioUrl = "Enter a complete portfolio URL, including https://.";
    if (!data.get("acknowledgement")) next.acknowledgement = "Confirm that you understand this is a prototype before continuing.";
    return next;
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(event.currentTarget);
    setErrors(nextErrors);
    setSubmitted(Object.keys(nextErrors).length === 0);
  }

  function selectDocument(file: File | undefined) {
    if (!file) { setFileMessage("No file selected. PDF only, maximum 5 MB."); return; }
    if (file.type !== "application/pdf") { setFileMessage("Choose a PDF. This prototype does not upload or inspect files."); return; }
    if (file.size > 5 * 1024 * 1024) { setFileMessage("Choose a PDF no larger than 5 MB. This prototype does not upload or inspect files."); return; }
    setFileMessage(`${file.name} selected locally. It has not been uploaded, stored or security-reviewed.`);
  }

  if (submitted) return <section className="join-success" aria-labelledby="join-success-title" aria-live="polite"><p>Prototype success state</p><h2 id="join-success-title">Your information would be received by the future production service.</h2><p>Prototype reference: PD-APPLICATION-EXAMPLE. This does not confirm a response, interview or employment, and no information has been sent from this prototype.</p><Link className="button button-primary" href="/careers">Return to Careers</Link></section>;

  return <form className="join-form" noValidate onSubmit={submit} aria-describedby="join-form-boundary">
    <p id="join-form-boundary" className="join-form__boundary">This form runs entirely in your browser for visual review. It does not send, store or upload candidate information.</p>
    {Object.keys(errors).length > 0 && <div className="join-error-summary" ref={errorSummary} tabIndex={-1} role="alert" aria-labelledby="join-errors-title"><h2 id="join-errors-title">Check the information below</h2><ul>{Object.entries(errors).map(([field, message]) => <li key={field}><a href={`#${field}`}>{message}</a></li>)}</ul></div>}

    <fieldset><legend>About you</legend><div className="join-form__grid"><div className="join-form__field"><label htmlFor="fullName">Full name <span aria-hidden="true">*</span></label><input id="fullName" name="fullName" autoComplete="name" aria-invalid={Boolean(errors.fullName)} aria-describedby={errors.fullName ? "fullName-error" : undefined} />{errors.fullName && <p id="fullName-error" className="join-field-error">{errors.fullName}</p>}</div><div className="join-form__field"><label htmlFor="email">Email <span aria-hidden="true">*</span></label><input id="email" name="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} />{errors.email && <p id="email-error" className="join-field-error">{errors.email}</p>}</div><div className="join-form__field"><label htmlFor="phone">Phone <span className="join-form__optional">Optional</span></label><input id="phone" name="phone" type="tel" autoComplete="tel" /></div><div className="join-form__field"><label htmlFor="location">City or location <span className="join-form__optional">Optional</span></label><input id="location" name="location" autoComplete="address-level2" /></div></div></fieldset>

    <fieldset><legend>{job ? "Application context" : "How would you like to introduce yourself?"}</legend>{job ? <div className="join-job-context"><p>Applying for synthetic prototype role</p><h2>{job.title}</h2><dl><div><dt>Department</dt><dd>{job.department}</dd></div><div><dt>Arrangement</dt><dd>{job.arrangement}</dd></div></dl><input type="hidden" name="jobSlug" value={job.slug} /></div> : <div className="join-choices"><label><input type="radio" name="engagement" value="permanent" defaultChecked />Permanent opportunities</label><label><input type="radio" name="engagement" value="freelance" />Freelance or project collaboration</label><label><input type="radio" name="engagement" value="early-career" />Internship or early-career</label><label><input type="radio" name="engagement" value="portfolio" />Portfolio introduction</label></div>}</fieldset>

    <fieldset><legend>Professional information</legend><div className="join-form__grid"><div className="join-form__field join-form__field--wide"><label htmlFor="professionalFocus">Current or most recent professional focus <span aria-hidden="true">*</span></label><input id="professionalFocus" name="professionalFocus" aria-invalid={Boolean(errors.professionalFocus)} aria-describedby={errors.professionalFocus ? "professionalFocus-error" : undefined} />{errors.professionalFocus && <p id="professionalFocus-error" className="join-field-error">{errors.professionalFocus}</p>}</div><div className="join-form__field"><label htmlFor="discipline">Relevant discipline <span aria-hidden="true">*</span></label><select id="discipline" name="discipline" defaultValue="" aria-invalid={Boolean(errors.discipline)} aria-describedby={errors.discipline ? "discipline-error" : undefined}><option value="" disabled>Choose a discipline</option><option>Design</option><option>Development</option><option>Engineering</option><option>Marketing and content</option><option>Sales</option><option>Operations and project functions</option></select>{errors.discipline && <p id="discipline-error" className="join-field-error">{errors.discipline}</p>}</div><div className="join-form__field"><label htmlFor="experience">Experience level <span className="join-form__optional">Optional</span></label><select id="experience" name="experience" defaultValue=""><option value="">Select if useful</option><option>Early career</option><option>Mid-level</option><option>Senior</option><option>Independent specialist</option></select></div><div className="join-form__field join-form__field--wide"><label htmlFor="introduction">Short introduction <span aria-hidden="true">*</span></label><textarea id="introduction" name="introduction" rows={5} aria-invalid={Boolean(errors.introduction)} aria-describedby={errors.introduction ? "introduction-error" : undefined} />{errors.introduction && <p id="introduction-error" className="join-field-error">{errors.introduction}</p>}</div></div></fieldset>

    <fieldset><legend>Portfolio and document</legend><div className="join-form__grid"><div className="join-form__field"><label htmlFor="portfolioUrl">Portfolio URL <span className="join-form__optional">Optional</span></label><input id="portfolioUrl" name="portfolioUrl" type="url" inputMode="url" placeholder="https://" aria-invalid={Boolean(errors.portfolioUrl)} aria-describedby={errors.portfolioUrl ? "portfolioUrl-error" : undefined} />{errors.portfolioUrl && <p id="portfolioUrl-error" className="join-field-error">{errors.portfolioUrl}</p>}</div><div className="join-form__field"><label htmlFor="profileUrl">LinkedIn or professional profile <span className="join-form__optional">Optional</span></label><input id="profileUrl" name="profileUrl" type="url" inputMode="url" placeholder="https://" /></div><div className="join-form__field join-form__field--wide"><label htmlFor="document">CV or relevant PDF <span className="join-form__optional">Optional prototype</span></label><input id="document" name="document" type="file" accept="application/pdf,.pdf" onChange={(event) => selectDocument(event.currentTarget.files?.[0])} aria-describedby="document-help" /><p id="document-help" className="join-form__help">{fileMessage}</p>{errors.document && <p className="join-field-error">{errors.document}</p>}</div></div></fieldset>

    <fieldset className="join-form__acknowledgement"><legend>Prototype notice</legend><label><input id="acknowledgement" name="acknowledgement" type="checkbox" aria-invalid={Boolean(errors.acknowledgement)} aria-describedby={errors.acknowledgement ? "acknowledgement-error" : undefined} />I understand that this is a non-submitting visual prototype and not a legal privacy or consent notice.</label>{errors.acknowledgement && <p id="acknowledgement-error" className="join-field-error">{errors.acknowledgement}</p>}<p>Production implementation needs approved privacy, lawful-processing and retention information. Optional talent-network consent must remain separate from a job application.</p></fieldset>

    <div className="join-form__actions"><button className="button button-primary" type="submit">Review prototype submission</button><a className="text-link" href="/join?demo=errors">View validation state</a><a className="text-link" href="/join?demo=success">View success state</a></div>
  </form>;
}

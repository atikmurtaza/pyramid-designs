"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { IntakeContext } from "@/lib/server/public-intake";
import { IntakeChallenge } from "./IntakeChallenge";

export function JoinFormPrototype({ context, jobId, fileUploadAvailable, challengeSiteKey, nonce }: { context: IntakeContext; jobId?: string; fileUploadAvailable: boolean; challengeSiteKey?: string; nonce?: string }) {
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedFile, setSubmittedFile] = useState(false);
  const [selectedFilename, setSelectedFilename] = useState("");
  const [error, setError] = useState<{ field?: string; message: string }>();
  const busy = useRef(false);
  const key = useRef<string | undefined>(undefined);
  const summary = useRef<HTMLDivElement>(null);
  const success = useRef<HTMLElement>(null);
  const challengeToken = useRef("");
  const [challengeReady, setChallengeReady] = useState(false);
  const [challengeReset, setChallengeReset] = useState(0);
  const onChallengeToken = useCallback((token: string) => {
    challengeToken.current = token; setChallengeReady(Boolean(token));
  }, []);
  useEffect(() => {
    if (submitted) success.current?.focus();
    else if (error) summary.current?.focus();
  }, [submitted, error]);
  const job = context.jobs.find((item) => item.id === jobId);
  const errorProps = (field: string) => ({
    "aria-invalid": error?.field === field || undefined,
    "aria-describedby": error?.field === field ? "intake-error" : undefined,
  });
  const field = (name: string, label: string, maxLength: number, required = false, type = "text", autoComplete?: string) => (
    <div className="join-form__field" key={name}>
      <label htmlFor={name}>{label} {required ? <span aria-hidden="true">*</span> : <span className="join-form__optional">Optional</span>}</label>
      <input id={name} name={name} type={type} required={required} maxLength={maxLength} autoComplete={autoComplete} {...errorProps(name)} />
    </div>
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    if (!challengeToken.current) {
      setError({ field: "intake-challenge", message: "Complete a fresh security check before submitting." }); return;
    }
    const formData = new FormData(form);
    formData.set("cf-turnstile-response", challengeToken.current);
    onChallengeToken("");
    key.current ??= crypto.randomUUID();
    formData.set("idempotencyKey", key.current);
    const data = new URLSearchParams();
    if (!fileUploadAvailable) for (const [name, value] of formData) if (typeof value === "string") data.append(name, value);
    busy.current = true; setPending(true); setError(undefined);
    try {
      const response = await fetch("/api/applications", { method: "POST", body: fileUploadAvailable ? formData : data, credentials: "same-origin", cache: "no-store" });
      const result = await response.json();
      if (response.ok && result.ok === true) {
        setSubmittedFile(fileUploadAvailable); setSubmitted(true);
      } else {
        setError({ field: typeof result.field === "string" ? result.field : undefined, message: typeof result.message === "string" ? result.message : "Submission could not be completed." });
      }
    } catch {
      setError({ message: "The result could not be confirmed. Retry this form to safely check the same submission." });
    } finally {
      formData.delete("cf-turnstile-response"); data.delete("cf-turnstile-response");
      onChallengeToken(""); setChallengeReset(value => value + 1);
      busy.current = false; setPending(false);
    }
  }

  if (submitted) return <section className="join-success" ref={success} tabIndex={-1} aria-labelledby="join-success-title" aria-live="polite">
    <p>Synthetic submission complete</p><h2 id="join-success-title">Your synthetic application was received.</h2>
    <p>{submittedFile ? "The synthetic PDF is stored in private quarantine and remains untrusted until an authorized security review clears its exact content." : "No CV or file was submitted."} This test does not represent a real application, interview or employment decision.</p>
    <Link className="button button-primary" href="/careers">Return to Careers</Link>
  </section>;

  return <form className="join-form" method="post" action="/api/applications" encType={fileUploadAvailable ? "multipart/form-data" : undefined} onSubmit={submit} aria-describedby="join-form-boundary" aria-busy={pending}>
    <p id="join-form-boundary" className="join-form__boundary">Controlled synthetic review only. Use a name beginning “Synthetic ” and an email at example.invalid. This form saves synthetic information to the development service. Do not enter real candidate information.</p>
    {error && <div className="join-error-summary" ref={summary} tabIndex={-1} role="alert" aria-labelledby="join-errors-title">
      <h2 id="join-errors-title">Check your submission</h2><p id="intake-error">{error.message}</p>
      {error.field && error.field !== "form" && <a className="text-link" href={`#${error.field}`}>Review the field</a>}
    </div>}
    <input type="hidden" name="applicationType" value={job ? "JOB_APPLICATION" : "TALENT_NETWORK"} />
    <input type="hidden" name="consentDefinitionId" value={context.consent.id} />
    {job && <input type="hidden" name="jobId" value={job.id} />}
    <fieldset disabled={pending}><legend>About you</legend><div className="join-form__grid">
      {field("fullName", "Full name", 160, true, "text", "off")}
      {field("email", "Email", 320, true, "email", "off")}
      {field("phoneOrWhatsApp", "Phone", 40, false, "tel", "off")}
      {field("city", "City or location", 120, true, "text", "off")}
    </div></fieldset>
    <fieldset disabled={pending}><legend>{job ? "Selected opportunity" : "How would you like to work with us?"}</legend>
      {job ? <div className="join-job-context"><p>Synthetic role</p><h2>{job.title}</h2></div> : <>
        <div className="join-form__field"><label htmlFor="engagementType">Engagement <span aria-hidden="true">*</span></label>
          <select id="engagementType" name="engagementType" defaultValue="" required {...errorProps("engagementType")}>
            <option value="">Choose an engagement</option><option value="PERMANENT_INTEREST">Permanent opportunities</option>
            <option value="FREELANCE_PROJECT">Freelance or project collaboration</option><option value="INTERNSHIP_EARLY_CAREER">Internship or early career</option>
            <option value="PORTFOLIO_INTRODUCTION">Portfolio introduction</option>
          </select>
        </div>
        <div className="join-form__field"><label htmlFor="departmentId">Department <span aria-hidden="true">*</span></label>
          <select id="departmentId" name="departmentId" defaultValue="" required {...errorProps("departmentId")}><option value="">Choose a department</option>
            {context.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
          </select>
        </div>
      </>}
    </fieldset>
    <fieldset disabled={pending}><legend>Professional information</legend><div className="join-form__grid">
      {field("experienceLevel", "Experience level", 40, true)}
      {field("portfolioUrl", "Portfolio URL", 500, false, "url")}
      {field("professionalUrl", "Professional profile URL", 500, false, "url")}
      <div className="join-form__field join-form__field--wide"><label htmlFor="shortIntroduction">Short introduction <span className="join-form__optional">Optional</span></label>
        <textarea id="shortIntroduction" name="shortIntroduction" rows={5} maxLength={2000} {...errorProps("shortIntroduction")} /></div>
    </div><p className="join-form__help">Use complete HTTPS URLs. A portfolio introduction requires a portfolio or professional profile URL.</p></fieldset>
    {context.questions.length > 0 && <fieldset disabled={pending}><legend>Role questions</legend>{context.questions.map((question) => {
      const name = `answer.${question.id}`;
      return <div className="join-form__field" key={question.id}><label htmlFor={name}>{question.prompt} {question.required ? <span aria-hidden="true">*</span> : <span className="join-form__optional">Optional</span>}</label>
        {question.questionType === "SELECT" || question.questionType === "YES_NO" ? <select id={name} name={name} defaultValue="" required={question.required} {...errorProps(name)}>
          <option value="">Choose an answer</option>{question.questionType === "YES_NO" ? <><option value="yes">Yes</option><option value="no">No</option></> : question.options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select> : question.questionType === "LONG_TEXT" ? <textarea id={name} name={name} maxLength={4000} required={question.required} {...errorProps(name)} />
          : <input id={name} name={name} maxLength={500} required={question.required} {...errorProps(name)} />}
      </div>;
    })}</fieldset>}
    <fieldset disabled={pending}><legend>CV and documents</legend>{fileUploadAvailable ? <div className="join-form__field">
      <label htmlFor="cv">CV in PDF format <span aria-hidden="true">*</span></label>
      <input id="cv" name="cv" type="file" accept=".pdf,application/pdf" required
        aria-invalid={error?.field === "cv" || undefined}
        aria-describedby={error?.field === "cv" ? "cv-help cv-selected intake-error" : "cv-help cv-selected"}
        onChange={(event) => setSelectedFilename(event.currentTarget.files?.[0]?.name ?? "")} />
      <p id="cv-help" className="join-form__help">PDF only, maximum 5 MiB. Upload stores the file in private quarantine; it does not mean the file is safe or cleared.</p>
      <p id="cv-selected" className="join-form__file-name" aria-live="polite">{selectedFilename ? `Selected: ${selectedFilename}` : "No file selected."}</p>
    </div> : <p className="join-form__help">File submission is unavailable until private storage is configured. This file-free flow sends no CV or document.</p>}</fieldset>
    <fieldset disabled={pending} className="join-form__acknowledgement"><legend>Synthetic consent evidence</legend>
      <p>{context.consent.contentText}</p>
      <label><input id="consent" name="consent" type="checkbox" value="accepted" required {...errorProps("consent")} />Record acceptance of the displayed synthetic consent fixture for this test.</label>
      <p>Final privacy wording and purpose-specific retention remain approval gates before real intake.</p>
    </fieldset>
    <IntakeChallenge siteKey={challengeSiteKey} nonce={nonce} resetKey={challengeReset} pending={pending} error={error?.field === "intake-challenge"} onToken={onChallengeToken} />
    <div className="join-form__actions"><button className="button button-primary" type="submit" disabled={pending || !challengeReady} aria-describedby="intake-challenge-status">{pending ? (fileUploadAvailable ? "Uploading…" : "Submitting…") : "Submit synthetic application"}</button><span role="status" aria-live="polite">{pending ? (fileUploadAvailable ? "Please wait. Your PDF is being validated and stored in quarantine." : "Please wait. Your submission is being processed.") : ""}</span></div>
  </form>;
}

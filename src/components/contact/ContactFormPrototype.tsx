"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { SelectField, Textarea, TextField } from "@/components/ui/FormFields";

type FieldName = "name" | "email" | "inquiryType" | "message";
type Errors = Partial<Record<FieldName, string>>;
type ContactFormPrototypeProps = { initialState?: "errors" | "failure" | "success" };

export function ContactFormPrototype({ initialState }: ContactFormPrototypeProps) {
  const [errors, setErrors] = useState<Errors>(initialState === "errors" ? { name: "Enter your name.", email: "Enter an email address in the correct format.", inquiryType: "Choose an inquiry type.", message: "Add a short message." } : {});
  const [state, setState] = useState<"form" | "failure" | "success">(initialState === "failure" || initialState === "success" ? initialState : "form");
  const summary = useRef<HTMLDivElement>(null);

  useEffect(() => { if (Object.keys(errors).length) summary.current?.focus(); }, [errors]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next: Errors = {};
    if (!String(data.get("name") ?? "").trim()) next.name = "Enter your name.";
    const email = String(data.get("email") ?? "").trim();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) next.email = "Enter an email address in the correct format.";
    if (!String(data.get("inquiryType") ?? "").trim()) next.inquiryType = "Choose an inquiry type.";
    if (!String(data.get("message") ?? "").trim()) next.message = "Add a short message.";
    setErrors(next);
    if (!Object.keys(next).length) setState("success");
  }

  if (state !== "form") return <section className={`contact-form-state contact-form-state--${state}`} aria-live="polite" aria-labelledby="contact-state-title"><p>{state === "success" ? "Prototype success state" : "Prototype failure state"}</p><h2 id="contact-state-title">{state === "success" ? "This contact request has not been sent." : "This contact request could not be sent."}</h2><p>{state === "success" ? "This browser-local prototype does not email, store or transmit your information. A future production contact route needs an approved operational channel before it can accept messages." : "This presentation is a visual prototype only. No submission was attempted and no information left this browser."}</p><button className="button button-secondary" type="button" onClick={() => { setState("form"); setErrors({}); }}>Return to the prototype form</button></section>;

  return <form className="contact-form" noValidate onSubmit={submit} aria-describedby="contact-form-boundary">
    <p id="contact-form-boundary" className="contact-form__boundary">This form is a browser-local visual prototype. It does not send, store or transmit personal information.</p>
    {Object.keys(errors).length > 0 && <div className="contact-error-summary" ref={summary} tabIndex={-1} role="alert" aria-labelledby="contact-errors-title"><h2 id="contact-errors-title">Check the highlighted fields</h2><ul>{Object.entries(errors).map(([field, message]) => <li key={field}><a href={`#${field}`}>{message}</a></li>)}</ul></div>}
    <div className="contact-form__grid"><TextField id="name" name="name" label="Name" autoComplete="name" required error={errors.name} /><TextField id="email" name="email" label="Email" type="email" autoComplete="email" required error={errors.email} /><TextField id="company" name="company" label="Company or organisation" autoComplete="organization" helperText="Optional" /><SelectField id="inquiryType" name="inquiryType" label="Inquiry type" required error={errors.inquiryType} defaultValue="" options={["", "Project inquiry", "Partnership", "General inquiry"]} /><Textarea id="message" name="message" label="Short message" rows={6} required error={errors.message} /></div>
    <div className="contact-form__actions"><button className="button button-primary" type="submit">Review prototype submission</button><a className="text-link" href="/contact?demo=errors">View validation state</a><a className="text-link" href="/contact?demo=failure">View failure state</a><a className="text-link" href="/contact?demo=success">View success state</a></div>
  </form>;
}

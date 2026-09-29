"use client";

import { useEffect, useRef, useState } from "react";

type Turnstile = {
  render(container: HTMLElement, options: Record<string, unknown>): string | undefined;
  remove(id: string): void;
};
declare global { interface Window { turnstile?: Turnstile } }

let loading: Promise<Turnstile> | undefined;
function loadWidget(nonce?: string) {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement("script");
    const fail = () => { clearTimeout(timer); script.remove(); loading = undefined; reject(new Error("Verification unavailable.")); };
    const timer = setTimeout(fail, 15_000);
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    if (nonce) script.nonce = nonce;
    script.onerror = fail;
    script.onload = () => {
      const api = window.turnstile;
      if (!api) { fail(); return; }
      clearTimeout(timer); resolve(api);
    };
    document.head.append(script);
  });
  return loading;
}

export function IntakeChallenge({ siteKey, nonce, resetKey, pending, error, onToken }: {
  siteKey?: string; nonce?: string; resetKey: number; pending: boolean; error: boolean; onToken: (token: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState("Loading the security check…");
  useEffect(() => {
    let disposed = false;
    let widget: string | undefined;
    let api: Turnstile | undefined;
    onToken("");
    const unavailable = () => {
      if (disposed) return;
      onToken(""); setStatus("Security check unavailable or expired. Choose Retry security check.");
    };
    if (siteKey && container.current) {
      void loadWidget(nonce).then((loaded) => {
        if (disposed || !container.current) return;
        api = loaded;
        setStatus("Complete the security check below.");
        widget = api.render(container.current, {
          sitekey: siteKey, action: "candidate_intake", size: "compact", theme: "auto", tabindex: 0,
          "response-field": false, retry: "never", "refresh-expired": "never", "refresh-timeout": "never",
          "feedback-enabled": false,
          callback: (token: string) => {
            if (disposed) return;
            onToken(token); setStatus("Security check complete. You can submit this form.");
          },
          "error-callback": unavailable, "expired-callback": unavailable,
          "timeout-callback": unavailable, "unsupported-callback": unavailable,
        });
        if (widget === undefined) unavailable();
      }).catch(unavailable);
    }
    return () => { disposed = true; onToken(""); if (widget !== undefined) api?.remove(widget); };
  }, [siteKey, nonce, resetKey, attempt, onToken]);

  return <section id="intake-challenge" className="join-challenge" tabIndex={-1} aria-labelledby="intake-challenge-title" aria-describedby={`intake-challenge-help intake-challenge-status${error ? " intake-error" : ""}`}>
    <h2 id="intake-challenge-title">Security check</h2>
    <p id="intake-challenge-help" className="join-form__help">Complete Cloudflare’s security check before submitting. It processes browser and network information; your application answers and CV are not sent to the check.</p>
    <div ref={container} />
    <p id="intake-challenge-status" role="status" aria-live="polite">{siteKey ? status : "Security verification is not configured. Submission is unavailable."}</p>
    {siteKey && <button type="button" className="button button-secondary" disabled={pending} aria-describedby="intake-challenge-status" onClick={() => {
      onToken(""); setStatus("Loading a new security check…"); setAttempt(value => value + 1);
    }}>Retry security check</button>}
    <noscript>JavaScript is required to complete the security check. Submission is unavailable without it.</noscript>
  </section>;
}

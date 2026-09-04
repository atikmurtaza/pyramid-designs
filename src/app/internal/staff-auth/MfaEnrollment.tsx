"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createBrowserClient } from "@supabase/ssr";

import { publicEnvironment } from "@/lib/env/public";
import { selectVerifiedTotpFactor } from "./mfa-factors";

type Challenge = Readonly<{ factorId: string; challengeId: string }>;

function browserClient() {
  const url = publicEnvironment.supabaseUrl;
  const publishableKey = publicEnvironment.supabasePublishableKey;
  if (!url || !publishableKey) throw new Error("Authentication unavailable.");
  return createBrowserClient(url, publishableKey);
}

export function MfaExistingFactorChallenge() {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadVerifiedFactor() {
      try {
        const { data, error } = await browserClient().auth.mfa.listFactors();
        if (error) throw error;
        const selectedFactorId = selectVerifiedTotpFactor(data.all);
        if (active) setFactorId(selectedFactorId);
      } catch {
        if (active) setMessage("TOTP factor lookup failed.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadVerifiedFactor();
    return () => {
      active = false;
    };
  }, []);

  async function startChallenge() {
    if (!factorId) return;
    setMessage("");
    try {
      const { data, error } = await browserClient().auth.mfa.challenge({ factorId });
      if (error) throw error;
      setChallenge({ factorId, challengeId: data.id });
    } catch {
      setMessage("TOTP challenge could not start.");
    }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challenge) return;

    const form = event.currentTarget;
    const code = new FormData(form).get("code");
    form.reset();
    if (typeof code !== "string" || !/^\d{6}$/.test(code)) {
      setMessage("Enter the current six-digit code.");
      return;
    }

    setMessage("");
    try {
      const { error } = await browserClient().auth.mfa.verify({
        factorId: challenge.factorId,
        challengeId: challenge.challengeId,
        code,
      });
      if (error) throw error;
      window.location.reload();
    } catch {
      setMessage("TOTP verification failed.");
    }
  }

  if (loading) {
    return (
      <section aria-labelledby="totp-heading" aria-busy="true">
        <h2 id="totp-heading">TOTP verification</h2>
        <p>Checking for a verified TOTP factor.</p>
      </section>
    );
  }

  if (!factorId) {
    return (
      <section aria-labelledby="totp-heading">
        <h2 id="totp-heading">TOTP verification</h2>
        <p>{message || "No verified TOTP factor is available for this test account."}</p>
      </section>
    );
  }

  if (!challenge) {
    return (
      <section aria-labelledby="totp-heading">
        <h2 id="totp-heading">TOTP verification</h2>
        <button type="button" onClick={startChallenge}>Verify existing TOTP factor</button>
        {message ? <p role="alert">{message}</p> : null}
      </section>
    );
  }

  return (
    <section aria-labelledby="totp-heading">
      <h2 id="totp-heading">TOTP verification</h2>
      <form onSubmit={verify}>
        <label htmlFor="totp-code">Six-digit authenticator code</label>
        <input
          id="totp-code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          required
        />
        <button type="submit">Verify TOTP</button>
      </form>
      {message ? <p role="alert">{message}</p> : null}
    </section>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { createBrowserClient } from "@supabase/ssr";

import { publicEnvironment } from "@/lib/env/public";

type Enrollment = Readonly<{ factorId: string; qrCode: string }>;

function browserClient() {
  const url = publicEnvironment.supabaseUrl;
  const publishableKey = publicEnvironment.supabasePublishableKey;
  if (!url || !publishableKey) throw new Error("Authentication unavailable.");
  return createBrowserClient(url, publishableKey);
}

export function MfaEnrollment() {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [message, setMessage] = useState("");

  async function startEnrollment() {
    setMessage("");
    try {
      const { data, error } = await browserClient().auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Phase 2C synthetic test",
      });
      if (error) throw error;
      setEnrollment({ factorId: data.id, qrCode: data.totp.qr_code });
    } catch {
      setMessage("TOTP enrollment could not start.");
    }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enrollment) return;

    const form = event.currentTarget;
    const code = new FormData(form).get("code");
    form.reset();
    if (typeof code !== "string" || !/^\d{6}$/.test(code)) {
      setMessage("Enter the current six-digit code.");
      return;
    }

    setMessage("");
    try {
      const { error } = await browserClient().auth.mfa.challengeAndVerify({
        factorId: enrollment.factorId,
        code,
      });
      if (error) throw error;
      window.location.reload();
    } catch {
      setMessage("TOTP verification failed.");
    }
  }

  if (!enrollment) {
    return (
      <section aria-labelledby="totp-heading">
        <h2 id="totp-heading">TOTP enrollment</h2>
        <button type="button" onClick={startEnrollment}>Start TOTP enrollment</button>
        {message ? <p role="alert">{message}</p> : null}
      </section>
    );
  }

  return (
    <section aria-labelledby="totp-heading">
      <h2 id="totp-heading">TOTP enrollment</h2>
      <p>Scan this QR code with your authenticator app.</p>
      {/* Provider-managed inline SVG; keep it in-memory and out of Next image processing. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={enrollment.qrCode.trimEnd()}
        alt="TOTP enrollment QR code"
        width={256}
        height={256}
      />
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

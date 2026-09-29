import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

// Offline test harness only. Runtime code has no fake verifier or acceptance switch.
export function installChallengeFixture() {
  assert.equal(process.env.NODE_ENV, "test");
  Object.assign(process.env, { PUBLIC_INTAKE_CHALLENGE_PROVIDER: "turnstile",
    PUBLIC_INTAKE_ORIGIN: "https://pyramiddesigns.co", TURNSTILE_SITE_KEY: "synthetic_public_widget_identifier",
    TURNSTILE_SECRET_KEY: "synthetic_private_test_value_no_credential" });
  const used = new Set();
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "https://challenges.cloudflare.com/turnstile/v0/siteverify", "Live requests forbidden");
    const { response } = JSON.parse(init.body);
    const success = typeof response === "string" && response.startsWith("synthetic-token-") && !used.has(response);
    used.add(response);
    return Response.json(success ? { success: true, hostname: "pyramiddesigns.co", action: "candidate_intake",
      challenge_ts: new Date().toISOString(), "error-codes": [] } : { success: false, "error-codes": ["timeout-or-duplicate"] });
  };
}

export function challengedFields(fields) {
  const copy = new URLSearchParams(fields);
  copy.set("cf-turnstile-response", `synthetic-token-${randomUUID()}`);
  return copy;
}

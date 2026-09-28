import "server-only";

import { readBoundedStream } from "./candidate-file-policy.ts";

export type ChallengeResult = "VERIFIED" | "REJECTED" | "UNAVAILABLE";
const endpoint = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
export const INTAKE_CHALLENGE_ACTION = "candidate_intake";

function configuration() {
  const e = process.env;
  const origin = new URL(e.PUBLIC_INTAKE_ORIGIN ?? "invalid:");
  if (!["production", "development", "test"].includes(e.NODE_ENV ?? "")
    || e.PUBLIC_INTAKE_CHALLENGE_PROVIDER !== "turnstile"
    || origin.origin !== e.PUBLIC_INTAKE_ORIGIN || origin.protocol !== "https:"
    || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(origin.hostname)
    || !/^[A-Za-z0-9_-]{20,200}$/.test(e.TURNSTILE_SECRET_KEY ?? "")
    || !/^[A-Za-z0-9_-]{20,200}$/.test(e.TURNSTILE_SITE_KEY ?? "")
    // Official always-pass/fail test keys must never select a production verifier.
    || /^[123]x0+/.test(e.TURNSTILE_SECRET_KEY ?? "") || /^[123]x0+/.test(e.TURNSTILE_SITE_KEY ?? "")) {
    throw new Error("Challenge unavailable.");
  }
  return { secret: e.TURNSTILE_SECRET_KEY!, hostname: origin.hostname };
}

export function intakeChallengeConfiguration(): "CONFIGURED_UNVERIFIED" | "UNAVAILABLE" {
  try { configuration(); return "CONFIGURED_UNVERIFIED"; } catch { return "UNAVAILABLE"; }
}

// Contract for a future approved production caller. Does not open the intake gate.
// No injected runtime verifier, fake mode, IP, candidate data or acceptance cache.
export async function verifyIntakeChallenge(token: unknown, signal?: AbortSignal): Promise<ChallengeResult> {
  let config: ReturnType<typeof configuration>;
  try { config = configuration(); } catch { return "UNAVAILABLE"; }
  if (typeof token !== "string" || !/^[\x21-\x7e]{1,2048}$/.test(token)) return "REJECTED";
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new Error("Challenge unavailable.")); }, 3000);
  });
  try {
    if (signal?.aborted) return "UNAVAILABLE";
    return await Promise.race([deadline, (async (): Promise<ChallengeResult> => {
      const response = await fetch(endpoint, { method: "POST", redirect: "error", cache: "no-store",
        headers: { "Content-Type": "application/json" }, signal: controller.signal,
        body: JSON.stringify({ secret: config.secret, response: token }) });
      if (controller.signal.aborted || response.status !== 200
        || !/^application\/json(?:;\s*charset=utf-8)?$/i.test(response.headers.get("content-type") ?? "")) {
        void response.body?.cancel().catch(() => {});
        return "UNAVAILABLE";
      }
      const bytes = await readBoundedStream(response.body, 8192, 3000, response.headers.get("content-length"), controller.signal);
      const raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      const result: unknown = JSON.parse(raw);
      if (!result || typeof result !== "object" || Array.isArray(result)) return "UNAVAILABLE";
      const value = result as Record<string, unknown>;
      const keys = [...raw.matchAll(/"(?:\\.|[^"\\])*"\s*:/g)].map(match => JSON.parse(match[0].slice(0, match[0].lastIndexOf(":"))) as string);
      if (new Set(keys).size !== keys.length
        || Object.keys(value).some(key => !["success", "challenge_ts", "hostname", "action", "error-codes", "cdata"].includes(key))
        || typeof value.success !== "boolean"
        || (value["error-codes"] !== undefined && (!Array.isArray(value["error-codes"])
          || value["error-codes"].length > 10 || value["error-codes"].some(code => typeof code !== "string" || !/^[a-z-]{1,80}$/.test(code))))) return "UNAVAILABLE";
      if (!value.success) return "REJECTED";
      if (controller.signal.aborted || signal?.aborted) return "UNAVAILABLE";
      if (value.hostname !== config.hostname || value.action !== INTAKE_CHALLENGE_ACTION
        || (value.cdata !== undefined && value.cdata !== "")
        || (Array.isArray(value["error-codes"]) && value["error-codes"].length)) return "REJECTED";
      if (typeof value.challenge_ts !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value.challenge_ts)) return "UNAVAILABLE";
      const age = Date.now() - Date.parse(value.challenge_ts);
      return Number.isFinite(age) && age >= 0 && age < 300_000 ? "VERIFIED" : "REJECTED";
    })()]);
  } catch { return "UNAVAILABLE"; }
  finally { clearTimeout(timer); signal?.removeEventListener("abort", abort); controller.abort(); }
}

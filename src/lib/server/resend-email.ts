import "server-only";

import { createHmac } from "node:crypto";
import { renderNotification, validNotificationRecipient, unavailableEmailAdapter,
  type EmailAdapter, type EmailEnvelope, type EmailResult } from "./candidate-notifications.ts";

const endpoint = "https://api.resend.com/emails";
const sender = "applications@mail.pyramiddesigns.co";
const replyTo = "contact@pyramiddesigns.co";
const maxResponseBytes = 16 * 1024;
const receiptPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Exact owner-approved identities, with explicit selection even when a key exists.
function configuration() {
  const e = process.env;
  if (!["production", "development", "test"].includes(e.NODE_ENV ?? "")
    || e.EMAIL_PROVIDER !== "resend" || e.EMAIL_FROM_ADDRESS !== sender
    || e.EMAIL_FROM_NAME !== "Pyramid Designs" || e.EMAIL_REPLY_TO_MODE !== "fixed"
    || e.EMAIL_REPLY_TO_ADDRESS !== replyTo || !e.RESEND_API_KEY
    || !/^re_[A-Za-z0-9_-]{16,200}$/.test(e.RESEND_API_KEY)) {
    throw new Error("Email configuration unavailable.");
  }
  return { key: e.RESEND_API_KEY, environment: e.NODE_ENV };
}

export function emailReadiness(): "EMAIL_PROVIDER_CONFIGURED" | "EMAIL_CONFIGURATION_UNAVAILABLE" {
  try { configuration(); return "EMAIL_PROVIDER_CONFIGURED"; }
  catch { return "EMAIL_CONFIGURATION_UNAVAILABLE"; }
}

function requestBody(envelope: EmailEnvelope) {
  const template = renderNotification(envelope.event, envelope.templateVersion);
  if (!validNotificationRecipient(envelope.recipient) || !/^[a-f0-9]{64}$/.test(envelope.identity)
    || envelope.subject !== template.subject || envelope.text !== template.text
    || Object.keys(envelope).sort().join(",") !== "event,identity,recipient,subject,templateVersion,text") {
    throw new Error("Email envelope invalid.");
  }
  return JSON.stringify({ from: `Pyramid Designs <${sender}>`, to: [envelope.recipient],
    subject: template.subject, text: template.text, reply_to: replyTo });
}

async function boundedJson(response: Response) {
  if (!/^application\/json(?:\s*;|$)/i.test(response.headers.get("content-type") ?? "")) throw new Error("Invalid response.");
  const length = response.headers.get("content-length");
  if (length !== null && (!/^\d{1,8}$/.test(length) || Number(length) > maxResponseBytes)) throw new Error("Invalid response.");
  if (!response.body) throw new Error("Invalid response.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxResponseBytes) throw new Error("Invalid response.");
      chunks.push(value);
    }
    const raw = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid response.");
    // Reject duplicate top-level fields, including escaped spellings. Error
    // values are strings/numbers only; nested structures fail schema validation.
    const keys = new Set<string>();
    let depth = 0;
    const tokens = [...raw.matchAll(/"(?:\\.|[^"\\])*"|[{}\[\]:,]/g)];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i][0];
      if (token === "{" || token === "[") depth++;
      else if (token === "}" || token === "]") depth--;
      else if (depth === 1 && token.startsWith('"') && tokens[i + 1]?.[0] === ":") {
        const key = JSON.parse(token) as string;
        if (keys.has(key)) throw new Error("Invalid response.");
        keys.add(key);
      }
    }
    return value as Record<string, unknown>;
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

// Resend documents both as seconds, not dates or epoch timestamps. Bad/too-long
// delays require an operator; never clamp a provider delay into an early retry.
function retryDelay(headers: Headers): number | null {
  let delay = 0;
  for (const name of ["retry-after", "ratelimit-reset"]) {
    const value = headers.get(name);
    if (value === null) continue;
    if (!/^\d{1,4}$/.test(value) || Number(value) > 3600) return null;
    delay = Math.max(delay, Number(value));
  }
  return delay;
}

export function configuredEmailAdapter(): EmailAdapter {
  try { configuration(); } catch { return unavailableEmailAdapter; }
  return Object.freeze({ mode: "provider" as const, provider: "resend",
    requestFingerprint(envelope: EmailEnvelope) {
      const config = configuration();
      // Keyed commitment prevents offline guessing of contact from audit data.
      // A key/account, environment, sender, recipient or template change fails closed.
      return createHmac("sha256", config.key).update(JSON.stringify([
        "resend-request-v1", config.environment, endpoint, envelope.identity, requestBody(envelope),
      ])).digest("hex");
    },
    async send(envelope: EmailEnvelope, signal: AbortSignal): Promise<EmailResult> {
      let key: string, body: string;
      try { key = configuration().key; body = requestBody(envelope); }
      catch { return { outcome: "CONFIG_FAILURE" }; }
      // No async preparation or hidden retry before the only transport call.
      if (signal.aborted) return { outcome: "RETRYABLE_FAILURE" };
      let response: Response | undefined;
      try {
        response = await fetch(endpoint, { method: "POST", redirect: "error", signal,
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json",
            "User-Agent": "PyramidDesigns/1.0 transactional-email", "Idempotency-Key": envelope.identity }, body });
        const value = await boundedJson(response);
        if (signal.aborted) return { outcome: "AMBIGUOUS_ACCEPTANCE" };
        if (response.status === 200 && Object.keys(value).join(",") === "id"
          && typeof value.id === "string" && receiptPattern.test(value.id)) {
          return { outcome: "ACCEPTED", receipt: value.id };
        }
        // Success with missing/extra/contradictory fields is never acceptance.
        if (response.ok || typeof value.name !== "string" || typeof value.message !== "string"
          || value.message.length > 2048 || Object.keys(value).some(k => !["name", "message", "statusCode"].includes(k))
          || (value.statusCode !== undefined && value.statusCode !== response.status)) return { outcome: "AMBIGUOUS_ACCEPTANCE" };
        const { name } = value;
        if ((response.status === 401 && ["missing_api_key", "restricted_api_key"].includes(name))
          || (response.status === 403 && ["invalid_api_key", "invalid_permission", "restricted_api_key", "suspended_api_key"].includes(name)))
          return { outcome: "AUTH_FAILURE" };
        if (response.status === 400 && name === "validation_error") {
          // Recognize only the exact documented recipient-validation wording.
          if (value.message === "Invalid `to` field. The email address needs to follow the `email@example.com` or `Name <email@example.com>` format.")
            return { outcome: "DEFINITE_REJECTION" };
          return { outcome: "CONFIG_FAILURE" };
        }
        if ((response.status === 403 && name === "validation_error")
          || (response.status === 400 && name === "invalid_idempotency_key")
          || (response.status === 422 && ["invalid_attachment", "invalid_parameter", "missing_required_field", "missing_required_parameter"].includes(name))
          || (response.status === 429 && ["daily_quota_exceeded", "monthly_quota_exceeded"].includes(name))) return { outcome: "CONFIG_FAILURE" };
        if (response.status === 429 && name === "rate_limit_exceeded") {
          const delay = retryDelay(response.headers);
          return delay === null ? { outcome: "CONFIG_FAILURE" } : { outcome: "RATE_LIMIT", retryAfterSeconds: delay };
        }
        // Both 409 idempotency errors imply a prior/current effect. 5xx and
        // unrecognized responses do not prove non-acceptance either.
        return { outcome: "AMBIGUOUS_ACCEPTANCE" };
      } catch {
        // Native fetch does not provide a portable proof of pre-transmission
        // DNS/connect failure; do not infer it from generic/cause error strings.
        return { outcome: "AMBIGUOUS_ACCEPTANCE" };
      } finally { if (response?.body && !response.body.locked) await response.body.cancel().catch(() => {}); }
    },
  });
}

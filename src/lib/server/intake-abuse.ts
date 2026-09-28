import "server-only";

export const MAX_INTAKE_BYTES = 24_576;
export const MAX_MULTIPART_BYTES = 5 * 1024 * 1024 + 32 * 1024;
export const MULTIPART_TYPE = /^multipart\/form-data;\s*boundary=(?:[\w'-]{1,70}|"[\w'-]{1,70}")$/i;

export function intakeResponse(status: number, body: object) {
  return Response.json(body, { status, headers: {
    "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff",
    ...(status === 429 || status === 503 ? { "Retry-After": "60" } : {}),
  } });
}

// Reject cheap invalid shapes before pool acquisition or body consumption.
export function intakeShapeFailure(request: Request, multipart: boolean) {
  const unavailable = (status: number) => intakeResponse(status, { ok: false, message: "Submission is unavailable." });
  if (request.method !== "POST") return unavailable(405);
  if (request.url.length > 2048) return unavailable(414);
  const url = new URL(request.url);
  if (url.pathname !== "/api/applications" || url.search || url.hash) return unavailable(400);
  for (const name of ["origin", "host", "content-type", "content-length", "sec-fetch-site"]) {
    if ((request.headers.get(name)?.length ?? 0) > 256) return unavailable(400);
  }
  if (request.headers.has("content-encoding")) return unavailable(415);
  const type = request.headers.get("content-type") ?? "";
  if (!(multipart ? MULTIPART_TYPE : /^application\/x-www-form-urlencoded(?:;\s*charset=utf-8)?$/i).test(type)) return unavailable(415);
  const length = request.headers.get("content-length");
  if (length !== null && (!/^\d{1,8}$/.test(length) || Number(length) > (multipart ? MAX_MULTIPART_BYTES : MAX_INTAKE_BYTES))) {
    return intakeResponse(413, { ok: false, message: "The submission is too large." });
  }
  return null;
}

let activeRequests = 0;
// ponytail: per-process concurrency only; PostgreSQL remains the global authority.
export function acquireIntakeSlot(): (() => void) | null {
  if (activeRequests >= 2) return null;
  activeRequests++;
  let released = false;
  return () => { if (!released) { released = true; activeRequests--; } };
}

export function intakeAbuseReadiness() {
  return Object.freeze({
    trustedClientIp: "UNAVAILABLE_UNTIL_TRUSTED_PROXY_PROVEN",
    perIpRateLimit: "UNAVAILABLE_UNTIL_TRUSTED_PROXY_PROVEN",
    challenge: "UNAVAILABLE_UNTIL_CONFIGURED_AND_VERIFIED",
    realCandidateIntake: false,
  });
}

import {
  compatibilityJson,
  hasBearerSecret,
  unauthorizedCompatibilityResponse,
} from "@/lib/server/compatibility";
import { serverEnvironment } from "@/lib/server/environment";

const CANDIDATE_TARGET_BYTES = 5 * 1024 * 1024;
const PROBE_MAX_BYTES = 6 * 1024 * 1024;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let secret: string;
  try {
    secret = serverEnvironment.compatibilityProbeSecret();
  } catch {
    return compatibilityJson({ ok: false, code: "PROBE_NOT_CONFIGURED" }, 503);
  }

  if (!hasBearerSecret(request, secret)) return unauthorizedCompatibilityResponse();

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > PROBE_MAX_BYTES) {
    return compatibilityJson({ ok: false, code: "PROBE_PAYLOAD_TOO_LARGE" }, 413);
  }
  if (!request.body) {
    return compatibilityJson({ ok: false, code: "PROBE_PAYLOAD_REQUIRED" }, 400);
  }

  let receivedBytes = 0;
  const reader = request.body.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    receivedBytes += value.byteLength;
    if (receivedBytes > PROBE_MAX_BYTES) {
      await reader.cancel();
      return compatibilityJson({ ok: false, code: "PROBE_PAYLOAD_TOO_LARGE" }, 413);
    }
  }

  return compatibilityJson({
    ok: true,
    code: "UPLOAD_PROBE_OK",
    receivedBytes,
    reachesCandidateTarget: receivedBytes >= CANDIDATE_TARGET_BYTES,
  });
}

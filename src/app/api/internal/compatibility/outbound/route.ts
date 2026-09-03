import {
  compatibilityJson,
  hasBearerSecret,
  unauthorizedCompatibilityResponse,
} from "@/lib/server/compatibility";
import { serverEnvironment } from "@/lib/server/environment";

const GOOGLE_DRIVE_DISCOVERY_URL =
  "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest";

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

  try {
    const response = await fetch(GOOGLE_DRIVE_DISCOVERY_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.includes("application/json")) {
      throw new Error("Unexpected response");
    }

    return compatibilityJson({ ok: true, code: "OUTBOUND_HTTPS_OK" });
  } catch {
    console.error("phase_2a_outbound_probe_failed");
    return compatibilityJson({ ok: false, code: "OUTBOUND_HTTPS_FAILED" }, 503);
  }
}

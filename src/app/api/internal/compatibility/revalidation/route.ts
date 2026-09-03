import { revalidateTag, unstable_cache } from "next/cache";

import {
  compatibilityJson,
  hasBearerSecret,
  unauthorizedCompatibilityResponse,
} from "@/lib/server/compatibility";
import { serverEnvironment } from "@/lib/server/environment";

const CACHE_TAG = "phase-2a-revalidation-probe";
const readMarker = unstable_cache(
  async () => new Date().toISOString(),
  [CACHE_TAG],
  { revalidate: 300, tags: [CACHE_TAG] },
);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorize(request: Request) {
  try {
    const secret = serverEnvironment.compatibilityProbeSecret();
    return hasBearerSecret(request, secret);
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const authorized = authorize(request);
  if (authorized === null) {
    return compatibilityJson({ ok: false, code: "PROBE_NOT_CONFIGURED" }, 503);
  }
  if (!authorized) return unauthorizedCompatibilityResponse();

  try {
    return compatibilityJson({
      ok: true,
      code: "REVALIDATION_MARKER_OK",
      marker: await readMarker(),
    });
  } catch {
    console.error("phase_2a_revalidation_probe_failed");
    return compatibilityJson({ ok: false, code: "REVALIDATION_FAILED" }, 503);
  }
}

export async function POST(request: Request) {
  const authorized = authorize(request);
  if (authorized === null) {
    return compatibilityJson({ ok: false, code: "PROBE_NOT_CONFIGURED" }, 503);
  }
  if (!authorized) return unauthorizedCompatibilityResponse();

  try {
    revalidateTag(CACHE_TAG, { expire: 0 });
    return compatibilityJson({ ok: true, code: "REVALIDATION_REQUESTED" });
  } catch {
    console.error("phase_2a_revalidation_probe_failed");
    return compatibilityJson({ ok: false, code: "REVALIDATION_FAILED" }, 503);
  }
}

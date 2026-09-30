import {
  compatibilityJson,
  hasBearerSecret,
  unauthorizedCompatibilityResponse,
} from "@/lib/server/compatibility";
import { recordCompatibilityProbe } from "@/lib/server/compatibility-probe";
import { serverEnvironment } from "@/lib/server/environment";

const LABEL = "phase-2a-cron-probe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  let secret: string;
  try {
    secret = serverEnvironment.cronSecret();
  } catch {
    return compatibilityJson({ ok: false, code: "CRON_NOT_CONFIGURED" }, 503);
  }

  if (!hasBearerSecret(request, secret)) return unauthorizedCompatibilityResponse();

  try {
    const firstRecordedAt = await recordCompatibilityProbe(LABEL);

    return compatibilityJson({
      ok: true,
      code: "CRON_PROBE_OK",
      firstRecordedAt,
    });
  } catch {
    console.error("phase_2a_cron_probe_failed");
    return compatibilityJson({ ok: false, code: "CRON_PROBE_FAILED" }, 503);
  }
}

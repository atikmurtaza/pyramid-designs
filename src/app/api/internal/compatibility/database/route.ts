import {
  compatibilityJson,
  hasBearerSecret,
  unauthorizedCompatibilityResponse,
} from "@/lib/server/compatibility";
import { recordAndCountCompatibilityProbe } from "@/lib/server/compatibility-probe";
import { serverEnvironment } from "@/lib/server/environment";

const LABEL = "phase-2a-database-probe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  let secret: string;
  try {
    secret = serverEnvironment.compatibilityProbeSecret();
  } catch {
    return compatibilityJson({ ok: false, code: "PROBE_NOT_CONFIGURED" }, 503);
  }

  if (!hasBearerSecret(request, secret)) return unauthorizedCompatibilityResponse();

  try {
    const result = await recordAndCountCompatibilityProbe(LABEL);

    return compatibilityJson({
      ok: true,
      code: "DATABASE_PROBE_OK",
      ...result,
    });
  } catch {
    console.error("phase_2a_database_probe_failed");
    return compatibilityJson({ ok: false, code: "DATABASE_UNAVAILABLE" }, 503);
  }
}

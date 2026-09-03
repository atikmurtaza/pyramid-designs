import {
  compatibilityJson,
  hasBearerSecret,
  unauthorizedCompatibilityResponse,
} from "@/lib/server/compatibility";
import { serverEnvironment } from "@/lib/server/environment";

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

  return compatibilityJson({
    ok: true,
    code: "SERVER_EXECUTION_OK",
    runtime: "nodejs",
    nodeMajor: Number(process.versions.node.split(".")[0]),
    checkedAt: new Date().toISOString(),
    serverSecretsReadable: true,
  });
}

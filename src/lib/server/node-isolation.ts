import "server-only";

import {
  compatibilityJson,
  hasBearerSecret,
  unauthorizedCompatibilityResponse,
} from "@/lib/server/compatibility";
import { serverEnvironment } from "@/lib/server/environment";

export type NodeIsolationStage =
  | "NODE_BASELINE"
  | "PG_IMPORT"
  | "PG_POOL"
  | "PG_QUERY"
  | "PRISMA_RUNTIME_IMPORT"
  | "PRISMA_CLIENT_IMPORT"
  | "PRISMA_DIRECT_CONSTRUCT"
  | "PRISMA_DIRECT_QUERY"
  | "PRISMA_ADAPTER_IMPORT"
  | "PRISMA_ADAPTER_CONSTRUCT"
  | "PRISMA_ADAPTER_PRISMA_CONSTRUCT"
  | "PRISMA_ADAPTER_QUERY";

export async function runNodeIsolationDiagnostic(
  request: Request,
  stage: NodeIsolationStage,
  diagnostic: () => Promise<void> | void,
) {
  let secret: string;
  try {
    secret = serverEnvironment.compatibilityProbeSecret();
  } catch {
    return compatibilityJson({ ok: false, code: "PROBE_NOT_CONFIGURED" }, 503);
  }

  if (!hasBearerSecret(request, secret)) return unauthorizedCompatibilityResponse();

  try {
    await diagnostic();
    return compatibilityJson({ ok: true, code: `${stage}_OK` });
  } catch {
    console.error(`phase_2a_node_isolation_${stage.toLowerCase()}_failed`);
    return compatibilityJson({ ok: false, code: `${stage}_FAILED` }, 503);
  }
}

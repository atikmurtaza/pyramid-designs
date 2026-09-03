import {
  compatibilityJson,
  hasBearerSecret,
  unauthorizedCompatibilityResponse,
} from "@/lib/server/compatibility";
import { serverEnvironment } from "@/lib/server/environment";
import { getPrisma } from "@/lib/server/prisma";

const LABEL = "phase-2a-database-probe";

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
    const prisma = getPrisma();
    const record = await prisma.compatibilityProbe.upsert({
      where: { label: LABEL },
      create: { label: LABEL },
      update: {},
      select: { createdAt: true },
    });
    const matchingRows = await prisma.compatibilityProbe.count({
      where: { label: LABEL },
    });

    return compatibilityJson({
      ok: true,
      code: "DATABASE_PROBE_OK",
      createdAt: record.createdAt.toISOString(),
      matchingRows,
    });
  } catch {
    console.error("phase_2a_database_probe_failed");
    return compatibilityJson({ ok: false, code: "DATABASE_UNAVAILABLE" }, 503);
  }
}

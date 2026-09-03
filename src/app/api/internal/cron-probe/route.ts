import {
  compatibilityJson,
  hasBearerSecret,
  unauthorizedCompatibilityResponse,
} from "@/lib/server/compatibility";
import { serverEnvironment } from "@/lib/server/environment";
import { getPrisma } from "@/lib/server/prisma";

const LABEL = "phase-2a-cron-probe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let secret: string;
  try {
    secret = serverEnvironment.cronSecret();
  } catch {
    return compatibilityJson({ ok: false, code: "CRON_NOT_CONFIGURED" }, 503);
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

    return compatibilityJson({
      ok: true,
      code: "CRON_PROBE_OK",
      firstRecordedAt: record.createdAt.toISOString(),
    });
  } catch {
    console.error("phase_2a_cron_probe_failed");
    return compatibilityJson({ ok: false, code: "CRON_PROBE_FAILED" }, 503);
  }
}

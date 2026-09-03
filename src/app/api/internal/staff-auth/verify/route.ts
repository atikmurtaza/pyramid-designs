import { authorize } from "@/lib/server/auth/authorization";
import { resolveAuthenticatedStaff } from "@/lib/server/auth/session";
import {
  compatibilityJson,
  hasBearerSecret,
  unauthorizedCompatibilityResponse,
} from "@/lib/server/compatibility";
import { serverEnvironment } from "@/lib/server/environment";
import { appendAuditEvent } from "@/lib/server/repositories/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYNTHETIC_CONTENT_ID = "00000000-0000-4000-8000-00000000002f";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") return new Response(null, { status: 404 });

  let secret: string;
  try {
    secret = serverEnvironment.compatibilityProbeSecret();
  } catch {
    return compatibilityJson({ ok: false, code: "AUTH_CHECK_NOT_CONFIGURED" }, 503);
  }
  if (!hasBearerSecret(request, secret)) return unauthorizedCompatibilityResponse();

  const principal = await resolveAuthenticatedStaff();
  if (!principal) {
    return compatibilityJson({ ok: false, code: "AUTHENTICATION_REQUIRED" }, 401);
  }

  const decision = authorize(principal, {
    operation: "content.draft.read",
    target: {
      type: "CONTENT",
      id: SYNTHETIC_CONTENT_ID,
      state: { publicationState: "DRAFT" },
    },
  });

  try {
    await appendAuditEvent({
      actorType: "STAFF",
      actorStaffUserId: principal.staffUserId,
      actionCode: "phase2c.authorization.check",
      targetType: "SYNTHETIC_CONTENT",
      targetId: SYNTHETIC_CONTENT_ID,
      outcome: decision.allowed ? "SUCCEEDED" : "DENIED",
      reasonCode: decision.reasonCode,
      correlationId: crypto.randomUUID(),
      safeMetadata: { synthetic: true },
    });
  } catch {
    return compatibilityJson({ ok: false, code: "AUTHORIZATION_CHECK_UNAVAILABLE" }, 503);
  }

  if (!decision.allowed) {
    return compatibilityJson({ ok: false, code: "NOT_AVAILABLE" }, 403);
  }
  return compatibilityJson({ ok: true, code: "STAFF_AUTHORIZATION_OK" });
}

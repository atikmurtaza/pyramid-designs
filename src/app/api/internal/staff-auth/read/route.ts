import {
  AuthorizationDeniedError,
} from "@/lib/server/auth/authorization";
import { resolveAuthenticatedStaff } from "@/lib/server/auth/session";
import {
  readStaffApplicationContact,
  readStaffAuditEvents,
  readStaffJob,
  staffSessionSummary,
  StaffReadUnavailableError,
} from "@/lib/server/staff-reads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  Vary: "Cookie",
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") return new Response(null, { status: 404 });

  const principal = await resolveAuthenticatedStaff();
  if (!principal) return json({ ok: false, code: "AUTHENTICATION_REQUIRED" }, 401);

  const { searchParams } = new URL(request.url);
  const resource = searchParams.get("resource");
  const id = searchParams.get("id") ?? "";

  try {
    let data: unknown;
    if (resource === "job") data = await readStaffJob(principal, id);
    else if (resource === "application") data = await readStaffApplicationContact(principal, id);
    else if (resource === "audit" && !id) data = await readStaffAuditEvents(principal);
    else return json({ ok: false, code: "NOT_AVAILABLE" }, 404);

    return json({ ok: true, principal: staffSessionSummary(principal), data });
  } catch (error) {
    if (
      error instanceof StaffReadUnavailableError ||
      error instanceof AuthorizationDeniedError
    ) {
      return json({ ok: false, code: "NOT_AVAILABLE" }, 404);
    }
    return json({ ok: false, code: "READ_UNAVAILABLE" }, 503);
  }
}

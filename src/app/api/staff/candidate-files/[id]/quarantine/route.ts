import { candidateFileResponse, retrieveCandidateFile } from "@/lib/server/candidate-files";
import { resolveAuthenticatedStaff } from "@/lib/server/auth/session";

export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (request.headers.get("sec-fetch-site") === "cross-site") throw new Error("Not available.");
    const [{ id }, principal] = await Promise.all([params, resolveAuthenticatedStaff()]);
    return candidateFileResponse(await retrieveCandidateFile(principal, id, "candidate_file.security_review.retrieve_quarantine"), true);
  } catch { return Response.json({ ok: false, message: "Not available." }, { status: 404, headers: { "Cache-Control": "private, no-store" } }); }
}

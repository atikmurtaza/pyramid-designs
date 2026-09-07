import { handleIntakeRequest } from "@/lib/server/public-intake";
import { handleCandidateFileIntakeRequest } from "@/lib/server/candidate-files";

export const runtime = "nodejs";
export async function POST(request: Request) {
  return request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data;")
    ? handleCandidateFileIntakeRequest(request)
    : handleIntakeRequest(request);
}

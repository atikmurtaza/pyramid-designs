import { handleReviewRequest } from "@/lib/server/candidate-files";

export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleReviewRequest(request, (await params).id, "initiate");
}

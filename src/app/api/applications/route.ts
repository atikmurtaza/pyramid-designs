import { handleIntakeRequest } from "@/lib/server/public-intake";

export const runtime = "nodejs";
export async function POST(request: Request) { return handleIntakeRequest(request); }

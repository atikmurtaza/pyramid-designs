import { handleReadiness } from "@/lib/server/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) { return handleReadiness(request); }

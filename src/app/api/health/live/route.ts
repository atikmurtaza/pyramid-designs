import { healthResponse } from "@/lib/server/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET() { return healthResponse(true); }

import { handleWorkerTrigger } from "@/lib/server/worker-trigger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) { return handleWorkerTrigger(request); }

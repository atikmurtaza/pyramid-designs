import { runNodeIsolationDiagnostic } from "@/lib/server/node-isolation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return runNodeIsolationDiagnostic(request, "NODE_BASELINE", () => {});
}

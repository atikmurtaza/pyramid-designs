import { runNodeIsolationDiagnostic } from "@/lib/server/node-isolation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return runNodeIsolationDiagnostic(request, "PG_IMPORT", async () => {
    const { Pool } = await import("pg");
    if (typeof Pool !== "function") throw new Error("pg Pool export unavailable");
  });
}

import { runNodeIsolationDiagnostic } from "@/lib/server/node-isolation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return runNodeIsolationDiagnostic(request, "PRISMA_ADAPTER_IMPORT", async () => {
    const { PrismaPg } = await import("@prisma/adapter-pg");
    if (typeof PrismaPg !== "function") {
      throw new Error("PrismaPg export unavailable");
    }
  });
}

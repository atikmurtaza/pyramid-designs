import { runNodeIsolationDiagnostic } from "@/lib/server/node-isolation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return runNodeIsolationDiagnostic(request, "PRISMA_RUNTIME_IMPORT", async () => {
    const prismaRuntime = await import("@prisma/client/runtime/library");
    if (typeof prismaRuntime.getPrismaClient !== "function") {
      throw new Error("Prisma runtime export unavailable");
    }
  });
}

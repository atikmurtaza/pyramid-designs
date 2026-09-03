import { runNodeIsolationDiagnostic } from "@/lib/server/node-isolation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return runNodeIsolationDiagnostic(request, "PRISMA_CLIENT_IMPORT", async () => {
    const { PrismaClient } = await import("@/generated/prisma/client");
    if (typeof PrismaClient !== "function") {
      throw new Error("Generated PrismaClient export unavailable");
    }
  });
}

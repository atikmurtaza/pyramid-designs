import { runNodeIsolationDiagnostic } from "@/lib/server/node-isolation";
import { serverEnvironment } from "@/lib/server/environment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return runNodeIsolationDiagnostic(request, "PRISMA_DIRECT_CONSTRUCT", async () => {
    const { PrismaClient } = await import("@/generated/prisma/client");
    const prisma = new PrismaClient({
      datasourceUrl: serverEnvironment.databaseUrl(),
    });
    await prisma.$disconnect();
  });
}

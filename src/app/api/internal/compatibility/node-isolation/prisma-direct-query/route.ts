import { runNodeIsolationDiagnostic } from "@/lib/server/node-isolation";
import { serverEnvironment } from "@/lib/server/environment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return runNodeIsolationDiagnostic(request, "PRISMA_DIRECT_QUERY", async () => {
    const { PrismaClient } = await import("@/generated/prisma/client");
    const prisma = new PrismaClient({
      datasourceUrl: serverEnvironment.databaseUrl(),
    });

    try {
      const result = await prisma.$queryRaw<Array<{ value: number }>>`SELECT 1 AS value`;
      if (result[0]?.value !== 1) throw new Error("Unexpected fixed query result");
    } finally {
      await prisma.$disconnect();
    }
  });
}

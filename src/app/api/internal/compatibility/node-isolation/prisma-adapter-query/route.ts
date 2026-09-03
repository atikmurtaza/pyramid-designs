import { runNodeIsolationDiagnostic } from "@/lib/server/node-isolation";
import { serverEnvironment } from "@/lib/server/environment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return runNodeIsolationDiagnostic(request, "PRISMA_ADAPTER_QUERY", async () => {
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([
      import("@prisma/adapter-pg"),
      import("@/generated/prisma/client"),
    ]);
    const adapter = new PrismaPg({
      connectionString: serverEnvironment.databaseUrl(),
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 10_000,
      max: 1,
    });
    const prisma = new PrismaClient({ adapter });

    try {
      const result = await prisma.$queryRaw<Array<{ value: number }>>`SELECT 1 AS value`;
      if (result[0]?.value !== 1) throw new Error("Unexpected fixed query result");
    } finally {
      await prisma.$disconnect();
    }
  });
}

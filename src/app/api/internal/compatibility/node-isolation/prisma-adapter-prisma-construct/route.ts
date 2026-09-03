import { runNodeIsolationDiagnostic } from "@/lib/server/node-isolation";
import { serverEnvironment } from "@/lib/server/environment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return runNodeIsolationDiagnostic(
    request,
    "PRISMA_ADAPTER_PRISMA_CONSTRUCT",
    async () => {
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
      await prisma.$disconnect();
    },
  );
}

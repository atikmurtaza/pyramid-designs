import { runNodeIsolationDiagnostic } from "@/lib/server/node-isolation";
import { serverEnvironment } from "@/lib/server/environment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return runNodeIsolationDiagnostic(request, "PRISMA_ADAPTER_CONSTRUCT", async () => {
    const { PrismaPg } = await import("@prisma/adapter-pg");
    new PrismaPg({
      connectionString: serverEnvironment.databaseUrl(),
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 10_000,
      max: 1,
    });
  });
}

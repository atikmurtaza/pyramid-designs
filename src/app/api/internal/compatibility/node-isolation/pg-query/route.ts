import { runNodeIsolationDiagnostic } from "@/lib/server/node-isolation";
import { serverEnvironment } from "@/lib/server/environment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return runNodeIsolationDiagnostic(request, "PG_QUERY", async () => {
    const { Pool } = await import("pg");
    const pool = new Pool({
      connectionString: serverEnvironment.databaseUrl(),
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 10_000,
      max: 1,
    });

    try {
      const result = await pool.query<{ value: number }>("SELECT 1 AS value");
      if (result.rows[0]?.value !== 1) throw new Error("Unexpected fixed query result");
    } finally {
      await pool.end();
    }
  });
}

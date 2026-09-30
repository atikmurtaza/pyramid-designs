import "server-only";

import { Pool } from "pg";
import { hasBearerSecret } from "./compatibility.ts";
import { serverEnvironment } from "./environment.ts";

export function healthResponse(ok: boolean, status = ok ? 200 : 503) {
  return Response.json({ ok }, { status, headers: {
    "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff",
  } });
}

export async function handleReadiness(request: Request) {
  let secret: string;
  try { secret = serverEnvironment.cronSecret(); } catch { return healthResponse(false); }
  if (!hasBearerSecret(request, secret)) return healthResponse(false, 401);
  if (new URL(request.url).search) return healthResponse(false, 400);
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) return healthResponse(false);
  // Separate bounded pool: readiness cannot exhaust the application's three slots.
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 2000,
    statement_timeout: 1500, query_timeout: 2000, application_name: "pyramid-readiness" });
  pool.on("error", () => {});
  try {
    const result = await pool.query("SELECT 1 AS ok");
    return healthResponse(result.rows[0]?.ok === 1);
  } catch { return healthResponse(false); }
  finally { await pool.end(); }
}

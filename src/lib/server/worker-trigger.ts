import "server-only";
import { hasBearerSecret } from "./compatibility.ts";
import { serverEnvironment } from "./environment.ts";
import { runBackgroundWorker } from "./background-worker.ts";

export async function handleWorkerTrigger(request: Request, run = runBackgroundWorker) {
  const response = (body: object, status = 200) => Response.json(body, { status,
    headers: { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" } });
  if (request.method !== "POST") return response({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
  let secret: string;
  try { secret = serverEnvironment.cronSecret(); }
  catch { return response({ ok: false, code: "WORKER_UNAVAILABLE" }, 503); }
  if (!hasBearerSecret(request, secret)) return response({ ok: false, code: "UNAUTHORIZED" }, 401);
  if (new URL(request.url).search
    || (request.headers.has("content-length") && request.headers.get("content-length") !== "0")
    || request.headers.has("transfer-encoding")) return response({ ok: false, code: "INVALID_REQUEST" }, 400);
  // Next can supply an empty stream for Content-Length: 0. Establish EOF with
  // one bounded read; a nonempty/slow stream is never a command or DB admission.
  if (request.body) {
    const reader = request.body.getReader();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const chunk = await Promise.race([reader.read(), new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Body unavailable.")), 250);
      })]);
      if (!chunk.done) return response({ ok: false, code: "INVALID_REQUEST" }, 400);
    } catch { return response({ ok: false, code: "INVALID_REQUEST" }, 400); }
    finally { clearTimeout(timer); void reader.cancel().catch(() => {}); reader.releaseLock(); }
  }
  try { return response({ ok: true, ...(await run()) }); }
  catch { return response({ ok: false, code: "WORKER_UNAVAILABLE" }, 503); }
}

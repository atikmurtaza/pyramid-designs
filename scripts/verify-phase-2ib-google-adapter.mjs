import assert from "node:assert/strict";
import { googleDriveStorage } from "../src/lib/server/google-drive.ts";

// Offline HTTP boundary tests; never contact Google or use actual credentials.
export async function verifyWorkerGoogleAdapter() {
  const savedFetch = globalThis.fetch;
  const keys = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN", "GOOGLE_DRIVE_ROOT_ID"];
  const saved = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  let checks = 0;
  const check = (v, expected = true) => { assert.deepEqual(v, expected); checks++; };
  const expected = { id: "syntheticExactObject", name: "00000000-0000-4000-8000-000000000099.pdf", size: 42, digest: "a".repeat(64) };
  const root = "syntheticPrivateRoot";
  let options, deleted, deleteCalls, calls;
  function setup(overrides = {}) { options = overrides; deleted = false; deleteCalls = 0; calls = 0; return googleDriveStorage(AbortSignal.timeout(1000)); }
  try {
    for (const k of keys) process.env[k] = "synthetic-only-no-credential";
    process.env.GOOGLE_DRIVE_ROOT_ID = root;
    globalThis.fetch = async (input, init) => {
      calls++; const url = new URL(input);
      check(init.redirect, "error"); check(init.cache, "no-store"); check(!!init.signal);
      if (url.origin === "https://oauth2.googleapis.com") return Response.json({ access_token: "synthetic-only", token_type: "Bearer", scope: "https://www.googleapis.com/auth/drive.file" });
      check(url.origin, "https://www.googleapis.com");
      if (options.transient) return Response.json({}, { status: 503 });
      if (url.pathname.endsWith("/permissions")) return Response.json({ permissions: [{ type: "user", role: "owner" }, ...(options.shared ? [{ type: "anyone", role: "reader" }] : [])] });
      const folder = url.pathname.endsWith(root);
      if (init.method === "DELETE") {
        deleteCalls++; check(init.headers["If-Match"], '"synthetic-revision-1"');
        if (options.changedAfterVerification) return new Response(null, { status: 412 });
        deleted = true; return new Response(null, { status: 204 });
      }
      if (!folder && (deleted || options.absent)) return Response.json({}, { status: 404 });
      return Response.json({ id: folder ? root : options.wrongId ? "syntheticOtherObject" : expected.id,
        name: folder ? "synthetic" : expected.name, mimeType: folder ? "application/vnd.google-apps.folder" : "application/pdf",
        size: "42", sha256Checksum: options.wrongDigest ? "b".repeat(64) : expected.digest,
        parents: [options.outside ? "syntheticOtherRoot" : root], trashed: false },
      { headers: options.noEtag ? {} : { etag: '"synthetic-revision-1"' } });
    };
    let adapter = setup(); check(await adapter.verify(expected)); await adapter.erase(expected); check(deleted); check(deleteCalls, 1);
    for (const change of [{ outside: true }, { shared: true }, { wrongId: true }, { wrongDigest: true }, { noEtag: true }, { changedAfterVerification: true }, { transient: true }]) {
      adapter = setup(change); await assert.rejects(() => adapter.erase(expected)); checks++;
      check(deleted, false); check(deleteCalls, change.changedAfterVerification ? 1 : 0);
    }
    adapter = setup({ absent: true }); check(await adapter.verify(expected), false); await adapter.erase(expected); check(deleteCalls, 0);
    // Even absence requires a private root, and cancellation prevents new requests.
    adapter = setup({ absent: true, shared: true }); await assert.rejects(() => adapter.erase(expected)); checks++;
    setup(); const controller = new AbortController(); controller.abort();
    adapter = googleDriveStorage(controller.signal);
    await assert.rejects(() => adapter.verify(expected)); checks++;
    check(deleteCalls, 0); check(calls < 4);
    return checks;
  } finally {
    globalThis.fetch = savedFetch;
    for (const k of keys) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
  }
}

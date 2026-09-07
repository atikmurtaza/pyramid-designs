import assert from "node:assert/strict";
import { googleDriveStorage } from "../src/lib/server/google-drive.ts";
import { readBoundedStream, sha256 } from "../src/lib/server/candidate-file-policy.ts";
import { syntheticPdf } from "./phase-2h-synthetic-pdf.mjs";

// Offline verification only. No selectable fake provider is added to runtime.
export async function verifyGoogleAdapter() {
  const keys = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN", "GOOGLE_DRIVE_ROOT_ID"];
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const nativeFetch = globalThis.fetch;
  const root = "syntheticRootOnly";
  const file = "syntheticFileOnly";
  const bytes = syntheticPdf();
  let options, calls, checks = 0;
  const json = (data, status = 200) => Response.json(data, { status });
  const check = (value) => { assert.equal(value, true); checks++; };
  async function rejects(work) { await assert.rejects(work); checks++; }
  function setup(overrides = {}) {
    options = overrides;
    calls = { token: 0, get: 0, post: 0, delete: 0, media: 0 };
    return googleDriveStorage();
  }
  try {
    for (const key of keys) process.env[key] = "synthetic-config-only";
    process.env.GOOGLE_DRIVE_ROOT_ID = root;
    globalThis.fetch = async (url, init) => {
      const address = new URL(url);
      check(init.cache === "no-store" && init.redirect === "error" && !!init.signal);
      if (address.origin === "https://oauth2.googleapis.com") {
        calls.token++;
        return options.authFailure ? json({ error: "invalid_grant" }, 400) : json({ access_token: options.emptyToken ? "" : "synthetic-access-only",
          token_type: "Bearer", scope: options.broadScope ? "https://www.googleapis.com/auth/drive" : "https://www.googleapis.com/auth/drive.file" });
      }
      check(address.origin === "https://www.googleapis.com");
      check(init.headers.Authorization === "Bearer synthetic-access-only");
      if (init.method === "DELETE") { calls.delete++; return new Response(null, { status: 204 }); }
      if (init.method === "POST") { calls.post++; return json({}, options.conflict ? 409 : 200); }
      calls.get++;
      if (address.pathname.endsWith("/generateIds")) return json({ ids: [file] });
      if (address.pathname.endsWith("/permissions")) return json({
        ...(options.paginatedPermissions ? { nextPageToken: "synthetic-next" } : {}),
        permissions: [{ id: "synthetic-owner", type: "user", role: "owner" },
          ...(options.public || (options.publicAfterMedia && calls.media) ? [{ type: "anyone", role: "reader" }] : []),
          ...(options.staffShared ? [{ type: "user", role: "reader" }] : [])],
      });
      if (address.searchParams.get("alt") === "media") { calls.media++; return new Response(new Uint8Array(options.changedBytes ? Buffer.from("changed") : bytes)); }
      const isRoot = address.pathname.endsWith(`/${root}`);
      return json({ id: isRoot ? root : file, name: isRoot ? "Synthetic root" : options.badName ? "candidate-name.pdf" : "00000000-0000-4000-8000-000000000001.pdf",
        mimeType: isRoot && !options.wrongRootType ? "application/vnd.google-apps.folder" : "application/pdf",
        size: String(bytes.length), sha256Checksum: sha256(bytes), trashed: false,
        parents: [options.outsideRoot ? "syntheticOtherRoot" : root] });
    };
    let adapter = setup();
    check(await adapter.allocateId() === file);
    check((await adapter.get(file)).equals(bytes));
    check(calls.token === 1);
    for (const options of [{ authFailure: true }, { broadScope: true }, { emptyToken: true }, { public: true },
      { staffShared: true }, { paginatedPermissions: true }, { wrongRootType: true }]) {
      adapter = setup(options);
      await rejects(() => adapter.allocateId());
      check(calls.post === 0 && calls.delete === 0);
    }
    for (const options of [{ outsideRoot: true }, { badName: true }, { changedBytes: true }, { publicAfterMedia: true }]) {
      adapter = setup(options);
      await rejects(() => adapter.get(file));
    }
    adapter = setup({ outsideRoot: true });
    await rejects(() => adapter.delete(file));
    check(calls.delete === 0);
    adapter = setup();
    await adapter.delete(file);
    check(calls.delete === 1);
    adapter = setup({ conflict: true });
    await adapter.put(file, "00000000-0000-4000-8000-000000000001.pdf", bytes, sha256(bytes));
    check(calls.post === 1);
    adapter = setup();
    await rejects(() => adapter.put(file, "opaque.pdf", Buffer.alloc(0), sha256(Buffer.alloc(0))));
    check(calls.post === 0 && calls.token === 0);
    await rejects(() => readBoundedStream(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(20)); controller.close(); } }), 10, 100));
    await rejects(() => readBoundedStream(new ReadableStream(), 10, 5));
    return checks;
  } finally {
    globalThis.fetch = nativeFetch;
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

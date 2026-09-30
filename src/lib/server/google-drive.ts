import "server-only";
import { productionCapabilityEnabled } from "./production-gates.ts";

import { fileUnavailable, MAX_CV_BYTES, readBoundedStream, sha256 } from "./candidate-file-policy.ts";

export interface CandidateStorage {
  allocateId(): Promise<string>;
  put(id: string, name: string, bytes: Buffer, digest: string): Promise<void>;
  get(id: string): Promise<Buffer>;
  delete(id: string): Promise<void>;
}
export type ExpectedStoredFile = { id: string; name: string; size: number; digest: string };
export interface WorkerStorage extends CandidateStorage {
  verify(expected: ExpectedStoredFile): Promise<boolean>;
  erase(expected: ExpectedStoredFile): Promise<void>;
}

export class StorageOperationError extends Error {
  classification: "TRANSIENT" | "CONFIGURATION" | "SECURITY";
  constructor(classification: StorageOperationError["classification"]) {
    super("Storage operation unavailable."); this.classification = classification;
  }
}

const API = "https://www.googleapis.com/drive/v3";
const idPattern = /^[A-Za-z0-9_-]{10,255}$/;
function id(value: string) { if (!idPattern.test(value)) fileUnavailable(); return value; }
function required(name: string) { const value = process.env[name]?.trim(); if (!value) fileUnavailable(); return value; }

type DriveFile = { id: string; name: string; mimeType: string; size?: string; sha256Checksum?: string; parents?: string[]; trashed: boolean; revisionTag?: string | null };

export function googleStorageConfigured() {
  return productionCapabilityEnabled("DRIVE") && ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN", "GOOGLE_DRIVE_ROOT_ID"].every((name) => !!process.env[name]?.trim());
}

// No browser credential, Drive URL, fetch injection or fake provider selection.
export function googleDriveStorage(signal?: AbortSignal): WorkerStorage {
  if (!productionCapabilityEnabled("DRIVE")) fileUnavailable();
  const root = id(required("GOOGLE_DRIVE_ROOT_ID"));
  const clientId = required("GOOGLE_CLIENT_ID");
  const clientSecret = required("GOOGLE_CLIENT_SECRET");
  const refreshToken = required("GOOGLE_REFRESH_TOKEN");
  let token: string | undefined;
  async function request(url: string, init: RequestInit = {}) {
    if (!productionCapabilityEnabled("DRIVE")) fileUnavailable();
    if (!token) {
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST", redirect: "error", signal: AbortSignal.any([AbortSignal.timeout(10_000), ...(signal ? [signal] : [])]),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
        cache: "no-store",
      });
      if (!response.ok) { await response.body?.cancel(); throw new StorageOperationError(response.status >= 500 || response.status === 429 ? "TRANSIENT" : "CONFIGURATION"); }
      const data = JSON.parse((await readBoundedStream(response.body, 16_384, 10_000)).toString());
      if (typeof data.access_token !== "string" || !data.access_token || data.access_token.length > 4096
        || data.token_type?.toLowerCase() !== "bearer" || data.scope !== "https://www.googleapis.com/auth/drive.file") fileUnavailable();
      token = data.access_token;
    }
    signal?.throwIfAborted();
    return fetch(url, { ...init, redirect: "error", cache: "no-store", signal: AbortSignal.any([AbortSignal.timeout(15_000), ...(signal ? [signal] : [])]),
      headers: { ...init.headers, Authorization: `Bearer ${token}` } });
  }
  async function json(url: string, revision = false) {
    const response = await request(url);
    if (!response.ok) { await response.body?.cancel(); throw new StorageOperationError(response.status >= 500 || response.status === 429 ? "TRANSIENT" : "SECURITY"); }
    const bytes = await readBoundedStream(response.body, 32_768, 10_000);
    try {
      const value = JSON.parse(bytes.toString());
      return revision ? { ...value, revisionTag: response.headers.get("etag") } : value;
    } catch { fileUnavailable(); }
  }
  async function privateFile(fileId: string, folder = false): Promise<DriveFile> {
    const file = await json(`${API}/files/${id(fileId)}?fields=id,name,mimeType,size,sha256Checksum,parents,trashed`, true) as DriveFile;
    const permissions = await json(`${API}/files/${id(fileId)}/permissions?fields=nextPageToken,permissions(id,type,role)&pageSize=100`);
    if (permissions.nextPageToken || !Array.isArray(permissions.permissions) || permissions.permissions.length !== 1
      || permissions.permissions[0].type !== "user" || permissions.permissions[0].role !== "owner"
      || file.id !== fileId || file.trashed) fileUnavailable();
    if (folder) {
      if (file.mimeType !== "application/vnd.google-apps.folder") fileUnavailable();
    } else if (file.mimeType !== "application/pdf" || file.parents?.length !== 1 || file.parents[0] !== root
      || !/^[a-f0-9-]+\.pdf$/.test(file.name) || !/^\d+$/.test(file.size ?? "")
      || Number(file.size) < 1 || Number(file.size) > MAX_CV_BYTES) fileUnavailable();
    return file;
  }
  async function get(fileId: string) {
    await privateFile(root, true);
    const metadata = await privateFile(fileId);
    const response = await request(`${API}/files/${id(fileId)}?alt=media`);
    if (!response.ok) { await response.body?.cancel(); fileUnavailable(); }
    const bytes = await readBoundedStream(response.body, MAX_CV_BYTES, 15_000);
    if (bytes.length !== Number(metadata.size) || (metadata.sha256Checksum && sha256(bytes) !== metadata.sha256Checksum)) fileUnavailable();
    await privateFile(fileId); // fresh permission check before returning the bounded bytes
    return bytes;
  }
  async function verifiedMetadata(expected: ExpectedStoredFile) {
    await privateFile(root, true);
    const response = await request(`${API}/files/${id(expected.id)}?fields=id`);
    await response.body?.cancel();
    if (response.status === 404) return null;
    if (!response.ok) throw new StorageOperationError(response.status >= 500 || response.status === 429 ? "TRANSIENT" : "SECURITY");
    const metadata = await privateFile(expected.id);
    if (metadata.name !== expected.name || Number(metadata.size) !== expected.size
      || metadata.sha256Checksum !== expected.digest) throw new StorageOperationError("SECURITY");
    signal?.throwIfAborted();
    return metadata;
  }
  return {
    async allocateId() {
      await privateFile(root, true);
      const data = await json(`${API}/files/generateIds?count=1&space=drive&type=files`);
      if (!Array.isArray(data.ids) || data.ids.length !== 1) fileUnavailable();
      return id(data.ids[0]);
    },
    async put(fileId, name, bytes, digest) {
      if (!/^[a-f0-9-]+\.pdf$/.test(name) || !bytes.length || bytes.length > MAX_CV_BYTES || sha256(bytes) !== digest) fileUnavailable();
      await privateFile(root, true);
      // Preallocated IDs make ambiguous create/retry safe: never replace content.
      const boundary = `pyramid-${crypto.randomUUID()}`;
      const metadata = JSON.stringify({ id: id(fileId), name, parents: [root], mimeType: "application/pdf" });
      const body = Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`), bytes, Buffer.from(`\r\n--${boundary}--\r\n`)]);
      const response = await request("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
        method: "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body: new Uint8Array(body),
      });
      await response.body?.cancel();
      if (!response.ok && response.status !== 409) fileUnavailable();
      const stored = await get(fileId);
      if (sha256(stored) !== digest || stored.length !== bytes.length) fileUnavailable();
    },
    get,
    async verify(expected) { return !!await verifiedMetadata(expected); },
    async erase(expected) {
      // Caller must first persist verified ownership intent against the frozen DB identity.
      const metadata = await verifiedMetadata(expected);
      if (metadata) {
        // Fail closed if the provider does not expose a usable revision precondition.
        // Live conditional-delete acceptance is a separate production rehearsal gate.
        if (!metadata.revisionTag || !/^"[^"\r\n]{1,200}"$/.test(metadata.revisionTag)) throw new StorageOperationError("CONFIGURATION");
        const response = await request(`${API}/files/${id(expected.id)}`, { method: "DELETE", headers: { "If-Match": metadata.revisionTag } });
        await response.body?.cancel();
        if (!response.ok && response.status !== 404) throw new StorageOperationError(response.status >= 500 || response.status === 429 ? "TRANSIENT" : "SECURITY");
      }
      // Revalidate root permissions even on the already-absent recovery path.
      await privateFile(root, true);
      const response = await request(`${API}/files/${id(expected.id)}?fields=id`);
      await response.body?.cancel();
      if (response.status !== 404) throw new StorageOperationError("TRANSIENT");
      signal?.throwIfAborted();
    },
    async delete(fileId) {
      // Only the persisted application object may be removed; no arbitrary paths.
      const metadata = await request(`${API}/files/${id(fileId)}?fields=id,parents`);
      if (metadata.status === 404) { await metadata.body?.cancel(); return; }
      if (!metadata.ok) { await metadata.body?.cancel(); fileUnavailable(); }
      const data = JSON.parse((await readBoundedStream(metadata.body, 16_384, 10_000)).toString());
      if (data.id !== fileId || data.parents?.length !== 1 || data.parents[0] !== root) fileUnavailable();
      const response = await request(`${API}/files/${id(fileId)}`, { method: "DELETE" });
      await response.body?.cancel();
      if (!response.ok && response.status !== 404) fileUnavailable();
    },
  };
}

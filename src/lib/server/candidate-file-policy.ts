import "server-only";

import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";
import { MAX_MULTIPART_BYTES, MULTIPART_TYPE } from "./intake-abuse.ts";

export const MAX_CV_BYTES = 5 * 1024 * 1024;
export const MAX_UPLOAD_BYTES = MAX_MULTIPART_BYTES;
export const sha256 = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");

export class CandidateFileUnavailable extends Error {
  constructor() { super("Candidate file unavailable."); this.name = "CandidateFileUnavailable"; }
}
export function fileUnavailable(): never { throw new CandidateFileUnavailable(); }

export async function readBoundedStream(
  body: ReadableStream<Uint8Array> | null,
  limit: number,
  timeoutMs: number,
  declaredLength?: string | null,
  signal?: AbortSignal,
) {
  if (declaredLength != null && (!/^\d{1,8}$/.test(declaredLength) || Number(declaredLength) > limit)) fileUnavailable();
  const reader = body?.getReader();
  if (!reader) fileUnavailable();
  let expired = false;
  const started = performance.now();
  const timer = setTimeout(() => { expired = true; void reader.cancel().catch(() => {}); }, timeoutMs);
  const bytes = Buffer.allocUnsafe(limit);
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (expired || signal?.aborted || performance.now() - started >= timeoutMs) fileUnavailable();
      if (done) break;
      if (!value.byteLength) fileUnavailable();
      size += value.byteLength;
      if (size > limit) fileUnavailable();
      bytes.set(value, size - value.byteLength);
    }
    if (!size || (declaredLength && Number(declaredLength) !== size)) fileUnavailable();
    return bytes.subarray(0, size);
  } finally {
    clearTimeout(timer);
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

function rejectActiveContent(text: string) {
  const decodedNames = text.replace(/#([0-9a-f]{2})/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
  if (/\/(?:JavaScript|JS|AA|OpenAction|Launch|EmbeddedFile|Filespec|RichMedia|XFA|AcroForm|Encrypt|ObjStm|URI|GoToR)\b/i.test(decodedNames)) fileUnavailable();
}

function inspectFlateStreams(text: string) {
  const streamPattern = />>[ \t\r\n]*stream(?:\r\n|\n|\r)/g;
  let inflated = 0;
  let streams = 0;
  for (let match; (match = streamPattern.exec(text));) {
    if (++streams > 4096) fileUnavailable();
    // Walk back once from the stream, instead of retrying an 8 KiB regex at
    // every attacker-controlled '<<'. Nested dictionaries remain bounded.
    let depth = 1;
    let startDictionary = match.index - 1;
    const lowerBound = Math.max(0, match.index - 8192);
    for (; startDictionary >= lowerBound; startDictionary--) {
      const pair = text.slice(startDictionary, startDictionary + 2);
      if (pair === ">>") { depth++; startDictionary--; }
      else if (pair === "<<") {
        if (--depth === 0) break;
        startDictionary--;
      }
    }
    if (depth !== 0) fileUnavailable();
    const dictionary = text.slice(startDictionary, match.index + 2);
    rejectActiveContent(dictionary);
    const length = /\/Length\s+(\d+)\s*(?=\/|>>)/.exec(dictionary);
    if (!length) fileUnavailable();
    const start = match.index + match[0].length;
    const end = start + Number(length[1]);
    const ending = /^(?:\r\n|\n|\r)endstream\b/.exec(text.slice(end));
    if (!Number.isSafeInteger(end) || end > text.length || !ending) fileUnavailable();
    streamPattern.lastIndex = end + ending[0].length;
    const decodedDictionary = dictionary.replace(/#([0-9a-f]{2})/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
    if (!/\/Filter\b/.test(decodedDictionary)) continue;
    // Unsupported/chained encodings cannot silently bypass bounded inspection.
    if (!/\/Filter\s*(?:\/(?:FlateDecode|Fl)\b|\[\s*\/(?:FlateDecode|Fl)\s*\])\s*(?=\/|>>)/.test(decodedDictionary)
      || inflated >= MAX_CV_BYTES) fileUnavailable();
    let decoded: Buffer;
    try { decoded = inflateSync(Buffer.from(text.slice(start, end), "latin1"), { maxOutputLength: MAX_CV_BYTES - inflated }); }
    catch { fileUnavailable(); }
    inflated += decoded.length;
    if (inflated > MAX_CV_BYTES) fileUnavailable();
    rejectActiveContent(decoded.toString("latin1"));
  }
}

// This rejects obviously malformed or active PDFs; it is not malware scanning.
export function validateCandidatePdf(bytes: Buffer, transientName: string, advisoryMime: string) {
  if (!bytes.length || bytes.length > MAX_CV_BYTES || transientName.length > 160
    || !/^[^\x00-\x1f\x7f/\\:<>"|?*]+\.pdf$/i.test(transientName)
    || (advisoryMime !== "" && advisoryMime.toLowerCase() !== "application/pdf")) fileUnavailable();
  const text = bytes.toString("latin1");
  if (!/^%PDF-1\.[0-7](?:\r\n|\n|\r)/.test(text)) fileUnavailable();
  const ending = /startxref\s+(\d+)\s+%%EOF[\r\n ]*$/.exec(text);
  if (!ending || text.indexOf("%%EOF") !== text.lastIndexOf("%%EOF")) fileUnavailable();
  const xrefOffset = Number(ending[1]);
  if (!Number.isSafeInteger(xrefOffset) || xrefOffset < 9 || xrefOffset >= ending.index) fileUnavailable();
  const xref = text.slice(xrefOffset, Math.min(ending.index, xrefOffset + 4096));
  if (!/^xref\b/.test(xref) && !/^\d+\s+\d+\s+obj\b[\s\S]*?\/Type\s*\/XRef\b/.test(xref)) fileUnavailable();
  const objectCount = (text.match(/\b\d+\s+\d+\s+obj\b/g) ?? []).length;
  if (objectCount < 3 || objectCount !== (text.match(/\bendobj\b/g) ?? []).length
    || !/\/Type\s*\/Catalog\b/.test(text) || !/\/Type\s*\/Pages\b/.test(text)
    || !/\/Type\s*\/Page\b/.test(text)) fileUnavailable();
  rejectActiveContent(text);
  inspectFlateStreams(text);
  return { sizeBytes: bytes.length, contentHash: sha256(bytes), detectedMime: "application/pdf" as const };
}

// Preflight raw framing before native formData can allocate one object per part.
// Strict browser-generated subset; reject preambles, epilogues and nested multipart.
function boundMultipartEnvelope(body: Buffer, contentType: string) {
  const boundary = contentType.slice(contentType.indexOf("=") + 1).replaceAll('"', "");
  const delimiter = Buffer.from(`\r\n--${boundary}`);
  const first = Buffer.from(`--${boundary}\r\n`);
  if (!body.subarray(0, first.length).equals(first)) fileUnavailable();
  let offset = first.length, parts = 0, fieldBytes = 0, files = 0;
  const names = new Set<string>();
  for (;;) {
    if (++parts > 66) fileUnavailable();
    const endHeaders = body.indexOf("\r\n\r\n", offset);
    if (endHeaders < offset || endHeaders - offset > 1024) fileUnavailable();
    const headers = body.subarray(offset, endHeaders).toString("utf8").split("\r\n");
    const disposition = /^Content-Disposition: form-data; name="([A-Za-z0-9_.-]{1,64})"(?:; filename="([^"\r\n]{1,160})")?$/i.exec(headers[0]);
    if (!disposition || names.has(disposition[1])) fileUnavailable();
    names.add(disposition[1]);
    const file = disposition[2] !== undefined;
    if (file) {
      if (++files > 1 || disposition[1] !== "cv" || /[\x00-\x1f\x7f/\\:<>|?*]/.test(disposition[2])
        || headers.length > 2 || (headers.length === 2 && !/^Content-Type: application\/pdf$/i.test(headers[1]))) fileUnavailable();
    } else if (headers.length !== 1 || disposition[1] === "cv") fileUnavailable();
    const start = endHeaders + 4;
    const end = body.indexOf(delimiter, start);
    if (end < start) fileUnavailable();
    if (file) { if (end === start || end - start > MAX_CV_BYTES) fileUnavailable(); }
    else {
      fieldBytes += Buffer.byteLength(disposition[1]) + end - start;
      if (fieldBytes > 24_576) fileUnavailable();
      try { new TextDecoder("utf-8", { fatal: true }).decode(body.subarray(start, end)); } catch { fileUnavailable(); }
    }
    offset = end + delimiter.length;
    if (body.subarray(offset, offset + 2).toString() === "--") {
      const tail = body.subarray(offset + 2).toString();
      if ((tail !== "" && tail !== "\r\n") || files !== 1) fileUnavailable();
      return;
    }
    if (body.subarray(offset, offset + 2).toString() !== "\r\n") fileUnavailable();
    offset += 2;
  }
}

let activeParsers = 0;
export async function parseCandidateUpload(request: Request, validateFields?: (fields: URLSearchParams) => unknown) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!MULTIPART_TYPE.test(contentType)
    || activeParsers >= 2) fileUnavailable();
  activeParsers++;
  try {
    const body = await readBoundedStream(request.body, MAX_UPLOAD_BYTES, 10_000, request.headers.get("content-length"), request.signal);
    boundMultipartEnvelope(body, contentType);
    let form: FormData;
    try { form = await new Response(new Uint8Array(body), { headers: { "Content-Type": contentType } }).formData(); }
    catch { fileUnavailable(); }
    const fields = new URLSearchParams();
    let file: File | undefined;
    let fieldBytes = 0;
    let parts = 0;
    for (const [name, value] of form) {
      if (++parts > 72) fileUnavailable();
      if (name === "cv" && typeof value !== "string" && !file) file = value;
      else if (typeof value === "string" && name !== "cv") {
        fieldBytes += Buffer.byteLength(name) + Buffer.byteLength(value);
        if (fieldBytes > 24_576) fileUnavailable();
        fields.append(name, value);
      } else fileUnavailable();
    }
    if (!file || file.size > MAX_CV_BYTES) fileUnavailable();
    validateFields?.(fields);
    const bytes = Buffer.from(await file.arrayBuffer());
    const metadata = validateCandidatePdf(bytes, file.name, file.type);
    return { fields, bytes, ...metadata };
  } finally { activeParsers--; }
}

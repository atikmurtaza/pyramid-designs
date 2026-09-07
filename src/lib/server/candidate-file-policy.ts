import "server-only";

import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";

export const MAX_CV_BYTES = 5 * 1024 * 1024;
export const MAX_UPLOAD_BYTES = MAX_CV_BYTES + 32 * 1024;
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
  if (declaredLength && (!/^\d+$/.test(declaredLength) || Number(declaredLength) > limit)) fileUnavailable();
  const reader = body?.getReader();
  if (!reader) fileUnavailable();
  let expired = false;
  const timer = setTimeout(() => { expired = true; void reader.cancel().catch(() => {}); }, timeoutMs);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (expired || signal?.aborted) fileUnavailable();
      if (done) break;
      size += value.byteLength;
      if (size > limit) fileUnavailable();
      chunks.push(value);
    }
    if (!size || (declaredLength && Number(declaredLength) !== size)) fileUnavailable();
    return Buffer.concat(chunks, size);
  } finally {
    clearTimeout(timer);
    await reader.cancel().catch(() => {});
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

let activeParsers = 0;
export async function parseCandidateUpload(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^multipart\/form-data;\s*boundary=(?:[\w'-]{1,70}|"[\w'-]{1,70}")$/i.test(contentType)
    || activeParsers >= 2) fileUnavailable();
  activeParsers++;
  try {
    const body = await readBoundedStream(request.body, MAX_UPLOAD_BYTES, 10_000, request.headers.get("content-length"), request.signal);
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
    const bytes = Buffer.from(await file.arrayBuffer());
    const metadata = validateCandidatePdf(bytes, file.name, file.type);
    return { fields, bytes, ...metadata };
  } finally { activeParsers--; }
}

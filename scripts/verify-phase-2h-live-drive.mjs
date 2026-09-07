import { randomUUID, generateKeyPairSync, sign } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { phase2BFixtures as f } from "./seed-phase-2b-synthetic.mjs";
import { phase2CFixtures as staff, seedPhase2CSynthetic } from "./seed-phase-2c-synthetic.mjs";
import { syntheticPdf } from "./phase-2h-synthetic-pdf.mjs";

config({ path: ".env.local", quiet: true });
// Explicit opt-in and a dedicated loopback database. Never runs in production.
const target = new URL(process.env.DATABASE_URL);
if (!process.argv.includes("--live") || process.env.NODE_ENV !== "test"
  || target.hostname !== "127.0.0.1" || target.port !== "55439"
  || target.pathname !== "/pyramid_phase2h_closure") throw new Error("Disposable live verification only.");
process.env.PUBLIC_INTAKE_MODE = "synthetic";
const db = await import("../src/lib/server/database.ts");
const files = await import("../src/lib/server/candidate-files.ts");
const policy = await import("../src/lib/server/candidate-file-policy.ts");
const drive = await import("../src/lib/server/google-drive.ts");
const session = await import("../src/lib/server/auth/session.ts");
const intake = await import("../src/lib/server/public-intake.ts");
const root = process.env.GOOGLE_DRIVE_ROOT_ID.trim();
const bytes = syntheticPdf();
const digest = policy.sha256(bytes);
const originalName = "Synthetic transient filename never persist.pdf";
const results = [];
let currentGate = "initialization";
function check(condition, gate) {
  currentGate = gate;
  if (!condition) throw new Error("Verification failed.");
  results.push(gate);
}
async function denied(work, gate) {
  let failed = false;
  try { await work(); } catch { failed = true; }
  check(failed, gate);
}
const nativeFetch = globalThis.fetch;
let oauthCount = 0, metadataCount = 0, permissionCount = 0, mediaCount = 0;
const deleted = new Set();
// Observe real responses in memory. Never print URLs, bodies, IDs, or tokens.
globalThis.fetch = async (url, init) => {
  const response = await nativeFetch(url, init);
  const address = new URL(url);
  if (address.origin === "https://oauth2.googleapis.com") {
    const data = await response.clone().json();
    check(response.ok && data.scope === "https://www.googleapis.com/auth/drive.file", "oauth_drive_file_only");
    oauthCount++;
  } else if (address.origin === "https://www.googleapis.com" && response.ok) {
    if (address.pathname.endsWith("/permissions")) {
      const data = await response.clone().json();
      check(!data.nextPageToken && data.permissions.length === 1 && data.permissions[0].type === "user"
        && data.permissions[0].role === "owner", "owner_only_permissions");
      permissionCount++;
    } else if (address.searchParams.get("alt") === "media") mediaCount++;
    else if (address.searchParams.get("fields")?.includes("mimeType")) {
      const data = await response.clone().json();
      check(!data.trashed, "not_trashed");
      if (data.id === root) check(data.mimeType === "application/vnd.google-apps.folder", "configured_root_folder");
      else check(data.mimeType === "application/pdf" && data.parents?.length === 1 && data.parents[0] === root
        && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\.pdf$/.test(data.name)
        && data.size === String(bytes.length), "opaque_pdf_under_exact_root");
      metadataCount++;
    }
  }
  if (init?.method === "DELETE" && response.ok) deleted.add(address.pathname.split("/").at(-1));
  return response;
};
const adapter = drive.googleDriveStorage();
const owned = new Map();
const storage = {
  allocateId: () => adapter.allocateId(),
  async put(id, name, content, hash) {
    owned.set(id, { name, hash });
    return adapter.put(id, name, content, hash);
  },
  get: (id) => adapter.get(id),
  delete: (id) => adapter.delete(id),
};
function payload(key = randomUUID()) {
  return new URLSearchParams({ applicationType: "JOB_APPLICATION", jobId: f.jobId,
    fullName: "Synthetic Phase 2H Live Verification", email: "synthetic.phase2h.live@example.invalid",
    city: "Synthetic City", experienceLevel: "SYNTHETIC_LEVEL", consentDefinitionId: f.consentDefinitionId,
    consent: "accepted", idempotencyKey: key, [`answer.${f.jobQuestionId}`]: f.jobQuestionOptionId });
}
function request(fields, content = bytes) {
  const form = new FormData();
  for (const [key, value] of fields) form.append(key, value);
  form.append("cv", new File([content], originalName, { type: "application/pdf" }));
  return new Request("http://localhost/api/applications", { method: "POST", body: form,
    headers: { host: "localhost", origin: "http://localhost", "sec-fetch-site": "same-origin" } });
}
async function rowFor(key) {
  return (await db.query(`SELECT file.*, application."technicalStatus" AS "applicationStatus", job."state" AS "jobState"
    FROM public."CandidateFile" file JOIN public."Application" application ON application."id"=file."applicationId"
    JOIN public."IdempotencyRecord" retry ON retry."resultReference"=application."id"
    JOIN public."BackgroundJob" job ON job."candidateFileId"=file."id"
    WHERE retry."keyHash"=$1`, [policy.sha256(`public-intake:${key}`)])).rows[0];
}
const download = "candidate_file.cleared.download";
const quarantine = "candidate_file.security_review.retrieve_quarantine";
// Synthetic signatures are verified by the installed Supabase getClaims implementation.
// They are accepted only by this test client, never by the application provider configuration.
const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const jwk = { ...publicKey.export({ format: "jwk" }), kid: "synthetic-phase2h", alg: "ES256", use: "sig" };
const auth = createClient("http://127.0.0.1:1", "synthetic-test-only", {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch: async () => { throw new Error("No provider network in synthetic claims verification."); } },
});
async function principal(subject, aal = "aal2", corrupt = false) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const body = `${encode({ alg: "ES256", kid: jwk.kid, typ: "JWT" })}.${encode({ sub: subject,
    aal, aud: "authenticated", role: "authenticated", exp: Math.floor(Date.now() / 1000) + 600 })}`;
  const signature = sign("sha256", Buffer.from(body), { key: privateKey, dsaEncoding: "ieee-p1363" });
  if (corrupt) signature[0] ^= 1;
  return session.resolveAuthenticatedStaff(async () => {
    const { data, error } = await auth.auth.getClaims(`${body}.${signature.toString("base64url")}`, { jwks: { keys: [jwk] } });
    return error || !data?.claims ? null : { subjectId: data.claims.sub, assuranceLevel: data.claims.aal === "aal2" ? "aal2" : "aal1" };
  });
}
async function rollbackCase(work) {
  let completed = false;
  try { await db.transaction(async (executor) => { await work(executor); completed = true; throw new Error("Synthetic rollback."); }); }
  catch { if (!completed) throw new Error("Rollback case failed."); }
}
let successful = false;
try {
  currentGate = "synthetic_seed";
  await seedPhase2CSynthetic();
  check(policy.validateCandidatePdf(bytes, originalName, "application/pdf").contentHash === digest, "valid_synthetic_pdf");
  const manager = await principal(staff.subjects.manager);
  const reviewer = await principal(staff.subjects.reviewer);
  const auditor = await principal(staff.subjects.auditor);
  check(manager?.roles.includes("HIRING_MANAGER") && reviewer?.roles.includes("HIRING_REVIEWER"), "verified_claims_active_roles");
  check(await principal(staff.subjects.manager, "aal2", true) === null, "invalid_signature_denied");
  const key = randomUUID();
  currentGate = "live_upload";
  const response = await files.handleCandidateFileIntakeRequest(request(payload(key)), { storage: () => storage });
  check(response.status === 200, "live_upload_response");
  const text = await response.text();
  check(text.includes("not cleared or trusted") && !text.includes(root) && !text.includes(originalName)
    && !/googleapis|drive\.google|https?:\/\//.test(text), "public_response_privacy");
  const stored = await rowFor(key);
  check(stored?.technicalStatus === "QUARANTINED" && stored.securityStatus === "UNREVIEWED"
    && stored.applicationStatus === "SECURITY_PENDING" && stored.jobState === "SUCCEEDED", "stored_not_cleared_or_submitted");
  check(stored.contentHash === digest && (await storage.get(stored.driveFileId)).equals(bytes), "live_retrieval_exact_sha256");
  check(policy.sha256(syntheticPdf("Synthetic changed content")) !== digest, "different_bytes_different_digest");
  check(!JSON.stringify(stored).includes(originalName) && !text.includes(stored.driveFileId), "filename_and_provider_id_private");
  await denied(() => files.retrieveCandidateFile(reviewer, stored.id, download, storage), "quarantine_normal_download_denied");
  await denied(() => db.transaction((ex) => ex.query(`UPDATE public."Application" SET "technicalStatus"='SUBMITTED',
    "hiringStatus"='NEW',"submittedAt"=clock_timestamp() WHERE "id"=$1`, [stored.applicationId])), "quarantine_submission_denied");
  currentGate = "concurrent_live_retry";
  const repeats = await Promise.all([1, 2].map(() => files.handleCandidateFileIntakeRequest(request(payload(key)), { storage: () => storage })));
  check(repeats.every((r) => r.status === 200), "concurrent_same_key_retry");
  const repeated = await rowFor(key);
  check(repeated.id === stored.id && repeated.driveFileId === stored.driveFileId && owned.size === 1, "single_file_single_drive_identity");
  const changed = await files.handleCandidateFileIntakeRequest(request(payload(key), syntheticPdf("Synthetic changed content")), { storage: () => storage });
  check(changed.status !== 200 && owned.size === 1, "changed_digest_retry_denied");
  check((await files.retrieveCandidateFile(manager, stored.id, quarantine, storage)).equals(bytes), "authorized_quarantine_retrieval");
  currentGate = "synthetic_review";
  await files.initiateCandidateFileReview(manager, stored.id);
  await denied(() => files.recordCandidateFileReview(manager, stored.id, { observedSha256: "f".repeat(64), outcome: "CLEAN",
    startedAt: new Date().toISOString(), idempotencyKey: randomUUID() }), "stale_review_digest_denied");
  const reviewInput = { observedSha256: digest, outcome: "CLEAN", toolVersion: "SYNTHETIC TEST ONLY - NO MALWARE SCAN",
    startedAt: new Date().toISOString(), idempotencyKey: randomUUID() };
  await files.recordCandidateFileReview(manager, stored.id, reviewInput);
  await files.recordCandidateFileReview(manager, stored.id, reviewInput);
  const cleared = await rowFor(key);
  check(cleared.securityStatus === "CLEARED" && cleared.applicationStatus === "SUBMITTED", "exact_synthetic_evidence_transition");
  check((await db.query(`SELECT count(*)::int AS n FROM public."FileSecurityReview" WHERE "candidateFileId"=$1`, [stored.id])).rows[0].n === 1, "one_immutable_review");
  const content = await files.retrieveCandidateFile(reviewer, stored.id, download, storage);
  check(content.equals(bytes), "authorized_cleared_download");
  const headers = files.candidateFileResponse(content).headers;
  check(headers.get("content-disposition") === 'attachment; filename="candidate-cv.pdf"'
    && headers.get("content-type") === "application/pdf" && headers.get("cache-control").includes("private, no-store")
    && headers.get("x-content-type-options") === "nosniff" && headers.get("content-security-policy") === "default-src 'none'; sandbox", "download_headers");
  for (const [actor, label] of [[auditor, "auditor"], [await principal(staff.subjects.contentEditor), "wrong_role"],
    [await principal(staff.subjects.reviewer, "aal1"), "aal1"], [null, "signed_out"], [{ ...reviewer, authSubjectId: "wrong-subject" }, "wrong_subject"]])
    await denied(() => files.retrieveCandidateFile(actor, stored.id, download, storage), `${label}_denied`);
  for (const identifier of [randomUUID(), "invalid", stored.applicationId])
    await denied(() => files.retrieveCandidateFile(reviewer, identifier, download, storage), "unknown_malformed_or_application_id_denied");
  await rollbackCase(async (ex) => {
    await ex.query(`UPDATE public."StaffUser" SET "status"='DISABLED',"disabledAt"=clock_timestamp() WHERE "id"=$1`, [reviewer.staffUserId]);
    await denied(() => files.retrieveCandidateFile(reviewer, stored.id, download, storage, ex), "disabled_staff_denied");
  });
  await rollbackCase(async (ex) => {
    await ex.query(`UPDATE public."UserRole" SET "revokedAt"=clock_timestamp() WHERE "staffUserId"=$1`, [reviewer.staffUserId]);
    await denied(() => files.retrieveCandidateFile(reviewer, stored.id, download, storage, ex), "revoked_role_denied");
  });
  await rollbackCase(async (ex) => {
    await ex.query(`UPDATE public."Application" SET "expiresAt"=clock_timestamp()-interval '1 second' WHERE "id"=$1`, [stored.applicationId]);
    await denied(() => files.retrieveCandidateFile(reviewer, stored.id, download, storage, ex), "expired_retention_denied");
  });
  for (const statement of [
    `UPDATE public."CandidateFile" SET "securityStatus"='UNREVIEWED',"clearanceMethod"=NULL,"clearedAt"=NULL WHERE "id"=$1`,
    `UPDATE public."CandidateFile" SET "contentHash"=repeat('e',64) WHERE "id"=$1`,
    `DELETE FROM public."FileSecurityReview" WHERE "candidateFileId"=$1`,
    `UPDATE public."FileSecurityReview" SET "outcomeCode"='CHANGED' WHERE "candidateFileId"=$1`,
  ]) await denied(() => db.transaction((ex) => ex.query(statement, [stored.id])), "clearance_or_evidence_invariant");
  await denied(() => files.retrieveCandidateFile(reviewer, stored.id, download, { ...storage,
    get: async () => syntheticPdf("Synthetic different stored bytes") }), "replaced_bytes_denied");
  currentGate = "stale_state_during_download";
  await denied(() => files.retrieveCandidateFile(reviewer, stored.id, download, { ...storage, get: async (id) => {
    const data = await storage.get(id);
    await db.query(`UPDATE public."CandidateFile" SET "version"="version"+1 WHERE "id"=$1`, [stored.id]);
    return data;
  } }), "concurrent_version_change_denied");
  currentGate = "storage_failure";
  const failedKey = randomUUID();
  const failedResponse = await files.handleCandidateFileIntakeRequest(request(payload(failedKey)), { storage: () => ({ ...storage,
    put: async () => { throw new Error("Synthetic storage failure."); } }) });
  const pending = await rowFor(failedKey);
  check(failedResponse.status === 503 && pending.technicalStatus === "UPLOAD_PENDING" && pending.jobState === "QUEUED"
    && pending.applicationStatus === "SUBMISSION_PENDING", "storage_failure_durable_reservation");
  check((await files.handleCandidateFileIntakeRequest(request(payload(failedKey)), { storage: () => storage })).status === 200,
    "storage_failure_retry_recovers");
  check((await rowFor(failedKey)).driveFileId === pending.driveFileId, "storage_failure_same_identity");
  currentGate = "database_failure_after_storage";
  const splitKey = randomUUID();
  let calls = 0;
  const splitResponse = await files.handleCandidateFileIntakeRequest(request(payload(splitKey)), { storage: () => storage,
    runTransaction: (work) => { if (++calls === 2) throw new Error("Synthetic finalization failure."); return db.transaction(work); } });
  const split = await rowFor(splitKey);
  check(splitResponse.status === 503 && split.technicalStatus === "UPLOAD_PENDING" && split.jobState === "QUEUED"
    && (await storage.get(split.driveFileId)).equals(bytes), "database_failure_durable_reconciliation");
  check((await files.handleCandidateFileIntakeRequest(request(payload(splitKey)), { storage: () => storage })).status === 200,
    "database_failure_retry_recovers");
  check((await rowFor(splitKey)).driveFileId === split.driveFileId && owned.size === 3, "database_failure_no_duplicate_object");
  currentGate = "filename_privacy";
  const tables = ["Application", "CandidateFile", "CandidateConsent", "FileSecurityReview", "ApplicationStatusEvent", "AuditEvent", "BackgroundJob", "IdempotencyRecord"];
  for (const table of tables) {
    const result = await db.query(`SELECT count(*)::int AS n FROM public."${table}" row WHERE row_to_json(row)::text LIKE $1
      OR row_to_json(row)::text LIKE '%fakepath%'`, [`%${originalName}%`]);
    check(result.rows[0].n === 0, "no_durable_browser_filename");
  }
  currentGate = "production_mode_gate";
  for (const nodeMode of ["production", "unknown"]) {
    process.env.NODE_ENV = nodeMode;
    for (const mode of ["synthetic", "real", "unknown", ""]) {
      process.env.PUBLIC_INTAKE_MODE = mode;
      check(!intake.syntheticIntakeEnabled("http://localhost"), "non_test_intake_closed");
    }
  }
  process.env.NODE_ENV = "test";
  process.env.PUBLIC_INTAKE_MODE = "synthetic";
  console.log("PHASE_2H_LIVE_CORE_PASS cleanup_pending=3");
  successful = true;
} catch {
  console.log(`PHASE_2H_LIVE_FAIL gate=${currentGate}`);
  process.exitCode = 1;
} finally {
  let cleaned = 0;
  for (const [id, identity] of owned) {
    try {
      // Cleanup only positively verified objects created by this test.
      const content = await adapter.get(id);
      check(policy.sha256(content) === identity.hash, "cleanup_exact_synthetic_content");
      await adapter.delete(id);
      await denied(() => adapter.get(id), "cleanup_get_denied");
      check(deleted.has(id), "cleanup_delete_succeeded");
      await adapter.delete(id);
      cleaned++;
    } catch { console.log("SYNTHETIC_DRIVE_CLEANUP_REQUIRES_REVIEW"); process.exitCode = 1; }
  }
  globalThis.fetch = nativeFetch;
  await db.closeDatabasePool();
  const report = { passed: successful && !process.exitCode, checks: results.length, uniqueGates: [...new Set(results)],
    oauthCount, metadataCount, permissionCount, mediaCount, createdObjects: owned.size, cleanedObjects: cleaned,
    database: "disposable_only", malwareScan: false, hostedSupabaseAuthAcceptance: "deferred" };
  await writeFile("tmp/phase2h-live-results.json", JSON.stringify(report, null, 2));
  console.log(`PHASE_2H_LIVE_DRIVE_${report.passed ? "OK" : "INCOMPLETE"} checks=${results.length} created=${owned.size} cleaned=${cleaned}`);
}
